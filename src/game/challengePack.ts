import type {
  ChainChallengeManifest,
  ChainChallengeProgress,
  ChainChallengeShard,
  ChainChallengeShardMeta,
  ChallengeLevelRecord,
  LevelData,
} from '../types/game';
import { STORAGE_KEYS, readStoredValue, writeStoredValue } from '../lib/storage';
import { createSeededRandom } from '../lib/utils';
import { generateLevel } from './levelGenerator';
import { CHAIN_CONFIG } from './chainConfig';

export const CHALLENGE_PACK_VERSION = 'chain-challenge-static-v1';
export const CHALLENGE_TOTAL_LEVELS = CHAIN_CONFIG.challenge.totalLevels;
export const CHALLENGE_SHARD_SIZE = 50;

const defaultChallengeProgress: ChainChallengeProgress = {
  completedCount: 0,
  updatedAt: null,
};

let manifestPromise: Promise<ChainChallengeManifest> | null = null;
const shardPromiseCache = new Map<string, Promise<ChainChallengeShard>>();

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

function isValidShardMeta(value: unknown): value is ChainChallengeShardMeta {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return (
    Number.isInteger(obj.index) &&
    Number.isInteger(obj.startSequence) &&
    Number.isInteger(obj.endSequence) &&
    typeof obj.file === 'string'
  );
}

function isValidManifest(value: unknown): value is ChainChallengeManifest {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return (
    obj.version === CHALLENGE_PACK_VERSION &&
    typeof obj.generatedAt === 'string' &&
    Number.isInteger(obj.totalLevels) &&
    Number.isInteger(obj.shardSize) &&
    Array.isArray(obj.shards) &&
    obj.shards.every(isValidShardMeta)
  );
}

function isValidShard(value: unknown): value is ChainChallengeShard {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return (
    obj.version === CHALLENGE_PACK_VERSION &&
    typeof obj.generatedAt === 'string' &&
    Number.isInteger(obj.shardIndex) &&
    Number.isInteger(obj.startSequence) &&
    Number.isInteger(obj.endSequence) &&
    Array.isArray(obj.levels) &&
    obj.levels.every(isValidChallengeLevel)
  );
}

function cleanupLegacyChallengePackStorage(): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.removeItem(STORAGE_KEYS.chainChallengePack);
}

function getChallengeAssetUrl(fileName: string): string {
  const baseHref = typeof document !== 'undefined' ? document.baseURI : 'http://localhost/';
  return new URL(`challenge/${fileName}`, baseHref).toString();
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

function computeCellStats(level: LevelData): { activeCells: number; crossingCells: number } {
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
  const { activeCells, crossingCells } = computeCellStats(level);
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

function getBaseChallengeIdiomCount(sourceIndex: number): number {
  return 5 + Math.min(3, Math.floor((sourceIndex - 1) / CHAIN_CONFIG.challenge.idiomCountGroups));
}

export function buildChallengeLevel(sourceIndex: number): ChallengeLevelRecord | null {
  const seed = CHAIN_CONFIG.challenge.seedBase + sourceIndex * CHAIN_CONFIG.challenge.seedStep;
  const baseIdiomCount = getBaseChallengeIdiomCount(sourceIndex);

  for (let attempt = 0; attempt < CHAIN_CONFIG.challenge.generatorAttempts; attempt++) {
    const attemptSeed = seed + attempt * CHAIN_CONFIG.challenge.attemptSeedStep;
    const random = createSeededRandom(attemptSeed);
    const preferredIdiomCount = Math.min(8, baseIdiomCount + Math.floor(random() * CHAIN_CONFIG.challenge.idiomCountRange));
    const requestedCounts = Array.from(
      new Set(Array.from({ length: preferredIdiomCount - 4 }, (_, index) => preferredIdiomCount - index)),
    ).filter((count) => count >= 5);

    for (const idiomCount of requestedCounts) {
      const level = generateLevel(
        sourceIndex,
        idiomCount,
        CHAIN_CONFIG.challenge.maxRows,
        CHAIN_CONFIG.challenge.maxCols,
        CHAIN_CONFIG.challenge.maxAttempts,
        random,
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
  }

  return null;
}

export function finalizeChallengeLevels(levels: ChallengeLevelRecord[]): ChallengeLevelRecord[] {
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

export function generateChallengeRecords(totalLevels: number = CHALLENGE_TOTAL_LEVELS): ChallengeLevelRecord[] {
  const levels: ChallengeLevelRecord[] = [];
  let nextSourceIndex = 1;
  let consecutiveFails = 0;

  while (levels.length < totalLevels) {
    const levelRecord = buildChallengeLevel(nextSourceIndex);
    nextSourceIndex += 1;
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
    levels.push(levelRecord);
  }

  return finalizeChallengeLevels(levels);
}

export function buildChallengeManifest(
  levels: ChallengeLevelRecord[],
  generatedAt: string = new Date().toISOString(),
  shardSize: number = CHALLENGE_SHARD_SIZE,
): ChainChallengeManifest {
  const shards: ChainChallengeShardMeta[] = [];
  const totalLevels = levels.length;
  const shardCount = Math.ceil(totalLevels / shardSize);

  for (let index = 0; index < shardCount; index++) {
    const startSequence = index * shardSize + 1;
    const endSequence = Math.min((index + 1) * shardSize, totalLevels);
    shards.push({
      index: index + 1,
      startSequence,
      endSequence,
      file: `chunk-${String(index + 1).padStart(3, '0')}.json`,
    });
  }

  return {
    version: CHALLENGE_PACK_VERSION,
    generatedAt,
    totalLevels,
    shardSize,
    shards,
  };
}

export function buildChallengeShards(
  levels: ChallengeLevelRecord[],
  generatedAt: string = new Date().toISOString(),
  shardSize: number = CHALLENGE_SHARD_SIZE,
): ChainChallengeShard[] {
  const manifest = buildChallengeManifest(levels, generatedAt, shardSize);
  return manifest.shards.map((shardMeta) => ({
    version: CHALLENGE_PACK_VERSION,
    generatedAt,
    shardIndex: shardMeta.index,
    startSequence: shardMeta.startSequence,
    endSequence: shardMeta.endSequence,
    levels: levels.slice(shardMeta.startSequence - 1, shardMeta.endSequence),
  }));
}

export async function loadChallengeManifest(): Promise<ChainChallengeManifest> {
  cleanupLegacyChallengePackStorage();

  if (!manifestPromise) {
    manifestPromise = fetchJson<unknown>(getChallengeAssetUrl('manifest.json')).then((payload) => {
      if (!isValidManifest(payload)) {
        throw new Error('Invalid challenge manifest payload');
      }
      return payload;
    });
  }

  return manifestPromise;
}

export async function loadChallengeShard(
  manifest: ChainChallengeManifest,
  shardIndex: number,
): Promise<ChainChallengeShard> {
  const shardMeta = manifest.shards.find((item) => item.index === shardIndex);
  if (!shardMeta) {
    throw new Error(`Challenge shard ${shardIndex} is not defined in manifest`);
  }

  const cacheKey = `${manifest.version}:${shardMeta.file}`;
  const cached = shardPromiseCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const promise = fetchJson<unknown>(getChallengeAssetUrl(shardMeta.file)).then((payload) => {
    if (!isValidShard(payload)) {
      throw new Error(`Invalid challenge shard payload: ${shardMeta.file}`);
    }
    return payload;
  });
  shardPromiseCache.set(cacheKey, promise);
  return promise;
}

export function getChallengeShardIndexForLevel(
  levelNumber: number,
  shardSize: number = CHALLENGE_SHARD_SIZE,
): number {
  return Math.max(1, Math.floor((Math.max(levelNumber, 1) - 1) / shardSize) + 1);
}

export function readChallengeProgress(): ChainChallengeProgress {
  cleanupLegacyChallengePackStorage();
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
