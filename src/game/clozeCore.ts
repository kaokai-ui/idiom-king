import { shuffle } from '../lib/utils';

/**
 * Shared cloze (fill-in-the-blank) question logic for v1 and v2. Both versions
 * reduce to "a set of idiom entries with example sentences"; the v1 hook feeds
 * its global text/sentence map in as entries keyed by text, and v2 feeds its
 * per-level fetched entries. The question builder is identical for both.
 */
export type ClozeEntry = {
  id: string;
  text: string;
  sentences: string[];
};

export type ClozeCoreQuestion = {
  sentence: string;
  blankedSentence: string;
  answerIdiom: string;
  answerId: string;
  options: string[];
};

export function pickRandom<T>(arr: T[], count: number, exclude?: Set<T>): T[] {
  const pool = exclude ? arr.filter(x => !exclude.has(x)) : [...arr];
  const result: T[] = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    result.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return result;
}

export function buildClozeQuestion(
  entries: ClozeEntry[],
  answerEntry?: ClozeEntry,
): ClozeCoreQuestion | null {
  if (entries.length < 4) return null;

  const entry = answerEntry ?? entries[Math.floor(Math.random() * entries.length)];
  const sentences = entry.sentences;
  if (!sentences || sentences.length === 0) return null;

  const sentence = sentences[Math.floor(Math.random() * sentences.length)];

  let blanked = sentence;
  let first = true;
  blanked = blanked.replace(new RegExp(entry.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), () => {
    if (first) {
      first = false;
      return '____';
    }
    return entry.text;
  });
  if (first) return null;

  const wrongOptions = pickRandom(
    entries.map(e => e.text),
    3,
    new Set([entry.text]),
  );
  if (wrongOptions.length < 3) return null;

  const options = shuffle([entry.text, ...wrongOptions]);

  return { sentence, blankedSentence: blanked, answerIdiom: entry.text, answerId: entry.id, options };
}
