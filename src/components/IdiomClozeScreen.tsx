import type { FC } from 'react';
import { useCallback } from 'react';
import { useIdiomCloze } from '../game/useIdiomCloze';
import { idiomIdByText } from '../data/idiomDb';

type Props = {
  onHome: () => void;
  onMarkUnfamiliar: (id: string) => void;
};

const IdiomClozeScreen: FC<Props> = ({ onHome, onMarkUnfamiliar }) => {
  const handleWrong = useCallback((idiomText: string) => {
    const id = idiomIdByText[idiomText];
    if (id) onMarkUnfamiliar(id);
  }, [onMarkUnfamiliar]);

  const { question, phase, selectedIndex, level, streak, unfamiliar, onSelect, onNext } = useIdiomCloze(handleWrong);

  if (!question) {
    return (
      <div className="page-shell game-page loading">
        <header className="game-topbar">
          <button className="ghost-button" onClick={onHome}>← 主畫面</button>
        </header>
        <div className="loading-spinner" />
        <p>正在出題...</p>
      </div>
    );
  }

  return (
    <div className="page-shell game-page cloze-page">
      <header className="game-topbar">
        <button className="ghost-button" onClick={onHome}>← 主畫面</button>
        <div className="status-pills">
          <span className="pill">第 {level} 題</span>
          {streak > 0 && <span className="pill pill--streak">連續 {streak}</span>}
        </div>
      </header>

      <div className="cloze-body">
        <div className="cloze-sentence-panel">
          <p className="cloze-sentence">{question.blankedSentence}</p>
        </div>

        {phase === 'wrong' && (
          <div className="cloze-answer-reveal">
            正確答案：<strong>{question.answerIdiom}</strong>
          </div>
        )}

        <div className="cloze-options">
          {question.options.map((opt, idx) => {
            let cls = 'cloze-option';
            if (selectedIndex !== null) {
              if (opt === question.answerIdiom) cls += ' cloze-option--correct';
              else if (idx === selectedIndex) cls += ' cloze-option--wrong';
              else cls += ' cloze-option--dimmed';
            }
            return (
              <button
                key={idx}
                className={cls}
                onClick={() => onSelect(idx)}
                disabled={phase !== 'question'}
              >
                {opt}
              </button>
            );
          })}
        </div>

        {unfamiliar.size > 0 && (
          <div className="cloze-unfamiliar">
            <span className="cloze-unfamiliar-label">陌生成語</span>
            <div className="cloze-unfamiliar-tags">
              {[...unfamiliar].map(idiom => (
                <span key={idiom} className="cloze-unfamiliar-tag">{idiom}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {phase !== 'question' && (
        <div className="action-buttons">
          <button className="btn btn-primary" onClick={onNext}>
            {phase === 'correct' ? '下一題 →' : '繼續 →'}
          </button>
        </div>
      )}
    </div>
  );
};

export default IdiomClozeScreen;
