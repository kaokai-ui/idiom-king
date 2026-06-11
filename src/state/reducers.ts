import type { AppSettings, AppProgress, AppSession, WordStats } from '../types/game';
import { actionTypes } from './actionTypes';
import type { AppAction } from './actionTypes';
import { defaultProgress, defaultSession, defaultSettings } from '../lib/storage';

export function toggleListItem(list: string[], id: string): string[] {
const set = new Set(list);
if (set.has(id)) {
set.delete(id);
} else {
set.add(id);
}
return [...set];
}

export function settingsReducer(state: AppSettings, action: AppAction): AppSettings {
switch (action.type) {
case actionTypes.HYDRATE:
return { ...defaultSettings, ...(action.payload.settings ?? state) };
case actionTypes.UPDATE_SETTING:
return { ...state, [action.payload.key]: action.payload.value };
case actionTypes.TOGGLE_SETTING:
return { ...state, [action.payload]: !state[action.payload] };
default:
return state;
}
}

export function progressReducer(state: AppProgress, action: AppAction): AppProgress {
switch (action.type) {
case actionTypes.HYDRATE:
return { ...defaultProgress, ...(action.payload.progress ?? state) };
case actionTypes.TOGGLE_STARRED:
return { ...state, starredIds: toggleListItem(state.starredIds, action.payload) };
case actionTypes.TOGGLE_KNOWN:
return { ...state, knownIds: toggleListItem(state.knownIds, action.payload) };
case actionTypes.MARK_SEEN: {
const { idiomId, seenAt } = action.payload;
const currentStats = state.wordStats ?? {};
const prev: WordStats = currentStats[idiomId] ?? { seenCount: 0, lastSeenAt: null };
return {
...state,
wordStats: {
...currentStats,
[idiomId]: { seenCount: prev.seenCount + 1, lastSeenAt: seenAt },
},
};
}
default:
return state;
}
}

export function sessionReducer(state: AppSession, action: AppAction): AppSession {
switch (action.type) {
case actionTypes.HYDRATE:
return { ...defaultSession, ...(action.payload.session ?? state) };
case actionTypes.GO_HOME:
return { ...state, screen: 'home' };
case actionTypes.OPEN_SCREEN:
return { ...state, screen: action.payload };
case actionTypes.START_FLASHCARDS: {
const { mode, idiomIds, showBopomofo, showUsage, showDefinition } = action.payload;
return {
...state,
screen: mode === 'unfamiliar' ? 'flashcardUnfamiliar' : 'flashcardRandom',
flashcards: {
mode,
idiomIds,
currentIndex: 0,
showBopomofo,
showUsage,
showDefinition,
},
};
}
case actionTypes.ADVANCE_FLASHCARD: {
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
case actionTypes.TOGGLE_FLASHCARD_PANEL: {
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
