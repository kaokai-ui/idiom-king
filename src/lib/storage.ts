import type { AppSettings, AppProgress, AppSession } from '../types/game';
import { readStoredValue, writeStoredValue as writeStoredValueBase } from './localStore';

function writeStoredValue(key: string, value: unknown): void {
  writeStoredValueBase(key, value, 'storage');
}

const STORAGE_KEYS = {
  settings: 'idiom-king:settings',
  progress: 'idiom-king:progress',
  session: 'idiom-king:session',
  chainChallengePack: 'idiom-king:chain-challenge-pack:v1',
  chainChallengeProgress: 'idiom-king:chain-challenge-progress:v1',
};

const defaultSettings: AppSettings = {
  autoShowBopomofo: false,
  autoShowUsage: false,
  autoShowDefinition: false,
  developerMode: false,
};

const defaultProgress: AppProgress = {
  starredIds: [],
  knownIds: [],
  wordStats: {},
};

const defaultSession: AppSession = {
  screen: 'home',
  flashcards: null,
};

function readSettings(): AppSettings {
  return readStoredValue(STORAGE_KEYS.settings, defaultSettings);
}

function readProgress(): AppProgress {
  const stored = readStoredValue(STORAGE_KEYS.progress, defaultProgress);
  return {
    starredIds: Array.isArray(stored.starredIds) ? stored.starredIds : [],
    knownIds: Array.isArray(stored.knownIds) ? stored.knownIds : [],
    wordStats:
      stored.wordStats && typeof stored.wordStats === 'object' && !Array.isArray(stored.wordStats)
        ? stored.wordStats
        : {},
  };
}

function readSession(): AppSession {
  const stored = readStoredValue(STORAGE_KEYS.session, defaultSession);
  // We do not persist in-progress practice state yet,
  // so a fresh app entry should always land on home.
  if (stored.screen !== 'home') {
    return defaultSession;
  }
  return { screen: 'home', flashcards: null };
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
