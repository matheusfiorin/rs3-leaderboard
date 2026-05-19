# RS3-LEADERBOARD COMPREHENSIVE CODE REVIEW
**Date:** 2026-05-19 08:31 GMT-3  
**Status:** 16 parallel reviews completed  
**Severity:** 4 P0 + 23 P1 + 8 P2 = 35 total findings

---

## CRITICAL FINDINGS (P0 - BREAKS CORE FEATURE)

### 1. **Activity Badge Frozen at API Window Size** [01-notifications.md]
- **Location:** `script.js:849`, `script.js:11`, `index.html:96`
- **Problem:** Badge shows all.length (20 per player) instead of NEW activity count
- **Impact:** Stuck at 40 for active players indefinitely — matches user complaint
- **Fix:** Track "last seen" in localStorage, count only activities newer than timestamp

### 2. **Combat Ultimates Never Placed in Revolution Bars** [06-combat-module.md]
- **Location:** `combat.js:94, 146, 235, 299, 398` (definitions) + `getMeleeBars/getRangedBars/getMagicBars/getNecroBars` (builders)
- **Problem:** Berserk, Deadshot, Omnipower, Sunshine, Living Death are defined but unused
- **Impact:** DPS estimates omit end-game abilities
- **Fix:** Wire ultimates into bar builders with level gating (like basics/enhanced)

### 3. **Money: Item ID Contradictions → Profit Corruption** [07-money.md]
- **Location:** `money.js:57, 99, 129, 135` (recipes)
- **Problem:** Same item ID resolves to different names; IDs don't match GE cache
  - `make_super_antipoison` has wrong ingredient IDs
  - `unf_ranarr` ingredient ID mismatch
  - `fletch_rune_arrows` / `cut_rubies` ID inconsistencies
- **Impact:** Silent profit calculation errors
- **Fix:** Audit all item IDs against current GE cache

### 4. **No Automated Test Suite** [16-testing.md]
- **Location:** repo root (no `package.json`, no CI unit tests)
- **Problem:** Only `node --check` (syntax-only), SMOKE_TESTS.md not in CI
- **Impact:** ≥9 regressions in 2 months, all unit-testable
- **Fix:** Add Jest or Vitest suite; integrate Playwright to CI

---

## HIGH-PRIORITY FINDINGS (P1 - SIGNIFICANT BUG/UX FLAW)

### Notifications & Data Pipeline (6 issues)

**[P1] `meta.json` Timestamp Lies When Validators Skip** [02-data-pipeline.md]
- **Location:** `.github/workflows/update-data.yml:79`, `script.js:1657-1658, 1680-1684`
- **Problem:** timestamp is rewritten fresh every run even if no file changed; creates false "recently updated" badge
- **Fix:** Only update timestamp when data actually changes

**[P1] GE Prices Overwritten with `{}` on Failure** [02-data-pipeline.md]
- **Location:** `scripts/fetch_prices.py`
- **Problem:** No validator (unlike player files); failure wipes cache with empty object
- **Fix:** Add validator gate, preserve on error like player fetch does

**[P1] Cron Commits Every Run (Unreachable Skip)** [02-data-pipeline.md]
- **Location:** `.github/workflows/update-data.yml`
- **Problem:** "if no data changes, skip commit" is unreachable because `meta.json` always updates
- **Impact:** Noise in commit history (147/150 recent commits are automated)
- **Fix:** Only commit if actual data changed, not just meta

**[P1] Level-Up Toasts Only Fire Within Session** [01-notifications.md]
- **Location:** `script.js:1574-1600`
- **Problem:** `renderAll` compares only against in-memory snapshot; on reload baseline is lost
- **Impact:** Level-up while away = no notification ever
- **Fix:** Persist last snapshot in localStorage, diff on cold load

**[P1] `updateHomeStats` Writes to Nonexistent DOM IDs** [01-notifications.md]
- **Location:** `script.js:1330-1352` (definition) + `script.js:1618` (call)
- **Problem:** Targets `#hcs-skills`, `#hcs-quests`, etc.—none exist in HTML. Dead code.
- **Fix:** Either restore dashboard or delete function entirely

**[P2] Live Level-Up Confetti Requires 2 Samples** [01-notifications.md]
- **Location:** `live.js:211-221`
- **Problem:** First level-up in session has no baseline to diff, so no confetti
- **Fix:** Acceptable tradeoff for rate calculation, but low-priority

### UX & Navigation (5 issues)

**[P1] Dock Buttons Icon-Only — No Text Label** [03-ux-flow.md]
- **Location:** `index.html:216-242`, `style.css:851-872`
- **Problem:** Cold users have no idea what ⚙️ / 🎯 / 📊 mean
- **Impact:** High friction on first visit
- **Fix:** Add visible text labels (at minimum on hover/focus; ideally always on desktop)

**[P1] Lookup Back Button Silently Clears Input** [03-ux-flow.md]
- **Location:** `lookup.js` (back handler)
- **Problem:** User types a name, then clicks back. Input vanishes, but they're still in lookup tab.
- **Fix:** Show toast or keep input visible + add instruction

**[P1] Goals/Mission/Major Goals Conflation** [05-goals-system.md]
- **Location:** Dashboard/Goals/Mission Control sections + `major-goals.js`
- **Problem:** Three overlapping UIs for similar data; confusing navigation
- **Fix:** Consolidate or clearly delineate

**[P1] Skills Tab Buries Combat Subpage** [03-ux-flow.md]
- **Location:** `index.html` Skills section
- **Problem:** Combat info requires scroll past all 28 skills; not discoverable
- **Fix:** Promote to own tab or first-class card

**[P1] Dock Overflows on 360-375px Phones** [13-mobile.md]
- **Location:** `style.css:998-1000`, `index.html:217-241`
- **Problem:** 8 buttons × 44px = 352px on a 360px phone = horizontal scroll
- **Impact:** Galaxy S22, iPhone SE/12 mini don't fit
- **Fix:** Reduce button size or hide/scroll on small screens

### Localization & State (5 issues)

**[P1] ~50 Hardcoded Strings Bypass i18n Dictionary** [04-i18n.md]
- **Location:** `goals.js`, `money.js`, `live.js`, `next-steps.js`, `combat.js`
- **Problem:** Inline `lang === "pt" ? ... : ...` ternaries instead of `t()` calls
- **Impact:** Maintenance friction, inconsistent updates
- **Fix:** Extract to `i18n.js`, replace with `t()` calls

**[P1] `t("easterTitle")` Key Missing from Dictionary** [04-i18n.md]
- **Location:** `script.js:1217-1218`; not in `i18n.js`
- **Problem:** Falls back to literal key string "easterTitle"
- **Fix:** Add key or remove orphaned calls

**[P1] Live Tab Permanent Baseline → "Session" Becomes "Lifetime"** [08-live.md]
- **Location:** `live.js` baseline persistence
- **Problem:** After 1 day away, user's baseline is stale. Logged XP looks like session gains.
- **Fix:** Decay or expire baseline after T hours

**[P1] Player Switch Race Shows Previous Player's Data** [08-live.md]
- **Location:** `live.js:439-450` (handler), `live.js:124-136` (guard), `live.js:146-176` (render)
- **Problem:** In-flight A poll completes while player B is selected, re-renders A's data under B's header
- **Impact:** Data integrity / user confusion
- **Fix:** Abort in-flight requests on player switch

**[P1] RuneScore Always `0` in Lookup Results** [09-lookup.md]
- **Location:** `lookup.js` profile render
- **Problem:** RuneScore field not parsed/populated from API response
- **Fix:** Check `parse()` output, ensure field is extracted

### Goals & Progression (2 issues)

**[P1] Capstone Override Contradicts Segmented Bar** [05-goals-system.md]
- **Location:** `goals.js:266-272` (override), `goals.js:379-401` (bar), `goals.js:615-626` (header)
- **Problem:** When capstone quest complete, ring shows 100% + celebration, but bar still shows real partial %
- **Impact:** Confusing mixed signals
- **Fix:** Align progress indicators (either all 100% or all real %)

**[P1] 25-Level Filter Hides Early-Game Unlocks** [05-goals-system.md]
- **Location:** `goals.js` (nsPickClosestUnlock filter)
- **Problem:** Low-level accounts see "no recommendations" instead of attainable goals
- **Fix:** Adjust gap threshold or remove for early game

### Live & Training (3 issues)

**[P1] Sticky XP/hr Ticks Forever After Player Goes Idle** [08-live.md]
- **Location:** `live.js` (lerp animation)
- **Problem:** Counter animation runs indefinitely even when no new XP coming in
- **Impact:** Psychological drift (looks like active farming when idle)
- **Fix:** Decay/stop lerp after T seconds of no data update

**[P1] Training Method Level Gates Wrong** [10-tips.md]
- **Location:** `tips.js:103-107` (Runecrafting) + others
- **Problem:** Runecrafting entries off by 20-50 levels from wiki; Summoning, Divination, Hunter, Agility, Dungeoneering also wrong
- **Impact:** Misleading advice
- **Fix:** Audit against live 2026 wiki

**[P1] Dungeoneering Sort Hides Better Entry** [10-tips.md]
- **Location:** `tips.js` (sort order)
- **Problem:** Recommended method ranked below a suboptimal one
- **Fix:** Fix sort key or entry order

### Accessibility & Mobile (6 issues)

**[P0] No Visible Focus Indicator on Any Button/Dock/Pill** [12-accessibility.md]
- **Location:** `style.css:1-1063` (only `.lk-input:focus` styled)
- **Affects:** `.btn-refresh`, `.btn-dismiss`, `.lang-toggle`, `.pill`, `.dock-btn`, `.back-btn`, `.lk-btn`, `.feed-more`, links
- **Problem:** WCAG 2.4.7 Focus Visible (AA) fail
- **Fix:** Add `outline: 2px solid #gold` or ring to all interactive elements

**[P1] Sub-10px Text Throughout** [12-accessibility.md]
- **Location:** Multiple (0.5–0.62rem on 15px base = 7.5–9.3px)
- **Problem:** WCAG 1.4.4 Text Spacing (AA) fail
- **Fix:** Increase min font-size to 12px (0.75rem)

**[P1] Keyboard Navigation Silent on Route Change** [12-accessibility.md]
- **Location:** `script.js` (launchSection handler)
- **Problem:** Focus doesn't move or announce when SPA route changes
- **Fix:** `.focus()` on main content, use `aria-live="polite"`

**[P1] Input Font Triggers iOS Auto-Zoom** [13-mobile.md]
- **Location:** `.lk-input` styles
- **Problem:** `font-size: <16px` on input causes iOS zoom-on-focus
- **Fix:** Set `font-size: 16px` on `.lk-input`

**[P1] Touch Target <44px on Header/Pills/Buttons** [13-mobile.md]
- **Location:** Various header icons, pill buttons, back-btn
- **Problem:** WCAG 2.5.5 Target Size (AA) fail
- **Fix:** Ensure all interactive elements ≥44×44px (with safe margin)

**[P1] No Visible `aria-pressed` / `aria-current` on Tabs** [12-accessibility.md]
- **Location:** Dock buttons, pill filters
- **Problem:** Screen readers can't detect which tab/filter is active
- **Fix:** Add `aria-pressed="true"` to active buttons, sync with JS

### Performance & Memory (3 issues)

**[P1] Event Listener Leak on `#activity-feed`** [11-performance.md]
- **Location:** `script.js:873`
- **Problem:** Click handler added every render without cleanup; `innerHTML` rewrite doesn't remove old listeners
- **Impact:** Memory leak; degraded performance after repeated activity views
- **Fix:** Use event delegation or clear listeners before `innerHTML` write

**[P1] Full-Document `attachImgFallbacks` Scan Every Render** [11-performance.md]
- **Location:** `script.js` (called on every render)
- **Problem:** Scans entire DOM for broken img elements; N^2 on multi-renders
- **Fix:** Cache selector results or run only on data change

**[P1] Active Tab Re-Renders Even When Data Identical** [11-performance.md]
- **Location:** `script.js` (renderAll on every refresh)
- **Problem:** No diffing; re-renders even if no changes
- **Fix:** Add shallow data diff before re-render

**[P2] Missing Visibility Gate on 5-Min Refresh Timer** [11-performance.md]
- **Location:** `script.js`
- **Problem:** Refresh runs even when tab hidden
- **Fix:** Check `document.hidden`, pause on blur/visibilitychange

### Security & Code Quality (3 issues)

**[P1] Unescaped Player Name in Title Attribute** [14-security.md]
- **Location:** `script.js:1045-1046` (Journal grid)
- **Problem:** `title="${players[0].name}"` no `esc()`; XSS if RuneMetrics API returns malicious name
- **Fix:** Wrap with `esc()`

**[P1] Dead Functions (4 total)** [15-code-quality.md]
- **Location:** `script.js:641` `fetchCached`, `:1328` `initTabs`, `:1456` `renderNextSteps`; `live.js:46` `liveClearBaseline`
- **Problem:** Zero call sites; bloat
- **Fix:** Delete

**[P1] Duplicated Code Chunks (3 major)** [15-code-quality.md]
- **Location:** CORS proxy chain (multiple files), ROTM data (ROTM_SKILLS/QUESTS), Skill name tables
- **Problem:** Drift risk; maintenance burden
- **Fix:** Extract to single shared module

---

## POLISH FINDINGS (P2)

- `data/sessions.json` loaded by no file — feature stub [01-notifications.md]
- Unused i18n keys (`decMonth`, `meetup*`, `sortId*`, `gainsTitle`, `noReqs`, `skills`, `quests`) [04-i18n.md]
- Orphaned ROTM_SKILLS/QUESTS catalogs in `major-goals.js` [05-goals-system.md]
- Gear tables cap at T70 (missing T80/90/99 tiers) [06-combat-module.md]
- Unused affordances: `data-mn-jump`, `recReqs`, dead-link selectors [07-money.md]
- Preload cache-mode mismatch (`<link rel=preload>` wasted) [11-performance.md]
- Missing skip link (a11y best practice) [12-accessibility.md]

---

## IMPACT SCORECARD

### By Area (P0+P1 count):
1. **Notifications & State** — 6 issues (stuck badge, lost toasts, dead DOM, player race)
2. **Accessibility** — 6 issues (focus, text size, keyboard nav, font zoom, targets, aria) — **WCAG AA risk**
3. **Localization** — 5 issues (50 hardcoded, missing keys, stale labels, baseline decay)
4. **UX & Navigation** — 5 issues (dock labels, lookup flow, goals overlap, combat buried, overflow)
5. **Live & Training** — 3 issues (sticky rate, level gates, sort)
6. **Goals & Progression** — 2 issues (capstone contradiction, early-game gaps)
7. **Performance & Memory** — 3 issues (listener leak, full-scan, rerender, visibility gate)
8. **Code Quality** — 3 issues (dead functions, duplication, unescaped attribute)
9. **Data Pipeline** — 3 issues (meta lie, GE fail, cron noise)
10. **Testing** — 1 issue (no suite)

**Total: 4 P0 + 23 P1 + 8 P2 = 35 findings**

---

## RECOMMENDED FIX PRIORITY

### Phase 1: Core Functionality (Week 1)
1. **Activity badge "last seen"** — P0, visible daily, 10-line fix
2. **Combat ultimates in bars** — P0, wrong DPS math, medium effort
3. **Money item ID audit** — P0, profit corruption, ~2h audit + fixes
4. **Add test suite stub** — P0, prevent future regressions, Jest setup
5. **Player switch race** — P1, data integrity, med effort

### Phase 2: User Experience (Week 2)
6. **Visible focus indicators** — P1, WCAG AA, 20-min CSS
7. **Persist level-up toasts** — P1, missing notifications, 30-min localStorage
8. **Dock text labels** — P1, cold-start UX, CSS media queries
9. **Capstone override alignment** — P1, UI contradiction, logic fix
10. **Unescaped title escape** — P1, security, 2-line fix

### Phase 3: Refinement (Week 3+)
11. **Hardcoded i18n to dictionary** — P1, maintenance, refactor
12. **Sticky XP/hr decay** — P1, realism, animation logic
13. **Training level gates audit** — P1, accuracy, data QA
14. **Performance optimizations** — listener leak, scans, visibility gate
15. **Accessibility full pass** — text size, touch targets, keyboard nav

---

## DETAILED REVIEW DOCUMENTS

All 16 comprehensive reviews available in:  
`/home/mathe/rs3-leaderboard/.review-2026-05-19/`

- **01-notifications.md** — P0 badge + P1 toasts, dead DOM
- **02-data-pipeline.md** — P1 meta/GE/cron validation
- **03-ux-flow.md** — P1 dock labels, lookup, Goals conflation
- **04-i18n.md** — P1 hardcoded strings, missing keys
- **05-goals-system.md** — P1 capstone contradiction, gaps, ROTM
- **06-combat-module.md** — P0 ultimates + P1 gear tiers
- **07-money.md** — P0 item IDs + P1 stale gp fallbacks
- **08-live.md** — P1 player race, baseline decay, sticky rate
- **09-lookup.md** — P1 RuneScore, stale labels
- **10-tips.md** — P1 level gates, Dungeoneering sort
- **11-performance.md** — P1 listener leak, full-scan, rerender, visibility
- **12-accessibility.md** — P0 focus + P1 text size, keyboard nav, aria
- **13-mobile.md** — P1 dock overflow, touch targets, font zoom
- **14-security.md** — P1 unescaped title
- **15-code-quality.md** — P1 dead functions, duplication
- **16-testing.md** — P0 no suite + 9 regression history

---

**Ready for fixer agent handoff.**
