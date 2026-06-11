import { useState } from 'react';
import type { FC } from 'react';
import type { IdiomEntry } from '../types/game';

type Props = {
  detailView: 'unfamiliar' | 'mastered';
  starredIdioms: IdiomEntry[];
  knownIdioms: IdiomEntry[];
  onBack: () => void;
  onRemove: (type: 'unfamiliar' | 'mastered', id: string) => void;
};

const IdiomDetailScreen: FC<Props> = ({
  detailView,
  starredIdioms,
  knownIdioms,
  onBack,
  onRemove,
}) => {
  const [expandedIdiom, setExpandedIdiom] = useState<string | null>(null);

  const items = detailView === 'unfamiliar' ? starredIdioms : knownIdioms;
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
        <span className="detail-count">{items.length} 個</span>
      </div>
      {items.length === 0 ? (
        <div className="detail-empty">
          <p>{detailView === 'unfamiliar' ? '尚無陌生成語，在閃卡練習中點選「加入生詞表」即可新增' : '尚無已會成語，在閃卡練習中點選「加入已會」即可新增'}</p>
        </div>
      ) : (
        <div className="idiom-cards">
          {items.map(idiom => (
            <div key={idiom.id} className={`idiom-card ${tagClass}`}>
              <div className="idiom-card-header">
                <button className="idiom-card-text" type="button" onClick={() => toggleExpand(idiom.id)}>
                  {idiom.text}
                  <span className="idiom-card-expand">{expandedIdiom === idiom.id ? '▲' : '▼'}</span>
                </button>
                <button className="idiom-card-remove" type="button" onClick={() => onRemove(detailView, idiom.id)} title="移除">✕</button>
              </div>
              {expandedIdiom === idiom.id && (
                <div className="idiom-card-body">
                  <div className="idiom-card-usage">
                    <span className="section-label">用法說明</span>
                    <p>{idiom.usage}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
};

export default IdiomDetailScreen;
