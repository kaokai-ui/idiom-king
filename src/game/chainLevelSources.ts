import type { LevelData } from '../types/game';
import { createSeededRandom } from '../lib/utils';
import { generateLevel } from './levelGenerator';
import { CHAIN_CONFIG } from './chainConfig';

export type SeededLevelResult = {
  level: LevelData;
  seed: number;
};

function generateSeededChainLevel(
  levelNumber: number,
  seedBase: number,
  maxRows: number,
  maxCols: number,
  maxAttempts: number,
): SeededLevelResult | null {
  for (let attempt = 0; attempt < CHAIN_CONFIG.random.generatorAttempts; attempt++) {
    const seed = seedBase + attempt * CHAIN_CONFIG.random.seedStep;
    const random = createSeededRandom(seed);
    const idiomCount = CHAIN_CONFIG.random.idiomCountMin + Math.floor(random() * CHAIN_CONFIG.random.idiomCountRange);
    const level = generateLevel(levelNumber, idiomCount, maxRows, maxCols, maxAttempts, random);
    if (level) {
      return { level, seed: seedBase };
    }
  }
  return null;
}

export function generateRandomChainLevelWithSeed(levelNumber: number, seed?: number): SeededLevelResult | null {
  const actualSeed = seed ?? (Date.now() + levelNumber * 15485863 + Math.floor(Math.random() * 1000000));
  return generateSeededChainLevel(
    levelNumber,
    actualSeed,
    CHAIN_CONFIG.random.maxRows,
    CHAIN_CONFIG.random.maxCols,
    CHAIN_CONFIG.random.maxAttempts,
  );
}

export function generateRandomChainLevel(levelNumber: number): LevelData | null {
  return generateRandomChainLevelWithSeed(levelNumber)?.level ?? null;
}
