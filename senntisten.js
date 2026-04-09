/* =============================================
   RS3 Leaderboard — Grind Tracker Module
   Live XP chart + rate/ETA for any skill grind.
   Standalone module — called from dashboard renderer.
   ============================================= */

// ---- Config (persisted in localStorage) ----
const GRIND_KEY = "rs3lb-grind";
const GRIND_CFG_KEY = "rs3lb-grind-cfg";
const GRIND_MAX_SNAPSHOTS = 500;

// XP table (mirrors script.js)
const _GRIND_XP = [0];
(function () {
  let t = 0;
  for (let L = 1; L < 150; L++) {
    t += Math.floor(L + 300 * Math.pow(2, L / 7)) / 4;
    _GRIND_XP.push(Math.floor(t));
  }
})();
function grindXpForLevel(lvl) { return lvl <= 1 ? 0 : _GRIND_XP[Math.min(lvl - 1, 149)] || 0; }

// Skill names (uses global SKILL_NAMES_EN from script.js if available)
function grindSkillName(id) {
  if (typeof SKILL_NAMES_EN !== "undefined") return SKILL_NAMES_EN[id] || `Skill ${id}`;
  const names = {0:"Attack",1:"Defence",2:"Strength",3:"Constitution",4:"Ranged",5:"Prayer",6:"Magic",7:"Cooking",8:"Woodcutting",9:"Fletching",10:"Fishing",11:"Firemaking",12:"Crafting",13:"Smithing",14:"Mining",15:"Herblore",16:"Agility",17:"Thieving",18:"Slayer",19:"Farming",20:"Runecrafting",21:"Hunter",22:"Construction",23:"Summoning",24:"Dungeoneering",25:"Divination",26:"Invention",27:"Archaeology",28:"Necromancy"};
  return names[id] || `Skill ${id}`;
}

// ---- Config persistence ----
function grindLoadCfg() {
  try {
    const c = JSON.parse(localStorage.getItem(GRIND_CFG_KEY));
    if (c && typeof c.skillId === "number" && typeof c.targetLvl === "number") return c;
  } catch (_) {}
  return { skillId: 16, targetLvl: 61 }; // default: Agility 61
}
function grindSaveCfg(cfg) { localStorage.setItem(GRIND_CFG_KEY, JSON.stringify(cfg)); }

// ---- Auto-detect active skill from player data ----
function grindAutoDetect(player, prevSnapshot) {
  if (!prevSnapshot) return null;
  let bestGain = 0, bestId = null;
  for (const [id, sk] of Object.entries(player.skills)) {
    const prev = prevSnapshot[id] || 0;
    const gain = (sk.xp || 0) - prev;
    if (gain > bestGain) { bestGain = gain; bestId = Number(id); }
  }
  return bestId;
}

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
function grindSaveSnapshots(arr) { localStorage.setItem(GRIND_KEY, JSON.stringify(arr)); }

function grindRecordSnapshot(player, skillId) {
  const sk = player.skills[skillId] || {};
  const xp = sk.xp || 0;
  const lvl = sk.level || 1;
  const snaps = grindLoadSnapshots();
  // If skill changed or old format (no sid), clear snapshots
  if (snaps.length > 0 && snaps[0].sid !== skillId) {
    snaps.length = 0;
  }
  if (snaps.length > 0 && snaps[snaps.length - 1].xp === xp) return snaps;
  snaps.push({ t: Date.now(), xp, lvl, sid: skillId });
  if (snaps.length > GRIND_MAX_SNAPSHOTS) snaps.splice(0, snaps.length - GRIND_MAX_SNAPSHOTS);
  grindSaveSnapshots(snaps);
  return snaps;
}

// ---- Stats computation ----
function grindCalcStats(snaps, targetXp) {
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
  } else if (sessionHrs > 0.01) {
    ratePerHr = sessionGain / sessionHrs;
  }

  const remaining = Math.max(0, targetXp - last.xp);
  const etaHrs = ratePerHr > 0 ? remaining / ratePerHr : null;

  return {
    sessionGain, ratePerHr: Math.round(ratePerHr),
    remaining, etaHrs, currentXp: last.xp, currentLvl: last.lvl,
    elapsed: sessionMs, snapCount: snaps.length,
    done: last.xp >= targetXp,
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
function grindRenderStats(stats, cfg) {
  if (!stats) return `<div class="grind-stats"><p style="color:var(--text-3);font-size:0.72rem;font-style:italic;">Waiting for data...</p></div>`;
  const lang = typeof currentLang !== "undefined" ? currentLang : "en";
  const targetXp = grindXpForLevel(cfg.targetLvl);
  const pct = targetXp > 0 ? Math.min(100, Math.round((stats.currentXp / targetXp) * 100)) : 0;
  const etaLabel = lang === "pt" ? `ETA p/ ${cfg.targetLvl}` : `ETA to ${cfg.targetLvl}`;
  const L = lang === "pt"
    ? { rate: "XP/hora", eta: etaLabel, gained: "Ganho", elapsed: "Tempo", remaining: "Restante" }
    : { rate: "XP/hour", eta: etaLabel, gained: "Gained", elapsed: "Elapsed", remaining: "Remaining" };

  return `<div class="grind-stats">
    <div class="grind-stat"><span class="grind-val ${stats.ratePerHr > 0 ? "grind-live" : ""}">${stats.ratePerHr > 0 ? stats.ratePerHr.toLocaleString() : "--"}</span><span class="grind-label">${L.rate}</span></div>
    <div class="grind-stat"><span class="grind-val">${grindFormatEta(stats.etaHrs)}</span><span class="grind-label">${L.eta}</span></div>
    <div class="grind-stat"><span class="grind-val">${stats.sessionGain > 0 ? "+" + stats.sessionGain.toLocaleString() : "0"}</span><span class="grind-label">${L.gained}</span></div>
    <div class="grind-stat"><span class="grind-val">${stats.remaining.toLocaleString()}</span><span class="grind-label">${L.remaining}</span></div>
    <div class="grind-stat"><span class="grind-val">${grindFormatElapsed(stats.elapsed)}</span><span class="grind-label">${L.elapsed}</span></div>
  </div>
  ${grindProgressBar(pct, "grind-bar-hero")}
  <div style="text-align:center;margin-top:4px;font-family:var(--font-mono);font-size:0.72rem;color:var(--text-3);">
    Lvl ${stats.currentLvl} &mdash; ${stats.currentXp.toLocaleString()} / ${targetXp.toLocaleString()} XP (${pct}%)
  </div>`;
}

// ---- Render chart canvas ----
function grindRenderChart(snaps) {
  if (typeof Chart === "undefined" || snaps.length < 2)
    return `<div class="grind-chart-wrap" style="display:flex;align-items:center;justify-content:center;"><span style="color:var(--text-3);font-size:0.72rem;">Chart appears after next refresh...</span></div>`;
  return `<div class="grind-chart-wrap"><canvas id="grind-chart" height="200"></canvas></div>`;
}

// ---- Build Chart.js instance ----
function grindBuildChart(snaps, stats, cfg) {
  if (typeof Chart === "undefined" || typeof makeChart !== "function" || snaps.length < 2) return;
  const canvas = document.getElementById("grind-chart");
  if (!canvas) return;

  const targetXp = grindXpForLevel(cfg.targetLvl);
  const skillName = grindSkillName(cfg.skillId);
  const t0 = snaps[0].t;
  const pts = snaps.map(s => ({ x: (s.t - t0) / 60000, y: s.xp }));
  const datasets = [
    { label: `${skillName} XP`, data: pts, borderColor: "rgba(212,168,67,1)", backgroundColor: "rgba(212,168,67,0.1)", borderWidth: 2, pointRadius: snaps.length > 50 ? 0 : 3, pointBackgroundColor: "rgba(212,168,67,1)", fill: true, tension: 0.3 },
    { label: `Target (Lvl ${cfg.targetLvl})`, data: [{ x: 0, y: targetXp }, { x: Math.max(pts[pts.length - 1].x, 60), y: targetXp }], borderColor: "rgba(52,211,153,0.6)", borderWidth: 2, borderDash: [8, 4], pointRadius: 0, fill: false },
  ];
  if (stats && stats.ratePerHr > 0 && !stats.done) {
    const lp = pts[pts.length - 1];
    const mt = ((targetXp - lp.y) / stats.ratePerHr) * 60;
    if (mt > 0 && mt < 100000) {
      datasets.push({ label: "Projected", data: [{ x: lp.x, y: lp.y }, { x: lp.x + mt, y: targetXp }], borderColor: "rgba(212,168,67,0.35)", borderWidth: 2, borderDash: [4, 4], pointRadius: 0, fill: false });
    }
  }

  makeChart("grind-chart", {
    type: "line", data: { datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: "nearest", intersect: false },
      scales: {
        x: { type: "linear", title: { display: true, text: "Minutes", color: "#9a9488", font: { size: 10 } }, ticks: { callback: v => Math.round(v) + "m" } },
        y: { title: { display: true, text: "XP", color: "#9a9488", font: { size: 10 } }, ticks: { callback: v => (v / 1000).toFixed(0) + "k" }, suggestedMin: snaps[0].xp * 0.98, suggestedMax: targetXp * 1.02 },
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

// ---- Skill picker HTML ----
function grindSkillPicker(cfg, player) {
  const lang = typeof currentLang !== "undefined" ? currentLang : "en";
  // Build options for all 29 skills
  let opts = "";
  for (let id = 0; id <= 28; id++) {
    const name = typeof tSkill === "function" ? tSkill(id) : grindSkillName(id);
    const lvl = (player.skills[id] || {}).level || 1;
    const sel = id === cfg.skillId ? "selected" : "";
    opts += `<option value="${id}" ${sel}>${name} (${lvl})</option>`;
  }
  // Target level options (current+1 to max)
  const curLvl = (player.skills[cfg.skillId] || {}).level || 1;
  const maxLvl = [15,18,19,24,26,27].includes(cfg.skillId) ? 120 : cfg.skillId === 26 ? 150 : 99; // elite/invention
  let tgtOpts = "";
  for (let l = curLvl + 1; l <= maxLvl; l++) {
    const sel = l === cfg.targetLvl ? "selected" : "";
    tgtOpts += `<option value="${l}" ${sel}>${l}</option>`;
  }
  if (!tgtOpts) tgtOpts = `<option value="${maxLvl}" selected>${maxLvl}</option>`;

  return `<div class="grind-picker">
    <select id="grind-skill-select" class="grind-select">${opts}</select>
    <span style="color:var(--text-3);font-size:0.7rem">${lang === "pt" ? "até" : "to"}</span>
    <select id="grind-target-select" class="grind-select">${tgtOpts}</select>
  </div>`;
}

// ---- Inject scoped CSS ----
function grindInjectStyles() {
  if (document.getElementById("grind-styles")) return;
  const s = document.createElement("style");
  s.id = "grind-styles";
  s.textContent = `
.grind-section { padding: var(--sp-4); background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-sm); position: relative; overflow: hidden; }
.grind-section::before { content: ""; position: absolute; top: 0; left: 0; right: 0; height: 1px; background: linear-gradient(90deg, transparent, rgba(212,168,67,0.2), transparent); }
.grind-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--sp-2); }
.grind-title { font-family: var(--font-display); font-size: 0.95rem; font-weight: 700; color: var(--gold-bright); display: flex; align-items: center; gap: var(--sp-2); }
.grind-reset { font-size: 0.6rem; padding: 3px 8px; border: 1px solid var(--border); border-radius: 10px; background: transparent; color: var(--text-3); cursor: pointer; transition: all 0.2s; text-transform: uppercase; letter-spacing: 0.05em; }
.grind-reset:hover { border-color: rgba(248,113,113,0.4); color: #f87171; }
.grind-picker { display: flex; align-items: center; gap: 6px; margin-bottom: var(--sp-3); }
.grind-select { background: var(--bg-raised); border: 1px solid var(--border); border-radius: var(--radius-xs); color: var(--text); font-family: var(--font-body); font-size: 0.72rem; padding: 4px 8px; cursor: pointer; }
.grind-select:focus { outline: none; border-color: var(--gold-dim); }
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
@media (max-width: 640px) { .grind-stats { grid-template-columns: repeat(3, 1fr); } .grind-chart-wrap { height: 160px; } .grind-val { font-size: 0.74rem; } .grind-picker { flex-wrap: wrap; } }
`;
  document.head.appendChild(s);
}

// ============================================================
// Public: renderGrindTracker(container, player)
// Called from dashboard renderer.
// ============================================================
function renderGrindTracker(container, player) {
  grindInjectStyles();
  container.innerHTML = "";

  const cfg = grindLoadCfg();
  const targetXp = grindXpForLevel(cfg.targetLvl);
  const snaps = grindRecordSnapshot(player, cfg.skillId);
  const stats = grindCalcStats(snaps, targetXp);
  const lang = typeof currentLang !== "undefined" ? currentLang : "en";
  const skillName = typeof tSkill === "function" ? tSkill(cfg.skillId) : grindSkillName(cfg.skillId);
  const title = lang === "pt" ? `Grind de ${skillName}` : `${skillName} Grind Tracker`;
  const resetLabel = lang === "pt" ? "Resetar" : "Reset";

  const div = document.createElement("div");
  div.className = "grind-section";
  div.innerHTML = `
    <div class="grind-header">
      <div class="grind-title">${typeof skillIconImg === "function" ? skillIconImg(cfg.skillId, 20) : ""} ${title}</div>
      <button class="grind-reset" id="grind-reset">${resetLabel}</button>
    </div>
    ${grindSkillPicker(cfg, player)}
    ${grindRenderStats(stats, cfg)}
    ${grindRenderChart(snaps)}`;
  container.appendChild(div);

  try { grindBuildChart(snaps, stats, cfg); } catch (e) { console.error("Grind chart:", e); }

  // Skill picker change
  const skillSelect = document.getElementById("grind-skill-select");
  const targetSelect = document.getElementById("grind-target-select");
  if (skillSelect) {
    skillSelect.addEventListener("change", () => {
      const newId = Number(skillSelect.value);
      const curLvl = (player.skills[newId] || {}).level || 1;
      const newCfg = { skillId: newId, targetLvl: Math.max(curLvl + 1, cfg.targetLvl) };
      grindSaveCfg(newCfg);
      grindSaveSnapshots([]); // Clear snapshots on skill change
      renderGrindTracker(container, player);
    });
  }
  if (targetSelect) {
    targetSelect.addEventListener("change", () => {
      cfg.targetLvl = Number(targetSelect.value);
      grindSaveCfg(cfg);
      renderGrindTracker(container, player);
    });
  }

  // Reset button
  const btn = document.getElementById("grind-reset");
  if (btn) btn.addEventListener("click", () => { grindSaveSnapshots([]); renderGrindTracker(container, player); });
}
