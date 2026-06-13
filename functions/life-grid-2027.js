const { bucket, callableRuntime, db } = require('./firebase');
const {
  DEFAULT_TASKS,
  LIFE_GRID_ACTIVITY_ID,
  TASK_LIST_SEQUENCE,
} = require('./constants');
const {
  assertAuth,
  canUnlockActivity,
  hashCode,
  httpsError,
  isActivityOpen,
  mergeAchievementDefinitions,
  normalizeAchievementRarity,
  normalizeCode,
  normalizeNickName,
  sanitizeText,
} = require('./utils');
const {
  ensureActivityConfig,
  ensureProfile,
  getCodeRecordByHash,
  getDefaultUserTasks,
  incrementActivityCodeUse,
  incrementJoinCounter,
  recordAttempt,
} = require('./db');

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

const unlockActivity = callableRuntime.https.onCall(async (data, context) => {
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

const completeTask = callableRuntime.https.onCall(async (data, context) => {
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

module.exports = {
  unlockActivity,
  completeTask,
  evaluateAchievements,
  revokeNoLongerValidAchievements,
};
