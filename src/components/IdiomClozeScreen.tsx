import type { FC } from 'react';
import { useCallback } from 'react';
import { useIdiomCloze } from '../game/useIdiomCloze';
import { idiomIdByText } from '../data/idiomDb';
import ClozeView from './ClozeView';

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
    <ClozeView
      onHome={onHome}
      level={level}
      streak={streak}
      phase={phase}
      selectedIndex={selectedIndex}
      question={question}
      unfamiliar={unfamiliar}
      onSelect={onSelect}
      onNext={onNext}
    />
  );
};

export default IdiomClozeScreen;
