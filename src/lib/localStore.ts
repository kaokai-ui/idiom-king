/**
 * Shared localStorage helpers used by both the v1 and v2 storage layers.
 *
 * `readStoredValue` merges any stored object over a copy of the fallback so
 * that missing keys always fall back to the default; callers may add further
 * per-field validation on top of the returned value.
 */
export function readStoredValue<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (parsed === null || typeof parsed !== 'object') return fallback;
    const result = { ...fallback } as Record<string, unknown>;
    for (const field of Object.keys(fallback as Record<string, unknown>)) {
      if (field in parsed) {
        result[field] = parsed[field];
      }
    }
    return result as T;
  } catch {
    return fallback;
  }
}

export function writeStoredValue(key: string, value: unknown, logPrefix = 'storage'): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`[${logPrefix}] Failed to write "${key}":`, err);
  }
}
