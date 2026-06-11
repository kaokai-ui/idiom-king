import type { AppSettings, AppProgress, AppSession } from '../types/game';
import { readSettings, readProgress, readSession } from '../lib/storage';
import { settingsReducer, progressReducer, sessionReducer } from './reducers';
import type { AppAction } from './actionTypes';


export type AppState = {
settings: AppSettings;
progress: AppProgress;
session: AppSession;
};

export function createInitialState(): AppState {
return {
settings: readSettings(),
progress: readProgress(),
session: readSession(),
};
}

export function appReducer(state: AppState, action: AppAction): AppState {
const nextSettings = settingsReducer(state.settings, action);
const nextProgress = progressReducer(state.progress, action);
const nextSession = sessionReducer(state.session, action);
return {
settings: nextSettings,
progress: nextProgress,
session: nextSession,
};
}
