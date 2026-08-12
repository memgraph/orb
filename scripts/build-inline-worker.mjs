import { build } from 'esbuild';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const entry = join(root, 'src/simulator/types/web-worker-simulator/simulator.worker.ts');
const outDir = join(root, 'dist/simulator/types/web-worker-simulator');
const outBase = join(outDir, 'simulator.worker.inline');

const result = await build({
  entryPoints: [entry],
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'es2020',
  minify: true,
  write: false,
  // Keep third-party license notices (d3-force et al. are BSD/ISC and require the
  // copyright notice be retained in redistributions); collect them at end of file.
  legalComments: 'eof',
});

const source = result.outputFiles[0].text;

await mkdir(outDir, { recursive: true });
await writeFile(`${outBase}.js`, `export default ${JSON.stringify(source)};\n`, 'utf8');
await writeFile(`${outBase}.d.ts`, 'declare const workerSource: string;\nexport default workerSource;\n', 'utf8');

const kb = (source.length / 1024).toFixed(1);
console.log(`[build-inline-worker] wrote ${outBase}.js (${kb} KB self-contained worker)`);
