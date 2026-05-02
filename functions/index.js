const admin = require('firebase-admin');
const functions = require('firebase-functions');

admin.initializeApp();

const db = admin.database();
const bucket = admin.storage().bucket();

const REGION = 'asia-southeast1';
const LIFE_GRID_ACTIVITY_ID = 'life_grid_2027';
const LIFE_GRID_CODE = '2027-LIFE-GRID';
const LIFE_GRID_START_AT = new Date('2026-07-01T00:00:00+08:00').getTime();
const LIFE_GRID_END_AT = new Date('2028-01-01T00:00:00+08:00').getTime();
const CODE_MAX_USES = 999;
const NORMAL_COOLDOWN_MS = 5000;
const LOCKED_COOLDOWN_MS = 10 * 60 * 1000;
const DAILY_WRONG_LIMIT = 10;

const GRID_SEQUENCE = [
  'A1', 'N1', 'C1', 'N2', 'N3',
  'N4', 'B1', 'C2', 'B2', 'N5',
  'C3', 'C4', 'S1', 'C5', 'C6',
  'N6', 'B3', 'C7', 'B4', 'N7',
  'N8', 'N9', 'C8', 'N10', 'A2',
];

const TASK_LIST_SEQUENCE = [
  'S1',
  'A1', 'A2',
  'B1', 'B2', 'B3', 'B4',
  'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8',
  'N1', 'N2', 'N3', 'N4', 'N5', 'N6', 'N7', 'N8', 'N9', 'N10',
];

const DEFAULT_ACHIEVEMENTS = {
  first_task_completed: {
    title: '萬丈高樓平地起',
    description: '傳奇的開始！',
    hidden: true,
    condition: {
      type: 'completed_task_count',
      value: 1,
    },
  },
};

const DEFAULT_TASKS = Object.fromEntries(TASK_LIST_SEQUENCE.map((taskId) => {
  const level = taskId[0];
  return [taskId, {
    task_id: taskId,
    level,
    index: Number(taskId.slice(1)),
    code: taskId,
    title: level === 'N' ? `官方任務 ${taskId}` : '',
    description: '',
    user_editable: level !== 'N',
  }];
}));

function assertAuth(context) {
  if (!context.auth?.uid) {
    throw new functions.https.HttpsError('unauthenticated', '請先登入。');
  }
  return context.auth.uid;
}

async function assertAdmin(uid) {
  const snapshot = await db.ref(`admins/${uid}`).once('value');
  if (snapshot.val() !== true) {
    throw new functions.https.HttpsError('permission-denied', '需要管理員權限。');
  }
}

function isActivityOpen(time = Date.now()) {
  return time >= LIFE_GRID_START_AT && time < LIFE_GRID_END_AT;
}

function canUnlockActivity(time = Date.now()) {
  return time < LIFE_GRID_END_AT;
}

function getTaipeiDateKey(time = Date.now()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(time));
}

function normalizeCode(code) {
  return String(code || '').trim().toUpperCase();
}

function normalizeNickName(value) {
  const text = String(value || '').trim();
  return Array.from(text || '匿名').slice(0, 10).join('');
}

function sanitizeText(value, maxLength) {
  return Array.from(String(value || '').trim()).slice(0, maxLength).join('');
}

async function ensureActivityConfig() {
  const activityRef = db.ref(`activities/${LIFE_GRID_ACTIVITY_ID}`);
  const snapshot = await activityRef.once('value');
  const existing = snapshot.val() || {};
  const next = {
    activity_id: LIFE_GRID_ACTIVITY_ID,
    name: existing.name || 'Life Grid 2027',
    type: 'life_grid',
    status: existing.status || 'active',
    start_at: existing.start_at || LIFE_GRID_START_AT,
    end_at: existing.end_at || LIFE_GRID_END_AT,
    task_order: Array.isArray(existing.task_order) ? existing.task_order : GRID_SEQUENCE,
    tasks: {
      ...DEFAULT_TASKS,
      ...(existing.tasks || {}),
    },
    achievements: {
      ...DEFAULT_ACHIEVEMENTS,
      ...(existing.achievements || {}),
    },
    updated_at: Date.now(),
  };

  if (!snapshot.exists()) {
    await activityRef.set(next);
  }
  return next;
}

function getDefaultUserTasks() {
  return Object.fromEntries(TASK_LIST_SEQUENCE.map((taskId) => [taskId, {
    task_id: taskId,
    level: taskId[0],
    status: 'open',
    created_at: Date.now(),
    updated_at: Date.now(),
  }]));
}

async function ensureProfile(uid) {
  const profileRef = db.ref(`users/${uid}/profile`);
  const snapshot = await profileRef.once('value');
  if (snapshot.exists()) return snapshot.val();

  const profile = {
    public: {
      nick_name: '匿名',
    },
    private: {
      real_name: '',
      address: '',
    },
    created_at: Date.now(),
    updated_at: Date.now(),
    schema_version: 1,
  };
  await profileRef.set(profile);
  return profile;
}

async function recordAttempt(uid, isCorrect) {
  const time = Date.now();
  const dateKey = getTaipeiDateKey(time);
  const ref = db.ref(`user_code_attempts/${uid}/${dateKey}`);
  const snapshot = await ref.once('value');
  const current = snapshot.val() || {};
  const wrongCount = Number(current.wrong_count || 0);
  const lastAttemptAt = Number(current.last_attempt_at || 0);
  const cooldown = wrongCount >= DAILY_WRONG_LIMIT ? LOCKED_COOLDOWN_MS : NORMAL_COOLDOWN_MS;

  if (lastAttemptAt && time - lastAttemptAt < cooldown) {
    const waitSeconds = Math.ceil((cooldown - (time - lastAttemptAt)) / 1000);
    throw new functions.https.HttpsError(
      'resource-exhausted',
      wrongCount >= DAILY_WRONG_LIMIT
        ? `今日錯誤次數過多，請 ${waitSeconds} 秒後再試。`
        : `請 ${waitSeconds} 秒後再試。`,
    );
  }

  const next = {
    last_attempt_at: time,
    wrong_count: isCorrect ? 0 : wrongCount + 1,
    updated_at: time,
  };
  await ref.set(next);
}

async function incrementActivityCodeUse() {
  const codeRef = db.ref(`activity_codes/${LIFE_GRID_ACTIVITY_ID}`);
  const result = await codeRef.transaction((current) => {
    const data = current || {
      code: LIFE_GRID_CODE,
      activity_id: LIFE_GRID_ACTIVITY_ID,
      max_uses: CODE_MAX_USES,
      used_count: 0,
      created_at: Date.now(),
    };
    if ((data.used_count || 0) >= (data.max_uses || CODE_MAX_USES)) return;
    return {
      ...data,
      code: LIFE_GRID_CODE,
      activity_id: LIFE_GRID_ACTIVITY_ID,
      max_uses: data.max_uses || CODE_MAX_USES,
      used_count: (data.used_count || 0) + 1,
      updated_at: Date.now(),
    };
  });

  if (!result.committed) {
    throw new functions.https.HttpsError('resource-exhausted', '活動代碼使用次數已滿。');
  }
}

exports.unlockActivity = functions.region(REGION).https.onCall(async (data, context) => {
  const uid = assertAuth(context);
  const submittedCode = normalizeCode(data?.code);
  const isCorrect = submittedCode === LIFE_GRID_CODE;
  await recordAttempt(uid, isCorrect);

  if (!isCorrect) {
    throw new functions.https.HttpsError('invalid-argument', '活動代碼不正確。');
  }

  const activity = await ensureActivityConfig();
  if (activity.status !== 'active' || !canUnlockActivity()) {
    throw new functions.https.HttpsError('failed-precondition', '活動目前不可解鎖。');
  }

  const unlockRef = db.ref(`users/${uid}/activity_unlocks/${LIFE_GRID_ACTIVITY_ID}`);
  const unlockSnapshot = await unlockRef.once('value');
  if (unlockSnapshot.exists()) {
    return {
      activityId: LIFE_GRID_ACTIVITY_ID,
      activityName: activity.name,
      alreadyUnlocked: true,
    };
  }

  await incrementActivityCodeUse();
  await ensureProfile(uid);
  const time = Date.now();
  await db.ref().update({
    [`users/${uid}/activity_unlocks/${LIFE_GRID_ACTIVITY_ID}`]: {
      activity_id: LIFE_GRID_ACTIVITY_ID,
      unlocked_at: time,
      code: LIFE_GRID_CODE,
    },
    [`users/${uid}/activities/${LIFE_GRID_ACTIVITY_ID}/joined_at`]: time,
    [`users/${uid}/activities/${LIFE_GRID_ACTIVITY_ID}/updated_at`]: time,
    [`users/${uid}/activities/${LIFE_GRID_ACTIVITY_ID}/tasks`]: getDefaultUserTasks(),
  });

  return {
    activityId: LIFE_GRID_ACTIVITY_ID,
    activityName: activity.name,
    alreadyUnlocked: false,
  };
});

function getTaskTitle(taskId, userTask, activityTask) {
  if (taskId[0] === 'N') return activityTask?.title || `官方任務 ${taskId}`;
  return userTask?.custom_title || taskId;
}

function conditionMet(condition, completedTasks, sourceTaskId) {
  if (!condition) return false;
  const completedCount = completedTasks.length;
  if (condition.type === 'completed_task_count') {
    return completedCount >= Number(condition.value || 0);
  }
  if (condition.type === 'completed_task') {
    return completedTasks.includes(condition.task_id || sourceTaskId);
  }
  if (condition.type === 'completed_level_count') {
    const count = completedTasks.filter((taskId) => taskId[0] === condition.level).length;
    return count >= Number(condition.value || 0);
  }
  if (condition.type === 'completed_all_level') {
    const levelTasks = TASK_LIST_SEQUENCE.filter((taskId) => taskId[0] === condition.level);
    return levelTasks.every((taskId) => completedTasks.includes(taskId));
  }
  if (condition.type === 'completed_before') {
    return completedCount >= Number(condition.task_count || 0) && Date.now() <= Number(condition.before || 0);
  }
  return false;
}

async function evaluateAchievements(uid, activity, sourceTaskId) {
  const tasksSnapshot = await db.ref(`users/${uid}/activities/${LIFE_GRID_ACTIVITY_ID}/tasks`).once('value');
  const userTasks = tasksSnapshot.val() || {};
  const completedTasks = Object.entries(userTasks)
    .filter(([, task]) => task.status === 'completed')
    .map(([taskId]) => taskId);

  const earnedSnapshot = await db.ref(`users/${uid}/achievements/${LIFE_GRID_ACTIVITY_ID}`).once('value');
  const earned = earnedSnapshot.val() || {};
  const achievements = activity.achievements || DEFAULT_ACHIEVEMENTS;
  const unlocked = [];
  const updates = {};
  const time = Date.now();
  const profile = await ensureProfile(uid);
  const nickName = normalizeNickName(profile?.public?.nick_name);

  Object.entries(achievements).forEach(([achievementId, achievement]) => {
    if (earned[achievementId]) return;
    if (!conditionMet(achievement.condition, completedTasks, sourceTaskId)) return;

    const achievementRecord = {
      title: achievement.title,
      description: achievement.description || '',
      earned_at: time,
      source: {
        type: 'task_completion',
        task_id: sourceTaskId,
      },
    };
    const feedRef = db.ref(`activity_feeds/${LIFE_GRID_ACTIVITY_ID}`).push();
    updates[`users/${uid}/achievements/${LIFE_GRID_ACTIVITY_ID}/${achievementId}`] = achievementRecord;
    updates[`activity_feeds/${LIFE_GRID_ACTIVITY_ID}/${feedRef.key}`] = {
      type: 'achievement_unlocked',
      uid,
      nick_name: nickName,
      achievement_id: achievementId,
      achievement_title: achievement.title,
      created_at: time,
    };
    unlocked.push({ achievementId, title: achievement.title });
  });

  if (Object.keys(updates).length > 0) {
    await db.ref().update(updates);
  }
  return unlocked;
}

exports.completeTask = functions.region(REGION).https.onCall(async (data, context) => {
  const uid = assertAuth(context);
  const activityId = String(data?.activityId || '');
  const taskId = String(data?.taskId || '');
  const imagePath = String(data?.imagePath || '');

  if (activityId !== LIFE_GRID_ACTIVITY_ID || !TASK_LIST_SEQUENCE.includes(taskId)) {
    throw new functions.https.HttpsError('invalid-argument', '活動或任務不存在。');
  }
  if (!isActivityOpen()) {
    throw new functions.https.HttpsError('failed-precondition', '活動已結束，目前只能查看。');
  }
  if (imagePath !== `submissions/${LIFE_GRID_ACTIVITY_ID}/${uid}/${taskId}.jpg`) {
    throw new functions.https.HttpsError('invalid-argument', '照片路徑不正確。');
  }

  const unlockSnapshot = await db.ref(`users/${uid}/activity_unlocks/${LIFE_GRID_ACTIVITY_ID}`).once('value');
  if (!unlockSnapshot.exists()) {
    throw new functions.https.HttpsError('failed-precondition', '尚未解鎖活動。');
  }

  const [exists] = await bucket.file(imagePath).exists();
  if (!exists) {
    throw new functions.https.HttpsError('failed-precondition', '完成任務需要先上傳照片。');
  }

  const activity = await ensureActivityConfig();
  const taskRef = db.ref(`users/${uid}/activities/${LIFE_GRID_ACTIVITY_ID}/tasks/${taskId}`);
  const taskSnapshot = await taskRef.once('value');
  const userTask = taskSnapshot.val() || {};

  if (userTask.status === 'completed') {
    throw new functions.https.HttpsError('already-exists', '任務已完成。');
  }
  if (taskId[0] !== 'N' && !userTask.locked_at) {
    throw new functions.https.HttpsError('failed-precondition', '請先填寫並鎖定任務內容。');
  }

  const time = Date.now();
  const activityTask = activity.tasks?.[taskId] || DEFAULT_TASKS[taskId];
  const taskTitle = sanitizeText(getTaskTitle(taskId, userTask, activityTask), 80);
  const profile = await ensureProfile(uid);
  const nickName = normalizeNickName(profile?.public?.nick_name);
  const submissionId = `${uid}_${taskId}_${time}`;
  const feedRef = db.ref(`activity_feeds/${LIFE_GRID_ACTIVITY_ID}`).push();

  await db.ref().update({
    [`users/${uid}/activities/${LIFE_GRID_ACTIVITY_ID}/tasks/${taskId}/status`]: 'completed',
    [`users/${uid}/activities/${LIFE_GRID_ACTIVITY_ID}/tasks/${taskId}/completed_at`]: time,
    [`users/${uid}/activities/${LIFE_GRID_ACTIVITY_ID}/tasks/${taskId}/image_path`]: imagePath,
    [`users/${uid}/activities/${LIFE_GRID_ACTIVITY_ID}/tasks/${taskId}/submission_id`]: submissionId,
    [`users/${uid}/activities/${LIFE_GRID_ACTIVITY_ID}/updated_at`]: time,
    [`submissions/${LIFE_GRID_ACTIVITY_ID}/${uid}/${taskId}`]: {
      submission_id: submissionId,
      uid,
      task_id: taskId,
      task_title: taskTitle,
      image_path: imagePath,
      image_ratio: '4:5',
      created_at: time,
      status: 'accepted',
    },
    [`activity_feeds/${LIFE_GRID_ACTIVITY_ID}/${feedRef.key}`]: {
      type: 'task_completed',
      uid,
      nick_name: nickName,
      task_id: taskId,
      task_title: taskTitle,
      created_at: time,
    },
  });

  const unlockedAchievements = await evaluateAchievements(uid, activity, taskId);
  return { completed: true, unlockedAchievements };
});

exports.adminUpdateNTask = functions.region(REGION).https.onCall(async (data, context) => {
  const uid = assertAuth(context);
  await assertAdmin(uid);

  const taskId = String(data?.taskId || '');
  if (!/^N\d+$/.test(taskId) || !TASK_LIST_SEQUENCE.includes(taskId)) {
    throw new functions.https.HttpsError('invalid-argument', '只能編輯 N 任務。');
  }

  const title = sanitizeText(data?.title, 60);
  const description = sanitizeText(data?.description, 300);
  if (!title) {
    throw new functions.https.HttpsError('invalid-argument', 'N 任務標題必填。');
  }

  await ensureActivityConfig();
  await db.ref(`activities/${LIFE_GRID_ACTIVITY_ID}/tasks/${taskId}`).update({
    task_id: taskId,
    level: 'N',
    index: Number(taskId.slice(1)),
    code: taskId,
    title,
    description,
    user_editable: false,
    updated_at: Date.now(),
  });

  return { ok: true };
});

exports.adminResetTaskCompletion = functions.region(REGION).https.onCall(async (data, context) => {
  const adminUid = assertAuth(context);
  await assertAdmin(adminUid);

  const targetUid = String(data?.uid || '');
  const taskId = String(data?.taskId || '');
  if (!targetUid || !TASK_LIST_SEQUENCE.includes(taskId)) {
    throw new functions.https.HttpsError('invalid-argument', '會員 UID 或任務代號不正確。');
  }

  const taskRef = db.ref(`users/${targetUid}/activities/${LIFE_GRID_ACTIVITY_ID}/tasks/${taskId}`);
  const taskSnapshot = await taskRef.once('value');
  const task = taskSnapshot.val();
  if (!task) {
    throw new functions.https.HttpsError('not-found', '找不到任務資料。');
  }

  await db.ref().update({
    [`users/${targetUid}/activities/${LIFE_GRID_ACTIVITY_ID}/tasks/${taskId}/status`]: 'open',
    [`users/${targetUid}/activities/${LIFE_GRID_ACTIVITY_ID}/tasks/${taskId}/completed_at`]: null,
    [`users/${targetUid}/activities/${LIFE_GRID_ACTIVITY_ID}/tasks/${taskId}/image_path`]: null,
    [`users/${targetUid}/activities/${LIFE_GRID_ACTIVITY_ID}/tasks/${taskId}/submission_id`]: null,
    [`submissions/${LIFE_GRID_ACTIVITY_ID}/${targetUid}/${taskId}`]: null,
  });

  await revokeNoLongerValidAchievements(targetUid);
  return { ok: true };
});

exports.adminDeleteUserData = functions.region(REGION).https.onCall(async (data, context) => {
  const adminUid = assertAuth(context);
  await assertAdmin(adminUid);

  const targetUid = String(data?.uid || '').trim();
  if (!targetUid) {
    throw new functions.https.HttpsError('invalid-argument', '會員 UID 必填。');
  }

  const feedSnapshot = await db.ref(`activity_feeds/${LIFE_GRID_ACTIVITY_ID}`).once('value');
  const feeds = feedSnapshot.val() || {};
  const updates = {
    [`users/${targetUid}`]: null,
    [`submissions/${LIFE_GRID_ACTIVITY_ID}/${targetUid}`]: null,
    [`user_code_attempts/${targetUid}`]: null,
  };

  Object.entries(feeds).forEach(([feedId, feed]) => {
    if (feed?.uid === targetUid) {
      updates[`activity_feeds/${LIFE_GRID_ACTIVITY_ID}/${feedId}`] = null;
    }
  });

  await db.ref().update(updates);

  const [files] = await bucket.getFiles({
    prefix: `submissions/${LIFE_GRID_ACTIVITY_ID}/${targetUid}/`,
  });
  await Promise.all(files.map((file) => file.delete().catch(() => null)));

  return { ok: true };
});

async function revokeNoLongerValidAchievements(uid) {
  const activity = await ensureActivityConfig();
  const tasksSnapshot = await db.ref(`users/${uid}/activities/${LIFE_GRID_ACTIVITY_ID}/tasks`).once('value');
  const userTasks = tasksSnapshot.val() || {};
  const completedTasks = Object.entries(userTasks)
    .filter(([, task]) => task.status === 'completed')
    .map(([taskId]) => taskId);
  const earnedSnapshot = await db.ref(`users/${uid}/achievements/${LIFE_GRID_ACTIVITY_ID}`).once('value');
  const earned = earnedSnapshot.val() || {};
  const updates = {};

  Object.entries(earned).forEach(([achievementId]) => {
    const achievement = activity.achievements?.[achievementId];
    if (!achievement) return;
    if (!conditionMet(achievement.condition, completedTasks, '')) {
      updates[`users/${uid}/achievements/${LIFE_GRID_ACTIVITY_ID}/${achievementId}`] = null;
    }
  });

  if (Object.keys(updates).length > 0) {
    await db.ref().update(updates);
  }
}
