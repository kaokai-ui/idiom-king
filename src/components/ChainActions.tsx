import type { FC } from 'react';
import type { ChainPhase } from '../types/chain';

type Props = {
  phase: ChainPhase;
  canDeleteCell: boolean;
  onDeleteCell: () => void;
  onClearAll: () => void;
  onNextLevel: () => void;
  onRestart: () => void;
  developerMode: boolean;
  onSkipLevel: () => void;
};

const ChainActions: FC<Props> = ({ phase, canDeleteCell, onDeleteCell, onClearAll, onNextLevel, onRestart, developerMode, onSkipLevel }) => (
  <div className="action-buttons">
  {(phase === 'playing' || phase === 'checking') && (
    <>
      {phase === 'checking' && <div className="checking-msg">有錯誤，請點選紅色格子修正！</div>}
      <div className="action-row">
        <button className="btn-icon btn-icon--danger" onClick={onDeleteCell} disabled={!canDeleteCell} title="刪除選取的字">✕</button>
        <button className="btn btn-secondary" onClick={onClearAll}>全部清除</button>
        {developerMode && <button className="btn btn-skip" onClick={onSkipLevel} title="跳下一關">跳關</button>}
      </div>
    </>
  )}
    {phase === 'complete' && (
      <>
        <div className="complete-msg">過關成功！</div>
        <div className="action-row">
          <button className="btn btn-secondary" onClick={onRestart}>重新挑戰</button>
          <button className="btn btn-primary" onClick={onNextLevel}>下一關 →</button>
        </div>
      </>
    )}
  </div>
);

export default ChainActions;
