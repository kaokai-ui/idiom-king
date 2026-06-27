import type { LevelData } from '../types/game';
import type { IdiomV2Entry, IdiomLevel } from '../types/idiomV2';
import { createSeededRandom } from '../lib/utils';
import { generateLevelFromPool } from './levelGeneratorV2';
import { CHAIN_CONFIG } from './chainConfig';
import { getCachedLevelData } from '../data/idiomV2DataClient';

export type SeededLevelResultV2 = {
  level: LevelData;
  seed: number;
};

function generateSeededChainLevelV2(
  levelNumber: number,
  seedBase: number,
  pool: IdiomV2Entry[],
  charIndex: Map<string, number[]>,
): SeededLevelResultV2 | null {
  for (let attempt = 0; attempt < CHAIN_CONFIG.random.generatorAttempts; attempt++) {
    const seed = seedBase + attempt * CHAIN_CONFIG.random.seedStep;
    const random = createSeededRandom(seed);
    const idiomCount = CHAIN_CONFIG.random.idiomCountMin + Math.floor(random() * CHAIN_CONFIG.random.idiomCountRange);
    const level = generateLevelFromPool({
      idioms: pool,
      charIndex,
      levelId: levelNumber,
      targetCount: idiomCount,
      maxRows: CHAIN_CONFIG.random.maxRows,
      maxCols: CHAIN_CONFIG.random.maxCols,
      maxAttempts: CHAIN_CONFIG.random.maxAttempts,
      random,
    });
    if (level) {
      return { level, seed: seedBase };
    }
  }
  return null;
}

export function generateRandomChainLevelV2WithSeed(
  levelNumber: number,
  level: IdiomLevel,
  seed?: number,
): SeededLevelResultV2 | null {
  const cached = getCachedLevelData(level);
  if (!cached) return null;

  const actualSeed = seed ?? (Date.now() + levelNumber * 15485863 + Math.floor(Math.random() * 1000000));
  return generateSeededChainLevelV2(
    levelNumber,
    actualSeed,
    cached.idioms,
    cached.charIndex,
  );
}

export function generateRandomChainLevelV2(levelNumber: number, level: IdiomLevel): LevelData | null {
  return generateRandomChainLevelV2WithSeed(levelNumber, level)?.level ?? null;
}
