import { useState } from 'react';
import type { FC } from 'react';

/**
 * Shared presentational detail list for both v1 and v2 "陌生/已會成語" screens.
 * Each version maps its own data into the common `DetailItem` shape; an optional
 * `levelLabel` renders the v2 cross-level pill.
 */
export type DetailItem = {
  id: string;
  text: string;
  usage: string;
  levelLabel?: string;
};

type Props = {
  title: string;
  emptyMessage: string;
  tagClass: string;
  items: DetailItem[];
  onBack: () => void;
  onRemove: (id: string) => void;
};

const IdiomDetailView: FC<Props> = ({ title, emptyMessage, tagClass, items, onBack, onRemove }) => {
  const [expandedIdiom, setExpandedIdiom] = useState<string | null>(null);

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
          <p>{emptyMessage}</p>
        </div>
      ) : (
        <div className="idiom-cards">
          {items.map(item => (
            <div key={item.id} className={`idiom-card ${tagClass}`}>
              <div className="idiom-card-header">
                <button className="idiom-card-text" type="button" onClick={() => toggleExpand(item.id)}>
                  {item.text}
                  {item.levelLabel && (
                    <span className="pill" style={{ marginLeft: '0.5rem', fontSize: '0.75rem' }}>
                      {item.levelLabel}
                    </span>
                  )}
                  <span className="idiom-card-expand">{expandedIdiom === item.id ? '▲' : '▼'}</span>
                </button>
                <button className="idiom-card-remove" type="button" onClick={() => onRemove(item.id)} title="移除">✕</button>
              </div>
              {expandedIdiom === item.id && (
                <div className="idiom-card-body">
                  <div className="idiom-card-usage">
                    <span className="section-label">用法說明</span>
                    <p>{item.usage}</p>
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

export default IdiomDetailView;
