/* =============================================
   RS3 Leaderboard — live.js
   Real-time XP ticker for one player at a time.
   Polling via the existing CORS proxy chain
   (liveFetch from script.js); cadence user-toggleable;
   per-player baseline persisted in localStorage; XP
   counter interpolated between polls so the screen
   feels live even at 30s cadence.
   ============================================= */

// ---- Module state ----
let _liveActive = false;            // is the live page currently mounted/visible?
let _livePlayerIdx = 0;             // 0 = Fio, 1 = Decxus
let _liveCadenceMs = 30000;         // default 30s
let _liveTimer = null;              // setTimeout handle
let _liveInflight = false;          // single-fetch guard
let _liveSamples = [];              // recent {at, totalXp, perSkillXp:{}, levels:{}, activities:[]}
const _LIVE_MAX_SAMPLES = 20;
const _LIVE_BASELINE_KEY = "rs3lb-live-baseline";

// Lerp interpolation handles
let _liveLerpRAF = 0;
let _liveLerpPrev = null;           // {at, totalXp, perSkillXp}
let _liveLerpRate = null;           // {totalXph, perSkillXph: {}}

// ---- Baseline persistence (per player, indefinite) ----
function liveLoadBaseline(name) {
  try {
    const raw = localStorage.getItem(_LIVE_BASELINE_KEY);
    if (!raw) return null;
    const all = JSON.parse(raw);
    return all[name] || null;
  } catch { return null; }
}
function liveSaveBaseline(name, snap) {
  try {
    const raw = localStorage.getItem(_LIVE_BASELINE_KEY);
    const all = raw ? JSON.parse(raw) : {};
    all[name] = snap;
    localStorage.setItem(_LIVE_BASELINE_KEY, JSON.stringify(all));
  } catch {}
}
function liveClearBaseline(name) {
  try {
    const raw = localStorage.getItem(_LIVE_BASELINE_KEY);
    if (!raw) return;
    const all = JSON.parse(raw);
    delete all[name];
    localStorage.setItem(_LIVE_BASELINE_KEY, JSON.stringify(all));
  } catch {}
}

// ---- Sample helpers ----
function _liveSnapshotFromPlayer(p) {
  const perSkillXp = {};
  const levels = {};
  for (const s of SKILLS) {
    const sk = p.skills[s.id] || { xp: 0, level: 1 };
    perSkillXp[s.id] = sk.xp || 0;
    levels[s.id] = sk.level || 1;
  }
  return {
    at: Date.now(),
    name: p.name,
    totalXp: p.totalXp || 0,
    totalLevel: p.totalLevel || 0,
    combatLevel: p.combatLevel || 0,
    questsDone: p.questsDone || 0,
    perSkillXp,
    levels,
    activities: (p.activities || []).slice(0, 8),
  };
}

function _liveDiffFromBaseline(snap, baseline) {
  if (!baseline) return null;
  const dXp = snap.totalXp - baseline.totalXp;
  const skillDeltas = [];
  for (const s of SKILLS) {
    const before = baseline.perSkillXp[s.id] || 0;
    const after = snap.perSkillXp[s.id] || 0;
    const dx = after - before;
    if (dx > 0) skillDeltas.push({ id: s.id, dx, lvlBefore: baseline.levels[s.id] || 1, lvlNow: snap.levels[s.id] || 1 });
  }
  skillDeltas.sort((a, b) => b.dx - a.dx);
  return { dXp, skillDeltas, sessionMs: snap.at - baseline.at };
}

// ---- XP/hr from the last two samples (window-based) ----
function _liveComputeRates() {
  if (_liveSamples.length < 2) return null;
  const a = _liveSamples[0];
  const b = _liveSamples[_liveSamples.length - 1];
  const ms = b.at - a.at;
  if (ms <= 0) return null;
  const hours = ms / 3600000;
  const totalXph = (b.totalXp - a.totalXp) / hours;
  const perSkillXph = {};
  for (const s of SKILLS) {
    perSkillXph[s.id] = ((b.perSkillXp[s.id] || 0) - (a.perSkillXp[s.id] || 0)) / hours;
  }
  return { totalXph, perSkillXph };
}

// ---- Poll once. Returns parsed player or null. ----
async function _liveFetchOnce(name) {
  if (_liveInflight) return null;
  _liveInflight = true;
  try {
    // Skip live API if currently rate-limited by a previous failure
    const profile = await liveFetch(API.profile(name));
    return parse(profile, null, null);
  } catch (e) {
    return null;
  } finally {
    _liveInflight = false;
  }
}

// ---- Schedule next poll ----
function _liveScheduleNext() {
  if (_liveTimer) clearTimeout(_liveTimer);
  if (!_liveActive || _liveCadenceMs === 0) return;
  if (typeof document !== "undefined" && document.hidden) return; // pause when hidden
  _liveTimer = setTimeout(_liveTick, _liveCadenceMs);
}

async function _liveTick() {
  if (!_liveActive) return;
  const name = PLAYERS[_livePlayerIdx];
  const player = await _liveFetchOnce(name);
  if (player) {
    const snap = _liveSnapshotFromPlayer(player);
    _liveSamples.push(snap);
    if (_liveSamples.length > _LIVE_MAX_SAMPLES) _liveSamples.shift();
    // Set baseline on first successful poll for this player if missing
    let baseline = liveLoadBaseline(name);
    if (!baseline) {
      baseline = snap;
      liveSaveBaseline(name, baseline);
    }
    _liveLerpPrev = snap;
    _liveLerpRate = _liveComputeRates();
    _liveRender(snap, baseline);
  }
  _liveScheduleNext();
}

// ---- Counter interpolation ----
// Between polls, gently extrapolate the displayed XP up using the last
// two samples' xp/hr. When a real poll lands, snap to truth.
function _liveLerpLoop() {
  cancelAnimationFrame(_liveLerpRAF);
  const tick = () => {
    if (!_liveActive) return;
    if (_liveLerpPrev && _liveLerpRate) {
      const elapsedMs = Date.now() - _liveLerpPrev.at;
      const elapsedH = elapsedMs / 3600000;
      const interpTotal = _liveLerpPrev.totalXp + Math.round(_liveLerpRate.totalXph * elapsedH);
      const totalEl = document.getElementById("live-total-xp");
      if (totalEl) totalEl.textContent = interpTotal.toLocaleString(currentLang === "pt" ? "pt-BR" : "en-US");
      const xphEl = document.getElementById("live-xp-rate");
      if (xphEl && _liveLerpRate.totalXph > 0) {
        xphEl.textContent = `${Math.round(_liveLerpRate.totalXph).toLocaleString(currentLang === "pt" ? "pt-BR" : "en-US")} XP/h`;
      }
    }
    _liveLerpRAF = requestAnimationFrame(tick);
  };
  _liveLerpRAF = requestAnimationFrame(tick);
}

// ---- Detect level-ups for confetti / toast ----
function _liveDetectLevelUps(snap) {
  if (_liveSamples.length < 2) return [];
  const prev = _liveSamples[_liveSamples.length - 2];
  const ups = [];
  for (const s of SKILLS) {
    const before = prev.levels[s.id] || 1;
    const after = snap.levels[s.id] || 1;
    if (after > before) ups.push({ id: s.id, before, after });
  }
  return ups;
}

function _liveBurstConfetti(skillId) {
  const host = document.getElementById("live-confetti-host");
  if (!host) return;
  const colors = ["#f0c75e", "#3dd68c", "#22d3bb", "#a78bfa", "#f0a030"];
  for (let i = 0; i < 24; i++) {
    const piece = document.createElement("span");
    piece.className = "live-confetti";
    piece.style.background = colors[i % colors.length];
    const dx = (Math.random() - 0.5) * 320;
    const dy = -120 - Math.random() * 200;
    const rot = Math.random() * 720 - 360;
    piece.style.setProperty("--dx", `${dx}px`);
    piece.style.setProperty("--dy", `${dy}px`);
    piece.style.setProperty("--rot", `${rot}deg`);
    piece.style.animationDelay = `${Math.random() * 100}ms`;
    host.appendChild(piece);
    setTimeout(() => piece.remove(), 1400);
  }
  if (typeof showToast === "function") {
    const sk = SKILLS.find(s => s.id === skillId);
    if (sk) {
      const skName = typeof tSkill === "function" ? tSkill(sk.id) : sk.id;
      const newLvl = (_liveSamples[_liveSamples.length - 1].levels[sk.id] || 0);
      showToast(`🎉 ${skName} ${newLvl}!`, "level");
    }
  }
}

// ---- Currently-training inference ----
function _liveActiveSkill() {
  if (!_liveLerpRate) return null;
  let best = null, bestRate = 0;
  for (const s of SKILLS) {
    const r = _liveLerpRate.perSkillXph[s.id] || 0;
    if (r > bestRate) { bestRate = r; best = s.id; }
  }
  return best;
}

// ---- Render ----
function _liveRender(snap, baseline) {
  const root = document.getElementById("live-content");
  if (!root) return;
  const lang = typeof currentLang !== "undefined" ? currentLang : "en";

  // Detect level-ups before re-rendering
  const ups = _liveDetectLevelUps(snap);

  const diff = _liveDiffFromBaseline(snap, baseline);
  const rates = _liveLerpRate;
  const activeSkillId = _liveActiveSkill();

  const sessionMs = diff ? diff.sessionMs : 0;
  const sessionH = sessionMs / 3600000;
  const sessionLabel = sessionH < 1
    ? `${Math.max(0, Math.floor(sessionMs / 60000))} min`
    : `${sessionH.toFixed(1)} h`;

  // Top-3 skill deltas
  const podium = (diff?.skillDeltas || []).slice(0, 3);

  const topDeltasHTML = podium.length
    ? podium.map((d, i) => {
        const skName = typeof tSkill === "function" ? tSkill(d.id) : d.id;
        const ico = typeof skillIconImg === "function" ? skillIconImg(d.id, 18) : "•";
        const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉";
        const dxFmt = d.dx >= 1e6 ? `${(d.dx / 1e6).toFixed(2)}M` : d.dx >= 1e3 ? `${(d.dx / 1e3).toFixed(1)}k` : d.dx;
        return `<div class="live-pod-row">
          <span class="live-pod-medal">${medal}</span>${ico}
          <span class="live-pod-name">${skName}</span>
          <span class="live-pod-dx">+${dxFmt}</span>
          <span class="live-pod-lv">${d.lvlBefore} → ${d.lvlNow}</span>
        </div>`;
      }).join("")
    : `<div class="live-empty">${lang === "pt" ? "Sem ganhos ainda — aguarde a primeira atualização" : "No gains yet — waiting for first update"}</div>`;

  // ETA to next level for active skill
  let etaHTML = "";
  if (activeSkillId !== null && rates) {
    const cur = (snap.levels[activeSkillId] || 1);
    const sk = SKILLS.find(s => s.id === activeSkillId);
    if (sk && cur < sk.max && typeof xpForLevel === "function") {
      const need = xpForLevel(cur + 1) - (snap.perSkillXp[activeSkillId] || 0);
      const xph = rates.perSkillXph[activeSkillId] || 0;
      const skName = typeof tSkill === "function" ? tSkill(activeSkillId) : activeSkillId;
      const ico = typeof skillIconImg === "function" ? skillIconImg(activeSkillId, 22) : "";
      let etaTxt = "—";
      if (xph > 0) {
        const minutes = Math.max(0, (need / xph) * 60);
        if (minutes < 1) etaTxt = lang === "pt" ? "<1 min" : "<1 min";
        else if (minutes < 60) etaTxt = `${Math.round(minutes)} min`;
        else etaTxt = `${(minutes / 60).toFixed(1)} h`;
      }
      etaHTML = `<div class="live-active-card">
        <div class="live-active-head">
          <span class="live-active-icon">${ico}</span>
          <div class="live-active-name">
            <div class="live-active-skill">${skName}</div>
            <div class="live-active-lvl">${lang === "pt" ? "Nível" : "Level"} ${cur} → ${cur + 1}</div>
          </div>
          <div class="live-active-eta"><span class="live-active-eta-label">${lang === "pt" ? "ETA" : "ETA"}</span><span class="live-active-eta-val">${etaTxt}</span></div>
        </div>
        <div class="live-active-bar"><div class="live-active-bar-fill" style="width:${Math.min(100, Math.round(((snap.perSkillXp[activeSkillId] - xpForLevel(cur)) / (xpForLevel(cur+1) - xpForLevel(cur))) * 100))}%"></div></div>
        <div class="live-active-rate">${Math.round(xph).toLocaleString(lang === "pt" ? "pt-BR" : "en-US")} XP/h · ${need.toLocaleString(lang === "pt" ? "pt-BR" : "en-US")} XP ${lang === "pt" ? "restante" : "left"}</div>
      </div>`;
    }
  }

  // Tips
  let tipsHTML = "";
  if (activeSkillId !== null && typeof buildTips === "function") {
    // Build a synthetic player object that buildTips can read.
    const synth = {
      name: snap.name,
      skills: SKILLS.reduce((o, s) => {
        o[s.id] = { level: snap.levels[s.id] || 1, xp: snap.perSkillXp[s.id] || 0 };
        return o;
      }, {}),
      questList: data[_livePlayerIdx]?.questList || [],
      questsDone: snap.questsDone,
      totalQuests: data[_livePlayerIdx]?.totalQuests || 0,
    };
    const tips = buildTips(synth, activeSkillId);
    if (tips.length) {
      tipsHTML = `<div class="live-tips">
        <div class="live-tips-head">${lang === "pt" ? "💡 Dicas para esta sessão" : "💡 Tips for this session"}</div>
        ${tips.map(t => `<div class="live-tip" ${t.goto ? `data-goto="${t.goto}" data-goal-id="${t.goalId || ""}"` : ""}>
          <span class="live-tip-icon">${t.icon}</span>
          <div class="live-tip-body">
            <div class="live-tip-title">${esc(t.title)}</div>
            <div class="live-tip-detail">${esc(t.detail)}</div>
            ${t.sub ? `<div class="live-tip-sub">${esc(t.sub)}</div>` : ""}
          </div>
        </div>`).join("")}
      </div>`;
    }
  }

  const players = PLAYERS;
  const playerTabs = players.map((n, i) =>
    `<button class="live-ptab ${i === _livePlayerIdx ? "active" : ""} ${i === 0 ? "p1" : "p2"}" data-live-player="${i}">${esc(n)}</button>`
  ).join("");

  const cadenceOpts = [
    { ms: 0,     label: lang === "pt" ? "Off" : "Off" },
    { ms: 15000, label: "15s" },
    { ms: 30000, label: "30s" },
    { ms: 60000, label: "60s" },
  ];
  const cadencePills = cadenceOpts.map(o =>
    `<button class="live-cad ${o.ms === _liveCadenceMs ? "active" : ""}" data-live-cadence="${o.ms}">${o.label}</button>`
  ).join("");

  const baselineDate = baseline ? new Date(baseline.at) : null;
  const baselineStr = baselineDate
    ? baselineDate.toLocaleString(lang === "pt" ? "pt-BR" : "en-US", { dateStyle: "short", timeStyle: "short" })
    : (lang === "pt" ? "ainda" : "yet");

  root.innerHTML = `
    <div class="live-confetti-host" id="live-confetti-host" aria-hidden="true"></div>
    <div class="live-toolbar">
      <div class="live-ptabs">${playerTabs}</div>
      <div class="live-cad-row">
        <span class="live-cad-label">${lang === "pt" ? "Atualizar" : "Refresh"}</span>
        ${cadencePills}
      </div>
    </div>

    <div class="live-hero">
      <div class="live-hero-row">
        <div class="live-name p${_livePlayerIdx + 1}">${esc(snap.name)}</div>
        <div class="live-hero-stats">
          <div class="live-mini"><span class="live-mini-val">${snap.totalLevel}</span><span class="live-mini-lbl">${lang === "pt" ? "Total" : "Total"}</span></div>
          <div class="live-mini"><span class="live-mini-val">${snap.combatLevel}</span><span class="live-mini-lbl">${lang === "pt" ? "Combate" : "Combat"}</span></div>
          <div class="live-mini"><span class="live-mini-val">${snap.questsDone}</span><span class="live-mini-lbl">${lang === "pt" ? "Missões" : "Quests"}</span></div>
        </div>
      </div>

      <div class="live-totalxp" id="live-total-xp">${snap.totalXp.toLocaleString(lang === "pt" ? "pt-BR" : "en-US")}</div>
      <div class="live-totalxp-lbl">${lang === "pt" ? "XP TOTAL" : "TOTAL XP"}</div>

      <div class="live-rate-row">
        <span id="live-xp-rate" class="live-xp-rate">${rates && rates.totalXph > 0 ? Math.round(rates.totalXph).toLocaleString(lang === "pt" ? "pt-BR" : "en-US") + " XP/h" : "—"}</span>
        <span class="live-session">${lang === "pt" ? "Sessão" : "Session"}: <strong>+${(diff?.dXp || 0).toLocaleString(lang === "pt" ? "pt-BR" : "en-US")}</strong> · ${sessionLabel}</span>
        <button class="live-reset" id="live-reset-btn" title="${lang === "pt" ? "Zerar baseline" : "Reset baseline"}">↺</button>
      </div>
      <div class="live-baseline-note">${lang === "pt" ? "Baseline" : "Baseline"}: ${esc(baselineStr)}</div>
    </div>

    ${etaHTML}

    <div class="live-podium">
      <div class="live-podium-head">${lang === "pt" ? "🏅 Top 3 da sessão" : "🏅 Top 3 this session"}</div>
      ${topDeltasHTML}
    </div>

    ${tipsHTML}
  `;

  if (typeof attachImgFallbacks === "function") attachImgFallbacks(root);

  // Wire events
  root.querySelectorAll("[data-live-player]").forEach(b => {
    b.addEventListener("click", () => {
      const idx = parseInt(b.dataset.livePlayer, 10);
      if (idx === _livePlayerIdx) return;
      _livePlayerIdx = idx;
      _liveSamples = [];
      _liveLerpPrev = null;
      _liveLerpRate = null;
      cancelAnimationFrame(_liveLerpRAF);
      _liveTick();
    });
  });
  root.querySelectorAll("[data-live-cadence]").forEach(b => {
    b.addEventListener("click", () => {
      _liveCadenceMs = parseInt(b.dataset.liveCadence, 10);
      if (_liveCadenceMs === 0) {
        if (_liveTimer) clearTimeout(_liveTimer);
      } else {
        _liveScheduleNext();
      }
      // Re-render to update active state
      const name = PLAYERS[_livePlayerIdx];
      const last = _liveSamples[_liveSamples.length - 1];
      if (last) _liveRender(last, liveLoadBaseline(name));
    });
  });
  const resetBtn = root.querySelector("#live-reset-btn");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      const name = PLAYERS[_livePlayerIdx];
      const last = _liveSamples[_liveSamples.length - 1];
      if (last) {
        // Stamp the baseline at click time so the UI shows "now" immediately,
        // not the last poll's timestamp.
        const fresh = { ...last, at: Date.now() };
        liveSaveBaseline(name, fresh);
        _liveRender(last, fresh);
      }
    });
  }
  root.querySelectorAll(".live-tip[data-goto]").forEach(el => {
    el.addEventListener("click", () => {
      const goto = el.dataset.goto;
      const goalId = el.dataset.goalId;
      if (goalId && typeof window !== "undefined") window._mgPendingHighlight = goalId;
      if (typeof _rendered !== "undefined" && goto === "goals") _rendered.delete("goals");
      if (typeof launchSection === "function") launchSection(goto);
    });
  });

  // Trigger confetti for any level-up that happened on this poll
  for (const u of ups) {
    setTimeout(() => _liveBurstConfetti(u.id), 50);
  }
}

// ---- Public entry: called by _renderers.live ----
function renderLive(players) {
  // Mount/refresh
  _liveActive = true;
  liveInjectStyles();
  // First paint from cached data (no fetch yet)
  const p = players[_livePlayerIdx];
  if (p) {
    const snap = _liveSnapshotFromPlayer(p);
    _liveSamples.push(snap);
    if (_liveSamples.length > _LIVE_MAX_SAMPLES) _liveSamples.shift();
    let baseline = liveLoadBaseline(p.name);
    if (!baseline) {
      baseline = snap;
      liveSaveBaseline(p.name, baseline);
    }
    _liveLerpPrev = snap;
    _liveLerpRate = _liveComputeRates();
    _liveRender(snap, baseline);
  }
  _liveScheduleNext();
  _liveLerpLoop();
}

function liveStop() {
  _liveActive = false;
  if (_liveTimer) clearTimeout(_liveTimer);
  cancelAnimationFrame(_liveLerpRAF);
}

// Pause when tab hidden
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (_liveTimer) clearTimeout(_liveTimer);
      cancelAnimationFrame(_liveLerpRAF);
    } else if (_liveActive) {
      _liveScheduleNext();
      _liveLerpLoop();
    }
  });
}

// ---- Styles ----
function liveInjectStyles() {
  if (document.getElementById("live-styles")) return;
  const s = document.createElement("style");
  s.id = "live-styles";
  s.textContent = `
.live-confetti-host { position: fixed; inset: 0; pointer-events: none; z-index: 250; overflow: hidden; }
.live-confetti { position: absolute; top: 50%; left: 50%; width: 8px; height: 14px; border-radius: 2px;
  animation: liveConf 1.2s cubic-bezier(.18,.7,.34,1) forwards; }
@keyframes liveConf {
  to { transform: translate(var(--dx), var(--dy)) rotate(var(--rot)); opacity: 0; }
}
.live-toolbar { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.live-ptabs { display: flex; gap: 6px; }
.live-ptab { appearance: none; background: var(--bg-card); border: 1px solid var(--border); color: var(--text-2); padding: 6px 16px; border-radius: 100px; font-family: var(--font); font-size: 0.78rem; font-weight: 600; cursor: pointer; min-height: 32px; }
.live-ptab.active.p1 { border-color: var(--gold-dim); background: var(--gold-bg); color: var(--gold); }
.live-ptab.active.p2 { border-color: var(--teal-dim); background: var(--teal-bg); color: var(--teal); }
.live-cad-row { display: flex; gap: 4px; align-items: center; }
.live-cad-label { font-size: 0.62rem; color: var(--text-3); text-transform: uppercase; letter-spacing: .8px; margin-right: 4px; }
.live-cad { appearance: none; background: var(--bg-card); border: 1px solid var(--border); color: var(--text-2); padding: 5px 10px; border-radius: 100px; font-family: var(--font-mono); font-size: 0.65rem; font-weight: 700; cursor: pointer; min-height: 32px; }
.live-cad.active { border-color: var(--gold-dim); background: var(--gold-bg); color: var(--gold-bright); }

.live-hero { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 18px 18px 14px; margin-bottom: 14px; text-align: center; position: relative; }
.live-hero-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.live-name { font-family: var(--font-display); font-size: 1.15rem; font-weight: 800; letter-spacing: .5px; }
.live-name.p1 { color: var(--gold-bright); }
.live-name.p2 { color: var(--teal-bright); }
.live-hero-stats { display: flex; gap: 12px; }
.live-mini { display: flex; flex-direction: column; align-items: flex-end; }
.live-mini-val { font-family: var(--font-mono); font-size: 1rem; font-weight: 800; color: var(--text); }
.live-mini-lbl { font-size: 0.55rem; color: var(--text-3); text-transform: uppercase; letter-spacing: .8px; }
.live-totalxp { font-family: var(--font-mono); font-size: 2.6rem; font-weight: 800; color: var(--gold-bright); letter-spacing: -1px; line-height: 1; margin: 4px 0 2px; }
.live-totalxp-lbl { font-size: 0.6rem; color: var(--text-3); text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 12px; }
.live-rate-row { display: flex; align-items: center; justify-content: center; gap: 10px; flex-wrap: wrap; font-size: 0.72rem; }
.live-xp-rate { font-family: var(--font-mono); font-weight: 800; color: var(--green); }
.live-session { color: var(--text-2); }
.live-session strong { color: var(--gold-bright); font-family: var(--font-mono); }
.live-reset { appearance: none; background: var(--bg-raised); border: 1px solid var(--border); color: var(--text-2); width: 28px; height: 28px; border-radius: 50%; cursor: pointer; font-size: 0.85rem; }
.live-reset:hover { border-color: var(--gold-dim); color: var(--gold); }
.live-baseline-note { font-size: 0.58rem; color: var(--text-3); margin-top: 6px; }

.live-active-card { background: var(--bg-card); border: 1px solid var(--border); border-left: 3px solid var(--green); border-radius: var(--radius); padding: 12px 16px; margin-bottom: 14px; }
.live-active-head { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
.live-active-icon { display: flex; }
.live-active-name { flex: 1; }
.live-active-skill { font-family: var(--font-display); font-size: 0.85rem; font-weight: 700; color: var(--text); }
.live-active-lvl { font-size: 0.62rem; color: var(--text-3); margin-top: 2px; }
.live-active-eta { display: flex; flex-direction: column; align-items: flex-end; }
.live-active-eta-label { font-size: 0.55rem; color: var(--text-3); text-transform: uppercase; letter-spacing: .8px; }
.live-active-eta-val { font-family: var(--font-mono); font-size: 1rem; font-weight: 800; color: var(--green); }
.live-active-bar { height: 6px; background: var(--bg-raised); border-radius: 3px; overflow: hidden; margin-bottom: 8px; }
.live-active-bar-fill { height: 100%; background: linear-gradient(90deg, var(--green), var(--teal)); transition: width .6s; }
.live-active-rate { font-family: var(--font-mono); font-size: 0.66rem; color: var(--text-2); text-align: right; }

.live-podium { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 12px 16px; margin-bottom: 14px; }
.live-podium-head { font-family: var(--font-display); font-size: 0.78rem; font-weight: 700; color: var(--gold); margin-bottom: 8px; }
.live-pod-row { display: grid; grid-template-columns: 22px 22px 1fr auto auto; align-items: center; gap: 8px; padding: 5px 0; font-size: 0.74rem; border-bottom: 1px solid var(--border-subtle); }
.live-pod-row:last-child { border-bottom: 0; }
.live-pod-medal { font-size: 0.9rem; }
.live-pod-name { font-weight: 600; color: var(--text); }
.live-pod-dx { font-family: var(--font-mono); font-weight: 800; color: var(--gold-bright); }
.live-pod-lv { font-family: var(--font-mono); font-size: 0.62rem; color: var(--text-3); }
.live-empty { font-size: 0.72rem; color: var(--text-3); text-align: center; padding: 12px; }

.live-tips { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 12px 16px; margin-bottom: 14px; }
.live-tips-head { font-family: var(--font-display); font-size: 0.78rem; font-weight: 700; color: var(--gold); margin-bottom: 10px; }
.live-tip { display: flex; align-items: flex-start; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--border-subtle); cursor: default; }
.live-tip[data-goto] { cursor: pointer; }
.live-tip[data-goto]:hover { background: var(--bg-raised); border-radius: var(--radius-sm); }
.live-tip:last-child { border-bottom: 0; }
.live-tip-icon { font-size: 1rem; flex-shrink: 0; padding-top: 2px; }
.live-tip-body { flex: 1; min-width: 0; }
.live-tip-title { font-weight: 700; color: var(--text); font-size: 0.78rem; }
.live-tip-detail { font-family: var(--font-mono); font-size: 0.66rem; color: var(--gold); margin-top: 1px; }
.live-tip-sub { font-size: 0.62rem; color: var(--text-3); margin-top: 2px; }

/* Dock live pulse */
.dock-btn-live { position: relative; }
.dock-live-pulse { position: absolute; top: 6px; right: 6px; width: 8px; height: 8px; border-radius: 50%; background: var(--red); box-shadow: 0 0 0 0 rgba(248,113,113,0.7); animation: livePulse 1.6s infinite; pointer-events: none; }
@keyframes livePulse {
  0% { box-shadow: 0 0 0 0 rgba(248,113,113,0.7); }
  70% { box-shadow: 0 0 0 8px rgba(248,113,113,0); }
  100% { box-shadow: 0 0 0 0 rgba(248,113,113,0); }
}

@media (max-width: 640px) {
  .live-totalxp { font-size: 2rem; }
  .live-pod-row { grid-template-columns: 18px 20px 1fr auto; }
  .live-pod-lv { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  .live-confetti, .dock-live-pulse { animation: none !important; }
}
`;
  document.head.appendChild(s);
}
