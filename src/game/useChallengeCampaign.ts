import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChainChallengeManifest, ChallengeLevelRecord } from '../types/game';
import {
  CHALLENGE_TOTAL_LEVELS,
  getChallengeResumeLevelNumber,
  getChallengeShardIndexForLevel,
  isChallengeCompleted,
  loadChallengeManifest,
  loadChallengeShard,
  markChallengeLevelComplete,
  readChallengeProgress,
  resetChallengeProgress,
} from './challengePack';

type CampaignPhase = 'generating' | 'ready' | 'error' | 'completed';

type CampaignState = {
  manifest: ChainChallengeManifest | null;
  levels: Array<ChallengeLevelRecord | undefined>;
  phase: CampaignPhase;
  generatedCount: number;
  resumeLevelNumber: number | null;
  completedCount: number;
  sessionKey: number;
};

function createEmptyLevelSlots(totalLevels: number): Array<ChallengeLevelRecord | undefined> {
  return Array.from({ length: totalLevels }, () => undefined);
}

function countLoadedLevels(levels: Array<ChallengeLevelRecord | undefined>): number {
  let count = 0;
  for (const level of levels) {
    if (level) count++;
  }
  return count;
}

function mergeShardLevels(
  existingLevels: Array<ChallengeLevelRecord | undefined>,
  totalLevels: number,
  shardLevels: ChallengeLevelRecord[],
): Array<ChallengeLevelRecord | undefined> {
  const nextLevels = existingLevels.length === totalLevels
    ? [...existingLevels]
    : createEmptyLevelSlots(totalLevels);
  for (const record of shardLevels) {
    nextLevels[record.sequence - 1] = record;
  }
  return nextLevels;
}

function isShardFullyLoaded(
  levels: Array<ChallengeLevelRecord | undefined>,
  startSequence: number,
  endSequence: number,
): boolean {
  for (let sequence = startSequence; sequence <= endSequence; sequence++) {
    if (!levels[sequence - 1]) {
      return false;
    }
  }
  return true;
}

async function loadShardWindow(
  manifest: ChainChallengeManifest,
  existingLevels: Array<ChallengeLevelRecord | undefined>,
  anchorLevelNumber: number,
): Promise<Array<ChallengeLevelRecord | undefined>> {
  const currentShardIndex = getChallengeShardIndexForLevel(anchorLevelNumber, manifest.shardSize);
  const targetShardIndexes = [currentShardIndex];
  if (currentShardIndex < manifest.shards.length) {
    targetShardIndexes.push(currentShardIndex + 1);
  }

  let nextLevels = existingLevels.length === manifest.totalLevels
    ? [...existingLevels]
    : createEmptyLevelSlots(manifest.totalLevels);

  const shardMetasToLoad = targetShardIndexes
    .map((shardIndex) => manifest.shards.find((item) => item.index === shardIndex))
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .filter((item) => !isShardFullyLoaded(nextLevels, item.startSequence, item.endSequence));

  if (shardMetasToLoad.length === 0) {
    return nextLevels;
  }

  const loadedShards = await Promise.all(
    shardMetasToLoad.map((item) => loadChallengeShard(manifest, item.index)),
  );

  for (const shard of loadedShards) {
    nextLevels = mergeShardLevels(nextLevels, manifest.totalLevels, shard.levels);
  }

  return nextLevels;
}

function computeInitialState(enabled: boolean): CampaignState {
  if (!enabled) {
    return {
      manifest: null,
      levels: [],
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
    manifest: null,
    levels: [],
    phase: completed ? 'completed' : 'generating',
    generatedCount: 0,
    resumeLevelNumber: getChallengeResumeLevelNumber(progress),
    completedCount: progress.completedCount,
    sessionKey: 0,
  };
}

export function useChallengeCampaign(enabled: boolean) {
  const [state, setState] = useState<CampaignState>(() => computeInitialState(enabled));
  const [reloadToken, setReloadToken] = useState(0);
  const enabledRef = useRef(enabled);
  const stateRef = useRef(state);

  useEffect(() => { enabledRef.current = enabled; }, [enabled]);
  useEffect(() => { stateRef.current = state; }, [state]);

  const ensureWindowLoaded = useCallback(async (anchorLevelNumber: number) => {
    const manifest = stateRef.current.manifest;
    if (!manifest) {
      return;
    }

    const mergedLevels = await loadShardWindow(manifest, stateRef.current.levels, anchorLevelNumber);
    if (!enabledRef.current) {
      return;
    }

    setState((prev) => ({
      ...prev,
      levels: mergedLevels,
      generatedCount: countLoadedLevels(mergedLevels),
    }));
  }, []);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    void (async () => {
      try {
        const manifest = await loadChallengeManifest();
        if (cancelled) return;

        const progress = readChallengeProgress();
        const completed = isChallengeCompleted(progress);

        if (completed) {
          setState((prev) => ({
            ...prev,
            manifest,
            levels: createEmptyLevelSlots(manifest.totalLevels),
            phase: 'completed',
            generatedCount: 0,
            resumeLevelNumber: null,
            completedCount: progress.completedCount,
          }));
          return;
        }

        const resumeLevelNumber = getChallengeResumeLevelNumber(progress) ?? 1;
        const mergedLevels = await loadShardWindow(manifest, createEmptyLevelSlots(manifest.totalLevels), resumeLevelNumber);
        if (cancelled) return;

        setState((prev) => ({
          ...prev,
          manifest,
          levels: mergedLevels,
          phase: 'ready',
          generatedCount: countLoadedLevels(mergedLevels),
          resumeLevelNumber,
          completedCount: progress.completedCount,
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
    const nextResumeLevel = getChallengeResumeLevelNumber(progress);
    const completed = isChallengeCompleted(progress);

    setState((prev) => ({
      ...prev,
      phase: completed ? 'completed' : prev.phase,
      resumeLevelNumber: completed ? null : nextResumeLevel,
      completedCount: progress.completedCount,
    }));

    if (!completed && nextResumeLevel !== null) {
      void ensureWindowLoaded(nextResumeLevel);
    }
  }, [ensureWindowLoaded]);

  const onRestartCampaign = useCallback(() => {
    if (!enabledRef.current) return;

    resetChallengeProgress();
    setState((prev) => ({
      ...prev,
      phase: 'generating',
      levels: prev.manifest ? createEmptyLevelSlots(prev.manifest.totalLevels) : [],
      generatedCount: 0,
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
