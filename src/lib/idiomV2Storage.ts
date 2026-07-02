import type { IdiomLevel, IdiomV2Settings, IdiomV2Progress, IdiomV2Session, IdiomV2LevelProgress } from '../types/idiomV2';
import { DEFAULT_IDIOM_LEVEL, IDIOM_LEVELS } from '../constants/idiomLevels';
import { readStoredValue, writeStoredValue as writeStoredValueBase } from './localStore';

/** Builds a fresh `byLevel` map with an empty progress record for every level. */
function createEmptyByLevel(
  overrides?: Partial<Record<IdiomLevel, Partial<IdiomV2LevelProgress>>>,
): Record<IdiomLevel, IdiomV2LevelProgress> {
  return IDIOM_LEVELS.reduce((acc, level) => {
    acc[level] = { ...emptyLevelProgress, ...(overrides?.[level] ?? {}) };
    return acc;
  }, {} as Record<IdiomLevel, IdiomV2LevelProgress>);
}

function writeStoredValue(key: string, value: unknown): void {
  writeStoredValueBase(key, value, 'v2-storage');
}

const V2_STORAGE_KEYS = {
  settings: 'idiom-king-2:settings',
  progress: 'idiom-king-2:progress',
  session: 'idiom-king-2:session',
  chainChallengeProgress: 'idiom-king-2:chain-challenge-progress:v1',
};

const defaultSettings: IdiomV2Settings = {
  idiomLevel: DEFAULT_IDIOM_LEVEL,
  autoShowBopomofo: false,
  autoShowUsage: false,
  developerMode: false,
};

const emptyLevelProgress: IdiomV2LevelProgress = {
  knownIds: [],
  wordStats: {},
};

const defaultProgress: IdiomV2Progress = {
  starredIdioms: [],
  byLevel: createEmptyByLevel(),
};

const defaultSession: IdiomV2Session = {
  screen: 'home',
  flashcards: null,
};

function readV2Settings(): IdiomV2Settings {
  return readStoredValue(V2_STORAGE_KEYS.settings, defaultSettings);
}

function readV2Progress(): IdiomV2Progress {
  const stored = readStoredValue(V2_STORAGE_KEYS.progress, defaultProgress);
  return {
    starredIdioms: Array.isArray(stored.starredIdioms) ? stored.starredIdioms : [],
    byLevel: createEmptyByLevel(stored.byLevel),
  };
}

function readV2Session(): IdiomV2Session {
  const stored = readStoredValue(V2_STORAGE_KEYS.session, defaultSession);
  // We do not persist in-progress flashcard/chain/cloze session state yet,
  // so re-entering the app should always land on home instead of a stale screen.
  if (stored.screen !== 'home') {
    return defaultSession;
  }
  return { screen: 'home', flashcards: null };
}

export {
  V2_STORAGE_KEYS,
  defaultSettings,
  defaultProgress,
  defaultSession,
  emptyLevelProgress,
  createEmptyByLevel,
  readStoredValue,
  writeStoredValue,
  readV2Settings,
  readV2Progress,
  readV2Session,
};
