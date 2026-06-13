const REGION = 'asia-southeast1';
const LIFE_GRID_ACTIVITY_ID = 'life_grid_2027';
const LIFE_GRID_START_AT = new Date('2026-07-01T00:00:00+08:00').getTime();
const LIFE_GRID_END_AT = new Date('2028-01-01T00:00:00+08:00').getTime();
const CODE_MAX_USES = 999;
const NORMAL_COOLDOWN_MS = 5000;
const LOCKED_COOLDOWN_MS = 10 * 60 * 1000;
const DAILY_WRONG_LIMIT = 10;

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

module.exports = {
  REGION,
  LIFE_GRID_ACTIVITY_ID,
  LIFE_GRID_START_AT,
  LIFE_GRID_END_AT,
  CODE_MAX_USES,
  NORMAL_COOLDOWN_MS,
  LOCKED_COOLDOWN_MS,
  DAILY_WRONG_LIMIT,
  GRID_SEQUENCE,
  TASK_LIST_SEQUENCE,
  ACHIEVEMENT_RARITIES,
  DEFAULT_ACHIEVEMENTS,
  DEFAULT_TASKS,
};
