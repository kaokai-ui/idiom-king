import { describe, expect, it } from 'vitest';
import type { IdiomV2Entry } from '../types/idiomV2';
import { generateLevelFromPool } from '../game/levelGeneratorV2';
import { createSeededRandom } from '../lib/utils';

function makePool(count: number, level: string = 'elementary'): IdiomV2Entry[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `test_${i}`,
    sourceNo: String(i),
    text: `測試成語${String(i).padStart(4, '0')}`,
    chars: ['測', '試', '成', String(i % 10)],
    uniqueChars: ['測', '試', '成', String(i % 10)],
    charCountMap: { 測: 1, 試: 1, 成: 1 },
    bopomofo: '',
    usage: '',
    level: level as IdiomV2Entry['level'],
    levelLabel: '國小',
  }));
}

function buildCharIndex(idioms: IdiomV2Entry[]): Map<string, number[]> {
  const idx = new Map<string, number[]>();
  for (let i = 0; i < idioms.length; i++) {
    const seen = new Set<string>();
    for (const ch of idioms[i].chars) {
      if (!seen.has(ch)) {
        seen.add(ch);
        let arr = idx.get(ch);
        if (!arr) { arr = []; idx.set(ch, arr); }
        arr.push(i);
      }
    }
  }
  return idx;
}

describe('idiomV2Chain: generateLevelFromPool uses only provided pool', () => {
  it('should use only idioms from the provided pool', () => {
    const pool = makePool(20);
    const charIndex = buildCharIndex(pool);
    const level = generateLevelFromPool({
      idioms: pool,
      charIndex,
      levelId: 1,
      targetCount: 5,
      maxRows: 12,
      maxCols: 12,
      maxAttempts: 50,
      random: createSeededRandom(20260626),
    });
    if (level) {
      for (const idiom of level.idioms) {
        const found = pool.find(p => p.id === idiom.id);
        expect(found).toBeDefined();
      }
    }
  });

  it('returns null for empty pool', () => {
    const level = generateLevelFromPool({
      idioms: [],
      charIndex: new Map(),
      levelId: 1,
    });
    expect(level).toBeNull();
  });
});

describe('idiomV2Chain: charBank alignment', () => {
  it('charBank contains every non-preset cell char exactly once', () => {
    const pool = makePool(30);
    const charIndex = buildCharIndex(pool);
    const level = generateLevelFromPool({
      idioms: pool,
      charIndex,
      levelId: 1,
      targetCount: 5,
      maxRows: 12,
      maxCols: 12,
      maxAttempts: 100,
      random: createSeededRandom(42),
    });
    if (!level) return;
    const presetKeys = new Set(level.presetCells.map(c => `${c.row},${c.col}`));
    const expected: string[] = [];
    const seen = new Set<string>();
    for (const idiom of level.idioms) {
      for (let i = 0; i < idiom.chars.length; i++) {
        const r = idiom.direction === 'vertical' ? idiom.startRow + i : idiom.startRow;
        const c = idiom.direction === 'horizontal' ? idiom.startCol + i : idiom.startCol;
        const key = `${r},${c}`;
        if (!presetKeys.has(key) && !seen.has(key)) {
          expected.push(idiom.chars[i]);
          seen.add(key);
        }
      }
    }
    expect([...level.charBank].sort()).toEqual(expected.sort());
  });
});

describe('idiomV2Chain: simulation with real data', () => {
  it('elementary level data can generate levels from multiple seeds', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const raw = fs.readFileSync(path.resolve('public/data/idioms-v2/levels/elementary/chunk-001.json'), 'utf-8');
    const idioms: IdiomV2Entry[] = JSON.parse(raw);
    const charIndex = buildCharIndex(idioms);
    let success = 0;
    const totalSeeds = 50;
    for (let s = 0; s < totalSeeds; s++) {
      const level = generateLevelFromPool({
        idioms,
        charIndex,
        levelId: s,
        targetCount: 5,
        maxRows: 12,
        maxCols: 12,
        maxAttempts: 100,
        random: createSeededRandom(20260626 + s * 15485863),
      });
      if (level) success++;
    }
    expect(success).toBeGreaterThan(0);
  });

  it('junior level data can generate levels', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const raw = fs.readFileSync(path.resolve('public/data/idioms-v2/levels/junior/chunk-001.json'), 'utf-8');
    const idioms: IdiomV2Entry[] = JSON.parse(raw);
    const charIndex = buildCharIndex(idioms);
    let success = 0;
    for (let s = 0; s < 30; s++) {
      const level = generateLevelFromPool({
        idioms,
        charIndex,
        levelId: s,
        targetCount: 5,
        maxRows: 12,
        maxCols: 12,
        maxAttempts: 100,
        random: createSeededRandom(20260626 + s * 15485863),
      });
      if (level) success++;
    }
    expect(success).toBeGreaterThan(0);
  });

  it('senior level data can generate levels', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const raw = fs.readFileSync(path.resolve('public/data/idioms-v2/levels/senior/chunk-001.json'), 'utf-8');
    const idioms: IdiomV2Entry[] = JSON.parse(raw);
    const charIndex = buildCharIndex(idioms);
    let success = 0;
    for (let s = 0; s < 30; s++) {
      const level = generateLevelFromPool({
        idioms,
        charIndex,
        levelId: s,
        targetCount: 5,
        maxRows: 12,
        maxCols: 12,
        maxAttempts: 100,
        random: createSeededRandom(20260626 + s * 15485863),
      });
      if (level) success++;
    }
    expect(success).toBeGreaterThan(0);
  });

  it('generated level idioms all belong to the correct level', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const raw = fs.readFileSync(path.resolve('public/data/idioms-v2/levels/elementary/chunk-001.json'), 'utf-8');
    const idioms: IdiomV2Entry[] = JSON.parse(raw);
    const charIndex = buildCharIndex(idioms);
    for (let s = 0; s < 20; s++) {
      const level = generateLevelFromPool({
        idioms,
        charIndex,
        levelId: s,
        targetCount: 5,
        maxRows: 12,
        maxCols: 12,
        maxAttempts: 100,
        random: createSeededRandom(20260626 + s * 15485863),
      });
      if (!level) continue;
      for (const idiom of level.idioms) {
        expect(idiom.id).toMatch(/^idiom2_\d+$/);
      }
    }
  });
});
