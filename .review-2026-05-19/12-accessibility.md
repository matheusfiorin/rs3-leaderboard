# 12-accessibility

## Summary
Baseline a11y hygiene present: `lang` attr, `role="status"` / `role="alert"`, `aria-label`s on icon-only buttons, `prefers-reduced-motion` media query, dock buttons sized ≥44px on mobile, `lang-toggle` `aria-pressed` is kept in sync (i18n.js:605). Gaps cluster around four areas: (1) keyboard users get no visible focus indicator on most interactive controls (only `.lk-input` styles `:focus`), (2) pill filter groups and dock buttons lack `aria-pressed` / `aria-current` so screen readers cannot detect which tab/filter is active, (3) page navigation never moves focus or announces the change — SPA route swap is silent for AT, (4) widespread sub-10px text (0.5–0.62rem on a 15px base = 7.5–9.3px) fails WCAG 1.4.4 readability in spirit. No skip link, several pseudo-button widgets (`ql-status`, `revo-slot` tooltips) rely on `title` only.

## Severity legend
- **P0** = breaks core feature for AT users / blocks WCAG AA
- **P1** = significant UX flaw, AA risk
- **P2** = polish, AAA, or minor

## Findings

### [P0] No visible focus indicator on buttons, dock, pills, links
- **Where:** style.css:1–1063 (global; only `.lk-input:focus` at style.css:704 is styled). Affects `.btn-refresh`, `.btn-dismiss`, `.lang-toggle`, `.pill`, `.dock-btn`, `.back-btn/.section-back/.lk-back-btn`, `.lk-btn`, `.feed-more`, anchor links inside `.ql-name a`.
- **What:** Every interactive control except the lookup text input has `outline: none` implicitly (UA default ring is overridden by the custom `border`/`box-shadow` styles, and `.dock-btn:hover` only changes background opacity ~3% — invisible when focused via Tab). WCAG 2.4.7 Focus Visible (AA) fail.
- **Why:** No `:focus-visible` rule exists anywhere in style.css. `.dock-btn:hover { background: rgba(255,255,255,0.03) }` (style.css:859) is the only state change; that style is not triggered by focus.
- **Fix:** Add a single global focus token.
  ```css
  :where(button, [role="button"], a, input, select, textarea, [tabindex]):focus-visible {
    outline: 2px solid var(--gold-bright);
    outline-offset: 2px;
    border-radius: var(--radius-xs);
  }
  .dock-btn:focus-visible { outline-offset: 0; }
  ```

### [P0] SPA navigation never moves focus or announces page change
- **Where:** script.js:1263 (`launchSection`), script.js:1750 (`DOMContentLoaded` deep-link handler).
- **What:** Clicking dock or `[data-launch]` swaps `.page.active` but does not move focus to the new region, and the `<main id="main-content">` carries no `aria-live` / `aria-labelledby`. Screen-reader users hear nothing when tabs change; keyboard users land back at the top of the tab order with no indication.
- **Why:** `launchSection` only toggles classes and calls `renderTab`. There is no `focus()` call, no live-region update, no `aria-current` on dock buttons.
- **Fix:**
  ```js
  // in launchSection() after section is shown
  const sectionEl = document.querySelector(`.page[data-page="${page}"]`);
  if (sectionEl) {
    sectionEl.setAttribute("tabindex", "-1");
    sectionEl.focus({ preventScroll: false });
    // optional: live announce
    document.getElementById("route-announce").textContent = t(DOCK_KEYS[page]);
  }
  dock.querySelectorAll(".dock-btn").forEach(b =>
    b.setAttribute("aria-current", b.dataset.launch === page ? "page" : "false")
  );
  ```
  And add `<div id="route-announce" class="sr-only" aria-live="polite"></div>` once.

### [P0] Filter pill groups lack toggle state semantics
- **Where:** index.html:98–103 (activity), 119–131 (skills + sort), 156–162 (quests), 171–177 (journal); script.js:1355–1453 (`initFilters`).
- **What:** Pills use only `.active` class — there is no `aria-pressed`, `aria-selected`, or `role="tab"`/`role="tablist"`. AT users hear "Level-ups, button" with no signal that it is the currently applied filter, and the visual cue (color shift to gold-bright) is the sole indicator.
- **Why:** The "active" class is the only state. `initFilters` only toggles classes, never aria.
- **Fix:** Treat each group as a toggle bank. On HTML, declare `role="group" aria-label="Activity filters"` on `.pill-filters`, give each pill `aria-pressed="false"` initially. In every filter handler:
  ```js
  group.querySelectorAll(".pill").forEach(x => x.setAttribute("aria-pressed", "false"));
  b.setAttribute("aria-pressed", "true");
  ```

### [P1] Dock buttons missing `aria-current="page"` for active route
- **Where:** index.html:216–242, script.js:1284–1289.
- **What:** Dock is the primary nav (`aria-label="Main navigation"` is set) but the highlighted tab is communicated only by `.active` class. Screen-reader users tabbing the dock can't tell which view they are on.
- **Why:** `b.classList.toggle("active", ...)` runs without a paired `aria-current` write.
- **Fix:** In the dock loop in `launchSection` and `initNavigation`, also call `b.setAttribute("aria-current", b.dataset.launch === page ? "page" : "false")`.

### [P1] No skip-to-content link
- **Where:** index.html:25–75 (header + sticky controls before main).
- **What:** Keyboard users must Tab through `lang-toggle`, `btn-refresh`, then potentially the entire dock before reaching content. WCAG 2.4.1 Bypass Blocks.
- **Fix:** Add as first child of `<body>`:
  ```html
  <a class="skip-link" href="#main-content">Skip to content</a>
  ```
  CSS:
  ```css
  .skip-link { position:absolute; left:-9999px; top:0; }
  .skip-link:focus { left:8px; top:8px; z-index:300; background:var(--gold);
    color:var(--bg); padding:8px 12px; border-radius:var(--radius-xs); }
  ```
  And set `tabindex="-1"` on `#main-content` so the jump target receives focus.

### [P1] Sub-10px text widespread (1.4.4 risk / readability)
- **Where:** style.css — `.subtitle` 0.55rem (style.css:130), `.lang-toggle` 0.65rem (140), `.data-source-badge` 0.6rem (148), `.loader-text` 0.7rem (208), `.section-title::before` 0.5rem (258), `.badge` 0.6rem (262), `.wiki-link` 0.62rem (267), `.pill` 0.65rem (276), `.p-card-skills-preview` 0.7rem (320), `.stat-item` 0.6rem (333), `.h2h-label` 0.6rem (346), `.feed-time` 0.58rem (436), `.feed-details` 0.62rem (437), `.ql-diff` 0.55rem (492), `.ql-members` 0.5rem (493), `.ql-pts` 0.6rem (494), `.j-desc` 0.58rem (552), `.combat-stats-grid` 0.62rem (587), `.dps-stat-label` 0.5rem (595), `.combat-sub-label` 0.58rem (598), `.revo-tooltip` 0.55rem (614), `.revo-num` 0.4rem (618), `.ability-tooltip-type/desc` 0.5rem (634/635), `.money-req` 0.55rem (674), `.visitor-stats` 0.55rem (875), `.footer` 0.6rem (880).
- **What:** Body root is 15px (style.css:81) so 0.55rem = 8.25px, 0.5rem = 7.5px, 0.4rem = 6px. At 1024px+ media-queries do not bump these; mobile (≤640px) further drops root to 14px (style.css:925) and 13px at ≤380px (style.css:1025) — meaning the same rules render at ~7px, 6.5px, even 5.2px. WCAG 1.4.4 Resize Text passes only because pinch-zoom is allowed (no `maximum-scale`), but for low-vision users this is brutal.
- **Why:** Aggressive density-targeting. No minimum size floor.
- **Fix:** Set a floor — replace any value below `0.7rem` with `0.7rem` (≈ 10.5px desktop, 9.8px mobile). The `.revo-num` 0.4rem badge is purely decorative — mark `aria-hidden="true"` and keep small, but everything text-meaningful (member tags, points, descriptions, times) should be ≥0.7rem. Also consider removing the `html { font-size: 13px }` step at ≤380px since the layout already reflows.

### [P1] `<input type="text">` for player lookup
- **Where:** lookup.js:38.
- **What:** Search input uses `type="text"`. Should be `type="search"` for semantic correctness (mobile keyboard hint, clear-button affordance, AT announces as "search field").
- **Fix:** `type="search"`. Also wrap input + button in `<form role="search">` so Enter submission is native and screen readers announce a landmark.

### [P1] `.ql-status` and `.j-check` use `title` only for player attribution
- **Where:** script.js:968–969 (`ql-status`), script.js:1045–1046 (`j-check`).
- **What:** Per-player completion dots/checks attribute meaning purely via `title="${player.name}"`. Title attributes are not read by most screen readers on non-form elements and are invisible on touch devices.
- **Why:** Visual coloring (gold/teal) is the only other channel.
- **Fix:** Wrap the value or add visually-hidden text:
  ```html
  <div class="ql-status done">
    <span class="sr-only">Fiorovizk: completed</span>✓
  </div>
  ```
  Or set `aria-label="${player.name}: ${status}"` directly on the element.

### [P1] Lookup error region is not announced
- **Where:** lookup.js:69 (`status.innerHTML = "<p class='lk-error'>..."`), and index.html has no `aria-live` on `#lk-status`.
- **What:** Validation failure ("invalid RSN") is silent for AT — only the visual red banner appears.
- **Fix:** When rendering `#lk-status` in `renderLookupPage()`, add `role="status" aria-live="polite"` to the wrapper; for the error case, the `<p class="lk-error">` itself should carry `role="alert"`.

### [P1] Quest list external links don't announce new-tab behavior
- **Where:** script.js:962 — `<a href="${wikiUrl}" target="_blank" rel="noopener noreferrer">`.
- **What:** Links open in a new tab silently. WCAG 3.2.5 advises warning users.
- **Fix:** Append visually-hidden text:
  ```html
  <a href="..." target="_blank" rel="noopener noreferrer">
    ${esc(q.title)} <span class="sr-only">(opens in new tab)</span>
  </a>
  ```

### [P2] Toast notifications not announced
- **Where:** script.js:1552–1572 (`showToast`).
- **What:** Level-up / quest-complete toasts insert into an unlabeled container (`#toast-container`). AT users get no notification.
- **Fix:** When creating the container, set `role="status" aria-live="polite" aria-atomic="true"`.

### [P2] Decorative emoji and SVG-text content lacks `aria-hidden`
- **Where:** Header `.loader-swords ⚔` (index.html:63), section-title `::before ◆` (style.css:257 — fine, pseudo), inline emojis in pill labels (e.g. `"⬆️ Level-ups"` script.js:1206) and toast text. Activity feed `.feed-icon` (script.js:861) is purely decorative.
- **What:** Screen readers may read every emoji literally ("upwards black arrow", "crossed swords"). Adds verbosity.
- **Fix:** Wrap decorative icons in `<span aria-hidden="true">` or set `role="img" aria-label="..."` for meaningful ones. For pill labels, the text already describes the action — wrap the leading emoji:
  ```js
  s("af-levelup", `<span aria-hidden="true">⬆️</span> ${t("afLevelups")}`);
  ```
  (would need `h` helper or innerHTML).

### [P2] `.loading-overlay` `role="status"` reads `Carregando dados...` after a 250ms delay
- **Where:** index.html:60–66, style.css:172–189.
- **What:** Element has `opacity: 0; pointer-events: none` initially and animates in only if load >250ms. Even when hidden, `role="status"` + `aria-live="polite"` may be announced on initial DOM parse if AT reads at page-load before the animation kicks in. Conversely once load is fast (cache hit) the user gets a redundant "Carregando dados" announcement.
- **Fix:** Set `aria-hidden="true"` initially and toggle off only when actually visible; or move the live region out of the overlay into a sibling that is only populated when loading >250ms fires.

### [P2] `.btn-refresh` SVG path uses `currentColor` but missing `aria-hidden`
- **Where:** index.html:43–45.
- **What:** SVG inside `aria-label`'d button — extra noise. Dock SVGs correctly use `aria-hidden="true"` (218, 221, 224, etc.); refresh SVG omits it.
- **Fix:** Add `aria-hidden="true"` to the `<svg>` opener on line 43.

### [P2] Color-only "ahead/behind" indication in skills grid
- **Where:** script.js:799–812 (`.sk-level.ahead` green, `.sk-level.behind` muted).
- **What:** "Ahead in skill" communicated only by color (`--green` vs `--text-2`). Colorblind / mono users see only numbers. WCAG 1.4.1 Use of Color.
- **Fix:** Append a non-color cue, e.g. `↑` for ahead and unmarked for behind:
  ```html
  <div class="sk-level ahead" aria-label="ahead">${s1.level}<span aria-hidden="true"> ↑</span></div>
  ```

### [P2] H2H winner indicator is color-only
- **Where:** style.css:353–354 — `.h2h-row .h2h-bar-wrap.winner .h2h-bar { background: var(--gold-dim) }`; right-side winner uses teal-dim.
- **What:** Both bars use a "winner" class but the visual diff is just hue; numeric values are present so meaning is recoverable, but a redundant marker (border, arrow) would help.
- **Fix:** Add `aria-label="winner"` to the winning side, or visible `✓` next to the value.

### [P2] `.lk-input:focus` removes outline without sufficient ring
- **Where:** style.css:704.
- **What:** `outline: none; ... box-shadow: 0 0 0 3px rgba(212,168,67,0.06)` — the alpha 0.06 ring on a dark bg has contrast ~1.2:1 against neighboring elements. Border color shift is the only reliable cue.
- **Fix:** Raise alpha to ≥0.4 or use solid `--gold-dim`:
  ```css
  .lk-input:focus {
    outline: 2px solid var(--gold-bright);
    outline-offset: 2px;
    border-color: var(--gold-dim);
  }
  ```

### [P2] Reduced-motion override leaves transform-on-hover
- **Where:** style.css:1047–1055.
- **What:** Reduced-motion block sets `transition-duration: 0.01ms` but `.p-card:hover { transform: translateY(-2px) }` (style.css:307) and `.skill-row:hover { transform: translateX(2px) }` (380) still produce instant jumps when keyboard focus or pointer moves through rows. Snapping translate is less jarring than animated but still motion.
- **Fix:** Inside the reduced-motion block, explicitly null transforms:
  ```css
  @media (prefers-reduced-motion: reduce) {
    .p-card:hover, .skill-row:hover, .pill:active, .dock-btn:active { transform: none !important; }
  }
  ```

### [P2] Lang toggle label confuses screen readers
- **Where:** index.html:35–37 — `aria-label="Switch language"` but visible text is "EN" (the *target* language). Screen readers will say "Switch language, button, pressed" with no indication of current language.
- **Fix:** Make aria-label dynamic and reflect current language, e.g. `aria-label="${currentLang === 'pt' ? 'Mudar para inglês' : 'Switch to Portuguese'}"`, updated in i18n.js alongside the `aria-pressed` write at i18n.js:605.

### [P2] Filter pill groups not wrapped as `role="group"` / `aria-label`
- **Where:** index.html:98, 119, 126, 156, 171.
- **What:** Each `.pill-filters` row is a logical control group with no accessible label, so AT just reads four loose buttons.
- **Fix:** `<div class="pill-filters" role="group" aria-label="Activity filters">…</div>` (and similarly for skill / sort / quest / journal groups).

### [P2] Footer "Last updated" announcement is silent
- **Where:** index.html:208–211, script.js:481.
- **What:** `#last-updated` text refreshes on every load/refresh but is not in a live region; users relying on AT after pressing refresh hear nothing change.
- **Fix:** Add `aria-live="polite"` to the `<span id="last-updated">` or its `<p class="footer-meta">` parent.

## Quick wins (ordered by ROI)
1. Add global `:focus-visible` rule (P0 #1) — one CSS block, fixes every keyboard user.
2. Add `aria-pressed` toggles to filter pills (P0 #3) — three-line patch inside each handler in `initFilters`.
3. Add `aria-current="page"` to dock buttons (P1) — one line in dock loop.
4. Add skip-link (P1) — 6 lines HTML+CSS.
5. Move focus to `.page.active` on navigation + add `aria-live` route announcer (P0 #2) — ~8 lines in `launchSection`.
6. Raise font-size floor to 0.7rem (P1) — find/replace `0.5rem`, `0.55rem`, `0.58rem`, `0.6rem`, `0.62rem`, `0.65rem` to `0.7rem` outside decorative cases.
7. Change lookup `type="text"` → `type="search"` and wrap in `<form role="search">` (P1) — 2-line lookup.js change.
8. Add `aria-hidden="true"` to all decorative icons (P2) — small but cleans up AT verbosity.

## Notes / open questions
- `viewport-fit=cover` with no `maximum-scale` and `user-scalable=yes` (default) — pinch-zoom works, good.
- Heading hierarchy is OK: single `<h1>`, then `<h2>` per section. No skipped levels found.
- CSP allows inline `style=` attributes (only blocks `<style>` requires `'unsafe-inline'` — already declared). Inline `style="width:%"` in renderers is fine.
- Touch target sizes: dock 44×44 on mobile (style.css:999 — explicit WCAG 2.5.5 comment). `.btn-refresh`, `.lang-toggle`, `.btn-dismiss` in header are ≤28×28; below AA 2.5.8 (24px) only marginally — verify against current spec if AA target-size compliance is required.
- `i18n.js:605` correctly syncs `aria-pressed` on lang toggle — earlier I suspected staleness; not stale. Kept the related "label is misleading" finding instead.
- No tests cover keyboard or AT behavior — consider Playwright axe-core run in CI.
