# 09-lookup

## Summary

`lookup.js` is a single-file RSN search module: input validation regex, history pills (localStorage, max 5), CORS-proxy race against RuneMetrics, parse via `script.js#parse()`, render profile/skills/activities/quests. Core flow works, but several real bugs degrade output (RuneScore always 0 for lookups, language-switch leaves stale labels, in-flight requests aren't aborted, status region not announced) and the error surface conflates "not found" with "network/proxy down". Worth fixing; nothing blocks the feature.

## Severity legend

P0 = breaks core feature  
P1 = significant bug / UX flaw  
P2 = polish

## Findings

### [P1] RuneScore always renders as `0` in lookup profile card
- **Where:** `lookup.js:151`, `lookup.js:222`, `script.js:587-595`
- **What:** Profile card stat tile shows `RuneScore: 0` for every lookup result.
- **Why:** `lkFetchPlayer` calls `parse(profile, null, quests)` — second arg is hiscores. In `script.js:589` `parse` only fills `runeScore` and `clues` from `hiscores.activities`. With `null`, both stay 0. The stat tile (`fmt(p.runeScore || 0)`) then displays `0` unconditionally.
- **Fix:** Either fetch the group hiscores endpoint in parallel inside `lkFetchPlayer` (same pattern as `fetchLive`), or drop the RuneScore tile (and clue total) from the lookup profile card since the data isn't available:
  ```js
  const hiscoresUrl = `https://secure.runescape.com/m=hiscore/index_lite.json?player=${enc}`;
  const [profileRes, hsRes, questsRes] = await Promise.allSettled([
    lkFetchJSON(profileUrl), lkFetchJSON(hiscoresUrl), lkFetchJSON(questsUrl),
  ]);
  ...
  return parse(profile, hsRes.status === "fulfilled" ? hsRes.value : null, quests);
  ```

### [P1] Static UI strings don't refresh when language changes
- **Where:** `lookup.js:31-46`
- **What:** Switching language while on the lookup tab leaves placeholder, Search button, "Recent searches", and rendered result section headers in the previous language.
- **Why:** `renderLookupPage` returns early if `#lk-input` already exists (line 35) to preserve results. The early return also skips re-evaluating `t(...)` literals. No re-render hook on language change.
- **Fix:** On language switch, either re-render the whole page (clear `#lookup-content` then call `renderLookupPage`), or store the current player and re-run `lkBuild*` after updating labels. Simplest: in the language switch handler call `$("#lookup-content").innerHTML = ""` then `renderLookupPage()` and re-run last lookup if any.

### [P1] Concurrent proxies aren't cancelled after first win
- **Where:** `lookup.js:120-130`
- **What:** When the faster proxy resolves, the losing proxy keeps running until its 7s timeout, wasting bandwidth and the third-party proxy quota.
- **Why:** Each proxy creates its own `AbortController`, but `lkFetchJSON` has no shared cancel signal. `done = true` only suppresses the unused resolve/reject; the underlying `fetch` continues.
- **Fix:** Pass an external signal:
  ```js
  return new Promise((resolve, reject) => {
    const controllers = [];
    let pending = LK_PROXIES.length, done = false;
    for (const fn of LK_PROXIES) {
      const ctrl = new AbortController(); controllers.push(ctrl);
      fn(url, 7000, ctrl.signal).then(v => {
        if (!done) { done = true; resolve(v); controllers.forEach(c => c.abort()); }
      }, () => { pending--; if (pending === 0 && !done) reject(new Error("all_proxies_failed")); });
    }
  });
  ```
  and accept `signal` in each adapter, linking with its own timeout-abort.

### [P1] Proxy/network failures masquerade as "player not found"
- **Where:** `lookup.js:181-186`
- **What:** When proxies fail (`all_proxies_failed`) or fetch throws, the user sees `Player not found or profile is private (all_proxies_failed)`. Misleading — RSN is fine, the proxy is dead.
- **Why:** Branch only distinguishes `NOT_A_MEMBER` / `PROFILE_PRIVATE`; everything else falls through to the same string with the error appended in parens.
- **Fix:** Split into three buckets:
  ```js
  const m = err.message;
  let msg;
  if (m === "NOT_A_MEMBER" || m === "PROFILE_PRIVATE") msg = t("lookupError");
  else if (m === "all_proxies_failed" || m === "fetch_fail") msg = t("lookupNetwork");
  else msg = t("lookupError") + ` (${m})`;
  ```
  Add `lookupNetwork: "Couldn't reach RuneMetrics. Try again."` to both `i18n.js` blocks (line ~50 / ~343).

### [P1] No abort on rapid re-searches — old result can overwrite new one
- **Where:** `lookup.js:156-188`
- **What:** If user submits Search, then immediately searches a different RSN (or clicks a history pill), both `doLookup`s run. The slower one wins because it writes `results.innerHTML` last.
- **Why:** No request-id check or AbortController scoped to `doLookup`.
- **Fix:** Track a search token; bail out of the late finisher:
  ```js
  let lkSearchSeq = 0;
  async function doLookup(rsn) {
    const seq = ++lkSearchSeq;
    ...
    const player = await lkFetchPlayer(rsn);
    if (seq !== lkSearchSeq) return;
    ...
  }
  ```

### [P1] Status region not announced to screen readers
- **Where:** `lookup.js:45`, `lookup.js:160`, `lookup.js:186`
- **What:** Loading spinner and error message change `#lk-status` but assistive tech gets no notification.
- **Why:** `#lk-status` lacks `aria-live`.
- **Fix:** `<div id="lk-status" aria-live="polite" aria-atomic="true"></div>`.

### [P1] `LK_MAX_ACTIVITIES = 20` is dead — API already capped
- **Where:** `lookup.js:13`, `lookup.js:135`, `lookup.js:273`
- **What:** Profile is fetched with `activities=20`; slicing again to 20 is a no-op. Harmless but the constant suggests a configurable cap that isn't real.
- **Fix:** Either drop the slice + constant, or use it as the URL value (`activities=${LK_MAX_ACTIVITIES}`) so changing one number updates both.

### [P1] Empty "no activities" / "no quests" silently render nothing
- **Where:** `lookup.js:273-274`, `lookup.js:299-328`
- **What:** Brand-new accounts return zero activities — the section is omitted entirely, no message. Quests block always renders but if `totalQuests === 0` it shows `0%` and three zero stats with no explanation (e.g., F2P with quests not yet fetched).
- **Fix:**
  ```js
  if (!acts.length) return `<div class="lk-result-section"><h3>${t("activityTitle")}</h3><p class="lk-empty">${esc(t("noActivity"))}</p></div>`;
  ```
  Add `noActivity` / `noQuests` keys to i18n.

### [P1] `lkSaveToHistory` is called twice on success path
- **Where:** `lookup.js:166-167`
- **What:** After a successful lookup `lkSaveToHistory(player.name)` and `lkRenderHistory()` are both called. Not a bug, but if a history pill is clicked, `lkTriggerSearch` runs `doLookup(rsn)` which on success re-saves under the canonical case from the API — silently changing the casing in history. Probably desired (canonicalise), worth confirming.
- **Fix:** Either explicit (log the rename) or leave with a comment that canonicalisation is intentional.

### [P2] `totalClues` computed but never displayed
- **Where:** `lookup.js:215`
- **What:** `const totalClues = p.clues ? Object.values(p.clues).reduce((a, b) => a + b, 0) : 0;` — `totalClues` is never read. Dead code, also lookup never has clue data (see RuneScore finding).
- **Fix:** Delete the line, or render a Clues stat tile gated on `totalClues > 0`.

### [P2] Profile card duplicates combat level and rank
- **Where:** `lookup.js:225-237`
- **What:** Combat level renders in the dedicated `.p-card-combat` row AND inside the stats grid; same for overall rank. Visual redundancy.
- **Fix:** Drop the duplicates from `stats` and only render the header treatment; or drop the header rows and rely solely on tiles.

### [P2] Unescaped numeric/template fields
- **Where:** `lookup.js:229` (`p.combatLevel`), `lookup.js:256-257` (`s.level`, `fmt(s.xp)`), `lookup.js:286` (`fmtTime(a.date)`), `lookup.js:304-321` (quest counts), `lookup.js:323-325` (`p.questPoints`)
- **What:** Numeric API values are interpolated raw. Low XSS risk (API returns numbers) but inconsistent with the explicit `esc(String(s.val))` pattern used in the stats grid.
- **Fix:** Either trust numbers and drop `esc(String(...))` for the stats tile uniformly, or wrap all of them. Be consistent.

### [P2] `LK_IS_LOCAL` regex relies on substring match
- **Where:** `lookup.js:81`
- **What:** `/^(localhost|127\.|file)/.test(location.hostname || location.protocol)` — when on `file://`, `location.hostname` is empty so it falls through to `location.protocol` (`"file:"`), which matches. Works, but the dual-mode short-circuit is subtle and easy to break.
- **Fix:**
  ```js
  const LK_IS_LOCAL = location.protocol === "file:" || /^(localhost|127\.)/.test(location.hostname);
  ```

### [P2] `t` shadowed inside proxy adapters
- **Where:** `lookup.js:86`, `lookup.js:95`
- **What:** `const t = setTimeout(...)` shadows the i18n function `t()`. Fine today (closures don't reference `t()`), but trips refactors that try to use `t("...")` inside an adapter.
- **Fix:** Rename to `to`, `timeoutId`, or use the same pattern as `script.js#fetchWithTimeout`.

### [P2] No way to clear search history
- **Where:** `lookup.js:192-204`
- **What:** History pills can only grow (capped at 5). No "x" affordance to remove a single entry or clear all. Stale entries can pile up.
- **Fix:** Add a small ✕ inside each pill (or a "Clear" link beside the label) that splices the entry from `lkGetHistory()` and re-saves.

### [P2] No `Esc`/close keyboard shortcut from results
- **Where:** `lookup.js:176-180`
- **What:** Only the back button returns to search. Pressing `Esc` does nothing.
- **Fix:** In `doLookup` success path, attach a one-shot `keydown` listener for `Escape` that clicks `#lk-back-btn`.

### [P2] Input not auto-focused on render
- **Where:** `lookup.js:48-56`
- **What:** When switching to the lookup tab, the input doesn't gain focus, costing one click.
- **Fix:** `input.focus();` after wiring listeners.

### [P2] `lkBuildSkillsGrid` assumes `p.skills[sk.id]` shape silently
- **Where:** `lookup.js:245-246`
- **What:** Defaults to `{level: 1, xp: 0}` if a skill is missing, but doesn't surface that some data was lost (e.g. malformed API response).
- **Fix:** Acceptable as-is. If diagnosing user reports, consider logging `console.warn` on missing skill ids in dev.

## Quick wins (ordered by ROI)

1. Fix RuneScore = 0 (either fetch hiscores or drop the tile + dead `totalClues`). One line in the URL list, one branch in `parse` call.
2. Split error messages so proxy failures don't say "Player not found". Add one new i18n key.
3. Add `aria-live="polite"` on `#lk-status`. One attribute, big a11y win.
4. Re-render lookup page on language change (or wire a language hook).
5. Abort losing proxies via shared signal; reuses pattern from `script.js#raceProxies` if extracted.
6. Auto-focus the input on render.
7. Add empty-state copy for no activities / no quests.
8. Sequence-guard `doLookup` to prevent stale overwrites.

## Notes / open questions

- Hiscores endpoint behaviour through the codetabs/allorigins proxies is unverified — adding it to lookup may surface new failure modes. Worth a manual smoke against an opted-out hiscores account.
- "Banned player" isn't a distinct RuneMetrics error code — banned accounts return `NOT_A_MEMBER` or simply 404 the profile. Probably not worth surfacing separately unless product asks for it.
- History saves the API-canonical casing (`player.name`), but `lkTriggerSearch` from a pill validates with `LK_RSN_RE` first. Confirm no historical entries can fail this regex (e.g. a name that contained accented chars from a legacy display name format).
- Consider extracting the proxy race into a shared helper alongside `script.js#raceProxies` — the two copies are drifting (different timeout values, slightly different error messages).
