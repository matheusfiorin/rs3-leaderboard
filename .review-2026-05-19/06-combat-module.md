# 06-combat-module

## Summary
`combat.js` carries large ability/gear database but core revolution-bar builders silently drop every ultimate, leaving Berserk/Sunshine/Living Death/Deadshot orphan. DPS heuristic underweights multi-hit and DoT abilities (regex only catches `\d+-\d+%`, multi-hit count ignored) and gear table caps at T70 (no Drygore/Ascension/Seismic/Noxious tiers for level 80–99). Magic gear table also has 30-level gap from T1 → T30 and necro entry labels the head-slot armour icon as a "weapon".

## Severity legend
P0 = breaks core feature, P1 = significant bug/UX flaw, P2 = polish

## Findings

### [P0] Ultimates defined but never placed in revolution bars
- **Where:** `combat.js:94 (berserk)`, `:146 (deadshot)`, `:235 (omnipower)`, `:299 (sunshine)`, `:398 (living_death)`; consumers `getMeleeBars` (`:735`), `getRangedBars` (`:754`), `getMagicBars` (`:773`), `getNecroBars` (`:793`)
- **What:** Every `type: "ultimate"` ability is declared in `ABILITIES` but no bar builder pushes them. End-game revolution bars therefore lack Berserk (42), Deadshot (21), Death's Swiftness equivalent, Omnipower (12), Sunshine (50), Living Death (50). DPS estimate and rendered bars both omit them.
- **Why:** Easy oversight — bar builders only enumerate basics/enhanced. The rest of the file (`renderBar`) already supports `ultimate` styling, so they were just never wired into the rotation.
- **Fix:** Add the ultimates with the same level gating used elsewhere, e.g.:

  ```js
  if (lvl >= 42) s.push(a.berserk);            // melee
  if (lvl >= 21) s.push(a.deadshot);           // ranged single
  if (lvl >= 12) s.push(a.omnipower);          // magic single
  if (lvl >= 50) s.push(a.sunshine);           // magic AoE+single
  if (lvl >= 50) s.push(a.living_death);       // necro
  ```
  Slice still trims to 9, so adding them is safe.

### [P0] Necro weapon icons point at armour pieces (T1/T20/T40/T60)
- **Where:** `combat.js:615` `weapon: { name: "Deathwarden T1", icon: "Deathwarden_hood_(tier_1)" }`; same shape at `:624, :636, :648`
- **What:** `Deathwarden_hood_*` and `Deathwarden_robe_top_*` are both *armour* slots. The four lower necro tiers list the head piece as the player's weapon, so the "Weapon" gear tile and the `name` shown in UI are wrong. Only T70 (`Death_guard_(tier_70)`, `:660`) is correct.
- **Why:** Copy-paste from armour entries — necro weapons (Omni Guard, Soulbound Lantern, Skull Lantern, Death Guard tier 70/80/90/95) were probably skipped because the icon paths weren't on hand.
- **Fix:** Map each tier to the real off-hand/2h weapon: T20 → `Omni_guard_(tier_20)` / `Skull_lantern_(tier_20)`, T40 → tier 40 equivalents, T60 → `Death_guard_(tier_60)`, etc. Or drop the lower-tier weapon entry and reuse the closest valid icon. At minimum rename `weapon.name` so it doesn't say "Deathwarden" (that's the armour line).

### [P1] Magic gear table has a 29-level gap from T1 to T30
- **Where:** `combat.js:553-571`
- **What:** Goes Air staff (lvl 1) → Mystic wand (lvl 30). Anyone level 2–29 in Magic gets stuck on Air staff in the UI. No T10, no T20 (god books / dagannoth slayer wand / batwing).
- **Fix:** Insert at least one mid entry, e.g.:
  ```js
  { minLvl: 20, dmg: 192, armour: 170, hp: 600,
    weapon: { name: "Batwing wand", icon: "Batwing_wand" },
    armor:  { name: "Batwing robes", icon: "Batwing_torso" }, tier: "T20" },
  ```

### [P1] Necro gear table skips T30 and T50
- **Where:** `combat.js:609-666`
- **What:** Jumps 1 → 20 → 40 → 60 → 70. Level-30s and 50s never see a gear upgrade card.
- **Fix:** Add Deathwarden T30 (`(tier_30)`) and T50 (`(tier_50)`) rows. Both exist in-game.

### [P1] Gear caps at T70 — entire late game (T80/T90/T92+) missing
- **Where:** `combat.js:413-668`
- **What:** Highest tier is 70 (Bandos / Armadyl / Subjugation / Death guard T70). Level 80–99 players' rendered `getGearForLevel` still returns T70, so `dmg` plateaus at 864 and "Gear" tile never advances. RS3 has T80 (Drygore, Ascension crossbows, Seismic, Khopesh of Tumeken), T90 (Noxious, Khopesh of the Kharidian, Wand of the Praesul), T92 magic, etc. For a leaderboard whose audience is end-game, this is the meat of the table.
- **Fix:** Append at least T80 and T90 rows per style with appropriate weapon/armour icons. Even if exact `dmg` numbers stay invented, having the icons render correctly is the value-add.

### [P1] DPS heuristic undercounts multi-hit, DoT, and channel abilities
- **Where:** `combat.js:679-691`
- **What:** Regex `(\d+)-(\d+)%` matches a single range and averages it. Snap Shot (`"145-175% x2 hits"`), Wild Magic (`"125-155% x2 hits"`), Deadshot (`"125-145% x5 hits"`), Rapid Fire (`"8 hits of 75-85%"`), Piercing Shot (`"45-55% x2 hits"`), Combust (`"10 hits of ~30% = 300% total"`), Dismember (`"8 hits"`, no %), Bombardment, Volley of Souls — all are stored as if they were a single 110%-ish hit. Real per-cast damage of Snap Shot is ~320%; code records 160%.
- **Why:** Heuristic was written for single-hit basics. The `x2`/`x5`/`8 hits` / `total` annotations live in the description string and the parser ignores them.
- **Fix:** Either (a) move damage to structured fields (`avgPct: 320`) on each ability and read those directly, or (b) extend regex to also match `xN`, `\d+ hits`, and `total` markers:
  ```js
  const hits = /x\s*(\d+)|(\d+)\s*hits/i.exec(desc);
  const mult = hits ? parseInt(hits[1] || hits[2]) : 1;
  totalPct += avg * mult;
  ```
  Plus a `total: N` override for DoTs like Combust/Dismember.

### [P1] Bleed / stun / buff abilities silently default to 110%
- **Where:** `combat.js:687-689` (else branch)
- **What:** Any ability whose description lacks `\d+-\d+%` (Dismember, Combust, Galeshot, Runic Charge, Spectral Scythe, Command Skeleton, Binding Shot wording variant, ultimates with no %) falls into the 110%-basic bucket. That is both an over-count (Galeshot is buff-only, 0 damage on hit) and an under-count (Dismember bleed is ~225% total).
- **Fix:** As above — move to a structured `avgPct` field per ability, or special-case the no-damage utility abilities to contribute 0 to the average.

### [P1] Gear `hp` value is fabricated and double-counts armour LP
- **Where:** `combat.js:881` `const maxHp = constitution * 100 + gear.hp;`; gear entries `:418-666`
- **What:** Real RS3 HP at level X = `X * 100`; armour LP bonuses are small (Bandos chest ≈ 90 LP, not 1700). Code adds 300–1700 flat. Result: lvl 99 constitution + T70 gear = 9900 + 1700 = 11600, which is well above what a player would have unbuffed.
- **Fix:** Either drop the gear LP additive entirely (`maxHp = constitution * 100`), or replace with realistic LP bonuses (sum of slot LPs, low double digits each).

### [P1] Melee T60 weapon damage jumps irregularly (480 → 768, then 768 → 864)
- **Where:** `combat.js:471` (T60 `dmg: 768`)
- **What:** Other rows step by +96 (T1=48, T10=96, T20=192, T30=288, T40=384, T50=480, T70=864). T60 should be 576 to keep the pattern; 768 is the T65 spot. Same anomaly carried to ranged/magic/necro T60 (`:535, :592, :646`). Effect: T60 row outputs higher DPS than T70 in some inputs because abilityDmg uses the unrealistic value.
- **Fix:** Set T60 `dmg: 576` across all four styles. Or, if the inflated number was deliberate (Dragon Rider lance ≈ T78 in real game), document the choice — at minimum align the four styles.

### [P1] Single-target ranged bar never includes Deadshot
- **Where:** `combat.js:754-771`
- **What:** Even after fixing the ultimate-omission bug (above), note Deadshot is the single highest single-target burst in Ranged. Snipe (5) and Rapid Fire (62) are queued, but Deadshot (21) is the actual standard endgame finisher. Same for Magic (`omnipower`, `sunshine`).
- **Fix:** Tied to the P0 ultimates fix — make sure Deadshot lands in `s` (single-target), not just `ao`.

### [P2] Curses gating ignores quest requirement
- **Where:** `combat.js:921-922` `const hasCurses = prayerLvl >= 92;`
- **What:** Curses prayer book requires Prayer 50 to start, level 95 prayer is the normal "have most" mark, and the quest **Temple at Senntisten** is mandatory regardless of level. Pure level check overstates availability.
- **Fix:** Soften copy to "Curses possible at Prayer 95+ after Temple at Senntisten" or remove this banner since the leaderboard can't check quest state.

### [P2] DPS comment contradicts the divisor
- **Where:** `combat.js:672-673` vs `:693`
- **What:** Comment says "Ticks per ability cycle: ~5 (3s average with GCD)" but code divides by `1.8` (= 3 ticks). The 1.8 figure is correct for the standard GCD; the comment is wrong.
- **Fix:** Update the comment to `"~3 ticks per cast = 1.8s average GCD"` and drop the `5` reference.

### [P2] Hit-range estimate (0.9–1.3 × abilityDmg) doesn't match RS3 variance
- **Where:** `combat.js:876-879`
- **What:** RS3 damage roll is uniform 0–100% of the ability's max (so the "min" can be near zero, not 0.9×). For an "estimated max hit" the user-facing label `cbBaseHit` reading `Xmin–Xmax` is misleading. Either it should be a max-hit single number, or use 0.0×–1.5× to reflect actual variance.
- **Fix:** Rename label to "Max hit (est.)" and show one number (`Math.round(abilityDmg * 1.5)`), or drop the field — it's competing with the DPS/Avg-ability columns and confusing as drawn.

### [P2] Several individual ability stats look off vs. wiki
- **Where:** various
- **What:** Spot-check items worth confirming against current RS3 wiki before shipping:
  - `:131` Snipe `"1min CD"` — pre-mod was ~17.4s CD; 1 min is almost certainly wrong.
  - `:229` Combust `"10 hits of ~30% = 300% total"` — historical Combust is 5 hits, totalling ~250–300% only with magma buff; 10 hits without buff is wrong.
  - `:239` Omnipower `"420-500%"` — pre-mod is 600-800% on adrenaline ult; verify post-mod numbers.
  - `:393` Death Skulls `"4 golpes ricocheteantes de 45-135%"` — current ability is 5 skulls; double-check.
  - `:159` Binding Shot stun `"3.6s"` — pre-mod is 9.6s root; verify post-mod.
- **Fix:** Sweep against wiki snapshot (March 2026 modernisation patch notes) before launch; correct the numbers where they diverge.

### [P2] At low levels single and AoE bars are identical with no UX hint
- **Where:** `combat.js:730-734` (acknowledged in comment) + bar builders
- **What:** Comment explains it correctly, but UI still renders two visually identical bars labelled "Single" and "AoE" until level 10/37/45/67. Low-level players are likely to think the section is broken.
- **Fix:** When bars are identical, render once with a sub-label like "Same bar for single & AoE until lvl X" — or hide the AoE block until at least one AoE-specific ability has unlocked.

### [P2] `attack_basic`/`ranged_basic`/`magic_basic`/`touch_of_death` pushed unconditionally, so 9-slot cap can squeeze them out
- **Where:** `combat.js:744, :763, :781, :802` and `slice(0, 9)` at end of each builder
- **What:** Basic auto-attack is pushed mid-list; at high levels (after the ultimate fix lands) the array can exceed 9 elements and slice will drop whichever item ended up last. Currently it's binding shot / impact / runic charge / command skeleton — also-fine items but the loss is silent.
- **Fix:** Either guarantee the basic stays by pushing it first (Revolution-friendly: weakest at the bottom slot anyway is standard practice though), or document the priority. Best: push in *priority* order from highest to lowest so the slice drops the right ones.

## Quick wins (ordered by ROI)
1. Wire ultimates into the four bar builders — single 5-line patch closes the biggest functional gap.
2. Fix necro weapon entries T1/T20/T40/T60 to use a real weapon icon (or relabel them) — visible UI bug.
3. Drop the additive `gear.hp` term (or replace with realistic LP bonuses) — one-line change, removes a misleading 11.6k-LP number.
4. Add `avgPct` (and optional `hits`) fields to ABILITIES, switch `estimateDPS` to read them. Removes the regex parsing of localized strings.
5. Add Magic T20 and Necro T30/T50 gear rows — eliminates the gear-tile dead zone.
6. Either set T60 `dmg` to 576 across styles or document why 768. Restores monotonic scaling.
7. Append T80 and T90 rows per style so endgame players see Drygore/Noxious/etc.

## Notes / open questions
- File header claims "Post-Combat Style Modernisation (March 2026)" — I couldn't fetch the wiki to verify the post-mod numbers (WebSearch was unavailable). Several ability values (Snipe CD, Combust hit count, Omnipower percent, Adaptive Strike existence) read as a mix of pre-mod and speculative-post-mod data. Worth a single sweep against the current wiki before the next release.
- `WIKI_IMG` (`:8`) points at `data/icons/<Name>.png`. None of this review verifies that those PNGs actually exist on disk; the `data-fallback="next"` mechanism shields users from breakage but missing icons should be confirmed by a separate audit (probably the assets module review).
- DPS / max-hit numbers feed comparative styling across players. If the formula stays heuristic, consider labelling the section "Rough estimate — not in-game accurate" more prominently than the current `font-size:0.48rem` italic.
- `STYLE_INFO.melee.skillIds = [0, 2]` (`:819`) — takes max of Attack(0) and Strength(2). Defence(1) is ignored entirely for melee gearing/damage, which is fine for DPS but means a high-Defence-only player won't show on the melee card properly. Not a bug, just a modelling choice worth flagging.
