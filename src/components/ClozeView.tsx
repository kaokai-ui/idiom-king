import type { FC } from 'react';

/**
 * Shared presentational body for the v1 and v2 cloze screens. The two versions
 * render an identical play view; v2 additionally shows a level pill. Loading /
 * insufficient states stay in the version-specific screens since they differ.
 */
export type ClozeViewQuestion = {
  blankedSentence: string;
  answerIdiom: string;
  options: string[];
};

type Props = {
  onHome: () => void;
  levelLabel?: string;
  level: number;
  streak: number;
  phase: string;
  selectedIndex: number | null;
  question: ClozeViewQuestion;
  unfamiliar: Set<string>;
  onSelect: (idx: number) => void;
  onNext: () => void;
};

const ClozeView: FC<Props> = ({
  onHome,
  levelLabel,
  level,
  streak,
  phase,
  selectedIndex,
  question,
  unfamiliar,
  onSelect,
  onNext,
}) => {
  return (
    <div className="page-shell game-page cloze-page">
      <header className="game-topbar">
        <button className="ghost-button" onClick={onHome}>← 主畫面</button>
        <div className="status-pills">
          {levelLabel && <span className="pill">{levelLabel}</span>}
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

export default ClozeView;
