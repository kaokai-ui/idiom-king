import { useMemo } from 'react';
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
  onSkipLevel?: () => void;
};

const MIN_CELL = 28;
const GAP = 2;
const BOARD_PAD = 6;
const BOARD_BORDER = 1;
const GAME_PAD = 8;

function calcCellSize(cols: number, rows: number, containerW: number, containerH: number): number {
  const innerW = containerW - BOARD_BORDER * 2 - BOARD_PAD * 2 - GAP * (cols - 1);
  const innerH = containerH - BOARD_BORDER * 2 - BOARD_PAD * 2 - GAP * (rows - 1);
  const fromW = innerW / cols;
  const fromH = innerH / rows;
  return Math.min(fromW, fromH);
}

const ChainBoard: FC<Props> = ({ board, selectedCell, highlightedCellKeys, wrongCells, phase, onCellClick, onSkipLevel }) => {
  const cols = board[0]?.length || 1;
  const rows = board.length || 1;

  const { cellSize, fontSize, tooSmall } = useMemo(() => {
    const maxW = Math.min(window.innerWidth, 430) - GAME_PAD * 2;
    const maxH = window.innerHeight * 0.55;
    const raw = calcCellSize(cols, rows, maxW, maxH);
    const tooSmall = raw < MIN_CELL;
    const cellSize = tooSmall ? MIN_CELL : Math.floor(raw);
    const fontSize = cellSize <= 32 ? 13 : cellSize <= 38 ? 14 : cellSize <= 44 ? 16 : 18;
    return { cellSize, fontSize, tooSmall };
  }, [cols, rows]);

  if (tooSmall) {
    return (
      <div className="board-container board-container--overflow">
        <p className="board-overflow-msg">此關卡棋盤過大，請跳過</p>
        {onSkipLevel && <button className="btn btn-skip" onClick={onSkipLevel}>跳過</button>}
      </div>
    );
  }

  return (
    <div className="board-container">
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
    </div>
  );
};

export default ChainBoard;
