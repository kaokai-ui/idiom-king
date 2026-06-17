import { useMemo, useState } from 'react';
import type { IdiomEntry } from './types/game';
import { idiomsById } from './data/idiomDb';
import { useIdiomApp } from './hooks/useIdiomApp';
import HomeScreen from './components/HomeScreen';
import IdiomDetailScreen from './components/IdiomDetailScreen';
import FlashcardScreen from './components/FlashcardScreen';
import IdiomChainScreen from './components/IdiomChainScreen';
import IdiomChainBatchTestScreen from './components/IdiomChainBatchTestScreen';
import IdiomClozeScreen from './components/IdiomClozeScreen';

type DetailView = null | 'unfamiliar' | 'mastered';

function App() {
  const {
    dataReady,
    session,
    settings,
    progress,
    stats,
    currentFlashcardIdiom,
    isStarred,
    isKnown,
    goHome,
    startFlashcards,
    openScreen,
    advanceFlashcard,
    toggleFlashcardPanel,
    toggleSetting,
    toggleStarred,
    toggleKnown,
  } = useIdiomApp();

  const [detailView, setDetailView] = useState<DetailView>(null);

  const starredIdioms = useMemo(() => {
    const result: IdiomEntry[] = [];
    for (const id of progress.starredIds) {
      const entry = idiomsById[id];
      if (entry) result.push(entry);
    }
    return result;
  }, [progress.starredIds]);

  const knownIdioms = useMemo(() => {
    const result: IdiomEntry[] = [];
    for (const id of progress.knownIds) {
      const entry = idiomsById[id];
      if (entry) result.push(entry);
    }
    return result;
  }, [progress.knownIds]);

  const handleRemove = (type: 'unfamiliar' | 'mastered', id: string) => {
    if (type === 'unfamiliar') {
      toggleStarred(id);
    } else {
      toggleKnown(id);
    }
  };

  const screen = session.screen;
  const requiresIdiomDb = !dataReady && (
    detailView !== null
    || screen === 'flashcardRandom'
    || screen === 'flashcardUnfamiliar'
  );

  if (requiresIdiomDb) {
    return (
      <div className="game-page loading">
        <div className="loading-spinner" />
        <p>正在載入成語資料...</p>
      </div>
    );
  }

  if (screen === 'flashcardRandom' || screen === 'flashcardUnfamiliar') {
    return (
      <FlashcardScreen
        idiom={currentFlashcardIdiom}
        flashcardState={session.flashcards}
        totalCount={session.flashcards?.idiomIds.length ?? 0}
        isStarred={currentFlashcardIdiom ? isStarred(currentFlashcardIdiom.id) : false}
        isKnown={currentFlashcardIdiom ? isKnown(currentFlashcardIdiom.id) : false}
        onHome={goHome}
        onToggleBopomofo={() => toggleFlashcardPanel('showBopomofo')}
        onToggleUsage={() => toggleFlashcardPanel('showUsage')}
        onToggleDefinition={() => toggleFlashcardPanel('showDefinition')}
        onToggleStarred={() => currentFlashcardIdiom && toggleStarred(currentFlashcardIdiom.id)}
        onToggleKnown={() => currentFlashcardIdiom && toggleKnown(currentFlashcardIdiom.id)}
        onNext={advanceFlashcard}
      />
    );
  }

  if (screen === 'idiomChain' || screen === 'idiomChainRandom') {
    return <IdiomChainScreen onHome={goHome} developerMode={settings.developerMode} mode="random" onToggleStarred={toggleStarred} isStarred={isStarred} />;
  }

  if (screen === 'idiomChainModeTest') {
    return <IdiomChainScreen onHome={goHome} developerMode={settings.developerMode} mode="test" onToggleStarred={toggleStarred} isStarred={isStarred} />;
  }

  if (screen === 'idiomChainChallenge') {
    return <IdiomChainScreen onHome={goHome} developerMode={settings.developerMode} mode="challenge" onToggleStarred={toggleStarred} isStarred={isStarred} />;
  }

  if (screen === 'idiomChainTest') {
    return <IdiomChainBatchTestScreen onHome={goHome} />;
  }

  if (screen === 'idiomCloze') {
    return <IdiomClozeScreen onHome={goHome} onMarkUnfamiliar={toggleStarred} />;
  }

  if (detailView && screen === 'home') {
    return (
      <IdiomDetailScreen
        detailView={detailView}
        starredIdioms={starredIdioms}
        knownIdioms={knownIdioms}
        onBack={() => setDetailView(null)}
        onRemove={handleRemove}
      />
    );
  }

  return (
    <HomeScreen
      totalCount={stats.totalCount}
      masteredCount={stats.masteredCount}
      unfamiliarCount={stats.unfamiliarCount}
      progressRate={stats.progressRate}
      starredIds={progress.starredIds}
      knownIds={progress.knownIds}
      settings={settings}
      onStartRandomFlashcards={() => startFlashcards('random')}
      onStartUnfamiliarFlashcards={() => startFlashcards('unfamiliar')}
      onOpenIdiomChainRandom={() => openScreen('idiomChainRandom')}
      onOpenIdiomChainModeTest={() => openScreen('idiomChainModeTest')}
      onOpenIdiomChainChallenge={() => openScreen('idiomChainChallenge')}
      onOpenIdiomChainTest={() => openScreen('idiomChainTest')}
      onOpenIdiomCloze={() => openScreen('idiomCloze')}
      onOpenDetail={setDetailView}
      onToggleSetting={toggleSetting}
    />
  );
}

export default App;
