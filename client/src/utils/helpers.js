import {
  MAX_NICKNAME_LENGTH,
  GRID_SEQUENCE,
  FALLBACK_ACTIVITY_CONFIG,
  ACHIEVEMENT_RARITIES,
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

export function normalizeActivityCode(value) {
  return String(value || '').trim().toUpperCase()
}

export function normalizeAchievementRarity(value) {
  const rarity = String(value || '').trim().toLowerCase()
  return ACHIEVEMENT_RARITIES[rarity] ? rarity : 'common'
}

export function getAchievementRarityMeta(value) {
  const rarity = normalizeAchievementRarity(value)
  return {
    id: rarity,
    ...ACHIEVEMENT_RARITIES[rarity],
    toneClass: `feed-rarity-${rarity}`,
  }
}

export async function hashActivityCode(value) {
  const data = new TextEncoder().encode(normalizeActivityCode(value))
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
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
  const achievementIds = new Set([
    ...Object.keys(FALLBACK_ACTIVITY_CONFIG.achievements || {}),
    ...Object.keys(rawConfig?.achievements || {}),
  ])
  const achievements = Object.fromEntries(
    Array.from(achievementIds).map((id) => {
      const fallback = FALLBACK_ACTIVITY_CONFIG.achievements?.[id] || {}
      const raw = rawConfig?.achievements?.[id] || {}
      return [id, {
        ...fallback,
        ...raw,
        rarity: normalizeAchievementRarity(raw.rarity || fallback.rarity),
      }]
    }),
  )

  return {
    ...FALLBACK_ACTIVITY_CONFIG,
    ...(rawConfig || {}),
    task_order: Array.isArray(rawConfig?.task_order) ? rawConfig.task_order : GRID_SEQUENCE,
    achievements,
    tasks: mergedTasks,
  }
}

export function formatFeedItem(item) {
  return getFeedItemDisplay(item).sentence
}

export function getFeedItemDisplay(item = {}) {
  const date = formatDate(item.created_at)
  const nickName = item.nick_name || '匿名'
  if (item.type === 'achievement_unlocked') {
    const meta = getAchievementRarityMeta(item.achievement_rarity || item.rarity)
    const title = item.achievement_title || '神秘成就'
    return {
      id: item.id || `${item.created_at || ''}-${item.achievement_id || title}`,
      type: 'achievement',
      isAchievement: true,
      rarity: meta.id,
      toneClass: meta.toneClass,
      badge: meta.badge,
      rarityLabel: meta.label,
      eyebrow: `${date} · ${meta.label}成就`,
      title,
      body: `${nickName} 解鎖成就`,
      shortText: `${nickName} 解鎖 ${title}`,
      sentence: `${date} ${nickName} 解鎖${meta.label}成就 ${title}`,
    }
  }
  const taskTitle = item.task_title || item.task_id || '任務'
  return {
    id: item.id || `${item.created_at || ''}-${item.task_id || taskTitle}`,
    type: 'task',
    isAchievement: false,
    rarity: 'task',
    toneClass: 'feed-type-task',
    badge: item.task_id || 'DONE',
    rarityLabel: '任務',
    eyebrow: `${date} · 任務完成`,
    title: taskTitle,
    body: `${nickName} 完成任務`,
    shortText: `${nickName} 完成 ${taskTitle}`,
    sentence: `${date} ${nickName} 完成任務 ${taskTitle}`,
  }
}
