import { useCallback, useState } from 'react';
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
  initialSeed?: number | null;
  onToggleStarred?: (id: string) => void;
  isStarred?: (id: string) => boolean;
};

const IdiomChainScreen: FC<Props> = ({ onHome, developerMode, mode, initialSeed = null, onToggleStarred, isStarred }) => {
  const challengeCampaign = useChallengeCampaign(mode === 'challenge');
  const isChallengeMode = mode === 'challenge';
  const challengeLevels = challengeCampaign.pack?.levels;
  const resumeLevel = challengeCampaign.resumeLevelNumber ?? 1;

  const {
    level,
    board,
    charTiles,
    selectedCell,
    selectedDirection,
    selectedIdiom,
    highlightedCellKeys,
    levelNumber,
    phase,
    wrongCells,
    filledCount,
    totalActive,
    hintVisible,
    expandedIdiomId,
    answerVisible,
    currentSeed,
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
    onRevealAnswer,
  } = useIdiomChain({
    mode,
    challengeLevels,
    initialLevelNumber: isChallengeMode ? resumeLevel : 1,
    initialSeed,
    sessionKey: isChallengeMode ? challengeCampaign.sessionKey : 0,
    maxLevelNumber: isChallengeMode ? challengeCampaign.totalLevels : undefined,
    onLevelComplete: isChallengeMode ? challengeCampaign.onLevelComplete : undefined,
  });

  const [footerCompactedForHint, setFooterCompactedForHint] = useState(false);
  const [seedCopyState, setSeedCopyState] = useState<{ seed: number; status: 'copied' | 'error' } | null>(null);
  const handleBoardOverflowChange = useCallback((tooSmall: boolean) => {
    if (tooSmall && hintVisible && !footerCompactedForHint) {
      setFooterCompactedForHint(true);
    }
  }, [footerCompactedForHint, hintVisible]);
  const footerHidden = footerCompactedForHint;
  const handleToggleHint = useCallback(() => {
    if (hintVisible) {
      setFooterCompactedForHint(false);
    }
    onToggleHint();
  }, [hintVisible, onToggleHint]);

  const handleCopySeed = useCallback(async () => {
    if (mode !== 'random' || currentSeed === null) return;
    const seedText = String(currentSeed);

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(seedText);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = seedText;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setSeedCopyState({ seed: currentSeed, status: 'copied' });
      window.setTimeout(() => setSeedCopyState((prev) => (
        prev?.seed === currentSeed ? null : prev
      )), 1200);
    } catch {
      setSeedCopyState({ seed: currentSeed, status: 'error' });
      window.setTimeout(() => setSeedCopyState((prev) => (
        prev?.seed === currentSeed ? null : prev
      )), 1200);
    }
  }, [currentSeed, mode]);
  const loadingLabel = isChallengeMode
    ? '正在載入挑戰模式關卡...'
    : mode === 'test'
      ? '正在生成測試模式關卡...'
      : mode === 'random'
        ? '正在生成隨機關卡...'
        : '正在生成舊版隨機關卡...';
  const errorLabel = isChallengeMode
    ? '挑戰模式關卡準備失敗。'
    : mode === 'test'
      ? '測試模式關卡生成失敗。'
      : mode === 'random'
        ? '隨機關卡生成失敗。'
        : '舊版隨機關卡生成失敗。';

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

  if (isChallengeMode && challengeCampaign.phase === 'completed') {
    return (
      <div className="page-shell game-page loading">
        <header className="game-topbar">
          <button className="ghost-button" onClick={onHome}>← 主畫面</button>
        </header>
        <div className="complete-msg">恭喜！已全部完成 {challengeCampaign.totalLevels} 關！</div>
        <p>你已完成挑戰模式所有關卡。</p>
        <div className="action-buttons">
          <div className="action-row">
            <button className="btn btn-secondary" onClick={challengeCampaign.onRestartCampaign}>重新開始</button>
            <button className="btn btn-primary" onClick={onHome}>回主畫面</button>
          </div>
        </div>
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
        <p>{loadingLabel}</p>
      </div>
    );
  }

  if (phase === 'error' || (isChallengeMode && challengeCampaign.phase === 'error')) {
    return (
      <div className="page-shell game-page loading">
        <header className="game-topbar">
          <button className="ghost-button" onClick={onHome}>← 主畫面</button>
        </header>
        <p>{errorLabel}</p>
        <button className="btn btn-secondary" onClick={onSkipLevel}>跳到下一關</button>
      </div>
    );
  }

  const modeLabel = isChallengeMode
    ? '挑戰模式'
    : mode === 'test'
      ? '測試模式'
      : mode === 'random'
        ? '隨機模式'
        : '舊版隨機';
  const levelLabel = isChallengeMode
    ? `${levelNumber}/${challengeCampaign.totalLevels}`
    : `第 ${levelNumber} 關`;
  const nextLevelLabel = isChallengeMode && levelNumber >= challengeCampaign.totalLevels ? '完成挑戰' : '下一關';
  const currentLevel = level!;
  const seedPillLabel = mode === 'random' && currentSeed !== null && seedCopyState?.seed === currentSeed
    ? (seedCopyState.status === 'copied' ? 'Copied' : 'Copy failed')
    : (currentSeed !== null ? `ID ${currentSeed}` : null);

  return (
    <div className="page-shell game-page">
      <header className="game-topbar">
        <button className="ghost-button" onClick={onHome}>← 主畫面</button>
        <div className="status-pills">
          <span className="pill">{modeLabel}</span>
          <span className="pill">{levelLabel}</span>
          <span className="pill">{filledCount}/{totalActive}</span>
          {mode === 'random' && currentSeed !== null ? (
            <button
              type="button"
              className="pill pill-button pill-copy"
              onClick={handleCopySeed}
              title={`Copy level ID ${currentSeed}`}
            >
              {seedPillLabel}
            </button>
          ) : null}
        </div>
      </header>
      <ChainHintPanel
        mode={mode}
        idioms={currentLevel.idioms}
        selectedIdiom={selectedIdiom}
        selectedDirection={selectedDirection}
        hintVisible={hintVisible}
        expandedIdiomId={expandedIdiomId}
        answerVisible={answerVisible}
        onToggleHint={handleToggleHint}
        onToggleIdiomDetail={onToggleIdiomDetail}
        onRevealAnswer={onRevealAnswer}
        onToggleStarred={onToggleStarred}
        isStarred={isStarred}
      />
      <ChainBoard
        board={board}
        selectedCell={selectedCell}
        highlightedCellKeys={highlightedCellKeys}
        wrongCells={wrongCells}
        phase={phase}
        onCellClick={onCellClick}
        onSkipLevel={onSkipLevel}
        canSkipLevel={hasNextLevel}
        onBoardOverflowChange={handleBoardOverflowChange}
      />
      <div className={`chain-footer-slot${footerHidden ? ' chain-footer-slot--hidden' : ''}`} aria-hidden={footerHidden}>
        <ChainCharBank tiles={charTiles} onTileClick={onTileClick} />
      </div>
      <div className={`chain-footer-slot${footerHidden ? ' chain-footer-slot--hidden' : ''}`} aria-hidden={footerHidden}>
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
    </div>
  );
};

export default IdiomChainScreen;
