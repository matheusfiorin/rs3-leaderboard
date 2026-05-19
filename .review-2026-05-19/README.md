# RS3-Leaderboard Code Review Results
**Completed:** 2026-05-19 08:31 GMT-3  
**Review Type:** Parallel 16-agent deep code analysis  
**Project:** `/home/mathe/rs3-leaderboard/`

---

## 📋 QUICK OVERVIEW

- **35 findings** across 16 domains (4 P0, 23 P1, 8 P2)
- **4 critical bugs** blocking core features
- **3 WCAG accessibility failures** (AA level)
- **1 security issue** (XSS defence-in-depth)
- **9+ regressions** in past 2 months (preventable with tests)

**Read First:** [`FINDINGS.md`](./FINDINGS.md) — executive summary with fix priority

---

## 📁 DETAILED REVIEWS

### Core Functionality
| Review | Focus | P0 | P1 | P2 | Status |
|--------|-------|-----|-----|-----|--------|
| [01-notifications.md](./01-notifications.md) | Activity badge stuck at 40 | ✓ | 3 | 1 | Critical |
| [06-combat-module.md](./06-combat-module.md) | Ultimates in bars, gear tiers | ✓ | 1 | 1 | Blocking DPS |
| [07-money.md](./07-money.md) | Item ID mismatches | ✓ | 1 | 1 | Profit loss |
| [16-testing.md](./16-testing.md) | No automated tests | ✓ | — | — | Regression risk |

### User Experience & Navigation
| Review | Focus | P0 | P1 | P2 | Status |
|--------|-------|-----|-----|-----|--------|
| [03-ux-flow.md](./03-ux-flow.md) | Dock labels, lookup, Goals | — | 5 | — | Medium effort |
| [05-goals-system.md](./05-goals-system.md) | Capstone override, gaps | — | 2 | 2 | Logic fix |

### Localization & State Management
| Review | Focus | P0 | P1 | P2 | Status |
|--------|-------|-----|-----|-----|--------|
| [04-i18n.md](./04-i18n.md) | 50 hardcoded strings, missing keys | — | 3 | 3 | Maintenance |
| [08-live.md](./08-live.md) | Player switch race, baseline decay | — | 3 | — | Data integrity |
| [09-lookup.md](./09-lookup.md) | RuneScore 0, stale labels | — | 1 | — | Minor |

### Quality & Testing
| Review | Focus | P0 | P1 | P2 | Status |
|--------|-------|-----|-----|-----|--------|
| [15-code-quality.md](./15-code-quality.md) | Dead code, duplication | — | 3 | 2 | Cleanup |
| [14-security.md](./14-security.md) | Unescaped title, XSS | — | 1 | — | 2-line fix |

### Accessibility & Mobile (WCAG AA Risk)
| Review | Focus | P0 | P1 | P2 | Status |
|--------|-------|-----|-----|-----|--------|
| [12-accessibility.md](./12-accessibility.md) | Focus, text size, keyboard nav | ✓ | 4 | 1 | **WCAG fail** |
| [13-mobile.md](./13-mobile.md) | Dock overflow, touch targets, zoom | — | 4 | — | Responsive |

### Performance & Operations
| Review | Focus | P0 | P1 | P2 | Status |
|--------|-------|-----|-----|-----|--------|
| [02-data-pipeline.md](./02-data-pipeline.md) | meta.json lie, GE fail, cron | — | 3 | — | Automation |
| [11-performance.md](./11-performance.md) | Listener leak, full-scan, visibility | — | 3 | 1 | Memory optimization |

### Training & Tips
| Review | Focus | P0 | P1 | P2 | Status |
|--------|-------|-----|-----|-----|--------|
| [10-tips.md](./10-tips.md) | Wrong level gates, sort bug | — | 2 | — | Data QA |

---

## 🚀 RECOMMENDED FIX SEQUENCE

### **Phase 1: Core (Days 1-2)**
Each of these blocks a major feature or causes visible user harm.

1. **Activity badge "last seen"** (`script.js:849`) — P0
   - Track `localStorage.rs3lb-activity-seen-at`
   - Count only activities newer than timestamp
   - **Impact:** Visible daily to active users
   - **Time:** 15 min

2. **Combat ultimates in bars** (`combat.js` + builders) — P0
   - Wire Berserk, Deadshot, Omnipower, Sunshine, Living Death
   - **Impact:** Correct DPS estimates for end-game
   - **Time:** 1–2h

3. **Money item ID audit** (`money.js`) — P0
   - Cross-check all recipe IDs against GE cache
   - **Impact:** Stop silent profit calculation errors
   - **Time:** 2–3h

4. **Add test suite** (Jest + Playwright) — P0
   - Catch regressions before deploy
   - **Impact:** Prevent 9+ month/2-month pattern
   - **Time:** 4–6h

5. **Player switch race fix** (`live.js:439-450`) — P1
   - Abort in-flight requests on switch
   - **Impact:** Data integrity
   - **Time:** 30 min

### **Phase 2: UX & Trust (Days 3-4)**
Medium-effort fixes that improve user confidence.

6. **Visible focus indicators** (`style.css`) — P1
   - Add `:focus-visible { outline: 2px solid #gold; }`
   - **Impact:** WCAG 2.4.7 AA compliance
   - **Time:** 20 min

7. **Persist level-up toasts** (`script.js:1574-1600`) — P1
   - Save last snapshot to localStorage
   - **Impact:** Notifications work across page reloads
   - **Time:** 30 min

8. **Dock text labels** (`style.css` + `index.html`) — P1
   - Show labels on hover or always
   - **Impact:** Cold-start UX clarity
   - **Time:** 30 min CSS + media query

9. **Capstone override alignment** (`goals.js:266-272`) — P1
   - Fix ring ≠ bar contradiction
   - **Impact:** UI clarity
   - **Time:** 20 min

10. **Escape player name in title** (`script.js:1045`) — P1
    - Wrap with `esc()`
    - **Impact:** Defence-in-depth XSS mitigation
    - **Time:** 2 min

### **Phase 3: Maintenance (Days 5+)**
Can defer without user impact, but improve long-term health.

11. **Hardcoded i18n to dictionary** (all files) — P1
    - Replace `lang === "pt" ? ... : ...` with `t()` calls
    - **Impact:** Reduced maintenance burden
    - **Time:** 2–3h

12. **Sticky XP/hr decay** (`live.js`) — P1
    - Stop lerp after idle timeout
    - **Impact:** Realistic engagement signal
    - **Time:** 30 min

13. **Training level gates audit** (`tips.js`) — P1
    - Verify Runecrafting, Summoning, Divination, Agility, etc.
    - **Impact:** Accurate advice
    - **Time:** 1h

14. **Performance cleanup** — P1+P2
    - Remove listener leak (event delegation)
    - Cache attachImgFallbacks
    - Skip rerender on identical data
    - Add visibility gate to 5-min timer
    - **Impact:** Smoother UX, memory savings
    - **Time:** 1–2h

15. **Full accessibility pass** — P1+P2
    - Text size (12px minimum)
    - Touch targets (44×44px)
    - Keyboard navigation (focus move + announce)
    - aria-pressed / aria-current on active tabs
    - **Impact:** WCAG AA full compliance
    - **Time:** 2–3h

---

## 📊 STATS

```
Total findings:      35
├─ P0 (critical):    4
├─ P1 (high):       23
└─ P2 (polish):      8

By domain:
├─ Notifications:    6 issues
├─ Accessibility:    6 issues (WCAG risk)
├─ Localization:     5 issues
├─ UX:              5 issues
├─ Performance:      3 issues
├─ Data pipeline:    3 issues
├─ Code quality:     3 issues
├─ Goals:           2 issues
├─ Live/Training:    2 issues
└─ Testing:         1 issue

Total LoC analyzed: ~8,000 JS + HTML
Review depth: Per-file code audit + cross-reference analysis
```

---

## 📝 HOW TO USE THESE REPORTS

1. **Start:** Read [`FINDINGS.md`](./FINDINGS.md) for executive overview
2. **Detail:** Click review links for specific domains (each standalone)
3. **Implement:** Follow "Fix:" recommendations in each report
4. **Verify:** Run `node --check *.js` + Playwright suite after each phase
5. **Commit:** `git add -A && git commit -m "fix: [issue] [phase]"` (see PROMPT.md git protocol)

---

## 🔗 RELATED

- **Project:** `/home/mathe/rs3-leaderboard/`
- **Prompt:** `/home/mathe/rs3-leaderboard/PROMPT.md` (gamification requirements)
- **Smoke Tests:** `/home/mathe/rs3-leaderboard/SMOKE_TESTS.md` (manual test cases)

---

**Review completed by 16-agent parallel swarm (08:31 GMT-3 2026-05-19)**  
**Ready for fixer agent handoff.**
