import { useCallback, useEffect, useState } from 'react';
import type { ChainChallengePack } from '../types/game';
import {
  CHALLENGE_TOTAL_LEVELS,
  ensureChallengePack,
  getChallengeResumeLevelNumber,
  markChallengeLevelComplete,
  readChallengeProgress,
} from './challengePack';

type CampaignState = {
  pack: ChainChallengePack | null;
  phase: 'generating' | 'ready' | 'error';
  generatedCount: number;
  resumeLevelNumber: number;
  completedCount: number;
};

const initialState: CampaignState = {
  pack: null,
  phase: 'generating',
  generatedCount: 0,
  resumeLevelNumber: 1,
  completedCount: 0,
};

export function useChallengeCampaign(enabled: boolean) {
  const [state, setState] = useState<CampaignState>(initialState);

  useEffect(() => {
    if (!enabled) {
      setState(initialState);
      return;
    }

    const progress = readChallengeProgress();
    setState((prev) => ({
      ...prev,
      phase: 'generating',
      generatedCount: 0,
      resumeLevelNumber: getChallengeResumeLevelNumber(progress),
      completedCount: progress.completedCount,
    }));

    let cancelled = false;

    void ensureChallengePack((generatedCount) => {
      if (cancelled) {
        return;
      }
      setState((prev) => ({ ...prev, generatedCount }));
    })
      .then((pack) => {
        if (cancelled) {
          return;
        }
        const nextProgress = readChallengeProgress();
        setState({
          pack,
          phase: 'ready',
          generatedCount: pack.levels.length,
          resumeLevelNumber: getChallengeResumeLevelNumber(nextProgress),
          completedCount: nextProgress.completedCount,
        });
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setState((prev) => ({ ...prev, phase: 'error' }));
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const onLevelComplete = useCallback((levelNumber: number) => {
    if (!enabled) {
      return;
    }
    const progress = markChallengeLevelComplete(levelNumber);
    setState((prev) => ({
      ...prev,
      completedCount: progress.completedCount,
    }));
  }, [enabled]);

  return {
    ...state,
    totalLevels: CHALLENGE_TOTAL_LEVELS,
    onLevelComplete,
  };
}
