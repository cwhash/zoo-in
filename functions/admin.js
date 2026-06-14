const { admin, bucket, callableRuntime, db } = require('./firebase');
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

async function writeAdminAuditLog(actor, action, details = {}) {
  const timestamp = Date.now();
  await db.ref(`admin_audit_log/${timestamp}`).set({
    actor,
    action,
    timestamp,
    ...details,
  });
}

async function getDbAdminUids() {
  const adminsSnapshot = await db.ref('admins').once('value');
  const admins = adminsSnapshot.val() || {};
  return new Set(
    Object.entries(admins)
      .filter(([, value]) => value === true)
      .map(([uid]) => uid),
  );
}

async function setAdminClaimFromDb(targetUid, adminUids = null) {
  const isAdmin = adminUids
    ? adminUids.has(targetUid)
    : (await db.ref(`admins/${targetUid}`).once('value')).val() === true;

  let userRecord;
  try {
    userRecord = await admin.auth().getUser(targetUid);
  } catch (error) {
    if (error?.code === 'auth/user-not-found') {
      throw httpsError('not-found', '找不到這個使用者。');
    }
    throw error;
  }

  const nextClaims = {
    ...(userRecord.customClaims || {}),
  };
  if (isAdmin) {
    nextClaims.admin = true;
  } else {
    delete nextClaims.admin;
  }

  await admin.auth().setCustomUserClaims(targetUid, nextClaims);
  return {
    uid: targetUid,
    admin: isAdmin,
  };
}

const adminSyncClaims = callableRuntime.https.onCall(async (data, context) => {
  const actor = assertAuth(context);
  await assertAdmin(actor);

  const targetUid = String(data?.uid || '').trim();
  if (!targetUid) {
    throw httpsError('invalid-argument', '請提供 UID。');
  }

  const result = await setAdminClaimFromDb(targetUid);
  await writeAdminAuditLog(actor, 'admin_sync_claims', {
    targetUid,
    admin: result.admin,
  });

  return {
    ...result,
    refreshRequired: true,
  };
});

const adminSyncAllClaims = callableRuntime.https.onCall(async (data, context) => {
  const actor = assertAuth(context);
  await assertAdmin(actor);

  const adminUids = await getDbAdminUids();
  let pageToken;
  let scannedCount = 0;
  let updatedCount = 0;
  const updated = [];

  do {
    const page = await admin.auth().listUsers(1000, pageToken);
    await Promise.all(page.users.map(async (userRecord) => {
      scannedCount += 1;
      const shouldBeAdmin = adminUids.has(userRecord.uid);
      const hasAdminClaim = userRecord.customClaims?.admin === true;
      if (shouldBeAdmin === hasAdminClaim) return;

      const nextClaims = {
        ...(userRecord.customClaims || {}),
      };
      if (shouldBeAdmin) {
        nextClaims.admin = true;
      } else {
        delete nextClaims.admin;
      }
      await admin.auth().setCustomUserClaims(userRecord.uid, nextClaims);
      updatedCount += 1;
      updated.push({
        uid: userRecord.uid,
        admin: shouldBeAdmin,
      });
    }));
    pageToken = page.pageToken;
  } while (pageToken);

  await writeAdminAuditLog(actor, 'admin_sync_all_claims', {
    scannedCount,
    updatedCount,
  });

  return {
    scannedCount,
    updatedCount,
    updated,
    refreshRequired: updatedCount > 0,
  };
});

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
  adminSyncClaims,
  adminSyncAllClaims,
  adminUpdateActivityCode,
  adminUpdateNTask,
  adminResetTaskCompletion,
  adminDeleteUserData,
};
