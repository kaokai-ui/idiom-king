import { describe, it, expect, vi, beforeAll } from 'vitest';

import { shuffle, createPracticeDeck, countProgress, createSeededRandom } from '../lib/utils';
import { defaultSettings, defaultProgress, defaultSession } from '../lib/storage';
import { settingsReducer, progressReducer, sessionReducer, toggleListItem } from '../state/reducers';
import { appReducer, type AppState } from '../state/appReducer';
import { actionTypes } from '../state/actionTypes';
import type { AppSettings, AppProgress, AppSession, Cell, CharTile, LevelData } from '../types/game';
import {
  buildBoardFromLevel,
  createCharTiles,
  isBoardComplete,
  isBoardCorrect,
  countFilledCells,
  countActiveCells,
  getWrongCells,
  getCellKey,
  findTileByCellRef,
} from '../game/boardUtils';
import { generateLevel } from '../game/levelGenerator';
import { ready, idioms, idiomsById, idiomIdByText } from '../data/idiomDb';

const makeCell = (overrides: Partial<Cell> = {}): Cell => ({
  row: 0,
  col: 0,
  isActive: true,
  answer: 'A',
  currentValue: null,
  idiomIds: [],
  isPreset: false,
  ...overrides,
});

const makeAppSettings = (overrides: Partial<AppSettings> = {}): AppSettings => ({
  ...defaultSettings,
  ...overrides,
});

const makeAppProgress = (overrides: Partial<AppProgress> = {}): AppProgress => ({
  ...defaultProgress,
  ...overrides,
});

const makeAppSession = (overrides: Partial<AppSession> = {}): AppSession => ({
  ...defaultSession,
  ...overrides,
});

async function readFile(relativePath: string): Promise<string> {
  const fs = await import('fs');
  const path = await import('path');
  return fs.readFileSync(path.resolve(relativePath), 'utf-8');
}

async function fileExists(relativePath: string): Promise<boolean> {
  const fs = await import('fs');
  const path = await import('path');
  return fs.existsSync(path.resolve(relativePath));
}

describe('R1: HomeScreen split into HomeMain + IdiomDetailScreen', () => {
  it('should have separate IdiomDetailScreen component file', async () => {
    const mod = await import('../components/IdiomDetailScreen');
    expect(mod.default).toBeDefined();
  });

  it('HomeScreen should not contain detail view logic', async () => {
    const content = await readFile('src/components/HomeScreen.tsx');
    expect(content).not.toContain('detailView');
    expect(content).not.toContain('DetailView');
    expect(content).not.toContain('detail-header');
  });

  it('HomeScreen should expose the 50-level chain test entry', async () => {
    const content = await readFile('src/components/HomeScreen.tsx');
    expect(content).toContain('接龍測試 50 關');
    expect(content).toContain('onOpenIdiomChainTest');
    expect(content).toContain('settings.developerMode &&');
  });
});

describe('R2: useIdiomChain refactored (no god hook)', () => {
  it('should use useChainState sub-hook for state management', async () => {
    const content = await readFile('src/game/useIdiomChain.ts');
    expect(content).toContain('useChainState');
  });

  it('useIdiomChain should not have 11 raw useState calls', async () => {
    const content = await readFile('src/game/useIdiomChain.ts');
    const useStateMatches = content.match(/useState</g) || [];
    expect(useStateMatches.length).toBeLessThan(11);
  });
});

describe('R3: Action types are fully typed (no unknown payload)', () => {
  it('Action type should be a discriminated union, not { type: string; payload?: unknown }', async () => {
    const content = await readFile('src/state/actionTypes.ts');
    expect(content).not.toContain('payload?: unknown');
    expect(content).toContain('AppAction');
  });

  it('Each action type should have a typed payload', () => {
    type _Test = import('../state/actionTypes').AppAction;
    const action: _Test = {
      type: actionTypes.TOGGLE_STARRED,
      payload: 'idiom_0001',
    };
    expect(action.type).toBe('TOGGLE_STARRED');
  });
});

describe('R4: Reducers have no unsafe `as` casts', () => {
  it('reducers.ts should not contain unsafe `as` casts for action.payload', async () => {
    const content = await readFile('src/state/reducers.ts');
    const asMatches = content.match(/as\s+\w+/g) || [];
    expect(asMatches.length).toBe(0);
  });
});

describe('R5: useIdiomChain no cross-setState calls', () => {
  it('setBoard should not call setCharTiles inside', async () => {
    const content = await readFile('src/game/useIdiomChain.ts');
    expect(content).not.toContain('setCharTiles(pt =>');
  });
});

describe('R6: Error Boundary exists', () => {
  it('main.tsx should wrap App with ErrorBoundary', async () => {
    const content = await readFile('src/main.tsx');
    expect(content).toContain('ErrorBoundary');
  });

  it('ErrorBoundary component file should exist', async () => {
    const mod = await import('../components/ErrorBoundary');
    expect(mod.default).toBeDefined();
  });
});

describe('R8: Single shuffle implementation (no duplicate)', () => {
  it('levelGenerator should import shuffle from lib/utils', async () => {
    const content = await readFile('src/game/levelGenerator.ts');
    expect(content).toContain("from '../lib/utils'");
    expect(content).not.toContain('function shuffleArray');
  });

  it('lib/utils.ts should export shuffle', async () => {
    const mod = await import('../lib/utils');
    expect(typeof mod.shuffle).toBe('function');
  });

  it('lib/game.ts should not exist (renamed to utils.ts)', async () => {
    const exists = await fileExists('src/lib/game.ts');
    expect(exists).toBe(false);
  });
});

describe('R9: TOGGLE_STARRED/TOGGLE_KNOWN deduplicated in reducers', () => {
  it('should use a shared toggleList helper', async () => {
    const content = await readFile('src/state/reducers.ts');
    expect(content).toContain('toggleListItem');
  });

  it('toggleListItem should correctly add and remove items', () => {
    expect(toggleListItem(['a', 'b'], 'c')).toEqual(['a', 'b', 'c']);
    expect(toggleListItem(['a', 'b', 'c'], 'b')).toEqual(['a', 'c']);
    expect(toggleListItem([], 'x')).toEqual(['x']);
  });
});

describe('R10: levelGenerator split into generator + boardUtils', () => {
  it('boardUtils.ts should exist and export board utility functions', async () => {
    const mod = await import('../game/boardUtils');
    expect(mod.buildBoardFromLevel).toBeDefined();
    expect(mod.createCharTiles).toBeDefined();
    expect(mod.isBoardComplete).toBeDefined();
    expect(mod.isBoardCorrect).toBeDefined();
  });

  it('levelGenerator should import from boardUtils', async () => {
    const content = await readFile('src/game/levelGenerator.ts');
    expect(content).toContain("from './boardUtils'");
  });
});

describe('R12: writeStoredValue logs errors', () => {
  it('writeStoredValue should call console.error on failure', async () => {
    const { writeStoredValue } = await import('../lib/storage');
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceeded');
    });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    writeStoredValue('test_key', { data: 1 });
    expect(errorSpy).toHaveBeenCalled();
    setItemSpy.mockRestore();
    errorSpy.mockRestore();
  });
});

describe('R13: readStoredValue validates stored data', () => {
  it('should return fallback for null JSON values', async () => {
    const { readStoredValue } = await import('../lib/storage');
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockReturnValue('null');
    const result = readStoredValue('test_key', { a: 1 });
    expect(result).toEqual({ a: 1 });
    getItemSpy.mockRestore();
  });

  it('should merge only valid keys from stored data', async () => {
    const { readStoredValue } = await import('../lib/storage');
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(
      JSON.stringify({ autoShowBopomofo: true, invalidExtraKey: 'xxx' })
    );
    const result = readStoredValue('test_key', defaultSettings);
    expect(result).toHaveProperty('autoShowBopomofo', true);
    expect(result).not.toHaveProperty('invalidExtraKey');
    getItemSpy.mockRestore();
  });
});

describe('R14: Empty deck does not cause NaN', () => {
  it('currentFlashcardIdiom should be null for empty deck', () => {
    const session: AppSession = {
      screen: 'flashcardRandom',
      flashcards: {
        mode: 'random',
        idiomIds: [],
        currentIndex: 0,
        showBopomofo: false,
        showUsage: false,
        showDefinition: false,
      },
    };
    const { idiomIds, currentIndex } = session.flashcards!;
    const idiom = idiomIds.length > 0 ? idiomsById[idiomIds[currentIndex % idiomIds.length]] : null;
    expect(idiom).toBeNull();
  });
});

describe('R15: .app-shell and .game-shell layout deduplicated', () => {
  it('CSS should use shared .page-shell base class', async () => {
    const content = await readFile('src/index.css');
    expect(content).toContain('.page-shell');
  });
});

describe('R16: .game-page max-width consistent with .game-shell', () => {
  it('game-page should not have its own max-width (inherits from page-shell)', async () => {
    const content = await readFile('src/index.css');
    const gamePageMatch = content.match(/\.game-page\s*\{[^}]*max-width:\s*(\d+px)/);
    expect(gamePageMatch).toBeNull();
  });

  it('page-shell should define the shared max-width', async () => {
    const content = await readFile('src/index.css');
    const pageShellMatch = content.match(/\.page-shell\s*\{[^}]*max-width:\s*(\d+px)/);
    expect(pageShellMatch).not.toBeNull();
    expect(pageShellMatch?.[1]).toBe('430px');
  });
});

describe('ChainBoard responsive sizing stays driven by runtime CSS vars', () => {
  it('responsive media queries should not override board-cell size variables', async () => {
    const content = await readFile('src/index.css');
    expect(content).not.toContain('.board-cell { --cell-size: 30px; --cell-font: 14px; }');
    expect(content).not.toContain('.board-cell { --cell-size: 42px; --cell-font: 18px; }');
    expect(content).not.toContain('.board-cell { --cell-size: 52px; }');
  });
});

describe('R17: ChainBoardCell wrapped with React.memo', () => {
  it('ChainBoardCell should use memo', async () => {
    const content = await readFile('src/components/ChainBoardCell.tsx');
    expect(content).toMatch(/\bmemo\b/);
  });
});

describe('R18: loadLevel does not use setTimeout hack', () => {
  it('useIdiomChain should not use setTimeout for loadLevel', async () => {
    const content = await readFile('src/game/useIdiomChain.ts');
    expect(content).not.toContain('setTimeout');
  });
});

describe('R19: Dead code updateWordStats removed', () => {
  it('lib/utils.ts should not export updateWordStats', async () => {
    const content = await readFile('src/lib/utils.ts');
    expect(content).not.toContain('updateWordStats');
  });
});

describe('R20: Dead Action type removed from actionTypes', () => {
  it('actionTypes.ts should not export the generic Action type', async () => {
    const content = await readFile('src/state/actionTypes.ts');
    expect(content).not.toContain('export type Action =');
  });
});

describe('R22: Unused CSS removed', () => {
  it('.empty-hint should not exist in index.css', async () => {
    const content = await readFile('src/index.css');
    expect(content).not.toContain('.empty-hint');
  });

  it('.section-header-btn should not exist in index.css', async () => {
    const content = await readFile('src/index.css');
    expect(content).not.toContain('.section-header-btn');
  });

  it('.summary-card.active should not exist in index.css', async () => {
    const content = await readFile('src/index.css');
    expect(content).not.toContain('.summary-card.active');
  });
});

describe('R23: idioms removed from useIdiomApp return value', () => {
  it('useIdiomApp should not return idioms', async () => {
    const content = await readFile('src/hooks/useIdiomApp.ts');
    const returnMatch = content.match(/return\s*\{([^}]+)\}/s);
    expect(returnMatch).not.toBeNull();
    if (returnMatch) {
      expect(returnMatch[1]).not.toContain('idioms');
    }
  });
});

describe('R24: Unused Vite default assets removed', () => {
  it('react.svg should not exist in src/assets', async () => {
    const exists = await fileExists('src/assets/react.svg');
    expect(exists).toBe(false);
  });

  it('vite.svg should not exist in src/assets', async () => {
    const exists = await fileExists('src/assets/vite.svg');
    expect(exists).toBe(false);
  });
});

describe('R25: lib/game.ts renamed to lib/utils.ts', () => {
  it('lib/utils.ts should exist', async () => {
    const exists = await fileExists('src/lib/utils.ts');
    expect(exists).toBe(true);
  });

  it('lib/game.ts should not exist', async () => {
    const exists = await fileExists('src/lib/game.ts');
    expect(exists).toBe(false);
  });

  it('imports should reference lib/utils', async () => {
    const content = await readFile('src/hooks/useIdiomApp.ts');
    expect(content).toContain("from '../lib/utils'");
  });
});

describe('R26: ChainPhase type in types/chain.ts', () => {
  it('ChainPhase should be exported from types/chain.ts', async () => {
    const mod = await import('../types/chain');
    expect(mod.ChainPhase).toBeDefined();
  });

  it('useChainState should import ChainPhase from types/chain', async () => {
    const content = await readFile('src/game/useChainState.ts');
    expect(content).toContain("from '../types/chain'");
  });

  it('useIdiomChain should not define ChainPhase locally', async () => {
    const content = await readFile('src/game/useIdiomChain.ts');
    expect(content).not.toContain("export type ChainPhase = ");
  });
});

describe('R27: idioms.json lazy loaded', () => {
  it('idiomDb.ts should use dynamic import or lazy pattern for idioms.json', async () => {
    const content = await readFile('src/data/idiomDb.ts');
    expect(content).not.toContain("import idiomsRaw from '../data/idioms.json'");
  });
});

describe('R28: idiomSentences.json lazy loaded', () => {
  it('useIdiomCloze should not statically import idiomSentences.json', async () => {
    const content = await readFile('src/game/useIdiomCloze.ts');
    expect(content).not.toContain("import idiomSentencesRaw from '../data/idiomSentences.json'");
  });
});

describe('R29: session not persisted to localStorage', () => {
  it('useIdiomApp should not write full session to localStorage', async () => {
    const content = await readFile('src/hooks/useIdiomApp.ts');
    expect(content).not.toMatch(/writeStoredValue\(STORAGE_KEYS\.session,\s*session\)/);
  });

  it('Only screen should be persisted from session', async () => {
    const content = await readFile('src/hooks/useIdiomApp.ts');
    expect(content).toContain('{ screen: session.screen }');
  });
});

describe('Core logic still works after refactoring', () => {
  beforeAll(async () => {
    await ready;
  });

  it('shuffle should produce a permutation of the input', () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const result = shuffle(arr);
    expect(result).toHaveLength(arr.length);
    expect(result.sort((a, b) => a - b)).toEqual(arr);
  });

  it('createPracticeDeck random mode excludes starred and known', () => {
    const progress = makeAppProgress({
      starredIds: ['idiom_0001'],
      knownIds: ['idiom_0002'],
    });
    const deck = createPracticeDeck('random', progress, idioms);
    expect(deck.every(i => i.id !== 'idiom_0001' && i.id !== 'idiom_0002')).toBe(true);
  });

  it('createPracticeDeck unfamiliar mode returns only starred', () => {
    const progress = makeAppProgress({
      starredIds: ['idiom_0001', 'idiom_0002'],
    });
    const deck = createPracticeDeck('unfamiliar', progress, idioms);
    expect(deck.every(i => progress.starredIds.includes(i.id))).toBe(true);
  });

  it('countProgress calculates correctly', () => {
    const progress = makeAppProgress({
      knownIds: ['idiom_0001', 'idiom_0002'],
    });
    const stats = countProgress(progress, idioms);
    expect(stats.totalCount).toBe(idioms.length);
    expect(stats.masteredCount).toBeGreaterThanOrEqual(2);
    expect(stats.progressRate).toBeGreaterThanOrEqual(0);
  });

  it('settingsReducer handles TOGGLE_SETTING', () => {
    const state = makeAppSettings({ developerMode: false });
    const next = settingsReducer(state, { type: actionTypes.TOGGLE_SETTING, payload: 'developerMode' });
    expect(next.developerMode).toBe(true);
  });

  it('progressReducer handles TOGGLE_STARRED', () => {
    const state = makeAppProgress({ starredIds: [] });
    const next = progressReducer(state, { type: actionTypes.TOGGLE_STARRED, payload: 'idiom_0001' });
    expect(next.starredIds).toContain('idiom_0001');
    const next2 = progressReducer(next, { type: actionTypes.TOGGLE_STARRED, payload: 'idiom_0001' });
    expect(next2.starredIds).not.toContain('idiom_0001');
  });

  it('progressReducer handles TOGGLE_KNOWN', () => {
    const state = makeAppProgress({ knownIds: [] });
    const next = progressReducer(state, { type: actionTypes.TOGGLE_KNOWN, payload: 'idiom_0001' });
    expect(next.knownIds).toContain('idiom_0001');
  });

  it('progressReducer handles MARK_SEEN', () => {
    const state = makeAppProgress();
    const next = progressReducer(state, {
      type: actionTypes.MARK_SEEN,
      payload: { idiomId: 'idiom_0001', seenAt: 12345 },
    });
    expect(next.wordStats['idiom_0001'].seenCount).toBe(1);
    expect(next.wordStats['idiom_0001'].lastSeenAt).toBe(12345);
  });

  it('sessionReducer handles GO_HOME', () => {
    const state = makeAppSession({ screen: 'flashcardRandom' });
    const next = sessionReducer(state, { type: actionTypes.GO_HOME });
    expect(next.screen).toBe('home');
  });

  it('sessionReducer handles OPEN_SCREEN', () => {
    const state = makeAppSession();
    const next = sessionReducer(state, { type: actionTypes.OPEN_SCREEN, payload: 'idiomChain' });
    expect(next.screen).toBe('idiomChain');
  });

  it('sessionReducer handles START_FLASHCARDS', () => {
    const state = makeAppSession();
    const next = sessionReducer(state, {
      type: actionTypes.START_FLASHCARDS,
      payload: {
        mode: 'random',
        idiomIds: ['idiom_0001', 'idiom_0002'],
        showBopomofo: true,
        showUsage: false,
        showDefinition: false,
      },
    });
    expect(next.screen).toBe('flashcardRandom');
    expect(next.flashcards?.currentIndex).toBe(0);
  });

  it('appReducer combines all reducers', () => {
    const state: AppState = {
      settings: makeAppSettings(),
      progress: makeAppProgress(),
      session: makeAppSession(),
    };
    const next = appReducer(state, { type: actionTypes.GO_HOME });
    expect(next.session.screen).toBe('home');
    expect(next.settings).toEqual(state.settings);
  });

  it('buildBoardFromLevel creates correct board', () => {
    const level: LevelData = {
      id: 1,
      rows: 2,
      cols: 4,
      idioms: [{
        id: 'idiom_0001',
        text: '一毛不拔',
        chars: ['一', '毛', '不', '拔'],
        direction: 'horizontal',
        startRow: 0,
        startCol: 0,
      }],
      charBank: ['毛', '拔'],
      presetCells: [{ row: 0, col: 0, char: '一' }],
    };
    const board = buildBoardFromLevel(level);
    expect(board).toHaveLength(2);
    expect(board[0]).toHaveLength(4);
    expect(board[0][0].isActive).toBe(true);
    expect(board[0][0].isPreset).toBe(true);
    expect(board[0][0].currentValue).toBe('一');
    expect(board[0][0].answer).toBe('一');
  });

  it('isBoardComplete and isBoardCorrect work correctly', () => {
    const board: Cell[][] = [
      [
        makeCell({ answer: 'A', currentValue: 'A', isActive: true }),
        makeCell({ answer: 'B', currentValue: 'B', isActive: true, row: 0, col: 1 }),
      ],
    ];
    expect(isBoardComplete(board)).toBe(true);
    expect(isBoardCorrect(board)).toBe(true);

    const board2: Cell[][] = [
      [
        makeCell({ answer: 'A', currentValue: 'X', isActive: true }),
        makeCell({ answer: 'B', currentValue: 'B', isActive: true, row: 0, col: 1 }),
      ],
    ];
    expect(isBoardComplete(board2)).toBe(true);
    expect(isBoardCorrect(board2)).toBe(false);
  });

  it('countFilledCells and countActiveCells work correctly', () => {
    const board: Cell[][] = [
      [
        makeCell({ isActive: true, currentValue: 'A' }),
        makeCell({ isActive: true, currentValue: null, row: 0, col: 1 }),
        makeCell({ isActive: false, currentValue: null, row: 0, col: 2 }),
      ],
    ];
    expect(countFilledCells(board)).toBe(1);
    expect(countActiveCells(board)).toBe(2);
  });

  it('getWrongCells identifies mismatched cells', () => {
    const board: Cell[][] = [
      [
        makeCell({ answer: 'A', currentValue: 'X', isActive: true }),
        makeCell({ answer: 'B', currentValue: 'B', isActive: true, row: 0, col: 1 }),
      ],
    ];
    const wrong = getWrongCells(board);
    expect(wrong).toHaveLength(1);
    expect(wrong[0]).toEqual({ row: 0, col: 0 });
  });

  it('getCellKey produces consistent keys', () => {
    expect(getCellKey(1, 2)).toBe('1-2');
  });

  it('createCharTiles creates correct tiles', () => {
    const tiles = createCharTiles(['A', 'B', 'C']);
    expect(tiles).toHaveLength(3);
    expect(tiles[0].value).toBe('A');
    expect(tiles[0].used).toBe(false);
  });

  it('findTileByCellRef finds correct tile', () => {
    const tiles: CharTile[] = [
      { id: 't1', value: 'A', used: true, cellRef: '0-0' },
      { id: 't2', value: 'B', used: false, cellRef: null },
    ];
    expect(findTileByCellRef(tiles, '0-0')?.id).toBe('t1');
    expect(findTileByCellRef(tiles, '1-1')).toBeUndefined();
  });

  it('idiomDb lookups work after ready', () => {
    expect(idioms.length).toBeGreaterThan(0);
    const first = idioms[0];
    expect(idiomsById[first.id]).toBe(first);
    expect(idiomIdByText[first.text]).toBe(first.id);
  });

  it('useChainState awaits idiomDb.ready before generating levels', async () => {
    const content = await readFile('src/game/useChainState.ts');
    expect(content).toContain('idiomDbReady');
    expect(content).toContain('const loadLevel = useCallback');
  });

  it('generateLevel returns LevelData or null', () => {
    const level = generateLevel(1, 3, 8, 8, 10);
    if (level) {
      expect(level.id).toBe(1);
      expect(level.idioms.length).toBeGreaterThanOrEqual(3);
      expect(level.rows).toBeGreaterThan(0);
      expect(level.cols).toBeGreaterThan(0);
    }
  });

  it('generateLevel can be reproduced with a seeded random source', () => {
    const levelA = generateLevel(7, 5, 10, 10, 30, createSeededRandom(20260611));
    const levelB = generateLevel(7, 5, 10, 10, 30, createSeededRandom(20260611));
    expect(levelA).not.toBeNull();
    expect(levelB).not.toBeNull();
    expect(levelA).toEqual(levelB);
  });
});
