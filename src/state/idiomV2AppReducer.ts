import type { IdiomV2Settings, IdiomV2Progress, IdiomV2Session } from '../types/idiomV2';
import { readV2Settings, readV2Progress, readV2Session } from '../lib/idiomV2Storage';
import { v2SettingsReducer, v2ProgressReducer, v2SessionReducer } from './idiomV2Reducers';
import type { IdiomV2Action } from './idiomV2ActionTypes';

export type IdiomV2AppState = {
  settings: IdiomV2Settings;
  progress: IdiomV2Progress;
  session: IdiomV2Session;
};

export function createIdiomV2InitialState(): IdiomV2AppState {
  return {
    settings: readV2Settings(),
    progress: readV2Progress(),
    session: readV2Session(),
  };
}

export function idiomV2AppReducer(state: IdiomV2AppState, action: IdiomV2Action): IdiomV2AppState {
  const nextSettings = v2SettingsReducer(state.settings, action);
  const nextProgress = v2ProgressReducer(state.progress, action);
  const nextSession = v2SessionReducer(state.session, action);
  if (
    nextSettings === state.settings &&
    nextProgress === state.progress &&
    nextSession === state.session
  ) {
    return state;
  }
  return {
    settings: nextSettings,
    progress: nextProgress,
    session: nextSession,
  };
}
