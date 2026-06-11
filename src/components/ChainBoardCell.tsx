import { memo } from 'react';
import type { FC } from 'react';
import type { Cell } from '../types/game';
import type { ChainPhase } from '../types/chain';

type Props = {
  cell: Cell;
  isSelected: boolean;
  isWrong: boolean;
  phase: ChainPhase;
  onClick: () => void;
};

const ChainBoardCell: FC<Props> = memo(({ cell, isSelected, isWrong, phase, onClick }) => {
  if (!cell.isActive) return <div className="board-cell disabled" />;

  const canInteract = phase === 'playing' || phase === 'checking';
  let className = 'board-cell active';
  if (cell.isPreset) className += ' preset';
  if (isSelected && !cell.isPreset && canInteract) className += ' selected';
  if (isWrong) className += ' wrong';
  if (phase === 'complete' && cell.currentValue !== null && cell.currentValue === cell.answer) className += ' correct';

  return (
    <div className={className} onClick={canInteract ? onClick : undefined}>
      <span className="cell-text">{cell.currentValue || ''}</span>
    </div>
  );
});

export default ChainBoardCell;
