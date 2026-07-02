import type {
  IdiomV2Settings,
  IdiomV2Progress,
  IdiomV2Session,
  IdiomV2WordStats,
  IdiomV2StarredEntry,
} from '../types/idiomV2';
import { idiomV2ActionTypes } from './idiomV2ActionTypes';
import type { IdiomV2Action } from './idiomV2ActionTypes';
import { defaultSession, defaultSettings, emptyLevelProgress, createEmptyByLevel } from '../lib/idiomV2Storage';

export function v2SettingsReducer(state: IdiomV2Settings, action: IdiomV2Action): IdiomV2Settings {
  switch (action.type) {
    case idiomV2ActionTypes.HYDRATE:
      return { ...defaultSettings, ...(action.payload.settings ?? state) };
    case idiomV2ActionTypes.UPDATE_SETTING:
      return { ...state, [action.payload.key]: action.payload.value };
    case idiomV2ActionTypes.TOGGLE_SETTING: {
      const key = action.payload as keyof IdiomV2Settings;
      return { ...state, [key]: !state[key] };
    }
    case idiomV2ActionTypes.SET_IDIOM_LEVEL:
      return { ...state, idiomLevel: action.payload };
    default:
      return state;
  }
}

export function v2ProgressReducer(state: IdiomV2Progress, action: IdiomV2Action): IdiomV2Progress {
  switch (action.type) {
    case idiomV2ActionTypes.HYDRATE:
      return {
        starredIdioms: Array.isArray(action.payload.progress?.starredIdioms) ? action.payload.progress.starredIdioms : [],
        byLevel: createEmptyByLevel(action.payload.progress?.byLevel),
      };
    case idiomV2ActionTypes.TOGGLE_STARRED: {
      const entry = action.payload as IdiomV2StarredEntry;
      const exists = state.starredIdioms.find(s => s.id === entry.id);
      return {
        ...state,
        starredIdioms: exists
          ? state.starredIdioms.filter(s => s.id !== entry.id)
          : [...state.starredIdioms, entry],
      };
    }
    case idiomV2ActionTypes.REMOVE_FROM_STARRED:
      return { ...state, starredIdioms: state.starredIdioms.filter(s => s.id !== action.payload) };
    case idiomV2ActionTypes.TOGGLE_KNOWN: {
      const { id, level } = action.payload;
      const levelProg = state.byLevel[level] ?? { ...emptyLevelProgress };
      const knownIds = levelProg.knownIds ?? [];
      const set = new Set(knownIds);
      if (set.has(id)) {
        set.delete(id);
      } else {
        set.add(id);
      }
      return {
        ...state,
        byLevel: {
          ...state.byLevel,
          [level]: { ...levelProg, knownIds: [...set] },
        },
      };
    }
    case idiomV2ActionTypes.REMOVE_FROM_KNOWN: {
      const { id, level } = action.payload;
      const levelProg = state.byLevel[level] ?? { ...emptyLevelProgress };
      const knownIds = (levelProg.knownIds ?? []).filter(knownId => knownId !== id);
      const wordStats = { ...(levelProg.wordStats ?? {}) };
      delete wordStats[id];
      return {
        ...state,
        byLevel: {
          ...state.byLevel,
          [level]: { ...levelProg, knownIds, wordStats },
        },
      };
    }
    case idiomV2ActionTypes.MARK_SEEN: {
      const { idiomId, seenAt, level } = action.payload;
      const levelProg = state.byLevel[level] ?? { ...emptyLevelProgress };
      const stats = levelProg.wordStats ?? {};
      const prev: IdiomV2WordStats = stats[idiomId] ?? { seenCount: 0, lastSeenAt: null };
      return {
        ...state,
        byLevel: {
          ...state.byLevel,
          [level]: {
            ...levelProg,
            wordStats: {
              ...stats,
              [idiomId]: { seenCount: prev.seenCount + 1, lastSeenAt: seenAt },
            },
          },
        },
      };
    }
    default:
      return state;
  }
}

export function v2SessionReducer(state: IdiomV2Session, action: IdiomV2Action): IdiomV2Session {
  switch (action.type) {
    case idiomV2ActionTypes.HYDRATE:
      return { ...defaultSession, ...(action.payload.session ?? state) };
    case idiomV2ActionTypes.GO_HOME:
      return { ...state, screen: 'home' };
    case idiomV2ActionTypes.OPEN_SCREEN:
      return { ...state, screen: action.payload };
    case idiomV2ActionTypes.SET_IDIOM_LEVEL:
      return { ...state, screen: 'home', flashcards: null };
    case idiomV2ActionTypes.START_FLASHCARDS: {
      const { mode, idiomIds, showBopomofo, showUsage } = action.payload;
      return {
        ...state,
        screen: mode === 'unfamiliar' ? 'flashcardUnfamiliar' : 'flashcardRandom',
        flashcards: {
          mode,
          idiomIds,
          currentIndex: 0,
          showBopomofo,
          showUsage,
        },
      };
    }
    case idiomV2ActionTypes.ADVANCE_FLASHCARD: {
      const flashcards = state.flashcards;
      if (!flashcards || flashcards.idiomIds.length === 0) return state;
      const nextIndex = flashcards.currentIndex + 1;
      const nextIdiomIds = nextIndex < flashcards.idiomIds.length
        ? flashcards.idiomIds
        : action.payload.idiomIds ?? flashcards.idiomIds;
      return {
        ...state,
        flashcards: {
          ...flashcards,
          idiomIds: nextIdiomIds,
          currentIndex: nextIndex < flashcards.idiomIds.length ? nextIndex : 0,
        },
      };
    }
    case idiomV2ActionTypes.TOGGLE_FLASHCARD_PANEL: {
      const flashcards = state.flashcards;
      if (!flashcards) return state;
      return {
        ...state,
        flashcards: { ...flashcards, [action.payload]: !flashcards[action.payload] },
      };
    }
    default:
      return state;
  }
}
