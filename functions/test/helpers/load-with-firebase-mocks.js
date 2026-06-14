const Module = require('module');
const path = require('path');

function loadWithFirebaseMocks(modulePath, options = {}) {
  const originalLoad = Module._load;
  const functionsRoot = `${process.cwd()}${path.sep}`;
  Object.keys(require.cache)
    .filter((cachedPath) => cachedPath.startsWith(functionsRoot))
    .forEach((cachedPath) => {
      delete require.cache[cachedPath];
    });

  const calls = {
    setCustomUserClaims: [],
    auditWrites: [],
    ...options.calls,
  };

  const adminUsers = options.adminUsers || {};
  const dbValues = {
    admins: {},
    ...options.dbValues,
  };

  function getDbValue(path) {
    if (Object.prototype.hasOwnProperty.call(dbValues, path)) return dbValues[path];
    if (path.startsWith('admins/')) {
      return dbValues.admins[path.slice('admins/'.length)] || null;
    }
    return null;
  }

  const fakeRef = (path = '') => ({
    once: async () => ({
      val: () => getDbValue(path),
      exists: () => getDbValue(path) != null,
      forEach: () => {},
    }),
    set: async (value) => {
      calls.auditWrites.push({ path, value });
    },
    update: async () => {},
    transaction: async () => ({ committed: true }),
    orderByChild() { return this; },
    equalTo() { return this; },
    push: () => ({ key: 'fake-key' }),
  });

  const fakeAdmin = {
    initializeApp() {},
    database: () => ({ ref: fakeRef }),
    storage: () => ({
      bucket: () => ({
        file: () => ({ exists: async () => [true] }),
        getFiles: async () => [[]],
      }),
    }),
    auth: () => ({
      getUser: async (uid) => {
        const user = adminUsers[uid];
        if (!user) {
          const error = new Error('not found');
          error.code = 'auth/user-not-found';
          throw error;
        }
        return {
          uid,
          customClaims: user.customClaims || {},
        };
      },
      listUsers: async () => ({
        users: Object.entries(adminUsers).map(([uid, user]) => ({
          uid,
          customClaims: user.customClaims || {},
        })),
        pageToken: null,
      }),
      setCustomUserClaims: async (uid, claims) => {
        calls.setCustomUserClaims.push({ uid, claims });
      },
    }),
  };

  const fakeCallableRuntime = {
    https: {
      onCall: (handler) => handler,
    },
  };

  const fakeFunctions = {
    region: () => ({
      runWith: () => fakeCallableRuntime,
    }),
    https: {
      HttpsError: class HttpsError extends Error {
        constructor(code, message) {
          super(message);
          this.code = code;
        }
      },
    },
  };

  Module._load = (request, parent, isMain) => {
    if (request === 'firebase-admin') return fakeAdmin;
    if (request === 'firebase-functions/v1') return fakeFunctions;
    return originalLoad(request, parent, isMain);
  };

  try {
    const loaded = require(modulePath);
    return { loaded, calls };
  } finally {
    Module._load = originalLoad;
  }
}

module.exports = { loadWithFirebaseMocks };
