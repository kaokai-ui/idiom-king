import { spawn } from 'node:child_process';
import path from 'node:path';

const vitestEntry = path.resolve('node_modules/vitest/vitest.mjs');

const child = spawn(
  process.execPath,
  [vitestEntry, 'run', 'src/test/levelGenSimulation.test.ts'],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      RUN_LEVELGEN_SIM: '1',
    },
  },
);

child.on('exit', (code) => {
  process.exit(code ?? 1);
});
