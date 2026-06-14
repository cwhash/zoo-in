const assert = require('assert/strict');
const test = require('node:test');
const path = require('path');
const { loadWithFirebaseMocks } = require('./helpers/load-with-firebase-mocks');

const adminPath = path.resolve(__dirname, '../admin.js');

test('buildAdminClaims preserves existing claims when granting admin', () => {
  delete require.cache[adminPath];
  const { loaded } = loadWithFirebaseMocks(adminPath);

  assert.deepEqual(
    loaded.buildAdminClaims({ role: 'owner' }, true),
    { role: 'owner', admin: true },
  );
});

test('buildAdminClaims removes only admin claim when revoking admin', () => {
  delete require.cache[adminPath];
  const { loaded } = loadWithFirebaseMocks(adminPath);

  assert.deepEqual(
    loaded.buildAdminClaims({ role: 'owner', admin: true }, false),
    { role: 'owner' },
  );
});

test('adminSyncClaims syncs one user from admins database path', async () => {
  delete require.cache[adminPath];
  const { loaded, calls } = loadWithFirebaseMocks(adminPath, {
    dbValues: {
      admins: {
        actor: true,
        target: true,
      },
    },
    adminUsers: {
      target: { customClaims: { role: 'member' } },
    },
  });

  const result = await loaded.adminSyncClaims({ uid: 'target' }, { auth: { uid: 'actor' } });

  assert.equal(result.admin, true);
  assert.equal(result.refreshRequired, true);
  assert.deepEqual(calls.setCustomUserClaims, [
    { uid: 'target', claims: { role: 'member', admin: true } },
  ]);
  assert.equal(calls.auditWrites.length, 1);
  assert.equal(calls.auditWrites[0].value.action, 'admin_sync_claims');
});

test('adminSyncAllClaims updates stale admin claims', async () => {
  delete require.cache[adminPath];
  const { loaded, calls } = loadWithFirebaseMocks(adminPath, {
    dbValues: {
      admins: {
        keepAdmin: true,
      },
    },
    adminUsers: {
      keepAdmin: { customClaims: {} },
      staleAdmin: { customClaims: { admin: true, role: 'old' } },
    },
  });

  const result = await loaded.adminSyncAllClaims({}, { auth: { uid: 'keepAdmin' } });

  assert.equal(result.scannedCount, 2);
  assert.equal(result.updatedCount, 2);
  assert.deepEqual(calls.setCustomUserClaims, [
    { uid: 'keepAdmin', claims: { admin: true } },
    { uid: 'staleAdmin', claims: { role: 'old' } },
  ]);
  assert.equal(calls.auditWrites[0].value.action, 'admin_sync_all_claims');
});
