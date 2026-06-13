import { useReducer, useEffect, useMemo, useRef, useCallback, useState } from 'react';
import type { AppScreen, AppSettings, IdiomEntry } from '../types/game';
import { appReducer, createInitialState } from '../state/appReducer';
import { actionTypes } from '../state/actionTypes';
import { idioms, idiomsById, ready } from '../data/idiomDb';
import { IDIOM_TOTAL_COUNT } from '../data/idiomMeta';
import { writeStoredValue, STORAGE_KEYS, readSettings, readProgress, readSession } from '../lib/storage';
import { shuffle, createPracticeDeck, countProgress, countProgressLite } from '../lib/utils';

export function useIdiomApp() {
  const [state, dispatch] = useReducer(appReducer, undefined, createInitialState);
  const sessionRef = useRef(state.session);
  const flashcardSeenRef = useRef<string | null>(null);
  const [dataReady, setDataReady] = useState(false);

  useEffect(() => { ready.then(() => setDataReady(true)); }, []);

  const { settings, progress, session } = state;

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    writeStoredValue(STORAGE_KEYS.settings, settings);
  }, [settings]);

  useEffect(() => {
    writeStoredValue(STORAGE_KEYS.progress, progress);
  }, [progress]);

  useEffect(() => {
    writeStoredValue(STORAGE_KEYS.session, { screen: session.screen });
  }, [session.screen]);

  useEffect(() => {
    dispatch({
      type: actionTypes.HYDRATE,
      payload: {
        settings: readSettings(),
        progress: readProgress(),
        session: readSession(),
      },
    });
  }, []);

  const stats = useMemo(
    () => (dataReady ? countProgress(progress, idioms) : countProgressLite(progress, IDIOM_TOTAL_COUNT)),
    [dataReady, progress],
  );

  const currentFlashcardIdiom = useMemo<IdiomEntry | null>(() => {
    if (!dataReady || !session.flashcards) return null;
    const { idiomIds, currentIndex } = session.flashcards;
    if (idiomIds.length === 0) return null;
    const id = idiomIds[currentIndex % idiomIds.length];
    return idiomsById[id] ?? null;
  }, [session.flashcards, dataReady]);

  useEffect(() => {
    if (!currentFlashcardIdiom || !session.flashcards) return;
    const screen = session.screen;
    if (screen !== 'flashcardRandom' && screen !== 'flashcardUnfamiliar') return;
    const seenKey = `${screen}:${session.flashcards.currentIndex}:${currentFlashcardIdiom.id}`;
    if (flashcardSeenRef.current === seenKey) return;
    flashcardSeenRef.current = seenKey;
    dispatch({
      type: actionTypes.MARK_SEEN,
      payload: { idiomId: currentFlashcardIdiom.id, seenAt: Date.now() },
    });
  }, [currentFlashcardIdiom, session.flashcards, session.screen]);

  const isStarred = useCallback(
    (id: string) => progress.starredIds.includes(id),
    [progress.starredIds]
  );

  const isKnown = useCallback(
    (id: string) => progress.knownIds.includes(id),
    [progress.knownIds]
  );

  const goHome = useCallback(() => dispatch({ type: actionTypes.GO_HOME }), []);

  const openScreen = useCallback(
    (screen: AppScreen) => dispatch({ type: actionTypes.OPEN_SCREEN, payload: screen }),
    []
  );

  const toggleSetting = useCallback(
    (key: keyof AppSettings) => dispatch({ type: actionTypes.TOGGLE_SETTING, payload: key }),
    []
  );

  const toggleStarred = useCallback(
    (id: string) => dispatch({ type: actionTypes.TOGGLE_STARRED, payload: id }),
    []
  );

  const toggleKnown = useCallback(
    (id: string) => dispatch({ type: actionTypes.TOGGLE_KNOWN, payload: id }),
    []
  );

  const startFlashcards = useCallback(
    (mode: 'random' | 'unfamiliar') => {
      const launch = () => {
        const deck = createPracticeDeck(mode, progress, idioms);
        dispatch({
          type: actionTypes.START_FLASHCARDS,
          payload: {
            mode,
            idiomIds: deck.map(i => i.id),
            showBopomofo: settings.autoShowBopomofo,
            showUsage: settings.autoShowUsage,
            showDefinition: settings.autoShowDefinition,
          },
        });
      };
      if (!dataReady) {
        void ready.then(launch);
        return;
      }
      launch();
    },
    [progress, settings, dataReady]
  );

  const advanceFlashcard = useCallback(() => {
    const flashcards = sessionRef.current.flashcards;
    if (!flashcards || flashcards.idiomIds.length === 0) return;
    const nextIndex = flashcards.currentIndex + 1;
    const nextIdiomIds = nextIndex < flashcards.idiomIds.length
      ? flashcards.idiomIds
      : shuffle(flashcards.idiomIds);
    dispatch({
      type: actionTypes.ADVANCE_FLASHCARD,
      payload: { idiomIds: nextIdiomIds },
    });
  }, []);

  const toggleFlashcardPanel = useCallback(
    (key: 'showBopomofo' | 'showUsage' | 'showDefinition') => {
      dispatch({ type: actionTypes.TOGGLE_FLASHCARD_PANEL, payload: key });
    },
    []
  );

  return {
    dataReady,
    settings,
    progress,
    session,
    stats,
    currentFlashcardIdiom,
    isStarred,
    isKnown,
    goHome,
    openScreen,
    toggleSetting,
    toggleStarred,
    toggleKnown,
    startFlashcards,
    advanceFlashcard,
    toggleFlashcardPanel,
  };
}
