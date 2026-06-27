import type { IdiomV2Settings, IdiomV2Progress, IdiomV2Session, IdiomV2LevelProgress } from '../types/idiomV2';
import { DEFAULT_IDIOM_LEVEL } from '../constants/idiomLevels';

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
  byLevel: {
    elementary: { ...emptyLevelProgress },
    junior: { ...emptyLevelProgress },
    senior: { ...emptyLevelProgress },
  },
};

const defaultSession: IdiomV2Session = {
  screen: 'home',
  flashcards: null,
};

function readStoredValue<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (parsed === null || typeof parsed !== 'object') return fallback;
    const result = { ...fallback } as Record<string, unknown>;
    for (const k of Object.keys(fallback as Record<string, unknown>)) {
      if (k in parsed) {
        result[k] = parsed[k];
      }
    }
    return result as T;
  } catch {
    return fallback;
  }
}

function writeStoredValue(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`[v2-storage] Failed to write "${key}":`, err);
  }
}

function readV2Settings(): IdiomV2Settings {
  return { ...defaultSettings, ...readStoredValue(V2_STORAGE_KEYS.settings, defaultSettings) };
}

function readV2Progress(): IdiomV2Progress {
  const stored = readStoredValue(V2_STORAGE_KEYS.progress, defaultProgress);
  return {
    starredIdioms: Array.isArray(stored.starredIdioms) ? stored.starredIdioms : [],
    byLevel: {
      elementary: { ...emptyLevelProgress, ...(stored.byLevel?.elementary ?? {}) },
      junior: { ...emptyLevelProgress, ...(stored.byLevel?.junior ?? {}) },
      senior: { ...emptyLevelProgress, ...(stored.byLevel?.senior ?? {}) },
    },
  };
}

function readV2Session(): IdiomV2Session {
  const stored = readStoredValue(V2_STORAGE_KEYS.session, defaultSession);
  // We do not persist in-progress flashcard/chain/cloze session state yet,
  // so re-entering the app should always land on home instead of a stale screen.
  if (stored.screen !== 'home') {
    return defaultSession;
  }
  return { screen: stored.screen ?? defaultSession.screen, flashcards: null };
}

export {
  V2_STORAGE_KEYS,
  defaultSettings,
  defaultProgress,
  defaultSession,
  emptyLevelProgress,
  readStoredValue,
  writeStoredValue,
  readV2Settings,
  readV2Progress,
  readV2Session,
};
