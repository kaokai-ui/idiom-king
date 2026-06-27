export type IdiomLevel = 'elementary' | 'junior' | 'senior';

export type IdiomV2Entry = {
  id: string;
  sourceNo: string;
  text: string;
  chars: string[];
  uniqueChars: string[];
  charCountMap: Record<string, number>;
  bopomofo: string;
  usage: string;
  level: IdiomLevel;
  levelLabel: string;
};

export type IdiomV2FlashcardState = {
  mode: 'random' | 'unfamiliar';
  idiomIds: string[];
  currentIndex: number;
  showBopomofo: boolean;
  showUsage: boolean;
};

export type IdiomV2WordStats = {
  seenCount: number;
  lastSeenAt: number | null;
};

export type IdiomV2LevelProgress = {
  knownIds: string[];
  wordStats: Record<string, IdiomV2WordStats>;
};

export type IdiomV2StarredEntry = {
  id: string;
  text: string;
  bopomofo: string;
  usage: string;
  level: IdiomLevel;
  levelLabel: string;
};

export type IdiomV2Progress = {
  starredIdioms: IdiomV2StarredEntry[];
  byLevel: Record<IdiomLevel, IdiomV2LevelProgress>;
};

export type IdiomV2Settings = {
  idiomLevel: IdiomLevel;
  autoShowBopomofo: boolean;
  autoShowUsage: boolean;
  developerMode: boolean;
};

export type IdiomV2AppScreen =
  | 'home'
  | 'flashcardRandom'
  | 'flashcardUnfamiliar'
  | 'idiomChainLevelChallenge'
  | 'idiomChainChallenge'
  | 'idiomCloze'
  | 'idiomDetail';

export type IdiomV2Session = {
  screen: IdiomV2AppScreen;
  flashcards: IdiomV2FlashcardState | null;
};

export type IdiomV2Catalog = {
  levels: Array<{
    key: IdiomLevel;
    label: string;
    count: number;
    file: string;
  }>;
  generatedAt: string;
};
