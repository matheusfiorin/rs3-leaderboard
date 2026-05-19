#!/usr/bin/env bash
# Fan out Claude Code agents to review rs3-leaderboard.
# Each agent: read-only on repo; writes ONE markdown report to .review-2026-05-19/<slug>.md
# Run from repo root.

set -u
cd "$(dirname "$0")/.."
REVIEW_DIR=".review-2026-05-19"
mkdir -p "$REVIEW_DIR/logs"

# Agent definitions: slug | focus prompt
AGENTS=(
"01-notifications|Investigate the notification / 'new updates' system. The user reports it shows the SAME number of updates for days. Files involved likely include script.js, live.js, lookup.js, next-steps.js, money.js, major-goals.js, i18n.js. Find: (a) how 'seen' state is tracked (localStorage? timestamps? hashes?), (b) why it stays stuck, (c) reproduction steps, (d) concrete patch suggestion with file:line refs. This is the PRIORITY bug — be thorough."
"02-data-pipeline|Audit data freshness pipeline. Read .github/workflows/update-data.yml, scripts/, and how data/*.json is loaded by the frontend. Check cache invalidation (recent commit da501d0 was about this), HTTP caching headers, browser cache busting, stale data detection. Look for race conditions, partial updates, or stale-while-revalidate bugs."
"03-ux-flow|Walk through the user journey. Read index.html, style.css, script.js. Document the main UX flows (landing → leaderboard → player lookup → goals → live). Note friction, unclear labels, missing affordances, mobile UX issues, accessibility (a11y) gaps. Suggest 5–10 concrete UX improvements ranked by impact."
"04-i18n|Review i18n.js + every use of t() / translation keys across the codebase. Find missing keys, untranslated strings, key naming inconsistencies, language switch bugs. Confirm all user-facing strings go through i18n. Suggest fixes."
"05-goals-system|Deep review of goals.js + major-goals.js + next-steps.js. Logic correctness, edge cases (player has 99 already, has overflow xp, virtual levels >99), how goals are computed and displayed. Find bugs and propose fixes."
"06-combat-module|Deep review of combat.js. Verify combat calculations, ability tier suggestions, gear progression logic. Compare against RS3 wiki if needed (use web search). Report inaccuracies."
"07-money|Deep review of money.js (1143 lines — biggest file). Money-making methods, GE price integration (ge_prices.json), profitability calculations, sorting/filtering UX. Find dead code, stale methods, math errors."
"08-live|Review live.js. What does 'live' mean — XP tracking session? Real-time updates? Polling interval, error handling, what happens on stale data. UX of live indicators."
"09-lookup|Review lookup.js. Player lookup flow — input validation, RuneMetrics API integration, error states (private profile, banned, nonexistent), empty states."
"10-tips|Review tips.js. Tip rotation logic, content quality, whether tips are current/accurate for RS3 in 2026, i18n coverage."
"11-performance|Performance audit. index.html script loading order, render-blocking resources, large JSON parsing on main thread, repeated DOM queries, event listener leaks. Suggest concrete wins (defer, lazy-load, memoization). Estimate impact."
"12-accessibility|Accessibility audit of index.html + style.css + script.js. ARIA, keyboard nav, focus management, color contrast, screen-reader friendliness, prefers-reduced-motion respect. Report WCAG violations with fixes."
"13-mobile|Mobile / responsive review. Read style.css media queries, viewport meta, touch target sizes, horizontal-scroll bugs, tap-vs-hover assumptions. Walk through on a small viewport mentally."
"14-security|Security review. XSS risk in innerHTML usage, unsanitized RuneMetrics data, localStorage misuse, exposed API keys/secrets in client code, CSP gaps. Grep for innerHTML / dangerouslySet / eval / new Function."
"15-code-quality|Code quality: dead code, duplicated logic across script.js / live.js / goals.js, magic numbers, inconsistent style, missing JSDoc, error swallowing (empty catch blocks). Suggest highest-ROI refactors."
"16-testing|Testing posture. Read SMOKE_TESTS.md and PROMPT.md. What's tested? What's NOT tested? Propose a minimal test harness (vitest? playwright? hand-rolled?) and the 10 highest-value test cases that would have caught real bugs."
)

RUN_TS="$(date -u +%Y%m%dT%H%M%SZ)"
echo "[swarm] Starting ${#AGENTS[@]} agents @ $RUN_TS"
echo "[swarm] Reports → $REVIEW_DIR/<slug>.md, logs → $REVIEW_DIR/logs/"

for entry in "${AGENTS[@]}"; do
    slug="${entry%%|*}"
    focus="${entry#*|}"
    out="$REVIEW_DIR/${slug}.md"
    log="$REVIEW_DIR/logs/${slug}.log"

    prompt=$(cat <<EOF
You are one of 16 parallel code-review agents auditing the rs3-leaderboard project (vanilla JS + HTML/CSS, no build step, data fed by GitHub Actions into data/*.json).

YOUR FOCUS: ${focus}

OUTPUT REQUIREMENTS:
- Write your entire findings to: ${out}
- Use this markdown structure:
  # ${slug}
  ## Summary (2-4 sentences)
  ## Severity legend (P0 = breaks core feature, P1 = significant bug/UX flaw, P2 = polish)
  ## Findings
    For each finding:
    ### [P0|P1|P2] <short title>
    - **Where:** file:line refs
    - **What:** the problem
    - **Why:** root cause / evidence
    - **Fix:** concrete suggestion (code snippet if small)
  ## Quick wins (bulleted, ordered by ROI)
  ## Notes / open questions

- Use only read tools (Read, Grep, Glob). DO NOT modify any source files. The only file you may WRITE is ${out}.
- Be concrete: paths, line numbers, snippets. Skip generic advice.
- If your area is healthy, say so and move on — quality > volume.
- Cap report at ~400 lines.

Begin.
EOF
    )

    (
        cd /home/mathe/rs3-leaderboard
        claude -p "$prompt" \
            --permission-mode acceptEdits \
            --allowed-tools "Read,Grep,Glob,Write,Bash(cat:*),Bash(ls:*),Bash(wc:*),Bash(head:*),Bash(tail:*),Bash(grep:*),Bash(find:*)" \
            >"$log" 2>&1
        echo "[$slug] exit=$? @ $(date -u +%H:%M:%SZ)" >> "$REVIEW_DIR/logs/_progress.log"
    ) &
    echo "[swarm] launched $slug (pid $!)"
done

echo "[swarm] All ${#AGENTS[@]} agents launched. Wait for them with: wait"
wait
echo "[swarm] All agents complete."
ls -la "$REVIEW_DIR"/*.md 2>/dev/null
