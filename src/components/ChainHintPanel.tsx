import type { FC } from 'react';
import type { ChainMode, Direction, PlacedIdiom } from '../types/game';
import { idiomsById } from '../data/idiomDb';

type Props = {
  mode: ChainMode;
  idioms: PlacedIdiom[];
  selectedIdiom: PlacedIdiom | null;
  selectedDirection: Direction | null;
  hintVisible: boolean;
  expandedIdiomId: string | null;
  answerVisible: boolean;
  onToggleHint: () => void;
  onToggleIdiomDetail: (id: string) => void;
  onRevealAnswer: () => void;
  onToggleStarred?: (id: string) => void;
  isStarred?: (id: string) => boolean;
};

const ChainHintPanel: FC<Props> = ({
  mode,
  idioms,
  selectedIdiom,
  selectedDirection,
  hintVisible,
  expandedIdiomId,
  answerVisible,
  onToggleHint,
  onToggleIdiomDetail,
  onRevealAnswer,
  onToggleStarred,
  isStarred,
}) => {
  if (mode === 'random' || mode === 'challenge') {
    const entry = selectedIdiom ? idiomsById[selectedIdiom.id] : null;
    const starred = selectedIdiom && isStarred ? isStarred(selectedIdiom.id) : false;
    const idiomId = selectedIdiom?.id;
    return (
      <div className="hint-panel">
        <button className="hint-toggle-btn" onClick={onToggleHint}>
          <span className="hint-icon">{hintVisible ? '📖' : '💡'}</span>
          <span className="hint-toggle-text">{hintVisible ? '隱藏提示' : '顯示提示'}</span>
        </button>
        {hintVisible && (
          <div className="hint-content hint-content--focused">
            {entry && idiomId ? (
              <div className="hint-focused-card">
                <div className="hint-focused-label-row">
                  <p className="hint-focused-label">{selectedDirection === 'vertical' ? '直向用法提示' : '橫向用法提示'}</p>
                  <span className="hint-action-btns">
                    {onToggleStarred && (
                      <button
                        className={`hint-action-btn${starred ? ' hint-action-btn--active' : ''}`}
                        onClick={() => onToggleStarred(idiomId)}
                      >
                        {starred ? '已加生字' : '+生字'}
                      </button>
                    )}
                    {mode === 'random' && !answerVisible && (
                      <button className="hint-action-btn hint-action-btn--reveal" onClick={onRevealAnswer}>
                        看答案
                      </button>
                    )}
                  </span>
                </div>
                <p className="hint-focused-usage">{entry.usage || '這條成語目前沒有可顯示的用法說明。'}</p>
                {mode === 'random' && answerVisible && (
                  <p className="hint-focused-answer">{entry.text}</p>
                )}
              </div>
            ) : (
              <p className="hint-empty-msg">請先選擇一個單字，再查看該行成語的用法說明。</p>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
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
};

export default ChainHintPanel;
