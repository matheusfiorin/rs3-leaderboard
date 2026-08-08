// Prints the exact strings the rebuilt /skills rows will render, by lifting the
// real label helpers out of app/skills/SkillsClient.tsx (sliced from source, not
// re-typed) and running them over the real player data. Proves the "max"/"100%"
// alternation is gone and every number carries a unit.
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ts from "/home/mbaraofiorin/dev/rs3-leaderboard/v2-src/node_modules/typescript/lib/typescript.js";

const ROOT = "/home/mbaraofiorin/dev/rs3-leaderboard/v2-src";
const dir = mkdtempSync(join(tmpdir(), "skills-labels-"));

const transpile = (code, file) => {
  const js = ts.transpileModule(code, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const out = join(dir, file);
  writeFileSync(out, js);
  return out;
};

const S = await import(transpile(readFileSync(`${ROOT}/lib/skills.ts`, "utf8"), "skills.mjs"));
const F = await import(transpile(readFileSync(`${ROOT}/lib/format.ts`, "utf8"), "format.mjs"));

// Slice the three label helpers out of the component verbatim.
const src = readFileSync(`${ROOT}/app/skills/SkillsClient.tsx`, "utf8");
const slice = (name) => {
  const start = src.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`${name} not found — did it get renamed?`);
  let depth = 0, i = src.indexOf("{", start);
  for (let j = i; j < src.length; j++) {
    if (src[j] === "{") depth++;
    else if (src[j] === "}" && --depth === 0) return src.slice(start, j + 1);
  }
  throw new Error(`unbalanced ${name}`);
};
const helpers = ["meterValue", "meterLabel", "rowTeaser"].map(slice).join("\n\n");
const L = await import(
  transpile(
    `import { fmt, fmtCompact } from "./format.mjs";\n` +
      `const XP_CAP = 200_000_000;\n` +
      helpers + // still TypeScript; transpileModule strips the annotations

      `\nexport { meterValue, meterLabel, rowTeaser };\n`,
    "labels.mjs",
  )
);

const profile = JSON.parse(readFileSync(`${ROOT}/public/data/soclopata_profile.json`, "utf8"));
const rows = profile.skillvalues.slice().sort((a, b) => a.id - b.id);

console.log("SOCLOPATA — what each row now reads\n");
console.log("skill            meter label                meter value        collapsed teaser");
const values = [];
for (const s of rows) {
  const def = S.SKILLS.find((d) => d.id === s.id);
  const p = S.skillProgress(def, s.level, Math.floor(s.xp / 10));
  const value = L.meterValue(p);
  values.push(value);
  console.log(
    "  " + def.key.padEnd(15) +
      L.meterLabel(p).padEnd(26) +
      value.padEnd(19) +
      L.rowTeaser(p, null, 0),
  );
}

let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log("\nFAIL " + m); } else console.log("\nok   " + m); };
// The reviewer's exact complaint: one shape meaning two things.
ok(!values.includes("max"), 'no bare "max" value competing with a bare percentage');
ok(
  values.every((v) => /(%|% of 200M| xp)$/.test(v)),
  "every meter value carries a unit: " + [...new Set(values)].join(" | "),
);
ok(
  !values.includes("100%"),
  "no row claims a plain 100% (200M rows show the XP total instead)",
);
console.log(fails === 0 ? "\nALL PASS" : `\n${fails} FAILURES`);
process.exit(fails === 0 ? 0 : 1);
