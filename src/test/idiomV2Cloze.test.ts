import { describe, expect, it } from 'vitest';

type ClozeEntry = {
  id: string;
  text: string;
  sentences: string[];
};

function generateV2Question(
  entries: ClozeEntry[],
  answerEntry?: ClozeEntry,
): { sentence: string; blankedSentence: string; answerIdiom: string; answerId: string; options: string[] } | null {
  if (entries.length < 4) return null;

  const entry = answerEntry ?? entries[Math.floor(Math.random() * entries.length)];
  const sentences = entry.sentences;
  if (!sentences || sentences.length === 0) return null;

  const sentence = sentences[Math.floor(Math.random() * sentences.length)];

  let blanked = sentence;
  let first = true;
  blanked = blanked.replace(
    new RegExp(entry.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
    () => {
      if (first) {
        first = false;
        return '____';
      }
      return entry.text;
    },
  );
  if (first) return null;

  const wrongOptions = entries
    .map(e => e.text)
    .filter(t => t !== entry.text)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);
  if (wrongOptions.length < 3) return null;

  const options = [entry.text, ...wrongOptions];
  return { sentence, blankedSentence: blanked, answerIdiom: entry.text, answerId: entry.id, options };
}

describe('idiomV2Cloze: cloze data files', () => {
  it('all 3 level cloze json files exist', async () => {
    const fs = await import('fs');
    const path = await import('path');
    for (const level of ['elementary', 'junior', 'senior']) {
      const filePath = path.resolve(`public/data/idioms-v2/cloze/${level}.json`);
      expect(fs.existsSync(filePath)).toBe(true);
    }
  });

  it('each cloze entry has id, text, and at least one sentence', async () => {
    const fs = await import('fs');
    const path = await import('path');
    for (const level of ['elementary', 'junior', 'senior']) {
      const raw = fs.readFileSync(path.resolve(`public/data/idioms-v2/cloze/${level}.json`), 'utf-8');
      const entries: ClozeEntry[] = JSON.parse(raw);
      expect(entries.length).toBeGreaterThan(0);
      for (const entry of entries) {
        expect(entry.id).toMatch(/^idiom2_\d+$/);
        expect(entry.text).toBeTruthy();
        expect(entry.sentences.length).toBeGreaterThan(0);
      }
    }
  });

  it('cloze entry ids start with idiom2_ prefix (v2 namespace)', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const raw = fs.readFileSync(path.resolve('public/data/idioms-v2/cloze/elementary.json'), 'utf-8');
    const entries: ClozeEntry[] = JSON.parse(raw);
    for (const entry of entries) {
      expect(entry.id).toMatch(/^idiom2_/);
    }
  });
});

describe('idiomV2Cloze: question generation logic', () => {
  const makeEntries = (count: number): ClozeEntry[] =>
    Array.from({ length: count }, (_, i) => ({
      id: `idiom2_${i}`,
      text: `測試成語${i}`,
      sentences: [`這是一個測試成語${i}的例句。`],
    }));

  it('returns null when fewer than 4 entries', () => {
    const entries = makeEntries(3);
    const q = generateV2Question(entries);
    expect(q).toBeNull();
  });

  it('returns null when answer has no sentences', () => {
    const entries = makeEntries(5);
    entries[0].sentences = [];
    const q = generateV2Question(entries, entries[0]);
    expect(q).toBeNull();
  });

  it('generates a question with correct structure', () => {
    const entries = makeEntries(10);
    const q = generateV2Question(entries, entries[0]);
    expect(q).not.toBeNull();
    expect(q!.answerIdiom).toBe('測試成語0');
    expect(q!.options).toHaveLength(4);
    expect(q!.options).toContain('測試成語0');
    expect(q!.blankedSentence).toContain('____');
  });

  it('blankedSentence replaces only the first occurrence of answer idiom', () => {
    const entries: ClozeEntry[] = [
      { id: 'a', text: '好好', sentences: ['我要好好學習，好好加油。'] },
      ...makeEntries(5),
    ];
    const q = generateV2Question(entries, entries[0]);
    expect(q).not.toBeNull();
    expect(q!.blankedSentence).toBe('我要____學習，好好加油。');
  });

  it('options contain 4 unique idiom texts', () => {
    const entries = makeEntries(20);
    const q = generateV2Question(entries, entries[0]);
    expect(q).not.toBeNull();
    const unique = new Set(q!.options);
    expect(unique.size).toBe(4);
  });

  it('returns null when sentence does not contain the answer idiom', () => {
    const entries: ClozeEntry[] = [
      { id: 'a', text: '一毛不拔', sentences: ['這句話完全沒有答案成語。'] },
      ...makeEntries(5),
    ];
    const q = generateV2Question(entries, entries[0]);
    expect(q).toBeNull();
  });
});

describe('idiomV2Cloze: cross-level composition', () => {
  it('junior cloze includes all elementary G-col entries plus junior idiomSentences intersection', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const elemRaw = fs.readFileSync(path.resolve('public/data/idioms-v2/cloze/elementary.json'), 'utf-8');
    const elemEntries: ClozeEntry[] = JSON.parse(elemRaw);
    const junRaw = fs.readFileSync(path.resolve('public/data/idioms-v2/cloze/junior.json'), 'utf-8');
    const junEntries: ClozeEntry[] = JSON.parse(junRaw);

    const elemIds = new Set(elemEntries.map(e => e.id));
    const junOnlyIds = junEntries.filter(e => !elemIds.has(e.id));
    const junFromElem = junEntries.filter(e => elemIds.has(e.id));

    expect(junFromElem.length).toBe(elemEntries.length);
    expect(junOnlyIds.length).toBeGreaterThan(0);
  });

  it('senior cloze does not include elementary or junior entries', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const elemRaw = fs.readFileSync(path.resolve('public/data/idioms-v2/cloze/elementary.json'), 'utf-8');
    const junRaw = fs.readFileSync(path.resolve('public/data/idioms-v2/cloze/junior.json'), 'utf-8');
    const senRaw = fs.readFileSync(path.resolve('public/data/idioms-v2/cloze/senior.json'), 'utf-8');
    const elemEntries: ClozeEntry[] = JSON.parse(elemRaw);
    const junEntries: ClozeEntry[] = JSON.parse(junRaw);
    const senEntries: ClozeEntry[] = JSON.parse(senRaw);

    const elemAndJunIds = new Set([...elemEntries, ...junEntries].map(e => e.id));
    for (const entry of senEntries) {
      expect(elemAndJunIds.has(entry.id)).toBe(false);
    }
  });
});

describe('idiomV2Cloze: V1 vs V2 id namespace', () => {
  it('v2 cloze ids use idiom2_ prefix, not v1 idiom_', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const raw = fs.readFileSync(path.resolve('public/data/idioms-v2/cloze/elementary.json'), 'utf-8');
    const entries: ClozeEntry[] = JSON.parse(raw);
    for (const entry of entries) {
      expect(entry.id.startsWith('idiom2_')).toBe(true);
      expect(entry.id.startsWith('idiom_')).toBe(false);
    }
  });
});
