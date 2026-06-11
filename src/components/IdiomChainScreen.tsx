import type { FC } from 'react';
import type { ChainMode } from '../types/game';
import { useChallengeCampaign } from '../game/useChallengeCampaign';
import { useIdiomChain } from '../game/useIdiomChain';
import ChainBoard from './ChainBoard';
import ChainCharBank from './ChainCharBank';
import ChainHintPanel from './ChainHintPanel';
import ChainActions from './ChainActions';

type Props = {
  onHome: () => void;
  developerMode: boolean;
  mode: ChainMode;
};

const IdiomChainScreen: FC<Props> = ({ onHome, developerMode, mode }) => {
  const challengeCampaign = useChallengeCampaign(mode === 'challenge');
  const isChallengeMode = mode === 'challenge';
  const challengeLevels = challengeCampaign.pack?.levels;

  const {
    level,
    board,
    charTiles,
    selectedCell,
    levelNumber,
    phase,
    wrongCells,
    filledCount,
    totalActive,
    hintVisible,
    expandedIdiomId,
    hasNextLevel,
    canDeleteCell,
    onCellClick,
    onTileClick,
    onDeleteCell,
    onClearAll,
    onNextLevel,
    onSkipLevel,
    onRestart,
    onToggleHint,
    onToggleIdiomDetail,
  } = useIdiomChain({
    mode,
    challengeLevels,
    initialLevelNumber: isChallengeMode ? challengeCampaign.resumeLevelNumber : 1,
    maxLevelNumber: isChallengeMode ? challengeCampaign.totalLevels : undefined,
    onLevelComplete: isChallengeMode ? challengeCampaign.onLevelComplete : undefined,
  });

  if (isChallengeMode && challengeCampaign.phase === 'generating') {
    return (
      <div className="page-shell game-page loading">
        <header className="game-topbar">
          <button className="ghost-button" onClick={onHome}>← 主畫面</button>
        </header>
        <div className="loading-spinner" />
        <p>正在準備挑戰模式關卡...</p>
        <p>{challengeCampaign.generatedCount}/{challengeCampaign.totalLevels}</p>
      </div>
    );
  }

  if ((phase === 'generating' || !level) && (!isChallengeMode || challengeCampaign.phase === 'ready')) {
    return (
      <div className="page-shell game-page loading">
        <header className="game-topbar">
          <button className="ghost-button" onClick={onHome}>← 主畫面</button>
        </header>
        <div className="loading-spinner" />
        <p>{isChallengeMode ? '正在載入挑戰關卡...' : '正在產生隨機關卡...'}</p>
      </div>
    );
  }

  if (phase === 'error' || (isChallengeMode && challengeCampaign.phase === 'error')) {
    return (
      <div className="page-shell game-page loading">
        <header className="game-topbar">
          <button className="ghost-button" onClick={onHome}>← 主畫面</button>
        </header>
        <p>{isChallengeMode ? '挑戰模式關卡準備失敗。' : '隨機關卡產生失敗。'}</p>
        <button className="btn btn-secondary" onClick={onSkipLevel}>再試一次</button>
      </div>
    );
  }

  const modeLabel = isChallengeMode ? '挑戰模式' : '隨機模式';
  const levelLabel = isChallengeMode
    ? `${levelNumber}/${challengeCampaign.totalLevels}`
    : `隨機 ${levelNumber}`;
  const nextLevelLabel = isChallengeMode && levelNumber >= challengeCampaign.totalLevels ? '已完成全部關卡' : '下一關';
  const currentLevel = level!;

  return (
    <div className="page-shell game-page">
      <header className="game-topbar">
        <button className="ghost-button" onClick={onHome}>← 主畫面</button>
        <div className="status-pills">
          <span className="pill">{modeLabel}</span>
          <span className="pill">{levelLabel}</span>
          <span className="pill">{filledCount}/{totalActive}</span>
        </div>
      </header>
      <ChainHintPanel
        idioms={currentLevel.idioms}
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
        hasNextLevel={hasNextLevel}
        nextLevelLabel={nextLevelLabel}
        developerMode={developerMode}
        onSkipLevel={onSkipLevel}
      />
    </div>
  );
};

export default IdiomChainScreen;
