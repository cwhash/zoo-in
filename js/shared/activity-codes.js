export const LIFE_GRID_ACTIVITY_ID = 'life_grid_2027';
export const LIFE_GRID_MAX_USES = 999;

export function normalizeActivityCode(value) {
  return String(value || '').trim().toUpperCase();
}

export async function hashActivityCode(value) {
  const data = new TextEncoder().encode(normalizeActivityCode(value));
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}
