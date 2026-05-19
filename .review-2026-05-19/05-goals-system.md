# 05-goals-system

## Summary
Goals/Major-Goals/Next-Steps form a mostly-solid pipeline: `GOALS` array is the single source of truth, `goalProgress()` aggregates skill+quest+manual counts, and `mgCard` and `next-steps` consume the same data. The main issues are: (1) the capstone-override leaves the segmented header bar contradicting the ring/celebration, (2) `nsPickClosestUnlock`'s 25-level gap filter silently hides recommendations for early-game accounts, (3) dead/duplicated catalogues in `major-goals.js` (ROTM_SKILLS/QUESTS, mgRotmCount, vestigial i18n keys), and (4) several small UX/text quirks (XP-based progress shown as level-ratio, hardcoded player names in quest rails, manual checklist becomes unreachable once a capstone is done). No correctness bugs reach P0.

## Severity legend
- **P0** — breaks a core feature
- **P1** — significant bug or UX flaw
- **P2** — polish / dead code / minor inconsistency

## Findings

### [P1] Capstone override makes segmented bar contradict the ring & body
- **Where:** `goals.js:266-272` (override), `goals.js:379-401` (`goalSegmentedBar`), `goals.js:615-626` (`goalCard` header)
- **What:** When `goal.capstone` quest is complete, `goalProgress()` forces `done = total` (and therefore `pct = 100`), but `skillsDone` / `questsDone` / `manualDone` are left at their real partial counts. The card header always renders both the ring (uses `prog.pct`, shows 100%) AND the segmented bar (uses `prog.skillsDone / goal.skills.length`, still shows e.g. 80% skills, 50% manual). Body shows the green celebration block. Result: a single card simultaneously claims "complete" via ring/body and "incomplete" via the segmented bar.
- **Why:** Override only patches the aggregate counter, not the per-bucket counters.
- **Fix:** In the capstone branch, also force the per-bucket counts to their totals so every consumer agrees:
  ```js
  if (capstoneDone) {
    skillsDone = goal.skills.length;
    questsDone = goal.quests.length;
    manualDone = goal.manual.length;
    done = total;
  }
  ```
  Or skip rendering the segmented bar entirely when `allDone`.

### [P1] Closest-unlock filter `gap <= 25` silently hides recommendations for early-game accounts
- **Where:** `next-steps.js:129-139`
- **What:** `nsPickClosestUnlock` filters `u.gap > 0 && u.gap <= 25`. For a fresh-ish account (Decxus has many skills near 1), nearly every entry in `NS_UNLOCKS` is >25 levels away → returns `null` → UI renders `nothingNear`. Yet the Decxus pane is the exact context where a "next unlock" is most useful.
- **Why:** Hard cutoff at 25 levels is too tight for low-level skills where the next memorable unlock is 40-50.
- **Fix:** Raise to 40 (or compute adaptively, e.g. lowest gap regardless if no gap ≤ 25 exists). Minimum invasive change:
  ```js
  .filter(u => u.gap > 0 && u.gap <= 40)
  ```
  Or pick the closest even when >25:
  ```js
  const inRange = candidates.filter(u => u.gap <= 25);
  return inRange[0] || candidates[0] || null;
  ```

### [P1] `mgT` map keys and `ROTM_SKILLS`/`ROTM_QUESTS`/`mgRotmCount` are dead code
- **Where:** `major-goals.js:9-27` (mgT map), `major-goals.js:129-190` (ROTM_SKILLS, ROTM_QUESTS, mgRotmCount)
- **What:** The `mgT` map has 6 vestigial entries (`mgSoulSplit`, `mgSoulSub`, `mgPrif`, `mgPrifSub`, `mgRitualTitle`, `mgRitualSub`) that are never read; titles now come from `g.label_pt/en` on the `GOALS` array (see `major-goals.js:208`). The 19-row `ROTM_SKILLS` table and 50+-row `ROTM_QUESTS` array are duplicates of data already in `GOALS[id=rotm].skills` / `.phases` and the helper `mgRotmCount` is never called — `renderMajorGoals` iterates the `GOALS` array instead.
- **Why:** Carried over from an earlier hand-rolled implementation before the `GOALS` registry was introduced; never garbage-collected. Drift risk: if anyone edits one copy of the ROTM data, the two diverge silently.
- **Fix:** Delete `ROTM_SKILLS`, `ROTM_QUESTS`, `mgRotmCount`, and the unused `mgT` entries. Keep only `mgTitle`, `mgItems`, `mgComplete`.

### [P1] Manual checkboxes become unreachable once capstone is done
- **Where:** `goals.js:538-542` (celebration block), `goals.js:262-264` (manual counted in `manualDone`)
- **What:** When `capstoneDone` triggers the celebration branch, the entire body is replaced by the green "Goal Complete!" banner — no manual list is rendered. Any unchecked manual items (e.g. `sn_kudos`, `sn_cat`) stay unchecked in `localStorage`. If the user later wants to un-complete or audit them, they can't.
- **Why:** Override short-circuits the entire body instead of just the aggregate counters.
- **Fix:** Either (a) always render the done-zone `<details>` with manual items inside the celebration, or (b) auto-set the manual items in storage when capstone flips done (write `manual[key]=true` for every `m of goal.manual` once `capstoneDone`).

### [P2] Skill-row progress bar uses level ratio, not XP ratio
- **Where:** `goals.js:288` (`pct: Math.min(100, Math.round((cur / sk.required) * 100))`)
- **What:** Progress is shown as `cur / required`. For a skill at level 50 targeting 99, this fills the bar to 50% — but XP-wise the player has done <5% of the work (xpForLevel(50)=101,333 vs xpForLevel(99)=13,034,431). The bar consistently overstates progress for high-level targets.
- **Fix:** Use the XP-based ratio that next-steps.js already computes:
  ```js
  const curXp = data.xp || 0;
  const baseXp = typeof xpForLevel === "function" ? xpForLevel(1) : 0; // 0
  const pct = met ? 100 :
    Math.min(100, Math.round(((curXp - baseXp) / (targetXp - baseXp)) * 100));
  ```

### [P2] `nsPickClosestUnlock` progress-bar pct is misleading
- **Where:** `next-steps.js:190-192`
- **What:** Computes `pct = (curXp - curLvlXp) / (targetXp - curLvlXp)` where `curLvlXp = xpForLevel(unlock.cur)`. For a player at level 20 targeting level 50, this measures only "progress between 20 and 50" — which means even halfway through (level 35), the bar shows ~3% because XP curve is exponential. The viewer expects "how close am I to the unlock". This is *also* clamped between 2 and 98, which masks "just started" and "almost there" states.
- **Why:** Range chosen is level-50-minus-level-20 XP, not level-21-minus-level-20.
- **Fix:** Either (a) base it on the current-level→next-level transition (`xpToNextLevel`), or (b) accept the inevitable exponential and don't clamp/min-2:
  ```js
  const pct = range > 0
    ? Math.min(100, Math.round(((curXp - curLvlXp) / range) * 100))
    : 0;
  ```

### [P2] NS_QUEST_RAILS hardcoded to two player names
- **Where:** `next-steps.js:77-98`, `next-steps.js:143`
- **What:** `NS_QUEST_RAILS = { Fiorovizk: [...], Decxus: [...] }`. `nsPickNextQuest` falls back to Fiorovizk's rail for any other player. If the tracked accounts ever rename or a third account is added, the new account silently inherits Fiorovizk's rail (which may be irrelevant).
- **Fix:** Derive the rail from goal progress instead (e.g. pick the first ROTM phase quest the player hasn't done; see `goal.phases` in `goals.js`). At minimum, surface this assumption with a comment or detect mismatched players and fall back to a generic rail.

### [P2] `nsDailyMoves` has a dead `else if` branch
- **Where:** `next-steps.js:112-114`
- **What:**
  ```js
  } else if (has("Royal Trouble") || has("The Fremennik Trials")) {
    // Will unlock soon - skip
  }
  ```
  Empty branch. Comment says "skip" but the `else if` adds no behavior — the same effect comes from doing nothing. Just noise.
- **Fix:** Delete the empty branch.

### [P2] `goalBuildNextActions` sort key for quests is the magic constant 100
- **Where:** `goals.js:321` (`sortKey: 100`)
- **What:** Skills sort by `gap.levelsNeeded` (1–98 realistic). Quests use 100 to push them after all skills. If we ever had a 100-level required-vs-current gap (we won't — required ≤ 99 in current data), the order would tie. Brittle.
- **Fix:** Use `Number.POSITIVE_INFINITY` or sort skills/quests in two separate passes. Low priority.

### [P2] Redundant ternary in next-actions color
- **Where:** `goals.js:300`
- **What:** `var(--${goal.color === "purple" ? "purple" : goal.color})` is equivalent to `var(--${goal.color})`. Looks like a vestige of a prior `purple` aliasing.
- **Fix:** Collapse to `\`var(--${goal.color})\``.

### [P2] `goalsLoadManual()` parsed on every tiny code path
- **Where:** `goals.js:253` (in `goalProgress`), `goals.js:295` (in `goalBuildNextActions`), `goals.js:447` (in `goalManualRow`), `goals.js:518` (in `goalCard`)
- **What:** Each call does `JSON.parse(localStorage.getItem(...))`. With ~5 goals × ~3-5 manual items each, render does ~10+ JSON.parse calls. Not a perf issue at this size, but cleaner to parse once per render and thread through.
- **Fix:** Take an optional `manual` param in `goalProgress`/`goalCard`/`goalManualRow`, parse once in `renderGoalsPage`.

### [P2] `level || 1` default masks malformed data
- **Where:** `goals.js:256, 278, 419`, `next-steps.js:104, 131`
- **What:** `(player.skills[sk.id] || {}).level || 1` treats missing/0/undefined as level 1. If the parse step drops a skill (network glitch, partial profile), every "skill gap" silently assumes the player is at level 1, inflating the action list with bogus "need 98 levels" entries. The page won't crash, but the list of next actions can become wildly wrong without any signal.
- **Fix:** Either log/skip skills with no data, or surface a "data incomplete" badge. Low impact in practice but worth a guard.

### [P2] Major-Goals card uses raw `>=` on possibly-undefined level
- **Where:** `major-goals.js:184` (`mgRotmCount`)
- **What:** `if ((player.skills[sk.id] || {}).level >= sk.required) done++` — when `level` is undefined, the comparison is `undefined >= 75` = false, which is fine, *but* it disagrees with the pattern used everywhere else (`.level || 1`). Since `mgRotmCount` is dead code (see earlier finding), this is moot — but if any future refactor revives it, the inconsistency will bite.
- **Fix:** Delete `mgRotmCount` (covered above).

### [P2] Wiki URL encoding double-handles spaces
- **Where:** `goals.js:429` (`goalQuestRowMissing`), `goals.js:498` (`goalPhaseTree`), `next-steps.js:226`
- **What:** `encodeURIComponent(name.replace(/ /g, "_"))`. Already-replaced underscores are passed through `encodeURIComponent` unchanged (underscore is reserved-safe), so the result works. But the apostrophe in `"Plague's End"` becomes `Plague%27s_End`, which the wiki accepts but is uglier than `Plague's_End`. Cosmetic.
- **Fix:** Build the URL with a wiki-style helper that only percent-encodes spaces:
  ```js
  const wiki = `https://runescape.wiki/w/${name.replace(/ /g, "_").replace(/\?/g, "%3F")}`;
  ```

### [P2] `goalRing` text uses `dominant-baseline="central"` only
- **Where:** `goals.js:347-349`
- **What:** `dominant-baseline="central"` is supported in modern browsers but historically inconsistent in Safari. The percentage label may render slightly above center on some older Safari builds. Minor.
- **Fix:** Add a small `dy="0.35em"` fallback. Low impact.

### [P2] Worldwakes goal has no `capstone` field although TWW is its key quest
- **Where:** `goals.js:96-120` — note no `capstone` key (compare to senntisten line 18, prifddinas line 68, rotm line 149)
- **What:** Actually re-reading: line 104 sets `capstone: "The World Wakes"`. Confirmed present. Withdraw.
- **Fix:** N/A — false alarm during review.

### [P2] `mgInjectStyles` doesn't define a `mg-card-orange` theme
- **Where:** `major-goals.js:202-217` (theme mapping) and CSS (`major-goals.js:283-324`)
- **What:** `themeMap = { senntisten: "gold", prifddinas: "teal", rotm: "purple" }`. The other two goals (worldwakes — color "orange", invention — color "purple") fall through to `g.color === "teal" ? "teal" : g.color === "purple" ? "purple" : "gold"`. The "orange" worldwakes goal therefore renders as `mg-card-gold`. CSS has no `.mg-card-orange` class. Minor visual inconsistency vs. `goals.js` (which does have a gold/teal/orange/purple matrix).
- **Fix:** Add `worldwakes: "orange"` to `themeMap` and an `.mg-card-orange` CSS block (mirror the gold one with orange accent values).

### [P2] `_rendered.delete("goals")` accesses a global from another module via `typeof`
- **Where:** `major-goals.js:237`
- **What:** Reaching into another module's render-cache by name with `typeof _rendered !== "undefined"` then `_rendered.delete(...)`. Tight coupling; if `_rendered` is renamed or scoped, this becomes a silent no-op (cache won't invalidate, highlight won't fire).
- **Fix:** Expose a small `invalidateRender(section)` helper from the navigation module and call that instead.

## Quick wins (ordered by ROI)
1. **Delete dead code** in `major-goals.js`: `ROTM_SKILLS`, `ROTM_QUESTS`, `mgRotmCount`, and unused `mgT` entries. ~70 lines gone, zero behaviour change.
2. **Fix the capstone-override segmented-bar inconsistency** (one tiny patch to `goalProgress`).
3. **Loosen `nsPickClosestUnlock` filter** to 40 levels or fall back to "best available" so Decxus actually sees a recommendation.
4. **Add `worldwakes: "orange"` to `themeMap`** + matching CSS for the orange variant on Major-Goals tiles.
5. **Replace level-ratio progress with XP-ratio** in `goalSkillGap.pct` so the skill bars match user intuition for high targets.
6. **Drop the empty `else if` branch** in `nsDailyMoves`.
7. **Make the manual checklist accessible** under the celebration block, or auto-tick it when capstone flips done.

## Notes / open questions
- The `_mgPendingHighlight` global on `window` works, but it's the only cross-module communication channel for the dashboard→goals deep-link flow. Worth considering a small event-bus or URL-hash query (`#goals?goal=rotm`) so the state is shareable and bookmarkable.
- `NS_UNLOCKS` is a content table that drifts with the game. Worth a comment indicating the data is curated, not derived from the wiki, so future contributors don't expect it to auto-update.
- `goalProgress` doesn't surface "the capstone quest itself is the blocker" — if every prereq is met but the player hasn't kicked off the capstone, the card lumps it with the long quest list. Could pull the capstone out as a highlighted call-to-action when all prereqs are green.
- ROTM phase chain in `goals.js` is internally consistent with the `quests` flattening (lines 234-241), good. The phase tree includes some quests not in the senntisten goal's `quests` array (e.g. "The Restless Ghost") which is fine — they're transitive prereqs only counted at the ROTM level.
- No tests cover any of this. Even a single `goalProgress` snapshot test using one of `data/fiorovizk_quests.json` + a mocked skill profile would catch capstone-override regressions cheaply.
