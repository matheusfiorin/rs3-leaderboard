/* =============================================
   RS3 Leaderboard — Grind Tracker Module
   Live XP chart + rate/ETA for active skill grinds.
   Standalone module — called from dashboard renderer.
   ============================================= */

// ---- Config ----
const GRIND_KEY = "rs3lb-grind";
const GRIND_SKILL_ID = 16; // Agility (configurable later)
const GRIND_TARGET_XP = 302288; // Level 61
const GRIND_TARGET_LVL = 61;
const GRIND_MAX_SNAPSHOTS = 500;

// ---- Progress bar helper ----
function grindProgressBar(pct, cls) {
  const c = Math.max(0, Math.min(100, pct));
  const done = c >= 100 ? "grind-bar-done" : "";
  return `<div class="grind-bar ${cls || ""}"><div class="grind-bar-fill ${done}" style="width:${c}%"></div></div>`;
}

// ---- Snapshot persistence ----
function grindLoadSnapshots() {
  try { return JSON.parse(localStorage.getItem(GRIND_KEY) || "[]"); }
  catch { return []; }
}
function grindSaveSnapshots(arr) {
  localStorage.setItem(GRIND_KEY, JSON.stringify(arr));
}

function grindRecordSnapshot(player) {
  const sk = player.skills[GRIND_SKILL_ID] || {};
  const xp = sk.xp || 0;
  const lvl = sk.level || 1;
  const snaps = grindLoadSnapshots();
  if (snaps.length > 0 && snaps[snaps.length - 1].xp === xp) return snaps;
  snaps.push({ t: Date.now(), xp, lvl });
  if (snaps.length > GRIND_MAX_SNAPSHOTS) snaps.splice(0, snaps.length - GRIND_MAX_SNAPSHOTS);
  grindSaveSnapshots(snaps);
  return snaps;
}

// ---- Stats computation ----
function grindCalcStats(snaps) {
  if (snaps.length < 1) return null;
  const first = snaps[0], last = snaps[snaps.length - 1];
  const sessionGain = last.xp - first.xp;
  const sessionMs = last.t - first.t;
  const sessionHrs = sessionMs / 3600000;

  const thirtyAgo = last.t - 30 * 60 * 1000;
  const recent = snaps.filter(s => s.t >= thirtyAgo);
  let ratePerHr = 0;
  if (recent.length >= 2) {
    const rFirst = recent[0], rLast = recent[recent.length - 1];
    const dt = (rLast.t - rFirst.t) / 3600000;
    if (dt > 0) ratePerHr = (rLast.xp - rFirst.xp) / dt;
  } else if (sessionHrs > 0) {
    ratePerHr = sessionGain / sessionHrs;
  }

  const remaining = Math.max(0, GRIND_TARGET_XP - last.xp);
  const etaHrs = ratePerHr > 0 ? remaining / ratePerHr : null;

  return {
    sessionGain, ratePerHr: Math.round(ratePerHr),
    remaining, etaHrs, currentXp: last.xp, currentLvl: last.lvl,
    elapsed: sessionMs, snapCount: snaps.length,
    done: last.xp >= GRIND_TARGET_XP,
  };
}

function grindFormatEta(hrs) {
  if (hrs == null || hrs <= 0) return "--";
  const h = Math.floor(hrs);
  const m = Math.round((hrs - h) * 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
function grindFormatElapsed(ms) {
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

// ---- Render stats HTML ----
function grindRenderStats(stats) {
  if (!stats) return `<div class="grind-stats"><p style="color:var(--text-3);font-size:0.72rem;font-style:italic;">Waiting for data...</p></div>`;
  const lang = typeof currentLang !== "undefined" ? currentLang : "en";
  const pct = Math.min(100, Math.round((stats.currentXp / GRIND_TARGET_XP) * 100));
  const L = lang === "pt"
    ? { rate: "XP/hora", eta: "ETA p/ 61", gained: "Ganho", elapsed: "Tempo", remaining: "Restante" }
    : { rate: "XP/hour", eta: "ETA to 61", gained: "Gained", elapsed: "Elapsed", remaining: "Remaining" };

  return `<div class="grind-stats">
    <div class="grind-stat"><span class="grind-val ${stats.ratePerHr > 0 ? "grind-live" : ""}">${stats.ratePerHr > 0 ? stats.ratePerHr.toLocaleString() : "--"}</span><span class="grind-label">${L.rate}</span></div>
    <div class="grind-stat"><span class="grind-val">${grindFormatEta(stats.etaHrs)}</span><span class="grind-label">${L.eta}</span></div>
    <div class="grind-stat"><span class="grind-val">${stats.sessionGain > 0 ? "+" + stats.sessionGain.toLocaleString() : "0"}</span><span class="grind-label">${L.gained}</span></div>
    <div class="grind-stat"><span class="grind-val">${stats.remaining.toLocaleString()}</span><span class="grind-label">${L.remaining}</span></div>
    <div class="grind-stat"><span class="grind-val">${grindFormatElapsed(stats.elapsed)}</span><span class="grind-label">${L.elapsed}</span></div>
  </div>
  ${grindProgressBar(pct, "grind-bar-hero")}
  <div style="text-align:center;margin-top:4px;font-family:var(--font-mono);font-size:0.72rem;color:var(--text-3);">
    Lvl ${stats.currentLvl} &mdash; ${stats.currentXp.toLocaleString()} / ${GRIND_TARGET_XP.toLocaleString()} XP (${pct}%)
  </div>`;
}

// ---- Render chart canvas ----
function grindRenderChart(snaps) {
  if (typeof Chart === "undefined" || snaps.length < 2)
    return `<div class="grind-chart-wrap" style="display:flex;align-items:center;justify-content:center;"><span style="color:var(--text-3);font-size:0.72rem;">Chart appears after next refresh...</span></div>`;
  return `<div class="grind-chart-wrap"><canvas id="grind-chart" height="200"></canvas></div>`;
}

// ---- Build Chart.js instance ----
function grindBuildChart(snaps, stats) {
  if (typeof Chart === "undefined" || typeof makeChart !== "function" || snaps.length < 2) return;
  const canvas = document.getElementById("grind-chart");
  if (!canvas) return;

  const t0 = snaps[0].t;
  const pts = snaps.map(s => ({ x: (s.t - t0) / 60000, y: s.xp }));
  const datasets = [
    { label: "Agility XP", data: pts, borderColor: "rgba(212,168,67,1)", backgroundColor: "rgba(212,168,67,0.1)", borderWidth: 2, pointRadius: snaps.length > 50 ? 0 : 3, pointBackgroundColor: "rgba(212,168,67,1)", fill: true, tension: 0.3 },
    { label: `Target (Lvl ${GRIND_TARGET_LVL})`, data: [{ x: 0, y: GRIND_TARGET_XP }, { x: Math.max(pts[pts.length - 1].x, 60), y: GRIND_TARGET_XP }], borderColor: "rgba(52,211,153,0.6)", borderWidth: 2, borderDash: [8, 4], pointRadius: 0, fill: false },
  ];
  if (stats && stats.ratePerHr > 0 && !stats.done) {
    const lp = pts[pts.length - 1];
    const mt = ((GRIND_TARGET_XP - lp.y) / stats.ratePerHr) * 60;
    datasets.push({ label: "Projected", data: [{ x: lp.x, y: lp.y }, { x: lp.x + mt, y: GRIND_TARGET_XP }], borderColor: "rgba(212,168,67,0.35)", borderWidth: 2, borderDash: [4, 4], pointRadius: 0, fill: false });
  }

  makeChart("grind-chart", {
    type: "line", data: { datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: "nearest", intersect: false },
      scales: {
        x: { type: "linear", title: { display: true, text: "Minutes", color: "#9a9488", font: { size: 10 } }, ticks: { callback: v => Math.round(v) + "m" } },
        y: { title: { display: true, text: "XP", color: "#9a9488", font: { size: 10 } }, ticks: { callback: v => (v / 1000).toFixed(0) + "k" }, suggestedMin: snaps[0].xp * 0.98, suggestedMax: GRIND_TARGET_XP * 1.02 },
      },
      plugins: {
        legend: { display: true, position: "top" },
        tooltip: { callbacks: {
          label: ctx => `${ctx.dataset.label}: ${Math.round(ctx.parsed.y).toLocaleString()} XP`,
          title: items => { if (!items.length) return ""; const m = Math.round(items[0].parsed.x); return m >= 60 ? `+${Math.floor(m/60)}h ${m%60}m` : `+${m}m`; },
        }},
      },
    },
  });
}

// ---- Inject scoped CSS ----
function grindInjectStyles() {
  if (document.getElementById("grind-styles")) return;
  const s = document.createElement("style");
  s.id = "grind-styles";
  s.textContent = `
.grind-section { padding: var(--sp-4); background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-sm); position: relative; overflow: hidden; }
.grind-section::before { content: ""; position: absolute; top: 0; left: 0; right: 0; height: 1px; background: linear-gradient(90deg, transparent, rgba(212,168,67,0.2), transparent); }
.grind-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--sp-3); }
.grind-title { font-family: var(--font-display); font-size: 0.95rem; font-weight: 700; color: var(--gold-bright); display: flex; align-items: center; gap: var(--sp-2); }
.grind-reset { font-size: 0.6rem; padding: 3px 8px; border: 1px solid var(--border); border-radius: 10px; background: transparent; color: var(--text-3); cursor: pointer; transition: all 0.2s; text-transform: uppercase; letter-spacing: 0.05em; }
.grind-reset:hover { border-color: rgba(248,113,113,0.4); color: #f87171; }
.grind-stats { display: grid; grid-template-columns: repeat(5, 1fr); gap: var(--sp-2); margin-bottom: var(--sp-3); }
.grind-stat { display: flex; flex-direction: column; align-items: center; padding: var(--sp-2); background: var(--bg-raised); border-radius: var(--radius-xs); }
.grind-val { font-family: var(--font-mono); font-size: 0.85rem; font-weight: 800; color: var(--text); }
.grind-val.grind-live { color: var(--gold-bright); }
.grind-label { font-size: 0.56rem; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.05em; margin-top: 2px; }
.grind-bar { height: 5px; background: var(--bg-raised); border-radius: 3px; overflow: hidden; min-width: 60px; }
.grind-bar-fill { height: 100%; border-radius: 3px; background: linear-gradient(90deg, var(--gold-dim), var(--gold)); transition: width 0.6s ease; }
.grind-bar-fill.grind-bar-done { background: linear-gradient(90deg, #059669, #34d399); }
.grind-bar-hero { height: 6px; max-width: 320px; margin: var(--sp-3) auto 0; }
.grind-chart-wrap { position: relative; height: 200px; margin-top: var(--sp-3); }
@media (max-width: 640px) { .grind-stats { grid-template-columns: repeat(3, 1fr); } .grind-chart-wrap { height: 160px; } .grind-val { font-size: 0.74rem; } }
`;
  document.head.appendChild(s);
}

// ============================================================
// Public: renderGrindTracker(container, player)
// Called from dashboard renderer to append grind tracker.
// ============================================================
function renderGrindTracker(container, player) {
  grindInjectStyles();
  const snaps = grindRecordSnapshot(player);
  const stats = grindCalcStats(snaps);
  const lang = typeof currentLang !== "undefined" ? currentLang : "en";
  const title = lang === "pt" ? "Grind de Agility" : "Agility Grind Tracker";
  const resetLabel = lang === "pt" ? "Resetar" : "Reset";

  const div = document.createElement("div");
  div.className = "grind-section";
  div.innerHTML = `
    <div class="grind-header">
      <div class="grind-title">${typeof skillIconImg === "function" ? skillIconImg(GRIND_SKILL_ID, 20) : ""} ${title}</div>
      <button class="grind-reset" id="grind-reset">${resetLabel}</button>
    </div>
    ${grindRenderStats(stats)}
    ${grindRenderChart(snaps)}`;
  container.appendChild(div);

  try { grindBuildChart(snaps, stats); } catch (e) { console.error("Grind chart:", e); }

  const btn = document.getElementById("grind-reset");
  if (btn) btn.addEventListener("click", () => { grindSaveSnapshots([]); renderGrindTracker(container, player); });
}
