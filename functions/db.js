const { db } = require('./firebase');
const {
  CODE_MAX_USES,
  DAILY_WRONG_LIMIT,
  DEFAULT_TASKS,
  GRID_SEQUENCE,
  LIFE_GRID_ACTIVITY_ID,
  LIFE_GRID_START_AT,
  LIFE_GRID_END_AT,
  LOCKED_COOLDOWN_MS,
  NORMAL_COOLDOWN_MS,
  TASK_LIST_SEQUENCE,
} = require('./constants');
const {
  getTaipeiDateKey,
  httpsError,
  mergeAchievementDefinitions,
} = require('./utils');

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

module.exports = {
  getDefaultUserTasks,
  ensureActivityConfig,
  ensureProfile,
  recordAttempt,
  getCodeRecordByHash,
  incrementActivityCodeUse,
  incrementJoinCounter,
};
