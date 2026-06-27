import { useCallback, useMemo, useState } from 'react';
import type { IdiomV2Entry, IdiomV2StarredEntry } from './types/idiomV2';
import { useIdiomV2App } from './hooks/useIdiomV2App';
import { isMasteredWord } from './lib/utils';
import HomeV2Screen from './components/v2/HomeV2Screen';
import FlashcardV2Screen from './components/v2/FlashcardV2Screen';
import IdiomChainV2Screen from './components/v2/IdiomChainV2Screen';
import IdiomClozeV2Screen from './components/v2/IdiomClozeV2Screen';
import IdiomDetailV2Screen from './components/v2/IdiomDetailV2Screen';

type DetailView = null | 'unfamiliar' | 'mastered';

function AppV2() {
  const {
    dataLoading,
    dataError,
    dataRetry,
    session,
    settings,
    progress,
    stats,
    currentFlashcardIdiom,
    idiomsById,
    activeLevel,
    activeLevelLabel,
    isStarred,
    isKnown,
    goHome,
    openScreen,
    toggleSetting,
    setIdiomLevel,
    toggleStarred,
    toggleKnown,
    removeFromStarred,
    startFlashcards,
    advanceFlashcard,
    toggleFlashcardPanel,
  } = useIdiomV2App();

  const [detailView, setDetailView] = useState<DetailView>(null);

  const handleToggleStarred = useCallback((entry: IdiomV2StarredEntry) => {
    toggleStarred(entry);
  }, [toggleStarred]);

  const handleMarkUnfamiliar = useCallback((entry: IdiomV2StarredEntry) => {
    if (!isStarred(entry.id)) {
      toggleStarred(entry);
    }
  }, [isStarred, toggleStarred]);

  const starredIdioms = useMemo(() => {
    return progress.starredIdioms;
  }, [progress.starredIdioms]);

  const knownIdioms = useMemo(() => {
    const levelProgress = progress.byLevel[activeLevel];
    const masteredIds = new Set(levelProgress?.knownIds ?? []);

    for (const [id, wordStats] of Object.entries(levelProgress?.wordStats ?? {})) {
      if (isMasteredWord(wordStats)) {
        masteredIds.add(id);
      }
    }

    const result: IdiomV2Entry[] = [];
    for (const id of masteredIds) {
      const entry = idiomsById[id];
      if (entry) result.push(entry);
    }
    return result;
  }, [progress.byLevel, activeLevel, idiomsById]);

  const screen = session.screen;

  if (dataLoading) {
    return (
      <div className="game-page loading">
        <div className="loading-spinner" />
        <p>正在載入成語資料...</p>
      </div>
    );
  }

  if (dataError) {
    return (
      <div className="game-page loading">
        <p>載入失敗：{dataError}</p>
        <button className="btn btn-primary" onClick={dataRetry}>重試</button>
      </div>
    );
  }

  if (screen === 'flashcardRandom' || screen === 'flashcardUnfamiliar') {
    return (
      <FlashcardV2Screen
        idiom={currentFlashcardIdiom}
        flashcardState={session.flashcards}
        totalCount={session.flashcards?.idiomIds.length ?? 0}
        isStarred={currentFlashcardIdiom ? isStarred(currentFlashcardIdiom.id) : false}
        isKnown={currentFlashcardIdiom ? isKnown(currentFlashcardIdiom.id, currentFlashcardIdiom.level) : false}
        onHome={goHome}
        onToggleBopomofo={() => toggleFlashcardPanel('showBopomofo')}
        onToggleUsage={() => toggleFlashcardPanel('showUsage')}
        onToggleStarred={() => {
          if (currentFlashcardIdiom) {
            toggleStarred({
              id: currentFlashcardIdiom.id,
              text: currentFlashcardIdiom.text,
              bopomofo: currentFlashcardIdiom.bopomofo,
              usage: currentFlashcardIdiom.usage,
              level: currentFlashcardIdiom.level,
              levelLabel: currentFlashcardIdiom.levelLabel,
            });
          }
        }}
        onToggleKnown={() => currentFlashcardIdiom && toggleKnown(currentFlashcardIdiom.id, currentFlashcardIdiom.level)}
        onNext={advanceFlashcard}
        activeLevelLabel={currentFlashcardIdiom?.levelLabel ?? activeLevelLabel}
      />
    );
  }

  if (screen === 'idiomChainLevelChallenge') {
    return (
      <IdiomChainV2Screen
        onHome={goHome}
        developerMode={settings.developerMode}
        mode="random"
        idioms={null}
        charIndex={null}
        onToggleStarred={handleToggleStarred}
        isStarred={isStarred}
        activeLevel={activeLevel}
      />
    );
  }

  if (screen === 'idiomChainChallenge') {
    return (
      <IdiomChainV2Screen
        onHome={goHome}
        developerMode={settings.developerMode}
        mode="challenge"
        idioms={null}
        charIndex={null}
        onToggleStarred={handleToggleStarred}
        isStarred={isStarred}
        activeLevel={activeLevel}
      />
    );
  }

  if (screen === 'idiomCloze') {
    return (
      <IdiomClozeV2Screen
        onHome={goHome}
        onMarkUnfamiliar={handleMarkUnfamiliar}
        activeLevel={activeLevel}
        idiomsById={idiomsById}
      />
    );
  }

  if (detailView && screen === 'home') {
    return (
      <IdiomDetailV2Screen
        detailView={detailView}
        starredIdioms={starredIdioms}
        knownIdioms={knownIdioms}
        onBack={() => setDetailView(null)}
        onRemoveFromStarred={removeFromStarred}
        onRemoveKnown={(id: string) => toggleKnown(id)}
      />
    );
  }

  return (
    <HomeV2Screen
      totalCount={stats.totalCount}
      masteredCount={stats.masteredCount}
      unfamiliarCount={stats.unfamiliarCount}
      progressRate={stats.progressRate}
      starredIds={progress.starredIdioms.map(s => s.id)}
      knownIds={knownIdioms.map(entry => entry.id)}
      settings={settings}
      activeLevel={activeLevel}
      activeLevelLabel={activeLevelLabel}
      onStartRandomFlashcards={() => startFlashcards('random')}
      onStartUnfamiliarFlashcards={() => startFlashcards('unfamiliar')}
      onOpenIdiomChainLevelChallenge={() => openScreen('idiomChainLevelChallenge')}
      onOpenIdiomChainChallenge={() => openScreen('idiomChainChallenge')}
      onOpenIdiomCloze={() => openScreen('idiomCloze')}
      onOpenDetail={setDetailView}
      onToggleSetting={toggleSetting}
      onSetIdiomLevel={setIdiomLevel}
    />
  );
}

export default AppV2;
