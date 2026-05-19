# 01-notifications

## Summary

There is no "new updates since last visit" system in the codebase — what the user perceives as a stuck notification badge is `#activity-count` (`index.html:96`), populated by `renderActivity` (`script.js:849`) as `all.length` where `all` is the *flat list of activities returned by the RuneMetrics API*. That API is called with `&activities=20` (`script.js:11`), so each player always returns up to 20 entries (sliding window). For two active players the badge is permanently pinned at `20 + 20 = 40` and only drops below if a player has fewer than 20 lifetime activities. There is no `localStorage` key, no hash, no timestamp, no "seen" state of any kind. The transient toast notifications in `renderAll` (`script.js:1574–1600`) only fire on diffs between in-memory snapshots within the same session, so a reload always wipes the comparison baseline and a user returning the next day sees no toast either.

## Severity legend
P0 = breaks core feature · P1 = significant bug/UX flaw · P2 = polish.

## Findings

### [P0] Activity badge counts API-window size, not "new" anything
- **Where:** `script.js:849`, `script.js:836–848`, `script.js:11`, `index.html:96`
- **What:** `#activity-count` is set to the length of the merged `activities` arrays from both players. RuneMetrics is hit with `activities=20`, so on every page render the badge shows whatever the API returned (capped at 20 per player). For two active accounts this number is fixed at 40 for days, matching the user's complaint exactly.
- **Why:**
  - `script.js:11` — `profile: (n) => '…/profile?user=…&activities=20'` hard-codes a 20-item sliding window.
  - `script.js:610` — `parse(...)` returns `activities: profile.activities || []` verbatim, with no deduplication, age filter, or "since last seen" diff.
  - `script.js:837–847` — `renderActivity` flattens both players' activities into `all`.
  - `script.js:849` — `$("#activity-count").textContent = all.length;` — pure cardinality, no comparison.
  - No `localStorage`, `sessionStorage`, cookie, hash, or in-memory map tracks which activity ids the user has seen. Grep confirms zero references to `lastSeen`, `lastVisit`, `seen`, `unread`, `hasNew`, `newCount` anywhere in `*.js`.
- **Repro:**
  1. Open the dashboard. Click "Activity" — badge shows e.g. `40`.
  2. Wait any amount of time. The GitHub Actions cron in `scripts/` rewrites `data/*.json`; the activities array continues to be exactly 20 per player because the upstream API caps it.
  3. Reload. Badge still shows `40`. Repeat tomorrow. Still `40`. The badge has no concept of "new" so nothing can ever decrement it.
- **Fix:** Add a "last seen" timestamp in `localStorage` and count only activities newer than it. Reset on tab open. Minimal patch in `script.js`:
  ```js
  // near top, alongside other LS keys
  const ACT_SEEN_KEY = "rs3lb-activity-seen-at";

  // in renderActivity (script.js:836), after building `all`:
  const seenAt = parseInt(localStorage.getItem(ACT_SEEN_KEY) || "0", 10);
  const newCount = all.filter(a => a.ts > seenAt).length;
  const badge = $("#activity-count");
  badge.textContent = newCount > 0 ? `${newCount} new` : "0";
  badge.classList.toggle("has-new", newCount > 0);
  // Stamp "seen" only when the user actually views the tab:
  ```
  Then in `launchSection` (`script.js:1300`), when `page === "activity"`, write `localStorage.setItem(ACT_SEEN_KEY, String(Date.now()))` *after* render so the badge clears on next render. (i18n the "new"/"novas" label via `i18n.js`.)

### [P1] `updateHomeStats` writes to DOM ids that don't exist
- **Where:** `script.js:1331–1351`, `index.html` (no matching ids)
- **What:** `updateHomeStats` does `s("hcs-skills", …)`, `s("hcs-quests", …)`, `s("hcs-activity", …)`, `s("hcs-combat", …)`, `s("hcs-journal", …)`, `s("hcs-money", …)`, `s("hcs-goals", …)`. None of those ids exist in `index.html`. `getElementById` returns `null`, and the helper silently bails (`script.js:1334` — `const s = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; }`). The function is invoked from `renderAll` (`script.js:1618`) on every refresh and is fully dead — but it's the closest thing in the codebase to a "home card stats / notification" surface, so it is also likely where any future fix would live.
- **Why:** Grep for `hcs-` shows hits only in `script.js`. Likely orphaned by an old dashboard redesign.
- **Fix:** Either delete `updateHomeStats` and its caller, or reintroduce the dashboard ids in `index.html`. Recommendation: delete (lines 1330–1352 and the call at 1618) — `renderCards` / `renderMissionControl` / `renderMajorGoals` already cover the dashboard.

### [P1] In-session toasts cannot fire on level-ups that happened between visits
- **Where:** `script.js:1574–1600`
- **What:** `renderAll` emits toasts only when `data.length === 2` (previous in-memory snapshot exists) and the new value strictly exceeds it. On a fresh page load, `data = []` (`script.js:473`), so the very first render skips toasts unconditionally. Any level-up or quest completion that happened while the user was away never produces a notification — the only baseline is the *previous render in the same JS context*.
- **Why:** No persistence of the previous snapshot. The "milestone notification" block at `script.js:1575` literally guards on `data.length === 2`, comparing against the prior in-memory `data`, not against anything on disk.
- **Fix:** Persist the last-rendered totals per player in `localStorage` and diff against that on first render. Sketch:
  ```js
  const LAST_SNAP_KEY = "rs3lb-last-snap";
  function loadLastSnap() { try { return JSON.parse(localStorage.getItem(LAST_SNAP_KEY) || "[]"); } catch { return []; } }
  function saveLastSnap(rs) {
    localStorage.setItem(LAST_SNAP_KEY, JSON.stringify(rs.map(r => ({
      name: r.name, totalXp: r.totalXp, questsDone: r.questsDone,
      levels: Object.fromEntries(SKILLS.map(s => [s.id, (r.skills[s.id] || {}).level || 0]))
    }))));
  }
  ```
  At the top of `renderAll`, if `data.length === 0`, seed comparisons from `loadLastSnap()` (matching by `name`) instead of skipping the block. After the block, call `saveLastSnap(results)`.

### [P2] `_liveDetectLevelUps` requires two live samples in the same session
- **Where:** `live.js:211–221`
- **What:** Confetti / toast for live-tab level-ups only fires when `_liveSamples.length >= 2`. The cold-render snapshot (`_liveColdSnap`) is intentionally excluded (`live.js:508–522` explains why — cron data can be 30 min stale and would inflate xp/hr). Side-effect: a level-up that lands in the *first* live poll never confetti's, since there's no second sample yet.
- **Why:** `live.js:212` — `if (_liveSamples.length < 2) return [];`
- **Fix:** Acceptable tradeoff for the xp/hr math, but consider a secondary "warm-start" diff against `_liveColdSnap.levels` that only fires confetti (not rate updates) on the very first poll. Low priority.

### [P2] `data/sessions.json` is loaded by no JS file
- **Where:** `data/sessions.json` (exists, populated through April 2026); not referenced anywhere in `*.js` (`grep -l sessions.json` returns nothing).
- **What:** Looks like a "session highlights" feature stub that never landed. If you want a real "what's new this week" surface, this is the data shape that's already being produced — wire it into a dashboard panel and it doubles as the notification source.
- **Fix:** Either delete the file from the cron output (in `scripts/`) or render it (`renderSessions` would slot into `_renderers.dashboard`).

## Quick wins (ordered by ROI)

1. **Swap `all.length` for "new since last visit"** (`script.js:849`) — single function, ~10 lines, fully eliminates the user-visible "stuck for days" badge. Stamp `rs3lb-activity-seen-at` when the activity tab is viewed.
2. **Delete `updateHomeStats`** (`script.js:1330–1352` + call site 1618) — dead code that creates the illusion of a "home notification surface."
3. **Persist last snapshot for toasts** (`script.js:1574–1600`) — turns the toast system from "session-only" into a real notifier for level-ups that happened while the user was away.
4. **Visualize "new" state** — add `.badge.has-new { background: var(--gold-bg); color: var(--gold-bright); }` so a non-zero count actually looks alive.
5. **Show a dock indicator** — once #1 is in, light up `.dock-btn[data-launch="activity"]` with a small dot when `newCount > 0`, similar to the existing `.dock-live-pulse` (`style.css` near `.dock-btn-live`).

## Notes / open questions

- The user's report ("same number for days") is consistent with the API-cap explanation, but it's worth confirming with the user whether they're looking at the **`#activity-count` badge on the Activity page header** (most likely) or at some other UI element. There is no nav-level badge today, so if they mean "the dot on the dock", that's a separate request, not a regression.
- `data/meta.json` shows `2026-05-04T11:39:06Z` (timestamp from a captured commit window), and the live `load()` path keeps refreshing, so the stuck count is *not* a stale-cache problem. The recent commits `da501d0` and `a57d4d0` already address actual cron-write-validation issues; the notification bug is orthogonal.
- The CSP at `index.html:9–10` only allows `connect-src` to a handful of hosts. Any "since last seen" fix that needs server-side support would have to fit one of the existing allowlisted hosts — the simplest implementation (local-only `localStorage`) needs no CSP change.
- No tests exist for `renderActivity` (smoke tests in `SMOKE_TESTS.md` are manual). A regression test would be valuable but is out of scope for this report.
