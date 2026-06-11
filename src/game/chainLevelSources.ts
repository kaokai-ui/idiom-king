import type { LevelData } from '../types/game';
import { createSeededRandom } from '../lib/utils';
import { generateLevel } from './levelGenerator';

export function generateRandomChainLevel(levelNumber: number): LevelData | null {
  const seed = Date.now() + levelNumber * 15485863 + Math.floor(Math.random() * 1000000);

  for (let attempt = 0; attempt < 6; attempt++) {
    const random = createSeededRandom(seed + attempt * 97);
    const idiomCount = 5 + Math.floor(random() * 4);
    const level = generateLevel(levelNumber, idiomCount, 12, 12, 100, random);
    if (level) {
      return level;
    }
  }

  return null;
}
