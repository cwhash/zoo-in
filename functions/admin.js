const { bucket, callableRuntime, db } = require('./firebase');
const {
  CODE_MAX_USES,
  LIFE_GRID_ACTIVITY_ID,
  TASK_LIST_SEQUENCE,
} = require('./constants');
const {
  assertAdmin,
  assertAuth,
  hashCode,
  httpsError,
  normalizeCode,
  sanitizeText,
} = require('./utils');
const { ensureActivityConfig } = require('./db');
const { revokeNoLongerValidAchievements } = require('./life-grid-2027');

const adminUpdateActivityCode = callableRuntime.https.onCall(async (data, context) => {
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

const adminUpdateNTask = callableRuntime.https.onCall(async (data, context) => {
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

const adminResetTaskCompletion = callableRuntime.https.onCall(async (data, context) => {
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

const adminDeleteUserData = callableRuntime.https.onCall(async (data, context) => {
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

module.exports = {
  adminUpdateActivityCode,
  adminUpdateNTask,
  adminResetTaskCompletion,
  adminDeleteUserData,
};
