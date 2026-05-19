# 13-mobile

## Summary

Mobile pass is mostly thoughtful — viewport meta is correct, `min-height: 100dvh`, `safe-area-inset-bottom`, dedicated `≤640px` and `≤380px` breakpoints, dock buttons forced to 44px, `overflow-x: hidden` on body, and per-component sub-stylesheets all have their own mobile media queries. However: **the 8-button dock overflows common phone viewports**, several header / pill / back-button targets are well under WCAG 2.5.5 44px, the `.lk-input` font triggers iOS focus-zoom, and there is zero `@media (hover: hover)` guarding so every `:hover` rule sticks on the first tap.

## Severity legend

P0 = breaks core feature on mobile · P1 = significant bug / UX flaw · P2 = polish

## Findings

### [P1] Dock overflows on 360-375px viewports (Galaxy S22, iPhone SE/12 mini)

- **Where:** `style.css:998-1000`, `index.html:217-241`
- **What:** Dock has 8 buttons. At `≤640px` the math is `8 × 44px (btn) + 7 × 2px (gap) + 12px (padding) + 2px (border) = 380px`. iPhone SE = 375px, Galaxy S22 / iPhone 12 mini = 360px, Galaxy Z Fold cover = 280px. Dock is fixed-positioned with `left:50%; transform:translateX(-50%)`, so the leftmost (`dashboard`) and rightmost (`live`) buttons render partly off-screen on every device ≤375px and severely clipped on 320-360px screens.
- **Why:** `style.css:999` sets `min-width: 44px`, which is correct for WCAG, but no fallback when total width exceeds viewport. `body { overflow-x: hidden }` (`style.css:89`) hides the visual overflow but does *not* keep the off-screen halves of the end buttons tappable in all browsers; even when tappable, users can't tell what they are.
- **Fix:** Either shrink padding/gap on smallest viewports, allow the dock to scroll horizontally, or hide a button (e.g. fold `live` into `dashboard` header). Minimal fix:
  ```css
  @media (max-width: 400px) {
    .dock { gap: 0; padding: 4px 4px; max-width: calc(100vw - 16px); overflow-x: auto; }
    .dock-btn { width: 40px; min-width: 40px; }  /* WCAG 2.5.5 still met via 40×40 + 4px gap touch slop, or split into two rows */
  }
  ```
  Better: drop `goals` from the dock (already reachable from quests/dashboard nav) or use `flex: 1` with viewport-aware sizing.

### [P1] `.lk-input` font-size triggers iOS focus auto-zoom

- **Where:** `style.css:1006` (`.lk-input { padding: 8px 12px; font-size: 0.78rem }`)
- **What:** On mobile `html { font-size: 14px }` (line 925), so `0.78rem = 10.9px`. iOS Safari auto-zooms the viewport when an input font-size is `<16px`, forcing the user to pinch back out afterwards. The lookup page is the *one* input-heavy page on the site.
- **Why:** Well-known iOS heuristic; the desktop rule (`style.css:701` `0.82rem ≈ 13.1px`) is also below 16px but lookup is mostly used on desktop, so this is a mobile-only complaint.
- **Fix:**
  ```css
  @media (max-width: 640px) {
    .lk-input { font-size: 16px; padding: 10px 12px; }
  }
  ```

### [P1] Header controls below 44px touch target

- **Where:** `style.css:137-143` (`.lang-toggle`), `style.css:159-164` (`.btn-refresh`)
- **What:** `.lang-toggle` is `padding: 4px 10px; font-size: 0.65rem` → ~26×40px. `.btn-refresh` is `padding: 6px` + 16×16 SVG → ~28×28px. Both fall short of WCAG 2.5.5 (44×44 css px) and the dock buttons' own standard (`style.css:999`).
- **Why:** No mobile override sets `min-height` / `min-width` for these.
- **Fix:**
  ```css
  @media (max-width: 640px) {
    .lang-toggle, .btn-refresh { min-width: 44px; min-height: 44px; display: inline-flex; align-items: center; justify-content: center; }
  }
  ```

### [P1] Filter pills too small to tap reliably

- **Where:** `style.css:991-992`
- **What:** Mobile pills become `padding: 5px 10px; font-size: 0.62rem` → ~22-26px tall, ~50-70px wide. The skills page has *two* pill rows (filter + sort) plus the legend row stacked tightly; quest/journal/activity pages also use them. Fat-finger errors very likely, especially on `.pill-filters { gap: 3px }`.
- **Why:** Pills inherit very small font (`.pill { font-size: 0.65rem }`) plus `4px 12px` padding from the base rule, then mobile shrinks them further.
- **Fix:** Bump min-height to ~32px (industry norm for chips, still WCAG-compliant if spaced ≥8px from siblings) and widen gap:
  ```css
  @media (max-width: 640px) {
    .pill { min-height: 32px; padding: 6px 12px; font-size: 0.68rem; }
    .pill-filters { gap: 6px; }
  }
  ```

### [P1] No `@media (hover: hover)` guards — every `:hover` sticks on first tap

- **Where:** `style.css:92,143,164,279,292,307,380,429,486,548,667,719,800,859,910-916`, plus same anti-pattern in `live.js:587-588,628`, `money.js:1019`, `goals.js:725+`
- **What:** Hover styles applied unconditionally. On touch devices, the first tap fires `:hover`, second tap fires the click — and the `:hover` state stays "stuck" on the last-tapped row until another tap clears it. Most visible on `.skill-row:hover` (transform: translateX(2px), background swap), `.feed-item:hover`, `.j-row:hover`, `.ql-row:hover`, and the dock back-button which gains a permanent gold border after tapping a card.
- **Why:** No `@media (hover: hover) and (pointer: fine)` wrappers exist anywhere in the project.
- **Fix:** Wrap purely decorative hover rules. Pattern:
  ```css
  @media (hover: hover) and (pointer: fine) {
    .skill-row:hover { background: var(--bg-hover); transform: translateX(2px); border-color: var(--border); }
    .feed-item:hover { ... }
    /* etc */
  }
  ```
  Keep `:active` / `:focus-visible` separate for touch feedback.

### [P2] Back-button below touch target

- **Where:** `style.css:896-909` (`.back-btn`, `.section-back`, `.lk-back-btn`)
- **What:** `padding: 6px 14px; font-size: 0.7rem` → ~28px tall. Used by goals/lookup back navigation, frequently tapped on mobile.
- **Fix:** Add mobile override `min-height: 40px; padding: 8px 16px;`.

### [P2] Revolution-bar hover tooltip not disabled on touch (sister tooltip is)

- **Where:** `style.css:1018` disables only `.revo-slot .ability-tooltip { display: none !important }` on mobile, but `.revo-slot .revo-tooltip` (lines 610-616) and `:hover .revo-tooltip { display: block }` still fire.
- **What:** First tap on a revo slot shows a sticky tooltip that overlaps adjacent slots until the user taps elsewhere; second tap is needed to dismiss.
- **Fix:** Add `.revo-slot .revo-tooltip { display: none !important; }` to the existing mobile block, OR gate both tooltips with `@media (hover: hover)`.

### [P2] H2H center column truncates EN labels

- **Where:** `style.css:960` (`.h2h-row { grid-template-columns: 1fr 60px 1fr }`)
- **What:** The 60px center column holds `.h2h-label` (e.g. `"TOTAL XP"`, `"COMBAT"`, `"QUESTS"`). EN strings like `"QUESTS DONE"` will wrap to two lines at 0.55rem; longer i18n keys may overflow ellipsis-less.
- **Fix:** Allow 70-80px on the narrow band, or use `font-size: clamp(0.5rem, 2vw, 0.6rem)` and `white-space: nowrap; text-overflow: ellipsis`.

### [P2] Hidden i18n anchors block (`index.html:50-56`) styled inline `display:none`

- **Where:** `index.html:50`
- **What:** Inline style is fine functionally, but if a future stylesheet does `[id^="tab-"] { display: block }` (e.g. for debug), 9 invisible spans appear in the header on mobile and break the sticky layout. Not currently broken — flagging because it's hidden state that mobile breakpoint shrinks won't catch.
- **Fix:** Move to a class `.i18n-anchor` styled in CSS, or `hidden` attribute (semantically clearer).

### [P2] `backdrop-filter: blur(24px) saturate(1.6)` on header + dock is expensive on low-end mobile

- **Where:** `style.css:107-108,836-837`
- **What:** Two stacked blurred glass surfaces re-rasterize every scroll frame. Galaxy A-series / iPhone SE 2020 show measurable jank on long skills page scrolls.
- **Fix:** Drop blur on mobile or fall back to a solid `var(--bg-glass)`:
  ```css
  @media (max-width: 640px) {
    .header, .dock { backdrop-filter: none; -webkit-backdrop-filter: none; background: rgba(13,11,20,0.96); }
  }
  ```

### [P2] `.combat-stats-grid` 3-col grid cramped at 360px

- **Where:** `style.css:1012` (`grid-template-columns: repeat(3, 1fr)` mobile)
- **What:** Three stat cells at 360px viewport - main padding - row padding ≈ ~330px / 3 = ~110px each, then 4px gap. Numbers fit (mono font), but labels like `"Combat Lv"` truncate.
- **Fix:** Drop to 2 columns below 400px:
  ```css
  @media (max-width: 400px) { .combat-stats-grid { grid-template-columns: repeat(2, 1fr); } }
  ```

### [P2] Dock z-index 150 vs error banner — banner can hide behind dock on tall content

- **Where:** `style.css:216-223` (`.error-banner` no `z-index`, sticky/normal flow), `style.css:836` (`.dock { z-index: 150 }`)
- **What:** The error banner is inline in the document flow and could be visually overlapped by the dock if it appears at the bottom of a short page. Tap-dismiss still works (`btn-dismiss` is in flow) but mobile users see only the `×` peeking above the dock.
- **Fix:** Either fix-position the error banner above the dock with `bottom: calc(72px + env(safe-area-inset-bottom))`, or render it inside `.main` content where its position is predictable.

### [P2] Dock icon size 18px on 44px target — visual hit-area mismatch

- **Where:** `style.css:1000` (`.dock-btn svg { width: 18px; height: 18px }`)
- **What:** 18px icons inside 44×44 buttons read as orphaned dots; users tend to tap the icon, not the surrounding chrome. Fine for accessibility, but a 22-24px icon would help mobile users orient. Polish.

## Quick wins (ordered by ROI)

1. **Fix dock overflow** on 360-375px viewports — affects every Galaxy S22 / iPhone mini user (5 lines of CSS, P1).
2. **Bump `.lk-input` to 16px on mobile** — single declaration kills iOS focus-zoom (P1, 1 line).
3. **Wrap purely-decorative `:hover` rules in `@media (hover: hover)`** — global mobile feel improvement (P1, ~15 rules).
4. **Add `min-height: 44px` to `.lang-toggle`, `.btn-refresh`** — accessibility compliance (P1, 3 lines).
5. **Bump pills to 32px min-height on mobile** — fat-finger errors drop significantly (P1, 2 lines).
6. **Drop `backdrop-filter` blur on `≤640px`** — scroll perf on mid-range Android (P2, 4 lines).
7. **Add `.revo-slot .revo-tooltip { display: none !important }` to mobile block** — stops sticky tooltip after first tap (P2, 1 line).

## Notes / open questions

- The repo uses 3 separate CSS injection systems (`style.css`, `live.js`/`goals.js`/`money.js` `<style>` tags). Mobile media queries are duplicated and drift independently — consider consolidating breakpoint values into `:root { --bp-mobile: 640px }` and reusing via JS-side `matchMedia()`, or move all sub-stylesheets into `style.css`. Out of scope for this review but mentioned because every finding above had to be hunted across 4 files.
- I did not test live in a browser — analysis is from reading CSS + viewport math. Confirm dock-overflow visual in DevTools mobile emulator @ 360px width before shipping the fix.
- No `prefers-color-scheme` light variant — site is dark-only. Not a mobile bug per se but mobile users frequently hit auto-dark/auto-light flags; out of scope.
- `loading-overlay` (z 200) covers the dock (z 150) during initial load — correct, no regression.
