// Move the .v2-dist build artefact to repo-root /v2/ so GH Pages serves it
// under /rs3-leaderboard/v2/. distDir can't navigate above projectPath under
// Turbopack, so we do the move out-of-band.

import { cpSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";

const here = new URL(".", import.meta.url).pathname;
const src = join(here, "..", ".v2-dist");
const dest = join(here, "..", "..", "v2");

if (!existsSync(src)) {
  console.error(`publish: build output missing at ${src}`);
  process.exit(1);
}

rmSync(dest, { recursive: true, force: true });
cpSync(src, dest, { recursive: true });
console.log(`publish: ${src} -> ${dest}`);
