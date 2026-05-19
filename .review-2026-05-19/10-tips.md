# 10-tips

## Summary
`tips.js` (304 LOC) wires a curated training-method DB to live cross-references in `money.js`, `next-steps.js`, `goals.js`, and `combat.js`. Plumbing and bilingual structure are solid, but the **method DB contains many wrong level gates** — Runecrafting, Summoning Pack Yak, Divination wisp tiers, Fletching/Hunter/Agility/Dungeoneering all reference levels that do not match the live RS3 wiki in 2026. The selection algorithm also has a **sort-order bug for Dungeoneering** that hides the better entry. No XSS surface (output flows through `esc()` in `live.js`).

## Severity legend
- **P0** — breaks core feature
- **P1** — significant bug / wrong gameplay info
- **P2** — polish / minor inaccuracy

## Findings

### [P1] Runecrafting (skill 20) levels are wrong by 20-50
- **Where:** `tips.js:103-107`
- **What:** Three entries use incorrect levels. Live wiki:
  - Nature runes: level **44** RC (entry says `lvl: 77`)
  - Astral runes: level **40** RC (entry says `lvl: 91`)
  - Soul runes: level **90** RC (entry says `lvl: 50`)
- **Why:** Looks like the level field was confused with target XP/h or recommended level; whatever the cause, it means players at 50 RC are recommended Soul runes they cannot craft (need 90), while at 44 RC they see no method at all because the lowest entry starts at 50.
- **Fix:** Re-tier with correct unlocks. Suggested:
  ```js
  20: [
    { lvl: 1,  name: { pt: "Air runes (Air altar)", en: "Air runes" }, xph: 8000, intensity: "low" },
    { lvl: 44, name: { pt: "Nature runes via Abyss", en: "Nature runes via Abyss" }, xph: 55000, intensity: "high" },
    { lvl: 77, name: { pt: "Blood runes (Abyss/Soul split)", en: "Blood runes (Abyss)" }, xph: 70000, intensity: "moderate" },
    { lvl: 90, name: { pt: "Soul runes", en: "Soul runes" }, xph: 90000, intensity: "moderate" },
  ],
  ```

### [P1] Summoning Pack Yak gated at 67 (real: 96)
- **Where:** `tips.js:119-121`
- **What:** Pack Yak pouch is a level **96** Summoning method, not 67. Entry recommends a method the player almost certainly cannot make.
- **Fix:** Change `lvl: 67` → `lvl: 96`, and add lower-level entries (e.g. Spirit terrorbirds at 52, War tortoise at 67, Bunyip at 68) so mid-level players see something actionable.

### [P1] Divination wisps are swapped
- **Where:** `tips.js:128-131`
- **What:** Incandescent wisps require **95** Divination; Lustrous wisps unlock at **85**. The file has Incandescent at `lvl: 80` and Lustrous at `lvl: 95` — order/level inverted. A 80-94 Div player gets recommended a method they can't do, and a 95+ player gets pointed at Lustrous (lower-tier wisp, lower XP) when Incandescent is the top-tier.
- **Fix:**
  ```js
  25: [
    { lvl: 85, name: { pt: "Lustrous wisps", en: "Lustrous wisps" }, xph: 220000, intensity: "moderate" },
    { lvl: 95, name: { pt: "Incandescent wisps", en: "Incandescent wisps" }, xph: 280000, intensity: "moderate" },
  ],
  ```

### [P1] Dungeoneering method ordering breaks selector
- **Where:** `tips.js:123-126`
- **What:** Sinkholes is listed first at `lvl: 10`, then Daemonheim solo small at `lvl: 1`. `_tipsActiveMethod` (line 160-167) iterates in array order, replacing `best` whenever `m.lvl <= cur`. After processing both, `best` is always the **last** matching entry. So a level 50 player sees "Daemonheim solo small" instead of Sinkholes — exactly backwards from the intent.
- **Why:** Selector relies on entries being sorted ascending by `lvl`. Every other skill respects this; Dungeoneering doesn't.
- **Fix:** Reorder and correct level (Sinkholes D&D unlocks at **Dung 35**, not 10):
  ```js
  24: [
    { lvl: 1,  name: { pt: "Daemonheim solo small", en: "Daemonheim solo small" }, xph: 50000, intensity: "high" },
    { lvl: 35, name: { pt: "Sinkholes (D&D)", en: "Sinkholes (D&D)" }, xph: 80000, intensity: "high" },
  ],
  ```
  Better: add a defensive `list.sort((a,b)=>a.lvl-b.lvl)` in `_tipsActiveMethod` to make ordering robust.

### [P1] Combat skills get a degenerate single-entry tip
- **Where:** `tips.js:151-157`
- **What:** Skills 0/1/2/3/4/5/6 each carry a single `lvl: 1` placeholder ("Train via Slayer / bosses"). `xph: 0` flips the branch on line 240 to "Best path"/"Melhor caminho" — generic to the point of useless. Since these skills get full combat-gear and money cross-refs anyway (sections 2–5 of `buildTips`), the placeholder text actively crowds out the more useful follow-on tips by occupying the prime first slot.
- **Fix:** Either (a) drop the entries for combat skills so `_tipsActiveMethod` returns null and the gear/money tip takes the lead slot, or (b) replace placeholders with tier-banded entries (e.g. Strength @ 90+ → Aggression Pots + AoE Slayer at Airut), to match the richness of skilling entries.

### [P2] Headless arrows gated at Fletching 30 (real: 1)
- **Where:** `tips.js:70`
- **What:** Headless arrow assembly requires Fletching **1**, not 30. A player at 1–29 Fletching never sees this AFK money/XP method even though it's the canonical recommendation for that band.
- **Fix:** `lvl: 1` + add Magic shortbow (u) at real cap **80**, not 75 (entry says `lvl: 75`).

### [P2] Hefin Agility gated at 85 (real: 75)
- **Where:** `tips.js:84`
- **What:** Hefin Agility Course unlocks at level **75** Agility (Plague's End complete + Voice of Seren). Entry says `lvl: 85`.
- **Fix:** `lvl: 75`.

### [P2] Wilderness "Hati" course mislabeled
- **Where:** `tips.js:83`
- **What:** There is no "Hati" agility course. The Wilderness Agility Course is canonical; "Hati" is a Christmas-event wolf NPC giving Agility XP buffs through a paw token. The two are unrelated. Confusing for new players.
- **Fix:** Rename to `"Wilderness Agility Course"` and move the Hati Wolf paw reference to a `setup:` note, or drop the parenthetical entirely.

### [P2] Sinkholes gated at Dung 10 (real: 35)
- **Where:** `tips.js:124`
- **What:** Sinkholes D&D requires level **35** Dungeoneering. (See also the ordering bug above.)

### [P2] Dragon impling jar gated at Hunter 91 (real: 83)
- **Where:** `tips.js:89`
- **What:** Dragon implings catch at Hunter **83**. The Puro-Puro variant is the same level. Entry says `lvl: 91`, which is the dropped jar level (Crystal/Lucky implings), not Dragon.
- **Fix:** `lvl: 83`, or replace with Crystal implings @ 80 / Lucky implings @ 89 if endgame-tier was the intent.

### [P2] Phantom Guardian gated under Necromancy (wrong skill)
- **Where:** `tips.js:147`
- **What:** "Phantom guardian familiars" is a Summoning (skill 23) familiar at level **88 Summoning**, not a Necromancy training method. Listing it under Necromancy at `lvl: 80` confuses the skill and the level.
- **Fix:** Remove from skill 28. Replace with an actual 80–91 Necromancy method (e.g. Skeleton Warriors at Ghorrock, or Death Lotus undead in The Lost Grove, or continue conjuration AoE training).

### [P2] Mining "Drakolith" entry conflates two ores
- **Where:** `tips.js:24`
- **What:** Drakolith = level **60** Mining; Necrite = level **70**. Bundling them at `lvl: 75` is technically safe (player can mine both at 75) but the name is misleading. Setup mentions "Tirannwn lodestone + spirit bag" which fits Necrite/Banite at Seren Stones, not generic Drakolith.
- **Fix:** Split into two entries (Drakolith @ 60, Necrite @ 70) or rename to "Seren Stones / Banite" at `lvl: 80`.

### [P2] Combat slayer XP/h values heavily understated for 2026
- **Where:** `tips.js:93-94`
- **What:** Abyssal Demons in Slayer Tower at 60k XP/h, Airut/Glacors at 90k XP/h. With modern AoE rotations (Living Death, Detonate, Phantom Guardian, max gear T90+) those are easily 200–500k XP/h, and Slayer co-trains Combat (~250k+). Numbers were realistic in 2018 RS3, not 2026.
- **Fix:** Bump XP/h to current ranges (e.g. Abyssal Demons ~180k, Airut/Glacors ~250–350k) or note "varies wildly with gear/spec".

### [P2] No tip when player below the lowest gate
- **Where:** `tips.js:160-167, 231-243`
- **What:** Several skills have no `lvl: 1` entry: Cooking (starts at 80), Smithing burials (starts at 50 for the second tier, but lvl:1 exists), Slayer (starts at 75), Construction (50), Summoning (67/96), Thieving (60). A player at level 1–49 Construction or 1–74 Slayer gets **no curated tip**, just the goal/money/gear panels.
- **Fix:** Add low-level seeds, e.g.:
  - Cooking 1 → "Shrimps → Trout (basic)"
  - Slayer 1 → "Slayer assignments (any master)"
  - Thieving 1 → "Men → Master Farmer"
  - Construction 1 → "Wooden chairs / oak chairs"

### [P2] `buildTips` reads `player.skills[skillId]` twice
- **Where:** `tips.js:228, 262`
- **What:** `cur` is computed at line 228 then recomputed (`cur2`) at line 262 to derive `gap` for the unlock tip. They're identical values; only one needed.
- **Fix:** Replace `cur2` with `cur`. Pure tidy-up, no behavior change.

### [P2] No fallback when current language object is missing a pt translation
- **Where:** `tips.js:234-235, 252-253`
- **What:** `m.name[lang] || m.name.en` is used for the method name, but for money methods at line 252 `mm.name[lang] || mm.name.en` reads `mm.name` directly — `MONEY_METHODS` entries already use `{pt,en}`. OK. However, `unlock.u_pt` / `unlock.u_en` at line 264 returns `undefined` if a `NS_UNLOCKS` row lacks the active language field (no fallback). A handful of `next-steps.js` rows have only English or have typos — would render `undefined @ 80`.
- **Fix:**
  ```js
  const u = (lang === "pt" ? unlock.u_pt : unlock.u_en) || unlock.u_en || unlock.u_pt;
  const hint = (lang === "pt" ? unlock.hint_pt : unlock.hint_en) || unlock.hint_en || unlock.hint_pt;
  ```

### [P2] Tip ordering can flood Combat skills with 5 tips
- **Where:** `tips.js:226-303`
- **What:** For a high-level combat skill, `buildTips` can produce: method + 2 money + unlock + 1 goal + gear = **6 tips**. Live UI (`live.js:347-357`) shows them all in the live view; no cap. Skilling skills can also hit 5. Compared to other live blocks, this can dominate the panel.
- **Fix:** Either cap final list (`.slice(0, 4)`) or interleave with a priority ranking. Probably one-liner: `return tips.slice(0, 4);` at line 303.

### [P2] `_tipsCombatSetup` returns null for Prayer (5)
- **Where:** `tips.js:209-216`
- **What:** `styleByLayer` has no entry for skill 5 (Prayer), so combat-gear tip is skipped — fine. But the comment on line 211 (`3: null`) implies HP shows nothing either; in fact HP is mapped not-present so falsy returns null. Clearer to enumerate explicitly or use `Object.prototype.hasOwnProperty` to distinguish "unmapped" from "deliberately null".
- **Fix:** Either remove the `3: null` line (same effect) and add a comment "HP/Prayer auto-train via combat — no gear tip", or document why some keys are explicit `null` vs absent.

### [P2] `m.intensity` is a free-form string, not localized
- **Where:** `tips.js:240, throughout TIPS_METHODS`
- **What:** `${m.intensity}` is rendered verbatim — `"high"`, `"moderate"`, `"low"` — even when `currentLang === "pt"`. Inconsistent with the rest of the bilingual surface (`name.pt`, `setup.pt`).
- **Fix:** Add a translation map at the top of `buildTips`:
  ```js
  const INTENSITY_LABEL = { en: { low:"low", moderate:"moderate", high:"high" }, pt: { low:"baixa", moderate:"média", high:"alta" } };
  const intensity = (INTENSITY_LABEL[lang] || INTENSITY_LABEL.en)[m.intensity] || m.intensity;
  ```

### [P2] Necronium burial "70" is correct but Bane @ 80 is high
- **Where:** `tips.js:32-33`
- **What:** Bane burial armour set unlocks at level **77** Smithing (matching Bane bars). Entry says `lvl: 80`, so a player at 77–79 misses three levels of recommendations.
- **Fix:** `lvl: 77`.

### [P2] Mahogany tables Construction `lvl: 50`
- **Where:** `tips.js:115`
- **What:** Mahogany table requires **52** Construction. Off by 2 — a player at 50/51 would be told to build something they can't.
- **Fix:** `lvl: 52`.

### [P2] No mention of modern Necromancy endgame (>92)
- **Where:** `tips.js:144-149`
- **What:** Top entry is "Rasial / Top-tier slayer" at level 92. Necromancy goes to 120 in 2026 RS3. Missing the actual endgame: Vorago / Solak / TzKal-Zuk for 99–120 grind, plus conjuration cycling at Croesus or Sanctum of Rebirth.
- **Fix:** Add `lvl: 99` and `lvl: 110` entries pointing at Sanctum / Croesus loot scaling.

### [P2] Mining `lvl: 80` "Banded iron / Light animica" merges two tiers
- **Where:** `tips.js:25`
- **What:** Banded iron = level 70; Light animica = level 89. Both are recommended at `lvl: 80`, which means a player at 80 cannot mine light animica but the entry implies they can. Player at 89 sees this entry then `lvl: 89` Dark animica — overlapping.
- **Fix:** Split. Banded iron @ 70, Light animica @ 89 (rename current 89 entry to Dark animica only @ 90).

### [P2] Inline comment claims `setup` localizes but cooking @ 80 is missing setup entirely
- **Where:** `tips.js:52`
- **What:** Cooking entries don't include `setup`, so the sub line is blank. Minor — losing the chance to mention "burn-stop level reached at 99 with Cooking gauntlets". Polish.

### [P2] Skill ID comment block excludes 5 / Prayer in styleByLayer note
- **Where:** `tips.js:210-216`
- **What:** Comment "// melee/strength/HP shared" is inaccurate ordering vs the keys. Defence (1) is mapped melee — fine, but the comment block reads as if 0,2,3 share melee. Easier to maintain if keys are individually commented.

## Quick wins (ordered by ROI)
1. Fix Runecrafting, Summoning Pack Yak, Divination wisp levels — three changes prevent recommending methods the player **cannot do**.
2. Reorder Dungeoneering entries and add a `list.sort(...)` in `_tipsActiveMethod` to harden the selector.
3. Drop combat-skill placeholder entries (0/1/2/4/6 in TIPS_METHODS) so the gear+money tips take the lead slot.
4. Correct misnamed/misgated Hefin (75), Hati→Wilderness, Headless arrows (1), Mahogany tables (52), Dragon implings (83), Bane (77).
5. Cap `buildTips` output at 4 with `.slice(0, 4)`.
6. Localize `m.intensity` and add `u_pt`/`u_en` fallback so PT users don't see "undefined".
7. Bump Slayer/Combat XP/h to 2026-realistic ranges; refresh Necromancy entries up to 120.
8. Add low-level seeds for Cooking/Slayer/Thieving/Construction so beginners see a method.

## Notes / open questions
- The DB is hand-curated and last appears to have been benchmarked against a pre-2020 wiki snapshot. Consider a one-time `/research` pass over the live "Pay-to-play X training" pages and regenerating `TIPS_METHODS` with current levels and XP/h ranges.
- `wiki` and `perks` keys are mentioned in the header comment (line 16) but never present on any entry — either drop from the schema doc or wire them into the UI for a "see on wiki" link.
- `_tipsMoneyMethods` calls `calcProfit(m)` and trusts `m.profit` to be a number. If `calcProfit` returns `null/NaN` (no GE price), `b.profit - a.profit` becomes NaN, which sorts unstably. Worth verifying that `calcProfit` always returns a number — out of scope for this file, but flag it.
- XSS: `live.js` wraps every tip field in `esc()` (lines 352–354) before injecting into the DOM. Tips strings being bilingual user-visible content with no HTML-passthrough — safe.
- No tests cover `tips.js`. Even a smoke "buildTips(player, sid) returns array" test for each skill at levels {1, 50, 99, 120} would catch the level-gate regressions found here.
