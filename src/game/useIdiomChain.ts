import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChallengeLevelRecord, ChainMode, Direction, LevelData } from '../types/game';
import {
  isBoardComplete, isBoardCorrect, getWrongCells, getCellKey,
  findTileByCellRef, countFilledCells,
} from '../game/boardUtils';
import { CHAIN_CONFIG } from './chainConfig';
import {
  buildHighlightedCellKeys,
  getDefaultDirectionForCell,
  getIdiomForDirection,
  getIdiomsAtCell,
} from './chainSelection';
import { useChainState } from './useChainState';
import { generateRandomChainLevelWithSeed } from './chainLevelSources';

type UseIdiomChainOptions = {
  mode: ChainMode;
  challengeLevels?: ChallengeLevelRecord[];
  initialLevelNumber?: number;
  sessionKey?: number;
  maxLevelNumber?: number;
  onLevelComplete?: (levelNumber: number) => void;
};

export function useIdiomChain({
  mode,
  challengeLevels,
  initialLevelNumber = 1,
  sessionKey = 0,
  maxLevelNumber,
  onLevelComplete,
}: UseIdiomChainOptions) {
  const [selectedDirectionPreference, setSelectedDirectionPreference] = useState<{
    cellKey: string;
    direction: Direction;
  } | null>(null);

  const getLevelData = useCallback((levelNumber: number, seed?: number): { level: LevelData | null; seed: number | null } => {
    if (mode === 'challenge') {
      const level = challengeLevels?.[levelNumber - 1]?.level ?? null;
      return { level, seed: null };
    }
    const result = generateRandomChainLevelWithSeed(levelNumber, seed ?? undefined);
    if (result) {
      return { level: result.level, seed: result.seed };
    }
    return { level: null, seed: null };
  }, [challengeLevels, mode]);

  const { state, dispatch, boardRef, loadLevel, lastSeedRef } = useChainState(getLevelData, {
    missingLevelStrategy: mode === 'challenge' ? 'error' : 'retry-current-level',
    maxNullLevelRetries: mode === 'challenge' ? 0 : CHAIN_CONFIG.random.levelRetryCount,
  });
  const initialLoadKey = useMemo(
    () => `${mode}:${initialLevelNumber}:${challengeLevels?.length ?? 0}:${sessionKey}`,
    [challengeLevels?.length, initialLevelNumber, mode, sessionKey],
  );
  const lastInitialLoadKeyRef = useRef<string | null>(null);
  const completedLevelKeyRef = useRef<string | null>(null);
  const selectedCellKey = state.selectedCell ? getCellKey(state.selectedCell.row, state.selectedCell.col) : null;
  const selectedCellIdioms = useMemo(() => {
    if (!state.level || !state.selectedCell) return [];
    return getIdiomsAtCell(state.level.idioms, state.selectedCell.row, state.selectedCell.col);
  }, [state.level, state.selectedCell]);
  const selectedDirection = useMemo(() => {
    if (selectedCellIdioms.length === 0) return null;
    if (
      selectedCellKey
      && selectedDirectionPreference?.cellKey === selectedCellKey
      && selectedCellIdioms.some((idiom) => idiom.direction === selectedDirectionPreference.direction)
    ) {
      return selectedDirectionPreference.direction;
    }
    return getDefaultDirectionForCell(selectedCellIdioms);
  }, [selectedCellIdioms, selectedCellKey, selectedDirectionPreference]);
  const selectedIdiom = useMemo(
    () => (mode !== 'legacy' ? getIdiomForDirection(selectedCellIdioms, selectedDirection) : null),
    [mode, selectedCellIdioms, selectedDirection],
  );
  const highlightedCellKeys = useMemo(
    () => (mode !== 'legacy' ? buildHighlightedCellKeys(selectedIdiom) : new Set<string>()),
    [mode, selectedIdiom],
  );

  const onCellClick = useCallback((row: number, col: number) => {
    if (state.phase !== 'playing' && state.phase !== 'checking') return;
    const cell = state.board[row]?.[col];
    if (!cell || !cell.isActive) return;
    if (state.selectedCell && state.selectedCell.row === row && state.selectedCell.col === col) {
      if (mode !== 'legacy' && state.level) {
        const idiomsAtCell = getIdiomsAtCell(state.level.idioms, row, col);
        const hasHorizontal = idiomsAtCell.some((idiom) => idiom.direction === 'horizontal');
        const hasVertical = idiomsAtCell.some((idiom) => idiom.direction === 'vertical');
        if (hasHorizontal && hasVertical) {
          const cellKey = getCellKey(row, col);
          const currentDirection = (
            selectedDirectionPreference?.cellKey === cellKey
              ? selectedDirectionPreference.direction
              : getDefaultDirectionForCell(idiomsAtCell)
          ) ?? 'horizontal';
          setSelectedDirectionPreference({
            cellKey,
            direction: currentDirection === 'horizontal' ? 'vertical' : 'horizontal',
          });
          return;
        }
        return;
      }
      dispatch({ type: 'SELECT_CELL', payload: null });
      return;
    }
    setSelectedDirectionPreference(null);
    dispatch({ type: 'SELECT_CELL', payload: { row, col } });
  }, [mode, state.board, state.level, state.selectedCell, state.phase, dispatch, selectedDirectionPreference]);

  const onTileClick = useCallback((tileId: string) => {
    if ((state.phase !== 'playing' && state.phase !== 'checking') || !state.selectedCell) return;
    const tile = state.charTiles.find(t => t.id === tileId);
    if (!tile || tile.used) return;
    const targetCell = state.board[state.selectedCell.row][state.selectedCell.col];
    if (targetCell.isPreset) return;
    const cellKey = getCellKey(state.selectedCell.row, state.selectedCell.col);

    let prevTileId: string | null = null;
    if (targetCell.currentValue !== null) {
      const prevTile = findTileByCellRef(state.charTiles, cellKey);
      if (prevTile) prevTileId = prevTile.id;
    }

    const newBoard = state.board.map(r => r.map(c => ({ ...c })));
    newBoard[state.selectedCell.row][state.selectedCell.col].currentValue = tile.value;
    const filledCount = countFilledCells(newBoard);

    let nextRow = state.selectedCell.row;
    let nextCol = state.selectedCell.col + 1;
    if (nextCol >= (state.board[0]?.length ?? 0)) {
      nextCol = 0;
      nextRow++;
    }
    let nextSelectedCell: { row: number; col: number } | null = null;
    if (nextRow < state.board.length) {
      for (let r = nextRow; r < state.board.length; r++) {
        const startC = r === nextRow ? nextCol : 0;
        for (let c = startC; c < state.board[0].length; c++) {
          if (state.board[r][c].isActive && !state.board[r][c].isPreset && state.board[r][c].currentValue === null) {
            nextSelectedCell = { row: r, col: c };
            break;
          }
        }
        if (nextSelectedCell) break;
      }
    }

    dispatch({
      type: 'PLACE_TILE',
      payload: {
        row: state.selectedCell.row,
        col: state.selectedCell.col,
        cellKey,
        value: tile.value,
        tileId,
        prevTileId,
        filledCount,
        nextSelectedCell,
      },
    });
  }, [state.board, state.charTiles, state.selectedCell, state.phase, dispatch]);

  const onDeleteCell = useCallback(() => {
    if ((state.phase !== 'playing' && state.phase !== 'checking') || !state.selectedCell) return;
    const cell = state.board[state.selectedCell.row][state.selectedCell.col];
    if (cell.isPreset || cell.currentValue === null) return;
    const cellKey = getCellKey(state.selectedCell.row, state.selectedCell.col);
    const newBoard = state.board.map(r => r.map(c => ({ ...c })));
    newBoard[state.selectedCell.row][state.selectedCell.col].currentValue = null;
    dispatch({
      type: 'DELETE_CELL',
      payload: { cellKey, filledCount: countFilledCells(newBoard) },
    });
  }, [state.board, state.selectedCell, state.phase, dispatch]);

  const onClearAll = useCallback(() => {
    if (state.phase !== 'playing' && state.phase !== 'checking') return;
    const newBoard = state.board.map(r => r.map(c => ({
      ...c,
      currentValue: (c.isActive && !c.isPreset) ? null : c.currentValue,
    })));
    dispatch({
      type: 'CLEAR_ALL',
      payload: { filledCount: countFilledCells(newBoard) },
    });
  }, [state.board, state.phase, dispatch]);

  const doCheck = useCallback(() => {
    const currentBoard = boardRef.current;
    if (state.phase !== 'playing' || !isBoardComplete(currentBoard)) return;
    if (isBoardCorrect(currentBoard)) {
      dispatch({ type: 'SET_COMPLETE' });
    } else {
      const wrong = getWrongCells(currentBoard);
      dispatch({ type: 'SET_CHECKING', payload: { wrongCells: new Set(wrong.map(w => getCellKey(w.row, w.col))) } });
    }
  }, [state.phase, boardRef, dispatch]);

  useEffect(() => {
    if (state.phase === 'playing' && isBoardComplete(boardRef.current)) {
      doCheck();
    }
  }, [state.filledCount, state.phase, doCheck, boardRef]);

  useEffect(() => {
    if (state.phase === 'checking' && state.wrongCells.size === 0 && isBoardComplete(boardRef.current)) {
      if (isBoardCorrect(boardRef.current)) {
        dispatch({ type: 'SET_COMPLETE' });
      } else {
        dispatch({ type: 'SET_PLAYING' });
      }
    }
  }, [state.wrongCells, state.phase, boardRef, dispatch]);

  useEffect(() => {
    if (mode === 'challenge' && (!challengeLevels || challengeLevels.length === 0)) {
      return;
    }
    if (lastInitialLoadKeyRef.current === initialLoadKey) {
      return;
    }
    lastInitialLoadKeyRef.current = initialLoadKey;
    loadLevel(initialLevelNumber);
  }, [challengeLevels, initialLevelNumber, initialLoadKey, loadLevel, mode]);

  useEffect(() => {
    if (state.phase !== 'complete' || !state.level) {
      return;
    }
    const completionKey = `${mode}:${state.levelNumber}:${state.level.id}`;
    if (completedLevelKeyRef.current === completionKey) {
      return;
    }
    completedLevelKeyRef.current = completionKey;
    onLevelComplete?.(state.levelNumber);
  }, [mode, onLevelComplete, state.level, state.levelNumber, state.phase]);

  const hasNextLevel = maxLevelNumber === undefined || state.levelNumber < maxLevelNumber;

  const goToNextLevel = useCallback(() => {
    const nextLevelNumber = maxLevelNumber === undefined
      ? state.levelNumber + 1
      : Math.min(maxLevelNumber, state.levelNumber + 1);
    if (nextLevelNumber === state.levelNumber && maxLevelNumber !== undefined) {
      return;
    }
    loadLevel(nextLevelNumber);
  }, [loadLevel, maxLevelNumber, state.levelNumber]);
  const onNextLevel = goToNextLevel;
  const onSkipLevel = goToNextLevel;
  const onRestart = useCallback(() => {
    const cachedSeed = lastSeedRef.current;
    if (cachedSeed !== null) {
      loadLevel(state.levelNumber, cachedSeed);
    } else {
      loadLevel(state.levelNumber);
    }
  }, [state.levelNumber, loadLevel, lastSeedRef]);
  const onToggleHint = useCallback(() => dispatch({ type: 'TOGGLE_HINT' }), [dispatch]);
  const onToggleIdiomDetail = useCallback((id: string) => dispatch({ type: 'TOGGLE_IDIOM_DETAIL', payload: id }), [dispatch]);
  const onRevealAnswer = useCallback(() => dispatch({ type: 'REVEAL_ANSWER' }), [dispatch]);

  const canDeleteCell = state.selectedCell !== null
    && (state.phase === 'playing' || state.phase === 'checking')
    && state.board[state.selectedCell.row]?.[state.selectedCell.col]?.currentValue !== null
    && !state.board[state.selectedCell.row]?.[state.selectedCell.col]?.isPreset;

  return {
    level: state.level,
    board: state.board,
    charTiles: state.charTiles,
    selectedCell: state.selectedCell,
    selectedDirection,
    selectedIdiom,
    highlightedCellKeys,
    levelNumber: state.levelNumber,
    phase: state.phase,
    wrongCells: state.wrongCells,
    filledCount: state.filledCount,
    totalActive: state.totalActive,
    hintVisible: state.hintVisible,
    expandedIdiomId: state.expandedIdiomId,
    answerVisible: state.answerVisible,
    hasNextLevel,
    canDeleteCell,
    onCellClick,
    onTileClick,
    onDeleteCell,
    onClearAll,
    onNextLevel,
    onSkipLevel,
    onRestart,
    onToggleHint,
    onToggleIdiomDetail,
    onRevealAnswer,
  };
}
