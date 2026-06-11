import type { IdiomEntry } from '../types/game';

let _idioms: IdiomEntry[] = [];
let _idiomsById: Record<string, IdiomEntry> = {};
let _idiomIdByText: Record<string, string> = {};
let _charIndex: Map<string, number[]> = new Map();
let _isReady = false;

export const ready: Promise<void> = import('../data/idioms.json').then(mod => {
  const data = (mod.default ?? mod) as IdiomEntry[];
  _idioms = data;
  _idiomsById = Object.fromEntries(data.map(i => [i.id, i]));
  _idiomIdByText = Object.fromEntries(data.map(i => [i.text, i.id]));
  const idx = new Map<string, number[]>();
  for (let i = 0; i < data.length; i++) {
    const seen = new Set<string>();
    for (const ch of data[i].chars) {
      if (!seen.has(ch)) {
        seen.add(ch);
        let arr = idx.get(ch);
        if (!arr) { arr = []; idx.set(ch, arr); }
        arr.push(i);
      }
    }
  }
  _charIndex = idx;
  _isReady = true;
});

export function isDbReady(): boolean { return _isReady; }

export { _idioms as idioms, _idiomsById as idiomsById, _idiomIdByText as idiomIdByText };

export function getCharIndex(): Map<string, number[]> { return _charIndex; }

export function getIdiomById(id: string): IdiomEntry | undefined {
  return _idiomsById[id];
}
