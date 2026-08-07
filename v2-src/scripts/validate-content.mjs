// Content integrity checks that a type system cannot catch.
//
// Two whole classes of bug shipped silently in the previous version of this
// app because nothing verified the *strings*:
//
//   1. A quest requirement whose title does not exactly match RuneMetrics —
//      including the " (miniquest)" suffix on the 49 miniquests it tracks —
//      can never be satisfied. The goal just sits at 99% forever.
//   2. A money-making recipe referencing an item id that is absent from the GE
//      price cache silently prices that item at 0, corrupting the profit number.
//
// Run from the v2-src directory. Exits non-zero on any failure so it can gate
// a build.

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const DATA = "public/data";
const CONTENT = "lib/content";

let failures = 0;
const fail = (msg) => {
  console.error(`  ✗ ${msg}`);
  failures++;
};

function loadJson(name) {
  const p = join(DATA, name);
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

const contentFiles = existsSync(CONTENT)
  ? readdirSync(CONTENT).filter((f) => f.endsWith(".ts"))
  : [];

if (!contentFiles.length) {
  console.error("validate-content: no content modules found");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// 1. Quest titles
// ---------------------------------------------------------------------------

console.log("Quest requirement titles");
const questJson = loadJson("decxus_quests.json");
if (!questJson?.quests?.length) {
  console.log("  ~ no quest cache available, skipping");
} else {
  const real = new Set(questJson.quests.map((q) => q.title));
  let checked = 0;
  const seen = new Set();

  for (const f of contentFiles) {
    const src = readFileSync(join(CONTENT, f), "utf8");
    const re = /kind:\s*"quest"\s*,\s*title:\s*"((?:[^"\\]|\\.)*)"/g;
    let m;
    while ((m = re.exec(src))) {
      checked++;
      const title = m[1].replace(/\\"/g, '"');
      if (real.has(title) || seen.has(`${f}:${title}`)) continue;
      seen.add(`${f}:${title}`);

      // Offer the closest real title — nearly every miss is a suffix or
      // spacing slip, so naming the candidate turns a 10-minute hunt into a
      // one-line fix.
      const bare = title.replace(/\s*\(miniquest\)$/, "").toLowerCase();
      const near = [...real].find(
        (r) => r.toLowerCase().replace(/\s*\(miniquest\)$/, "") === bare,
      );
      fail(
        `${f}: quest "${title}" not in RuneMetrics` +
          (near ? ` — did you mean "${near}"?` : ""),
      );
    }
  }
  console.log(`  ${checked} quest requirements checked`);
}

// ---------------------------------------------------------------------------
// 2. Money recipe item ids
// ---------------------------------------------------------------------------

console.log("Money recipe item ids");
const prices = loadJson("ge_prices.json");
if (!prices) {
  console.log("  ~ no GE price cache available, skipping");
} else {
  const moneyPath = join(CONTENT, "money.ts");
  if (!existsSync(moneyPath)) {
    console.log("  ~ no money module, skipping");
  } else {
    const src = readFileSync(moneyPath, "utf8");
    // Only ids inside a recipe's inputs/outputs matter for pricing.
    const recipeBlocks = src.match(/recipe:\s*\{[\s\S]*?\n\s{0,8}\}/g) ?? [];
    const ids = new Set();
    for (const block of recipeBlocks) {
      const re = /\bid:\s*(\d+)/g;
      let m;
      while ((m = re.exec(block))) ids.add(m[1]);
    }
    for (const id of ids) {
      if (!prices[id]) fail(`money.ts: recipe item id ${id} has no GE price`);
    }
    console.log(`  ${ids.size} recipe item ids checked`);
  }
}

// ---------------------------------------------------------------------------
// 3. Skill ids in range
// ---------------------------------------------------------------------------

console.log("Skill requirement ids");
{
  let checked = 0;
  for (const f of contentFiles) {
    const src = readFileSync(join(CONTENT, f), "utf8");
    const re = /kind:\s*"skill"\s*,\s*skill:\s*(\d+)\s*,\s*level:\s*(\d+)/g;
    let m;
    while ((m = re.exec(src))) {
      checked++;
      const id = +m[1];
      const lvl = +m[2];
      if (id < 0 || id > 28) fail(`${f}: skill id ${id} out of range 0-28`);
      if (lvl < 1 || lvl > 150) fail(`${f}: skill level ${lvl} out of range 1-150`);
    }
  }
  console.log(`  ${checked} skill requirements checked`);
}

// ---------------------------------------------------------------------------

if (failures) {
  console.error(`\nvalidate-content: ${failures} problem(s)`);
  process.exit(1);
}
console.log("\nvalidate-content: all checks passed");
