import type { FC } from 'react';
import { useIdiomChain } from '../game/useIdiomChain';
import ChainBoard from './ChainBoard';
import ChainCharBank from './ChainCharBank';
import ChainHintPanel from './ChainHintPanel';
import ChainActions from './ChainActions';

type Props = {
  onHome: () => void;
  developerMode: boolean;
};

const IdiomChainScreen: FC<Props> = ({ onHome, developerMode }) => {
  const {
    level, board, charTiles, selectedCell, levelNumber, phase,
    wrongCells, filledCount, totalActive, hintVisible, expandedIdiomId,
    canDeleteCell,
    onCellClick, onTileClick, onDeleteCell, onClearAll,
    onNextLevel, onSkipLevel, onRestart, onToggleHint, onToggleIdiomDetail,
  } = useIdiomChain();

  if (phase === 'generating' || !level) {
    return (
      <div className="page-shell game-page loading">
        <header className="game-topbar">
          <button className="ghost-button" onClick={onHome}>← 主畫面</button>
        </header>
        <div className="loading-spinner" />
        <p>正在生成關卡...</p>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="page-shell game-page loading">
        <header className="game-topbar">
          <button className="ghost-button" onClick={onHome}>← 主畫面</button>
        </header>
        <p>關卡生成失敗</p>
        <button className="btn btn-secondary" onClick={onSkipLevel}>跳過</button>
      </div>
    );
  }

  return (
    <div className="page-shell game-page">
      <header className="game-topbar">
        <button className="ghost-button" onClick={onHome}>← 主畫面</button>
        <div className="status-pills">
          <span className="pill">關 {levelNumber}</span>
          <span className="pill">{filledCount}/{totalActive}</span>
        </div>
      </header>
      <ChainHintPanel
        idioms={level.idioms}
        hintVisible={hintVisible}
        expandedIdiomId={expandedIdiomId}
        onToggleHint={onToggleHint}
        onToggleIdiomDetail={onToggleIdiomDetail}
      />
      <ChainBoard
        board={board}
        selectedCell={selectedCell}
        wrongCells={wrongCells}
        phase={phase}
        onCellClick={onCellClick}
      />
      <ChainCharBank tiles={charTiles} onTileClick={onTileClick} />
      <ChainActions
        phase={phase}
        canDeleteCell={canDeleteCell}
        onDeleteCell={onDeleteCell}
        onClearAll={onClearAll}
        onNextLevel={onNextLevel}
        onRestart={onRestart}
        developerMode={developerMode}
        onSkipLevel={onSkipLevel}
      />
    </div>
  );
};

export default IdiomChainScreen;
