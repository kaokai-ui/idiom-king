import type { Direction, PlacedIdiom, LevelData, IdiomEntry } from '../types/game';
import { idioms, getCharIndex } from '../data/idiomDb';
import { shuffle } from '../lib/utils';

export {
  buildBoardFromLevel,
  createCharTiles,
  isBoardComplete,
  isBoardCorrect,
  countFilledCells,
  countActiveCells,
  getWrongCells,
  getCellKey,
  findTileByCellRef,
} from './boardUtils';

type BoardCell = {
  char: string | null;
  idiomIds: string[];
};

export type LevelGenerationConfig = {
  targetCount: number;
  maxRows: number;
  maxCols: number;
  maxAttempts: number;
};

export function normalizeLevelGenerationConfig(config: LevelGenerationConfig): LevelGenerationConfig {
  const normalized = { ...config };

  // Small 8x8 boards become unreliable when asked to place 7-8 crossing idioms.
  // We clamp this combination centrally so future callers do not accidentally
  // reintroduce a high-failure configuration.
  if (normalized.maxRows <= 8 && normalized.maxCols <= 8) {
    normalized.targetCount = Math.min(normalized.targetCount, 6);
  }

  return normalized;
}

function createEmptyBoard(rows: number, cols: number): (BoardCell | null)[][] {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => null)
  );
}

function canPlaceIdiom(
  board: (BoardCell | null)[][],
  idiom: IdiomEntry,
  direction: Direction,
  startRow: number,
  startCol: number,
  rows: number,
  cols: number
): boolean {
  for (let i = 0; i < idiom.chars.length; i++) {
    const r = direction === 'vertical' ? startRow + i : startRow;
    const c = direction === 'horizontal' ? startCol + i : startCol;
    if (r < 0 || r >= rows || c < 0 || c >= cols) return false;
    const existing = board[r][c];
    if (existing !== null) {
      if (existing.char !== idiom.chars[i]) return false;
    } else {
      if (direction === 'horizontal') {
        if (r > 0 && board[r - 1][c] !== null) return false;
        if (r < rows - 1 && board[r + 1][c] !== null) return false;
      } else {
        if (c > 0 && board[r][c - 1] !== null) return false;
        if (c < cols - 1 && board[r][c + 1] !== null) return false;
      }
    }
  }
  if (direction === 'horizontal') {
    const beforeC = startCol - 1;
    if (beforeC >= 0 && board[startRow][beforeC] !== null) return false;
    const afterC = startCol + idiom.chars.length;
    if (afterC < cols && board[startRow][afterC] !== null) return false;
  } else {
    const beforeR = startRow - 1;
    if (beforeR >= 0 && board[beforeR][startCol] !== null) return false;
    const afterR = startRow + idiom.chars.length;
    if (afterR < rows && board[afterR][startCol] !== null) return false;
  }
  return true;
}

function placeIdiomOnBoard(
  board: (BoardCell | null)[][],
  idiom: IdiomEntry,
  direction: Direction,
  startRow: number,
  startCol: number
): void {
  for (let i = 0; i < idiom.chars.length; i++) {
    const r = direction === 'vertical' ? startRow + i : startRow;
    const c = direction === 'horizontal' ? startCol + i : startCol;
    const existing = board[r][c];
    if (existing) {
      existing.idiomIds.push(idiom.id);
    } else {
      board[r][c] = { char: idiom.chars[i], idiomIds: [idiom.id] };
    }
  }
}

function getCandidateIdiomIndices(
  board: (BoardCell | null)[][],
  rows: number,
  cols: number,
  charIndex: Map<string, number[]>
): number[] {
  const candidateSet = new Set<number>();
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = board[r][c];
      if (cell === null) continue;
      const indices = charIndex.get(cell.char!);
      if (indices) {
        for (const idx of indices) candidateSet.add(idx);
      }
    }
  }
  return [...candidateSet];
}

function findCrossingPositions(
  board: (BoardCell | null)[][],
  idiom: IdiomEntry,
  direction: Direction,
  rows: number,
  cols: number
): { startRow: number; startCol: number }[] {
  const positions: { startRow: number; startCol: number }[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = board[r][c];
      if (cell === null) continue;
      for (let ci = 0; ci < idiom.chars.length; ci++) {
        if (idiom.chars[ci] !== cell.char) continue;
        let sr: number, sc: number;
        if (direction === 'horizontal') { sr = r; sc = c - ci; }
        else { sr = r - ci; sc = c; }
        if (canPlaceIdiom(board, idiom, direction, sr, sc, rows, cols)) {
          positions.push({ startRow: sr, startCol: sc });
        }
      }
    }
  }
  return positions;
}

export function generateLevel(
  levelId: number,
  targetCount: number = 5,
  maxRows: number = 10,
  maxCols: number = 10,
  maxAttempts: number = 50,
  random: () => number = Math.random
): LevelData | null {
  const normalized = normalizeLevelGenerationConfig({
    targetCount,
    maxRows,
    maxCols,
    maxAttempts,
  });

  for (let attempt = 0; attempt < normalized.maxAttempts; attempt++) {
    const result = tryGenerateLevel(
      levelId,
      normalized.targetCount,
      normalized.maxRows,
      normalized.maxCols,
      random,
    );
    if (result) return result;
  }
  return null;
}

function tryGenerateLevel(
  levelId: number,
  targetCount: number,
  maxRows: number,
  maxCols: number,
  random: () => number
): LevelData | null {
  const board = createEmptyBoard(maxRows, maxCols);
  const placed: PlacedIdiom[] = [];
  const usedIdiomTexts = new Set<string>();
  const charIndex = getCharIndex();

  const firstIdiom = idioms[Math.floor(random() * idioms.length)];
  const startRow = Math.floor(maxRows / 2);
  const startCol = Math.floor((maxCols - firstIdiom.chars.length) / 2);
  const firstDirection: Direction = 'horizontal';

  placeIdiomOnBoard(board, firstIdiom, firstDirection, startRow, startCol);
  placed.push({
    id: firstIdiom.id,
    text: firstIdiom.text,
    chars: firstIdiom.chars,
    direction: firstDirection,
    startRow,
    startCol,
  });
  usedIdiomTexts.add(firstIdiom.text);

  for (let iter = 0; iter < targetCount * 10 && placed.length < targetCount; iter++) {
    const lastDirection = placed[placed.length - 1].direction;
    const nextDirection: Direction = lastDirection === 'horizontal' ? 'vertical' : 'horizontal';

    const candidateIndices = getCandidateIdiomIndices(board, maxRows, maxCols, charIndex);
    const shuffledIndices = shuffle(candidateIndices, random);

    let found = false;
    for (const idx of shuffledIndices) {
      const candidateIdiom = idioms[idx];
      if (usedIdiomTexts.has(candidateIdiom.text)) continue;
      const positions = findCrossingPositions(board, candidateIdiom, nextDirection, maxRows, maxCols);
      if (positions.length > 0) {
        const pos = positions[Math.floor(random() * positions.length)];
        placeIdiomOnBoard(board, candidateIdiom, nextDirection, pos.startRow, pos.startCol);
        placed.push({
          id: candidateIdiom.id,
          text: candidateIdiom.text,
          chars: candidateIdiom.chars,
          direction: nextDirection,
          startRow: pos.startRow,
          startCol: pos.startCol,
        });
        usedIdiomTexts.add(candidateIdiom.text);
        found = true;
        break;
      }
    }
    if (!found) break;
  }

  if (placed.length < targetCount) return null;

  let minR = maxRows, maxR = 0, minC = maxCols, maxC = 0;
  for (let r = 0; r < maxRows; r++) {
    for (let c = 0; c < maxCols; c++) {
      if (board[r][c] !== null) {
        minR = Math.min(minR, r);
        maxR = Math.max(maxR, r);
        minC = Math.min(minC, c);
        maxC = Math.max(maxC, c);
      }
    }
  }

  const rows = maxR - minR + 1;
  const cols = maxC - minC + 1;

  const MIN_CELL_PX = 28;
  const GAP_PX = 2;
  const BOARD_PAD_PX = 6;
  const BOARD_BORDER_PX = 1;
  const GAME_PAD_PX = 8;
  const MIN_VP_W = 375;
  const MIN_VP_H = 667;
  const BOARD_H_RATIO = 0.55;
  const containerW = MIN_VP_W - GAME_PAD_PX * 2;
  const containerH = MIN_VP_H * BOARD_H_RATIO;
  const innerW = containerW - BOARD_BORDER_PX * 2 - BOARD_PAD_PX * 2 - GAP_PX * (cols - 1);
  const innerH = containerH - BOARD_BORDER_PX * 2 - BOARD_PAD_PX * 2 - GAP_PX * (rows - 1);
  if (Math.min(innerW / cols, innerH / rows) < MIN_CELL_PX) return null;

  const adjustedPlaced: PlacedIdiom[] = placed.map(p => ({
    ...p,
    startRow: p.startRow - minR,
    startCol: p.startCol - minC,
  }));

  const trimmedBoard = createEmptyBoard(rows, cols);
  const cellIdiomCounts: Map<string, number> = new Map();

  for (const p of adjustedPlaced) {
    for (let i = 0; i < p.chars.length; i++) {
      const r = p.direction === 'vertical' ? p.startRow + i : p.startRow;
      const c = p.direction === 'horizontal' ? p.startCol + i : p.startCol;
      const existing = trimmedBoard[r][c];
      if (!existing) {
        trimmedBoard[r][c] = { char: p.chars[i], idiomIds: [p.id] };
      } else {
        existing.idiomIds.push(p.id);
      }
      const key = `${r},${c}`;
      cellIdiomCounts.set(key, (cellIdiomCounts.get(key) ?? 0) + 1);
    }
  }

  const crossingCellKeys = [...cellIdiomCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([key]) => key);
  const shuffledCrossingKeys = shuffle(crossingCellKeys, random);
  const presetCount = Math.min(Math.max(2, Math.floor(adjustedPlaced.length * 0.4)), 3, crossingCellKeys.length);
  const presetCells: { row: number; col: number; char: string }[] = [];
  const presetSet = new Set<string>();
  for (let i = 0; i < presetCount; i++) {
    const [rStr, cStr] = shuffledCrossingKeys[i].split(',');
    const r = Number(rStr);
    const c = Number(cStr);
    const cell = trimmedBoard[r][c];
    if (cell) {
      presetCells.push({ row: r, col: c, char: cell.char! });
      presetSet.add(shuffledCrossingKeys[i]);
    }
  }

  const charBank: string[] = [];
  const charBankKeys = new Set<string>();
  for (const p of adjustedPlaced) {
    for (let i = 0; i < p.chars.length; i++) {
      const r = p.direction === 'vertical' ? p.startRow + i : p.startRow;
      const c = p.direction === 'horizontal' ? p.startCol + i : p.startCol;
      const key = `${r},${c}`;
      if (!presetSet.has(key) && !charBankKeys.has(key)) {
        charBank.push(p.chars[i]);
        charBankKeys.add(key);
      }
    }
  }

  return { id: levelId, rows, cols, idioms: adjustedPlaced, charBank: shuffle(charBank, random), presetCells };
}
