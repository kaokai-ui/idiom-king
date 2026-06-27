import type { FC } from 'react';
import type { IdiomV2Entry, IdiomV2FlashcardState } from '../../types/idiomV2';

type Props = {
  idiom: IdiomV2Entry | null;
  flashcardState: IdiomV2FlashcardState | null;
  totalCount: number;
  isStarred: boolean;
  isKnown: boolean;
  onHome: () => void;
  onToggleBopomofo: () => void;
  onToggleUsage: () => void;
  onToggleStarred: () => void;
  onToggleKnown: () => void;
  onNext: () => void;
  activeLevelLabel: string;
};

const FlashcardV2Screen: FC<Props> = ({
  idiom,
  flashcardState,
  totalCount,
  isStarred,
  isKnown,
  onHome,
  onToggleBopomofo,
  onToggleUsage,
  onToggleStarred,
  onToggleKnown,
  onNext,
  activeLevelLabel,
}) => {
  if (!idiom || !flashcardState) {
    return (
      <main className="page-shell game-shell">
        <header className="game-topbar">
          <button className="ghost-button" type="button" onClick={onHome}>← 主畫面</button>
        </header>
        <section className="placeholder-panel">
          <p>{flashcardState?.mode === 'unfamiliar' ? '生詞表為空，請先加入陌生成語' : '沒有可練習的成語'}</p>
        </section>
      </main>
    );
  }

  const modeLabel = flashcardState.mode === 'unfamiliar' ? '陌生' : '隨機';

  return (
    <main className="page-shell game-shell">
      <header className="game-topbar">
        <button className="ghost-button" type="button" onClick={onHome}>← 主畫面</button>
        <div className="status-pills">
          <span className="pill">{modeLabel}</span>
          <span className="pill">{activeLevelLabel}</span>
          <span className="pill">{flashcardState.currentIndex + 1} / {totalCount}</span>
        </div>
      </header>

      <section className="flashcard-layout">
        <article className="flashcard-stage">
          <div className="flashcard-inline-controls">
            <button className={`chip${flashcardState.showBopomofo ? ' chip--active' : ''}`} type="button" onClick={onToggleBopomofo}>
              {flashcardState.showBopomofo ? '隱藏注音' : '顯示注音'}
            </button>
            <button className={`chip${flashcardState.showUsage ? ' chip--active' : ''}`} type="button" onClick={onToggleUsage}>
              {flashcardState.showUsage ? '隱藏用法說明' : '顯示用法說明'}
            </button>
          </div>

          <div className="word-heading">
            <h1 className="flashcard-word">{idiom.text}</h1>
            {flashcardState.mode === 'unfamiliar' && idiom.levelLabel && (
              <span className="pill" style={{ marginLeft: '0.5rem' }}>{idiom.levelLabel}</span>
            )}
          </div>

          {flashcardState.showBopomofo && idiom.bopomofo ? (
            <p className="flashcard-bopomofo">{idiom.bopomofo}</p>
          ) : null}

          {flashcardState.showUsage && idiom.usage ? (
            <div className="flashcard-section">
              <span className="section-label">用法說明</span>
              <p className="flashcard-usage">{idiom.usage}</p>
            </div>
          ) : null}
        </article>
      </section>

      <footer className="game-footer">
        <button className={isStarred ? 'ghost-button ghost-button--active' : 'ghost-button'} type="button" onClick={onToggleStarred}>
          {isStarred ? '已加入生詞表' : '加入生詞表'}
        </button>
        <button className={isKnown ? 'ghost-button ghost-button--active' : 'ghost-button'} type="button" onClick={onToggleKnown}>
          {isKnown ? '已會' : '加入已會'}
        </button>
        <button className="solid-button" type="button" onClick={onNext}>下一個</button>
        <button className="ghost-button" type="button" onClick={onHome}>主畫面</button>
      </footer>
    </main>
  );
};

export default FlashcardV2Screen;
