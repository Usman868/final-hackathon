/**
 * Safe helpers so empty/malformed API data never crashes the UI.
 */

export function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

export function safeObj(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

/** Parse date; returns null if invalid */
export function safeDate(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDateSafe(value, pattern, formatFn) {
  const d = safeDate(value);
  if (!d || typeof formatFn !== 'function') return '—';
  try {
    return formatFn(d, pattern);
  } catch {
    return '—';
  }
}

export function formatDistanceSafe(value, formatDistanceToNow, options = {}) {
  const d = safeDate(value);
  if (!d || typeof formatDistanceToNow !== 'function') return '—';
  try {
    return formatDistanceToNow(d, options);
  } catch {
    return '—';
  }
}

/** Safely read nested API payload: data.data.X */
export function pickData(response, key, fallback = null) {
  try {
    const root = response?.data?.data;
    if (root == null) return fallback;
    if (key == null) return root;
    const val = root[key];
    return val === undefined || val === null ? fallback : val;
  } catch {
    return fallback;
  }
}

export function initials(name, max = 2) {
  if (!name || typeof name !== 'string') return '?';
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, max)
    .toUpperCase() || '?';
}
