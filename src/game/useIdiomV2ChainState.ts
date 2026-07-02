import type { LevelData } from '../types/game';
import { useChainStateCore } from './chainStateCore';
import type { ChainState, ChainAction, UseChainStateOptions } from './chainStateCore';

// v2 chain state is identical to v1 except it does not gate on the bundled
// idioms.json; it supplies its own per-level pool via `getLevelData`.
export type ChainV2State = ChainState;
export type ChainV2Action = ChainAction;

export function useIdiomV2ChainState(
  getLevelData: (levelNumber: number, seed?: number) => { level: LevelData | null; seed: number | null },
  options: Omit<UseChainStateOptions, 'waitForReady'>,
) {
  return useChainStateCore(getLevelData, options);
}
