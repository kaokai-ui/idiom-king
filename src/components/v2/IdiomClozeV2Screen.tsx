import type { FC } from 'react';
import { useCallback } from 'react';
import type { IdiomLevel, IdiomV2Entry, IdiomV2StarredEntry } from '../../types/idiomV2';
import { useIdiomV2Cloze } from '../../game/useIdiomV2Cloze';
import { IDIOM_LEVEL_LABELS } from '../../constants/idiomLevels';
import ClozeView from '../ClozeView';

type Props = {
  onHome: () => void;
  onMarkUnfamiliar: (entry: IdiomV2StarredEntry) => void;
  activeLevel: IdiomLevel;
  idiomsById: Record<string, IdiomV2Entry>;
};

const IdiomClozeV2Screen: FC<Props> = ({ onHome, onMarkUnfamiliar, activeLevel, idiomsById }) => {
  const handleWrong = useCallback((idiomId: string, idiomText: string) => {
    const entry = idiomsById[idiomId];
    onMarkUnfamiliar({
      id: idiomId,
      text: idiomText,
      bopomofo: entry?.bopomofo ?? '',
      usage: entry?.usage ?? '',
      level: entry?.level ?? activeLevel,
      levelLabel: entry?.levelLabel ?? IDIOM_LEVEL_LABELS[activeLevel],
    });
  }, [onMarkUnfamiliar, idiomsById, activeLevel]);

  const { question, phase, selectedIndex, level, streak, unfamiliar, onSelect, onNext, dataReady } = useIdiomV2Cloze(activeLevel, handleWrong);

  if (!dataReady) {
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

  if (phase === 'insufficient' || !question) {
    return (
      <div className="page-shell game-page loading">
        <header className="game-topbar">
          <button className="ghost-button" onClick={onHome}>← 主畫面</button>
        </header>
        <p>此程度可用填空題不足（至少需要4個有例句的成語）</p>
        <p>目前等級：{IDIOM_LEVEL_LABELS[activeLevel]}</p>
        <button className="btn btn-primary" onClick={onHome}>回主畫面</button>
      </div>
    );
  }

  return (
    <ClozeView
      onHome={onHome}
      levelLabel={IDIOM_LEVEL_LABELS[activeLevel]}
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

export default IdiomClozeV2Screen;
