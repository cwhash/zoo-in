const admin = require('firebase-admin');
const crypto = require('crypto');
const functions = require('firebase-functions/v1');

admin.initializeApp();

const db = admin.database();
const bucket = admin.storage().bucket();

const REGION = 'asia-southeast1';
const LIFE_GRID_ACTIVITY_ID = 'life_grid_2027';
const LIFE_GRID_START_AT = new Date('2026-07-01T00:00:00+08:00').getTime();
const LIFE_GRID_END_AT = new Date('2028-01-01T00:00:00+08:00').getTime();
const CODE_MAX_USES = 999;
const NORMAL_COOLDOWN_MS = 5000;
const LOCKED_COOLDOWN_MS = 10 * 60 * 1000;
const DAILY_WRONG_LIMIT = 10;

const callableRuntime = functions.region(REGION).runWith({
  maxInstances: 3,
});

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

const ACHIEVEMENT_RARITIES = new Set(['common', 'rare', 'epic', 'legendary', 'secret']);

const DEFAULT_ACHIEVEMENTS = {
  first_task_completed: {
    title: '第一個任務完成',
    description: '完成 Life Grid 的第一個任務。',
    hidden: true,
    rarity: 'common',
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

function httpsError(code, message) {
  return new functions.https.HttpsError(code, message);
}

function assertAuth(context) {
  if (!context.auth?.uid) {
    throw httpsError('unauthenticated', '請先登入。');
  }
  return context.auth.uid;
}

async function assertAdmin(uid) {
  const snapshot = await db.ref(`admins/${uid}`).once('value');
  if (snapshot.val() !== true) {
    throw httpsError('permission-denied', '你沒有管理員權限。');
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

function hashCode(code) {
  return crypto.createHash('sha256').update(normalizeCode(code)).digest('hex');
}

function normalizeNickName(value) {
  const text = String(value || '').trim();
  return Array.from(text || '玩家').slice(0, 10).join('');
}

function sanitizeText(value, maxLength) {
  return Array.from(String(value || '').trim()).slice(0, maxLength).join('');
}

function normalizeAchievementRarity(value) {
  const rarity = String(value || '').trim().toLowerCase();
  return ACHIEVEMENT_RARITIES.has(rarity) ? rarity : 'common';
}

function mergeAchievementDefinitions(existing = {}) {
  const ids = new Set([
    ...Object.keys(DEFAULT_ACHIEVEMENTS),
    ...Object.keys(existing || {}),
  ]);
  return Object.fromEntries(Array.from(ids).map((id) => {
    const fallback = DEFAULT_ACHIEVEMENTS[id] || {};
    const raw = existing?.[id] || {};
    return [id, {
      ...fallback,
      ...raw,
      rarity: normalizeAchievementRarity(raw.rarity || fallback.rarity),
    }];
  }));
}

function getDefaultUserTasks() {
  const now = Date.now();
  return Object.fromEntries(TASK_LIST_SEQUENCE.map((taskId) => [taskId, {
    task_id: taskId,
    level: taskId[0],
    status: 'open',
    created_at: now,
    updated_at: now,
  }]));
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
    achievements: mergeAchievementDefinitions(existing.achievements),
    updated_at: Date.now(),
  };

  if (!snapshot.exists()) {
    await activityRef.set(next);
  }

  await db.ref(`activity_registry/${LIFE_GRID_ACTIVITY_ID}`).update({
    activity_id: LIFE_GRID_ACTIVITY_ID,
    name: next.name,
    type: next.type,
    status: next.status,
    start_at: next.start_at,
    end_at: next.end_at,
    updated_at: Date.now(),
  });

  return next;
}

async function ensureProfile(uid) {
  const profileRef = db.ref(`users/${uid}/profile`);
  const snapshot = await profileRef.once('value');
  if (snapshot.exists()) return snapshot.val();

  const profile = {
    public: {
      nick_name: '玩家',
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
    throw httpsError(
      'resource-exhausted',
      wrongCount >= DAILY_WRONG_LIMIT
        ? `今天錯誤次數過多，請 ${waitSeconds} 秒後再試。`
        : `請 ${waitSeconds} 秒後再試。`,
    );
  }

  await ref.set({
    last_attempt_at: time,
    wrong_count: isCorrect ? 0 : wrongCount + 1,
    updated_at: time,
  });
}

async function getCodeRecordByHash(codeHash) {
  const snapshot = await db.ref(`activity_code_hashes/${codeHash}`).once('value');
  if (!snapshot.exists()) return null;
  const record = snapshot.val() || {};
  if (record.code_hash && record.code_hash !== codeHash) return null;
  if (record.active === false) return null;
  if (record.activity_id !== LIFE_GRID_ACTIVITY_ID) return null;
  return {
    ...record,
    code_hash: codeHash,
    max_uses: Number(record.max_uses || CODE_MAX_USES),
    used_count: Number(record.used_count || 0),
  };
}

async function incrementActivityCodeUse(codeHash, maxUses) {
  const codeRef = db.ref(`activity_code_hashes/${codeHash}`);
  const result = await codeRef.transaction((current) => {
    if (!current || current.active === false || current.activity_id !== LIFE_GRID_ACTIVITY_ID) return;
    const limit = Number(current.max_uses || maxUses || CODE_MAX_USES);
    const used = Number(current.used_count || 0);
    if (used >= limit || used >= CODE_MAX_USES) return;
    return {
      ...current,
      code_hash: codeHash,
      max_uses: limit,
      used_count: used + 1,
      updated_at: Date.now(),
    };
  });

  if (!result.committed) {
    throw httpsError('resource-exhausted', '活動代碼使用人數已達上限。');
  }
}

async function incrementJoinCounter() {
  const counterRef = db.ref(`activity_join_counters/${LIFE_GRID_ACTIVITY_ID}`);
  const result = await counterRef.transaction((current) => {
    const data = current || {};
    const joinedCount = Number(data.joined_count || 0);
    if (joinedCount >= CODE_MAX_USES) return;
    return {
      activity_id: LIFE_GRID_ACTIVITY_ID,
      joined_count: joinedCount + 1,
      updated_at: Date.now(),
    };
  });

  if (!result.committed) {
    throw httpsError('resource-exhausted', 'Life Grid 參加人數已達上限。');
  }
}

exports.unlockActivity = callableRuntime.https.onCall(async (data, context) => {
  const uid = assertAuth(context);
  const submittedCode = normalizeCode(data?.code);
  if (!submittedCode) {
    throw httpsError('invalid-argument', '請輸入活動代碼。');
  }

  const submittedHash = hashCode(submittedCode);
  const codeRecord = await getCodeRecordByHash(submittedHash);
  await recordAttempt(uid, Boolean(codeRecord));

  if (!codeRecord) {
    throw httpsError('invalid-argument', '活動代碼不正確或已停用。');
  }

  const activity = await ensureActivityConfig();
  if (activity.status !== 'active' || !canUnlockActivity()) {
    throw httpsError('failed-precondition', '活動目前不能解鎖。');
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

  await incrementActivityCodeUse(submittedHash, codeRecord.max_uses);
  await incrementJoinCounter();
  await ensureProfile(uid);

  const time = Date.now();
  await db.ref().update({
    [`users/${uid}/activity_unlocks/${LIFE_GRID_ACTIVITY_ID}`]: {
      activity_id: LIFE_GRID_ACTIVITY_ID,
      unlocked_at: time,
      code_hash: submittedHash,
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
  const achievements = mergeAchievementDefinitions(activity.achievements);
  const unlocked = [];
  const updates = {};
  const time = Date.now();
  const profile = await ensureProfile(uid);
  const nickName = normalizeNickName(profile?.public?.nick_name);

  Object.entries(achievements).forEach(([achievementId, achievement]) => {
    if (earned[achievementId]) return;
    if (!conditionMet(achievement.condition, completedTasks, sourceTaskId)) return;

    const rarity = normalizeAchievementRarity(achievement.rarity);
    const achievementRecord = {
      title: achievement.title,
      description: achievement.description || '',
      rarity,
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
      achievement_rarity: rarity,
      created_at: time,
    };
    unlocked.push({ achievementId, title: achievement.title, rarity });
  });

  if (Object.keys(updates).length > 0) {
    await db.ref().update(updates);
  }
  return unlocked;
}

exports.completeTask = callableRuntime.https.onCall(async (data, context) => {
  const uid = assertAuth(context);
  const activityId = String(data?.activityId || '');
  const taskId = String(data?.taskId || '');
  const imagePath = String(data?.imagePath || '');

  if (activityId !== LIFE_GRID_ACTIVITY_ID || !TASK_LIST_SEQUENCE.includes(taskId)) {
    throw httpsError('invalid-argument', '活動或任務不正確。');
  }
  if (!isActivityOpen()) {
    throw httpsError('failed-precondition', '活動尚未開始或已結束。');
  }
  if (imagePath !== `submissions/${LIFE_GRID_ACTIVITY_ID}/${uid}/${taskId}.jpg`) {
    throw httpsError('invalid-argument', '照片路徑不正確。');
  }

  const unlockSnapshot = await db.ref(`users/${uid}/activity_unlocks/${LIFE_GRID_ACTIVITY_ID}`).once('value');
  if (!unlockSnapshot.exists()) {
    throw httpsError('failed-precondition', '請先解鎖活動。');
  }

  const [exists] = await bucket.file(imagePath).exists();
  if (!exists) {
    throw httpsError('failed-precondition', '找不到任務照片，請重新上傳。');
  }

  const activity = await ensureActivityConfig();
  const taskRef = db.ref(`users/${uid}/activities/${LIFE_GRID_ACTIVITY_ID}/tasks/${taskId}`);
  const taskSnapshot = await taskRef.once('value');
  const userTask = taskSnapshot.val() || {};

  if (userTask.status === 'completed') {
    throw httpsError('already-exists', '任務已完成。');
  }
  if (taskId[0] !== 'N' && !userTask.locked_at) {
    throw httpsError('failed-precondition', '請先保存任務規劃再完成任務。');
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

exports.adminUpdateActivityCode = callableRuntime.https.onCall(async (data, context) => {
  const uid = assertAuth(context);
  await assertAdmin(uid);

  const code = normalizeCode(data?.code);
  if (!code) {
    throw httpsError('invalid-argument', '請輸入活動代碼。');
  }

  const maxUses = Number(data?.maxUses || CODE_MAX_USES);
  if (!Number.isInteger(maxUses) || maxUses < 1 || maxUses > CODE_MAX_USES) {
    throw httpsError('invalid-argument', `使用人數上限必須介於 1 到 ${CODE_MAX_USES}。`);
  }

  await ensureActivityConfig();
  const codeHash = hashCode(code);
  const now = Date.now();
  const existingSnapshot = await db.ref(`activity_code_hashes/${codeHash}`).once('value');
  const existing = existingSnapshot.val() || {};
  const usedCount = Number(existing.used_count || 0);
  if (maxUses < usedCount) {
    throw httpsError('failed-precondition', '使用人數上限不能小於目前已使用次數。');
  }

  const updates = {};
  const codeListSnapshot = await db.ref('activity_code_hashes')
    .orderByChild('activity_id')
    .equalTo(LIFE_GRID_ACTIVITY_ID)
    .once('value');
  codeListSnapshot.forEach((child) => {
    if (child.key !== codeHash) {
      updates[`activity_code_hashes/${child.key}/active`] = false;
      updates[`activity_code_hashes/${child.key}/updated_at`] = now;
    }
  });

  updates[`activity_code_hashes/${codeHash}`] = {
    activity_id: LIFE_GRID_ACTIVITY_ID,
    code_hash: codeHash,
    active: true,
    max_uses: maxUses,
    used_count: usedCount,
    created_at: existing.created_at || now,
    updated_at: now,
  };
  updates[`activity_registry/${LIFE_GRID_ACTIVITY_ID}/max_uses`] = maxUses;
  updates[`activity_registry/${LIFE_GRID_ACTIVITY_ID}/updated_at`] = now;

  await db.ref().update(updates);

  return {
    activityId: LIFE_GRID_ACTIVITY_ID,
    codeHash,
    maxUses,
    usedCount,
  };
});

exports.adminUpdateNTask = callableRuntime.https.onCall(async (data, context) => {
  const uid = assertAuth(context);
  await assertAdmin(uid);

  const taskId = String(data?.taskId || '').toUpperCase();
  if (!/^N\d+$/.test(taskId) || !TASK_LIST_SEQUENCE.includes(taskId)) {
    throw httpsError('invalid-argument', '只能編輯 N 任務。');
  }

  const title = sanitizeText(data?.title, 60);
  const description = sanitizeText(data?.description, 300);
  if (!title) {
    throw httpsError('invalid-argument', 'N 任務標題不能空白。');
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

exports.adminResetTaskCompletion = callableRuntime.https.onCall(async (data, context) => {
  const adminUid = assertAuth(context);
  await assertAdmin(adminUid);

  const targetUid = String(data?.uid || '').trim();
  const taskId = String(data?.taskId || '').toUpperCase();
  if (!targetUid || !TASK_LIST_SEQUENCE.includes(taskId)) {
    throw httpsError('invalid-argument', '請提供有效的 UID 與任務代號。');
  }

  const taskRef = db.ref(`users/${targetUid}/activities/${LIFE_GRID_ACTIVITY_ID}/tasks/${taskId}`);
  const taskSnapshot = await taskRef.once('value');
  const task = taskSnapshot.val();
  if (!task) {
    throw httpsError('not-found', '找不到這個任務資料。');
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

exports.adminDeleteUserData = callableRuntime.https.onCall(async (data, context) => {
  const adminUid = assertAuth(context);
  await assertAdmin(adminUid);

  const targetUid = String(data?.uid || '').trim();
  if (!targetUid) {
    throw httpsError('invalid-argument', '請提供 UID。');
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
