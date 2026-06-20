const DEFAULT_BOARD = {
  maxRows: 12,
  maxCols: 12,
  maxAttempts: 100,
} as const;

const VIEWPORT_GUARD = {
  minCellPx: 28,
  gapPx: 2,
  boardPadPx: 6,
  boardBorderPx: 1,
  pagePadPx: 8,
  minViewportWidth: 360,
  safeBoardHeight: 300,
  maxCharBankTiles: 20,
} as const;

export const CHAIN_CONFIG = {
  viewportGuard: VIEWPORT_GUARD,
  random: {
    ...DEFAULT_BOARD,
    levelRetryCount: 2,
    generatorAttempts: 6,
    seedStep: 97,
    idiomCountMin: 5,
    idiomCountRange: 4,
  },
  challenge: {
    ...DEFAULT_BOARD,
    totalLevels: 500,
    batchSize: 100,
    generatorAttempts: 6,
    maxConsecutiveFails: 500,
    seedBase: 20260611,
    seedStep: 7919,
    attemptSeedStep: 101,
    idiomCountGroups: 125,
    idiomCountRange: 2,
  },
  batchTest: {
    ...DEFAULT_BOARD,
    totalLevels: 50,
    innerRetries: 24,
    batchId: 'chain-test-fixed-v1',
    seedBase: 20260611,
  },
} as const;
