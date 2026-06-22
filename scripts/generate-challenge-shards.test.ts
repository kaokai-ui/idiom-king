import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { ready } from '../src/data/idiomDb';
import {
  CHALLENGE_PACK_VERSION,
  CHALLENGE_SHARD_SIZE,
  buildChallengeManifest,
  buildChallengeShards,
  generateChallengeRecords,
} from '../src/game/challengePack';

const OUTPUT_DIR = resolve('public', 'challenge');
const maybeIt = process.env.GENERATE_CHALLENGE_SHARDS === '1' ? it : it.skip;

describe('generate challenge shards', () => {
  beforeAll(async () => {
    await ready;
  });

  maybeIt('writes the static challenge manifest and shard json files', () => {
    const generatedAt = new Date().toISOString();
    const levels = generateChallengeRecords();
    const manifest = buildChallengeManifest(levels, generatedAt, CHALLENGE_SHARD_SIZE);
    const shards = buildChallengeShards(levels, generatedAt, CHALLENGE_SHARD_SIZE);

    mkdirSync(OUTPUT_DIR, { recursive: true });
    for (const fileName of readdirSync(OUTPUT_DIR)) {
      if (fileName.endsWith('.json')) {
        rmSync(join(OUTPUT_DIR, fileName), { force: true });
      }
    }

    writeFileSync(
      join(OUTPUT_DIR, 'manifest.json'),
      `${JSON.stringify(manifest, null, 2)}\n`,
      'utf-8',
    );

    for (const shard of shards) {
      const fileName = `chunk-${String(shard.shardIndex).padStart(3, '0')}.json`;
      writeFileSync(join(OUTPUT_DIR, fileName), `${JSON.stringify(shard, null, 2)}\n`, 'utf-8');
    }

    expect(manifest.version).toBe(CHALLENGE_PACK_VERSION);
    expect(manifest.totalLevels).toBe(levels.length);
    expect(shards.length).toBe(Math.ceil(levels.length / CHALLENGE_SHARD_SIZE));
  }, 300000);
});
