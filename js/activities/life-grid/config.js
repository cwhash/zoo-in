import { LIFE_GRID_ACTIVITY_ID, LIFE_GRID_MAX_USES } from '../../shared/activity-codes.js';

export { LIFE_GRID_ACTIVITY_ID, LIFE_GRID_MAX_USES };

export const LIFE_GRID_START_AT = new Date('2026-07-01T00:00:00+08:00').getTime();
export const LIFE_GRID_END_AT = new Date('2028-01-01T00:00:00+08:00').getTime();

export const GRID_SEQUENCE = [
  'A1', 'N1', 'C1', 'N2', 'N3',
  'N4', 'B1', 'C2', 'B2', 'N5',
  'C3', 'C4', 'S1', 'C5', 'C6',
  'N6', 'B3', 'C7', 'B4', 'N7',
  'N8', 'N9', 'C8', 'N10', 'A2',
];

export const TASK_LIST_SEQUENCE = [
  'S1',
  'A1', 'A2',
  'B1', 'B2', 'B3', 'B4',
  'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8',
  'N1', 'N2', 'N3', 'N4', 'N5', 'N6', 'N7', 'N8', 'N9', 'N10',
];
