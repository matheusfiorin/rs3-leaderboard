# RS3 Leaderboard — Audit Plan 2026-06-15

Synthesis of six parallel Opus-4.7 audits (frontend bugs, goals/RS3 accuracy, UI/UX/a11y, data pipeline, prior-audit backlog, smaller modules) into 14 checkpoint-bounded change sets. Each checkpoint = one logical edit batch with an explicit Playwright (or shell) verification step.

Execute top-down. Stop and re-test if any check fails.

---

## CP-01 — Data-layer correctness (CRIT runtime bugs)

Target: `script.js`, `live.js`

Changes:
1. `script.js:703` — `parse()` divides skill XP by 10 unconditionally. Branch on source: `if (profile?.skillvalues)` (RuneMetrics) → `/10`; else hiscores raw, no divide.
2. `live.js:17,131,445` — `_liveAbortCtrl` never assigned. Assign `_liveAbortCtrl = new AbortController()` in `_liveFetchOnce`; thread `signal` into `liveFetch`/`raceProxies`. On player-switch, the abort actually cancels in-flight request.
3. `live.js:151` — `_liveFetchOnce(name, currentIdx)` ignores second arg. After await, check `_livePlayerIdx === currentIdx` before writing to `_liveSamples`/calling `_liveRender`.
4. `script.js:2162/2166/2207` — null-guard `#btn-refresh`, `#btn-dismiss-error`, `#lang-toggle` listeners.
5. `script.js:1981/2084/2095/2122` — null-guard `#loading-overlay`, `#main-content` access.
6. `script.js:747-754` — `fetchLive` fires 6 unguarded parallel calls per player. Route through `cacheFetch` + a per-player in-flight Map to dedup concurrent clicks.
7. `script.js:687` — `MEM_CACHE_TTL` 4.5min < `REFRESH_MS` 5min. Set to `REFRESH_MS + 30_000`.
8. `script.js:694-697` — `memCacheSet` overwrites everything; preserve truthy keys: `for (k of keys) if (val[k]) map.set(k, val[k])`.
9. `script.js:2086+2133` — double-scheduled timers on retry path. Add `clearTimeout(timer)` at top of `scheduledLoad`.

Verify: `npm run lint` passes; `node -e "import('./live.js')"` clean; manual: open DevTools Network, click refresh twice fast — only one round of fetches.

---

## CP-02 — Quest title `(miniquest)` suffix fix

Target: `goals.js`, `major-goals.js`, `next-steps.js`

RuneMetrics emits `"Enter the Abyss (miniquest)"` / `"The Hunt for Surok (miniquest)"`. Three modules drop the suffix → quest never matches → permanently incomplete in ROTM phase tree and Soclopata Mission Control rail.

Changes:
- `goals.js:212` `"Enter the Abyss"` → `"Enter the Abyss (miniquest)"`
- `goals.js:213` `"The Hunt for Surok"` → `"The Hunt for Surok (miniquest)"`
- `major-goals.js:173-174` same two fixes
- `next-steps.js:79-88` same fix in Soclopata rail

Verify: load page with Soclopata snapshot, open ROTM major-goal card — both miniquests show ✓ (already done per `data/soclopata_quests.json`).

---

## CP-03 — Necromancy 99 capstone bug

Target: `goals.js:313`

Goal "Necromancia 99" has `capstone: "Rune Mythos"`. Rune Mythos requires only Necromancy 24 → capstone-done override silently flips 99 goal to 100% complete at lvl 24+.

Change: drop the `capstone` key. Completion gated purely on `Necromancy ≥ 99`.

Verify: Decxus has lvl 99 Necro, should still show 100%; Soclopata pre-99 should show partial.

---

## CP-04 — Goals.js skill/quest list rewrites

Target: `goals.js`

Specific corrections (cite-by-line):
- `:70` add `{id:5, required:92, reason:"Soul Split"}` to `senntisten` skills.
- `:56` reason "The Curse of Arrav" → "Devious Minds" (Smithing 65).
- `:61` Magic 62 → 59, reason "Family Crest".
- `:73-82` add prereqs to `senntisten` quests: `Shield of Arrav`, `The Knight's Sword`, `Recruitment Drive`, `What's Mine is Yours`, `The Restless Ghost`.
- `:50-72` add `{id:18, required:37, reason:"Curse of Arrav"}` (Slayer).
- `:102-115` `prifddinas` WC 75 → 80 (MEP1); add Magic 66 entry.
- `:146-148` `worldwakes` — replace quest list with `capstone:"The World Wakes"` only.
- `:221-227` ROTM Phase 3 add `The General's Shadow (miniquest)`, `The Curse of Zaros (miniquest)`.
- `:290-298` `sliske` — rewrite quest list per [Sliske's Endgame requirements](https://runescape.wiki/w/Sliske%27s_Endgame): add `Death of Chivalry`, `One of a Kind`, `A Tail of Two Cats`, `Holy Grail`, `Nomad's Elegy`, `Dishonour among Thieves`, `Nomad's Requiem`, `Heart of Stone`, `The Mighty Fall`, `Throne of Miscellania`, `The Void Stares Back`, `Kindred Spirits`, `Hero's Welcome`. Remove `Branches of Darkmeyer`, `Fate of the Gods` (already covered separately).
- `:290-293` `sliske` skills — Prayer 75 → 80 (Light Within); add Crafting 80, Divination 80, Herblore 80, Slayer 80, Woodcutting 80, Magic 79.
- `:334` `base_50` add id 0 (Attack).
- `:33` parenthesize combat-level check: `((p && p.combatLevel) || 0) >= 95`.

Verify: open goals page for both players. Sliske card should show realistic skill/quest gaps. ROTM phase 3 should show 2 extra miniquests.

---

## CP-05 — RS3 level cap update (99 → 110/120)

Target: `script.js:117-146` `SKILLS` array

Per RS3 wiki experience-table (mid-2026):
- Attack/Strength/Defence/Ranged/Magic: max **120** (Combat Style Modernisation, 2025-09).
- Mining/Smithing: 110 (Aug 2024).
- Woodcutting/Fletching/Firemaking: 110 (Dec 2024).
- Runecrafting: 110 (Mar 2025).
- Crafting: 110 (Jun 2025).
- Hunter: 110 (Mar 2026).
- Thieving: 120 (Nov 2025).
- Already-elite skills unchanged (Slayer 120, Inv/Arch/Necro/Dung 120, Farming/Div/Herb/HP unchanged).

Changes: update `max` per skill id. Verify XP-table lookup `xpForLevel(120)` exists (extend if needed).

Verify: skills page renders correct bars; combat-style 120 cap shown in tooltip.

---

## CP-06 — next-steps.js corrections

Target: `next-steps.js`

- `:71` Pack Yak Summoning **67 → 96**.
- `:62` Wilderness Course/Hati Agility 70 → drop; replace with `{level:52, u:"Wilderness Agility Course"}` (or remove if redundant).
- `:19` drop fake Cooking 40 / Lunar Diplomacy gate.
- `:36` Tetsu/Death Lotus Def 70 → **85**, label "T85".
- `:116-117` Red Sandstone: drop "diário/daily" wording (cap removed).
- `:23` Phantom Guardian Necro 80 → relabel "Talent Tier 5 — Phantom Guardian" (Well-of-Souls talent gate, not level).
- `:32-33` Dragon weapons Att/Str 70 → 60.
- `:34-35` Sunshine/DSwift 75 → 76.
- `:30-31` Rune scimitar Att 50 → 40.
- `:79-88` Soclopata rail miniquest suffix (already in CP-02).
- `:120-121` Senntisten altar — drop "daily" framing.
- `:144` add generic rail fallback when player name unknown.
- `:137` `gap <= 25` filter: raise to `<= 40` for early-game players, or fall back to absolute closest if empty.
- `:287-293` storage key — scope per-player (`STORAGE_KEY + "-" + player.name`).

Verify: Mission Control panel on dashboard shows realistic next-steps with correct levels.

---

## CP-07 — tips.js skill gate corrections

Target: `tips.js`

- `:104` Soul runes ZMI lvl 50 — soul altar gate is **90**. Replace entry with Body/Nature alt or set lvl 90.
- `:88-89` Pyramid Plunder lvl 60 → lvl 81 entry (PP lvl 21 base, 600-900k at 91+; current 280k @ 60 misleading).
- `:122-125` Dungeoneering: reorder ascending lvl; Sinkholes (D&D, lvl 35 not 10).
- `:124` Sinkholes label add `intensity:"weekly"` D&D context.
- `:77` Herblore Aggression potion 82 — drop "overload-tier" reference (overloads are lvl 96).
- `:89` Dragon impling jar lvl 91 → cap at lvl 83 (jagex hunter cap), xp/h 200k → 140k.
- `:111` Hunter — unify PT/EN to "Big-game hunter" both locales.
- `:151-157` Combat skill entries `xph:0` — remove, let `_tipsCombatSetup` handle.

Verify: open Skills page → Tips panel for Runecrafting at lvl 50 — should NOT show Soul runes.

---

## CP-08 — memorial.js parchment CSS scope

Target: `memorial.js:241-252`

CSS custom-property block scoped to `.mem` selector but DOM root is `.mem-frame`. Every `var(--mem-parchment | --mem-ink | --mem-gold-aged | --mem-rule-c)` resolves to fallback → entire parchment aesthetic degraded.

Change: rewrite selector to `.mem-frame` (or add `mem` class to root in `renderMemorial`).

Also:
- `:155` Roman numeral `MMXXVI` (2026) — compute from `_memorialData.lastSeenISO` year.
- `:110-111` dead ternary `qp: Array.isArray(profile.activities) ? null : null` → `qp: null`.
- `:236, 656` move `MEMORIAL_CSS` const above `injectMemorialStyles` to drop TDZ risk.
- `index.html:156` add `aria-busy="true"` to `#memorial-mount`; clear in `renderMemorial`.

Verify: Memorial card shows parchment colors (warm cream + ink) not gray fallback.

---

## CP-09 — notifications dedup-before-isToday

Target: `notifications.js:103-118`

`_seen.add(id)` runs before `isToday` check → backfilled/clock-skewed events get blacklisted forever.

Change: only `_seen.add(id)` inside the `isToday` branch. Add silent bootstrap flag: first cold-load activity feed populates seen-set without toasting (`_bootstrapped` sentinel in localStorage).

Plus:
- `:13` drop unused `"goal"`/`"milestone"` from `NOTIF_TOAST_TYPES`.
- `:54` id derivation for `activity` type — include `ts` minute, not just first 60 chars of text.
- `:128, 180` drop empty `try/catch` around `CustomEvent`.
- `:202-204` drop dead `boss`/`dungeon` cases in `_iconFor`.

Verify: notifications.spec.js still passes; manual: clear localStorage, refresh page — no toast spam.

---

## CP-10 — money.js item IDs + stale numbers

Target: `money.js`

Item-ID corrections (cross-check each `{id,name}` pair against `data/ge_prices.json`):
- `:57` Clean irit 269 → 261
- `:99` Clean ranarr 265 → 259
- `:57-area` Unicorn horn dust 235 → 227
- `:129` Arrow shaft 44 → 52
- `:135` Ruby 1603 → 1609
- Full audit pass for every other `{id,name}` declaration.

Other:
- `:556` rename local `t` → `timeoutId` (shadows i18n).
- `:602` distinguish "missing price" from "negative profit" — return `null` not fallback `gp` when calc ≤ 0; render "Loss / missing data".
- `:26,44,297,303,329,341,347,394` remove dead `recReqs`.
- `:44` craft_water_abyss recReqs:{20:110} nonsense — drop.
- `:490,524` weekly methods marked `daily:true` → add `cadence:"weekly"`.
- `:83-94` craft_mist_runes / craft_mud_runes — add `quest:"Lunar Diplomacy"`.
- `:655,661,667,793` Power Loop synergy — take MAX not SUM of multipliers; drop fabricated values to 1.0 baseline.
- `:618-627` `isAlmostUnlocked` — don't short-circuit on quest gate; surface quest gap separately.
- `:23-58, 210-215, 294-299` refresh stale `gp` fallbacks against current weirdgloop.
- `:842` `data-mn-jump` rendered but no handler — wire or remove.

Verify: money page loads without errors; Power Loop bonuses look sane; missing prices show "—" not silent fallback.

---

## CP-11 — UI/UX consistency + a11y + mobile

Target: `index.html`, `style.css`, `script.js`

a11y additions:
- `index.html` first body child: `<a class="skip-link" href="#main-content">Skip to content</a>`.
- All `*-bar-fill` renderers (skill/quest/journal/p-card/tier-arc) — emit `role="progressbar" aria-valuenow=X aria-valuemax=100 aria-label="…"`.
- `script.js:1519-1540` filter pill handlers — sync `aria-pressed` across siblings.
- `script.js:1113-1114,1190-1191` `.ql-status` / `.j-check` per-player dots — add `aria-label`, drop `title=`.
- `script.js:1474-1475` route announcer — add `<div id="route-announce" aria-live="polite" class="sr-only">` and write tab name on launch.
- `index.html:5` add `<meta name="color-scheme" content="dark">`.
- `index.html:52` notif bell panel — add close button, Esc handler, focus trap, `aria-modal`.

Visual / mobile:
- `style.css:1224, index.html:298-323` 8-button dock at 375px — verify cascade actually shrinks; if not, drop `data-label` text on `≤400px` to recover 12px each.
- `style.css:560` `.p-card-combat {display:none}` — scope to `#player-cards .p-card-combat`; lookup.js stops being broken.
- `style.css:710-711` `.ql-row[data-qcat="both-done"]` opacity 0.4 — replace with `color: var(--text-3) + ✓ icon`; drop opacity.
- 37 `:hover` rules — wrap purely decorative ones in `@media (hover: hover)` block. Target list: `.skill-row, .feed-item, .ql-row, .j-row, .money-card, .p-card, .q-card, .tier-sigil, .back-btn, .lk-history-item, .revo-slot`.
- `style.css:363` undefined `--text-1` token — replace with `--text` or define alias.
- `style.css:921-927, 1183-1234` `.lk-input` — hard-set `font-size:16px` inside mobile breakpoint to defeat iOS auto-zoom.
- `style.css:1287-1295` `prefers-reduced-motion` block — explicitly null `transform` on hover selectors.
- `style.css:1056-1068` `.dock backdrop-filter blur(28px)` — drop blur ≤640px.
- `style.css:633/636, 674/684, 750-760, 823/860, 945-947` — remove duplicate dead CSS.
- `style.css:1117-1144` back-btn — add `min-block-size:44px`.
- `style.css:489-491` `.wiki-link` 0.62rem → 0.75rem + `--text-2`.
- `style.css:1149-1247` mobile `html{font-size:14px}` step at ≤380 — drop the second step (compounds with `0.55rem` rules to ~6px text).
- `style.css:1175,1182` drop `!important` after refactor; lift specificity properly.
- `style.css:1399-1420, 1761-1786` palette overrides — consolidate into one block.
- `style.css` — add `html { scrollbar-gutter: stable }`.
- `index.html:235` empty placeholder in HTML, i18n sets it (no flash of PT on EN).
- `index.html:299-323` drop redundant `title=`; keep `aria-label` + `data-label` only.

Verify: `tests/responsive.spec.js` passes on all viewports; axe smoke check on dashboard; manual at 360/375/390/768/1280/1920.

---

## CP-12 — Workflow + data-pipeline fixes

Target: `.github/workflows/update-data.yml`, `scripts/fetch_prices.py`, `data/meta.json`

- `update-data.yml:80-82` meta-update conditional — always stamp meta, regardless of non-meta change (so meta truthfully reflects last *attempt* timestamp). Add a separate `last-success` field per-file.
- `update-data.yml:69-73` quests validator — accept `{quests:[]}` IF previous file is < 7 days old; otherwise preserve. Block: don't always reject empty.
- `fetch_prices.py:36` duplicate dict key `329` — fix.
- `fetch_prices.py:104-107` overwrite logic — merge new prices into existing cache (don't drop items that 429'd today).
- `fetch_prices.py:88-102` add retry-with-backoff for transient 429.

Skip: TS migration (out of scope for this pass); CI test gating.

Verify: workflow YAML lint via `actionlint` if available; `python -c "exec(open('scripts/fetch_prices.py').read())"` doesn't blow up.

---

## CP-13 — Remove dead utils/* + dead functions

Target: `utils/*.js`, `live.js`, `script.js`, `i18n.js`, `combat.js`, `index.d.ts`

Already-confirmed dead code (3.1k+ LOC):
- `utils/accessibility.js`, `utils/dom-utils.js`, `utils/error-boundary.js`, `utils/error-handler.js`, `utils/fetch-dedup.js`, `utils/player-service.js`, `utils/realtime-sync.js`, `utils/responsive.js`, `utils/validation.js`, `utils/xp-validation.js` — delete.
- `utils/storage.js` — KEEP (only one actually loaded), BUT add `window.storage = storage; window.StorageManager = StorageManager` at file end so the `typeof storage !== 'undefined'` guards across modules become truthy. Otherwise the audited cache layer silently bypasses storage everywhere.
- `live.js:47` `function liveClearBaseline` — delete.
- `script.js:1617` `function renderNextSteps` — delete.
- `script.js:578-612` addTrackedListener / trackedSetTimeout / trackedSetInterval — delete (never called) OR refactor 24+34 raw `addEventListener` calls through them. Pick delete (cleanup) — leak is a separate finding to address case-by-case.
- `i18n.js:113-134, 432-454` 11 `meetup*` keys — delete.
- `i18n.js:29-30, 349-350` `navSenntisten` / `navPrifddinas` — Senntisten keep (still used in skills tooltip), Prifddinas delete.
- `i18n.js:104-110` drop unused `cbArmor` (keep `cbArmour`).
- `i18n.js:243,245,548,550` rename `tl15`/`tl25` → `tl1_5k`/`tl2_5k`.
- `i18n.js:259, 261` PT label collisions — rename to unique strings.
- `i18n.js:122, 441` `combatNotice` — drop fictional "March 2026" date, use neutral "post-Combat Style Modernisation".
- `index.d.ts` — full rewrite or delete. Pick delete (it lies about shape; rebuild later if TS migration happens).
- `major-goals.js:134-195` `ROTM_SKILLS`/`ROTM_QUESTS`/`mgRotmCount` — delete; derive from `GOALS.find(g=>g.id==="rotm")`.
- `data/sessions.json` — no consumer; delete from repo + .gitignore.
- `style.css` dead selectors enumerated in CP-11.

Verify: `npm run lint` passes; full page load shows no `ReferenceError`.

---

## CP-14 — Final Playwright pass + commit

Run:
1. `npx playwright test` (chromium + mobile-chrome at least; full matrix if disk allows).
2. Capture screenshots: dashboard, goals, money, skills+combat, quests, journal, lookup, live, memorial (PT + EN).
3. Manual click-through: tier-sigil → goals page → expand each tier → click quest link.
4. Verify cron freshness banner shows correct timestamp.

Commit strategy: one commit per checkpoint (CP-01 through CP-13) so each is independently revertable. Final commit `CP-14: audit fixes verified, screenshots in playwright-report/`.

---

## Out of scope for this pass

- TypeScript migration.
- Service-worker / offline-first PWA.
- Real Notification API integration.
- Light-theme variant.
- Skill XP-rate full re-derivation against current wiki for every skill (only the broken gates above).
- Mobile-first redesign of dock / nav.

---

## Verification gates

After CP-01–CP-13:
- `npm run lint` → 0 errors.
- `npx playwright test --project=chromium` → all green.
- `npx playwright test --project=mobile-chrome` → all green.
- Console at `http://localhost:3000` shows 0 `ReferenceError` / 0 unhandled rejections.
- `git diff --stat` reasonable scope per CP.
