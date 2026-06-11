import { beforeAll, describe, expect, it } from 'vitest';

import { generateRandomChainLevel } from '../game/chainLevelSources';
import { CHALLENGE_TOTAL_LEVELS, getChallengeResumeLevelNumber } from '../game/challengePack';
import { ready } from '../data/idiomDb';

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
});
