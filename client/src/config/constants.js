export const LIFE_GRID_ACTIVITY_ID = 'life_grid_2027'
export const LIFE_GRID_MAX_USES = 999
export const LIFE_GRID_START_AT = new Date('2026-07-01T00:00:00+08:00').getTime()
export const LIFE_GRID_END_AT = new Date('2028-01-01T00:00:00+08:00').getTime()
export const DEV_FORCE_LIFE_GRID_ACTIVE = import.meta.env.VITE_DEV_FORCE_ACTIVE === 'true'

export const OUTPUT_IMAGE_WIDTH = 1080
export const OUTPUT_IMAGE_HEIGHT = 1350
export const OUTPUT_IMAGE_QUALITY = 0.85
export const MAX_UPLOAD_IMAGE_BYTES = 3 * 1024 * 1024
export const MAX_SOURCE_IMAGE_BYTES = 20 * 1024 * 1024
export const MAX_NICKNAME_LENGTH = 10

export const GRID_SEQUENCE = [
  'A1', 'N1', 'C1', 'N2', 'N3',
  'N4', 'B1', 'C2', 'B2', 'N5',
  'C3', 'C4', 'S1', 'C5', 'C6',
  'N6', 'B3', 'C7', 'B4', 'N7',
  'N8', 'N9', 'C8', 'N10', 'A2',
]

export const TASK_LIST_SEQUENCE = [
  'S1',
  'A1', 'A2',
  'B1', 'B2', 'B3', 'B4',
  'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8',
  'N1', 'N2', 'N3', 'N4', 'N5', 'N6', 'N7', 'N8', 'N9', 'N10',
]

export const N_TASKS = TASK_LIST_SEQUENCE.filter((taskId) => taskId.startsWith('N'))

export const LEVEL_NAMES = {
  S: '傳奇',
  A: '挑戰',
  B: '進階',
  C: '基礎',
  N: '日常',
}

export const ACHIEVEMENT_RARITIES = {
  common: {
    label: '普通',
    badge: 'COMMON',
    rank: 1,
  },
  rare: {
    label: '稀有',
    badge: 'RARE',
    rank: 2,
  },
  epic: {
    label: '史詩',
    badge: 'EPIC',
    rank: 3,
  },
  legendary: {
    label: '傳奇',
    badge: 'LEGEND',
    rank: 4,
  },
  secret: {
    label: '隱藏',
    badge: 'SECRET',
    rank: 5,
  },
}

export const DEFAULT_ACHIEVEMENTS = {
  first_task_completed: {
    title: '萬丈高樓平地起',
    description: '傳奇的開始！',
    hidden: true,
    rarity: 'common',
    condition: { type: 'completed_task_count', value: 1 },
  },
}

export const DEFAULT_TASKS = Object.fromEntries(
  TASK_LIST_SEQUENCE.map((taskId) => {
    const level = taskId[0]
    return [taskId, {
      task_id: taskId,
      level,
      index: Number(taskId.slice(1)),
      code: taskId,
      title: level === 'N' ? `官方任務 ${taskId}` : '',
      description: '',
      user_editable: level !== 'N',
    }]
  }),
)

export const FALLBACK_ACTIVITY_CONFIG = {
  activity_id: LIFE_GRID_ACTIVITY_ID,
  name: 'Life Grid 2027',
  type: 'life_grid',
  status: 'active',
  start_at: LIFE_GRID_START_AT,
  end_at: LIFE_GRID_END_AT,
  task_order: GRID_SEQUENCE,
  achievements: { ...DEFAULT_ACHIEVEMENTS },
  tasks: { ...DEFAULT_TASKS },
}
