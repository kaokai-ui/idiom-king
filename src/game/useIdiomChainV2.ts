import { useCallback } from 'react';
import type { ChallengeLevelRecord, ChainMode, LevelData } from '../types/game';
import type { IdiomLevel } from '../types/idiomV2';
import { CHAIN_CONFIG } from './chainConfig';
import { generateRandomChainLevelV2WithSeed } from './chainLevelSourcesV2';
import { useIdiomV2ChainState } from './useIdiomV2ChainState';
import { useChainGameCore } from './useChainGameCore';
import { useChallengeCampaign } from '../game/useChallengeCampaign';

type UseIdiomChainV2Options = {
  mode: ChainMode;
  activeLevel: IdiomLevel;
  challengeLevels?: Array<ChallengeLevelRecord | undefined>;
  initialLevelNumber?: number;
  initialSeed?: number | null;
  sessionKey?: number;
  maxLevelNumber?: number;
  onLevelComplete?: (levelNumber: number) => void;
};

export function useIdiomChainV2({
  mode,
  activeLevel,
  challengeLevels,
  initialLevelNumber = 1,
  initialSeed = null,
  sessionKey = 0,
  maxLevelNumber,
  onLevelComplete,
}: UseIdiomChainV2Options) {
  const challengeCampaign = useChallengeCampaign(mode === 'challenge');
  const isChallengeMode = mode === 'challenge';
  const challengeLevelsResolved = isChallengeMode ? challengeCampaign.levels : challengeLevels;
  const effectiveInitialLevelNumber = isChallengeMode
    ? (challengeCampaign.resumeLevelNumber ?? initialLevelNumber)
    : initialLevelNumber;
  const effectiveMaxLevelNumber = isChallengeMode
    ? challengeCampaign.totalLevels
    : maxLevelNumber;
  const effectiveOnLevelComplete = isChallengeMode
    ? challengeCampaign.onLevelComplete
    : onLevelComplete;

  const getLevelData = useCallback((levelNumber: number, seed?: number): { level: LevelData | null; seed: number | null } => {
    if (isChallengeMode) {
      const record = challengeLevelsResolved?.[levelNumber - 1];
      const level = record?.level ?? null;
      return { level, seed: null };
    }
    const result = generateRandomChainLevelV2WithSeed(levelNumber, activeLevel, seed ?? undefined);
    if (result) {
      return { level: result.level, seed: result.seed };
    }
    return { level: null, seed: null };
  }, [challengeLevelsResolved, activeLevel, isChallengeMode]);

  const chain = useIdiomV2ChainState(getLevelData, {
    missingLevelStrategy: mode === 'challenge' ? 'error' : 'retry-current-level',
    maxNullLevelRetries: mode === 'challenge' ? 0 : CHAIN_CONFIG.random.levelRetryCount,
  });

  const core = useChainGameCore(chain, {
    mode,
    challengeLevels: challengeLevelsResolved,
    initialLevelNumber: effectiveInitialLevelNumber,
    initialSeed,
    sessionKey,
    maxLevelNumber: effectiveMaxLevelNumber,
    onLevelComplete: effectiveOnLevelComplete,
    extraLoadKey: activeLevel,
  });

  return { ...core, challengeCampaign };
}
