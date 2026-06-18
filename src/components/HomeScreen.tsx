import type { FC } from 'react';
import type { AppSettings } from '../types/game';

type Props = {
  totalCount: number;
  masteredCount: number;
  unfamiliarCount: number;
  progressRate: number;
  starredIds: string[];
  knownIds: string[];
  settings: AppSettings;
  onStartRandomFlashcards: () => void;
  onStartUnfamiliarFlashcards: () => void;
  onOpenIdiomChainRandom: () => void;
  onOpenIdiomChainModeTest: () => void;
  onOpenIdiomChainChallenge: () => void;
  onOpenIdiomChainTest: () => void;
  onOpenIdiomCloze: () => void;
  onOpenDetail: (view: 'unfamiliar' | 'mastered') => void;
  onToggleSetting: (key: keyof AppSettings) => void;
};

const HomeScreen: FC<Props> = ({
  totalCount,
  masteredCount,
  unfamiliarCount,
  progressRate,
  starredIds,
  knownIds,
  settings,
  onStartRandomFlashcards,
  onStartUnfamiliarFlashcards,
  onOpenIdiomChainRandom,
  onOpenIdiomChainModeTest,
  onOpenIdiomChainChallenge,
  onOpenIdiomChainTest,
  onOpenIdiomCloze,
  onOpenDetail,
  onToggleSetting,
}) => {
  const logoSrc = `${import.meta.env.BASE_URL}idiomHome.webp`;

  return (
    <main className="page-shell app-shell">
      <section className="hero-panel">
        <img className="hero-logo" src={logoSrc} alt="成語王首頁標誌" />
        <div className="hero-stats">
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
          <h2>隨機單字卡</h2>
          <p>快速複習常見成語</p>
        </button>
        <button className="feature-card feature-card--unfamiliar" type="button" onClick={onStartUnfamiliarFlashcards}>
          <span className="card-icon" aria-hidden="true">📝</span>
          <h2>陌生成語卡</h2>
          <p>集中練習待加強項目</p>
        </button>
        <button className="feature-card feature-card--chain-mode-test" type="button" onClick={onOpenIdiomChainModeTest}>
          <span className="card-icon" aria-hidden="true">🧭</span>
          <h2>成語接龍</h2>
          <p className="feature-card-subtitle">（測試模式）</p>
        </button>
        <button className="feature-card feature-card--chain-challenge" type="button" onClick={onOpenIdiomChainChallenge}>
          <span className="card-icon" aria-hidden="true">🏆</span>
          <h2>成語接龍</h2>
          <p className="feature-card-subtitle">（挑戰模式）</p>
        </button>
        <button className="feature-card feature-card--cloze" type="button" onClick={onOpenIdiomCloze}>
          <span className="card-icon" aria-hidden="true">🧩</span>
          <h2>成語填空</h2>
          <p>練習上下文辨識能力</p>
        </button>
        {settings.developerMode && (
          <button className="feature-card feature-card--chain" type="button" onClick={onOpenIdiomChainRandom}>
            <span className="card-icon" aria-hidden="true">🔀</span>
            <h2>成語接龍</h2>
            <p className="feature-card-subtitle">（舊版隨機）</p>
          </button>
        )}
        {settings.developerMode && (
          <button className="feature-card feature-card--chain-test" type="button" onClick={onOpenIdiomChainTest}>
            <span className="card-icon" aria-hidden="true">🧪</span>
            <h2>接龍測試 50 關</h2>
            <p>快速檢查棋盤重疊問題</p>
          </button>
        )}
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
            <span className="setting-label">自動顯示例句</span>
            <button
              type="button"
              className={`toggle-switch${settings.autoShowUsage ? ' on' : ''}`}
              onClick={() => onToggleSetting('autoShowUsage')}
            />
          </div>
          <div className="setting-row">
            <span className="setting-label">自動顯示解釋</span>
            <button
              type="button"
              className={`toggle-switch${settings.autoShowDefinition ? ' on' : ''}`}
              onClick={() => onToggleSetting('autoShowDefinition')}
            />
          </div>
          <div className="setting-row">
            <span className="setting-label">開發者模式</span>
            <button
              type="button"
              className={`toggle-switch${settings.developerMode ? ' on' : ''}`}
              onClick={() => onToggleSetting('developerMode')}
            />
          </div>
        </div>
      </section>
    </main>
  );
};

export default HomeScreen;
