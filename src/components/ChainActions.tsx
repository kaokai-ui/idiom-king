import type { FC } from 'react';
import type { ChainPhase } from '../types/chain';

type Props = {
  phase: ChainPhase;
  canDeleteCell: boolean;
  onDeleteCell: () => void;
  onClearAll: () => void;
  onNextLevel: () => void;
  onRestart: () => void;
  hasNextLevel: boolean;
  nextLevelLabel?: string;
  developerMode: boolean;
  onSkipLevel: () => void;
};

const ChainActions: FC<Props> = ({
  phase,
  canDeleteCell,
  onDeleteCell,
  onClearAll,
  onNextLevel,
  onRestart,
  hasNextLevel,
  nextLevelLabel = '下一關',
  developerMode,
  onSkipLevel,
}) => (
  <div className="action-buttons">
    {(phase === 'playing' || phase === 'checking') && (
      <>
        {phase === 'checking' && <div className="checking-msg">順序還沒完全正確，請調整紅框或錯誤的字。</div>}
        <div className="action-row">
          <button className="btn-icon btn-icon--danger" onClick={onDeleteCell} disabled={!canDeleteCell} title="清除目前選取的格子">×</button>
          <button className="btn btn-secondary" onClick={onClearAll}>全部清除</button>
          {developerMode && <button className="btn btn-skip" onClick={onSkipLevel} title="跳到下一關">跳關</button>}
        </div>
      </>
    )}
    {phase === 'complete' && (
      <>
        <div className="complete-msg">過關完成！</div>
        <div className="action-row">
          <button className="btn btn-secondary" onClick={onRestart}>重新挑戰</button>
          <button className="btn btn-primary" onClick={onNextLevel} disabled={!hasNextLevel}>{nextLevelLabel}</button>
        </div>
      </>
    )}
  </div>
);

export default ChainActions;
