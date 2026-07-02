import { useCallback } from 'react';
import type { ChallengeLevelRecord, ChainMode, LevelData } from '../types/game';
import { CHAIN_CONFIG } from './chainConfig';
import { useChainState } from './useChainState';
import { useChainGameCore } from './useChainGameCore';
import { generateRandomChainLevelWithSeed } from './chainLevelSources';

type UseIdiomChainOptions = {
  mode: ChainMode;
  challengeLevels?: Array<ChallengeLevelRecord | undefined>;
  initialLevelNumber?: number;
  initialSeed?: number | null;
  sessionKey?: number;
  maxLevelNumber?: number;
  onLevelComplete?: (levelNumber: number) => void;
};

export function useIdiomChain({
  mode,
  challengeLevels,
  initialLevelNumber = 1,
  initialSeed = null,
  sessionKey = 0,
  maxLevelNumber,
  onLevelComplete,
}: UseIdiomChainOptions) {
  const getLevelData = useCallback((levelNumber: number, seed?: number): { level: LevelData | null; seed: number | null } => {
    if (mode === 'challenge') {
      const record = challengeLevels?.[levelNumber - 1];
      const level = record?.level ?? null;
      return { level, seed: null };
    }
    const result = generateRandomChainLevelWithSeed(levelNumber, seed ?? undefined);
    if (result) {
      return { level: result.level, seed: result.seed };
    }
    return { level: null, seed: null };
  }, [challengeLevels, mode]);

  const chain = useChainState(getLevelData, {
    missingLevelStrategy: mode === 'challenge' ? 'error' : 'retry-current-level',
    maxNullLevelRetries: mode === 'challenge' ? 0 : CHAIN_CONFIG.random.levelRetryCount,
  });

  return useChainGameCore(chain, {
    mode,
    challengeLevels,
    initialLevelNumber,
    initialSeed,
    sessionKey,
    maxLevelNumber,
    onLevelComplete,
  });
}
