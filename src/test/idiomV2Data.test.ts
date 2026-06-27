import { describe, expect, it } from 'vitest';
import type { IdiomV2Entry, IdiomV2Progress, IdiomV2StarredEntry } from '../types/idiomV2';
import {
  createEntryFromStarred,
  computeStats,
  buildRandomDeck,
  buildUnfamiliarDeck,
  resolveFlashcardIdiom,
} from '../hooks/useIdiomV2App';
import { emptyLevelProgress } from '../lib/idiomV2Storage';
import { LATE_SHOW_IDIOMS } from '../constants/idiomLevels';

const makeEntry = (overrides: Partial<IdiomV2Entry> = {}): IdiomV2Entry => ({
  id: 'idiom2_1',
  sourceNo: '1',
  text: '一毛不拔',
  chars: ['一', '毛', '不', '拔'],
  uniqueChars: ['一', '毛', '不', '拔'],
  charCountMap: { 一: 1, 毛: 1, 不: 1, 拔: 1 },
  bopomofo: 'ㄧ ㄇㄠˊ ㄅㄨˋ ㄅㄚˊ',
  usage: '形容非常吝嗇。',
  level: 'elementary',
  levelLabel: '國小',
  ...overrides,
});

const makeStarredEntry = (overrides: Partial<IdiomV2StarredEntry> = {}): IdiomV2StarredEntry => ({
  id: 'idiom2_1',
  text: '一毛不拔',
  bopomofo: 'ㄧ ㄇㄠˊ ㄅㄨˋ ㄅㄚˊ',
  usage: '形容非常吝嗇。',
  level: 'elementary',
  levelLabel: '國小',
  ...overrides,
});

describe('idiomV2Data: createEntryFromStarred', () => {
  it('creates a full IdiomV2Entry from a starred entry', () => {
    const starred = makeStarredEntry();
    const entry = createEntryFromStarred(starred);
    expect(entry.id).toBe(starred.id);
    expect(entry.text).toBe(starred.text);
    expect(entry.chars).toEqual(starred.text.split(''));
    expect(entry.uniqueChars).toEqual([...new Set(starred.text.split(''))]);
    expect(entry.sourceNo).toBe('1');
  });

  it('computes charCountMap correctly for repeated chars', () => {
    const starred = makeStarredEntry({ text: '好好學習' });
    const entry = createEntryFromStarred(starred);
    expect(entry.charCountMap['好']).toBe(2);
    expect(entry.chars).toEqual(['好', '好', '學', '習']);
  });
});

describe('idiomV2Data: computeStats', () => {
  it('calculates total, mastered, unfamiliar', () => {
    const idioms = [makeEntry({ id: 'a' }), makeEntry({ id: 'b' }), makeEntry({ id: 'c' })];
    const progress: IdiomV2Progress = {
      starredIdioms: [],
      byLevel: {
        elementary: { knownIds: ['a'], wordStats: { b: { seenCount: 3, lastSeenAt: 1 } } },
        junior: { ...emptyLevelProgress },
        senior: { ...emptyLevelProgress },
      },
    };
    const stats = computeStats(idioms, progress, 'elementary');
    expect(stats.totalCount).toBe(3);
    expect(stats.masteredCount).toBe(2);
    expect(stats.unfamiliarCount).toBe(1);
    expect(stats.progressRate).toBe(67);
  });

  it('returns 0 progress for empty idiom list', () => {
    const progress: IdiomV2Progress = {
      starredIdioms: [],
      byLevel: { elementary: { ...emptyLevelProgress }, junior: { ...emptyLevelProgress }, senior: { ...emptyLevelProgress } },
    };
    const stats = computeStats([], progress, 'elementary');
    expect(stats.totalCount).toBe(0);
    expect(stats.progressRate).toBe(0);
  });
});

describe('idiomV2Data: buildRandomDeck and LATE_SHOW_IDIOMS', () => {
  it('places late-show idioms at the end of the random deck', () => {
    const lateId = Object.keys(LATE_SHOW_IDIOMS.elementary)[0];
    const idioms = [
      makeEntry({ id: 'a', text: '成語A' }),
      makeEntry({ id: 'b', text: '成語B' }),
      makeEntry({ id: lateId, text: '羽化登仙' }),
    ];
    const progress: IdiomV2Progress = {
      starredIdioms: [],
      byLevel: { elementary: { ...emptyLevelProgress }, junior: { ...emptyLevelProgress }, senior: { ...emptyLevelProgress } },
    };
    const deck = buildRandomDeck(idioms, progress, 'elementary');
    expect(deck[deck.length - 1].id).toBe(lateId);
  });

  it('does not affect unfamiliar deck', () => {
    const lateId = Object.keys(LATE_SHOW_IDIOMS.elementary)[0];
    const progress: IdiomV2Progress = {
      starredIdioms: [
        makeStarredEntry({ id: 'a', text: '成語A' }),
        makeStarredEntry({ id: lateId, text: '羽化登仙' }),
      ],
      byLevel: { elementary: { ...emptyLevelProgress }, junior: { ...emptyLevelProgress }, senior: { ...emptyLevelProgress } },
    };
    const deck = buildUnfamiliarDeck(progress);
    expect(deck).toHaveLength(2);
  });
});

describe('idiomV2Data: resolveFlashcardIdiom', () => {
  it('returns null for empty deck', () => {
    const session = { flashcards: { idiomIds: [], currentIndex: 0 } };
    const result = resolveFlashcardIdiom(session, {}, [], true);
    expect(result).toBeNull();
  });

  it('returns null when dataReady is false', () => {
    const session = { flashcards: { idiomIds: ['a'], currentIndex: 0 } };
    const result = resolveFlashcardIdiom(session, { a: makeEntry() }, [], false);
    expect(result).toBeNull();
  });

  it('resolves from idiomsById first, then starred', () => {
    const entry = makeEntry({ id: 'x' });
    const session = { flashcards: { idiomIds: ['x'], currentIndex: 0 } };
    const result = resolveFlashcardIdiom(session, { x: entry }, [], true);
    expect(result?.id).toBe('x');
  });

  it('falls back to starred entry when not in idiomsById', () => {
    const starred = makeStarredEntry({ id: 'y' });
    const session = { flashcards: { idiomIds: ['y'], currentIndex: 0 } };
    const result = resolveFlashcardIdiom(session, {}, [starred], true);
    expect(result?.id).toBe('y');
    expect(result?.text).toBe(starred.text);
  });
});

describe('idiomV2Data: charIndex.json existence', () => {
  it('all level charIndex.json files should exist', async () => {
    const fs = await import('fs');
    const path = await import('path');
    for (const level of ['elementary', 'junior', 'senior']) {
      const filePath = path.resolve(`public/data/idioms-v2/levels/${level}/charIndex.json`);
      expect(fs.existsSync(filePath)).toBe(true);
    }
  });
});

describe('idiomV2Data: catalog.json structure', () => {
  it('catalog should have 3 levels with correct keys', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const raw = fs.readFileSync(path.resolve('public/data/idioms-v2/catalog.json'), 'utf-8');
    const catalog = JSON.parse(raw);
    expect(catalog.levels).toHaveLength(3);
    const keys = catalog.levels.map((l: { key: string }) => l.key);
    expect(keys).toContain('elementary');
    expect(keys).toContain('junior');
    expect(keys).toContain('senior');
  });
});
