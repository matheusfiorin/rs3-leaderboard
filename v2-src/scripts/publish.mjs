// Move the .dist build artefact to repo-root /docs so GitHub Pages serves it
// under /rs3-leaderboard/. distDir can't navigate above projectPath under
// Turbopack, so the move happens out-of-band here.
//
// `.nojekyll` is written into the output because Pages' legacy Jekyll build
// otherwise drops every `_next/*` path (leading underscore means "private" to
// Jekyll), which silently 404s the entire JS bundle.

import { cpSync, rmSync, existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const here = new URL(".", import.meta.url).pathname;
const src = join(here, "..", ".dist");
const dest = join(here, "..", "..", "docs");

if (!existsSync(src)) {
  console.error(`publish: build output missing at ${src}`);
  process.exit(1);
}

rmSync(dest, { recursive: true, force: true });
cpSync(src, dest, { recursive: true });
writeFileSync(join(dest, ".nojekyll"), "");
console.log(`publish: ${src} -> ${dest}`);
