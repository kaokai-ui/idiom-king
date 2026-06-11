import { useReducer, useRef, useEffect, useCallback } from 'react';
import type { Cell, CharTile, LevelData } from '../types/game';
import type { ChainPhase } from '../types/chain';
import { ready as idiomDbReady, isDbReady } from '../data/idiomDb';
import {
  generateLevel,
} from '../game/levelGenerator';
import {
  buildBoardFromLevel, createCharTiles,
  countActiveCells, countFilledCells,
} from '../game/boardUtils';

export type ChainState = {
  level: LevelData | null;
  board: Cell[][];
  charTiles: CharTile[];
  selectedCell: { row: number; col: number } | null;
  levelNumber: number;
  phase: ChainPhase;
  wrongCells: Set<string>;
  filledCount: number;
  totalActive: number;
  hintVisible: boolean;
  expandedIdiomId: string | null;
};

export type ChainAction =
  | { type: 'START_GENERATING' }
  | { type: 'GENERATE_ERROR' }
  | { type: 'LEVEL_LOADED'; payload: {
    level: LevelData; board: Cell[][]; charTiles: CharTile[];
    levelNumber: number; filledCount: number; totalActive: number;
  } }
  | { type: 'SELECT_CELL'; payload: { row: number; col: number } | null }
  | { type: 'PLACE_TILE'; payload: {
    row: number; col: number; cellKey: string;
    value: string; tileId: string; prevTileId: string | null;
    filledCount: number; nextSelectedCell: { row: number; col: number } | null;
  } }
  | { type: 'DELETE_CELL'; payload: { cellKey: string; filledCount: number } }
  | { type: 'CLEAR_ALL'; payload: { filledCount: number } }
  | { type: 'SET_CHECKING'; payload: { wrongCells: Set<string> } }
  | { type: 'SET_COMPLETE' }
  | { type: 'SET_PLAYING' }
  | { type: 'REMOVE_WRONG_CELL'; payload: { cellKey: string } }
  | { type: 'TOGGLE_HINT' }
  | { type: 'TOGGLE_IDIOM_DETAIL'; payload: string | null };

const initialState: ChainState = {
  level: null,
  board: [],
  charTiles: [],
  selectedCell: null,
  levelNumber: 1,
  phase: 'generating',
  wrongCells: new Set(),
  filledCount: 0,
  totalActive: 0,
  hintVisible: false,
  expandedIdiomId: null,
};

function chainReducer(state: ChainState, action: ChainAction): ChainState {
  switch (action.type) {
    case 'START_GENERATING':
      return {
        ...state,
        phase: 'generating',
        wrongCells: new Set(),
        hintVisible: false,
        expandedIdiomId: null,
      };

    case 'GENERATE_ERROR':
      return { ...state, phase: 'error' };

    case 'LEVEL_LOADED':
      return {
        ...state,
        level: action.payload.level,
        board: action.payload.board,
        charTiles: action.payload.charTiles,
        selectedCell: null,
        levelNumber: action.payload.levelNumber,
        filledCount: action.payload.filledCount,
        totalActive: action.payload.totalActive,
        phase: 'playing',
        wrongCells: new Set(),
        hintVisible: false,
        expandedIdiomId: null,
      };

    case 'SELECT_CELL':
      return { ...state, selectedCell: action.payload };

    case 'PLACE_TILE': {
      const { row, col, cellKey, value, tileId, prevTileId, filledCount, nextSelectedCell } = action.payload;
      const newBoard = state.board.map(r => r.map(c => ({ ...c })));
      newBoard[row][col].currentValue = value;

      let newTiles = state.charTiles.map(t =>
        t.id === tileId ? { ...t, used: true, cellRef: cellKey } : t,
      );
      if (prevTileId) {
        newTiles = newTiles.map(t =>
          t.id === prevTileId ? { ...t, used: false, cellRef: null } : t,
        );
      }

      const newWrongCells = new Set(state.wrongCells);
      newWrongCells.delete(cellKey);

      return {
        ...state,
        board: newBoard,
        charTiles: newTiles,
        filledCount,
        selectedCell: nextSelectedCell,
        wrongCells: newWrongCells,
      };
    }

    case 'DELETE_CELL': {
      const { cellKey, filledCount } = action.payload;
      const sel = state.selectedCell;
      const newBoard = state.board.map(r => r.map(c => ({ ...c })));
      if (sel) {
        newBoard[sel.row][sel.col].currentValue = null;
      }
      const newTiles = state.charTiles.map(t =>
        t.cellRef === cellKey ? { ...t, used: false, cellRef: null } : t,
      );
      const newWrongCells = new Set(state.wrongCells);
      newWrongCells.delete(cellKey);
      return {
        ...state,
        board: newBoard,
        charTiles: newTiles,
        filledCount,
        wrongCells: newWrongCells,
      };
    }

    case 'CLEAR_ALL': {
      const { filledCount } = action.payload;
      const newBoard = state.board.map(r => r.map(c => ({
        ...c,
        currentValue: (c.isActive && !c.isPreset) ? null : c.currentValue,
      })));
      const newTiles = state.charTiles.map(t => ({ ...t, used: false, cellRef: null }));
      return {
        ...state,
        board: newBoard,
        charTiles: newTiles,
        filledCount,
        selectedCell: null,
        wrongCells: new Set(),
      };
    }

    case 'SET_CHECKING':
      return { ...state, phase: 'checking', wrongCells: action.payload.wrongCells };

    case 'SET_COMPLETE':
      return { ...state, phase: 'complete' };

    case 'SET_PLAYING':
      return { ...state, phase: 'playing' };

    case 'REMOVE_WRONG_CELL': {
      const next = new Set(state.wrongCells);
      next.delete(action.payload.cellKey);
      return { ...state, wrongCells: next };
    }

    case 'TOGGLE_HINT':
      return {
        ...state,
        hintVisible: !state.hintVisible,
        expandedIdiomId: null,
      };

    case 'TOGGLE_IDIOM_DETAIL':
      return {
        ...state,
        expandedIdiomId: state.expandedIdiomId === action.payload ? null : action.payload,
      };

    default:
      return state;
  }
}

export function useChainState() {
  const [state, dispatch] = useReducer(chainReducer, initialState);
  const boardRef = useRef<Cell[][]>([]);
  useEffect(() => { boardRef.current = state.board; }, [state.board]);

  const loadLevel = useCallback((lvl: number) => {
    dispatch({ type: 'START_GENERATING' });
    const doGenerate = () => {
      if (!isDbReady()) {
        idiomDbReady.then(() => {
          requestAnimationFrame(doGenerate);
        });
        return;
      }
      const idiomCount = Math.min(5 + Math.floor((lvl - 1) / 3), 8);
      const levelData = generateLevel(lvl, idiomCount, 12, 12, 100);
      if (!levelData) {
        if (lvl <= 1) {
          dispatch({ type: 'GENERATE_ERROR' });
          return;
        }
        loadLevel(lvl - 1);
        return;
      }
      const newBoard = buildBoardFromLevel(levelData);
      const newTiles = createCharTiles(levelData.charBank);
      dispatch({
        type: 'LEVEL_LOADED',
        payload: {
          level: levelData,
          board: newBoard,
          charTiles: newTiles,
          levelNumber: lvl,
          filledCount: countFilledCells(newBoard),
          totalActive: countActiveCells(newBoard),
        },
      });
    };
    requestAnimationFrame(doGenerate);
  }, []);

  return { state, dispatch, boardRef, loadLevel };
}
