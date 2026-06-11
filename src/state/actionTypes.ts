import type { AppSettings, AppProgress, AppSession, AppScreen } from '../types/game';

export const actionTypes = {
HYDRATE: 'HYDRATE',
GO_HOME: 'GO_HOME',
OPEN_SCREEN: 'OPEN_SCREEN',
UPDATE_SETTING: 'UPDATE_SETTING',
TOGGLE_SETTING: 'TOGGLE_SETTING',
TOGGLE_STARRED: 'TOGGLE_STARRED',
TOGGLE_KNOWN: 'TOGGLE_KNOWN',
MARK_SEEN: 'MARK_SEEN',
START_FLASHCARDS: 'START_FLASHCARDS',
ADVANCE_FLASHCARD: 'ADVANCE_FLASHCARD',
TOGGLE_FLASHCARD_PANEL: 'TOGGLE_FLASHCARD_PANEL',
} as const;

export type AppAction =
| { type: 'HYDRATE'; payload: { settings: AppSettings; progress: AppProgress; session: AppSession } }
| { type: 'GO_HOME' }
| { type: 'OPEN_SCREEN'; payload: AppScreen }
| { type: 'UPDATE_SETTING'; payload: { key: keyof AppSettings; value: unknown } }
| { type: 'TOGGLE_SETTING'; payload: keyof AppSettings }
| { type: 'TOGGLE_STARRED'; payload: string }
| { type: 'TOGGLE_KNOWN'; payload: string }
| { type: 'MARK_SEEN'; payload: { idiomId: string; seenAt: number } }
| { type: 'START_FLASHCARDS'; payload: { mode: 'random' | 'unfamiliar'; idiomIds: string[]; showBopomofo: boolean; showUsage: boolean; showDefinition: boolean } }
| { type: 'ADVANCE_FLASHCARD'; payload: { idiomIds: string[] } }
| { type: 'TOGGLE_FLASHCARD_PANEL'; payload: 'showBopomofo' | 'showUsage' | 'showDefinition' };
