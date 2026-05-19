# 16-testing

## Summary

Zero automated tests. Only `node --check *.js` (syntax-only) in PROMPT.md plus a one-shot hand-run Playwright smoke pass in `SMOKE_TESTS.md` dated 2026-04-09 — never re-run, not wired to CI, no exit code. `update-data.yml` workflow has no unit coverage on its bash `fetch_or_keep`/jq validator, even though it now guards production cache integrity (commits `a57d4d0`, `da501d0`). Git history shows **at least 9 regressions in 2 months** (off-by-one class names, dead-hash blank page, `hasQuest` null crash, qcape free award, GE proxy fallback, parseDate ISO, mgGoTab dead selectors, `renderNextSteps` undefined, mobile layout breaks) — every one is unit-testable in <20 lines.

## Severity legend
P0 = breaks core feature, P1 = significant bug/UX flaw, P2 = polish.

## Findings

### [P0] No automated test suite of any kind

- **Where:** repo root (`package.json` absent), `.github/workflows/update-data.yml`, `PROMPT.md:101-105`.
- **What:** Sole "testing protocol" is `node --check *.js`. That catches parse errors only; it does not detect a single bug in `SMOKE_TESTS.md`, nor any of the regressions in `git log --grep fix:`.
- **Why:** Vanilla-JS-on-Pages projects often skip tests, but this one has 9,346 LOC across 10 JS files with non-trivial pure functions (xp tables, profit calc, hash routing, quest matching, activity classification) and a multi-stage data pipeline. Risk has crossed the threshold.
- **Fix:** Stand up the minimal harness described under *Proposed harness* below. Even just covering `xpForLevel`, `parse`, `calcProfit`, `classifyActivity`, `hasQuest`, and `launchSection` fallback would have caught 5 of the last 9 regressions.

### [P0] BUG 2 class-mismatch class is the canonical example of "trivial test would have caught this"

- **Where:** `script.js:860` renders `.feed-item`; `script.js:1444` filters `.feed-item` (now fixed); regression commit `51ead62`.
- **What:** Activity filter pills were no-ops because the listener queried `.act-item` while the renderer produced `.feed-item`. Same class drift could recur on quest/skill/journal filters.
- **Why:** Pure DOM-after-render test in jsdom would have failed on first commit:
  ```js
  document.body.innerHTML = '<div id="activity-feed"></div><div id="activity-count"></div><div id="activity-filters"><button class="pill active" data-afilter="all"></button><button class="pill" data-afilter="levelup"></button></div>';
  renderActivity([{name:'X', activities:[{text:'Levelled up Attack', date:''}, {text:'I killed something', date:''}]}]);
  initFilters();
  document.querySelector('[data-afilter="levelup"]').click();
  assert.equal(document.querySelectorAll('.feed-item:not(.hidden)').length, 1);
  ```
- **Fix:** See harness proposal. Wire to a single `feed_filter.test.js` plus a generic "every `.pill[data-*]` has matching DOM children rendered by its tab" check.

### [P0] BUG 1 dead-hash fallback — also trivially testable

- **Where:** `script.js:1263-1269` (now guarded); regression `51ead62`.
- **What:** `launchSection('senntisten')` used to leave the page blank; today it falls back to dashboard via the `validPages` Set. No regression test prevents someone re-introducing the bug.
- **Fix:**
  ```js
  // routing.test.js (jsdom)
  document.body.innerHTML = readFileSync('index.html', 'utf8'); // shell pages out
  loadScript('script.js');
  launchSection('senntisten');
  assert.equal(document.querySelector('.page.active').dataset.page, 'dashboard');
  assert.equal(location.hash, '#dashboard');
  ```

### [P0] `parse()` has no schema-tolerance tests despite being the only input boundary

- **Where:** `script.js:582-620`.
- **What:** `parse(profile, hiscores, quests)` is what every render path consumes. It absorbs three independently-failing endpoints (each can be `null` after `Promise.allSettled`). Schema drift on any of `skillvalues`, `activities`, `questscomplete`, `hiscores.activities[].name`, or quest shape silently corrupts the dashboard.
- **Why:** RuneMetrics has historically returned `{error:"NOT_A_MEMBER"}`, missing `skillvalues`, or `null` `quests`. Existing fixtures (`data/decxus_profile.json`, `data/fiorovizk_quests.json`) are real captures — perfect to vendor.
- **Fix:** Snapshot test:
  ```js
  const fix = JSON.parse(readFileSync('data/fiorovizk_profile.json'));
  const out = parse(fix, null, null);   // hiscores+quests deliberately missing
  assert.equal(out.runeScore, 0);
  assert.deepEqual(out.clues, {easy:0, medium:0, hard:0, elite:0, master:0});
  assert.equal(out.questList.length, 0);
  assert.ok(out.skills[0].level > 0);
  assert.throws(() => parse({error:'NOT_A_MEMBER'}, null, null));
  ```

### [P1] `xpForLevel` / `xpToNextLevel` table — silent edge-case off-by-one risk

- **Where:** `script.js:118-147`.
- **What:** Hand-built 150-entry table with explicit index arithmetic (`_XP_TABLE[level - 1]`). Audit at commit `4316ce6` confirmed correctness *for that read*; no regression net.
- **Why:** Boundary values (1, 99, 120, 150, 151), zero-XP partial bars, and `levelXpRange === 0` at max each have one-line traps. A 6-row property test pins them:
  ```js
  assert.equal(xpForLevel(1), 0);
  assert.equal(xpForLevel(99), 13034431);   // canon RS3 value
  assert.equal(xpForLevel(120), 104273167);
  assert.deepEqual(xpToNextLevel(13034431, 99, 99), {needed:0, total:0, pct:100});
  assert.equal(xpToNextLevel(0, 1, 99).needed, 83);
  assert.ok(xpForLevel(151) === xpForLevel(150)); // clamp
  ```

### [P1] `calcProfit` fallback semantics untested

- **Where:** `money.js:586-606`.
- **What:** Falls back to `method.gp || 0` whenever any input/output price is missing. Easy regression: someone changes the early-return from `method.gp` to `0`, breaking the entire money page when GE proxy is down.
- **Fix:**
  ```js
  const m = {inputs:[{id:'X', qty:1}], outputs:[{id:'Y', qty:1}], actionsPerHour:1000, gp:50000};
  gePrices = {};                       // empty
  assert.equal(calcProfit(m), 50000); // fallback
  gePrices = {X:{price:10}, Y:{price:20}};
  assert.equal(calcProfit(m), 10000); // (20-10)*1000
  ```

### [P1] `canDoMethod` / `isAlmostUnlocked` / `getSkillGaps` eligibility — domain core, no tests

- **Where:** `money.js:609-647`.
- **What:** Three branchy functions consumed by every money render. Missing-skill, missing-quest, exactly-at-req, 1-level-short, 11-levels-short are the cases the UI cares about.
- **Fix:** 5-line table-driven test. Reuses the existing fixture players.

### [P1] `classifyActivity` regexes drift silently

- **Where:** `script.js:817-825`.
- **What:** Activity-feed filtering depends on these 4 regexes matching the strings RuneMetrics actually emits. Jagex has changed wording before ("Levelled up" vs "I levelled"). No assertion that the existing fixtures classify into at least 2 buckets.
- **Fix:**
  ```js
  assert.equal(classifyActivity('Levelled up Attack'), 'levelup');
  assert.equal(classifyActivity('I levelled my Attack skill'), 'levelup');
  assert.equal(classifyActivity('Quest complete: Cook\'s Assistant'), 'quest');
  assert.equal(classifyActivity('I killed an Abyssal demon'), 'boss');
  assert.equal(classifyActivity('Dungeon floor 3 complete'), 'dungeon');
  assert.equal(classifyActivity(''), 'other');
  assert.equal(classifyActivity(null), 'other');
  ```
  Plus: assert that across both `*_profile.json` fixtures, ≥1 activity classifies as each of `{levelup, quest, boss}` — catches "Jagex changed the string" before users notice.

### [P1] `hasQuest` null-safety regression net is missing

- **Where:** `script.js:467-469`. Regression fixed in `4316ce6`.
- **What:** `hasQuest({}, "x")` should return `false`, not throw. Used by every goal/journal check.
- **Fix:** Three-liner:
  ```js
  assert.equal(hasQuest({}, 'A'), false);
  assert.equal(hasQuest({questList:null}, 'A'), false);
  assert.equal(hasQuest({questList:[{title:'A', status:'COMPLETED'}]}, 'A'), true);
  ```

### [P1] qcape "free award" regression — fixture-driven test would have caught it

- **Where:** `script.js` `JOURNAL[?]` for `qcape`; fix `4316ce6` requires `totalQuests > 0`.
- **What:** Empty player (no quest data) used to satisfy `questsDone === totalQuests` (both 0) and unlock the 100-pt Quest Cape badge.
- **Fix:** Snapshot test of `JOURNAL.find(j=>j.id==='qcape').check({questsDone:0, totalQuests:0})` → `false`.

### [P1] Cache-age calc + "outdated" banner threshold

- **Where:** `script.js:1657-1658,1712,1722`.
- **What:** `Math.max(0, Math.round((Date.now() - new Date(meta.timestamp)) / 60000))`. Boundary at exactly 120 min toggles the banner. Future-dated `meta.timestamp` (clock skew) must yield 0, not negative minutes (the `Math.max(0,…)` is the guard — easy to lose).
- **Fix:**
  ```js
  Date.now = () => 1_700_000_000_000;
  assert.equal(cacheAgeMin({timestamp:new Date(1_700_000_000_000 - 60*60_000).toISOString()}), 60);
  assert.equal(cacheAgeMin({timestamp:new Date(1_700_000_000_000 + 60_000).toISOString()}), 0); // future-skew clamp
  ```
  (Currently inline — would need a small `_calcCacheAgeMin(meta)` extraction.)

### [P1] Workflow `fetch_or_keep` validator untested

- **Where:** `.github/workflows/update-data.yml:31-49`, validators on lines 58, 64, 70.
- **What:** Validators are jq expressions like `(.error // empty) == empty and ((.skillvalues // []) | length) > 0`. One typo and the workflow silently overwrites the cache with a `{"error":"NOT_A_MEMBER"}` payload. Past incident — see commit `a57d4d0`.
- **Fix:** A `tests/workflow.bash` that pipes each known bad/good payload through `jq -e "<validator>"` and asserts the exit code. ~30 lines, run on PR via `bash tests/workflow.bash`.

### [P2] Lookup RSN regex

- **Where:** `lookup.js:62`. `/^[A-Za-z0-9 _-]{1,12}$/`.
- **What:** Validates RSN before burning proxy quota. Easy to regress (e.g. accidentally drop the space, or anchor wrong). Six-line table test covers it.

### [P2] `goalProgress` capstone override

- **Where:** `goals.js:252-273`.
- **What:** "If capstone quest done, set `done = total`" — backfills stale skill prereqs. Regression here causes Soul Split / Prifddinas / etc. to show < 100% forever for completed players.
- **Fix:** Build a fake player with capstone quest completed but skills below threshold; assert `pct === 100`.

### [P2] SMOKE_TESTS.md is dated and isn't a gate

- **Where:** `SMOKE_TESTS.md`.
- **What:** Last run 2026-04-09 by hand. No script, no CI, no exit code. After-fix verification relies on the author running Playwright MCP manually.
- **Fix:** Convert the 28 cases into a real `playwright test` spec. ~120 lines. Run against the static server on a Pages-style `python3 -m http.server` instance in CI.

## Proposed harness

**Two-layer, minimal-deps:**

1. **Unit layer — `node:test` + `jsdom` (no build).** Add `package.json` with `"type":"module"`, install only `jsdom`. Source the JS files into a single jsdom realm:
   ```js
   import { JSDOM } from 'jsdom';
   import { readFileSync } from 'node:fs';
   import vm from 'node:vm';
   const dom = new JSDOM(readFileSync('index.html','utf8'), { runScripts: 'outside-only', url: 'http://localhost/' });
   const ctx = dom.getInternalVMContext();
   for (const f of ['i18n.js','script.js','money.js','goals.js','lookup.js']) {
     vm.runInContext(readFileSync(f,'utf8'), ctx, { filename: f });
   }
   export const w = dom.window;
   ```
   `node --test tests/` runs in <1s. No transpilation. No bundler. No vitest. Works on the existing 10 vanilla files unchanged.

2. **E2E layer — Playwright spec (replaces SMOKE_TESTS.md).** ~25 lines covering: dock nav, deep-link `#skills`, dead-hash fallback, activity-filter functional, language toggle persists, error-banner dismissal. Run against `python3 -m http.server 8000 &`.

3. **CI gate — extend `update-data.yml` (or a new `ci.yml`)** to run `node --test` and `npx playwright test` on PR. <30 s wall time. Block merges on failure.

**Why not vitest?** The whole project deliberately has zero build step (`README.md:21`). vitest pulls esbuild + vite-node + 30 transitive deps. `node:test` is built-in.

**Why not hand-rolled?** jsdom is the difference between a 10-line test and a 100-line DOM mock.

## Quick wins (ordered by ROI)

1. **Stand up the 50-line `node:test` + jsdom harness** described above. One PR. Unlocks every other test idea below.
2. **One-file `tests/pure.test.js`** covering `xpForLevel`, `parse`, `hasQuest`, `classifyActivity`, `calcProfit`. Five `assert` blocks, ~80 lines. Catches 5 of the last 9 git-history regressions.
3. **One-file `tests/routing.test.js`** asserting `launchSection('garbage') → dashboard`, hash normalization, and feed-filter functional after render. Catches BUG 1 and BUG 2 forever.
4. **`tests/workflow.bash`** with known-bad fixtures (`{"error":"NOT_A_MEMBER"}`, empty body, partial skillvalues) piped through the jq validators. Catches cache-poisoning regressions on the data pipeline.
5. **Playwright spec replacing SMOKE_TESTS.md.** Even just nav + filters + deep-link is 95% of UX risk surface.
6. **Add a `tests/fixtures/` directory** and pin the current `data/*.json` there so render code can be tested without network or live API mocks.
7. **Add `node --test` and `playwright test` to `update-data.yml`** as a pre-commit step (workflow already self-commits — letting it ship without tests passing is the risk).
8. **Extract `_calcCacheAgeMin(meta)`** from `script.js:1657` so future-skew clamp is unit-testable.

## Notes / open questions

- No `package.json` exists today. Adding one with only `"devDependencies":{"jsdom":"^24","@playwright/test":"^1"}` and `"private":true` keeps the "no build step" promise (devDeps don't ship to Pages).
- Files load via `<script src>` in global scope, not modules. The vm/jsdom approach above handles that without source changes. If/when the project ever ESM-ifies, switch to `import()`.
- `live.js` and `combat.js` are stateful and DOM-heavy — defer until layer-1 is green.
- `SMOKE_TESTS.md`'s mobile section (tests 23–28) is hard to automate; keep manual but timebox to release-prep, not every change.
- Past Playwright run found 2 BUGs and 1 VISUAL out of 28 cases — a 10% bug-find rate per pass. That alone justifies wiring it to CI.
