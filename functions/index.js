const { unlockActivity, completeTask } = require('./life-grid-2027');
const {
  adminUpdateActivityCode,
  adminUpdateNTask,
  adminResetTaskCompletion,
  adminDeleteUserData,
} = require('./admin');

exports.unlockActivity = unlockActivity;
exports.completeTask = completeTask;
exports.adminUpdateActivityCode = adminUpdateActivityCode;
exports.adminUpdateNTask = adminUpdateNTask;
exports.adminResetTaskCompletion = adminResetTaskCompletion;
exports.adminDeleteUserData = adminDeleteUserData;
