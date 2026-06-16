// Copy ../data/*.json into ./public/data/ so the build emits a self-contained
// /rs3-leaderboard/v2/data/*.json mirror of the legacy data dir. Run from
// the prebuild + predev npm hooks so dev + production share the same view.

import { cpSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const here = new URL('.', import.meta.url).pathname;
const src = join(here, '..', '..', 'data');
const dest = join(here, '..', 'public', 'data');

if (!existsSync(src)) {
  console.error(`sync-data: source missing at ${src}`);
  process.exit(1);
}

rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true });
console.log(`sync-data: ${src} -> ${dest}`);
