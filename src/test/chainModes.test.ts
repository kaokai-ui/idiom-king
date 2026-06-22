import { beforeAll, describe, expect, it } from 'vitest';

import { generateRandomChainLevel, generateRandomChainLevelWithSeed } from '../game/chainLevelSources';
import {
  buildChallengeLevel,
  CHALLENGE_TOTAL_LEVELS,
  getChallengeResumeLevelNumber,
  isChallengeCompleted,
  resetChallengeProgress,
} from '../game/challengePack';
import { ready } from '../data/idiomDb';
import { isBoardViewportSafe, isCharBankViewportSafe, normalizeLevelGenerationConfig } from '../game/levelGenerator';
import {
  buildHighlightedCellKeys,
  getDefaultDirectionForCell,
  getIdiomsAtCell,
} from '../game/chainSelection';
import { countProgressLite } from '../lib/utils';

describe('chain modes', () => {
  beforeAll(async () => {
    await ready;
  });

  it('generateRandomChainLevel returns a playable random level', () => {
    const level = generateRandomChainLevel(3);
    expect(level).not.toBeNull();
    expect(level?.idioms.length ?? 0).toBeGreaterThanOrEqual(5);
    expect(level?.charBank.length ?? 0).toBeGreaterThan(0);
  });

  it('getChallengeResumeLevelNumber advances from completed progress', () => {
    expect(getChallengeResumeLevelNumber({ completedCount: 0, updatedAt: null })).toBe(1);
    expect(getChallengeResumeLevelNumber({ completedCount: 98, updatedAt: null })).toBe(99);
    expect(getChallengeResumeLevelNumber({ completedCount: CHALLENGE_TOTAL_LEVELS, updatedAt: null })).toBeNull();
  });

  it('isChallengeCompleted returns true only when all levels are done', () => {
    expect(isChallengeCompleted({ completedCount: 0, updatedAt: null })).toBe(false);
    expect(isChallengeCompleted({ completedCount: 499, updatedAt: null })).toBe(false);
    expect(isChallengeCompleted({ completedCount: CHALLENGE_TOTAL_LEVELS, updatedAt: null })).toBe(true);
  });

  it('resetChallengeProgress clears completed progress', () => {
    const progress = resetChallengeProgress();
    expect(progress.completedCount).toBe(0);
    expect(progress.updatedAt).not.toBeNull();
  });

  it('generateRandomChainLevelWithSeed produces same level with same seed', () => {
    const seed = 12345;
    const result1 = generateRandomChainLevelWithSeed(1, seed);
    const result2 = generateRandomChainLevelWithSeed(1, seed);
    expect(result1).not.toBeNull();
    expect(result2).not.toBeNull();
    expect(result1!.seed).toBe(result2!.seed);
    expect(result1!.level.idioms.length).toBe(result2!.level.idioms.length);
  });

  it('buildChallengeLevel produces a playable static challenge record', () => {
    const record = buildChallengeLevel(1);
    expect(record).not.toBeNull();
    expect(record?.sequence).toBe(1);
    expect(record?.level.id).toBe(1);
    expect(record?.level.idioms.length ?? 0).toBeGreaterThanOrEqual(5);
  });

  it('normalizes unsafe small-board requests before generation', () => {
    expect(normalizeLevelGenerationConfig({
      targetCount: 8,
      maxRows: 8,
      maxCols: 8,
      maxAttempts: 30,
    }).targetCount).toBe(6);

    expect(normalizeLevelGenerationConfig({
      targetCount: 8,
      maxRows: 12,
      maxCols: 12,
      maxAttempts: 100,
    }).targetCount).toBe(8);
  });

  it('rejects board footprints that are too large for the in-game viewport guard', () => {
    expect(isBoardViewportSafe(9, 10)).toBe(true);
    expect(isBoardViewportSafe(10, 10)).toBe(false);
    expect(isBoardViewportSafe(8, 12)).toBe(false);
  });

  it('rejects char banks that would spill into a third row', () => {
    expect(isCharBankViewportSafe(20)).toBe(true);
    expect(isCharBankViewportSafe(21)).toBe(false);
    expect(isCharBankViewportSafe(22)).toBe(false);
  });

  it('regenerates the reported overflow seeds into two-row char banks', () => {
    const seeds = [1782122006807, 1782137281449, 1782153193472, 1782184033125];
    for (const seed of seeds) {
      const result = generateRandomChainLevelWithSeed(1, seed);
      expect(result).not.toBeNull();
      expect(result!.level.charBank.length).toBeLessThanOrEqual(20);
    }
  });

  it('countProgressLite can render home stats before idiom data is ready', () => {
    const stats = countProgressLite({
      starredIds: ['a'],
      knownIds: ['b', 'c'],
      wordStats: {
        d: { seenCount: 3, lastSeenAt: Date.now() },
      },
    }, 1659);
    expect(stats.totalCount).toBe(1659);
    expect(stats.masteredCount).toBe(3);
    expect(stats.unfamiliarCount).toBe(1656);
  });

  it('test mode defaults crossing cells to horizontal hints first', () => {
    const level = generateRandomChainLevelWithSeed(2, 24680)?.level;
    expect(level).not.toBeNull();
    const crossingIdiom = level!.idioms.find((idiom) => {
      const peers = getIdiomsAtCell(level!.idioms, idiom.startRow, idiom.startCol);
      return peers.length > 1;
    });
    expect(crossingIdiom).toBeTruthy();
    const idiomsAtCrossing = getIdiomsAtCell(level!.idioms, crossingIdiom!.startRow, crossingIdiom!.startCol);
    expect(getDefaultDirectionForCell(idiomsAtCrossing)).toBe('horizontal');
  });

  it('buildHighlightedCellKeys covers every cell of the selected idiom', () => {
    const level = generateRandomChainLevelWithSeed(4, 13579)?.level;
    expect(level).not.toBeNull();
    const idiom = level!.idioms[0];
    const keys = buildHighlightedCellKeys(idiom);
    expect(keys.size).toBe(idiom.chars.length);
    expect(keys.has(`${idiom.startRow}-${idiom.startCol}`)).toBe(true);
  });
});
