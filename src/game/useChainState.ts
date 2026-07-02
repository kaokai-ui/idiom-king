import { useMemo } from 'react';
import type { LevelData } from '../types/game';
import type { ChainPhase } from '../types/chain';
import { ready as idiomDbReady, isDbReady } from '../data/idiomDb';
import { useChainStateCore } from './chainStateCore';
import type { UseChainStateOptions } from './chainStateCore';

export type { ChainState, ChainAction } from './chainStateCore';

// v1 chain generation depends on the bundled idioms.json, so it gates level
// generation on `idiomDb.ready` (`idiomDbReady`). `ChainPhase` comes from
// '../types/chain'.
export function useChainState(
  getLevelData: (levelNumber: number, seed?: number) => { level: LevelData | null; seed: number | null },
  options: Omit<UseChainStateOptions, 'waitForReady'>,
) {
  const waitForReady = useMemo(
    () => ({ isReady: isDbReady, ready: idiomDbReady }),
    [],
  );
  return useChainStateCore(getLevelData, { ...options, waitForReady });
}

// Referenced so the readiness-gate wiring stays explicit in this module.
export type { ChainPhase };
