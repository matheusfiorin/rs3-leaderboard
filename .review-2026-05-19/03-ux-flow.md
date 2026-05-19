# 03-ux-flow

## Summary

Two-player RS3 dashboard built around a fixed 8-button bottom dock. Cache-first load works well and the Live page is the highlight feature. Main UX gaps: dock buttons are icon-only with no text (cold mobile users guess), `Lookup` back button quietly clears the input but leaves the user on the same view with no feedback, `Goals` page conflates with `Mission Control` / `Major Goals` on dashboard (three places, similar names), Skills tab buries a whole Combat sub-page below the fold, and several controls cluster awkwardly in the header on mobile. A handful of a11y gaps (icon-only buttons missing visible labels, decorative emoji read by screen readers, focus state not styled).

## Severity legend
- **P0** breaks core feature
- **P1** significant bug / UX flaw
- **P2** polish

## Findings

### [P1] Dock buttons are icon-only — no text label on any breakpoint
- **Where:** `index.html:216-242`, `style.css:851-872`, `style.css:997-1000`
- **What:** All 8 dock buttons are SVG-only. `title=` shows on desktop hover only; mobile users see icons with no caption. Activity / Money / Lookup icons (bell, circle-with-plus, magnifier) are guessable but Dashboard vs Live vs Goals look very similar.
- **Why:** `dock-btn` markup contains only an `<svg>` and (for `live`) a pulse `<span>`. CSS adjusts size on mobile but never renders a label. The hidden `<span id="tab-overview">` etc. (`index.html:50-56`) are vestigial — they're never displayed.
- **Fix:** Add a visible label under each icon (shrinks dock height by maybe 8 px but cuts cognitive load). Cheap version:
  ```html
  <button class="dock-btn" data-launch="dashboard">
    <svg …></svg><span class="dock-label">Home</span>
  </button>
  ```
  ```css
  .dock-btn { flex-direction: column; gap: 2px; }
  .dock-label { font-size: 0.5rem; letter-spacing: .04em; }
  ```
  Or, at minimum, render the active button's label as a chip above the dock so users learn the mapping.

### [P1] Three near-identical "goals" surfaces compete on Dashboard / Goals page
- **Where:** `index.html:78-90` (Dashboard renders `#mission-control` + `#major-goals`), `index.html:191-197` (`Goals` page), dock button #4 (`data-launch="goals"`)
- **What:** Dashboard shows "Mission Control" (next-steps suggestions) and "Major Goals" tiles. The Goals dock button opens a separate page (`goals.js` → `renderGoalsPage`) which re-renders the same kind of content but in deeper form. A new user lands on Dashboard, sees ring progress, sees a Goals dock button, taps it, sees a slightly different layout of the same idea. No mental model for which is canonical.
- **Why:** The features grew incrementally (`next-steps.js`, `major-goals.js`, `goals.js`) without consolidating IA.
- **Fix:** Pick one model. Either (a) make Dashboard a teaser strip and `Goals` the full page (remove ring progress from Dashboard, leave only a CTA tile that deep-links to `#goals`), or (b) drop the Goals dock button and put everything on Dashboard. Today the duplication burns dock real-estate and adds confusion.

### [P1] Lookup back button silently clears search input — no return-to-list feedback
- **Where:** `lookup.js:176-180`
- **What:** Tapping ← Back wipes `#lk-results`, clears the input, focuses input. No visual confirmation that "you went back". A user who just typed `Zezima` then taps back sees the same page minus their result with no toast or transition — feels like a glitch.
- **Why:**
  ```js
  $("#lk-back-btn")?.addEventListener("click", () => {
    results.innerHTML = "";
    $("#lk-input").value = "";
    $("#lk-input").focus();
  });
  ```
  No animation, no confirmation, no state hint.
- **Fix:** Preserve the input value (lets user edit and retry), animate the result card collapsing, and rename the button "New search" since that's what it really does. Or remove the button entirely — the user can just retype.

### [P1] Skills tab buries a complete Combat/Revolution sub-page below the fold
- **Where:** `index.html:139-145` (Combat section sits inside `data-page="skills"` after the entire skills grid)
- **What:** `Skills` page first renders 29 skill rows (with sort/filter pills), then below that an unrelated Combat & Revolution section with ability bars. Users scrolling skills hit this surprise section; users wanting Combat info don't know it lives under Skills.
- **Why:** Comment at `index.html:139` says "merged from combat page" — a stale combat tab was folded into skills but no IA cue tells the user. The dock has no Combat button.
- **Fix:** Either restore Combat as a top-level dock button, or add an anchor jump pill at the top of `Skills` ("Skills · Combat") and a collapsed-by-default accordion for the Combat block. As-is, ~85% of users will never scroll to it.

### [P1] Language toggle label semantics are ambiguous
- **Where:** `index.html:35-37`, `script.js:1152`
- **What:** Button shows the *target* language ("EN" while viewing PT). Common pattern, but with two-letter codes only and no flag/icon, brand-new users can read it as "you are in English" and tap to "stay in English" — landing on PT instead.
- **Why:** `s("lang-label", lang === "pt" ? "EN" : "PT");`
- **Fix:** Show both with the active one styled, e.g. `PT | EN` with the inactive one highlighted as the click target. Or write the action verb: "Switch to English". `aria-pressed="false"` (`index.html:35`) is also static and never flips.

### [P1] Dock `Live` pulse animates red forever — looks like an error/alert
- **Where:** `index.html:240`, `live.js:638-643`
- **What:** Red dot with infinite ripple pulse next to the Live button. Red conventionally means error / danger. New users approach it cautiously instead of curiously.
- **Why:** Style hard-coded:
  ```css
  .dock-live-pulse { background: var(--red); box-shadow: 0 0 0 0 rgba(248,113,113,0.7); }
  ```
- **Fix:** Switch pulse color to `var(--green)` (the universal "live recording" cue) or to `var(--gold-bright)`. Red should stay reserved for the error banner.

### [P1] No focus-visible outline on interactive elements — keyboard users fly blind
- **Where:** All button/pill/dock styles in `style.css`; no `:focus-visible` rule found
- **What:** `*` reset zeroes margins/padding but leaves the UA default focus ring; the design overrides hover but never adds back a focus style. Tabbing through pills, dock buttons, refresh, lang-toggle = nothing visible.
- **Why:** Confirmed by grepping — no `:focus` or `:focus-visible` rules in `style.css`.
- **Fix:** Add one global rule:
  ```css
  :focus-visible {
    outline: 2px solid var(--gold-bright);
    outline-offset: 2px;
    border-radius: var(--radius-xs);
  }
  ```

### [P1] `data-source-badge` shows literal "..." until first load resolves
- **Where:** `index.html:38-41`, `script.js:1481-1484`
- **What:** Header right shows `· ...` next to the dot before the cache resolves. On a fresh load this is ~200-400 ms of literal ellipsis text in the header — looks unfinished.
- **Why:** Initial text is `"..."`, replaced by `setSource()` after `load()` completes.
- **Fix:** Either localize to `t("loading")` or hide the badge until populated (`#data-source-badge { visibility: hidden }` and reveal after first `setSource`).

### [P1] Refresh button & language toggle live in the header but Live page has its own refresh — duplicate controls
- **Where:** `index.html:42-46` (header refresh), `live.js:407-408` and `live.js:479-486` (live page refresh+reset)
- **What:** On the Live page, header refresh triggers the global cache/proxy load; the in-card `⟳` triggers `_liveTick()`. They do different things but look identical. Users hit either at random.
- **Fix:** Hide the header refresh on the Live page (it polls automatically), or relabel the in-card refresh as "Poll now" with a tooltip. Same applies to the in-card `↺` reset baseline button: its tooltip is clear but the unicode glyph is easily mistaken for "undo".

### [P1] Loader uses 250 ms delayed appear — but `.hidden` class can race with the appearing animation on slow loads
- **Where:** `style.css:172-189`
- **What:** `loading-overlay` starts at `opacity:0` then animates to 1 over 0.4 s with a 0.25 s delay. Adding `.hidden` after the fade-in started leaves users with a brief flash of full loader appearing then immediately fading out.
- **Why:** Animation is fire-and-forget; there's no JS guard to skip the appear if cache already returned.
- **Fix:** When `load()` resolves quickly, also strip the animation:
  ```js
  $("#loading-overlay").style.animation = "none";
  $("#loading-overlay").classList.add("hidden");
  ```

### [P2] Hidden i18n anchor spans pollute the accessibility tree
- **Where:** `index.html:50-56`
- **What:** Eight empty `<span>` elements (`tab-overview`, `tab-skills`, …) inside `display:none` div. Most never get populated visibly but `updateUIText` writes to them. Screen readers ignore `display:none`, but the spans serve no purpose since dock buttons set their own `aria-label` already (`script.js:1246-1253`).
- **Fix:** Delete the hidden block entirely and the corresponding `s("tab-…")` writes in `updateUIText`.

### [P2] Activity feed `feed-icon` emojis are decorative but get read by screen readers
- **Where:** `script.js:827-833`, `script.js:860-867`
- **What:** Icons `⬆️ 📜 ⚔️ 🏰 💬` are inserted as plain text inside the feed item, no `aria-hidden`. VoiceOver reads "up arrow Fiorovizk Leveled up Fishing".
- **Fix:** Wrap with `<span aria-hidden="true">${icon}</span>` (and same for `ACT_ICONS` in `lookup.js:281`). Same finding applies to medal emojis in Live page podium (`live.js:288`).

### [P2] Quest "Both Done" rows dimmed to 0.4 opacity — fails WCAG contrast
- **Where:** `style.css:487-488`
- **What:** `.ql-row[data-qcat="both-done"] { opacity: 0.4 }`. Body text is `--text` (#ede7db) on `--bg-card` (#12101c). At 40% opacity the effective text contrast drops below 3:1. Quest titles are unreadable at a glance, and they're still tabbable.
- **Fix:** Use `--text-3` (#9c948a) instead of opacity, or move "Both Done" behind a default-collapsed expand: `<details><summary>43 quests both completed</summary>…</details>`.

### [P2] Quest filter pill `Do Next` has no tooltip / explanation
- **Where:** `index.html:160`, `script.js:946-952`
- **What:** Filter label is "Do Next" with no hint that it means "quests exactly one player has done". User-facing wording is opaque.
- **Fix:** Rename to "Catch-up" or "Asymmetric" and add `title="Quests one player has completed but the other hasn't"`. Same critique applies to `One Done` / `Both Done`.

### [P2] Toast container fixed `top:80px right:16px` collides with sticky header on small screens
- **Where:** `script.js:1559`
- **What:** Hard-coded inline style. On screens under ~360 px tall (landscape phone) the sticky header is ~56 px so toasts overlap with header right-cluster (lang/source/refresh). Toasts also overlap each other after the third (`gap:8px` but no max-height / scroll).
- **Fix:** Move to bottom-center above the dock, or compute top dynamically from the header's height. Keep at most 3 toasts visible; collapse extras into "+N more".

### [P2] Lookup history pills never get a clear-history affordance
- **Where:** `lookup.js:192-203`
- **What:** Pills accumulate up to 5 recent RSNs but the user can't remove a typo'd name without clearing localStorage by hand.
- **Fix:** Append a tiny `×` per pill or a single "Clear history" link below.

### [P2] Inline `style="…"` in HTML and JS breaks CSP intent
- **Where:** `index.html:50` (`style="display:none"`), `script.js:1558` (`div.style.cssText = …`), many `style="width:…"` inserts in render functions
- **What:** CSP allows `style-src 'self' 'unsafe-inline'` so it works, but reduces the security posture and makes theming hard.
- **Fix:** Move to classes (`.is-hidden`, `.toast-container`) and remove `unsafe-inline` from CSP. Lower priority — purely structural.

### [P2] Mobile pill targets ~26 px tall — under WCAG 2.5.5 minimum (44 px)
- **Where:** `style.css:273-278` and `style.css:991-993` (mobile override `padding: 5px 10px; font-size: 0.62rem`)
- **What:** Filter/sort pills on Activity, Quests, Skills, Journal pages drop to ~24-26 px height on mobile. The dock is correctly 44 px, but the most-frequently-used pills are too small.
- **Fix:** Bump pill mobile padding to `8px 12px` (gets ~36 px) and accept the slight wrap. Or use a horizontally-scrolling segmented control (you already do this for `quest-filters` — extend the pattern).

### [P2] Footer "Atualiza a cada 5 min" lies in some cases
- **Where:** `index.html:209-211`, `script.js:7` (`REFRESH_MS = 5 * 60 * 1000`)
- **What:** When the cache is fresh enough (`< 25 min` per `CACHE_FRESH_MS`, `script.js:1643`), live fetching is skipped entirely — so "Atualiza a cada 5 min" overstates how often live data lands. Cron itself runs every 30 min per repo workflow.
- **Fix:** Replace static text with computed cadence: "Cache atualizado a cada 30 min · próxima checagem em N min". Or just say "Atualiza automaticamente".

### [P2] No scroll-restoration / scroll-to-top between pages
- **Where:** `script.js:1263-1309` (`launchSection`)
- **What:** If user scrolls 1000 px down the Skills page then taps `Dashboard`, Dashboard starts scrolled 1000 px down. The header is sticky so it's not catastrophic, but feels broken.
- **Fix:** Add `window.scrollTo({ top: 0, behavior: "smooth" })` after the `.active` class flip, or remember per-page scroll positions in a map.

### [P2] H2H verdict line is buried — the answer to the page's question is one line of small text
- **Where:** `script.js:775-778`
- **What:** Frente a Frente / H2H — the headline is the *winner*. Today it's a one-liner under 8 rows of bars, font-size 0.72rem, color `--text-3`. Easy to miss.
- **Fix:** Promote the verdict above the bars: large name + score badge ("Fiorovizk leads 5-3") with the per-row bars as supporting evidence below.

## Quick wins (ordered by ROI)

1. Add labels under dock icons (`P1`) — biggest single readability win, minutes to implement.
2. Add `:focus-visible` outline (`P1`) — one CSS rule, restores keyboard accessibility.
3. Hide `data-source-badge` until populated, kill the literal `...` (`P1`) — one line.
4. Recolor Live pulse green or gold (`P1`) — one CSS color swap.
5. Promote H2H verdict to a headline above the bars (`P2`) — improves the most engaging section.
6. Replace 0.4 opacity dimming on completed quests with `--text-3` or collapse (`P2`) — fixes contrast + cleans up the list.
7. Bump mobile pill height to 36+ px (`P2`) — single CSS rule, fixes WCAG 2.5.5.
8. Add `aria-hidden="true"` around decorative emoji in activity feed and live podium (`P2`) — improves screen reader output.
9. Rename Lookup back button to "New search" and keep input value (`P1`) — small but removes confusion.
10. Consolidate or remove the Goals dock button to deduplicate Mission Control / Major Goals (`P1`) — bigger IA decision, but worth the conversation.

## Notes / open questions

- The dock has a `Live` button but the page itself is one-player at a time (toggle inside). Worth considering if a second small dock button per-player would simplify, vs. the existing inline tabs in `live.js:362-364`.
- Two hard-coded players (`script.js:6`). The `Lookup` page already proves the codebase can fetch arbitrary RSNs. Worth allowing the user to pick their own two-player comparison? Out of scope for this review but UX-flow-relevant.
- The fade-in on `.main` (`style.css:236-238`) waits for `renderAll` and adds ~400 ms of opacity transition. On a cold load that's fine; on every refresh button click it also runs, which can feel sluggish. Consider gating to first paint only.
- `extras/` directory referenced from CSP — not audited; if it contains additional pages or assets they may need separate UX coverage.
