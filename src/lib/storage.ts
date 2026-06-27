const STORAGE_KEYS = {
  settings: 'idiom-king:settings',
  progress: 'idiom-king:progress',
  session: 'idiom-king:session',
  chainChallengePack: 'idiom-king:chain-challenge-pack:v1',
  chainChallengeProgress: 'idiom-king:chain-challenge-progress:v1',
};

const defaultSettings: import('../types/game').AppSettings = {
  autoShowBopomofo: false,
  autoShowUsage: false,
  autoShowDefinition: false,
  developerMode: false,
};

const defaultProgress: import('../types/game').AppProgress = {
  starredIds: [],
  knownIds: [],
  wordStats: {},
};

const defaultSession: import('../types/game').AppSession = {
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
    for (const key of Object.keys(fallback as Record<string, unknown>)) {
      if (key in parsed) {
        result[key] = parsed[key];
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
    console.error(`[storage] Failed to write "${key}":`, err);
  }
}

function readSettings(): import('../types/game').AppSettings {
  return { ...defaultSettings, ...readStoredValue(STORAGE_KEYS.settings, defaultSettings) };
}

function readProgress(): import('../types/game').AppProgress {
  return { ...defaultProgress, ...readStoredValue(STORAGE_KEYS.progress, defaultProgress) };
}

function readSession(): import('../types/game').AppSession {
  const stored = readStoredValue(STORAGE_KEYS.session, defaultSession);
  // We do not persist in-progress practice state yet,
  // so a fresh app entry should always land on home.
  if (stored.screen !== 'home') {
    return defaultSession;
  }
  return { screen: stored.screen ?? defaultSession.screen, flashcards: null };
}

export {
  STORAGE_KEYS,
  defaultSettings,
  defaultProgress,
  defaultSession,
  readStoredValue,
  writeStoredValue,
  readSettings,
  readProgress,
  readSession,
};
