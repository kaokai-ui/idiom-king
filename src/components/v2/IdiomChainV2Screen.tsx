import { useMemo } from 'react';
import type { FC } from 'react';
import type { ChainMode } from '../../types/game';
import type { IdiomLevel, IdiomV2StarredEntry } from '../../types/idiomV2';
import { useIdiomChainV2 } from '../../game/useIdiomChainV2';
import { useChainScreenChrome } from '../../game/useChainScreenChrome';
import { IDIOM_LEVEL_LABELS } from '../../constants/idiomLevels';
import { getCachedLevelData } from '../../data/idiomV2DataClient';
import { getIdiomV2ByIdSync } from '../../data/idiomV2Db';
import ChainBoard from '../ChainBoard';
import ChainCharBank from '../ChainCharBank';
import ChainHintPanel from '../ChainHintPanel';
import ChainActions from '../ChainActions';

type Props = {
  onHome: () => void;
  developerMode: boolean;
  mode: ChainMode;
  onToggleStarred?: (entry: IdiomV2StarredEntry) => void;
  isStarred?: (id: string) => boolean;
  activeLevel?: IdiomLevel;
};

const IdiomChainV2Screen: FC<Props> = ({ onHome, developerMode, mode, onToggleStarred, isStarred, activeLevel = 'elementary' }) => {
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
    challengeCampaign,
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
  } = useIdiomChainV2({
    mode,
    activeLevel,
    initialLevelNumber: 1,
    initialSeed: null,
    sessionKey: 0,
  });

  const isChallengeMode = mode === 'challenge';
  const showDeveloperSkip = developerMode && mode === 'random';

  const idiomsByIdOverride = useMemo(() => {
    const cached = getCachedLevelData(activeLevel);
    if (!cached) return undefined;
    const map: Record<string, { usage?: string; text?: string }> = {};
    for (const entry of cached.idioms) {
      map[entry.id] = { usage: entry.usage, text: entry.text };
    }
    return map;
  }, [activeLevel]);

  const {
    footerHidden,
    handleBoardOverflowChange,
    handleToggleHint,
    handleCopySeed,
    seedPillLabel,
  } = useChainScreenChrome({ mode, currentSeed, hintVisible, onToggleHint });

  const loadingLabel = isChallengeMode
    ? '正在載入挑戰模式關卡...'
    : `正在生成${IDIOM_LEVEL_LABELS[activeLevel]}隨機關卡...`;

  const errorLabel = isChallengeMode
    ? '挑戰模式關卡準備失敗。'
    : `${IDIOM_LEVEL_LABELS[activeLevel]}隨機關卡生成失敗。`;

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
    ? '不分程度挑戰'
    : `${IDIOM_LEVEL_LABELS[activeLevel]}`;
  const levelLabel = isChallengeMode
    ? `${levelNumber}/${challengeCampaign.totalLevels}`
    : `第 ${levelNumber} 關`;
  const nextLevelLabel = isChallengeMode && levelNumber >= challengeCampaign.totalLevels ? '完成挑戰' : '下一關';
  const currentLevel = level!;

  const handleToggleStarredIdiom = onToggleStarred
    ? (id: string) => {
        const placed = currentLevel.idioms.find(i => i.id === id);
        if (!placed) return;
        // The placed idiom only carries text/chars; look up the full entry
        // (across all cached levels for challenge mode) to keep bopomofo/usage.
        const full = getIdiomV2ByIdSync(id);
        onToggleStarred({
          id,
          text: full?.text ?? placed.text,
          bopomofo: full?.bopomofo ?? '',
          usage: full?.usage ?? '',
          level: full?.level ?? activeLevel,
          levelLabel: full?.levelLabel ?? IDIOM_LEVEL_LABELS[activeLevel],
        });
      }
    : undefined;

  const handleIsStarred = isStarred
    ? (id: string) => isStarred(id)
    : undefined;

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
        onToggleStarred={handleToggleStarredIdiom}
        isStarred={handleIsStarred}
        idiomsByIdOverride={idiomsByIdOverride}
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
          developerMode={showDeveloperSkip}
          onSkipLevel={onSkipLevel}
        />
      </div>
    </div>
  );
};

export default IdiomChainV2Screen;
