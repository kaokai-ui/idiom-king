import type { FC } from 'react';
import type { PlacedIdiom } from '../types/game';
import { idiomsById } from '../data/idiomDb';

type Props = {
  idioms: PlacedIdiom[];
  hintVisible: boolean;
  expandedIdiomId: string | null;
  onToggleHint: () => void;
  onToggleIdiomDetail: (id: string) => void;
};

const ChainHintPanel: FC<Props> = ({ idioms, hintVisible, expandedIdiomId, onToggleHint, onToggleIdiomDetail }) => (
  <div className="hint-panel">
    <button className="hint-toggle-btn" onClick={onToggleHint}>
      <span className="hint-icon">{hintVisible ? '📖' : '💡'}</span>
      <span className="hint-toggle-text">{hintVisible ? '隱藏提示' : '顯示提示'}</span>
    </button>
    {hintVisible && (
      <div className="hint-content">
        {idioms.map((p) => {
          const entry = idiomsById[p.id];
          const isExpanded = expandedIdiomId === p.id;
          return (
            <div key={p.id} className="hint-idiom-row">
              <button className="hint-idiom-btn" onClick={() => onToggleIdiomDetail(p.id)}>
                <span className="hint-idiom-text">{p.text}</span>
                <span className="hint-expand-icon">{isExpanded ? '▲' : '▼'}</span>
              </button>
              {isExpanded && entry && (
                <div className="hint-idiom-detail">
                  {entry.usage && <p><strong>用法說明：</strong>{entry.usage}</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    )}
  </div>
);

export default ChainHintPanel;
