import { useReducer, useEffect, useMemo, useRef, useCallback } from 'react';
import type { IdiomV2AppScreen, IdiomV2Settings, IdiomV2Entry, IdiomV2StarredEntry, IdiomLevel, IdiomV2Progress } from '../types/idiomV2';
import { idiomV2AppReducer, createIdiomV2InitialState } from '../state/idiomV2AppReducer';
import { idiomV2ActionTypes } from '../state/idiomV2ActionTypes';
import { V2_STORAGE_KEYS, writeStoredValue, readV2Settings, readV2Progress, readV2Session } from '../lib/idiomV2Storage';
import { shuffle, isMasteredWord } from '../lib/utils';
import { useIdiomV2Data } from './useIdiomV2Data';
import { LATE_SHOW_IDIOMS } from '../constants/idiomLevels';
import { trackIdiomV2LevelSelection } from '../lib/analytics';

function createEntryFromStarred(entry: IdiomV2StarredEntry): IdiomV2Entry {
  const chars = entry.text.split('');
  const uniqueChars = [...new Set(chars)];
  const charCountMap = chars.reduce<Record<string, number>>((acc, char) => {
    acc[char] = (acc[char] ?? 0) + 1;
    return acc;
  }, {});

  return {
    id: entry.id,
    sourceNo: entry.id.replace(/^idiom2_/, ''),
    text: entry.text,
    chars,
    uniqueChars,
    charCountMap,
    bopomofo: entry.bopomofo,
    usage: entry.usage,
    level: entry.level,
    levelLabel: entry.levelLabel,
  };
}

function computeStats(idioms: IdiomV2Entry[], progress: IdiomV2Progress, activeLevel: IdiomLevel) {
  const totalCount = idioms.length;
  const levelProgress = progress.byLevel[activeLevel] ?? { knownIds: [], wordStats: {} };
  const masteredSet = new Set<string>();

  for (const id of levelProgress.knownIds ?? []) {
    masteredSet.add(id);
  }
  for (const [id, ws] of Object.entries(levelProgress.wordStats ?? {})) {
    if (isMasteredWord(ws)) masteredSet.add(id);
  }

  const masteredCount = masteredSet.size;
  const unfamiliarCount = Math.max(totalCount - masteredCount, 0);
  return {
    totalCount,
    masteredCount,
    unfamiliarCount,
    progressRate: totalCount === 0 ? 0 : Math.round((masteredCount / totalCount) * 100),
  };
}

function buildRandomDeck(
  idioms: IdiomV2Entry[],
  progress: IdiomV2Progress,
  activeLevel: IdiomLevel,
): IdiomV2Entry[] {
  const starredSet = new Set(progress.starredIdioms.map(s => s.id));
  const knownSet = new Set((progress.byLevel[activeLevel]?.knownIds) ?? []);
  const deck = shuffle(idioms.filter(w => !starredSet.has(w.id) && !knownSet.has(w.id)));

  const lateShowMap = LATE_SHOW_IDIOMS[activeLevel] ?? {};
  const lateItems = deck.filter(i => lateShowMap[i.id] !== undefined);
  const normalItems = deck.filter(i => lateShowMap[i.id] === undefined);
  return [...normalItems, ...lateItems];
}

function buildUnfamiliarDeck(progress: IdiomV2Progress): IdiomV2Entry[] {
  return shuffle(progress.starredIdioms.map(createEntryFromStarred));
}

function resolveFlashcardIdiom(
  session: { flashcards: { idiomIds: string[]; currentIndex: number } | null },
  idiomsById: Record<string, IdiomV2Entry>,
  starredIdioms: IdiomV2StarredEntry[],
  dataReady: boolean,
): IdiomV2Entry | null {
  if (!dataReady || !session.flashcards) return null;
  const { idiomIds, currentIndex } = session.flashcards;
  if (idiomIds.length === 0) return null;
  const id = idiomIds[currentIndex % idiomIds.length];
  const currentLevelEntry = idiomsById[id];
  if (currentLevelEntry) return currentLevelEntry;

  const starredEntry = starredIdioms.find((entry) => entry.id === id);
  return starredEntry ? createEntryFromStarred(starredEntry) : null;
}

export { createEntryFromStarred, computeStats, buildRandomDeck, buildUnfamiliarDeck, resolveFlashcardIdiom };

export function useIdiomV2App() {
  const [state, dispatch] = useReducer(idiomV2AppReducer, undefined, createIdiomV2InitialState);
  const flashcardSeenRef = useRef<string | null>(null);

  const { settings, progress, session } = state;
  const activeLevel = settings.idiomLevel;

  const {
    idioms,
    idiomsById,
    charIndex,
    catalog,
    activeLevelLabel,
    isLoading: dataLoading,
    isReady: dataReady,
    error: dataError,
    retry: dataRetry,
  } = useIdiomV2Data(activeLevel);

  useEffect(() => {
    writeStoredValue(V2_STORAGE_KEYS.settings, settings);
  }, [settings]);

  useEffect(() => {
    writeStoredValue(V2_STORAGE_KEYS.progress, progress);
  }, [progress]);

  useEffect(() => {
    writeStoredValue(V2_STORAGE_KEYS.session, { screen: session.screen });
  }, [session.screen]);

  useEffect(() => {
    dispatch({
      type: idiomV2ActionTypes.HYDRATE,
      payload: {
        settings: readV2Settings(),
        progress: readV2Progress(),
        session: readV2Session(),
      },
    });
  }, []);

  const stats = useMemo(() => computeStats(idioms, progress, activeLevel), [idioms, progress.byLevel, activeLevel]);

  const currentFlashcardIdiom = useMemo<IdiomV2Entry | null>(
    () => resolveFlashcardIdiom(session, idiomsById, progress.starredIdioms, dataReady),
    [session.flashcards, dataReady, idiomsById, progress.starredIdioms]
  );

  useEffect(() => {
    if (!currentFlashcardIdiom || !session.flashcards) return;
    const screen = session.screen;
    if (screen !== 'flashcardRandom' && screen !== 'flashcardUnfamiliar') return;
    const seenKey = `${screen}:${session.flashcards.currentIndex}:${currentFlashcardIdiom.id}`;
    if (flashcardSeenRef.current === seenKey) return;
    flashcardSeenRef.current = seenKey;
    dispatch({
      type: idiomV2ActionTypes.MARK_SEEN,
      payload: { idiomId: currentFlashcardIdiom.id, seenAt: Date.now(), level: currentFlashcardIdiom.level },
    });
  }, [currentFlashcardIdiom, session.flashcards, session.screen]);

  const isStarred = useCallback(
    (id: string) => progress.starredIdioms.some(s => s.id === id),
    [progress.starredIdioms]
  );

  const getStarredEntry = useCallback(
    (id: string): IdiomV2StarredEntry | null => {
      return progress.starredIdioms.find(s => s.id === id) ?? null;
    },
    [progress.starredIdioms]
  );

  const isKnown = useCallback(
    (id: string, level: IdiomLevel = activeLevel) => {
      const levelProgress = progress.byLevel[level];
      return (levelProgress?.knownIds ?? []).includes(id);
    },
    [progress.byLevel, activeLevel]
  );

  const goHome = useCallback(() => dispatch({ type: idiomV2ActionTypes.GO_HOME }), []);

  const openScreen = useCallback(
    (screen: IdiomV2AppScreen) => dispatch({ type: idiomV2ActionTypes.OPEN_SCREEN, payload: screen }),
    []
  );

  const toggleSetting = useCallback(
    (key: keyof Omit<IdiomV2Settings, 'idiomLevel'>) =>
      dispatch({ type: idiomV2ActionTypes.TOGGLE_SETTING, payload: key }),
    []
  );

  const setIdiomLevel = useCallback(
    (level: IdiomLevel) => {
      if (level === activeLevel) return;
      dispatch({ type: idiomV2ActionTypes.SET_IDIOM_LEVEL, payload: level });
      trackIdiomV2LevelSelection(level, activeLevel);
    },
    [activeLevel]
  );

  const toggleStarred = useCallback(
    (entry: IdiomV2StarredEntry) =>
      dispatch({ type: idiomV2ActionTypes.TOGGLE_STARRED, payload: entry }),
    []
  );

  const toggleKnown = useCallback(
    (id: string, level: IdiomLevel = activeLevel) => {
      dispatch({
        type: idiomV2ActionTypes.TOGGLE_KNOWN,
        payload: { id, level },
      });
    },
    [activeLevel]
  );

  const removeFromStarred = useCallback(
    (id: string) => dispatch({ type: idiomV2ActionTypes.REMOVE_FROM_STARRED, payload: id }),
    []
  );

  const startFlashcards = useCallback(
    (mode: 'random' | 'unfamiliar') => {
      if (!dataReady) return;
      const deck = mode === 'unfamiliar'
        ? buildUnfamiliarDeck(progress)
        : buildRandomDeck(idioms, progress, activeLevel);

      dispatch({
        type: idiomV2ActionTypes.START_FLASHCARDS,
        payload: {
          mode,
          idiomIds: deck.map(i => i.id),
          showBopomofo: settings.autoShowBopomofo,
          showUsage: settings.autoShowUsage,
        },
      });
    },
    [idioms, progress, settings, dataReady, activeLevel]
  );

  const advanceFlashcard = useCallback(() => {
    const flashcards = session.flashcards;
    if (!flashcards || flashcards.idiomIds.length === 0) return;
    const nextIndex = flashcards.currentIndex + 1;
    const nextIdiomIds = nextIndex < flashcards.idiomIds.length
      ? flashcards.idiomIds
      : shuffle(flashcards.idiomIds);
    dispatch({
      type: idiomV2ActionTypes.ADVANCE_FLASHCARD,
      payload: { idiomIds: nextIdiomIds },
    });
  }, [session.flashcards]);

  const toggleFlashcardPanel = useCallback(
    (key: 'showBopomofo' | 'showUsage') => {
      dispatch({ type: idiomV2ActionTypes.TOGGLE_FLASHCARD_PANEL, payload: key });
    },
    []
  );

  return {
    dataReady,
    dataLoading,
    dataError,
    dataRetry,
    settings,
    progress,
    session,
    stats,
    currentFlashcardIdiom,
    idioms,
    idiomsById,
    charIndex,
    catalog,
    activeLevel,
    activeLevelLabel,
    isStarred,
    getStarredEntry,
    isKnown,
    goHome,
    openScreen,
    toggleSetting,
    setIdiomLevel,
    toggleStarred,
    toggleKnown,
    removeFromStarred,
    startFlashcards,
    advanceFlashcard,
    toggleFlashcardPanel,
  };
}
