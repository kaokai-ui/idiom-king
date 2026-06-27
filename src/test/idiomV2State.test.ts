import { describe, expect, it } from 'vitest';
import type { IdiomV2Progress, IdiomV2Settings, IdiomV2Session } from '../types/idiomV2';
import {
  v2SettingsReducer,
  v2ProgressReducer,
  v2SessionReducer,
} from '../state/idiomV2Reducers';
import { idiomV2ActionTypes } from '../state/idiomV2ActionTypes';
import { defaultSettings, defaultProgress, emptyLevelProgress } from '../lib/idiomV2Storage';

const makeSettings = (overrides: Partial<IdiomV2Settings> = {}): IdiomV2Settings => ({
  ...defaultSettings,
  ...overrides,
});

const makeProgress = (overrides: Partial<IdiomV2Progress> = {}): IdiomV2Progress => ({
  ...defaultProgress,
  byLevel: {
    elementary: { ...emptyLevelProgress },
    junior: { ...emptyLevelProgress },
    senior: { ...emptyLevelProgress },
    ...overrides.byLevel,
  },
  ...overrides,
});

describe('idiomV2State: default settings', () => {
  it('default level is elementary', () => {
    expect(defaultSettings.idiomLevel).toBe('elementary');
  });

  it('autoShowBopomofo defaults to false', () => {
    expect(defaultSettings.autoShowBopomofo).toBe(false);
  });

  it('autoShowUsage defaults to false', () => {
    expect(defaultSettings.autoShowUsage).toBe(false);
  });
});

describe('idiomV2State: v2SettingsReducer', () => {
  it('SET_IDIOM_LEVEL changes the active level', () => {
    const state = makeSettings();
    const next = v2SettingsReducer(state, { type: idiomV2ActionTypes.SET_IDIOM_LEVEL, payload: 'junior' });
    expect(next.idiomLevel).toBe('junior');
  });

  it('TOGGLE_SETTING toggles autoShowBopomofo', () => {
    const state = makeSettings({ autoShowBopomofo: false });
    const next = v2SettingsReducer(state, { type: idiomV2ActionTypes.TOGGLE_SETTING, payload: 'autoShowBopomofo' });
    expect(next.autoShowBopomofo).toBe(true);
  });

  it('TOGGLE_SETTING toggles autoShowUsage', () => {
    const state = makeSettings({ autoShowUsage: false });
    const next = v2SettingsReducer(state, { type: idiomV2ActionTypes.TOGGLE_SETTING, payload: 'autoShowUsage' });
    expect(next.autoShowUsage).toBe(true);
  });

  it('TOGGLE_SETTING toggles developerMode', () => {
    const state = makeSettings({ developerMode: false });
    const next = v2SettingsReducer(state, { type: idiomV2ActionTypes.TOGGLE_SETTING, payload: 'developerMode' });
    expect(next.developerMode).toBe(true);
  });
});

describe('idiomV2State: v2ProgressReducer', () => {
  it('TOGGLE_STARRED adds and removes from global starredIdioms', () => {
    const state = makeProgress();
    const entry = { id: 'a', text: '一毛不拔', bopomofo: '', usage: '', level: 'elementary' as const, levelLabel: '國小' };
    const next = v2ProgressReducer(state, { type: idiomV2ActionTypes.TOGGLE_STARRED, payload: entry });
    expect(next.starredIdioms).toHaveLength(1);
    expect(next.starredIdioms[0].id).toBe('a');

    const next2 = v2ProgressReducer(next, { type: idiomV2ActionTypes.TOGGLE_STARRED, payload: entry });
    expect(next2.starredIdioms).toHaveLength(0);
  });

  it('starredIdioms are global - not cleared on level switch', () => {
    const entry = { id: 'a', text: '一毛不拔', bopomofo: '', usage: '', level: 'elementary' as const, levelLabel: '國小' };
    const state = makeProgress();
    const next = v2ProgressReducer(state, { type: idiomV2ActionTypes.TOGGLE_STARRED, payload: entry });
    v2SettingsReducer(makeSettings(), { type: idiomV2ActionTypes.SET_IDIOM_LEVEL, payload: 'junior' });
    expect(next.starredIdioms).toHaveLength(1);
  });

  it('TOGGLE_KNOWN writes to the correct level only', () => {
    const state = makeProgress();
    const next = v2ProgressReducer(state, {
      type: idiomV2ActionTypes.TOGGLE_KNOWN,
      payload: { id: 'x', level: 'elementary' },
    });
    expect(next.byLevel.elementary.knownIds).toContain('x');
    expect(next.byLevel.junior.knownIds).toHaveLength(0);
    expect(next.byLevel.senior.knownIds).toHaveLength(0);
  });

  it('TOGGLE_KNOWN removes from the level if already known', () => {
    const state = makeProgress({
      byLevel: {
        elementary: { knownIds: ['x'], wordStats: {} },
        junior: { ...emptyLevelProgress },
        senior: { ...emptyLevelProgress },
      },
    });
    const next = v2ProgressReducer(state, {
      type: idiomV2ActionTypes.TOGGLE_KNOWN,
      payload: { id: 'x', level: 'elementary' },
    });
    expect(next.byLevel.elementary.knownIds).not.toContain('x');
  });

  it('MARK_SEEN writes to the correct level only', () => {
    const state = makeProgress();
    const next = v2ProgressReducer(state, {
      type: idiomV2ActionTypes.MARK_SEEN,
      payload: { idiomId: 'y', seenAt: 12345, level: 'junior' },
    });
    expect(next.byLevel.junior.wordStats['y'].seenCount).toBe(1);
    expect(next.byLevel.elementary.wordStats).toEqual({});
    expect(next.byLevel.senior.wordStats).toEqual({});
  });

  it('duplicate star does not create duplicates in starredIdioms', () => {
    const entry = { id: 'a', text: '一毛不拔', bopomofo: '', usage: '', level: 'elementary' as const, levelLabel: '國小' };
    const state = makeProgress();
    const next = v2ProgressReducer(state, { type: idiomV2ActionTypes.TOGGLE_STARRED, payload: entry });
    const next2 = v2ProgressReducer(next, { type: idiomV2ActionTypes.TOGGLE_STARRED, payload: entry });
    expect(next2.starredIdioms).toHaveLength(0);
  });

  it('REMOVE_FROM_STARRED removes by id', () => {
    const entry = { id: 'a', text: '一毛不拔', bopomofo: '', usage: '', level: 'elementary' as const, levelLabel: '國小' };
    const state = makeProgress();
    const next = v2ProgressReducer(state, { type: idiomV2ActionTypes.TOGGLE_STARRED, payload: entry });
    const removed = v2ProgressReducer(next, { type: idiomV2ActionTypes.REMOVE_FROM_STARRED, payload: 'a' });
    expect(removed.starredIdioms).toHaveLength(0);
  });
});

describe('idiomV2State: v2SessionReducer', () => {
  it('GO_HOME returns to home screen', () => {
    const state: IdiomV2Session = { screen: 'flashcardRandom', flashcards: null };
    const next = v2SessionReducer(state, { type: idiomV2ActionTypes.GO_HOME });
    expect(next.screen).toBe('home');
  });

  it('OPEN_SCREEN changes screen', () => {
    const state: IdiomV2Session = { screen: 'home', flashcards: null };
    const next = v2SessionReducer(state, { type: idiomV2ActionTypes.OPEN_SCREEN, payload: 'idiomCloze' });
    expect(next.screen).toBe('idiomCloze');
  });

  it('SET_IDIOM_LEVEL resets to home and clears flashcards', () => {
    const state: IdiomV2Session = {
      screen: 'flashcardRandom',
      flashcards: { mode: 'random', idiomIds: ['a'], currentIndex: 0, showBopomofo: false, showUsage: false },
    };
    const next = v2SessionReducer(state, { type: idiomV2ActionTypes.SET_IDIOM_LEVEL, payload: 'junior' });
    expect(next.screen).toBe('home');
    expect(next.flashcards).toBeNull();
  });

  it('START_FLASHCARDS sets screen and flashcard state', () => {
    const state: IdiomV2Session = { screen: 'home', flashcards: null };
    const next = v2SessionReducer(state, {
      type: idiomV2ActionTypes.START_FLASHCARDS,
      payload: { mode: 'random', idiomIds: ['a', 'b'], showBopomofo: true, showUsage: false },
    });
    expect(next.screen).toBe('flashcardRandom');
    expect(next.flashcards?.currentIndex).toBe(0);
    expect(next.flashcards?.idiomIds).toEqual(['a', 'b']);
  });

  it('START_FLASHCARDS unfamiliar mode sets correct screen', () => {
    const state: IdiomV2Session = { screen: 'home', flashcards: null };
    const next = v2SessionReducer(state, {
      type: idiomV2ActionTypes.START_FLASHCARDS,
      payload: { mode: 'unfamiliar', idiomIds: ['a'], showBopomofo: false, showUsage: true },
    });
    expect(next.screen).toBe('flashcardUnfamiliar');
  });

  it('ADVANCE_FLASHCARD increments index', () => {
    const state: IdiomV2Session = {
      screen: 'flashcardRandom',
      flashcards: { mode: 'random', idiomIds: ['a', 'b', 'c'], currentIndex: 0, showBopomofo: false, showUsage: false },
    };
    const next = v2SessionReducer(state, { type: idiomV2ActionTypes.ADVANCE_FLASHCARD, payload: { idiomIds: ['a', 'b', 'c'] } });
    expect(next.flashcards?.currentIndex).toBe(1);
  });

  it('TOGGLE_FLASHCARD_PANEL toggles showBopomofo', () => {
    const state: IdiomV2Session = {
      screen: 'flashcardRandom',
      flashcards: { mode: 'random', idiomIds: ['a'], currentIndex: 0, showBopomofo: false, showUsage: false },
    };
    const next = v2SessionReducer(state, { type: idiomV2ActionTypes.TOGGLE_FLASHCARD_PANEL, payload: 'showBopomofo' });
    expect(next.flashcards?.showBopomofo).toBe(true);
  });
});

describe('idiomV2State: storage key isolation', () => {
  it('v2 storage keys should not overlap with v1', async () => {
    const { V2_STORAGE_KEYS } = await import('../lib/idiomV2Storage');
    for (const key of Object.values(V2_STORAGE_KEYS)) {
      expect(key).toContain('idiom-king-2:');
      expect(key).not.toContain('idiom-king:');
    }
  });
});
