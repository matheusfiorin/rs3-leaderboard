# Sexta Era — Rebrand Plan 2026-06-15

Synthesis of 5 parallel Opus-4.7 audits (visual language, perf, UX flow, IA restructure, brand language) + RS3 wiki aesthetic grounding (Senntisten / City of Um / Sliske / Prifddinas).

Checkpoint tag: `pre-rebrand-2026-06-15` at commit `d444bbc`.

---

## Brand statement

> **Sexta Era is the dashboard for the age after the gods returned — cold temple stone lit by two prayers, where every XP tick is a vestige carved into the Sixth Age, and motion is reserved for the moments that earned it.**

- Wordmark: **Sexta Era** (replaces "RS3 Placar")
- Subtitle PT: `Acompanhamento da Sexta Era` / EN: `Sixth Age tracker`
- Document title: `Sexta Era — Decxus & Soclopata`

---

## Design tokens v2

Cold ink + two ritual lights + one milestone violet. All AA contrast verified vs `--bg`.

```css
--bg: #06080F;            /* Senntisten basalt midnight */
--bg-surface: #0C1019;
--bg-surface-2: #141826;
--bg-hover: #1B1F2E;
--bg-glass: rgba(8,10,18,0.88);
--border: rgba(180,196,224,0.07);
--border-lit: rgba(180,196,224,0.18);

/* Two prayers facing each other */
--soul: #E63950;          /* Soul Split — P1 (Decxus) */
--soul-bright: #FF6478;
--soul-bg: rgba(230,57,80,0.08);

--prayer: #5BA3FF;        /* Prayer azure — P2 (Soclopata) */
--prayer-bright: #8AC0FF;
--prayer-bg: rgba(91,163,255,0.08);

/* Endgame milestone — used sparingly */
--ash: #B388F5;           /* Sliske / Necromancy */
--ash-bright: #D4B8FF;
--ash-bg: rgba(179,136,245,0.08);

--text: #ECEEF5;          /* cold ivory */
--text-2: #9AA3B8;
--text-3: #6B7388;
--text-faint: #454B5C;    /* decoration only — NOT for readable text */

--success: #3FD693;
--warn: #F0A030;
--danger: #FF5470;
--locked: #3A4054;

/* Player bindings — actually wire these */
--p1: var(--soul);
--p2: var(--prayer);
```

Drop: `--gold*`, `--teal*`, `--purple*`, `--cat-*`, `--p1/p2/bg` legacy declarations, `--shadow-lg`, `--shadow-glow`. Add `--border-glow` (currently referenced but undefined). Replace combat-style raw hex literals.

---

## Typography

- **Display: Fraunces 700** (replaces Cinzel) — editorial serif, optical-sizing auto, `letter-spacing: -0.02em` at h1.
- **Body: Sora** 300/400/500/600 (kept).
- **Data: JetBrains Mono** 500/700 (kept).
- Trim Google Fonts to 5 weight files total. Preload Fraunces 700 + Sora 400.

Single scale (modular, 1.2 ratio): 0.72, 0.78, 0.86, 1.0 (16px), 1.18, 1.4, 1.66, 2.0, 2.4. Kill every off-scale value.

---

## Motion

Single ease: `cubic-bezier(0.32, 0.72, 0, 1)`. Three durations: `--dur-fast: 120ms`, `--dur: 220ms`, `--dur-slow: 480ms`. Motion fires only on state change — not on appear. `prefers-reduced-motion` zeros every duration.

---

## Information architecture

### Dashboard topology (top-to-bottom, desktop)

1. `#hero-band` — War Room: both players in a 2-col band, name + total + combat + XP-to-next-200M micro-bar each. ~140px.
2. `#tonight` — Tonight's Board: 3 tiles per player (next skill tick · next quest unlock · best GP/hr right now). ~220px.
3. `#head-to-head` — H2H deltas (top-5 skills, quest points, total XP). ~360px.
4. `#major-goals` — Active campaigns (filter `0 < pct < 100`, max 6).
5. `#mission-control` — Collapsed accordion (default closed).
6. `#journal-scores` — Compact ribbon (hidden on mobile).

**Removed from dashboard:** `#memorial-mount` (relocated to archive sub-route), redundant Goals duplication.

### Memorial archive sub-route

- New section `data-page="archive"` (page id `archive`).
- NOT in dock.
- Reachable via:
  - Footer chip: `In Memoriam · Fiorovizk →`
  - Era-stamp click (existing element)
- Single-column tribute layout. memorial.js mount target switches to `#archive-content`.

### Dock (7 buttons)

```
Painel | Skills | Combate | Missões | Metas | GP | Live
```

- **Activity** removed from dock — folded into bell panel (notifications already shows today's activity).
- **Lookup** removed from dock — small search button in header opens an overlay.
- **Combat** promoted to its own route (was buried at bottom of Skills).
- **Journal** stays off-dock, reachable from dashboard ribbon.

### Page renames

- Money → "GP" (sharper, mid-endgame voice).
- Quests → "Missões" (kept PT).
- Goals → "Metas" (kept PT).
- Skills → "Skills" (universal).
- Dashboard → "Painel" (kept PT).

---

## Performance plan

CRIT wins (per perf audit):

1. **Lazy-load tab JS.** Defer goals/money/combat/live/next-steps/major-goals/tips behind first-touch `launchSection`. Dashboard only ships i18n + script + memorial + notifications + minimal main bundle. (TBT −250ms Android, JS parse −60%.)
2. **Trim Google Fonts.** Drop unused weights (5 total instead of 14). Preload critical font. (LCP −500ms cold mobile, CLS −0.05.)
3. **Kill dock + header backdrop-filter on touch.** Gate behind `@media (hover: hover) and (min-width: 1024px)`. (INP −80ms Android, scroll jank gone.)
4. **content-visibility on quest list.** `.ql-row { content-visibility: auto; contain-intrinsic-size: 0 44px; }`. Quest tab paint cost −60%.
5. **Throttle live RAF.** 60Hz → 4Hz (250ms setInterval). Visible change identical, CPU −80%.
6. **Move 6 runtime style injections into style.css.** Single style recalc instead of N.
7. **Cache `Intl.NumberFormat`.** Stop per-call locale string allocation.
8. **Tighter `cacheFetch` strategy.** Drop `no-cache`; preload + matching cache mode = single fetch.

---

## Implementation passes

### Pass A — Tokens + chrome (foundational)

- Rewrite `:root` block with new tokens.
- Delete dead tokens, add `--border-glow`.
- Replace hardcoded gold/teal/purple references that should be player tokens.
- Header: drop Cinzel ornament masthead, set `Sexta Era` wordmark, simplify chrome.
- Dock: lit-edge on active tab, drop backdrop-filter on touch.
- Tier ribbon: keep as a compact strip (will revisit in pass B/C).

### Pass B — Dashboard restructure

- `index.html`: remove `#memorial-mount` from dashboard, add `#archive` section, reorder dashboard sections.
- `memorial.js`: change mount target id from `#memorial-mount` to `#archive-content`.
- Add `#war-room` + `#tonight` mounts.
- Add `#war-room` renderer in script.js (compact hero band).
- Add `#tonight` renderer (next-steps + money picks for both players, 3 tiles each).
- `script.js`: extend `launchSection` route table (`activity → bell`, `lookup → modal`).
- Footer: add "In Memoriam: Fiorovizk →" chip.
- Era-stamp click → archive route.

### Pass C — Per-page polish

- Goals: new card surface, new ROTM phase color, new lock state.
- GP (Money): freshness chip, asterisk on wiki-fallback rows.
- Skills: single filter row (sort dropdown trailing), remove `--cat-*` saturated swatches in favor of subtle per-skill gradient.
- Combat: dedicated page (already merged in skills — split out via `data-page="combat"`).
- Activity: route → bell panel overlay reuses renderer.
- Lookup: header modal with history chips on landing.
- Quests: `content-visibility: auto` + reorder filter pills (`Do Next | In Progress | One Done | Both Done | All`).
- Live: throttled counter loop.

### Pass D — Perf + motion

- Font subset.
- Lazy-load module loading (dynamic `<script>` injection on first `launchSection`).
- Move runtime style blocks into `style.css`.
- Cache `Intl.NumberFormat`.
- Drop `cache: "no-cache"` on cacheFetch.
- Add motion tokens (`--dur-fast/dur/dur-slow`, single ease).
- Suppress hover transforms on `pointer:coarse`.

---

## Validation

- `npm run lint` clean.
- Full Playwright matrix.
- Screenshot sweep: dashboard / progression / skills / combat / GP / live / archive (PT + EN; 1280px + 375px).
- DevTools Performance trace on dashboard cold load: target FCP <2s mobile, LCP <2.5s mobile.
- Manual: keyboard nav, screen-reader smoke, mobile (375px and 768px).
- Commit + push.

---

## Out of scope this pass

- TypeScript migration.
- SW / offline PWA.
- Real Notification API permission flow.
- New skill / quest data corrections beyond what's already shipped in d444bbc.
- Full PT/EN translation pass for new strings (will ship with both languages but minor copy may carry over).
