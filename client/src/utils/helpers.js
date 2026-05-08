import {
  MAX_NICKNAME_LENGTH,
  GRID_SEQUENCE,
  FALLBACK_ACTIVITY_CONFIG,
} from '@/config/constants'

export function formatDate(timestamp) {
  if (!timestamp) return '-'
  const d = new Date(timestamp)
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function formatFullDate(timestamp) {
  if (!timestamp) return '-'
  const d = new Date(timestamp)
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}

export function normalizeNickName(value) {
  const text = String(value || '').trim()
  if (!text) return '匿名'
  return Array.from(text).slice(0, MAX_NICKNAME_LENGTH).join('')
}

export function sanitizeText(value, maxLength) {
  return Array.from(String(value || '').trim()).slice(0, maxLength).join('')
}

export function getDefaultProfile() {
  return {
    public: { nick_name: '匿名' },
    private: { real_name: '', address: '' },
    created_at: Date.now(),
    updated_at: Date.now(),
    schema_version: 1,
  }
}

export function normalizeProfile(rawProfile) {
  const defaults = getDefaultProfile()
  return {
    ...defaults,
    ...(rawProfile || {}),
    public: {
      ...defaults.public,
      ...(rawProfile?.public || {}),
      nick_name: normalizeNickName(rawProfile?.public?.nick_name),
    },
    private: {
      ...defaults.private,
      ...(rawProfile?.private || {}),
      real_name: sanitizeText(rawProfile?.private?.real_name, 60),
      address: sanitizeText(rawProfile?.private?.address, 120),
    },
  }
}

export function mergeActivityConfig(rawConfig) {
  const mergedTasks = {
    ...FALLBACK_ACTIVITY_CONFIG.tasks,
    ...(rawConfig?.tasks || {}),
  }
  return {
    ...FALLBACK_ACTIVITY_CONFIG,
    ...(rawConfig || {}),
    task_order: Array.isArray(rawConfig?.task_order) ? rawConfig.task_order : GRID_SEQUENCE,
    achievements: {
      ...FALLBACK_ACTIVITY_CONFIG.achievements,
      ...(rawConfig?.achievements || {}),
    },
    tasks: mergedTasks,
  }
}

export function formatFeedItem(item) {
  const date = formatDate(item.created_at)
  const nickName = item.nick_name || '匿名'
  if (item.type === 'achievement_unlocked') {
    return `${date} ${nickName}解鎖成就${item.achievement_title || ''}`
  }
  return `${date} ${nickName}完成任務${item.task_title || item.task_id || ''}`
}
