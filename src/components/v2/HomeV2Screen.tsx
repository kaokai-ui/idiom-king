import type { FC } from 'react';
import type { IdiomV2Settings, IdiomLevel } from '../../types/idiomV2';
import { IDIOM_LEVELS, IDIOM_LEVEL_LABELS } from '../../constants/idiomLevels';

type Props = {
  totalCount: number;
  masteredCount: number;
  unfamiliarCount: number;
  progressRate: number;
  starredIds: string[];
  knownIds: string[];
  settings: IdiomV2Settings;
  activeLevel: IdiomLevel;
  activeLevelLabel: string;
  onStartRandomFlashcards: () => void;
  onStartUnfamiliarFlashcards: () => void;
  onOpenIdiomChainLevelChallenge: () => void;
  onOpenIdiomChainChallenge: () => void;
  onOpenIdiomCloze: () => void;
  onOpenDetail: (view: 'unfamiliar' | 'mastered') => void;
  onToggleSetting: (key: keyof Omit<IdiomV2Settings, 'idiomLevel'>) => void;
  onSetIdiomLevel: (level: IdiomLevel) => void;
};

const HomeV2Screen: FC<Props> = ({
  totalCount,
  masteredCount,
  unfamiliarCount,
  progressRate,
  starredIds,
  knownIds,
  settings,
  activeLevel,
  activeLevelLabel,
  onStartRandomFlashcards,
  onStartUnfamiliarFlashcards,
  onOpenIdiomChainLevelChallenge,
  onOpenIdiomChainChallenge,
  onOpenIdiomCloze,
  onOpenDetail,
  onToggleSetting,
  onSetIdiomLevel,
}) => {
  const logoSrc = `${import.meta.env.BASE_URL}idiom2Home.webp`;

  return (
    <main className="page-shell app-shell">
      <section className="hero-panel">
        <img className="hero-logo" src={logoSrc} alt="成語王2首頁標誌" />
        <div className="level-segmented-control">
          {IDIOM_LEVELS.map(level => (
            <button
              key={level}
              type="button"
              className={`segmented-btn${activeLevel === level ? ' segmented-btn--active' : ''}`}
              onClick={() => onSetIdiomLevel(level)}
            >
              {IDIOM_LEVEL_LABELS[level]}
            </button>
          ))}
        </div>
        <div className="hero-stats hero-stats--4col">
          <div className="metric-card">
            <span>成語等級</span>
            <strong>{activeLevelLabel}</strong>
          </div>
          <div className="metric-card">
            <span>成語總數</span>
            <strong>{totalCount}</strong>
          </div>
          <div className="metric-card metric-card--green">
            <span>已掌握</span>
            <strong>{masteredCount}</strong>
          </div>
          <div className="metric-card metric-card--red">
            <span>待加強</span>
            <strong>{unfamiliarCount}</strong>
          </div>
        </div>
      </section>

      <section className="home-grid">
        <button className="feature-card feature-card--flashcard" type="button" onClick={onStartRandomFlashcards}>
          <span className="card-icon" aria-hidden="true">🎴</span>
          <h2>隨機成語卡</h2>
          <p>快速複習常見成語</p>
        </button>
        <button className="feature-card feature-card--unfamiliar" type="button" onClick={onStartUnfamiliarFlashcards}>
          <span className="card-icon" aria-hidden="true">📝</span>
          <h2>陌生成語卡</h2>
          <p>集中練習待加強項目</p>
        </button>
        <button className="feature-card feature-card--chain-mode-test" type="button" onClick={onOpenIdiomChainLevelChallenge}>
          <span className="card-icon" aria-hidden="true">🧭</span>
          <h2>成語接龍</h2>
          <p className="feature-card-subtitle">（隨機模式）</p>
        </button>
        <button className="feature-card feature-card--chain-challenge" type="button" onClick={onOpenIdiomChainChallenge}>
          <span className="card-icon" aria-hidden="true">🏆</span>
          <h2>成語接龍</h2>
          <p className="feature-card-subtitle">（不分程度挑戰模式）</p>
        </button>
        <button className="feature-card feature-card--cloze" type="button" onClick={onOpenIdiomCloze}>
          <span className="card-icon" aria-hidden="true">🧩</span>
          <h2>成語填空</h2>
          <p>練習上下文辨識能力</p>
        </button>
      </section>

      <div className="summary-cards">
        <button
          className="summary-card summary-card--unfamiliar"
          type="button"
          onClick={() => onOpenDetail('unfamiliar')}
        >
          <div className="summary-card-icon" aria-hidden="true">⭐</div>
          <div className="summary-card-info">
            <span className="summary-card-label">待加強成語</span>
            <strong className="summary-card-count">{starredIds.length}</strong>
          </div>
          <span className="summary-card-arrow">→</span>
        </button>

        <button
          className="summary-card summary-card--mastered"
          type="button"
          onClick={() => onOpenDetail('mastered')}
        >
          <div className="summary-card-icon" aria-hidden="true">✅</div>
          <div className="summary-card-info">
            <span className="summary-card-label">已掌握成語</span>
            <strong className="summary-card-count">{knownIds.length}</strong>
          </div>
          <span className="summary-card-arrow">→</span>
        </button>
      </div>

      <section className="home-section">
        <div className="section-header">
          <span>學習進度</span>
        </div>
        <div className="section-body">
          <div className="progress-bar-track">
            <div className="progress-bar-fill" style={{ width: `${progressRate}%` }} />
          </div>
          <p className="progress-text">已掌握 {masteredCount} / {totalCount}，完成度 {progressRate}%</p>
        </div>
      </section>

      <section className="home-section">
        <div className="section-header">
          <span>顯示設定</span>
        </div>
        <div className="section-body">
          <div className="setting-row">
            <span className="setting-label">自動顯示注音</span>
            <button
              type="button"
              className={`toggle-switch${settings.autoShowBopomofo ? ' on' : ''}`}
              onClick={() => onToggleSetting('autoShowBopomofo')}
            />
          </div>
          <div className="setting-row">
            <span className="setting-label">自動顯示用法</span>
            <button
              type="button"
              className={`toggle-switch${settings.autoShowUsage ? ' on' : ''}`}
              onClick={() => onToggleSetting('autoShowUsage')}
            />
          </div>
      {import.meta.env.DEV && (
        <div className="setting-row">
          <span className="setting-label">開發者模式</span>
          <button
            type="button"
            className={`toggle-switch${settings.developerMode ? ' on' : ''}`}
            onClick={() => onToggleSetting('developerMode')}
          />
        </div>
      )}
        </div>
      </section>
    </main>
  );
};

export default HomeV2Screen;
