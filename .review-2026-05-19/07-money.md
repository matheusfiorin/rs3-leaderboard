# 07-money

## Summary
`money.js` is a single-file recommender backed by a static `MONEY_METHODS` table (~100 entries) and a tiny `gePrices` map fed by Weirdgloop. Core logic is short and reasonable, but the data carries several **internally inconsistent item IDs** that silently corrupt profit calculations, and **stale `gp` wiki fallbacks** mask broken or money-losing methods. UX has a few dead affordances (`data-mn-jump`, unused `recReqs`, weekly methods flagged `daily:true`) and a couple of fabricated multipliers in Power Loops.

## Severity legend
- **P0**: breaks core feature
- **P1**: significant bug / UX flaw
- **P2**: polish

## Findings

### [P0] Item IDs in recipes contradict each other and the GE cache → wrong profit
- **Where:** `money.js:57` (`make_super_antipoison`), `money.js:99` (`unf_ranarr`), `money.js:129` (`fletch_rune_arrows`), `money.js:135` (`cut_rubies`)
- **What:** Same item ID resolves to two different names inside `MONEY_METHODS`, or the ID doesn't match the cached/live API:
  - L57 declares `{id:259,name:"Clean irit"}` but L99 declares `{id:259,name:"Clean ranarr"}` for the same ID. Cache (`data/ge_prices.json` id `259`) = `Clean ranarr` @ 893gp. → `make_super_antipoison` is priced as if its herb input were ranarr.
  - L57 declares `{id:235,name:"Unicorn horn dust"}` but cache id `235` = `Vial` (836gp). The real Unicorn horn dust is id `227` (17gp). Wrong ingredient cost.
  - L129 declares `{id:44,name:"Arrow shaft"}` and `{id:41,name:"Rune arrowheads"}` and `{id:42,name:"Rune arrow"}`. Cache says `Arrow shaft` is id `52`. Live API will hand back whatever items those IDs actually map to (not arrow parts).
  - L135 declares `{id:1603,name:"Ruby"}` for the cut output; cache says id `1609` = Ruby (id 1603 doesn't exist there).
- **Why:** The recipes were authored from memory / mixed sources without cross-checking against `data/ge_prices.json`. `calcProfit` looks up by **ID only** (`getPrice(inp.id)`) and the `name` field on inputs/outputs is a hint that nothing in the code reads.
- **Fix:** Run a one-time audit. For each `inputs`/`outputs` entry, assert `gePrices[id].name` startsWith the declared `name` (or hard-code a canonical id map). Recheck at minimum:
  ```js
  // make_super_antipoison
  inputs:[{id:259,...,name:"Clean irit"},   // → id should be Clean irit's real id (verify against API)
          {id:227,qty:1,name:"Unicorn horn dust"}],   // was 235
  // fletch_rune_arrows
  inputs:[{id:52,qty:15,name:"Arrow shaft"}, ...],   // was 44
  // cut_rubies
  outputs:[{id:1609,qty:1,name:"Ruby"}],    // was 1603
  ```

### [P0] Profit fallback to stale `gp` masks money-losing methods as profitable
- **Where:** `money.js:586-606` (`calcProfit`), `money.js:65-82` (tan d'hide methods), `money.js:119-124` (cook sharks)
- **What:** `calcProfit` returns `method.gp` (wiki figure) whenever the live calc is `<= 0`. With current GE prices:
  - **Cook sharks**: raw shark 364 → cooked shark 315 = **-49gp/action loss**. Falls back to displayed 2.5M/hr.
  - **Tan blue d'hide**: 1779 + 20 tan fee → 1448 leather = **-351gp/action loss**. Falls back to 6M/hr.
  - **Tan red d'hide live calc**: 993 → 2293 = +1300, *5000 = 6.5M/hr (real). `gp` figure 5.5M (less than live) — but pattern is fragile.
- **Why:** `return calculated > 0 ? calculated : method.gp || 0` (line 605) hides losses. Combined with the "Live prices" badge, the user trusts a figure that's a wiki snapshot from months ago.
- **Fix:** When live calc returns ≤ 0 but prices were resolved, surface that explicitly — e.g. mark the card as "Currently unprofitable" or hide it from the Available list:
  ```js
  if (missingPrice) return method.gp || 0;       // honest fallback only when data is missing
  return profitPerAction * method.actionsPerHour; // can be negative; render handles negative
  ```
  Then in `moneyCardHTML`, render negatives as `Loss · ${fmtShort(-m._profit)}/h` in red, and drop them from `available` ranking.

### [P1] `recReqs` field is dead code (~30 methods carry it)
- **Where:** `money.js:26, 44, 297, 303, 329, 341, 347, 394` etc.; only reference is the definitions themselves (Grep confirmed)
- **What:** Recommended-level reqs (`recReqs`) appear on bosses and Abyss runecrafting methods but are never read by `canDoMethod`, `isAlmostUnlocked`, `getSkillGaps`, or any renderer.
- **Why:** Likely added expecting a "you can do it but it'll be painful" badge; never wired up.
- **Fix:** Either render them as a faint tag (`<span class="mn-rec-req">Recommended: ${skill} ${lvl}</span>`) in `moneyCardHTML`, or delete the field everywhere.

### [P1] `craft_water_abyss` has nonsense `recReqs:{20:110}`
- **Where:** `money.js:44`
- **What:** Water rune crafting is a level-5 method; recommends RC 110 (only reachable via Elite skill cap and irrelevant to anyone still grinding water runes).
- **Why:** Probably a copy/paste from a higher-tier abyss method.
- **Fix:** Either drop the field or set to something reasonable (e.g. `recReqs:{20:50}` for the first useful tick rate jump).

### [P1] Weekly methods marked `daily:true` inflate the Daily Routine bundle
- **Where:** `money.js:486-491` (`penguin_hide_seek`), `money.js:520-525` (`player_owned_ports`)
- **What:** Comments explicitly say "(semanal)" / "(weekly)" but `daily:true`. `dailyBundleHTML` (`money.js:766-784`) treats them as daily entries, sums their GP/hr stand-ins (300k + 5M) into the "/ dia" total, and counts them in `${dailies.length} ${"métodos"}`.
- **Why:** Single field collapses daily/weekly/monthly into one boolean.
- **Fix:** Introduce `cadence: "daily" | "weekly" | "monthly"`, replace `m.daily` with `m.cadence === "daily"` in the filter. Render weekly methods in a separate bundle or annualize the figure for the daily total.

### [P1] `craft_mist_runes` & `craft_mud_runes` missing quest gate (`Lunar Diplomacy`)
- **Where:** `money.js:83-94`
- **What:** Combination runes require Lunar Diplomacy (and for mud, also Rune Mysteries which is implicit). Neither has `quest:"Lunar Diplomacy"`. Players who haven't done the quest see them as "Available" at RC 6/13.
- **Why:** Quest dep was overlooked.
- **Fix:** Add `quest:"Lunar Diplomacy"` to both entries.

### [P1] Power Loop synergy multipliers are fabricated
- **Where:** `money.js:650-669`
- **What:** `synergyMult: 1.15 / 1.10 / 1.08` is applied to `sum(profits)` but the combos are alternative activities, not simultaneous ones — you can't mine luminite and smelt necronium at the same time. The 1.10 case (`mining_urns_combo`) prints "double profit" in `desc` while applying a 10% multiplier. Numbers shown to user (~30M-50M for top loop) outrank legitimate methods.
- **Why:** Multiplier was a hand-wave for "synergy."
- **Fix:** Drop the multiplier; show "alternate between A and B" with the **higher** of the two profits, not the sum. Or compute realistic ratios (e.g. urns boost mining by ~12% per RS3 Wiki — that's a defensible multiplier).

### [P1] `isAlmostUnlocked` silently rejects quest-locked-but-skill-ready methods
- **Where:** `money.js:618-627`
- **What:** Line 620 returns `false` whenever a quest is missing, even if all skill reqs are met. A player who has every level required but hasn't done the quest sees the method in "Locked", not "Almost".
- **Why:** Bug-or-design ambiguity. The intent appears to be "almost = 1-10 levels away", but a 1-quest-away method is arguably the best "almost" candidate.
- **Fix:** Drop the quest short-circuit and let the skill-gap loop decide. Surface quest gap as a separate badge:
  ```js
  function isAlmostUnlocked(player, method) {
    if (canDoMethod(player, method)) return false;
    for (const [skillId, reqLevel] of Object.entries(method.reqs || {})) {
      const sk = player.skills[Number(skillId)];
      const cur = sk ? sk.level : 1;
      if (reqLevel - cur > 10) return false;
    }
    return true;  // quest-only-missing now qualifies
  }
  ```

### [P1] Many wiki `gp` fallbacks are 2–10× stale
- **Where:** `money.js:23-58` (rune crafting), `money.js:294-299` (Giant Mimic), `money.js:210-215` (whirligigs)
- **What:** Several `gp` fallbacks are wildly above current RS3 Wiki MMG figures (May 2026): `craft_nature_abyss` 28.2M (wiki ~10M), `craft_blood_abyss` 23.3M (wiki ~5-7M), `craft_cosmic_abyss` 23.9M (wiki ~2-3M), `make_aggression_pots` 22.8M (wiki ~5-8M), `kill_giant_mimic` 14.4M (wiki ~3-5M), `kill_hellhounds` 22.4M (wiki ~3-6M), `catch_whirligigs_gliding` 7.86M (wiki ~1.5M).
- **Why:** Numbers entered once, never refreshed. Compounded by P0 above — when live calc fails, these outdated figures display as truth.
- **Fix:** Either (a) point a scheduled job at the wiki MMG and pull current figures, or (b) replace `gp` with `gpRange: [low, high]` and render as "1-3M/h" so users know it's an estimate.

### [P1] `mining_urns_combo` description contradicts multiplier
- **Where:** `money.js:660`
- **What:** `desc.en` says "Urns boost mining and sell on GE for **double profit**", but `synergyMult: 1.10` (10% boost). The "double" claim sets unrealistic expectations.
- **Why:** Copy mismatch.
- **Fix:** Rewrite desc to match the multiplier, or recompute the multiplier.

### [P1] Podium cards advertise click affordance with no handler
- **Where:** `money.js:842` sets `data-mn-jump="${m.id}"`; no `addEventListener("click", ...)` for `[data-mn-jump]` anywhere
- **What:** `.mn-pcard` has `cursor:pointer` and `transform` hover, so the user expects clicking to scroll/jump to the method card. Clicks do nothing.
- **Why:** Half-implemented feature.
- **Fix:** Either remove the data attribute + `cursor:pointer` styling, or wire it up:
  ```js
  grid.querySelectorAll("[data-mn-jump]").forEach(el => el.addEventListener("click", () => {
    const card = grid.querySelector(`.mn-card[data-id="${el.dataset.mnJump}"]`);
    card?.scrollIntoView({behavior:"smooth", block:"center"});
  }));
  ```
  (and add `data-id` to `.mn-card`).

### [P2] `_gePriceTime` recorded but never displayed
- **Where:** `money.js:545, 566, 573, 577`
- **What:** Date is captured but no UI shows "Updated 3 minutes ago". The price badge says only Live/Cached.
- **Fix:** Render `_gePriceTime` next to `.mn-price-live` for transparency, or delete the variable.

### [P2] Redundant `actionsPerHour:0, inputs:[], outputs:[]` boilerplate
- **Where:** ~50 methods, e.g. `money.js:117, 154, 184, 196, 226...`
- **What:** When `fixedProfit` is set, `calcProfit` returns it immediately (line 587). The empty arrays + zero rate are dead.
- **Fix:** Strip them — only `fixedProfit` is needed:
  ```js
  { id:"mine_runite_ore", cat:"gathering", ..., fixedProfit:3000000, wiki:"..." }
  ```
  Cuts ~50 lines.

### [P2] `dailyBundleHTML` sums GP/h with `/dia` label — unit mismatch
- **Where:** `money.js:769-781`
- **What:** Each `m._profit` is a GP/hr figure (or fixedProfit per hour-of-doing). The bundle sums them as if they were daily totals and labels the total "/ dia". For e.g. `kingdom_miscellania` (`fixedProfit:2000000`) the 2M is **per day**, but `shop_runs_runes` (3M) is also stated as daily total in the wiki. Mixed. The user gets a number with unclear semantics.
- **Why:** No separate `gpPerRun` / `gpPerDay` / `gpPerHr` fields.
- **Fix:** Add a `gpDaily` field on daily methods or rename `fixedProfit` for that subset; clarify the bundle copy.

### [P2] `getSkillGaps.pct` min-bar width inconsistent with displayed %
- **Where:** `money.js:723-727`
- **What:** `const pct = Math.max(2, Math.round(g.pct));` then `style="width:${pct}%"` while the label shows `${Math.round(g.pct)}%`. If actual progress is 0%, bar shows 2% but label says "0%".
- **Fix:** Either show "0%" with 0-width (and a 1px border for visibility), or display the floor value: `${pct}%`.

### [P2] Quest check duplicated in `isAlmostUnlocked`
- **Where:** `money.js:619-620`
- **What:** `canDoMethod` already evaluates the quest gate. The second `if (method.quest && !hasQuest(...))` on line 620 is redundant code that ALSO causes the [P1] above. Same condition, twice.
- **Fix:** Remove line 620 (see proposed fix in the quest-locked finding).

### [P2] POWER_LOOPS sparse (only 3 combos) for a "100+ methods" guide
- **Where:** `money.js:650-669`
- **What:** Only `luminite_to_necronium`, `mining_urns_combo`, `hide_to_leather`. Plenty of valid combos missing (e.g. mine runite + smelt rune bars, fish sharks + cook sharks, chop magic logs + fletch).
- **Fix:** Add 5-10 more combos, gate on level/quest correctly so eligibility filtering does real work.

### [P2] `smelt_steel_bars` live calc is technically correct but lower than wiki figure
- **Where:** `money.js:101-106`
- **What:** Live: outputs 1616 - inputs (2×225 + 729) = 437/bar × 1800 = 786,600/h. Wiki `gp` = 3M. Since 786,600 > 0, live is used and method displays correctly. Just noting the wiki fallback is ~4× the live figure — pattern that needs P1 fix above.

### [P2] `loadGEPrices` swallows all errors silently
- **Where:** `money.js:569, 574`
- **What:** `catch (_) {}` on both branches. If the API and the cache both fail, the user sees `— No prices` badge with no diagnostic in the console.
- **Fix:** `console.warn("GE prices:", err)` in each catch.

## Quick wins
1. Fix the 4 wrong item IDs in `MONEY_METHODS` (super-antipoison, fletch arrows, cut rubies). 30-minute audit, ~5-line diff, immediately corrects live profit display. (P0)
2. Remove the quest short-circuit in `isAlmostUnlocked` (line 620). 1-line delete; unlocks "Almost" surfacing for quest-only gaps. (P1)
3. Flip the `daily:true` flags on `penguin_hide_seek` and `player_owned_ports`, or introduce a `cadence` field and migrate. Removes silently wrong bundle totals. (P1)
4. Add `quest:"Lunar Diplomacy"` to `craft_mist_runes` and `craft_mud_runes`. (P1)
5. Drop the dead `recReqs:{20:110}` on water abyss, or wire `recReqs` rendering. (P1)
6. Either render `_gePriceTime` as "Updated Xm ago" or delete the variable. (P2)

## Notes / open questions
- The naming inconsistency between `money.js` recipe `name` strings and `data/ge_prices.json` `name` values (e.g. id 259 = "Clean ranarr" in cache, "Clean irit" in one recipe) suggests the cache file was hand-stitched from the live API at some point but recipes were authored separately. Worth deciding which is source of truth and adding a sanity assert at boot:
  ```js
  for (const m of MONEY_METHODS) for (const x of [...m.inputs, ...m.outputs])
    if (gePrices[x.id] && !gePrices[x.id].name.toLowerCase().startsWith(x.name.toLowerCase().slice(0,4)))
      console.warn("Recipe ID/name mismatch", m.id, x);
  ```
- Power Loops feature seems aspirational — 3 hand-curated combos, fabricated multipliers. Either expand seriously or drop the feature.
- `MONEY_METHODS` is ~540 lines of data inside the JS file. Consider moving to `data/money_methods.json` for the same reason `ge_prices.json` is split out — easier to regenerate from a wiki scrape.
- Many of the GP figures end in `...000` or `...500000` round numbers; a refresh job that diffs against the RS3 Wiki MMG would catch the staleness automatically.
