import type { ChainChallengePack, ChainChallengeProgress, ChallengeLevelRecord, LevelData } from '../types/game';
import { STORAGE_KEYS, readStoredValue, writeStoredValue } from '../lib/storage';
import { createSeededRandom } from '../lib/utils';
import { generateLevel } from './levelGenerator';
import { CHAIN_CONFIG } from './chainConfig';

export const CHALLENGE_PACK_VERSION = 'chain-challenge-v1';
export const CHALLENGE_TOTAL_LEVELS = CHAIN_CONFIG.challenge.totalLevels;
export const CHALLENGE_BATCH_SIZE = CHAIN_CONFIG.challenge.batchSize;

const defaultChallengeProgress: ChainChallengeProgress = {
  completedCount: 0,
  updatedAt: null,
};

function isValidLevelData(value: unknown): value is LevelData {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.id === 'number' &&
    typeof obj.rows === 'number' &&
    typeof obj.cols === 'number' &&
    Array.isArray(obj.idioms) &&
    Array.isArray(obj.charBank) &&
    Array.isArray(obj.presetCells)
  );
}

function isValidChallengeLevel(value: unknown): value is ChallengeLevelRecord {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return (
    Number.isInteger(obj.sequence) &&
    Number.isInteger(obj.sourceIndex) &&
    Number.isInteger(obj.seed) &&
    typeof obj.difficultyScore === 'number' &&
    isValidLevelData(obj.level)
  );
}

function validateChallengeLevels(levels: unknown): ChallengeLevelRecord[] {
  if (!Array.isArray(levels)) return [];
  const valid: ChallengeLevelRecord[] = [];
  for (const item of levels) {
    if (isValidChallengeLevel(item)) {
      valid.push(item);
    }
  }
  return valid;
}

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
  const validatedLevels = validateChallengeLevels(parsed.levels);
  if (validatedLevels.length !== (parsed.levels as unknown[]).length) {
    window.localStorage.removeItem(STORAGE_KEYS.chainChallengePack);
    return null;
  }
  const nextSourceIndex = typeof parsed.nextSourceIndex === 'number' && parsed.nextSourceIndex >= 1
    ? Math.floor(parsed.nextSourceIndex)
    : validatedLevels.length + 1;
  const complete = Boolean(parsed.complete);
  if (validatedLevels.length > CHALLENGE_TOTAL_LEVELS) {
    window.localStorage.removeItem(STORAGE_KEYS.chainChallengePack);
    return null;
  }
  if (complete && validatedLevels.length !== CHALLENGE_TOTAL_LEVELS) {
    window.localStorage.removeItem(STORAGE_KEYS.chainChallengePack);
    return null;
  }
  return {
    version: CHALLENGE_PACK_VERSION,
    generatedAt: typeof parsed.generatedAt === 'string' ? parsed.generatedAt : '',
    nextSourceIndex,
    complete,
    levels: validatedLevels,
  };
}

function writeChallengePack(pack: ChainChallengePack): void {
  writeStoredValue(STORAGE_KEYS.chainChallengePack, pack);
}

export function readChallengeProgress(): ChainChallengeProgress {
  const parsed = readStoredValue(STORAGE_KEYS.chainChallengeProgress, defaultChallengeProgress);
  const completedCount = typeof parsed.completedCount === 'number' ? parsed.completedCount : 0;
  if (completedCount < 0 || completedCount > CHALLENGE_TOTAL_LEVELS) {
    return { ...defaultChallengeProgress };
  }
  return {
    completedCount,
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

export function isChallengeCompleted(progress: ChainChallengeProgress = readChallengeProgress()): boolean {
  return progress.completedCount >= CHALLENGE_TOTAL_LEVELS;
}

export function resetChallengeProgress(): ChainChallengeProgress {
  const next: ChainChallengeProgress = {
    completedCount: 0,
    updatedAt: new Date().toISOString(),
  };
  writeStoredValue(STORAGE_KEYS.chainChallengeProgress, next);
  return next;
}

export function getChallengeResumeLevelNumber(progress: ChainChallengeProgress = readChallengeProgress()): number | null {
  if (progress.completedCount >= CHALLENGE_TOTAL_LEVELS) {
    return null;
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
  const seed = CHAIN_CONFIG.challenge.seedBase + sourceIndex * CHAIN_CONFIG.challenge.seedStep;
  const baseIdiomCount = 5 + Math.min(3, Math.floor((sourceIndex - 1) / CHAIN_CONFIG.challenge.idiomCountGroups));

  for (let attempt = 0; attempt < CHAIN_CONFIG.challenge.generatorAttempts; attempt++) {
    const attemptSeed = seed + attempt * CHAIN_CONFIG.challenge.attemptSeedStep;
    const random = createSeededRandom(attemptSeed);
    const idiomCount = Math.min(8, baseIdiomCount + Math.floor(random() * CHAIN_CONFIG.challenge.idiomCountRange));
    const level = generateLevel(
      sourceIndex, idiomCount,
      CHAIN_CONFIG.challenge.maxRows, CHAIN_CONFIG.challenge.maxCols,
      CHAIN_CONFIG.challenge.maxAttempts, random,
    );
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
    let consecutiveFails = 0;

    while (pack.levels.length < batchTarget) {
      const levelRecord = buildChallengeLevel(pack.nextSourceIndex);
      pack.nextSourceIndex += 1;
      if (!levelRecord) {
        consecutiveFails++;
        if (consecutiveFails >= CHAIN_CONFIG.challenge.maxConsecutiveFails) {
          throw new Error(
            `Challenge pack generation failed: ${CHAIN_CONFIG.challenge.maxConsecutiveFails} consecutive failures`,
          );
        }
        continue;
      }
      consecutiveFails = 0;
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
