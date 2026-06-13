import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChainChallengePack } from '../types/game';
import { ready as idiomDbReady, isDbReady } from '../data/idiomDb';
import {
  CHALLENGE_TOTAL_LEVELS,
  ensureChallengePack,
  getChallengeResumeLevelNumber,
  isChallengeCompleted,
  markChallengeLevelComplete,
  readChallengeProgress,
  resetChallengeProgress,
} from './challengePack';

type CampaignPhase = 'generating' | 'ready' | 'error' | 'completed';

type CampaignState = {
  pack: ChainChallengePack | null;
  phase: CampaignPhase;
  generatedCount: number;
  resumeLevelNumber: number | null;
  completedCount: number;
  sessionKey: number;
};

function computeInitialState(enabled: boolean): CampaignState {
  if (!enabled) {
    return {
      pack: null,
      phase: 'generating',
      generatedCount: 0,
      resumeLevelNumber: null,
      completedCount: 0,
      sessionKey: 0,
    };
  }
  const progress = readChallengeProgress();
  const completed = isChallengeCompleted(progress);
  return {
    pack: null,
    phase: completed ? 'completed' : 'generating',
    generatedCount: completed ? CHALLENGE_TOTAL_LEVELS : 0,
    resumeLevelNumber: getChallengeResumeLevelNumber(progress),
    completedCount: progress.completedCount,
    sessionKey: 0,
  };
}

export function useChallengeCampaign(enabled: boolean) {
  const [state, setState] = useState<CampaignState>(() => computeInitialState(enabled));
  const [reloadToken, setReloadToken] = useState(0);

  const enabledRef = useRef(enabled);
  useEffect(() => { enabledRef.current = enabled; }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    const progress = readChallengeProgress();
    if (isChallengeCompleted(progress)) return;

    let cancelled = false;

    void (async () => {
      if (!isDbReady()) {
        await idiomDbReady;
      }
      if (cancelled) return;

      try {
        const pack = await ensureChallengePack((generatedCount) => {
          if (cancelled) return;
          setState((prev) => ({ ...prev, generatedCount }));
        });
        if (cancelled) return;
        const nextProgress = readChallengeProgress();
        setState((prev) => ({
          ...prev,
          pack,
          phase: isChallengeCompleted(nextProgress) ? 'completed' : 'ready',
          generatedCount: pack.levels.length,
          resumeLevelNumber: getChallengeResumeLevelNumber(nextProgress),
          completedCount: nextProgress.completedCount,
        }));
      } catch {
        if (cancelled) return;
        setState((prev) => ({ ...prev, phase: 'error' }));
      }
    })();

    return () => { cancelled = true; };
  }, [enabled, reloadToken]);

  const onLevelComplete = useCallback((levelNumber: number) => {
    if (!enabledRef.current) return;
    const progress = markChallengeLevelComplete(levelNumber);
    if (isChallengeCompleted(progress)) {
      setState((prev) => ({
        ...prev,
        phase: 'completed',
        resumeLevelNumber: null,
        completedCount: progress.completedCount,
      }));
    } else {
      setState((prev) => ({
        ...prev,
        completedCount: progress.completedCount,
      }));
    }
  }, []);

  const onRestartCampaign = useCallback(() => {
    if (!enabledRef.current) return;
    resetChallengeProgress();
    setState((prev) => ({
      ...prev,
      phase: prev.pack ? 'ready' : 'generating',
      generatedCount: prev.pack?.levels.length ?? 0,
      resumeLevelNumber: 1,
      completedCount: 0,
      sessionKey: prev.sessionKey + 1,
    }));
    setReloadToken((token) => token + 1);
  }, []);

  return {
    ...state,
    totalLevels: CHALLENGE_TOTAL_LEVELS,
    onLevelComplete,
    onRestartCampaign,
  };
}
