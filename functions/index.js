const { unlockActivity, completeTask } = require('./life-grid-2027');
const {
  adminSyncClaims,
  adminSyncAllClaims,
  adminUpdateActivityCode,
  adminUpdateNTask,
  adminResetTaskCompletion,
  adminDeleteUserData,
} = require('./admin');

exports.unlockActivity = unlockActivity;
exports.completeTask = completeTask;
exports.adminSyncClaims = adminSyncClaims;
exports.adminSyncAllClaims = adminSyncAllClaims;
exports.adminUpdateActivityCode = adminUpdateActivityCode;
exports.adminUpdateNTask = adminUpdateNTask;
exports.adminResetTaskCompletion = adminResetTaskCompletion;
exports.adminDeleteUserData = adminDeleteUserData;
