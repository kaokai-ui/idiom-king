import type { IdiomEntry, AppProgress, WordStats } from '../types/game';

export function shuffle<T>(items: T[], random: () => number = Math.random): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

export function createSeededRandom(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function isMasteredWord(stats: WordStats | undefined): boolean {
  return Boolean(stats && stats.seenCount >= 3);
}

export function createPracticeDeck(
  mode: 'random' | 'unfamiliar',
  progress: AppProgress,
  idioms: IdiomEntry[]
): IdiomEntry[] {
  const starredSet = new Set(progress.starredIds);
  const knownSet = new Set(progress.knownIds);

  if (mode === 'unfamiliar') {
    return shuffle(idioms.filter(w => starredSet.has(w.id)));
  }

  return shuffle(idioms.filter(w => !starredSet.has(w.id) && !knownSet.has(w.id)));
}

export function countProgress(
  progress: AppProgress,
  idioms: IdiomEntry[]
) {
  const allIds = new Set(idioms.map(i => i.id));
  const knownSet = new Set((progress.knownIds ?? []).filter(id => allIds.has(id)));
  const masteredSet = new Set<string>();

  Object.entries(progress.wordStats ?? {}).forEach(([id, stats]) => {
    if (allIds.has(id) && isMasteredWord(stats)) {
      masteredSet.add(id);
    }
  });

  for (const id of knownSet) {
    masteredSet.add(id);
  }

  return {
    totalCount: idioms.length,
    masteredCount: masteredSet.size,
    unfamiliarCount: Math.max(idioms.length - masteredSet.size, 0),
    progressRate: idioms.length === 0 ? 0 : Math.round((masteredSet.size / idioms.length) * 100),
  };
}

export function countProgressLite(progress: AppProgress, totalCount: number) {
  const masteredSet = new Set<string>();

  Object.entries(progress.wordStats ?? {}).forEach(([id, stats]) => {
    if (isMasteredWord(stats)) {
      masteredSet.add(id);
    }
  });

  for (const id of progress.knownIds ?? []) {
    masteredSet.add(id);
  }

  const masteredCount = Math.min(masteredSet.size, totalCount);
  return {
    totalCount,
    masteredCount,
    unfamiliarCount: Math.max(totalCount - masteredCount, 0),
    progressRate: totalCount === 0 ? 0 : Math.round((masteredCount / totalCount) * 100),
  };
}
