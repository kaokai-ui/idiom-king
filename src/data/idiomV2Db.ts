import type { IdiomV2Entry, IdiomLevel } from '../types/idiomV2';
import { loadCatalog, loadLevelData, getCachedLevelData } from './idiomV2DataClient';

const globalIdiomsByLevel = new Map<IdiomLevel, Record<string, IdiomV2Entry>>();
let _catalogLoaded = false;

async function ensureLevelLoaded(level: IdiomLevel): Promise<Record<string, IdiomV2Entry>> {
  const cached = globalIdiomsByLevel.get(level);
  if (cached) return cached;

  const data = getCachedLevelData(level);
  if (data) {
    globalIdiomsByLevel.set(level, data.idiomsById);
    return data.idiomsById;
  }

  const loaded = await loadLevelData(level);
  globalIdiomsByLevel.set(level, loaded.idiomsById);
  return loaded.idiomsById;
}

export async function getIdiomV2ByIdGlobal(id: string): Promise<IdiomV2Entry | null> {
  if (!_catalogLoaded) {
    await loadCatalog();
    _catalogLoaded = true;
  }

  const levels: IdiomLevel[] = ['elementary', 'junior', 'senior'];
  for (const level of levels) {
    const cached = getCachedLevelData(level);
    if (cached && cached.idiomsById[id]) {
      return cached.idiomsById[id];
    }
  }

  for (const level of levels) {
    if (!globalIdiomsByLevel.has(level) && !getCachedLevelData(level)) {
      try {
        const idiomsById = await ensureLevelLoaded(level);
        if (idiomsById[id]) return idiomsById[id];
      } catch {
        continue;
      }
    }
  }

  return null;
}

export function getIdiomV2ByIdSync(id: string): IdiomV2Entry | null {
  const levels: IdiomLevel[] = ['elementary', 'junior', 'senior'];
  for (const level of levels) {
    const cached = getCachedLevelData(level);
    if (cached?.idiomsById[id]) {
      return cached.idiomsById[id];
    }
  }
  return null;
}
