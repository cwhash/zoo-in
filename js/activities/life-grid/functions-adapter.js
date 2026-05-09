import { LIFE_GRID_ACTIVITY_ID } from '../../shared/activity-codes.js';

export function completeLifeGridTask({ taskId, imagePath }) {
  const callCompleteTask = functions.httpsCallable('completeTask');
  return callCompleteTask({
    activityId: LIFE_GRID_ACTIVITY_ID,
    taskId,
    imagePath,
  });
}

export function adminUpdateLifeGridNTask({ taskId, title, description }) {
  return functions.httpsCallable('adminUpdateNTask')({ taskId, title, description });
}

export function adminResetLifeGridTaskCompletion({ uid, taskId }) {
  return functions.httpsCallable('adminResetTaskCompletion')({ uid, taskId });
}

export function adminDeleteLifeGridUserData({ uid }) {
  return functions.httpsCallable('adminDeleteUserData')({ uid });
}
