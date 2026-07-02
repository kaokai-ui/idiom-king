/**
 * Builds a map from character → list of idiom indices that contain that
 * character (deduped per idiom). Shared by the v1 and v2 data layers so the
 * in-memory index is built identically everywhere.
 */
export function buildCharIndex<T extends { chars: string[] }>(items: T[]): Map<string, number[]> {
  const charIndex = new Map<string, number[]>();
  for (let i = 0; i < items.length; i++) {
    const seen = new Set<string>();
    for (const ch of items[i].chars) {
      if (!seen.has(ch)) {
        seen.add(ch);
        let arr = charIndex.get(ch);
        if (!arr) { arr = []; charIndex.set(ch, arr); }
        arr.push(i);
      }
    }
  }
  return charIndex;
}
