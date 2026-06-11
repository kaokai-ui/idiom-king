import type { Cell, CharTile, LevelData } from '../types/game';

export function buildBoardFromLevel(level: LevelData): Cell[][] {
  const presetSet = new Set(level.presetCells.map(p => `${p.row},${p.col}`));
  const board: Cell[][] = Array.from({ length: level.rows }, (_, r) =>
    Array.from({ length: level.cols }, (_, c) => {
      const key = `${r},${c}`;
      const isPreset = presetSet.has(key);
      const presetCell = isPreset ? level.presetCells.find(p => p.row === r && p.col === c) : undefined;
      return {
        row: r,
        col: c,
        isActive: false,
        answer: '',
        currentValue: (isPreset && presetCell ? presetCell.char : null) as string | null,
        idiomIds: [] as string[],
        isPreset,
      };
    })
  );

  for (const idiom of level.idioms) {
    for (let i = 0; i < idiom.chars.length; i++) {
      const r = idiom.direction === 'vertical' ? idiom.startRow + i : idiom.startRow;
      const c = idiom.direction === 'horizontal' ? idiom.startCol + i : idiom.startCol;
      const cell = board[r][c];
      cell.isActive = true;
      cell.answer = idiom.chars[i];
      if (!cell.idiomIds.includes(idiom.id)) {
        cell.idiomIds.push(idiom.id);
      }
    }
  }
  return board;
}

export function createCharTiles(charBank: string[]): CharTile[] {
  return charBank.map((char, index) => ({
    id: `tile_${index}`,
    value: char,
    used: false,
    cellRef: null as string | null,
  }));
}

export function isBoardComplete(board: Cell[][]): boolean {
  for (const row of board) {
    for (const cell of row) {
      if (cell.isActive && cell.currentValue === null) return false;
    }
  }
  return true;
}

export function isBoardCorrect(board: Cell[][]): boolean {
  for (const row of board) {
    for (const cell of row) {
      if (cell.isActive && cell.currentValue !== cell.answer) return false;
    }
  }
  return true;
}

export function countFilledCells(board: Cell[][]): number {
  let count = 0;
  for (const row of board) {
    for (const cell of row) {
      if (cell.isActive && cell.currentValue !== null) count++;
    }
  }
  return count;
}

export function countActiveCells(board: Cell[][]): number {
  let count = 0;
  for (const row of board) {
    for (const cell of row) {
      if (cell.isActive) count++;
    }
  }
  return count;
}

export function getWrongCells(board: Cell[][]): { row: number; col: number }[] {
  const wrong: { row: number; col: number }[] = [];
  for (const row of board) {
    for (const cell of row) {
      if (cell.isActive && cell.currentValue !== null && cell.currentValue !== cell.answer) {
        wrong.push({ row: cell.row, col: cell.col });
      }
    }
  }
  return wrong;
}

export function getCellKey(row: number, col: number): string {
  return `${row}-${col}`;
}

export function findTileByCellRef(tiles: CharTile[], cellKey: string): CharTile | undefined {
  return tiles.find(t => t.cellRef === cellKey);
}
