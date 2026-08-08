// Verifies lib/skills.ts against the published RS3 XP tables and against the
// real Soclopata data that produced the "everything is 100%" blocker.
// Transpiles the single module in-memory with the TypeScript API (no project
// build, no incremental cache touched).
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ts from "/home/mbaraofiorin/dev/rs3-leaderboard/v2-src/node_modules/typescript/lib/typescript.js";

const SRC = "/home/mbaraofiorin/dev/rs3-leaderboard/v2-src/lib/skills.ts";
const js = ts.transpileModule(readFileSync(SRC, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const dir = mkdtempSync(join(tmpdir(), "skills-"));
const out = join(dir, "skills.mjs");
writeFileSync(out, js);
const S = await import(out);

let fails = 0;
const ok = (cond, msg) => {
  if (!cond) { fails++; console.log("FAIL " + msg); } else { console.log("ok   " + msg); }
};

// --- published anchors -----------------------------------------------------
ok(S.xpForLevel(99) === 13034431, `standard 99 = 13,034,431 (got ${S.xpForLevel(99)})`);
ok(S.xpForLevel(110) === 38737661, `standard 110 = 38,737,661 (got ${S.xpForLevel(110)})`);
ok(S.xpForLevel(120) === 104273167, `standard 120 = 104,273,167 (got ${S.xpForLevel(120)})`);
ok(S.xpForLevel(126) === 188884740, `standard 126 = 188,884,740 (got ${S.xpForLevel(126)})`);
ok(S.xpForLevel(2, "elite") === 830, `elite 2 = 830 (got ${S.xpForLevel(2, "elite")})`);
ok(S.xpForLevel(99, "elite") === 36073511, `elite 99 = 36,073,511 (got ${S.xpForLevel(99, "elite")})`);
ok(S.xpForLevel(120, "elite") === 80618654, `elite 120 = 80,618,654 (got ${S.xpForLevel(120, "elite")})`);
ok(S.xpForLevel(150, "elite") === 194927409, `elite 150 = 194,927,409 (got ${S.xpForLevel(150, "elite")})`);
ok(S.curveForSkill(26) === "elite", "Invention uses the elite curve");
ok(S.curveForSkill(27) === "standard", "Archaeology uses the standard curve");
ok(S.SKILLS.length === 29, "29 skills");
ok(S.SKILLS.reduce((n, s) => n + s.max, 0) === 3232, `max total level = 3232 (got ${S.SKILLS.reduce((n, s) => n + s.max, 0)})`);

// --- monotonic tables ------------------------------------------------------
for (const curve of ["standard", "elite"]) {
  const top = curve === "elite" ? 150 : 126;
  let mono = true;
  for (let L = 2; L <= top; L++) if (S.xpForLevel(L, curve) <= S.xpForLevel(L - 1, curve)) mono = false;
  ok(mono, `${curve} table strictly increasing to ${top}`);
  let round = true;
  for (let L = 1; L <= top; L++) if (S.levelFromXp(S.xpForLevel(L, curve), curve) !== L) round = false;
  ok(round, `${curve} levelFromXp(xpForLevel(L)) === L`);
}

// --- the actual blocker ----------------------------------------------------
const profile = JSON.parse(
  readFileSync("/home/mbaraofiorin/dev/rs3-leaderboard/v2-src/public/data/soclopata_profile.json", "utf8"),
);
const rows = profile.skillvalues
  .slice()
  .sort((a, b) => a.id - b.id)
  .map((s) => {
    const def = S.SKILLS.find((d) => d.id === s.id);
    const p = S.skillProgress(def, s.level, Math.floor(s.xp / 10));
    return { name: def.key, cap: def.max, reported: s.level, ...p };
  });

console.log("\n  skill            cap  lvl  virt        xp   state          pct");
for (const r of rows) {
  console.log(
    "  " + r.name.padEnd(15) + String(r.cap).padStart(4) + String(r.level).padStart(5) +
    String(r.virtualLevel).padStart(6) + String(r.xp).padStart(11) + "   " +
    r.state.padEnd(14) + r.pct.toFixed(1).padStart(6),
  );
}

// Before the fix all 29 rows rendered 100%. Only the five skills actually
// holding 200,000,000 XP should.
const hundreds = rows.filter((r) => Math.round(r.pct) === 100);
ok(
  hundreds.length === 5 && hundreds.every((r) => r.xp === 200_000_000),
  `only the 200M skills read 100% (got ${hundreds.length}: ${hundreds.map((h) => h.name).join(", ")})`,
);
ok(rows.every((r) => r.state !== "xp-capped" || r.xp >= 200_000_000), "xp-capped only at 200M");
const inv = rows.find((r) => r.name === "Invention");
// elite 142 = 157,401,983 and 143 = 161,784,728, so 161,081,547 buys 142.
ok(inv.virtualLevel === 142, `Invention 161,081,547 elite xp = virtual level 142 (got ${inv.virtualLevel})`);
ok(inv.cap === 120, `Invention cap is the in-game 120, not 150 (got ${inv.cap})`);
ok(inv.state === "level-capped", `Invention is level-capped, not levelling (got ${inv.state})`);
// Reproduce the old maths: standard curve, cap 150, clamp to [0,100].
// have = 161,081,547 - xp(120) = 56.8M against a 10.85M band => 523% => 100%.
const oldHave = 161081547 - S.xpForLevel(120);
const oldSpan = S.xpForLevel(121) - S.xpForLevel(120);
ok(
  Math.min(100, (oldHave / oldSpan) * 100) === 100,
  `the old standard-curve maths clamped Invention to 100% (raw ${((oldHave / oldSpan) * 100).toFixed(0)}%)`,
);
const her = rows.find((r) => r.name === "Herblore");
ok(her.state === "levelling" && her.nextLevel === 109 && Math.round(her.pct) === 92,
  `Herblore 108 -> 109 reads 92% (got ${her.state} ${her.nextLevel} ${her.pct.toFixed(1)}%)`);
const agi = rows.find((r) => r.name === "Agility");
ok(agi.state === "level-capped" && Math.round(agi.pct) === 75,
  `Agility 99/149.7M is level-capped at 75% of 200M (got ${agi.state} ${agi.pct.toFixed(1)}%)`);

// --- legacy wrapper still sane for the other pages -------------------------
const dg = S.xpToNext(21880774, 104, 120); // DungeonsClient-style call
ok(dg.pct > 0 && dg.pct < 100 && dg.needed > 0, `xpToNext still works for a mid-climb skill (${JSON.stringify(dg)})`);

console.log(fails === 0 ? "\nALL PASS" : `\n${fails} FAILURES`);
process.exit(fails === 0 ? 0 : 1);
