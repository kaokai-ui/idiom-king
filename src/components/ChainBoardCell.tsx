import { memo } from 'react';
import type { FC } from 'react';
import type { Cell } from '../types/game';
import type { ChainPhase } from '../types/chain';

type Props = {
  cell: Cell;
  row: number;
  col: number;
  isSelected: boolean;
  isLineHighlighted: boolean;
  isWrong: boolean;
  phase: ChainPhase;
  onClick: (row: number, col: number) => void;
};

const ChainBoardCell: FC<Props> = memo(({ cell, row, col, isSelected, isLineHighlighted, isWrong, phase, onClick }) => {
  if (!cell.isActive) return <div className="board-cell disabled" />;

  const canInteract = phase === 'playing' || phase === 'checking';
  let className = 'board-cell active';
  if (cell.isPreset) className += ' preset';
  if (isLineHighlighted) className += ' line-highlighted';
  if (isSelected && !cell.isPreset && canInteract) className += ' selected';
  if (isWrong) className += ' wrong';
  if (phase === 'complete' && cell.currentValue !== null && cell.currentValue === cell.answer) className += ' correct';

  const handleActivate = canInteract ? () => onClick(row, col) : undefined;

  return (
    <div
      className={className}
      onClick={handleActivate}
      role={canInteract ? 'button' : undefined}
      tabIndex={canInteract ? 0 : undefined}
      aria-pressed={canInteract ? isSelected : undefined}
      onKeyDown={
        handleActivate
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleActivate();
              }
            }
          : undefined
      }
    >
      <span className="cell-text">{cell.currentValue || ''}</span>
    </div>
  );
});

export default ChainBoardCell;
