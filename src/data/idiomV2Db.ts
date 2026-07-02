import type { IdiomV2Entry, IdiomLevel } from '../types/idiomV2';
import { loadCatalog, loadLevelData, getCachedLevelData } from './idiomV2DataClient';
import { IDIOM_LEVELS } from '../constants/idiomLevels';

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
    try {
      await loadCatalog();
      _catalogLoaded = true;
    } catch (err) {
      // Catalog unavailable (offline / malformed): fall back to any cached level data below.
      console.error('[idiomV2Db] Failed to load catalog:', err);
    }
  }

  // Fast path: any level already cached synchronously.
  const sync = getIdiomV2ByIdSync(id);
  if (sync) return sync;

  // Otherwise load levels on demand (ensureLevelLoaded re-checks caches itself).
  for (const level of IDIOM_LEVELS) {
    try {
      const idiomsById = await ensureLevelLoaded(level);
      if (idiomsById[id]) return idiomsById[id];
    } catch {
      continue;
    }
  }

  return null;
}

export function getIdiomV2ByIdSync(id: string): IdiomV2Entry | null {
  for (const level of IDIOM_LEVELS) {
    const cached = getCachedLevelData(level);
    if (cached?.idiomsById[id]) {
      return cached.idiomsById[id];
    }
  }
  return null;
}
