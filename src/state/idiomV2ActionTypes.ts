import type {
  IdiomV2Settings,
  IdiomV2Progress,
  IdiomV2Session,
  IdiomV2AppScreen,
  IdiomV2StarredEntry,
  IdiomLevel,
} from '../types/idiomV2';

export const idiomV2ActionTypes = {
  HYDRATE: 'HYDRATE',
  GO_HOME: 'GO_HOME',
  OPEN_SCREEN: 'OPEN_SCREEN',
  UPDATE_SETTING: 'UPDATE_SETTING',
  TOGGLE_SETTING: 'TOGGLE_SETTING',
  SET_IDIOM_LEVEL: 'SET_IDIOM_LEVEL',
  TOGGLE_STARRED: 'TOGGLE_STARRED',
  TOGGLE_KNOWN: 'TOGGLE_KNOWN',
  MARK_SEEN: 'MARK_SEEN',
  START_FLASHCARDS: 'START_FLASHCARDS',
  ADVANCE_FLASHCARD: 'ADVANCE_FLASHCARD',
  TOGGLE_FLASHCARD_PANEL: 'TOGGLE_FLASHCARD_PANEL',
  REMOVE_FROM_STARRED: 'REMOVE_FROM_STARRED',
} as const;

export type IdiomV2Action =
  | { type: 'HYDRATE'; payload: { settings: IdiomV2Settings; progress: IdiomV2Progress; session: IdiomV2Session } }
  | { type: 'GO_HOME' }
  | { type: 'OPEN_SCREEN'; payload: IdiomV2AppScreen }
  | { type: 'UPDATE_SETTING'; payload: { key: keyof IdiomV2Settings; value: unknown } }
  | { type: 'TOGGLE_SETTING'; payload: keyof Omit<IdiomV2Settings, 'idiomLevel'> }
  | { type: 'SET_IDIOM_LEVEL'; payload: IdiomLevel }
  | { type: 'TOGGLE_STARRED'; payload: IdiomV2StarredEntry }
  | { type: 'TOGGLE_KNOWN'; payload: { id: string; level: IdiomLevel } }
  | { type: 'REMOVE_FROM_STARRED'; payload: string }
  | { type: 'MARK_SEEN'; payload: { idiomId: string; seenAt: number; level: IdiomLevel } }
  | { type: 'START_FLASHCARDS'; payload: { mode: 'random' | 'unfamiliar'; idiomIds: string[]; showBopomofo: boolean; showUsage: boolean } }
  | { type: 'ADVANCE_FLASHCARD'; payload: { idiomIds: string[] } }
  | { type: 'TOGGLE_FLASHCARD_PANEL'; payload: 'showBopomofo' | 'showUsage' };
