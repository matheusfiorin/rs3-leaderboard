# RS3 Leaderboard — Smoke Test Results
**Date:** 2026-04-09 | **Tester:** Claude (Playwright MCP) | **URL:** https://matheusfiorin.github.io/rs3-leaderboard/

## Summary: 20 tests — 17 PASS, 2 BUG, 1 VISUAL

---

## Navigation & Routing

| # | Test | Steps | Expected | Result |
|---|------|-------|----------|--------|
| 1 | Dashboard loads on `/` | Navigate to root URL | Dashboard page active, dock "Dashboard" highlighted | **PASS** |
| 2 | Skills via dock | Click Skills dock button | `#skills` hash, skills page active, dock highlights Skills | **PASS** |
| 3 | Quests via dock | Click Quests dock button | `#quests` hash, quests page active, dock highlights Quests | **PASS** |
| 4 | Journal via dock | Click Journal dock button | `#journal` hash, journal page active, dock highlights Journal | **PASS** |
| 5 | Lookup via dock | Click Lookup dock button | `#lookup` hash, lookup page active, dock highlights Lookup | **PASS** |
| 6 | Deep link `#skills` | Load URL with `#skills` hash directly | Skills page active, Skills dock highlighted | **PASS** |
| 7 | Old `#overview` alias | Load URL with `#overview` hash | Dashboard page active, Dashboard dock highlighted | **PASS** |
| 8 | Invalid hash `#senntisten` | Load URL with `#senntisten` | Should fallback to dashboard | **BUG** — blank page, no dock active |
| 9 | Invalid hash `#garbage` | Load URL with `#garbage` | Should fallback to dashboard | **BUG** — blank page, no dock active |
| 10 | Browser back button | Dashboard → Skills → Quests → Back | Returns to Skills, dock updates | **PASS** |
| 11 | Browser forward button | After back, press forward | Returns to Quests, dock updates | **PASS** |
| 12 | Goal card → Goals page | Click Soul Split card on dashboard | Goals page renders, back button works | **PASS** (but dock shows NONE active — see Bug 1) |
| 13 | Goals back button | Click "← Home" on goals page | Returns to dashboard, dock restores | **PASS** |

## Filters & Interactions

| # | Test | Steps | Expected | Result |
|---|------|-------|----------|--------|
| 14 | Activity feed filters | Click Level-ups, Quests, Bosses, All | Items filter by type | **BUG** — filters don't work, all 40 items always visible |
| 15 | Skill category filters | Click Combat, Gathering, Artisan, Support, All | Grid filters (29→8→etc→29) | **PASS** |
| 16 | Skill sort (Gap, XP, A-Z) | Click Gap sort, XP sort | Order changes correctly | **PASS** |
| 17 | Quest filters | Click Both Done, One Done, Do Next, All | List filters (361→20→31→etc→361) | **PASS** |
| 18 | Journal filters | Click Combat, Skills, Quests, All | Grid filters (45→6→14→15→45) | **PASS** |
| 19 | Language toggle | Click EN/PT button | All labels switch language | **PASS** |
| 20 | Error banner dismiss | Click X on outdated data banner | Banner hides | **PASS** |
| 21 | Money "Show more" | Click "Show more (+23)" | Hidden methods revealed, button removed | **PASS** |
| 22 | Grind tracker stats | Check grind section on dashboard | Shows XP, remaining, level, rate | **PASS** |

## Mobile (375px)

| # | Test | Result |
|---|------|--------|
| 23 | Dashboard layout | **PASS** — goal cards, player cards, activity feed all readable |
| 24 | Grind tracker mobile | **PASS** — stats grid, progress bar, chart placeholder visible |
| 25 | Skills page mobile | **PASS** — skill rows with icons, both players, XP bars |
| 26 | Quests page mobile | **PASS** — quest cards, filter pills, quest list scrollable |
| 27 | Combat section mobile | **VISUAL** — ability bar images overlap with text slightly |
| 28 | Dock on mobile | **PASS** — 5 buttons visible, touch targets adequate |

---

## Bugs Found

### BUG 1: Unknown hash → blank page (HIGH)
**Repro:** Navigate to `#senntisten`, `#garbage`, `#easter`, `#meetup`, `#money`, `#combat`, `#activity`, or any invalid hash.
**Expected:** Fallback to `#dashboard`.
**Actual:** No page active, no dock button active, blank white area.
**Fix:** In `launchSection()`, if no `.page[data-page="${page}"]` exists, redirect to `dashboard`.

### BUG 2: Activity feed filters broken (MEDIUM)
**Repro:** On dashboard, click "Level-ups", "Quests", or "Bosses" filter pills.
**Expected:** Feed items filter by type.
**Actual:** All 40 items remain visible regardless of filter.
**Root cause:** `initFilters()` line 1437 targets `.act-item` class but `renderActivity()` line 854 renders with `.feed-item` class. **Class mismatch.**
**Fix:** Change line 1437 from `$$(".act-item")` to `$$(".feed-item")`.

### BUG 3: Goals page — no dock button active (LOW)
**Repro:** Click any major goal card on dashboard (Soul Split, Prifddinas, etc).
**Expected:** Goals page opens with some dock indication.
**Actual:** Goals page renders correctly with back button, but dock shows no active button.
**Note:** This is by design (goals is a sub-page, not a dock page), but looks odd. Could highlight Quests since goals are quest-related, or dim all buttons to signal sub-page state.

### VISUAL 1: Combat ability bars on mobile (LOW)
**Repro:** Skills page → scroll to combat section on 375px width.
**Observed:** Ability bar icon images slightly overlap with percentage text.
**Fix:** Reduce icon size or add spacing in mobile breakpoint.

---

## Console Errors
All 17-34 errors are CORS-related (expected on GitHub Pages — live API blocked, falls back to cached JSON). **No JS runtime errors.**

## Data Integrity
- Both players (Fiorovizk, Decxus) load from cache
- 29 skills rendered with correct RS3 icons
- 361 quests loaded
- 45 journal achievements tracked
- 33 money making methods listed
- Grind tracker: Agility Lvl 37, 30,322 / 302,288 XP
