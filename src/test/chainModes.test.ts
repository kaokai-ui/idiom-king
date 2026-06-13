import { beforeAll, describe, expect, it } from 'vitest';

import { generateRandomChainLevel, generateRandomChainLevelWithSeed } from '../game/chainLevelSources';
import {
  CHALLENGE_TOTAL_LEVELS,
  getChallengeResumeLevelNumber,
  isChallengeCompleted,
  resetChallengeProgress,
} from '../game/challengePack';
import { ready } from '../data/idiomDb';
import { normalizeLevelGenerationConfig } from '../game/levelGenerator';
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
});
