import type { LevelData } from '../types/game';
import { idioms, getCharIndex } from '../data/idiomDb';
import { generateLevelFromPool } from './levelGenCore';

export {
  buildBoardFromLevel,
  createCharTiles,
  isBoardComplete,
  isBoardCorrect,
  countFilledCells,
  countActiveCells,
  getWrongCells,
  getCellKey,
  findTileByCellRef,
} from './boardUtils';

export { isBoardViewportSafe, isCharBankViewportSafe } from './levelGenCore';

export type LevelGenerationConfig = {
  targetCount: number;
  maxRows: number;
  maxCols: number;
  maxAttempts: number;
};

export function normalizeLevelGenerationConfig(config: LevelGenerationConfig): LevelGenerationConfig {
  const normalized = { ...config };

  // Small 8x8 boards become unreliable when asked to place 7-8 crossing idioms.
  // We clamp this combination centrally so future callers do not accidentally
  // reintroduce a high-failure configuration.
  if (normalized.maxRows <= 8 && normalized.maxCols <= 8) {
    normalized.targetCount = Math.min(normalized.targetCount, 6);
  }

  return normalized;
}

export function generateLevel(
  levelId: number,
  targetCount: number = 5,
  maxRows: number = 10,
  maxCols: number = 10,
  maxAttempts: number = 50,
  random: () => number = Math.random
): LevelData | null {
  const normalized = normalizeLevelGenerationConfig({
    targetCount,
    maxRows,
    maxCols,
    maxAttempts,
  });

  return generateLevelFromPool({
    idioms,
    charIndex: getCharIndex(),
    levelId,
    targetCount: normalized.targetCount,
    maxRows: normalized.maxRows,
    maxCols: normalized.maxCols,
    maxAttempts: normalized.maxAttempts,
    random,
  });
}

// Re-exported for v2 code paths and tests that build a level from an explicit pool.
export { generateLevelFromPool };
export type { GeneratorIdiom } from './levelGenCore';
