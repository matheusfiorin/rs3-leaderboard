# 15-code-quality

## Summary
Codebase is ~8K lines of vanilla JS split across 10 globals-only files loaded in order from `index.html`. Code is readable, but suffers from three structural drags: (1) duplicated chunks (CORS proxy chain, ROTM data, English skill-name tables) that drift independently, (2) dead functions and unused locals carried forward across versions, and (3) heavy inline `lang === "pt" ? ... : ...` ternaries (~100 sites) plus repeated `toLocaleString(currentLang === "pt" ? "pt-BR" : "en-US")` calls that bypass the existing `t()` / `tSkill()` infrastructure. No P0 quality bugs; everything below is cleanup that compounds.

## Severity legend
- **P0** = breaks core feature
- **P1** = significant bug / drift risk / clear duplication
- **P2** = polish, style, micro-leak

## Findings

### [P1] Dead top-level functions
- **Where:** `script.js:641` `async function fetchCached`, `script.js:1328` `function initTabs`, `script.js:1456` `function renderNextSteps`, `live.js:46` `function liveClearBaseline`
- **What:** All four have zero call sites in the codebase (`grep` across `*.js` + `*.html` returns only the definition).
- **Why:** Replaced or superseded — `fetchCached` was inlined into `load()`'s parallel cache read at `script.js:1651`; `renderNextSteps` was replaced by `next-steps.js`'s `renderMissionControl`; `initTabs` is just an alias for `initNavigation`; `liveClearBaseline` was never wired to the `↺` reset button (the reset just overwrites with current snap at `live.js:474`).
- **Fix:** Delete all four. ~60 lines gone, plus the unused dep on `_lastUpdated`/`fetchLive` plumbing inside `fetchCached`.

### [P1] CORS proxy chain duplicated between `script.js` and `lookup.js`
- **Where:** `script.js:514-555` (`PROXIES`, `raceProxies`, `liveFetch`, `fetchWithTimeout`) vs `lookup.js:81-131` (`LK_IS_LOCAL`, `LK_PROXIES`, `lkFetchJSON`)
- **What:** Two near-identical implementations of "race CodeTabs + AllOrigins, take first success, fall back to local." Same URL templates, same timeouts (7000/5000ms), same `allorigins_empty` error string.
- **Why:** `lookup.js` was apparently authored as a self-contained module but `script.js` is always loaded after it (`index.html:246` then `:253`), so `liveFetch` is available at call time.
- **Fix:** Delete `lookup.js:81-131` and call the global `liveFetch(url)` from `lkFetchPlayer`. Saves ~50 lines and removes drift risk (e.g., adding a third proxy to `PROXIES` silently won't apply to lookup).

### [P1] ROTM data duplicated between `goals.js` and `major-goals.js`
- **Where:** `goals.js:202-222` (rotm `.skills`) + `goals.js:152-200` (`.phases[*].quests` flattened at `:234-241`) vs `major-goals.js:129-178` (`ROTM_SKILLS`, `ROTM_QUESTS`)
- **What:** Same RS3 quest chain + skill thresholds encoded twice. `major-goals.js` uses its copy in `mgRotmCount` to render the dashboard ring; `goals.js` uses its copy on the goals page.
- **Why:** Quick second-pass implementation; never reconciled.
- **Fix:** Delete `ROTM_SKILLS` / `ROTM_QUESTS` from `major-goals.js`. Read from `GOALS.find(g => g.id === "rotm").skills` and `.quests` directly:
```js
function mgRotmCount(player) {
  const rotm = GOALS.find(g => g.id === "rotm");
  const total = rotm.skills.length + rotm.quests.length;
  let done = 0;
  for (const sk of rotm.skills) if ((player.skills[sk.id]||{}).level >= sk.required) done++;
  for (const q of rotm.quests) if (hasQuest(player, q)) done++;
  return { done, total };
}
```

### [P1] English skill names defined twice
- **Where:** `script.js:27-33` (`SKILL_NAMES_EN`, object id→name) and `script.js:1069-1099` (`EN_SKILL_NAMES`, array same data)
- **What:** Same 29 strings, different shapes. `SKILL_NAMES_EN` powers `SKILL_ICON()`; `EN_SKILL_NAMES` powers the activity-text localizer regex.
- **Fix:** Keep the object; derive the array once:
```js
const EN_SKILL_NAMES = Object.values(SKILL_NAMES_EN);
```

### [P1] `renderActivity` leaks click listeners
- **Where:** `script.js:873-887`
- **What:** `feed.addEventListener("click", function handler(e) { ... })` is bound every time `renderActivity` runs. `_rendered` set + `renderTab` skip the re-render in most cases, but `renderAll` clears `_rendered` whenever XP/quest data changes (`script.js:1607`). After N data refreshes you have N stacked listeners on the same `#activity-feed` node; one click runs them all.
- **Fix:** Either replace `feed.innerHTML` with a fresh clone (`feed.replaceWith(feed.cloneNode(false))` before re-binding) or use event delegation on a stable parent. Or bind once at init and rely on `closest(".feed-more")` to detect the button.

### [P2] Unused `lang` locals in `script.js`
- **Where:** `script.js:721`, `:793`, `:893` — `const lang = currentLang;` declared and never read inside `renderH2H`, `renderSkills`, `renderQuests`.
- **Fix:** Delete the three lines.

### [P2] Empty `else if` branch in `nsDailyMoves`
- **Where:** `next-steps.js:112-114`
```js
} else if (has("Royal Trouble") || has("The Fremennik Trials")) {
  // Will unlock soon - skip
}
```
- **What:** The else-if computes a predicate and then does nothing. Reader has to stop and figure out it's intentional.
- **Fix:** Delete the branch — the `Throne of Miscellania` check alone suffices. If the "almost there" hint matters later, put it in a comment, not a runtime check.

### [P2] Inline `lang === "pt" ? ... : ...` ternaries bypass `t()`
- **Where:** ~100 sites total: `goals.js` (25), `live.js` (29), `money.js` (20), `tips.js` (9), `script.js` (5), `next-steps.js` (4)
- **What:** New code added after `i18n.js` was written stopped using the LANG dictionary. e.g., `live.js:297` `lang === "pt" ? "Sem ganhos ainda — aguarde a primeira atualização" : "No gains yet — waiting for first update"`. Hard to audit translations, impossible to ship a new locale without grepping every file.
- **Fix:** Move strings into `i18n.js` LANG buckets per module (`live:`, `goals:`, etc.) and add a namespaced helper if collisions worry you: `tLive("noGains")`. Mechanical refactor.

### [P2] `toLocaleString(currentLang === "pt" ? "pt-BR" : "en-US")` repeated
- **Where:** `live.js:190, 193, 326, 378, 401, 405, 406`; `script.js:658, 490`
- **What:** Same locale-derivation logic inlined every time a number is formatted in `live.js`. `fmt()` in `script.js:656` already does this, but `live.js` reimplements.
- **Fix:** Use `fmt(n)` from script.js. For places that need `Math.round(...)` first, just call `fmt(Math.round(x))`.

### [P2] Paranoid `typeof X === "function"` guards
- **Where:** 25 sites in `goals.js`, 10 in `live.js`, 9 each in `money.js` / `next-steps.js` / `script.js`
- **What:** e.g. `goals.js:281` `typeof xpForLevel === "function" ? xpForLevel(sk.required) : 0`. Every guarded symbol (`esc`, `tSkill`, `skillIconImg`, `xpForLevel`, `hasQuest`, `fmtShort`, `currentLang`) is defined in a file loaded earlier in `index.html`; `defer` guarantees script order. The fallback branches return 0 / `id` / the raw input, which silently degrade UI and mask real "I forgot to load script.js" errors.
- **Fix:** Drop the guards. Trust the load order documented in `index.html`. If you want belt-and-suspenders, add one assertion at the top of each module instead of inline at every call.

### [P2] Silent `catch` blocks
- **Where:** `live.js:36, 44, 53, 131`; `money.js:569, 574`; `script.js:552, 1666`; `lookup.js:117`
- **What:** Several catches swallow without any breadcrumb (e.g. `money.js:569 catch (_) {}` after the GE price fetch). Failure becomes invisible: the user sees stale prices with no console signal that the live fetch failed.
- **Fix:** Keep the empty-catch *control flow* (it's correct), but add `console.debug` or push to a `setSource("warn", ...)` signal so failures aren't ghosted. At minimum: `} catch (e) { console.debug("ge_price_live_fail", e); }`.

### [P2] Hardcoded player names leak into multiple files
- **Where:** `script.js:6` `PLAYERS = ["Fiorovizk", "Decxus"]`; `next-steps.js:78,88` (`NS_QUEST_RAILS.Fiorovizk` / `.Decxus`); `live.js:13` comment "0 = Fio, 1 = Decxus"; `index.html:1154` `t("title") + " — Fiorovizk & Decxus"`.
- **What:** Adding a third player or renaming one requires editing 4-5 files.
- **Fix:** Keep `PLAYERS` as the single source. Have `next-steps.js` key rails by index or by skill profile heuristic instead of by display name. Move the "Fio & Dec" subtitle to LANG.

### [P2] `attachImgFallbacks(document.body)` scans the whole DOM per render
- **Where:** `script.js:1548`
- **What:** Every `renderTab()` call iterates every `<img[data-fallback]>` in the document, even though only the just-rendered tab added new images. The per-image `_fb` guard makes the scan idempotent but not free.
- **Fix:** Pass the just-rendered tab's root element. Renderers know it:
```js
const renderTab = (tab, results) => {
  const fn = _renderers[tab];
  if (fn) { try { fn(results); } catch (e) { console.error(...); } }
  const root = document.querySelector(`.page[data-page="${tab}"]`) || document.body;
  attachImgFallbacks(root);
  _rendered.add(tab);
};
```

### [P2] `liveStop()` leaks `_liveColdSnap` and last samples
- **Where:** `live.js:530-534`
- **What:** Clears `_liveTimer` and `_liveLerpRAF` but leaves `_liveSamples`, `_liveColdSnap`, `_liveLastPoll`, `_liveLerpRate` populated. When the user navigates away and back, stale samples from a different session bleed into the new poll's rate calc.
- **Fix:** Reset all module state in `liveStop()`:
```js
function liveStop() {
  _liveActive = false;
  if (_liveTimer) clearTimeout(_liveTimer);
  cancelAnimationFrame(_liveLerpRAF);
  _liveSamples = [];
  _liveColdSnap = null;
  _liveLerpPrev = null;
  _liveLerpRate = null;
  _liveLastPoll = null;
  _liveConsecutiveFails = 0;
}
```

### [P2] `_liveFetchOnce` reentrancy guard returns `null` silently
- **Where:** `live.js:124-128`
- **What:** `if (_liveInflight) return null;` makes a concurrent caller indistinguishable from a real fetch failure (`_liveTick` then increments `_liveConsecutiveFails`).
- **Fix:** Throw a sentinel or return `{busy: true}`, and have `_liveTick` skip the fail counter when it sees it. The current code rarely hits this (single-shot polling), but if a user mashes the manual refresh button it inflates the fail counter.

### [P2] `renderGoalsPage` re-binds change handler with `{ once: true }`
- **Where:** `goals.js:1101-1108`
- **What:** `section.addEventListener("change", handler, { once: true })`. The handler calls `renderGoalsPage(players)` which re-binds. Works in the happy path, but if the inner `renderGoalsPage` ever short-circuits (e.g., players is empty for one tick after a refresh), the listener is gone and the next checkbox click is silently ignored.
- **Fix:** Use delegation without `{once: true}`. Either bind once at module init on a stable wrapper, or use a `<form>` change listener.

### [P2] `MAX_PTS` recomputed at module load, used as runtime const
- **Where:** `script.js:470`
- **What:** Fine as-is, but it's the only `JOURNAL.reduce` at top level — every other derived constant (skill xp table) is wrapped in an IIFE. Inconsistent.
- **Fix:** Optional. Either inline the IIFE on the XP table to a plain `for` loop, or wrap `MAX_PTS` in a comment. Style only.

### [P2] `_renderers.overview` aliases `dashboard` but `launchSection` also rewrites the hash
- **Where:** `script.js:1503` (`overview: r => _renderers.dashboard(r)`) and `script.js:1265` (`if (page === "overview") page = "dashboard"`)
- **What:** Two redundant aliases for the same legacy hash. Either branch alone suffices.
- **Fix:** Delete the renderer entry; the `launchSection` normalisation already maps `overview` → `dashboard` before `renderTab` is called.

### [P2] JSDoc / type hints almost entirely absent
- **Where:** Only `lookup.js:1-7` has a top-of-file doc. Public functions (e.g. `parse`, `xpToNextLevel`, `goalProgress`, `_liveComputeRates`) take untyped params with mixed shapes (sometimes `player`, sometimes `snap`).
- **Fix:** Add a one-line JSDoc on the top ~10 cross-file functions (`parse`, `liveFetch`, `cacheFetch`, `renderTab`, `xpForLevel`, `xpToNextLevel`, `hasQuest`, `goalProgress`, `_liveSnapshotFromPlayer`). Vanilla JS editors will pick up the types.

## Quick wins (ordered by ROI)
1. **Delete the four dead functions** (`fetchCached`, `initTabs`, `renderNextSteps`, `liveClearBaseline`) and the three unused `const lang` locals — pure subtraction, ~70 lines, zero behavioral change.
2. **Collapse ROTM data into one source** (`major-goals.js` reads from `GOALS`) — eliminates the worst drift risk.
3. **Replace `lookup.js`'s proxy chain with global `liveFetch`** — ~50 lines, removes parallel maintenance.
4. **Fix `renderActivity` listener leak** — one-line bug that becomes a real performance issue after long sessions.
5. **Derive `EN_SKILL_NAMES` from `SKILL_NAMES_EN`** — one line, removes a hand-maintained dual list.
6. **Reset all live state in `liveStop()`** — small change, fixes a real stale-rate bug when toggling tabs.
7. **Move inline `lang === "pt" ?` strings into `i18n.js`** — bigger lift but mechanical, and makes future locales possible.
8. **Add `console.debug` to silent catches in `money.js`** — minutes of work, makes prod failures debuggable.

## Notes / open questions
- The `defer` script load order in `index.html:244-253` is the de-facto module system. Worth documenting in a top-of-file comment in `script.js` so the load-order coupling is explicit.
- `_renderers.live` deletes its own `_rendered` entry in `launchSection` (`script.js:1303-1305`) — fine pattern, but undocumented. A one-line comment would help.
- `live.js` has its own ~100-line `<style>` inject (`liveInjectStyles`) and `goals.js` has another (`goalsInjectStyles`). Style colocation works for vanilla JS but means `style.css` is no longer the single source. Worth deciding: inline-or-not, then converging.
- No build step or linter is configured; running `eslint --no-eslintrc --env browser --parser-options=ecmaVersion:2022 --rule '{"no-unused-vars":"warn"}'` would catch most of the dead-code findings above automatically.
