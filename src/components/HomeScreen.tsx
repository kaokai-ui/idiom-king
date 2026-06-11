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
  onOpenIdiomChain: () => void;
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
  onOpenIdiomChain,
  onOpenIdiomChainTest,
  onOpenIdiomCloze,
  onOpenDetail,
  onToggleSetting,
}) => {
  const logoSrc = `${import.meta.env.BASE_URL}idiomHome.webp`;

  return (
    <main className="page-shell app-shell">
      <section className="hero-panel">
        <img className="hero-logo" src={logoSrc} alt="我是成語王" />
        <div className="hero-stats">
          <div className="metric-card">
            <span>成語典數量</span>
            <strong>{totalCount}</strong>
          </div>
          <div className="metric-card metric-card--green">
            <span>已學會</span>
            <strong>{masteredCount}</strong>
          </div>
          <div className="metric-card metric-card--red">
            <span>陌生成語</span>
            <strong>{unfamiliarCount}</strong>
          </div>
        </div>
      </section>

      <section className="home-grid">
        <button className="feature-card feature-card--flashcard" type="button" onClick={onStartRandomFlashcards}>
          <span className="card-icon">🎴</span>
          <h2>隨機閃卡</h2>
          <p>隨機挑選練習</p>
        </button>
        <button className="feature-card feature-card--unfamiliar" type="button" onClick={onStartUnfamiliarFlashcards}>
          <span className="card-icon">📝</span>
          <h2>陌生閃卡</h2>
          <p>複習生詞表</p>
        </button>
        <button className="feature-card feature-card--chain" type="button" onClick={onOpenIdiomChain}>
          <span className="card-icon">🔗</span>
          <h2>成語接龍</h2>
          <p>填字闖關</p>
        </button>
        <button className="feature-card feature-card--cloze" type="button" onClick={onOpenIdiomCloze}>
          <span className="card-icon">🧩</span>
          <h2>成語填空</h2>
          <p>看句選成語</p>
        </button>
        {settings.developerMode && (
          <button className="feature-card feature-card--chain-test" type="button" onClick={onOpenIdiomChainTest}>
            <span className="card-icon">🧪</span>
            <h2>接龍測試 50 關</h2>
            <p>檢查棋盤 overlap</p>
          </button>
        )}
      </section>

      <div className="summary-cards">
        <button
          className="summary-card summary-card--unfamiliar"
          type="button"
          onClick={() => onOpenDetail('unfamiliar')}
        >
          <div className="summary-card-icon">📝</div>
          <div className="summary-card-info">
            <span className="summary-card-label">陌生成語</span>
            <strong className="summary-card-count">{starredIds.length}</strong>
          </div>
          <span className="summary-card-arrow">→</span>
        </button>

        <button
          className="summary-card summary-card--mastered"
          type="button"
          onClick={() => onOpenDetail('mastered')}
        >
          <div className="summary-card-icon">✅</div>
          <div className="summary-card-info">
            <span className="summary-card-label">已會成語</span>
            <strong className="summary-card-count">{knownIds.length}</strong>
          </div>
          <span className="summary-card-arrow">→</span>
        </button>
      </div>

      <section className="home-section">
        <div className="section-header">
          <span>進度統計</span>
        </div>
        <div className="section-body">
          <div className="progress-bar-track">
            <div className="progress-bar-fill" style={{ width: `${progressRate}%` }} />
          </div>
          <p className="progress-text">學會 {masteredCount} / {totalCount}（{progressRate}%）</p>
        </div>
      </section>

      <section className="home-section">
        <div className="section-header">
          <span>功能設定</span>
        </div>
        <div className="section-body">
          <div className="setting-row">
            <span className="setting-label">預設顯示注音</span>
            <button
              type="button"
              className={`toggle-switch${settings.autoShowBopomofo ? ' on' : ''}`}
              onClick={() => onToggleSetting('autoShowBopomofo')}
            />
          </div>
          <div className="setting-row">
            <span className="setting-label">預設顯示用法說明</span>
            <button
              type="button"
              className={`toggle-switch${settings.autoShowUsage ? ' on' : ''}`}
              onClick={() => onToggleSetting('autoShowUsage')}
            />
          </div>
          <div className="setting-row">
            <span className="setting-label">預設顯示釋義</span>
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
