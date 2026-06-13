const crypto = require('crypto');
const functions = require('firebase-functions/v1');
const { db } = require('./firebase');
const {
  ACHIEVEMENT_RARITIES,
  DEFAULT_ACHIEVEMENTS,
  LIFE_GRID_START_AT,
  LIFE_GRID_END_AT,
} = require('./constants');

function httpsError(code, message) {
  return new functions.https.HttpsError(code, message);
}

function assertAuth(context) {
  if (!context.auth?.uid) {
    throw httpsError('unauthenticated', '請先登入。');
  }
  return context.auth.uid;
}

async function assertAdmin(uid) {
  const snapshot = await db.ref(`admins/${uid}`).once('value');
  if (snapshot.val() !== true) {
    throw httpsError('permission-denied', '你沒有管理員權限。');
  }
}

function isActivityOpen(time = Date.now()) {
  return time >= LIFE_GRID_START_AT && time < LIFE_GRID_END_AT;
}

function canUnlockActivity(time = Date.now()) {
  return time < LIFE_GRID_END_AT;
}

function getTaipeiDateKey(time = Date.now()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(time));
}

function normalizeCode(code) {
  return String(code || '').trim().toUpperCase();
}

function hashCode(code) {
  return crypto.createHash('sha256').update(normalizeCode(code)).digest('hex');
}

function normalizeNickName(value) {
  const text = String(value || '').trim();
  return Array.from(text || '玩家').slice(0, 10).join('');
}

function sanitizeText(value, maxLength) {
  return Array.from(String(value || '').trim()).slice(0, maxLength).join('');
}

function normalizeAchievementRarity(value) {
  const rarity = String(value || '').trim().toLowerCase();
  return ACHIEVEMENT_RARITIES.has(rarity) ? rarity : 'common';
}

function mergeAchievementDefinitions(existing = {}) {
  const ids = new Set([
    ...Object.keys(DEFAULT_ACHIEVEMENTS),
    ...Object.keys(existing || {}),
  ]);
  return Object.fromEntries(Array.from(ids).map((id) => {
    const fallback = DEFAULT_ACHIEVEMENTS[id] || {};
    const raw = existing?.[id] || {};
    return [id, {
      ...fallback,
      ...raw,
      rarity: normalizeAchievementRarity(raw.rarity || fallback.rarity),
    }];
  }));
}

module.exports = {
  httpsError,
  assertAuth,
  assertAdmin,
  isActivityOpen,
  canUnlockActivity,
  getTaipeiDateKey,
  normalizeCode,
  hashCode,
  normalizeNickName,
  sanitizeText,
  normalizeAchievementRarity,
  mergeAchievementDefinitions,
};
