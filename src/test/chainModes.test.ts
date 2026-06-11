import { beforeAll, describe, expect, it } from 'vitest';

import { generateRandomChainLevel } from '../game/chainLevelSources';
import { CHALLENGE_TOTAL_LEVELS, getChallengeResumeLevelNumber } from '../game/challengePack';
import { ready } from '../data/idiomDb';
import { normalizeLevelGenerationConfig } from '../game/levelGenerator';

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
    expect(getChallengeResumeLevelNumber({ completedCount: CHALLENGE_TOTAL_LEVELS, updatedAt: null })).toBe(CHALLENGE_TOTAL_LEVELS);
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
});
