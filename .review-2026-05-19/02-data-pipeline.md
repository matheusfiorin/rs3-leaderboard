# 02-data-pipeline

## Summary

Pipeline is mostly sound after da501d0 (`cache: "no-cache"` revalidation) and a57d4d0 (validator-gated overwrite). Three real bugs remain: (1) `meta.json` timestamp is decoupled from per-file freshness, so the "N min ago" badge and 25-min smart-skip gate lie when any single endpoint keeps failing the validator; (2) `scripts/fetch_prices.py` overwrites `ge_prices.json` with whatever it got, including `{}` on full failure — no validator, no preserve-on-error like the player files have; (3) the workflow's "no data changes → skip commit" branch is unreachable because `meta.json` is rewritten with a fresh `date -u` every run, so every cron tick produces a commit (147 of the last 150 commits are `Update player data [automated]`).

## Severity legend

P0 = breaks core feature, P1 = significant bug/UX flaw, P2 = polish

## Findings

### [P1] `meta.json` timestamp lies when per-file validators skip

- **Where:** `.github/workflows/update-data.yml:79`, `script.js:1657-1658`, `script.js:1680-1684`
- **What:** `meta.json` is rewritten with `$(date -u)` unconditionally at the end of the fetch step, even when every individual `fetch_or_keep` call hit the validator-skip branch and preserved a stale cache. The frontend uses this timestamp for two things: the user-visible "(N min ago)" badge, and the `CACHE_FRESH_MS = 25 min` gate that short-circuits the live retry path. The exact failure mode the new validator was meant to prevent — RuneMetrics `NOT_A_MEMBER` cache poisoning — is still invisible to the UI: stale data shows up labelled as "cached (2 min ago)" and `load()` skips the live retry entirely.
- **Why:** Line 79 runs regardless of fetch outcome. There's no aggregate "did anything actually refresh" check. `fetch_or_keep` prints `skip ...` to stdout but doesn't propagate state.
- **Fix:** Track per-file mtimes or bump `meta.json` only when at least one target was actually replaced. Cleanest is per-file timestamps:
  ```bash
  fetch_or_keep() {
    ...
    if jq -e "$validator" "$tmp" >/dev/null 2>&1; then
      mv "$tmp" "$target"
      echo "  ok  $label -> $target"
      updated=1
    ...
  }
  declare -A FRESH
  # set FRESH[$target]=$(date -u +...) when ok, else carry previous
  # write data/meta.json as { "files": {...per-file...}, "min": "...", "max": "..." }
  ```
  Frontend then uses the oldest per-file timestamp for `cacheIsFresh` instead of one global stamp.

### [P1] `scripts/fetch_prices.py` clobbers known-good `ge_prices.json` with partial / empty data

- **Where:** `scripts/fetch_prices.py:88-106`
- **What:** Unlike the bash `fetch_or_keep` wrapper used for player data, the price fetcher catches every exception per-item (line 98), silently skips, and at the end writes whatever the `prices` dict accumulated — even if it's `{}` because every request timed out. There is no validator gate and no preserve-previous-on-failure. The first time RS's `itemdb_rs` API has a multi-minute outage, `data/ge_prices.json` gets nuked to `{}` and the money page falls back to `_gePriceSource = "none"` until the next successful cron.
- **Why:** `with open('data/ge_prices.json', 'w') as f: json.dump(prices, f)` runs unconditionally. The 70-item loop is best-effort, fine for first fill, dangerous for refresh.
- **Fix:** Read existing cache first, merge new prices over it, gate the write on a minimum success ratio (e.g. ≥80% of items returned, or len(prices) ≥ 0.8 * total). Or simply refuse to overwrite when `len(prices) == 0`:
  ```python
  if not prices:
      print(f'No prices fetched; preserving previous data/ge_prices.json', file=sys.stderr)
      return
  # optional: merge with existing
  try:
      with open('data/ge_prices.json') as f:
          existing = json.load(f)
      existing.update(prices)
      prices = existing
  except FileNotFoundError:
      pass
  with open('data/ge_prices.json', 'w') as f:
      json.dump(prices, f)
  ```

### [P2] Workflow commits every cron tick because `meta.json` always diffs

- **Where:** `.github/workflows/update-data.yml:79,87-93`
- **What:** Line 79 rewrites `meta.json` to a fresh-down-to-the-second ISO timestamp every run, so `git diff --staged --quiet` (line 88) is **never** true once any commit history exists. The "No data changes" branch on line 89 is dead code. Result: 147 of the last 150 commits on master are `Update player data [automated]`, even on cron runs where every validator skipped. Git history is buried; bisecting real fixes is painful.
- **Why:** Coupling meta freshness signal to a file that's always part of the commit guarantees a commit. The validator-skip path already prints `skip ...` but doesn't influence whether `meta.json` updates.
- **Fix:** Same fix as the P1 above naturally solves this — bump `meta.json` only when something actually refreshed. Alternatively, write `meta.json` to a tempfile and `cmp -s` before moving, gated on per-file change detection. Or move the timestamp out of `meta.json` entirely and read it from `git log -1 --format=%cI` server-side (Pages doesn't expose this, so the in-file timestamp stays — but at least make it conditional).

### [P2] `<link rel="preload">` is wasted under `cache: "no-cache"`

- **Where:** `index.html:15-21`, `script.js:562`
- **What:** Seven `data/*.json` files are preloaded with `as="fetch" crossorigin="anonymous"` (default cache mode). The first actual fetch from `cacheFetch` (`script.js:562`) is `{ cache: "no-cache" }`. Per the Fetch spec, preload reuse requires matching cache mode — `no-cache` does not match `default`, so the browser issues a second request (conditional GET) instead of reusing the preloaded body. The preload becomes either dead weight or a redundant download on first paint. Pre-commit da501d0 this matched; after the fix it diverged.
- **Why:** da501d0 added `cache: "no-cache"` to fix the 10-min stale-body problem but didn't update the preload's request to match.
- **Fix:** Make the preload conditional too. There's no `cache` attribute on `<link rel="preload">`, so the canonical way is to drop the preload tags (the parallel-with-JS benefit was modest, and the now-conditional GET is cheap) **or** keep the preload and let `cacheFetch` use the default cache mode plus a cache-busting query string driven by the workflow's git SHA / meta timestamp:
  ```js
  // pseudo: read window._BUILD from a tiny inlined <script>, or fetch meta.json
  // first and reuse its timestamp as ?v=
  const r = await fetchWithTimeout(`${path}?v=${BUILD}`, {}, 3000);
  ```
  Whatever path is chosen, **the preload `href` and the actual fetch URL/options must match exactly** or the preload is ignored.

### [P2] `load()` re-fetches the same files twice on the live path

- **Where:** `script.js:1651-1654` then `script.js:1693` → `fetchLive` (`script.js:621-640`) → `cacheFetch` on lines 629-631
- **What:** Step 1 of `load()` already fetched profile/hiscores/quests for both players. When the cache is stale enough to fall through to step 3, `fetchLive(n)` is called for each player, and `fetchLive` issues `cacheFetch` for the same three files again as a fallback alongside the live calls. With `cache: "no-cache"` every one of those is a conditional GET. Net: 6 extra revalidation round-trips on every forced refresh, even though the in-memory results from step 1 are sitting in `cachedResults`.
- **Why:** `fetchLive` was designed to be standalone; `load()` was bolted on with its own cache read.
- **Fix:** Pass the already-fetched cache values into `fetchLive`, or expose a helper that takes pre-resolved cache:
  ```js
  async function fetchLive(n, cached) {
    const [p, h, q] = await Promise.allSettled([
      liveFetch(API.profile(n)),
      liveFetch(API.hiscores(n)),
      liveFetch(API.quests(n)),
    ]);
    if (p.status === "rejected") throw new Error("live_fail");
    const profile = p.value;
    const hiscores = h.status === "fulfilled" ? h.value : (cached?.hiscores ?? null);
    const quests   = q.status === "fulfilled" ? q.value : (cached?.quests   ?? null);
    return parse(profile, hiscores, quests);
  }
  ```

### [P2] Workflow bash has no `set -e` / `set -o pipefail`

- **Where:** `.github/workflows/update-data.yml:24,77,79`
- **What:** The `run: |` block doesn't enable strict mode. If `python3 scripts/fetch_prices.py` crashes (e.g. import error after a future edit), the next line still writes `meta.json` with a fresh timestamp and the commit step still pushes. Combined with the always-commits bug above, a fully broken pipeline is invisible — workflow run goes green, master gets a new "[automated]" commit, `meta.json` says data is fresh.
- **Why:** Default bash. Only `curl -sf` and `jq -e` have explicit exit-code handling; everything else is `echo`/`mv`/`python3` with no propagation.
- **Fix:** Add `set -euo pipefail` at the top of the multi-line `run:`, or restructure so the meta + commit steps are separate workflow steps that only run on success.

### [P2] `data/sessions.json` is committed but never read

- **Where:** `data/sessions.json` (3.9 KB), no references in `*.js` or `*.html`
- **What:** `grep -rn sessions` across the source returns zero hits. The file ships in deploys, is preload-eligible bandwidth, and likely represents a removed feature.
- **Fix:** Delete `data/sessions.json` if confirmed orphaned. If a future feature is planned, leave a `TODO` reference somewhere so it's not mystery cargo.

### [P2] In-memory cache TTL (`MEM_CACHE_TTL = 4.5 min`) can serve stale data after tab wake-up

- **Where:** `script.js:570,572-575`
- **What:** `memCacheGet` only checks wall-clock TTL against `_memCacheTime`, not against the real-world `meta.json` age. If the cron just ran while the tab was backgrounded, `scheduledLoad` ran 5 min ago, and the user comes back, `memCacheGet` still returns the old in-memory value as a fallback inside `load()` (lines 1665, 1695). With the existing 4.5-min TTL this usually works out, but the TTL was hand-picked to "just under REFRESH_MS" — it's brittle, not invariant-driven.
- **Fix:** Either drop the in-memory cache entirely (HTTP layer + `cache: "no-cache"` already gives a 304 in <100 ms) or key it on `meta.timestamp` instead of wall-clock so a fresh meta invalidates it automatically:
  ```js
  function memCacheGet(name, currentMetaTs) {
    if (currentMetaTs !== _memCacheMetaTs) return null;
    return _memCache[name] || null;
  }
  ```

### [P2] No exit-code propagation from `fetch_or_keep` skips → meta gets written even on total failure

- **Where:** `.github/workflows/update-data.yml:31-49,79`
- **What:** Even if all 6 player-data calls AND the prices script skip/fail, the workflow still reaches line 79 and writes a fresh `meta.json`. That's the root cause of P1 #1 and P2 #3 above. Worth calling out explicitly as a design issue: there's no "success threshold" for the run.
- **Fix:** Aggregate ok/skip counts:
  ```bash
  ok_count=0
  fetch_or_keep() { ...; ok_count=$((ok_count+1)); ... }
  ...
  if [ "$ok_count" -ge 1 ]; then
    echo "{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"ok\":$ok_count}" > data/meta.json
  else
    echo "No fetches succeeded; preserving data/meta.json"
  fi
  ```

## Quick wins (ordered by ROI)

1. **Add `set -euo pipefail`** to the workflow's `run:` block — 1 line, immediately surfaces silent failures (fixes the blast radius of all the other workflow bugs).
2. **Guard the `meta.json` write** behind "at least one fetch succeeded" — kills the "fresh timestamp on stale data" lie *and* the "always-commits" git noise in one move (P1 + P2 #1).
3. **Guard `fetch_prices.py`** against empty/partial overwrites — 5 lines of Python, prevents money page going dark on a single bad cron (P1 #2).
4. **Delete `data/sessions.json`** if orphaned — 1 file delete, removes ~4 KB from every deploy.
5. **Drop the now-unused preload tags** *or* match cache modes — recover the lost first-paint benefit OR stop shipping 7 dead `<link>` tags (P2 #2).
6. **Pass `cachedResults` into `fetchLive`** to drop 6 redundant conditional GETs per forced refresh (P2 #4).

## Notes / open questions

- The 09:04 → 11:23 gap in `meta.json` history (`6155df8` vs `a2f3ee6`) doesn't match the cron `*/30 * * * *` schedule — either workflows failed entirely (not just per-file) or `concurrency: cancel-in-progress: true` killed mid-run jobs. Worth checking GitHub Actions run history to confirm whether `set -e` would have flagged a real failure.
- GitHub Pages does send `ETag` and `Last-Modified` for static files, so `cache: "no-cache"` → 304 path is real and cheap (verified by the commit message's reasoning). No issue with the *correctness* of the da501d0 fix, only with its interaction with preload and with the bolted-on cache reads in `load()` + `fetchLive`.
- `loadGEPrices()` (`money.js:547-579`) calls `weirdgloop.org` live and falls back to `data/ge_prices.json` — fine, but it doesn't surface the source/age to the user the way player data does. If the workflow ever zeros out `ge_prices.json` (P1 #2) **and** weirdgloop is down, the money page will render zero-cost methods with no warning.
- CSP `connect-src` (`index.html:10`) includes `weirdgloop.org`, `codetabs`, `allorigins`, and both runescape.com hosts. Consistent with what the code does. Not flagging.
- No retry/backoff on `fetch_prices.py` HTTP failures (just a `time.sleep(0.5)` every 10 items for rate-limit pacing). Minor — RS itemdb is usually stable.
