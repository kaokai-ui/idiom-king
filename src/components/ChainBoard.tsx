import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { FC } from 'react';
import type { Cell } from '../types/game';
import type { ChainPhase } from '../types/chain';
import ChainBoardCellComp from './ChainBoardCell';

type Props = {
  board: Cell[][];
  selectedCell: { row: number; col: number } | null;
  highlightedCellKeys?: Set<string>;
  wrongCells: Set<string>;
  phase: ChainPhase;
  onCellClick: (row: number, col: number) => void;
  onSkipLevel: () => void;
  canSkipLevel?: boolean;
  onBoardOverflowChange?: (tooSmall: boolean) => void;
};

const MIN_CELL = 28;
const GAP = 2;
const BOARD_PAD = 6;
const BOARD_BORDER = 1;
const GAME_PAD = 8;
const MAX_PAGE_WIDTH = 430;
const OVERFLOW_SETTLE_MS = 160;

function calcCellSize(cols: number, rows: number, containerW: number, containerH: number): number {
  const innerW = Math.max(containerW - BOARD_BORDER * 2 - BOARD_PAD * 2 - GAP * (cols - 1), 0);
  const innerH = Math.max(containerH - BOARD_BORDER * 2 - BOARD_PAD * 2 - GAP * (rows - 1), 0);
  const fromW = innerW / cols;
  const fromH = innerH / rows;
  return Math.min(fromW, fromH);
}

function getFallbackContainerSize() {
  return {
    w: Math.max(Math.min(window.innerWidth, MAX_PAGE_WIDTH) - GAME_PAD * 2, 0),
    h: Math.max(window.innerHeight * 0.55, 0),
  };
}

function getContainerSize(element: HTMLDivElement | null) {
  const fallback = getFallbackContainerSize();
  if (!element) {
    return fallback;
  }
  return {
    w: element.clientWidth || fallback.w,
    h: element.clientHeight || fallback.h,
  };
}

const ChainBoard: FC<Props> = ({ board, selectedCell, highlightedCellKeys, wrongCells, phase, onCellClick, onSkipLevel, canSkipLevel = true, onBoardOverflowChange }) => {
  const cols = board[0]?.length || 1;
  const rows = board.length || 1;
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [containerSize, setContainerSize] = useState(getFallbackContainerSize);
  const syncContainerSize = useCallback(() => {
    setContainerSize(getContainerSize(containerRef.current));
  }, []);

  useLayoutEffect(() => {
    syncContainerSize();
    const element = containerRef.current;
    if (!element) {
      return;
    }

    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => syncContainerSize())
      : null;
    resizeObserver?.observe(element);
    window.addEventListener('resize', syncContainerSize);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', syncContainerSize);
    };
  }, [syncContainerSize]);

  const { cellSize, fontSize, tooSmall } = useMemo(() => {
    const maxW = containerSize.w;
    const maxH = containerSize.h;
    const raw = calcCellSize(cols, rows, maxW, maxH);
    const tooSmall = !Number.isFinite(raw) || raw < MIN_CELL;
    const cellSize = tooSmall ? MIN_CELL : Math.floor(raw);
    const fontSize = cellSize <= 32 ? 13 : cellSize <= 38 ? 14 : cellSize <= 44 ? 16 : 18;
    return { cellSize, fontSize, tooSmall };
  }, [cols, rows, containerSize]);
  const [stableTooSmall, setStableTooSmall] = useState(false);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setStableTooSmall(tooSmall);
    }, tooSmall ? OVERFLOW_SETTLE_MS : 0);

    return () => window.clearTimeout(timerId);
  }, [tooSmall]);

  useEffect(() => {
    onBoardOverflowChange?.(stableTooSmall);
  }, [stableTooSmall, onBoardOverflowChange]);

  return (
    <div
      ref={containerRef}
      className={`board-container${stableTooSmall ? ' board-container--overflow' : ''}`}
    >
      {stableTooSmall ? (
        <>
        <p className="board-overflow-msg">此關卡棋盤過大，請跳過</p>
        <button className="btn btn-skip" onClick={onSkipLevel} disabled={!canSkipLevel}>跳過</button>
        </>
      ) : (
        <div
          className="board"
          style={{
            gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
            gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
            '--cell-size': `${cellSize}px`,
            '--cell-font': `${fontSize}px`,
          } as React.CSSProperties}
        >
          {board.map((row, r) =>
            row.map((cell, c) => (
              <ChainBoardCellComp
                key={`${r}-${c}`}
                cell={cell}
                isSelected={selectedCell?.row === r && selectedCell?.col === c}
                isLineHighlighted={highlightedCellKeys?.has(`${r}-${c}`) ?? false}
                isWrong={wrongCells.has(`${r}-${c}`)}
                phase={phase}
                onClick={() => onCellClick(r, c)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default ChainBoard;
