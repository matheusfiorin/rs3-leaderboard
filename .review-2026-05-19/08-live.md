# 08-live

## Summary
`live.js` is a real-time XP tracker for a single player at a time. It polls RuneMetrics (via the proxy chain in `script.js`) on a user-selectable cadence (Off / 15s / 30s / 60s, default 30s), interpolates totalXp between polls with a sticky XP/hr rate, persists a per-player baseline in `localStorage`, and decorates the UI with confetti for level-ups and an ETA card for the inferred active skill. The implementation is thoughtful — the cold-snap-vs-live separation comment (lines 510–512), the cache-aware rate computation (lines 98–121), and the visibilitychange pause are all good. But there are several real correctness gaps: a player-switch race that swaps player data in the UI, a permanent baseline that turns "session" into "lifetime" after a day away, a visibility-resume that waits a full cadence before refreshing, and a sticky XP/hr that keeps ticking the counter forever after the player goes idle.

## Severity legend
- **P0** breaks core feature
- **P1** significant bug / UX flaw
- **P2** polish

## Findings

### [P1] Player-switch race shows previous player's data
- **Where:** `live.js:439-450` (switch handler), `live.js:124-136` (`_liveFetchOnce` inflight guard), `live.js:146-176` (`_liveTick`)
- **What:** While a poll for player A is in flight, the user can click player B. The switch handler clears samples/lerp state, then calls `_liveTick()` again. The new tick sees `_liveInflight === true` and bails out as a "fail". When the original A-poll finally resolves, it pushes A's snapshot into the now-cleared samples and calls `_liveRender(snap, baseline)` — but `_livePlayerIdx` is now 1 (B). The hero shows A's name/XP while the tab highlight says B, and the baseline for A is (re)saved.
- **Why:** `_liveTick` captures `name` at entry but the rendered side-effects use whatever `_livePlayerIdx` is at completion. There is no cancellation token tying the in-flight fetch to the player it was issued for. The switch handler does **not** `clearTimeout(_liveTimer)` either, so the previously scheduled poll can also fire after a switch.
- **Fix:**
  - Capture `_livePlayerIdx` at the top of `_liveTick`, and after `await` bail if it changed: `if (idxAtStart !== _livePlayerIdx) return;`.
  - In the switch handler, `clearTimeout(_liveTimer)` and set a generation counter that `_liveTick` checks before mutating state.
  - Snippet:
    ```js
    async function _liveTick() {
      if (!_liveActive) return;
      const idx = _livePlayerIdx;
      const gen = ++_liveGen;
      const name = PLAYERS[idx];
      const player = await _liveFetchOnce(name);
      if (gen !== _liveGen || !_liveActive) return; // stale
      ...
    }
    ```

### [P1] Visibility resume waits a full cadence before next poll
- **Where:** `live.js:537-547`, `live.js:139-144`
- **What:** On `visibilitychange → visible`, the handler calls `_liveScheduleNext()` which sets a `setTimeout(_liveTick, _liveCadenceMs)`. If the user left for 30 minutes, they see whatever the lerp extrapolated (or stale numbers) for up to another 30 s before fresh data lands.
- **Why:** `_liveScheduleNext` doesn't know how much time has elapsed since the last poll. The lerp loop is restarted but it operates on stale `_liveLerpRate`, so totals keep climbing as if the player were still actively training the whole time the tab was hidden.
- **Fix:** On resume, if `Date.now() - _liveLastPoll.at >= _liveCadenceMs`, call `_liveTick()` directly instead of scheduling. Or always call `_liveTick()` on resume — it self-reschedules.
  ```js
  } else if (_liveActive) {
    _liveTick(); // immediate poll, will reschedule itself
    _liveLerpLoop();
  }
  ```

### [P1] Baseline never expires — "session" becomes "lifetime"
- **Where:** `live.js:30-54` (baseline persistence), `live.js:516-520` (cold-snap baseline seeding), `live.js:78-90` (`_liveDiffFromBaseline`), `live.js:275-279`, `live.js:411`
- **What:** Baseline is stored in `localStorage` under `rs3lb-live-baseline` indefinitely. A user who plays today, comes back in 3 days, sees "Session: +12.3M · 72.0 h" — technically correct against the saved baseline, but presented as a "session" label and the only knob to reset is the small `↺` icon.
- **Why:** No staleness policy and no prompt on re-mount. `sessionMs = snap.at - baseline.at` will happily produce days/weeks.
- **Fix:**
  - On `renderLive`, if `Date.now() - baseline.at > 12 * 3600_000` (or some threshold), show a banner: "Baseline is 3 days old — start a fresh session?" with a one-click reset.
  - Or auto-reset baseline if it's older than e.g. 12 h and the user hasn't explicitly pinned it.
  - At minimum, change the `sessionLabel` to drop "Session" wording when delta > 24 h, e.g. `since 2026-05-17 14:30`.

### [P1] First-time baseline seeded from potentially 30-min-stale cron data
- **Where:** `live.js:504-528` (`renderLive`), `live.js:516-520`
- **What:** The comment at lines 508–512 correctly explains why `_liveColdSnap` is NOT pushed into `_liveSamples` (the cron snapshot can be 30 min stale, mixing it with a fresh poll inflates rate). But the same cold snap **is** used as the baseline when none exists. So a brand-new user lands on /live, the cron snapshot says "totalXp = 350M", baseline is saved as 350M, a real poll arrives 5 s later showing 350.05M (because the cron file was 20 min behind), and the UI shows "Session +50,000 · 0 min" before the user did anything.
- **Why:** Cold snap is used for both cosmetic-initial-paint and baseline-seed, but only the former is safe.
- **Fix:** Delay baseline creation until the **first live poll** lands. In `renderLive`, only paint from cold snap without saving a baseline; in `_liveTick`, when `liveLoadBaseline(name)` is null, set baseline from the live snap.
  ```js
  // renderLive: paint only, do not seed baseline
  if (p) {
    const snap = _liveSnapshotFromPlayer(p);
    _liveColdSnap = snap;
    _liveRender(snap, liveLoadBaseline(p.name)); // baseline may be null
  }
  ```

### [P1] Sticky rate keeps the counter ticking forever after player goes idle
- **Where:** `live.js:98-121` (`_liveComputeRates`), `live.js:181-208` (`_liveLerpLoop`)
- **What:** If all `_liveSamples` are identical (player not training), `_liveComputeRates` returns the previous `_liveLerpRate` so the lerp keeps moving "at the last known speed". That's the right call for short cache windows (~5 min RuneMetrics cache), but there is no upper bound. A player who trained for 30 min then went AFK will keep seeing the interpolated total tick up indefinitely; on the next real poll the counter snaps back down (or sideways) creating a visible glitch.
- **Why:** Stickiness has no decay or expiry. Even when ALL 20 samples in the window are identical, the rate is preserved.
- **Fix:** If `newest.at - oldest.at >= X` minutes (e.g. 10 min) and `newest.totalXp === oldest.totalXp`, clear the rate and update poll status to "idle".
  ```js
  if (!earliest) {
    const windowMs = _liveSamples[_liveSamples.length-1].at - _liveSamples[0].at;
    if (windowMs > 10 * 60 * 1000) return null; // idle, stop lerp
    return _liveLerpRate;
  }
  ```

### [P2] No backoff on consecutive failures
- **Where:** `live.js:166-175`, `live.js:20` (`_liveConsecutiveFails`)
- **What:** Counter is incremented but only used in the status label (`×N`). If proxies are down for an hour, the page hammers them at the user-selected cadence the whole time.
- **Fix:** When `_liveConsecutiveFails >= 3`, multiply the schedule delay by `min(2^fails, 8)` so cadence degrades to 1×, 2×, 4×, 8× of the user-chosen value. Reset on the next success.

### [P2] Player switch does not clear the pending poll timer
- **Where:** `live.js:439-450`
- **What:** Only `cancelAnimationFrame` is called. `_liveTimer` (the `setTimeout` handle from the previous scheduling) is left alive. The fired tick is mostly absorbed by `_liveInflight` and the immediate `_liveTick()` call also reschedules, but a "ghost" tick still runs and possibly marks the poll as fail or schedules an extra. Belt-and-braces fix:
  ```js
  if (_liveTimer) { clearTimeout(_liveTimer); _liveTimer = null; }
  ```

### [P2] `wasCached` mislabels idle player as server cache
- **Where:** `live.js:153-165`
- **What:** `wasCached = last && last.totalXp === snap.totalXp` is set when two consecutive polls return the same totalXp. That happens both when RuneMetrics served a cached profile **and** when the player simply isn't training. UI then claims "server cache" even though the upstream is fresh.
- **Fix:** Either soften the label (`"no change"`) or compare ETags / `lastUpdated` from the profile payload (RuneMetrics does include a timestamp).

### [P2] Active-skill ETA progress bar can render negative width
- **Where:** `live.js:325`
- **What:**
  ```js
  style="width:${Math.min(100, Math.round((... - xpForLevel(cur)) / (xpForLevel(cur+1) - xpForLevel(cur))) * 100))}%"
  ```
  Top is capped at 100 but bottom is unbounded. If `snap.perSkillXp[activeSkillId] < xpForLevel(cur)` (briefly possible during a level-up boundary, or for skills the API exposes off-by-one), the bar gets `width: -5%`. Most browsers clamp, but the rate label can still show nonsense.
- **Fix:** `Math.max(0, Math.min(100, …))`.

### [P2] Refresh button can no-op silently when a poll is in flight
- **Where:** `live.js:479-486`
- **What:** Clicking `⟳` calls `_liveTick()` which calls `_liveFetchOnce` — the `_liveInflight` guard returns `null` immediately, the spinner removes itself ~0 ms later, and nothing visibly happens. To the user, the click was ignored.
- **Fix:** Either await the existing inflight via a stored promise, or queue the request, or disable the button (`disabled` + cursor) while `_liveInflight`.

### [P2] `_liveFetchOnce` swallows all errors into "fail"
- **Where:** `live.js:124-136`, `live.js:582` (`parse` throws on `profile.error`)
- **What:** The `catch` returns `null` for any error class: proxy timeout, JSON parse, RuneMetrics `profile.error = "NO_PROFILE"` (private profile), or a 429. The status row shows "proxy failed" for all of them, which is misleading when the underlying cause is e.g. a private-profile.
- **Fix:** Differentiate error classes and bubble a small reason into `_liveLastPoll.status` (`"fail-proxy"`, `"fail-private"`, `"fail-parse"`). Existing `parse` already throws `new Error(profile.error)` — surface that.

### [P2] Lerp runs at full RAF (~60 fps) just to update one counter
- **Where:** `live.js:181-208`
- **What:** A `requestAnimationFrame` loop updates `#live-total-xp` and `#live-poll-eta` 60 times per second. For text that increments by ~80 XP/s at top rates, 4–10 fps is enough and noticeably cheaper on battery / fan-noise on phones.
- **Fix:** Replace the RAF with `setInterval(tick, 250)` (or 100 ms), or sample RAF but write to DOM only when the rounded value actually changes.

### [P2] Confetti host inside re-rendered subtree
- **Where:** `live.js:381-382`, `live.js:223-249`
- **What:** `root.innerHTML = ...` replaces the `#live-confetti-host` element each render. If a poll lands during the 1.4 s confetti animation (rare at 30 s cadence, common at 15 s), the host is destroyed mid-animation and pieces vanish. Pieces themselves are also removed via `setTimeout(piece.remove, 1400)` — those handles become orphaned if the parent is already gone.
- **Fix:** Move `#live-confetti-host` outside `#live-content` (e.g. append to `document.body` once in `renderLive` and reuse). Detach it from the innerHTML reset entirely.

### [P2] `liveStop` leaves module state dirty
- **Where:** `live.js:530-534`
- **What:** Does not clear `_liveInflight`. If the user leaves `/live` while a fetch is in flight, the next time they enter `/live` the first `_liveTick()` will be blocked by the stale flag until the abandoned fetch resolves. Also doesn't null out `_liveTimer` after `clearTimeout` (cosmetic).
- **Fix:** `_liveInflight = false; _liveTimer = null;` in `liveStop`. Consider also `AbortController` on the in-flight fetch so it actually cancels.

### [P2] Rate denominator includes cache-stall samples → underestimate
- **Where:** `live.js:98-121`
- **What:** When samples are `[fresh@T0, fresh@T1, cached@T2, cached@T3, cached@T4]` and `newest = T4 (cached, == T1)`, `earliest` is found as `T0` (first sample where xp differs from newest). The XP delta is `T1.xp - T0.xp` but the time span is `T4.at - T0.at`, inflating the denominator and producing a low rate.
- **Fix:** Use the **freshest non-cached sample** as the numerator timestamp too:
  ```js
  // walk backwards to find newest fresh sample
  let newestFresh = newest;
  for (let i = _liveSamples.length - 1; i >= 0; i--) {
    if (_liveSamples[i].totalXp !== _liveSamples[i-1]?.totalXp) { newestFresh = _liveSamples[i]; break; }
  }
  const ms = newestFresh.at - earliest.at;
  ```

### [P2] Counter interpolates while everything else is frozen
- **Where:** `live.js:181-208`
- **What:** The lerp updates `#live-total-xp` only. The active-skill progress bar, podium deltas, ETA-to-next-level, and tips stay frozen between polls. The big number "feels live", but the rest of the panel feels stuck — and the inconsistency is jarring once you notice it.
- **Fix:** Either also lerp the active-skill XP and its bar fill, or accept that "live counter" is the only live element and remove the lerp on totalXp for consistency. Don't half-do it.

### [P2] i18n bypasses `t()` everywhere
- **Where:** `live.js:266`, lines 297, 312, 321, 348, 367, 386, 395-397, 411-421, 429
- **What:** Strings are inlined as `lang === "pt" ? "X" : "Y"` ternaries instead of going through `t()` (used elsewhere in the codebase per `script.js:721`). Hard to centralize, no fallback, easy to drift.
- **Fix:** Add the strings to `i18n.js` and call `t("live.session")` etc. Not urgent, but worth flagging because the rest of the app uses `t()`.

### [P2] Inferred "active skill" flips between rotating combat skills
- **Where:** `live.js:252-260`
- **What:** During combat training (e.g. Slayer) Attack/Strength/Defence/HP all gain XP simultaneously. `_liveActiveSkill` returns whichever has the highest rate in the window — which can flip poll-to-poll between melee skills, making the ETA card jitter.
- **Fix:** Optionally collapse combat skills into a single "Combat" virtual ETA card, or smooth the active-skill selection with hysteresis (require N polls of the same #1 before switching).

### [P2] `_liveLastPoll`/`_liveSamples` survive tab-away and look stale on return
- **Where:** `live.js:530-534`, `live.js:381-424`
- **What:** When user navigates away and back, the status row shows "Last: 14:30 · ok" from a previous visit until the first new tick lands. Looks like the page just polled successfully when it actually hasn't.
- **Fix:** On `renderLive`, if `Date.now() - _liveLastPoll.at > _liveCadenceMs * 2`, hide the timestamp or label it `"stale"` until next tick. Or simply blank `_liveLastPoll` on re-mount.

## Quick wins (ordered by ROI)
1. **Add a `_liveGen` counter** in `_liveTick` to drop stale responses after player switch (P1, ~5 lines).
2. **Call `_liveTick()` instead of `_liveScheduleNext()` on visibility resume** (P1, 2-line change).
3. **Move baseline seed out of `renderLive` cold-paint** into the first real poll (P1, move 4 lines from `renderLive` into `_liveTick`).
4. **Idle-window check**: clear sticky rate when the full sample window is identical AND span > 10 min (P1, ~6 lines in `_liveComputeRates`).
5. **`Math.max(0, …)` on the progress bar width** (P2, 1 char).
6. **`clearTimeout(_liveTimer)` in the player-switch handler** (P2, 1 line).
7. **Move `#live-confetti-host` out of `#live-content`** (P2, ~10 lines).
8. **Backoff after N consecutive failures** (P2, ~6 lines).
9. **Throttle lerp to ~10 fps via `setInterval`** (P2, ~5 lines).
10. **Differentiate fail reasons** (P2, ~10 lines in `_liveFetchOnce`).

## Notes / open questions
- The `IS_LOCAL` shortcut in `liveFetch` bypasses proxies for localhost; nothing in `live.js` itself is affected, but worth noting that local dev sees different latency than prod.
- The 5M XP/h cap (line 115) is a sanity gate; consider lowering to ~3.5M and logging a warning when tripped — currently it silently keeps the previous rate, so a real bug in diff math would be invisible.
- `data[_livePlayerIdx]?.questList` (line 343) implicitly assumes the same player order in the global `data` array as in `PLAYERS`. True today (both seeded from `PLAYERS`), but a future re-order in `script.js` would break tips silently.
- Confirm intent for `Off` cadence: when `_liveCadenceMs === 0` the user has explicitly disabled polling, but the lerp loop still keeps extrapolating. Probably fine (user knows it's paused), but could surprise.
- The "RuneMetrics caches profiles ~5 min" hint (line 423) only appears after 3 samples — first-time users won't see it during the cache flap. Consider showing it whenever `_liveLastPoll.status === "cached"`.
