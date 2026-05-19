# 11-performance

## Summary

Startup is OK: 10 deferred scripts run after parse, preloads kick off in parallel with JS. Biggest wins sit elsewhere — a confirmed event-listener leak on `#activity-feed`, full-document `attachImgFallbacks` scans on every render, the active tab re-rendering even when data is identical, `loadGEPrices` and `money.js`/`live.js`/`combat.js` paying their cost on every cold load (not just when their tabs open), and a preload cache-mode mismatch that probably wastes the `<link rel=preload>` directives. Also a missing visibility gate on the 5-min refresh timer.

## Severity legend
P0 = breaks core feature, P1 = significant bug/UX flaw, P2 = polish.

## Findings

### [P1] Event-listener leak on `#activity-feed`
- **Where:** `script.js:873` (`feed.addEventListener("click", function handler(e) { ... })`)
- **What:** `renderActivity()` attaches a click handler to the `#activity-feed` element. The element itself is never replaced — only its `innerHTML` is rewritten. Each subsequent render of the activity tab adds another listener to the same node.
- **Why:** `renderActivity` is invoked on:
  - every `renderAll(results)` (line 1617) when the activity tab is active,
  - every language toggle (line 1786 clears `_rendered`, then `renderAll(data)` runs),
  - every `launchSection("activity")` that hits the unrendered branch.
  After N triggers, clicking "Show more" appends N copies of the next page and the filter-reapply loop runs N times. The handler captures `shown`, `all`, `renderItem` via closure, so old activity arrays stay alive too — memory bloat over a long session.
- **Fix:** Use event delegation once at init (e.g. inside `initFilters()`), or replace the node, or remove before adding:
  ```js
  if (feed._activityHandler) feed.removeEventListener("click", feed._activityHandler);
  feed._activityHandler = handler;
  feed.addEventListener("click", handler);
  ```

### [P1] Active tab re-renders on every refresh, even when data is byte-identical
- **Where:** `script.js:1601-1617`
- **What:** `renderAll` does change-detection (`changed = ... totalXp !== ... || questsDone !== ...`), but only uses that flag to decide whether to clear `_rendered` (i.e. invalidate the cache for *other* tabs). Line 1617 calls `renderTab(getActiveTab(), results)` unconditionally — the active tab's renderer always fires.
- **Why:** Every 5 min the page rebuilds Mission Control + Major Goals + player cards + H2H + Journal even though XP is unchanged. Dashboard re-render touches dozens of DOM nodes. On mobile it's a visible micro-jank pulse.
- **Fix:** Gate line 1617 behind `if (changed || !_rendered.has(getActiveTab()))`. Same change-detection already exists — just reuse it.
  ```js
  const activeTab = getActiveTab();
  if (changed || !_rendered.has(activeTab)) renderTab(activeTab, results);
  ```

### [P1] `attachImgFallbacks(document.body)` scans the entire DOM on every render
- **Where:** `script.js:1548` inside `renderTab` (runs after every tab render); also `script.js:50` (`scope.querySelectorAll("img[data-fallback]")`)
- **What:** Every renderer call ends with a `document.body.querySelectorAll("img[data-fallback]")` across the *entire app* — dock, header, all pages (even inactive ones), all skill icons, all gear tiles, all money item icons. With combat + money + skills rendered, that's hundreds of imgs.
- **Why:** The per-img `_fb` flag makes the *binding* idempotent, but the *scan* still happens. On every renderTab call, every tab visit, every refresh, every language toggle.
- **Fix:** Pass the actually-touched scope:
  ```js
  function renderTab(tab, results) {
    const fn = _renderers[tab];
    if (fn) try { fn(results); } catch (e) { console.error(...); }
    const page = document.querySelector(`.page[data-page="${tab}"]`);
    attachImgFallbacks(page || document.body);
    _rendered.add(tab);
  }
  ```
  Each module that injects content outside its page (e.g. `renderMissionControl` writes to `#mission-control`, `renderMajorGoals` writes to `#major-goals`) can call `attachImgFallbacks(el)` locally with its own root.

### [P1] All ten JS modules ship on every cold load, including `money.js` (70 KB), `live.js`, `combat.js`, `lookup.js`, `goals.js`
- **Where:** `index.html:244-253`
- **What:** Total JS in the deferred block ≈ 300 KB unminified (8 028 LOC). `defer` parallelizes the *download* but preserves execution order, so the main thread executes all of them sequentially before `DOMContentLoaded` fires.
- **Why:** Only dashboard rendering is needed for first paint. `money.js` defines an 80-method DB + recommender; `combat.js` defines all ability bars + gear tiers; `live.js`, `lookup.js`, `tips.js` aren't useful until the user clicks those dock buttons.
- **Fix:** Three options, ROI-ordered:
  1. Lazy-load per tab. Wrap `_renderers` entries in dynamic `import()` — switch `<script defer>` to ES modules and only fetch when `launchSection(tab)` first hits that tab. Estimated 100–250 ms parse/exec saved on mobile cold start.
  2. Concat + minify into one bundle. Quick win without modules — terser drops ~60 % of bytes.
  3. At minimum, defer `live.js`, `lookup.js`, `tips.js` with `<script defer fetchpriority="low">`. (`fetchpriority="low"` works on `<script>` in modern Chromium.)

### [P2] Preload cache-mode mismatch likely wastes `<link rel=preload as=fetch>` directives
- **Where:** `index.html:15-21` (default cache mode) vs `script.js:562` (`cache: "no-cache"`)
- **What:** The preloads issue a normal cached fetch; `cacheFetch` then re-requests the same URLs with `cache: "no-cache"`, which forces a conditional revalidation. The HTML spec only lets the browser reuse a preload when cache mode matches — Chrome currently warns about this and may re-issue. Net effect: preload paid the cost, the fetch may not reuse it.
- **Why:** Recent commit (`da501d0`) flipped `cacheFetch` to `no-cache` to fix the stale-cache-after-deploy bug. Necessary fix, but the preloads were tuned to the old behavior.
- **Fix:** Either (a) drop `cache: "no-cache"` and instead append a cache-busting query (e.g. `?v=<meta.hash>` or `?t=<Date.now()/60000>`), (b) skip the preload tags and rely on Pages `Cache-Control` + the in-flight parallel fetch in `load()`, or (c) move from `<link rel=preload>` to a tiny inline `<script>` in `<head>` that kicks off `fetch(path, {cache:"no-cache"})` and stashes the promise on `window.__pre[path]` so `cacheFetch` can pick it up.

### [P2] No visibility gate on the 5-min refresh timer
- **Where:** `script.js:1746` (`timer = setTimeout(scheduledLoad, REFRESH_MS)`); only `live.js:538` pauses on `visibilitychange`.
- **What:** When the browser tab is backgrounded for hours, `scheduledLoad` keeps firing every 5 min — racing CORS proxies, parsing JSON, re-rendering the DOM (per the previous finding even unchanged data triggers a tab render). On mobile this drains battery and hits the proxy quotas.
- **Why:** No `document.hidden` check; `setTimeout` keeps ticking (background tabs throttle but don't stop).
- **Fix:**
  ```js
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) clearTimeout(timer);
    else if (!_loading) scheduledLoad();
  });
  ```
  And inside `scheduledLoad`, bail early if `document.hidden` (or queue once).

### [P2] `loadGEPrices()` runs at cold start for every user, only needed on the Money tab
- **Where:** `script.js:1774` (`loadGEPrices()` in `DOMContentLoaded`); `money.js:547`
- **What:** Cross-origin fetch to `api.weirdgloop.org` with an 8 s timeout. Triggered on every page load, even if the user never opens Money.
- **Why:** Comment at line 1773 acknowledges it shouldn't block dashboard render — but it still runs and burns a connect+RTT.
- **Fix:** Lazy. Call from `_renderers.money` (gate with a "loaded once" flag). If you want to keep the warming, defer to `requestIdleCallback`:
  ```js
  if ("requestIdleCallback" in window) requestIdleCallback(loadGEPrices, { timeout: 5000 });
  else setTimeout(loadGEPrices, 2000);
  ```

### [P2] `updateUIText()` re-queries ~55 elements by ID on every language toggle
- **Where:** `script.js:1143-1258`
- **What:** Each `s(id, text)` and `h(id, html)` calls `document.getElementById` fresh. Plus a `document.querySelectorAll(".dock .dock-btn[data-launch]")` at line 1246.
- **Why:** Lookup-by-id is cheap individually, but the function runs on lang toggle *and* on initial `DOMContentLoaded`, and on the next render `renderLastUpdated()` also re-queries `#last-updated` (line 482). The cumulative cost is small but trivially eliminable.
- **Fix:** Cache once on init:
  ```js
  const i18nEls = {}; // populate once in DOMContentLoaded after ids exist
  function bindI18n() { ["logo-text","subtitle-text",...].forEach(id => i18nEls[id] = document.getElementById(id)); }
  ```
  Or migrate to data-attributes (`data-i18n="navOverview"`) and one walk. Marginal.

### [P2] Activity feed click handler re-queries `$$(".feed-item")` across the whole document
- **Where:** `script.js:885` (`$$(".feed-item").forEach(...)`)
- **What:** On each "Show more" click the handler calls the global `$$` shortcut (line 495 = `document.querySelectorAll`). Activity items only live under `#activity-feed`.
- **Fix:** `feed.querySelectorAll(".feed-item")`. Minor.

### [P2] Skills sort parses textContent on every click
- **Where:** `script.js:1396-1411`
- **What:** "Gap" and "Combined XP" sorts walk every skill row and call `parseInt(el.textContent.replace(/[^0-9]/g, ""))`. 29 rows × 2 columns × per-click parsing.
- **Why:** Cheap (~1 ms), but `data` is in scope — sort by the numeric source instead.
- **Fix:** When sort is requested, read from `data[i].skills[sk.id]` directly and reorder DOM nodes; or stamp `data-xp` / `data-lvl` on each row during `renderSkills` and read those.

### [P2] localizeActivity runs ~50 regex passes per activity item, ~40 items
- **Where:** `script.js:1100-1140`
- **What:** Each call to `localizeActivity` (one per feed item) loops through 29 `_SKILL_RX` + ~20 `_PHRASE_RX`. With 40 activities × 50 regex = ~2 000 `String#replace` calls per Activity render — fast but not free.
- **Fix:** Combine all skill names into one regex `\b(Attack|Defence|...)\b` with a lookup table:
  ```js
  const _SKILL_LOOKUP = Object.fromEntries(EN_SKILL_NAMES.map((n, i) => [n, i]));
  const _SKILL_RX_COMBINED = new RegExp(`\\b(${EN_SKILL_NAMES.join("|")})\\b`, "g");
  out = out.replace(_SKILL_RX_COMBINED, m => tSkill(_SKILL_LOOKUP[m]));
  ```
  One pass instead of 29. Same trick for phrase regexes if you accept a tiny precedence reshuffle.

### [P2] Modules inject `<style>` tags at runtime instead of bundling into `style.css`
- **Where:** `goals.js:631-1014`, `money.js:1012-1142`, `next-steps.js:308-681`, `major-goals.js:246-415`, `live.js:550-654`
- **What:** Five modules each define a `*InjectStyles()` that creates a `<style>` and appends to `<head>` on first render. Combined ~1 500 lines of CSS that don't ship in the cached `style.css`.
- **Why:** Each first-tab-visit pays a CSSOM parse + recalc style + paint. Adds 5–15 ms per first visit on mobile, and the styles can't be preloaded.
- **Fix:** Inline the CSS into `style.css` (or split into `style-goals.css`, `style-money.css`, etc. and lazy-link them when the tab opens). Keep the JS file owning only behavior.

### [P2] `data-counter` animation kicks `setTimeout(200ms) + RAF` on every refresh
- **Where:** `script.js:1621-1628`
- **What:** After every successful refresh, schedules a 200 ms-delayed `$$("[data-counter]")` scan over the whole document and starts a fresh RAF per node. With change-detection passing through unchanged data (see [P1] above), this fires even when totals didn't move.
- **Fix:** Skip when `!changed`. Already trivial after the first [P1] fix.

### [P2] Skills sort triggers full `renderSkills(data)` re-render when reset to "default"
- **Where:** `script.js:1415-1418`
- **What:** Selecting the "ID" sort calls `renderSkills(data)` again, rebuilding all 29 rows via innerHTML. Other sorts reorder existing nodes via `grid.appendChild(r)` which is correct and cheap.
- **Fix:** Track the original order once (e.g. in `data-default-idx` attributes set during `renderSkills`) and reorder nodes — no innerHTML rebuild needed.

## Quick wins (bulleted, ordered by ROI)

- **Gate `renderTab` in `renderAll` on `changed`** (`script.js:1617`). ~1 line. Removes the largest avoidable cost on the 5-min refresh.
- **Fix the `#activity-feed` listener leak** (`script.js:873`). Move handler binding to one-time init or store/replace on each render.
- **Scope `attachImgFallbacks` to the just-rendered page** (`script.js:1548`).
- **Add `visibilitychange` pause to `scheduledLoad`** (`script.js:1746`).
- **Lazy-load `loadGEPrices`** until Money tab opens or via `requestIdleCallback`.
- **Defer `live.js`, `lookup.js`, `tips.js`, `combat.js` until their tabs open** (or concat+minify into one bundle as a stopgap).
- **Resolve preload cache-mode mismatch** — either drop `cache:"no-cache"` (use `?v=` busting) or drop the preload tags.
- **Move runtime-injected CSS into `style.css`** for the 5 modules.

## Notes / open questions

- The codebase is genuinely small (8 KLOC) and data payload is small (~110 KB total JSON, biggest file 44 KB). Most "perf wins" here are about avoiding wasted work, not parsing/rendering volume.
- No image dimensions on the dock SVGs — they're inline so it's fine, but the `<img>` tags rendered by `skillIconImg` set `width`/`height` only inline, which is good for CLS.
- `<link rel=preload as=fetch>` lacks the `type="application/json"` hint — browsers don't strictly require it but Chromium has historically been picky; verify in DevTools Network panel that the preloads are being matched, not duplicated.
- Worth measuring with `performance.mark`/`measure` around `cacheFetch`, `parse`, and `renderTab("dashboard")` to confirm the magnitudes before refactoring.
- `_memCache` (script.js:568) is reset wholesale by `memCacheSet` on each successful load — it never actually serves as a fallback unless `cacheFetch` itself fails (rare on same-origin static). Could be removed, or it could legitimately back the offline path. Out of scope here.
