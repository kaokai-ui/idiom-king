export type Direction = 'horizontal' | 'vertical';

export type IdiomEntry = {
  id: string;
  text: string;
  chars: string[];
  uniqueChars: string[];
  charCountMap: Record<string, number>;
  bopomofo: string;
  usage: string;
  definition: string;
};

export type Cell = {
  row: number;
  col: number;
  isActive: boolean;
  answer: string;
  currentValue: string | null;
  idiomIds: string[];
  isPreset: boolean;
};

export type CharTile = {
  id: string;
  value: string;
  used: boolean;
  cellRef: string | null;
};

export type PlacedIdiom = {
  id: string;
  text: string;
  chars: string[];
  direction: Direction;
  startRow: number;
  startCol: number;
};

export type LevelData = {
  id: number;
  rows: number;
  cols: number;
  idioms: PlacedIdiom[];
  charBank: string[];
  presetCells: { row: number; col: number; char: string }[];
};

export type ChainTestLevelRecord = {
  sequence: number;
  seed: number;
  level: LevelData;
  boardRows: string[];
  layoutSignature: string;
};

export type ChainTestBatch = {
  batchId: string;
  seedBase: number;
  generatedAt: string;
  levels: ChainTestLevelRecord[];
};

export type AppScreen = 'home' | 'flashcardRandom' | 'flashcardUnfamiliar' | 'idiomChain' | 'idiomChainTest' | 'idiomCloze';

export type FlashcardState = {
  mode: 'random' | 'unfamiliar';
  idiomIds: string[];
  currentIndex: number;
  showBopomofo: boolean;
  showUsage: boolean;
  showDefinition: boolean;
};

export type AppSession = {
  screen: AppScreen;
  flashcards: FlashcardState | null;
};

export type AppSettings = {
  autoShowBopomofo: boolean;
  autoShowUsage: boolean;
  autoShowDefinition: boolean;
  developerMode: boolean;
};

export type WordStats = {
  seenCount: number;
  lastSeenAt: number | null;
};

export type AppProgress = {
  starredIds: string[];
  knownIds: string[];
  wordStats: Record<string, WordStats>;
};
