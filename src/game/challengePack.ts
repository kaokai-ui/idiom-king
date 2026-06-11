import type { ChainChallengePack, ChainChallengeProgress, ChallengeLevelRecord, LevelData } from '../types/game';
import { STORAGE_KEYS, readStoredValue, writeStoredValue } from '../lib/storage';
import { createSeededRandom } from '../lib/utils';
import { generateLevel } from './levelGenerator';

export const CHALLENGE_PACK_VERSION = 'chain-challenge-v1';
export const CHALLENGE_TOTAL_LEVELS = 500;
export const CHALLENGE_BATCH_SIZE = 100;

const CHALLENGE_SEED_BASE = 20260611;
const CHALLENGE_SEED_STEP = 7919;

const defaultChallengeProgress: ChainChallengeProgress = {
  completedCount: 0,
  updatedAt: null,
};

function readChallengePack(): ChainChallengePack | null {
  const fallback: ChainChallengePack = {
    version: CHALLENGE_PACK_VERSION,
    generatedAt: '',
    nextSourceIndex: 1,
    complete: false,
    levels: [],
  };
  const parsed = readStoredValue(STORAGE_KEYS.chainChallengePack, fallback);
  if (parsed.version !== CHALLENGE_PACK_VERSION || !Array.isArray(parsed.levels)) {
    return null;
  }
  return {
    version: CHALLENGE_PACK_VERSION,
    generatedAt: typeof parsed.generatedAt === 'string' ? parsed.generatedAt : '',
    nextSourceIndex: typeof parsed.nextSourceIndex === 'number' ? parsed.nextSourceIndex : parsed.levels.length + 1,
    complete: Boolean(parsed.complete),
    levels: parsed.levels,
  };
}

function writeChallengePack(pack: ChainChallengePack): void {
  writeStoredValue(STORAGE_KEYS.chainChallengePack, pack);
}

export function readChallengeProgress(): ChainChallengeProgress {
  const parsed = readStoredValue(STORAGE_KEYS.chainChallengeProgress, defaultChallengeProgress);
  return {
    completedCount: typeof parsed.completedCount === 'number' ? parsed.completedCount : 0,
    updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : null,
  };
}

export function markChallengeLevelComplete(levelNumber: number): ChainChallengeProgress {
  const current = readChallengeProgress();
  const next: ChainChallengeProgress = {
    completedCount: Math.min(CHALLENGE_TOTAL_LEVELS, Math.max(current.completedCount, levelNumber)),
    updatedAt: new Date().toISOString(),
  };
  writeStoredValue(STORAGE_KEYS.chainChallengeProgress, next);
  return next;
}

export function getChallengeResumeLevelNumber(progress: ChainChallengeProgress = readChallengeProgress()): number {
  if (progress.completedCount >= CHALLENGE_TOTAL_LEVELS) {
    return CHALLENGE_TOTAL_LEVELS;
  }
  return Math.max(1, progress.completedCount + 1);
}

function waitForFrame(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(() => resolve());
      return;
    }
    setTimeout(resolve, 0);
  });
}

function countActiveCells(level: LevelData): { activeCells: number; crossingCells: number } {
  const counts = new Map<string, number>();
  for (const idiom of level.idioms) {
    for (let i = 0; i < idiom.chars.length; i++) {
      const row = idiom.direction === 'vertical' ? idiom.startRow + i : idiom.startRow;
      const col = idiom.direction === 'horizontal' ? idiom.startCol + i : idiom.startCol;
      const key = `${row},${col}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  let crossingCells = 0;
  for (const count of counts.values()) {
    if (count > 1) {
      crossingCells++;
    }
  }
  return { activeCells: counts.size, crossingCells };
}

function scoreChallengeLevel(level: LevelData): number {
  const { activeCells, crossingCells } = countActiveCells(level);
  const longestWord = Math.max(...level.idioms.map((idiom) => idiom.chars.length));
  return (
    level.idioms.length * 120 +
    activeCells * 5 +
    crossingCells * 18 +
    level.rows * level.cols +
    longestWord * 10 -
    level.presetCells.length * 14
  );
}

function buildChallengeLevel(sourceIndex: number): ChallengeLevelRecord | null {
  const seed = CHALLENGE_SEED_BASE + sourceIndex * CHALLENGE_SEED_STEP;
  const baseIdiomCount = 5 + Math.min(3, Math.floor((sourceIndex - 1) / 125));

  for (let attempt = 0; attempt < 6; attempt++) {
    const attemptSeed = seed + attempt * 101;
    const random = createSeededRandom(attemptSeed);
    const idiomCount = Math.min(8, baseIdiomCount + Math.floor(random() * 2));
    const level = generateLevel(sourceIndex, idiomCount, 12, 12, 100, random);
    if (!level) {
      continue;
    }
    return {
      sequence: sourceIndex,
      sourceIndex,
      seed: attemptSeed,
      difficultyScore: scoreChallengeLevel(level),
      level,
    };
  }

  return null;
}

function finalizeChallengeLevels(levels: ChallengeLevelRecord[]): ChallengeLevelRecord[] {
  return [...levels]
    .sort((a, b) => {
      if (a.difficultyScore !== b.difficultyScore) {
        return a.difficultyScore - b.difficultyScore;
      }
      return a.seed - b.seed;
    })
    .map((record, index) => ({
      ...record,
      sequence: index + 1,
      level: {
        ...record.level,
        id: index + 1,
      },
    }));
}

export async function ensureChallengePack(
  onProgress?: (generatedCount: number, totalCount: number) => void,
): Promise<ChainChallengePack> {
  const existing = readChallengePack();
  let pack: ChainChallengePack = existing ?? {
    version: CHALLENGE_PACK_VERSION,
    generatedAt: new Date().toISOString(),
    nextSourceIndex: 1,
    complete: false,
    levels: [],
  };

  if (pack.version !== CHALLENGE_PACK_VERSION) {
    pack = {
      version: CHALLENGE_PACK_VERSION,
      generatedAt: new Date().toISOString(),
      nextSourceIndex: 1,
      complete: false,
      levels: [],
    };
  }

  if (pack.complete && pack.levels.length === CHALLENGE_TOTAL_LEVELS) {
    onProgress?.(CHALLENGE_TOTAL_LEVELS, CHALLENGE_TOTAL_LEVELS);
    return pack;
  }

  onProgress?.(pack.levels.length, CHALLENGE_TOTAL_LEVELS);

  while (pack.levels.length < CHALLENGE_TOTAL_LEVELS) {
    const batchTarget = Math.min(pack.levels.length + CHALLENGE_BATCH_SIZE, CHALLENGE_TOTAL_LEVELS);

    while (pack.levels.length < batchTarget) {
      const levelRecord = buildChallengeLevel(pack.nextSourceIndex);
      pack.nextSourceIndex += 1;
      if (!levelRecord) {
        continue;
      }
      pack.levels.push(levelRecord);
    }

    pack.generatedAt = new Date().toISOString();
    pack.complete = pack.levels.length >= CHALLENGE_TOTAL_LEVELS;
    if (pack.complete) {
      pack.levels = finalizeChallengeLevels(pack.levels);
    }
    writeChallengePack(pack);
    onProgress?.(pack.levels.length, CHALLENGE_TOTAL_LEVELS);

    if (!pack.complete) {
      await waitForFrame();
    }
  }

  return pack;
}
