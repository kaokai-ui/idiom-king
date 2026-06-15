import type { Direction, PlacedIdiom } from '../types/game';

export function idiomOccupiesCell(idiom: PlacedIdiom, row: number, col: number): boolean {
  for (let index = 0; index < idiom.chars.length; index++) {
    const cellRow = idiom.direction === 'vertical' ? idiom.startRow + index : idiom.startRow;
    const cellCol = idiom.direction === 'horizontal' ? idiom.startCol + index : idiom.startCol;
    if (cellRow === row && cellCol === col) {
      return true;
    }
  }
  return false;
}

export function getIdiomsAtCell(idioms: PlacedIdiom[], row: number, col: number): PlacedIdiom[] {
  return idioms.filter((idiom) => idiomOccupiesCell(idiom, row, col));
}

export function getDefaultDirectionForCell(idioms: PlacedIdiom[]): Direction | null {
  if (idioms.length === 0) return null;
  const horizontal = idioms.find((idiom) => idiom.direction === 'horizontal');
  return horizontal?.direction ?? idioms[0].direction;
}

export function getIdiomForDirection(idioms: PlacedIdiom[], direction: Direction | null): PlacedIdiom | null {
  if (!direction) return null;
  return idioms.find((idiom) => idiom.direction === direction) ?? null;
}

export function buildHighlightedCellKeys(idiom: PlacedIdiom | null): Set<string> {
  if (!idiom) return new Set<string>();
  const keys = new Set<string>();
  for (let index = 0; index < idiom.chars.length; index++) {
    const row = idiom.direction === 'vertical' ? idiom.startRow + index : idiom.startRow;
    const col = idiom.direction === 'horizontal' ? idiom.startCol + index : idiom.startCol;
    keys.add(`${row}-${col}`);
  }
  return keys;
}
