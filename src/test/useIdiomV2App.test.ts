import { describe, expect, it } from 'vitest';
import type { IdiomV2Entry, IdiomV2Progress } from '../types/idiomV2';
import {
  computeStats,
  buildRandomDeck,
  buildUnfamiliarDeck,
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
  bopomofo: '',
  usage: '',
  level: 'elementary',
  levelLabel: '國小',
  ...overrides,
});

const makeProgress = (overrides: Partial<IdiomV2Progress> = {}): IdiomV2Progress => ({
  starredIdioms: [],
  byLevel: { elementary: { ...emptyLevelProgress }, junior: { ...emptyLevelProgress }, senior: { ...emptyLevelProgress } },
  ...overrides,
});

describe('useIdiomV2App helpers: stats with level switching', () => {
  it('stats.totalCount changes per level', () => {
    const idiomsEdu = Array.from({ length: 10 }, (_, i) => makeEntry({ id: `e${i}`, level: 'elementary' }));
    const idiomsJun = Array.from({ length: 20 }, (_, i) => makeEntry({ id: `j${i}`, level: 'junior' }));

    const progress = makeProgress();
    const statsEdu = computeStats(idiomsEdu, progress, 'elementary');
    expect(statsEdu.totalCount).toBe(10);

    const statsJun = computeStats(idiomsJun, progress, 'junior');
    expect(statsJun.totalCount).toBe(20);
  });

  it('mastered count only reflects current level', () => {
    const idioms = Array.from({ length: 5 }, (_, i) => makeEntry({ id: `e${i}`, level: 'elementary' }));
    const progress = makeProgress({
      byLevel: {
        elementary: { knownIds: ['e0', 'e1'], wordStats: {} },
        junior: { knownIds: ['j0'], wordStats: {} },
        senior: { ...emptyLevelProgress },
      },
    });
    const stats = computeStats(idioms, progress, 'elementary');
    expect(stats.masteredCount).toBe(2);
  });
});

describe('useIdiomV2App helpers: random deck only uses current level', () => {
  it('random deck includes all non-starred, non-known idioms of current level', () => {
    const idioms = [
      makeEntry({ id: 'a' }),
      makeEntry({ id: 'b' }),
    ];
    const progress = makeProgress();
    const deck = buildRandomDeck(idioms, progress, 'elementary');
    expect(deck.map(d => d.id).sort()).toEqual(['a', 'b']);
  });

  it('random deck excludes starred idioms', () => {
    const idioms = [makeEntry({ id: 'a' }), makeEntry({ id: 'b' })];
    const progress = makeProgress({
      starredIdioms: [{ id: 'a', text: '一毛不拔', bopomofo: '', usage: '', level: 'elementary', levelLabel: '國小' }],
    });
    const deck = buildRandomDeck(idioms, progress, 'elementary');
    expect(deck.map(d => d.id)).toEqual(['b']);
  });

  it('random deck excludes known idioms', () => {
    const idioms = [makeEntry({ id: 'a' }), makeEntry({ id: 'b' })];
    const progress = makeProgress({
      byLevel: {
        elementary: { knownIds: ['a'], wordStats: {} },
        junior: { ...emptyLevelProgress },
        senior: { ...emptyLevelProgress },
      },
    });
    const deck = buildRandomDeck(idioms, progress, 'elementary');
    expect(deck.map(d => d.id)).toEqual(['b']);
  });

  it('late-show idioms appear at end of random deck', () => {
    const lateId = Object.keys(LATE_SHOW_IDIOMS.elementary)[0];
    const idioms = [
      makeEntry({ id: 'a', text: '成語A' }),
      makeEntry({ id: 'b', text: '成語B' }),
      makeEntry({ id: lateId, text: '羽化登仙' }),
    ];
    const progress = makeProgress();
    const deck = buildRandomDeck(idioms, progress, 'elementary');
    const lateIndex = deck.findIndex(d => d.id === lateId);
    expect(lateIndex).toBe(deck.length - 1);
  });
});

describe('useIdiomV2App helpers: unfamiliar deck includes cross-level', () => {
  it('unfamiliar deck includes idioms from all levels', () => {
    const progress = makeProgress({
      starredIdioms: [
        { id: 'a', text: '一毛不拔', bopomofo: '', usage: '', level: 'elementary', levelLabel: '國小' },
        { id: 'b', text: '口若懸河', bopomofo: '', usage: '', level: 'junior', levelLabel: '國中' },
      ],
    });
    const deck = buildUnfamiliarDeck(progress);
    const ids = deck.map(d => d.id);
    expect(ids).toContain('a');
    expect(ids).toContain('b');
  });

  it('unfamiliar deck is empty when no starred idioms', () => {
    const progress = makeProgress();
    const deck = buildUnfamiliarDeck(progress);
    expect(deck).toHaveLength(0);
  });
});
