# 14-security

## Summary
Codebase mostly clean. No `eval`, no `new Function`, no `document.write`, no inline `onclick/onerror`, no cookies/redirects, no API keys/secrets. CSP present via `<meta>` and reasonably tight. Single concrete XSS-shaped finding (one unescaped attribute interpolation, P1 defence-in-depth) and one trust-path issue (untrusted CORS proxies sit between RuneMetrics and `parse()` → render). CSP has minor loose-grants worth tightening. The shipped `esc()` helper is used consistently everywhere player/quest/activity strings hit `innerHTML`, which is what keeps this safe.

## Severity legend
- **P0** = breaks core feature / actively exploitable
- **P1** = significant bug / latent vulnerability / defence-in-depth gap
- **P2** = polish / hardening

## Findings

### [P1] Unescaped player name in `title` attribute (Journal grid)
- **Where:** `script.js:1045-1046`
- **What:** `<div class="j-check p1-color..." title="${players[0].name}">` and `title="${players[1].name}"` interpolate the RuneMetrics-supplied `name` directly into an HTML attribute without `esc()`.
- **Why:** Every other render site in this file routes player names through `esc()` (e.g. `script.js:699, 757, 776, 914, 968-969, 1029` and lookup.js:227). These two `j-check` rows were missed. RS3 RSN validation (`/^[A-Za-z0-9 _-]{1,12}$/`) currently disallows `"` so it is not exploitable today, but if RuneMetrics ever serves an unexpected `name` field (Lookup tab burns this same `parse()` path with user-controlled input through third-party proxies — see next finding), the missing escape is what would turn it into stored-XSS in an attribute context.
- **Fix:**
  ```js
  <div class="j-check p1-color${p1d ? " done" : ""}" title="${esc(players[0].name)}">${p1d ? "✓" : ""}</div>
  <div class="j-check p2-color${p2d ? " done" : ""}" title="${esc(players[1].name)}">${p2d ? "✓" : ""}</div>
  ```

### [P1] CORS proxies inside the data-trust path
- **Where:** `script.js:514-554` (PROXIES, raceProxies, liveFetch), `lookup.js:83-131` (LK_PROXIES, lkFetchJSON), `index.html:9-10` (CSP `connect-src`)
- **What:** All non-localhost reads of RuneMetrics/hiscores are racey-fetched through `api.codetabs.com` and `api.allorigins.win`. Either proxy operator (or anyone who can MITM their TLS) can substitute the response body with arbitrary JSON that flows straight into `parse()` and then into all the rendering paths.
- **Why:** Today every rendered field is `esc()`-wrapped or numeric, so script execution is blocked. But the trust boundary is implicit: `parse()` doesn't validate types, the `activities[].text/details` strings are pasted into innerHTML (escaped), and a malicious proxy can also poison `name`, `combatLevel`, `rank` (rendered raw as numbers — `script.js:700` interpolates `p.rank` unescaped after assuming it is numeric), or `skillvalues[].id/level/xp`. A non-numeric `rank` would still only bleed into a span, but combined with the P1 above (`title="${players[*].name}"`) a proxy attacker could land an attribute-context payload.
- **Fix:** Two layers, pick at least one —
  1. Tighten `parse()` to coerce types: `Number(profile.rank)`, `String(profile.name).slice(0, 12)`, drop activity entries whose `text` is not a string ≤ 200 chars.
  2. Stop trusting third-party proxies for the homepage entirely: rely on the cached `data/*.json` written by the GH Actions workflow (which already validates schemas via `jq`). Confine `liveFetch` to the Live tab and the Lookup tab where it is opt-in.

### [P2] CSP `script-src` whitelists `cdn.jsdelivr.net` with zero usage
- **Where:** `index.html:9-10`
- **What:** `script-src 'self' https://cdn.jsdelivr.net` — but `grep` finds zero references to jsdelivr in the codebase.
- **Why:** Loose grants are silent attack surface. If a future script-injection bug occurs, an attacker can host their payload on jsdelivr (which mirrors arbitrary npm/GitHub) and bypass CSP.
- **Fix:** drop the jsdelivr origin.
  ```html
  content="default-src 'self'; script-src 'self'; ..."
  ```

### [P2] CSP missing several hardening directives
- **Where:** `index.html:9-10`
- **What:** No `object-src`, `base-uri`, `form-action`, or `frame-ancestors`. `default-src 'self'` covers `object-src` by inheritance, but the others are not.
- **Why:** `base-uri 'self'` prevents `<base href=evil>` redirecting all relative URLs (would re-route the `data/*.json` preloads). `form-action 'self'` is cheap. `frame-ancestors 'none'` would prevent clickjacking, **but** it cannot be set via meta tag — would need GH Pages `_headers` or move to a custom origin.
- **Fix:**
  ```html
  content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src https://fonts.gstatic.com; img-src 'self' data:; base-uri 'self'; form-action 'self'; object-src 'none';
  connect-src 'self' https://apps.runescape.com https://secure.runescape.com https://api.allorigins.win https://api.codetabs.com https://api.weirdgloop.org"
  ```

### [P2] `style-src 'unsafe-inline'` is unavoidable but worth tracking
- **Where:** `index.html:10`; inline `style="width:…%"` etc. in `script.js`, `goals.js`, `live.js`, `combat.js`, `next-steps.js`, `money.js` (dozens of sites).
- **What:** CSP cannot drop `'unsafe-inline'` for styles because rendering reaches for `style="--si:..."`, `style="width:X%"`, and `style="--style-color:..."` everywhere. Style injection is constrained (browsers won't run JS from CSS) but `expression()` ancestry / `@import` / data exfil via `background:url(...)` remain theoretical.
- **Fix:** Long-term: lift inline styles into CSS custom properties on the parent (already partially done with `--style-color`). Not urgent — flag for a future cleanup pass.

### [P2] Unused/dead data file
- **Where:** `data/sessions.json` exists, no `*.js` references `sessions.json`.
- **What:** Not a vulnerability but it inflates the GitHub Pages deploy surface and is potentially stale/dropped data. Confirms it never reaches a renderer (verified via `grep -n 'sessions'` over `*.js`).
- **Fix:** Delete the file or wire it up.

### [P2] localStorage usage — clean
- **Where:** `i18n.js:576,599` (`rs3lb-lang`), `lookup.js:18-27` (`rs3lb-lookup-history`), `live.js:32-53` (`rs3lb-live-baseline`), `goals.js:246-249` (`GOALS_STORAGE`)
- **What:** Only stores RSN strings, language code, XP baselines, and manual goal-check flags. No tokens, no auth state, no PII. Lookup history is regex-validated before save (`lookup.js:62, 67`) and `esc()`-wrapped on render (`lookup.js:197-200`). All other reads `JSON.parse` with `try/catch` and don't trust the parsed structure for any innerHTML insertion.
- **Fix:** None required.

### [P2] No secrets in client code
- **Where:** Whole repo
- **What:** `grep -i 'api[_-]?key|secret|token|password|bearer|authorization'` over `*.{js,html,json,yml,yaml}` returns zero hits. The Python price fetcher uses an unauthenticated public endpoint; the workflow uses the default `GITHUB_TOKEN` only via the `contents: write` permission scope.
- **Fix:** None required.

## Quick wins (ROI order)
1. Add `esc()` to the two `title="${players[*].name}"` interpolations in `script.js:1045-1046` — single-line fix, closes the defence-in-depth gap.
2. Drop `https://cdn.jsdelivr.net` from CSP `script-src` — removes unused attack surface.
3. Add `object-src 'none'; base-uri 'self'; form-action 'self'` to CSP — three tokens, cheap hardening.
4. Coerce/clamp types in `parse()` (`String(profile.name).slice(0,12)`, `Number(profile.rank)|0`) — kills the proxy-poisoning class entirely.
5. Stop using third-party CORS proxies on the homepage path; let the GH Actions workflow be the source of truth for cached views.

## Notes / open questions
- The GH Actions workflow at `.github/workflows/update-data.yml:32-49` uses `jq -e` validators (`(.error // empty) == empty and ((.skillvalues // []) | length) > 0`, `((.skills // []) | length) > 0`, `((.quests // []) | length) > 0`). Good. These validators don't sanity-check string lengths, so they wouldn't catch a 4 KB malicious "activity text" — but the only writer is RuneMetrics itself, which is operator-controlled (Jagex). Acceptable trust model.
- `combat.js:972,987` use `<img src="${WIKI_IMG(ab.icon)}" alt="${name}">` without `esc(name)`. `name` is hardcoded in the `ABILITIES` constant in the same file — currently safe — but the same pattern with player-supplied input would be a hole. Flagged as a style-convention note, not a finding.
- `WIKI_IMG(name)` (`combat.js:8`) resolves to `data/icons/${name}.png` — file:// path traversal via `..` segments is theoretically possible if `name` were ever attacker-controlled. It isn't, but worth noting alongside the above.
- CSP cannot be hardened to forbid framing via meta tag; setting `X-Frame-Options: DENY` requires a custom origin or a GH Pages `_headers`-equivalent. Out of scope for a static GH Pages site.
- The `<link rel="icon" href="data:image/svg+xml,<svg ...><text>⚔</text></svg>">` favicon is inline SVG via `data:` URL. `img-src 'self' data:` allows it, no script runs inside, no concern.
