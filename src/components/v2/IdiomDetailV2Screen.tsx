import { useState } from 'react';
import type { FC } from 'react';
import type { IdiomV2Entry, IdiomV2StarredEntry } from '../../types/idiomV2';
import { IDIOM_LEVEL_LABELS } from '../../constants/idiomLevels';

type Props = {
  detailView: 'unfamiliar' | 'mastered';
  starredIdioms: IdiomV2StarredEntry[];
  knownIdioms: IdiomV2Entry[];
  onBack: () => void;
  onRemoveFromStarred: (id: string) => void;
  onRemoveKnown: (id: string) => void;
};

const IdiomDetailV2Screen: FC<Props> = ({
  detailView,
  starredIdioms,
  knownIdioms,
  onBack,
  onRemoveFromStarred,
  onRemoveKnown,
}) => {
  const [expandedIdiom, setExpandedIdiom] = useState<string | null>(null);

  const title = detailView === 'unfamiliar' ? '陌生成語' : '已會成語';
  const tagClass = detailView === 'unfamiliar' ? 'idiom-card--starred' : 'idiom-card--known';

  const toggleExpand = (id: string) => {
    setExpandedIdiom(prev => prev === id ? null : id);
  };

  return (
    <main className="page-shell app-shell">
      <div className="detail-header">
        <button className="detail-back-btn" type="button" onClick={onBack}>← 返回主畫面</button>
        <h2 className="detail-title">{title}</h2>
        <span className="detail-count">
          {detailView === 'unfamiliar' ? starredIdioms.length : knownIdioms.length} 個
        </span>
      </div>
      {detailView === 'unfamiliar' ? (
        starredIdioms.length === 0 ? (
          <div className="detail-empty">
            <p>尚無陌生成語，在閃卡練習中點選「加入生詞表」即可新增</p>
          </div>
        ) : (
          <div className="idiom-cards">
            {starredIdioms.map(entry => (
              <div key={entry.id} className={`idiom-card ${tagClass}`}>
                <div className="idiom-card-header">
                  <button className="idiom-card-text" type="button" onClick={() => toggleExpand(entry.id)}>
                    {entry.text}
                    <span className="pill" style={{ marginLeft: '0.5rem', fontSize: '0.75rem' }}>
                      {entry.levelLabel || IDIOM_LEVEL_LABELS[entry.level]}
                    </span>
                    <span className="idiom-card-expand">{expandedIdiom === entry.id ? '▲' : '▼'}</span>
                  </button>
                  <button className="idiom-card-remove" type="button" onClick={() => onRemoveFromStarred(entry.id)} title="移除">✕</button>
                </div>
                {expandedIdiom === entry.id && (
                  <div className="idiom-card-body">
                    <div className="idiom-card-usage">
                      <span className="section-label">用法說明</span>
                      <p>{entry.usage}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      ) : (
        knownIdioms.length === 0 ? (
          <div className="detail-empty">
            <p>尚無已會成語，在閃卡練習中點選「加入已會」即可新增</p>
          </div>
        ) : (
          <div className="idiom-cards">
            {knownIdioms.map(entry => (
              <div key={entry.id} className={`idiom-card ${tagClass}`}>
                <div className="idiom-card-header">
                  <button className="idiom-card-text" type="button" onClick={() => toggleExpand(entry.id)}>
                    {entry.text}
                    <span className="idiom-card-expand">{expandedIdiom === entry.id ? '▲' : '▼'}</span>
                  </button>
                  <button className="idiom-card-remove" type="button" onClick={() => onRemoveKnown(entry.id)} title="移除">✕</button>
                </div>
                {expandedIdiom === entry.id && (
                  <div className="idiom-card-body">
                    <div className="idiom-card-usage">
                      <span className="section-label">用法說明</span>
                      <p>{entry.usage}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}
    </main>
  );
};

export default IdiomDetailV2Screen;
