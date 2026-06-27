import type { IdiomV2Entry, IdiomLevel, IdiomV2Catalog } from '../types/idiomV2';

type LevelCache = {
  idioms: IdiomV2Entry[];
  idiomsById: Record<string, IdiomV2Entry>;
  idiomIdByText: Record<string, string>;
  charIndex: Map<string, number[]>;
};

const levelCache = new Map<IdiomLevel, LevelCache>();
let catalogCache: IdiomV2Catalog | null = null;

const BASE = import.meta.env.BASE_URL;

async function fetchJson<T>(url: string): Promise<T> {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to fetch ${url}: ${resp.status}`);
  return resp.json() as Promise<T>;
}

function buildIdiomIndexes(idioms: IdiomV2Entry[]): {
  idiomsById: Record<string, IdiomV2Entry>;
  idiomIdByText: Record<string, string>;
} {
  const idiomsById: Record<string, IdiomV2Entry> = {};
  const idiomIdByText: Record<string, string> = {};

  for (const entry of idioms) {
    idiomsById[entry.id] = entry;
    idiomIdByText[entry.text] = entry.id;
  }

  return { idiomsById, idiomIdByText };
}

function buildCharIndexFromIdioms(idioms: IdiomV2Entry[]): Map<string, number[]> {
  const charIndex = new Map<string, number[]>();
  for (let i = 0; i < idioms.length; i++) {
    const seen = new Set<string>();
    for (const ch of idioms[i].chars) {
      if (!seen.has(ch)) {
        seen.add(ch);
        let arr = charIndex.get(ch);
        if (!arr) { arr = []; charIndex.set(ch, arr); }
        arr.push(i);
      }
    }
  }
  return charIndex;
}

function parseCharIndexJson(raw: Record<string, number[]>): Map<string, number[]> {
  const charIndex = new Map<string, number[]>();
  for (const [ch, indices] of Object.entries(raw)) {
    charIndex.set(ch, indices);
  }
  return charIndex;
}

export async function loadCatalog(): Promise<IdiomV2Catalog> {
  if (catalogCache) return catalogCache;
  const catalog = await fetchJson<IdiomV2Catalog>(`${BASE}data/idioms-v2/catalog.json`);
  catalogCache = catalog;
  return catalog;
}

export async function loadLevelData(level: IdiomLevel): Promise<LevelCache> {
  const cached = levelCache.get(level);
  if (cached) return cached;

  const catalog = await loadCatalog();
  const levelInfo = catalog.levels.find(l => l.key === level);
  if (!levelInfo) throw new Error(`Level ${level} not found in catalog`);

  const idioms = await fetchJson<IdiomV2Entry[]>(`${BASE}data/idioms-v2/${levelInfo.file}`);

  let charIndex: Map<string, number[]>;
  try {
    const rawCharIndex = await fetchJson<Record<string, number[]>>(`${BASE}data/idioms-v2/levels/${level}/charIndex.json`);
    charIndex = parseCharIndexJson(rawCharIndex);
  } catch {
    charIndex = buildCharIndexFromIdioms(idioms);
  }

  const { idiomsById, idiomIdByText } = buildIdiomIndexes(idioms);
  const result: LevelCache = { idioms, idiomsById, idiomIdByText, charIndex };
  levelCache.set(level, result);
  return result;
}

export function getCachedLevelData(level: IdiomLevel): LevelCache | null {
  return levelCache.get(level) ?? null;
}

export function getCatalogCached(): IdiomV2Catalog | null {
  return catalogCache;
}
