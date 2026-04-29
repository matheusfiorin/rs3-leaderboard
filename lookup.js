/**
 * lookup.js — Live RSN Observatory
 *
 * Production-grade live monitoring console for any RuneScape 3 player.
 * Renders rich, real-time data with BR timezone formatting, auto-refresh,
 * combat-style breakdown, and a striking teal/obsidian aesthetic distinct
 * from the dashboard's gold theme (so the user knows they're observing
 * an external account, not their own).
 *
 * Depends on script.js globals: SKILLS, t, tSkill, fmt, fmtShort, parse,
 *   xpToNextLevel, esc, $, $$, currentLang, classifyActivity, localizeActivity,
 *   ACT_ICONS, fmtTime, skillIconImg
 */

/* ── Constants ─────────────────────────────────────────────────────── */
const LK_HISTORY_KEY = "rs3lb-lookup-history";
const LK_MAX_HISTORY = 6;
const LK_AUTO_REFRESH_MS = 60_000;          // 60s auto-refresh while on page
const LK_FRESH_MS = 2 * 60_000;              // <2min = "live" green
const LK_STALE_MS = 5 * 60_000;              // >5min = "stale" red

/* ── BR timezone helpers ──────────────────────────────────────────── */
const BR_TZ = "America/Sao_Paulo";

function fmtBRTime(date) {
  if (!(date instanceof Date)) date = new Date(date);
  if (isNaN(date)) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: BR_TZ,
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  }).format(date);
}

function fmtBRDateTime(date) {
  if (!(date instanceof Date)) date = new Date(date);
  if (isNaN(date)) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: BR_TZ,
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  }).format(date);
}

function fmtRelative(date) {
  if (!(date instanceof Date)) date = new Date(date);
  if (isNaN(date)) return "—";
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  const lang = typeof currentLang !== "undefined" ? currentLang : "en";
  if (diff < 5)   return lang === "pt" ? "agora"        : "now";
  if (diff < 60)  return (lang === "pt" ? "há "         : "")  + diff + (lang === "pt" ? "s"     : "s ago");
  if (diff < 3600) {
    const m = Math.floor(diff/60);
    return (lang === "pt" ? "há "  : "") + m + (lang === "pt" ? " min"  : "m ago");
  }
  if (diff < 86400) {
    const h = Math.floor(diff/3600);
    return (lang === "pt" ? "há "  : "") + h + (lang === "pt" ? "h"     : "h ago");
  }
  const d = Math.floor(diff/86400);
  return (lang === "pt" ? "há "  : "") + d + (lang === "pt" ? "d"     : "d ago");
}

/* Parse RuneMetrics activity timestamp ("28-Apr-2026 04:06") to Date */
function parseRMDate(s) {
  if (!s) return null;
  // Format: "DD-Mon-YYYY HH:MM"
  const m = s.match(/^(\d{1,2})-(\w{3})-(\d{4})\s+(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const months = { Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11 };
  const mo = months[m[2]];
  if (mo == null) return null;
  // Activity timestamps are in UTC per RuneMetrics; treat as UTC
  return new Date(Date.UTC(+m[3], mo, +m[1], +m[4], +m[5]));
}

/* ── History ──────────────────────────────────────────────────────── */
function lkGetHistory() {
  try { return JSON.parse(localStorage.getItem(LK_HISTORY_KEY)) || []; }
  catch { return []; }
}
function lkSaveToHistory(rsn) {
  let hist = lkGetHistory().filter(h => h.toLowerCase() !== rsn.toLowerCase());
  hist.unshift(rsn);
  if (hist.length > LK_MAX_HISTORY) hist = hist.slice(0, LK_MAX_HISTORY);
  localStorage.setItem(LK_HISTORY_KEY, JSON.stringify(hist));
}

/* ── Live state ──────────────────────────────────────────────────── */
let _lkCurrentRSN = null;
let _lkLastFetchTime = null;
let _lkAutoRefreshTimer = null;
let _lkCountdownTimer = null;
let _lkCountdownSeconds = LK_AUTO_REFRESH_MS / 1000;
let _lkAutoRefreshEnabled = false;

/* ── CORS proxy ──────────────────────────────────────────────────── */
const LK_PROXIES = [
  async (url, ms) => {
    const r = await lkFetchTimed(`https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(url)}`, ms);
    if (!r.ok) throw new Error("codetabs_fail");
    return r.json();
  },
  async (url, ms) => {
    const r = await lkFetchTimed(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`, ms);
    if (!r.ok) throw new Error("allorigins_fail");
    const w = await r.json();
    if (!w.contents) throw new Error("allorigins_empty");
    return JSON.parse(w.contents);
  },
];

function lkFetchTimed(url, ms) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms || 8000);
  return fetch(url, { signal: ctrl.signal })
    .then(r => { clearTimeout(timer); return r; })
    .catch(e => { clearTimeout(timer); throw e; });
}

function lkRaceProxies(url) {
  return new Promise((resolve, reject) => {
    let pending = LK_PROXIES.length, done = false;
    for (const fn of LK_PROXIES) {
      fn(url, 8000).then(v => {
        if (!done) { done = true; resolve(v); }
      }, () => {
        pending--;
        if (pending === 0 && !done) reject(new Error("all_proxies_failed"));
      });
    }
  });
}

async function lkFetchPlayer(rsn) {
  const enc = encodeURIComponent(rsn);
  const profileUrl = `https://apps.runescape.com/runemetrics/profile/profile?user=${enc}&activities=20`;
  const questsUrl  = `https://apps.runescape.com/runemetrics/quests?user=${enc}`;
  const hiscoresUrl = `https://secure.runescape.com/m=hiscore/index_lite.json?player=${enc}`;

  const [profileR, questsR, hiscoresR] = await Promise.allSettled([
    lkRaceProxies(profileUrl),
    lkRaceProxies(questsUrl),
    lkRaceProxies(hiscoresUrl),
  ]);

  if (profileR.status === "rejected") throw new Error("fetch_fail");
  const profile = profileR.value;
  if (profile.error) throw new Error(profile.error);

  const quests   = questsR.status === "fulfilled" ? questsR.value : null;
  const hiscores = hiscoresR.status === "fulfilled" ? hiscoresR.value : null;

  return parse(profile, hiscores, quests);
}

/* ── Page entry ──────────────────────────────────────────────────── */
function renderLookupPage() {
  const root = $("#lookup-content");
  if (!root) return;
  if (root.querySelector("#lk-input")) return; // already rendered

  lkInjectStyles();

  const lang = typeof currentLang !== "undefined" ? currentLang : "en";
  const placeholder = lang === "pt" ? "Digite um RSN para observar…" : "Enter an RSN to observe…";
  const hint = lang === "pt"
    ? "Dados ao vivo via RuneMetrics. Atualização automática a cada 60s."
    : "Live data via RuneMetrics. Auto-refresh every 60 s.";

  // Generate session/station identifier (palantir-style serial)
  const stationId = "STN-" + (Math.random().toString(36).substring(2, 6).toUpperCase());
  const sessionTime = fmtBRTime(new Date());

  root.innerHTML = `
    <div class="lk-station-bar">
      <div class="lk-station-ident">
        <span class="lk-station-icon">⌬</span>
        <span class="lk-station-id">${stationId}</span>
        <span class="lk-station-sep">/</span>
        <span class="lk-station-label">${lang === "pt" ? "OBSERVATÓRIO RSN" : "RSN OBSERVATORY"}</span>
      </div>
      <div class="lk-station-meta">
        <span class="lk-station-meta-item"><span class="lk-station-meta-k">UTC-3</span><span class="lk-station-meta-v" id="lk-station-clock">${sessionTime}</span></span>
        <span class="lk-station-status"><span class="lk-station-status-dot"></span>NOMINAL</span>
      </div>
    </div>
    <div class="lk-search-wrap">
      <div class="lk-search-frame">
        <span class="lk-search-corner lk-corner-tl"></span>
        <span class="lk-search-corner lk-corner-tr"></span>
        <span class="lk-search-corner lk-corner-bl"></span>
        <span class="lk-search-corner lk-corner-br"></span>
        <div class="lk-search-prefix">
          <span class="lk-search-reticle">⌖</span>
          <span class="lk-search-prompt">${lang === "pt" ? "TARGET" : "TARGET"}</span>
        </div>
        <input id="lk-input" type="text" class="lk-input"
               placeholder="${esc(placeholder)}"
               autocomplete="off" spellcheck="false" autocapitalize="off">
        <button id="lk-btn" class="lk-btn">
          <span class="lk-btn-label">${lang === "pt" ? "SCAN" : "SCAN"}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
          </svg>
        </button>
      </div>
      <div class="lk-search-hint">
        <span class="lk-hint-bullet">▸</span>
        <span>${esc(hint)}</span>
      </div>
      <div id="lk-history" class="lk-history"></div>
    </div>
    <div id="lk-status"></div>
    <div id="lk-results"></div>`;

  // Tick the station clock once per second
  if (window.__lkStationClockTimer) clearInterval(window.__lkStationClockTimer);
  window.__lkStationClockTimer = setInterval(() => {
    const el = document.getElementById("lk-station-clock");
    if (el) el.textContent = fmtBRTime(new Date());
  }, 1000);

  const input = $("#lk-input");
  const btn = $("#lk-btn");
  const trigger = () => {
    const v = (input.value || "").trim();
    if (v) doLookup(v);
  };
  btn.addEventListener("click", trigger);
  input.addEventListener("keydown", e => { if (e.key === "Enter") trigger(); });

  lkRenderHistory();
}

/* ── History pills ───────────────────────────────────────────────── */
function lkRenderHistory() {
  const wrap = $("#lk-history");
  if (!wrap) return;
  const hist = lkGetHistory();
  if (!hist.length) { wrap.innerHTML = ""; return; }
  const lang = typeof currentLang !== "undefined" ? currentLang : "en";
  const label = lang === "pt" ? "Recentes:" : "Recent:";
  wrap.innerHTML =
    `<span class="lk-hist-label">${esc(label)}</span>` +
    hist.map(h =>
      `<button class="lk-hist-pill" data-rsn="${esc(h)}" type="button">${esc(h)}</button>`
    ).join("");
  wrap.querySelectorAll(".lk-hist-pill").forEach(btn => {
    btn.addEventListener("click", () => {
      $("#lk-input").value = btn.dataset.rsn;
      doLookup(btn.dataset.rsn);
    });
  });
}

/* ── Main lookup flow ────────────────────────────────────────────── */
async function doLookup(rsn, opts) {
  opts = opts || {};
  const status = $("#lk-status");
  const results = $("#lk-results");
  const isRefresh = opts.silent === true;

  if (!isRefresh) {
    results.innerHTML = "";
    const lang = typeof currentLang !== "undefined" ? currentLang : "en";
    status.innerHTML = `<div class="lk-spinner">
      <div class="lk-spinner-ring"></div>
      <span>${esc(lang === "pt" ? "Conectando ao RuneMetrics…" : "Connecting to RuneMetrics…")}</span>
    </div>`;
  }

  try {
    const player = await lkFetchPlayer(rsn);
    if (!player || !player.name) throw new Error("no_data");

    _lkCurrentRSN = player.name;
    _lkLastFetchTime = Date.now();

    if (!isRefresh) {
      lkSaveToHistory(player.name);
      lkRenderHistory();
    }
    status.innerHTML = "";

    results.innerHTML = lkRenderConsole(player);
    lkAttachConsoleHandlers(player);
    lkStartAutoRefresh();
  } catch (err) {
    console.error("Lookup failed:", err);
    if (!isRefresh) {
      const lang = typeof currentLang !== "undefined" ? currentLang : "en";
      const reason = err.message === "NOT_A_MEMBER" || err.message === "PROFILE_PRIVATE"
        ? (lang === "pt" ? "Perfil privado ou inválido" : "Profile private or invalid")
        : (lang === "pt" ? "Falha ao buscar dados" : "Failed to fetch data");
      status.innerHTML = `<div class="lk-error">
        <span class="lk-error-mark">!</span>
        <span class="lk-error-text">${esc(reason)} <span class="lk-error-detail">(${esc(err.message)})</span></span>
      </div>`;
    }
  }
}

/* ── Auto-refresh ────────────────────────────────────────────────── */
function lkStartAutoRefresh() {
  lkStopAutoRefresh();
  if (!_lkCurrentRSN) return;
  _lkCountdownSeconds = LK_AUTO_REFRESH_MS / 1000;
  lkUpdateCountdownLabel();
  _lkCountdownTimer = setInterval(() => {
    _lkCountdownSeconds = Math.max(0, _lkCountdownSeconds - 1);
    lkUpdateCountdownLabel();
    lkUpdateRelativeTimes();
  }, 1000);
  _lkAutoRefreshTimer = setInterval(() => {
    if (_lkAutoRefreshEnabled && _lkCurrentRSN) {
      doLookup(_lkCurrentRSN, { silent: true });
    } else {
      _lkCountdownSeconds = LK_AUTO_REFRESH_MS / 1000;
    }
  }, LK_AUTO_REFRESH_MS);
}

function lkStopAutoRefresh() {
  if (_lkAutoRefreshTimer) clearInterval(_lkAutoRefreshTimer);
  if (_lkCountdownTimer) clearInterval(_lkCountdownTimer);
  _lkAutoRefreshTimer = null;
  _lkCountdownTimer = null;
}

function lkUpdateCountdownLabel() {
  const el = document.getElementById("lk-countdown");
  if (!el) return;
  const lang = typeof currentLang !== "undefined" ? currentLang : "en";
  if (_lkAutoRefreshEnabled) {
    el.textContent = (lang === "pt" ? `Próxima sync em ${_lkCountdownSeconds}s` : `Next sync in ${_lkCountdownSeconds}s`);
  } else {
    el.textContent = lang === "pt" ? "Auto-sync desligado" : "Auto-sync off";
  }
}

function lkUpdateRelativeTimes() {
  // Update "X min ago" labels in activity feed and the live indicator
  document.querySelectorAll("[data-lk-rel]").forEach(el => {
    const ts = +el.dataset.lkRel;
    if (!ts) return;
    el.textContent = fmtRelative(ts);
  });
  // Update freshness dot
  const dot = document.getElementById("lk-live-dot");
  if (dot && _lkLastFetchTime) {
    const age = Date.now() - _lkLastFetchTime;
    dot.classList.remove("lk-fresh", "lk-warm", "lk-stale");
    if (age < LK_FRESH_MS) dot.classList.add("lk-fresh");
    else if (age < LK_STALE_MS) dot.classList.add("lk-warm");
    else dot.classList.add("lk-stale");
  }
  // Update synced label
  const syncEl = document.getElementById("lk-synced-rel");
  if (syncEl && _lkLastFetchTime) syncEl.textContent = fmtRelative(_lkLastFetchTime);
  const syncBR = document.getElementById("lk-synced-br");
  if (syncBR && _lkLastFetchTime) syncBR.textContent = fmtBRTime(_lkLastFetchTime) + " BRT";
}

/* ── Build the console ───────────────────────────────────────────── */
function lkRenderConsole(p) {
  const lang = typeof currentLang !== "undefined" ? currentLang : "en";
  return `
    <div class="lk-console">
      ${lkPanelIdentity(p, lang)}
      ${lkPanelVitals(p, lang)}
      ${lkPanelCombatPower(p, lang)}
      ${lkPanelStandouts(p, lang)}
      <div class="lk-grid-2col">
        ${lkPanelSkills(p, lang)}
        ${lkPanelActivity(p, lang)}
      </div>
      ${lkPanelQuests(p, lang)}
      ${lkPanelClues(p, lang)}
      ${lkPanelFooter(p, lang)}
    </div>`;
}

/* ── Panel: Identity (banner) — Palantir HUD style ──────────────── */
function lkPanelIdentity(p, lang) {
  const lastActivity = (p.activities && p.activities[0]) ? parseRMDate(p.activities[0].date) : null;
  const onlineHint = lastActivity && (Date.now() - lastActivity.getTime() < 30 * 60 * 1000);
  const targetId = "T-" + (p.name.length * 7 + (p.combatLevel || 0)).toString(16).toUpperCase().padStart(4, "0");
  const onlineLabel = onlineHint ? (lang === "pt" ? "ATIVO" : "ACTIVE") : (lang === "pt" ? "INATIVO" : "DORMANT");

  return `
    <header class="lk-banner">
      <span class="lk-banner-corner lk-corner-tl"></span>
      <span class="lk-banner-corner lk-corner-tr"></span>
      <span class="lk-banner-corner lk-corner-bl"></span>
      <span class="lk-banner-corner lk-corner-br"></span>
      <div class="lk-banner-grain"></div>
      <div class="lk-banner-grid"></div>

      <div class="lk-banner-top">
        <div class="lk-live-tag">
          <span class="lk-live-dot lk-fresh" id="lk-live-dot"></span>
          <span class="lk-live-label">${lang === "pt" ? "FEED · RUNEMETRICS" : "FEED · RUNEMETRICS"}</span>
          <span class="lk-live-sep">|</span>
          <span class="lk-live-id">${targetId}</span>
        </div>
        <div class="lk-banner-controls">
          <button class="lk-toggle" id="lk-toggle-auto" title="${esc(lang === "pt" ? "Auto-sync 60s" : "Auto-sync 60s")}" type="button">
            <span class="lk-toggle-dot"></span>
            <span id="lk-countdown">${lang === "pt" ? "AUTO-SYNC OFF" : "AUTO-SYNC OFF"}</span>
          </button>
          <button class="lk-icon-btn" id="lk-refresh" title="${esc(lang === "pt" ? "Atualizar" : "Refresh")}" type="button">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
          </button>
          <button class="lk-icon-btn" id="lk-back" title="${esc(lang === "pt" ? "Nova busca" : "New search")}" type="button">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
            </svg>
          </button>
        </div>
      </div>

      <div class="lk-banner-body">
        <div class="lk-banner-callsign">
          <span class="lk-callsign-prefix">${lang === "pt" ? "DESIGNAÇÃO" : "DESIGNATION"}</span>
          <span class="lk-callsign-line"></span>
        </div>
        <div class="lk-banner-name-row">
          <h1 class="lk-banner-name">${esc(p.name)}</h1>
          <span class="lk-status-pip lk-status-${onlineHint ? "active" : "dormant"}">
            <span class="lk-status-pip-dot"></span>
            <span>${onlineLabel}</span>
          </span>
        </div>

        <div class="lk-banner-grid-meta">
          <div class="lk-meta-cell">
            <div class="lk-meta-cell-k">CB · LVL</div>
            <div class="lk-meta-cell-v">${p.combatLevel || "—"}</div>
          </div>
          <div class="lk-meta-cell">
            <div class="lk-meta-cell-k">TOTAL · LVL</div>
            <div class="lk-meta-cell-v">${fmt(p.totalLevel || 0)}</div>
          </div>
          <div class="lk-meta-cell">
            <div class="lk-meta-cell-k">${lang === "pt" ? "RANK · GLOBAL" : "RANK · GLOBAL"}</div>
            <div class="lk-meta-cell-v">#${esc(String(p.rank || "—"))}</div>
          </div>
          <div class="lk-meta-cell">
            <div class="lk-meta-cell-k">${lang === "pt" ? "QP" : "QP"}</div>
            <div class="lk-meta-cell-v">${fmt(p.questPoints || 0)}</div>
          </div>
        </div>
      </div>
    </header>`;
}

/* ── Panel: Vitals strip (6 big stats) ───────────────────────────── */
function lkPanelVitals(p, lang) {
  const totalClues = p.clues ? Object.values(p.clues).reduce((a, b) => a + b, 0) : 0;
  const cells = [
    { k: lang === "pt" ? "XP Total" : "Total XP",      v: fmtShort(p.totalXp || 0),                accent: "gold" },
    { k: lang === "pt" ? "Combate" : "Combat",          v: p.combatLevel || "—",                    accent: "red"  },
    { k: lang === "pt" ? "Missões" : "Quests",          v: `${p.questsDone || 0}/${p.totalQuests || 0}`, accent: "teal" },
    { k: lang === "pt" ? "Pts Missão" : "Quest Pts",    v: fmt(p.questPoints || 0),                 accent: "purple" },
    { k: "RuneScore",                                    v: fmt(p.runeScore || 0),                   accent: "gold" },
    { k: lang === "pt" ? "Pergaminhos" : "Clues",       v: fmt(totalClues),                         accent: "teal" },
  ];
  return `
    <div class="lk-vitals">
      ${cells.map(c => `
        <div class="lk-vital lk-vital-${c.accent}">
          <div class="lk-vital-v">${esc(String(c.v))}</div>
          <div class="lk-vital-k">${esc(c.k)}</div>
        </div>`).join("")}
    </div>`;
}

/* ── Panel: Combat Power breakdown ────────────────────────────────── */
function lkPanelCombatPower(p, lang) {
  // Compute combat XP per discipline
  // Skills: 0=Atk 1=Def 2=Str 3=Con 4=Ranged 5=Prayer 6=Magic 28=Necromancy
  const get = id => (p.skills[id] || {}).xp || 0;
  const meleeXp  = get(0) + get(2);              // Attack + Strength
  const magicXp  = get(6);
  const rangedXp = get(4);
  const necroXp  = get(28);
  const total = meleeXp + magicXp + rangedXp + necroXp;
  if (total === 0) return "";

  const styles = [
    { name: lang === "pt" ? "Corpo a Corpo" : "Melee",       xp: meleeXp,  cls: "melee" },
    { name: "Magic",                                          xp: magicXp,  cls: "magic" },
    { name: lang === "pt" ? "Distância" : "Ranged",          xp: rangedXp, cls: "ranged" },
    { name: "Necromancy",                                     xp: necroXp,  cls: "necro" },
  ].sort((a, b) => b.xp - a.xp);

  const dominant = styles[0];

  return `
    <section class="lk-panel lk-combat-panel">
      <header class="lk-panel-head">
        <h3 class="lk-panel-title">${lang === "pt" ? "Distribuição de Combate" : "Combat Distribution"}</h3>
        <span class="lk-panel-tag lk-cstyle-${dominant.cls}">${esc(dominant.name)}</span>
      </header>
      <div class="lk-cbars">
        ${styles.map(s => {
          const pct = total > 0 ? (s.xp / total) * 100 : 0;
          return `<div class="lk-cbar">
            <div class="lk-cbar-meta">
              <span class="lk-cbar-label">${esc(s.name)}</span>
              <span class="lk-cbar-xp">${fmtShort(s.xp)}</span>
              <span class="lk-cbar-pct">${pct.toFixed(1)}%</span>
            </div>
            <div class="lk-cbar-track">
              <div class="lk-cbar-fill lk-cbar-${s.cls}" style="width:${pct.toFixed(2)}%"></div>
            </div>
          </div>`;
        }).join("")}
      </div>
    </section>`;
}

/* ── Panel: Standouts (top 3 + lowest 3) ─────────────────────────── */
function lkPanelStandouts(p, lang) {
  const all = SKILLS
    .map(sk => ({ sk, level: (p.skills[sk.id] || {}).level || 1, xp: (p.skills[sk.id] || {}).xp || 0 }))
    .sort((a, b) => b.xp - a.xp);
  const top3 = all.slice(0, 3);
  const low3 = [...all].sort((a, b) => a.xp - b.xp).slice(0, 3);

  const cell = (entry, kind) => `
    <div class="lk-standout-cell lk-${kind}">
      <span class="lk-standout-icon">${typeof skillIconImg === "function" ? skillIconImg(entry.sk.id, 20) : ""}</span>
      <span class="lk-standout-name">${tSkill(entry.sk.id)}</span>
      <span class="lk-standout-level">${entry.level}</span>
    </div>`;

  return `
    <section class="lk-panel lk-standouts">
      <header class="lk-panel-head">
        <h3 class="lk-panel-title">${lang === "pt" ? "Destaques" : "Standouts"}</h3>
      </header>
      <div class="lk-standout-row">
        <div class="lk-standout-col">
          <div class="lk-standout-col-title">${lang === "pt" ? "Mais fortes" : "Strongest"}</div>
          ${top3.map(e => cell(e, "high")).join("")}
        </div>
        <div class="lk-standout-col">
          <div class="lk-standout-col-title">${lang === "pt" ? "Mais fracas" : "Weakest"}</div>
          ${low3.map(e => cell(e, "low")).join("")}
        </div>
      </div>
    </section>`;
}

/* ── Panel: Skills matrix ────────────────────────────────────────── */
function lkPanelSkills(p, lang) {
  const rows = SKILLS.map(sk => {
    const s = p.skills[sk.id] || { level: 1, xp: 0 };
    const prog = xpToNextLevel(s.xp, s.level, sk.max);
    const isMaxed = s.level >= sk.max;
    return `
      <div class="lk-skill-row" data-cat="${sk.cat}">
        <div class="lk-skill-icon">${typeof skillIconImg === "function" ? skillIconImg(sk.id, 18) : ""}</div>
        <div class="lk-skill-name">${tSkill(sk.id)}</div>
        <div class="lk-skill-level ${isMaxed ? "lk-maxed" : ""}">${s.level}</div>
        <div class="lk-skill-xp">${fmtShort(s.xp)}</div>
        <div class="lk-skill-bar">
          <div class="lk-skill-bar-fill" style="width:${prog.pct}%"></div>
        </div>
      </div>`;
  }).join("");

  return `
    <section class="lk-panel lk-skills-panel">
      <header class="lk-panel-head">
        <h3 class="lk-panel-title">${lang === "pt" ? "Habilidades" : "Skills"}</h3>
        <span class="lk-panel-sub">${SKILLS.length} ${lang === "pt" ? "habilidades" : "skills"}</span>
      </header>
      <div class="lk-skill-list">${rows}</div>
    </section>`;
}

/* ── Panel: Activity timeline (BR timezone) ──────────────────────── */
function lkPanelActivity(p, lang) {
  const acts = (p.activities || []).slice(0, 20);
  if (!acts.length) {
    return `
      <section class="lk-panel lk-activity-panel">
        <header class="lk-panel-head">
          <h3 class="lk-panel-title">${lang === "pt" ? "Atividade" : "Activity"}</h3>
        </header>
        <div class="lk-empty">${lang === "pt" ? "Nenhuma atividade pública" : "No public activity"}</div>
      </section>`;
  }

  const items = acts.map(a => {
    const type = typeof classifyActivity === "function" ? classifyActivity(a.text) : "other";
    const icon = (typeof ACT_ICONS !== "undefined" && ACT_ICONS[type]) || "·";
    const date = parseRMDate(a.date);
    const ts = date ? date.getTime() : 0;
    const brTime = date ? fmtBRTime(date) + " BRT" : esc(a.date);
    const rel = date ? fmtRelative(date) : "—";
    return `
      <li class="lk-act-item lk-act-${type}">
        <div class="lk-act-icon">${icon}</div>
        <div class="lk-act-body">
          <div class="lk-act-text">${esc(typeof localizeActivity === "function" ? localizeActivity(a.text) : a.text)}</div>
          ${a.details ? `<div class="lk-act-detail">${esc(typeof localizeActivity === "function" ? localizeActivity(a.details) : a.details)}</div>` : ""}
        </div>
        <div class="lk-act-time">
          <div class="lk-act-rel" data-lk-rel="${ts}">${esc(rel)}</div>
          <div class="lk-act-abs">${esc(brTime)}</div>
        </div>
      </li>`;
  }).join("");

  return `
    <section class="lk-panel lk-activity-panel">
      <header class="lk-panel-head">
        <h3 class="lk-panel-title">${lang === "pt" ? "Linha do Tempo" : "Timeline"}</h3>
        <span class="lk-panel-sub">${acts.length} ${lang === "pt" ? "eventos" : "events"} · BRT</span>
      </header>
      <ul class="lk-act-list">${items}</ul>
    </section>`;
}

/* ── Panel: Quests ───────────────────────────────────────────────── */
function lkPanelQuests(p, lang) {
  const done = p.questsDone || 0;
  const started = p.questsStarted || 0;
  const none = p.questsNone || 0;
  const total = p.totalQuests || (done + started + none);
  const pct = total ? Math.round((done / total) * 100) : 0;

  // SVG ring
  const size = 84, stroke = 7, r = (size - stroke) / 2, circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(pct, 100) / 100) * circ;

  return `
    <section class="lk-panel lk-quest-panel">
      <header class="lk-panel-head">
        <h3 class="lk-panel-title">${lang === "pt" ? "Missões" : "Quests"}</h3>
        <span class="lk-panel-sub">${p.questPoints || 0} ${lang === "pt" ? "QP" : "QP"}</span>
      </header>
      <div class="lk-quest-body">
        <svg class="lk-quest-ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
          <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="rgba(34,211,187,0.10)" stroke-width="${stroke}"/>
          <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="var(--teal-bright)" stroke-width="${stroke}"
            stroke-linecap="round" stroke-dasharray="${circ}" stroke-dashoffset="${offset}"
            transform="rotate(-90 ${size/2} ${size/2})" style="transition:stroke-dashoffset .8s ease"/>
          <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle"
            fill="var(--teal-bright)" font-family="var(--font-mono)" font-size="18" font-weight="800">${pct}%</text>
        </svg>
        <div class="lk-quest-stats">
          <div class="lk-q-stat lk-q-done"><div class="lk-q-stat-v">${done}</div><div class="lk-q-stat-l">${lang === "pt" ? "completas" : "complete"}</div></div>
          <div class="lk-q-stat lk-q-started"><div class="lk-q-stat-v">${started}</div><div class="lk-q-stat-l">${lang === "pt" ? "iniciadas" : "started"}</div></div>
          <div class="lk-q-stat lk-q-none"><div class="lk-q-stat-v">${none}</div><div class="lk-q-stat-l">${lang === "pt" ? "restantes" : "remaining"}</div></div>
        </div>
      </div>
    </section>`;
}

/* ── Panel: Clue scrolls ─────────────────────────────────────────── */
function lkPanelClues(p, lang) {
  if (!p.clues) return "";
  const tiers = [
    { k: "easy",   label: lang === "pt" ? "Fácil"     : "Easy"    },
    { k: "medium", label: lang === "pt" ? "Médio"     : "Medium"  },
    { k: "hard",   label: lang === "pt" ? "Difícil"   : "Hard"    },
    { k: "elite",  label: "Elite"                                  },
    { k: "master", label: "Master"                                  },
  ];
  const total = tiers.reduce((s, t) => s + (p.clues[t.k] || 0), 0);
  if (total === 0) return "";

  return `
    <section class="lk-panel lk-clues-panel">
      <header class="lk-panel-head">
        <h3 class="lk-panel-title">${lang === "pt" ? "Pergaminhos" : "Clue Scrolls"}</h3>
        <span class="lk-panel-sub">${fmt(total)} ${lang === "pt" ? "concluídos" : "completed"}</span>
      </header>
      <div class="lk-clues-grid">
        ${tiers.map(t => `
          <div class="lk-clue lk-clue-${t.k}">
            <div class="lk-clue-v">${fmt(p.clues[t.k] || 0)}</div>
            <div class="lk-clue-l">${esc(t.label)}</div>
          </div>`).join("")}
      </div>
    </section>`;
}

/* ── Panel: Footer (sync info) ──────────────────────────────────── */
function lkPanelFooter(p, lang) {
  const now = new Date();
  const brAbs = fmtBRDateTime(now);
  return `
    <footer class="lk-footer">
      <div class="lk-footer-row">
        <span class="lk-footer-k">${lang === "pt" ? "Sincronizado" : "Synced"}</span>
        <span class="lk-footer-v" id="lk-synced-rel">${esc(fmtRelative(now))}</span>
        <span class="lk-footer-sep">·</span>
        <span class="lk-footer-v lk-footer-mono" id="lk-synced-br">${esc(fmtBRTime(now))} BRT</span>
      </div>
      <div class="lk-footer-row lk-footer-row-sub">
        <span class="lk-footer-k">${lang === "pt" ? "Fonte" : "Source"}</span>
        <span class="lk-footer-v">RuneMetrics + Hiscores · proxy CodeTabs / AllOrigins</span>
      </div>
      <div class="lk-footer-row lk-footer-row-sub">
        <span class="lk-footer-k">${lang === "pt" ? "Dia/hora" : "Date/time"}</span>
        <span class="lk-footer-v lk-footer-mono">${esc(brAbs)} BRT</span>
      </div>
    </footer>`;
}

/* ── Console event handlers ─────────────────────────────────────── */
function lkAttachConsoleHandlers(player) {
  const refresh = document.getElementById("lk-refresh");
  if (refresh) {
    refresh.addEventListener("click", () => {
      refresh.classList.add("lk-spinning");
      doLookup(player.name, { silent: true }).finally(() => {
        setTimeout(() => refresh.classList.remove("lk-spinning"), 500);
      });
    });
  }
  const back = document.getElementById("lk-back");
  if (back) {
    back.addEventListener("click", () => {
      lkStopAutoRefresh();
      _lkCurrentRSN = null;
      _lkLastFetchTime = null;
      $("#lk-results").innerHTML = "";
      $("#lk-input").value = "";
      $("#lk-input").focus();
    });
  }
  const toggle = document.getElementById("lk-toggle-auto");
  if (toggle) {
    toggle.addEventListener("click", () => {
      _lkAutoRefreshEnabled = !_lkAutoRefreshEnabled;
      toggle.classList.toggle("lk-toggle-on", _lkAutoRefreshEnabled);
      _lkCountdownSeconds = LK_AUTO_REFRESH_MS / 1000;
      lkUpdateCountdownLabel();
    });
  }
}

/* ── Inject CSS (idempotent) ────────────────────────────────────── */
function lkInjectStyles() {
  if (document.getElementById("lk-styles")) {
    document.getElementById("lk-styles").remove(); // refresh on rerun
  }
  const s = document.createElement("style");
  s.id = "lk-styles";
  s.textContent = `
/* ============================================================
   Live RSN Observatory — Palantir-grade tactical UI
   Mil-spec data console, sharp corners, semaphore indicators,
   coordinate-style labels, crosshair frames, dense readouts.
   ============================================================ */

#lookup-content {
  font-family: var(--font);
  --lk-cyan: #5fd3c0;
  --lk-cyan-dim: #1f8978;
  --lk-cyan-bright: #a3f5e3;
  --lk-amber: #f4a82b;
  --lk-amber-dim: #8a5b14;
  --lk-red: #ef4040;
  --lk-green: #3dd68c;
  --lk-grid: rgba(95, 211, 192, 0.06);
  --lk-grid-bright: rgba(95, 211, 192, 0.18);
  --lk-bg-deep: #04060a;
  --lk-bg-panel: linear-gradient(180deg, rgba(11,18,21,0.82) 0%, rgba(6,10,12,0.92) 100%);
  --lk-line: rgba(95, 211, 192, 0.14);
  --lk-line-bright: rgba(95, 211, 192, 0.32);
  --lk-corner-size: 10px;
  letter-spacing: 0;
}

/* ---- Station bar (top of page) ---- */
.lk-station-bar {
  display: flex; align-items: center; justify-content: space-between;
  gap: 10px;
  padding: 6px 14px;
  margin-bottom: 14px;
  background: rgba(4,6,10,0.7);
  border-top: 1px solid var(--lk-line);
  border-bottom: 1px solid var(--lk-line);
  font-family: var(--font-mono);
  font-size: 0.55rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--text-3);
}
.lk-station-ident { display: flex; align-items: center; gap: 8px; min-width: 0; flex-wrap: nowrap; overflow: hidden; }
.lk-station-icon { color: var(--lk-cyan); font-size: 0.95rem; line-height: 1; flex-shrink: 0; }
.lk-station-id { color: var(--lk-cyan-bright); font-weight: 700; }
.lk-station-sep { color: var(--text-3); opacity: 0.45; }
.lk-station-label { color: var(--text-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.lk-station-meta { display: inline-flex; align-items: center; gap: 12px; flex-shrink: 0; }
.lk-station-meta-item { display: inline-flex; align-items: baseline; gap: 4px; }
.lk-station-meta-k { color: var(--text-3); }
.lk-station-meta-v { color: var(--lk-cyan-bright); font-weight: 700; }
.lk-station-status { display: inline-flex; align-items: center; gap: 5px; color: var(--lk-green); }
.lk-station-status-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--lk-green); box-shadow: 0 0 8px var(--lk-green);
  animation: lkPulse 2s ease-in-out infinite;
}

/* ---- Search frame (chamfered, target reticle) ---- */
.lk-search-wrap { margin-bottom: 18px; position: relative; }
.lk-search-frame {
  position: relative;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: stretch;
  gap: 0;
  height: 56px;
  background: linear-gradient(180deg, rgba(11,18,21,0.85), rgba(4,6,10,0.95));
  border: 1px solid var(--lk-line-bright);
  clip-path: polygon(
    var(--lk-corner-size) 0, calc(100% - var(--lk-corner-size)) 0, 100% var(--lk-corner-size),
    100% calc(100% - var(--lk-corner-size)), calc(100% - var(--lk-corner-size)) 100%,
    var(--lk-corner-size) 100%, 0 calc(100% - var(--lk-corner-size)), 0 var(--lk-corner-size)
  );
  transition: border-color 0.18s, box-shadow 0.18s;
}
.lk-search-frame:focus-within {
  border-color: var(--lk-cyan);
  box-shadow:
    0 0 0 1px rgba(95,211,192,0.20),
    0 12px 36px -16px rgba(95,211,192,0.30);
}
.lk-search-corner {
  position: absolute;
  width: 12px; height: 12px;
  border: 1px solid var(--lk-cyan-bright);
  pointer-events: none;
  z-index: 2;
}
.lk-search-corner.lk-corner-tl { top: 4px; left: 4px; border-right: none; border-bottom: none; }
.lk-search-corner.lk-corner-tr { top: 4px; right: 4px; border-left: none; border-bottom: none; }
.lk-search-corner.lk-corner-bl { bottom: 4px; left: 4px; border-right: none; border-top: none; }
.lk-search-corner.lk-corner-br { bottom: 4px; right: 4px; border-left: none; border-top: none; }

.lk-search-prefix {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 0 14px;
  border-right: 1px solid var(--lk-line);
  font-family: var(--font-mono);
  font-size: 0.6rem;
  letter-spacing: 0.18em;
  color: var(--lk-cyan);
}
.lk-search-reticle {
  font-size: 1.1rem;
  color: var(--lk-cyan-bright);
  text-shadow: 0 0 8px var(--lk-cyan);
}
.lk-search-prompt { font-weight: 700; }
.lk-input {
  width: 100%;
  padding: 0 14px;
  background: transparent;
  border: none;
  color: var(--text);
  font-family: var(--font-mono);
  font-size: 0.95rem;
  letter-spacing: 0.04em;
  outline: none;
}
.lk-input::placeholder { color: var(--text-3); font-style: normal; opacity: 0.7; }
.lk-btn {
  display: inline-flex; align-items: center; justify-content: center;
  gap: 8px;
  padding: 0 18px;
  background: rgba(95,211,192,0.06);
  border: none;
  border-left: 1px solid var(--lk-line);
  color: var(--lk-cyan-bright);
  font-family: var(--font-mono);
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.22em;
  cursor: pointer;
  transition: all 0.18s;
}
.lk-btn-label { line-height: 1; }
.lk-btn:hover { background: rgba(95,211,192,0.18); color: #04140f; }
.lk-btn:active { background: var(--lk-cyan); color: #04140f; }

.lk-search-hint {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 0.58rem;
  color: var(--text-3);
  margin-top: 8px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  font-family: var(--font-mono);
}
.lk-hint-bullet { color: var(--lk-cyan); }

/* ---- History pills ---- */
.lk-history { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; align-items: center; }
.lk-hist-label {
  font-size: 0.56rem;
  color: var(--text-3);
  letter-spacing: 0.18em;
  text-transform: uppercase;
  font-family: var(--font-mono);
  margin-right: 4px;
}
.lk-hist-pill {
  appearance: none; cursor: pointer;
  padding: 4px 12px 4px 22px;
  position: relative;
  background: rgba(4,6,10,0.6);
  border: 1px solid var(--lk-line);
  color: var(--lk-cyan-bright);
  font-family: var(--font-mono);
  font-size: 0.62rem;
  letter-spacing: 0.06em;
  transition: all 0.18s;
  clip-path: polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px);
}
.lk-hist-pill::before {
  content: ""; position: absolute;
  left: 8px; top: 50%; transform: translateY(-50%);
  width: 6px; height: 6px;
  background: var(--lk-cyan-dim);
  clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%);
}
.lk-hist-pill:hover {
  background: rgba(95,211,192,0.10);
  border-color: var(--lk-cyan-dim);
  color: var(--lk-cyan-bright);
}
.lk-hist-pill:hover::before { background: var(--lk-cyan-bright); }

/* ---- Spinner / error ---- */
.lk-spinner {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 18px;
  background: rgba(11,18,21,0.6);
  border: 1px solid var(--lk-line);
  color: var(--text-2);
  font-size: 0.65rem;
  font-family: var(--font-mono);
  letter-spacing: 0.18em;
  text-transform: uppercase;
}
.lk-spinner-ring {
  width: 14px; height: 14px;
  border: 2px solid rgba(95,211,192,0.18);
  border-top-color: var(--lk-cyan-bright);
  border-radius: 50%;
  animation: lkSpin 0.7s linear infinite;
}
@keyframes lkSpin { to { transform: rotate(360deg); } }
.lk-error {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 16px;
  background: rgba(239,64,64,0.06);
  border: 1px solid rgba(239,64,64,0.30);
  border-left: 3px solid var(--lk-red);
  color: var(--lk-red);
  clip-path: polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px);
}
.lk-error-mark {
  width: 18px; height: 18px;
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--lk-red);
  color: #1a0a0c;
  font-weight: 800;
  font-family: var(--font-mono);
  border-radius: 50%;
  font-size: 0.65rem;
}
.lk-error-text { font-size: 0.7rem; font-family: var(--font-mono); letter-spacing: 0.06em; }
.lk-error-detail { color: var(--lk-red); opacity: 0.7; font-size: 0.55rem; }

/* ---- Console wrapper ---- */
.lk-console { display: flex; flex-direction: column; gap: 12px; animation: lkFadeIn 0.4s cubic-bezier(0.22,1,0.36,1); }
@keyframes lkFadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }

/* ---- Banner (player HUD) ---- */
.lk-banner {
  position: relative;
  padding: 14px 18px 16px;
  background:
    radial-gradient(ellipse 50% 80% at 100% 0%, rgba(95,211,192,0.10) 0%, transparent 60%),
    linear-gradient(160deg, #0b1417 0%, #04060a 100%);
  border: 1px solid var(--lk-line-bright);
  overflow: hidden;
  isolation: isolate;
  clip-path: polygon(
    var(--lk-corner-size) 0, calc(100% - var(--lk-corner-size)) 0, 100% var(--lk-corner-size),
    100% calc(100% - var(--lk-corner-size)), calc(100% - var(--lk-corner-size)) 100%,
    var(--lk-corner-size) 100%, 0 calc(100% - var(--lk-corner-size)), 0 var(--lk-corner-size)
  );
}
.lk-banner-corner {
  position: absolute; width: 14px; height: 14px;
  border: 1px solid var(--lk-cyan);
  z-index: 1;
}
.lk-banner-corner.lk-corner-tl { top: 4px; left: 4px; border-right: none; border-bottom: none; }
.lk-banner-corner.lk-corner-tr { top: 4px; right: 4px; border-left: none; border-bottom: none; }
.lk-banner-corner.lk-corner-bl { bottom: 4px; left: 4px; border-right: none; border-top: none; }
.lk-banner-corner.lk-corner-br { bottom: 4px; right: 4px; border-left: none; border-top: none; }

.lk-banner-grain {
  position: absolute; inset: 0; z-index: -1; pointer-events: none;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='1.4' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.36 0 0 0 0 0.83 0 0 0 0 0.73 0 0 0 0.04 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
  opacity: 0.5;
  mix-blend-mode: overlay;
}
.lk-banner-grid {
  position: absolute; inset: 0; z-index: -1; pointer-events: none;
  background-image:
    linear-gradient(90deg, var(--lk-grid) 1px, transparent 1px),
    linear-gradient(0deg,  var(--lk-grid) 1px, transparent 1px);
  background-size: 32px 32px;
  mask-image: radial-gradient(ellipse 80% 100% at 50% 50%, black 30%, transparent 90%);
}

.lk-banner-top {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 12px; gap: 10px; flex-wrap: wrap;
}
.lk-live-tag {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 4px 10px;
  background: rgba(4,6,10,0.7);
  border: 1px solid var(--lk-line);
  font-family: var(--font-mono);
  font-size: 0.52rem;
  letter-spacing: 0.24em;
  color: var(--lk-cyan-bright);
  clip-path: polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px);
}
.lk-live-dot {
  width: 7px; height: 7px;
  background: var(--lk-cyan-bright);
  box-shadow: 0 0 8px var(--lk-cyan-bright);
  clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%);
  animation: lkPulse 1.6s ease-in-out infinite;
}
.lk-live-dot.lk-fresh { background: var(--lk-green); box-shadow: 0 0 10px var(--lk-green); }
.lk-live-dot.lk-warm  { background: var(--lk-amber); box-shadow: 0 0 10px var(--lk-amber); animation-duration: 2.4s; }
.lk-live-dot.lk-stale { background: var(--lk-red); box-shadow: 0 0 10px var(--lk-red); animation: none; opacity: 0.7; }
.lk-live-sep { color: var(--text-3); opacity: 0.5; }
.lk-live-id { color: var(--lk-amber); font-weight: 700; }
@keyframes lkPulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }

.lk-banner-controls { display: inline-flex; gap: 4px; align-items: center; }
.lk-toggle {
  appearance: none; cursor: pointer;
  display: inline-flex; align-items: center; gap: 6px;
  padding: 5px 10px;
  background: rgba(4,6,10,0.6);
  border: 1px solid var(--lk-line);
  color: var(--text-3);
  font-family: var(--font-mono);
  font-size: 0.54rem;
  letter-spacing: 0.16em;
  font-weight: 600;
  transition: all 0.18s;
  clip-path: polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px);
}
.lk-toggle-dot {
  width: 5px; height: 5px;
  background: var(--text-3);
  clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%);
  transition: all 0.2s;
}
.lk-toggle.lk-toggle-on {
  background: rgba(95,211,192,0.10);
  border-color: var(--lk-cyan-dim);
  color: var(--lk-cyan-bright);
}
.lk-toggle.lk-toggle-on .lk-toggle-dot {
  background: var(--lk-cyan-bright);
  box-shadow: 0 0 6px var(--lk-cyan-bright);
}
.lk-icon-btn {
  appearance: none; cursor: pointer;
  width: 30px; height: 28px;
  display: flex; align-items: center; justify-content: center;
  background: rgba(4,6,10,0.6);
  border: 1px solid var(--lk-line);
  color: var(--text-2);
  transition: all 0.18s;
  clip-path: polygon(5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%, 0 5px);
}
.lk-icon-btn:hover { color: var(--lk-cyan-bright); border-color: var(--lk-cyan-dim); background: rgba(95,211,192,0.06); }
.lk-icon-btn:active { transform: translateY(1px); }
.lk-icon-btn.lk-spinning svg { animation: lkSpin 0.8s linear infinite; }

.lk-banner-body { position: relative; z-index: 1; }
.lk-banner-callsign {
  display: flex; align-items: center; gap: 10px;
  margin-bottom: 4px;
  font-family: var(--font-mono);
  font-size: 0.54rem;
  letter-spacing: 0.28em;
  color: var(--text-3);
  text-transform: uppercase;
}
.lk-callsign-prefix { white-space: nowrap; }
.lk-callsign-line {
  flex: 1; height: 1px;
  background: linear-gradient(90deg, var(--lk-cyan-dim) 0%, transparent 100%);
}

.lk-banner-name-row {
  display: flex; align-items: center; gap: 14px; flex-wrap: wrap;
  margin-bottom: 12px;
}
.lk-banner-name {
  font-family: var(--font-display);
  font-size: clamp(1.6rem, 5vw, 2.4rem);
  font-weight: 900;
  line-height: 1;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  background: linear-gradient(140deg, #ede7db 0%, var(--lk-cyan-bright) 70%, #ede7db 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: 0;
}
.lk-status-pip {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 3px 9px;
  border: 1px solid;
  font-family: var(--font-mono);
  font-size: 0.55rem;
  letter-spacing: 0.18em;
  font-weight: 700;
  clip-path: polygon(5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%, 0 5px);
}
.lk-status-pip-dot {
  width: 6px; height: 6px;
  clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%);
}
.lk-status-active {
  color: var(--lk-green);
  border-color: rgba(61,214,140,0.4);
  background: rgba(61,214,140,0.06);
}
.lk-status-active .lk-status-pip-dot {
  background: var(--lk-green);
  box-shadow: 0 0 6px var(--lk-green);
  animation: lkPulse 1.6s ease-in-out infinite;
}
.lk-status-dormant {
  color: var(--text-3);
  border-color: rgba(115,115,115,0.3);
  background: rgba(255,255,255,0.02);
}
.lk-status-dormant .lk-status-pip-dot { background: var(--text-3); }

.lk-banner-grid-meta {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1px;
  background: var(--lk-line);
  border: 1px solid var(--lk-line);
}
@media (max-width: 480px) { .lk-banner-grid-meta { grid-template-columns: repeat(2, 1fr); } }
.lk-meta-cell {
  padding: 8px 12px;
  background: rgba(4,6,10,0.85);
}
.lk-meta-cell-k {
  font-family: var(--font-mono);
  font-size: 0.5rem;
  letter-spacing: 0.2em;
  color: var(--text-3);
  margin-bottom: 4px;
}
.lk-meta-cell-v {
  font-family: var(--font-mono);
  font-size: 0.95rem;
  font-weight: 800;
  color: var(--lk-cyan-bright);
  letter-spacing: 0.02em;
}

/* ---- Vitals strip ---- */
.lk-vitals {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px;
  background: var(--lk-line);
  border: 1px solid var(--lk-line);
}
@media (min-width: 720px) { .lk-vitals { grid-template-columns: repeat(6, 1fr); } }
.lk-vital {
  position: relative;
  padding: 12px 10px 10px;
  background: rgba(8,12,15,0.92);
  text-align: left;
  overflow: hidden;
}
.lk-vital::before {
  content: ""; position: absolute; top: 0; left: 0; right: 0; height: 2px;
}
.lk-vital-gold::before   { background: var(--lk-amber); }
.lk-vital-teal::before   { background: var(--lk-cyan); }
.lk-vital-purple::before { background: var(--purple); }
.lk-vital-red::before    { background: var(--lk-red); }
.lk-vital-v {
  font-family: var(--font-mono);
  font-size: clamp(1rem, 2.6vw, 1.25rem);
  font-weight: 800;
  line-height: 1;
  letter-spacing: 0.01em;
}
.lk-vital-gold .lk-vital-v   { color: var(--lk-amber); }
.lk-vital-teal .lk-vital-v   { color: var(--lk-cyan-bright); }
.lk-vital-purple .lk-vital-v { color: var(--purple); }
.lk-vital-red .lk-vital-v    { color: var(--lk-red); }
.lk-vital-k {
  font-family: var(--font-mono);
  font-size: 0.5rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--text-3);
  margin-top: 6px;
}

/* ---- Panel base ---- */
.lk-panel {
  position: relative;
  padding: 12px 14px;
  background: var(--lk-bg-panel);
  border: 1px solid var(--lk-line);
  clip-path: polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px);
}
.lk-panel-head {
  display: flex; align-items: baseline; justify-content: space-between;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px dashed var(--lk-line);
  gap: 10px;
}
.lk-panel-title {
  font-family: var(--font-mono);
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  margin: 0;
  color: var(--text);
  display: flex; align-items: center; gap: 8px;
}
.lk-panel-title::before {
  content: "▸";
  color: var(--lk-cyan);
  font-size: 0.55rem;
}
.lk-panel-sub {
  font-family: var(--font-mono);
  font-size: 0.5rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--text-3);
}
.lk-panel-tag {
  font-family: var(--font-mono);
  font-size: 0.5rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  padding: 3px 8px;
  border: 1px solid;
  font-weight: 700;
  clip-path: polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px);
}
.lk-cstyle-melee  { color: var(--lk-red); border-color: rgba(239,64,64,0.4); background: rgba(239,64,64,0.06); }
.lk-cstyle-magic  { color: #5fa1ff; border-color: rgba(95,161,255,0.4); background: rgba(95,161,255,0.06); }
.lk-cstyle-ranged { color: var(--lk-green); border-color: rgba(61,214,140,0.4); background: rgba(61,214,140,0.06); }
.lk-cstyle-necro  { color: var(--purple); border-color: rgba(167,139,250,0.4); background: var(--purple-bg); }

/* ---- Combat bars ---- */
.lk-cbars { display: flex; flex-direction: column; gap: 10px; }
.lk-cbar { display: flex; flex-direction: column; gap: 4px; }
.lk-cbar-meta {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 10px;
  font-family: var(--font-mono);
  font-size: 0.62rem;
  align-items: baseline;
}
.lk-cbar-label { color: var(--text-2); text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600; }
.lk-cbar-xp { color: var(--lk-cyan-bright); font-weight: 700; }
.lk-cbar-pct { color: var(--text-3); font-size: 0.55rem; min-width: 50px; text-align: right; letter-spacing: 0.06em; }
.lk-cbar-track {
  position: relative;
  height: 8px;
  background: rgba(0,0,0,0.6);
  border: 1px solid rgba(95,211,192,0.10);
  overflow: hidden;
}
.lk-cbar-track::before {
  content: ""; position: absolute; inset: 0;
  background-image: repeating-linear-gradient(
    90deg, transparent 0, transparent 9.9%, rgba(95,211,192,0.10) 9.9%, rgba(95,211,192,0.10) 10%
  );
  pointer-events: none;
}
.lk-cbar-fill {
  height: 100%;
  transition: width 0.8s cubic-bezier(0.22,1,0.36,1);
  background-image: repeating-linear-gradient(
    -45deg,
    rgba(255,255,255,0.08) 0,
    rgba(255,255,255,0.08) 4px,
    transparent 4px, transparent 8px
  );
}
.lk-cbar-melee  { background-color: var(--lk-red); }
.lk-cbar-magic  { background-color: #5fa1ff; }
.lk-cbar-ranged { background-color: var(--lk-green); }
.lk-cbar-necro  { background-color: var(--purple); }

/* ---- Standouts ---- */
.lk-standout-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.lk-standout-col-title {
  font-family: var(--font-mono);
  font-size: 0.5rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--text-3);
  margin-bottom: 6px;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--lk-line);
}
.lk-standout-cell {
  display: grid;
  grid-template-columns: 22px 1fr auto;
  gap: 8px;
  align-items: center;
  padding: 5px 8px;
  background: rgba(4,6,10,0.5);
  border-left: 2px solid transparent;
  margin-bottom: 3px;
  font-size: 0.7rem;
  font-family: var(--font-mono);
}
.lk-standout-icon { display: flex; line-height: 0; justify-content: center; }
.lk-standout-name { color: var(--text); letter-spacing: 0.04em; }
.lk-standout-level { font-weight: 800; color: var(--text); letter-spacing: 0.02em; }
.lk-high { border-left-color: var(--lk-cyan); }
.lk-high .lk-standout-level { color: var(--lk-cyan-bright); }
.lk-low { border-left-color: var(--lk-amber); }
.lk-low .lk-standout-level { color: var(--lk-amber); }

/* ---- Skills grid ---- */
.lk-grid-2col { display: grid; grid-template-columns: 1fr; gap: 12px; }
@media (min-width: 880px) { .lk-grid-2col { grid-template-columns: 1.1fr 1fr; } }

.lk-skill-list { display: grid; grid-template-columns: 1fr; gap: 0; }
.lk-skill-row {
  display: grid;
  grid-template-columns: 22px 1fr auto auto 60px;
  gap: 8px;
  align-items: center;
  padding: 5px 6px;
  font-family: var(--font-mono);
  font-size: 0.67rem;
  border-bottom: 1px dashed rgba(95,211,192,0.08);
  transition: background 0.15s;
}
.lk-skill-row:last-child { border-bottom: none; }
.lk-skill-row:hover { background: rgba(95,211,192,0.06); }
.lk-skill-icon { display: flex; line-height: 0; }
.lk-skill-name { color: var(--text-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; letter-spacing: 0.04em; }
.lk-skill-level { font-weight: 800; color: var(--text); min-width: 22px; text-align: right; letter-spacing: 0.02em; }
.lk-skill-level.lk-maxed { color: var(--lk-amber); text-shadow: 0 0 6px rgba(244,168,43,0.4); }
.lk-skill-xp { font-size: 0.58rem; color: var(--text-3); min-width: 50px; text-align: right; }
.lk-skill-bar { position: relative; height: 4px; background: rgba(0,0,0,0.6); border: 1px solid rgba(95,211,192,0.06); overflow: hidden; }
.lk-skill-bar-fill { height: 100%; background: var(--lk-cyan-dim); transition: width 0.6s ease; }

/* ---- Activity timeline ---- */
.lk-activity-panel { max-height: 540px; overflow: auto; }
.lk-activity-panel::-webkit-scrollbar { width: 4px; }
.lk-activity-panel::-webkit-scrollbar-track { background: transparent; }
.lk-activity-panel::-webkit-scrollbar-thumb { background: var(--lk-cyan-dim); }
.lk-act-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 1px; }
.lk-act-item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 10px;
  padding: 8px 10px;
  background: rgba(4,6,10,0.5);
  border-left: 2px solid transparent;
  font-family: var(--font-mono);
  font-size: 0.66rem;
  letter-spacing: 0.02em;
  transition: background 0.15s;
}
.lk-act-item:hover { background: rgba(95,211,192,0.05); }
.lk-act-levelup { border-left-color: var(--lk-amber); }
.lk-act-quest { border-left-color: var(--lk-cyan); }
.lk-act-boss { border-left-color: var(--lk-red); }
.lk-act-dungeon { border-left-color: var(--purple); }
.lk-act-icon { font-size: 0.85rem; line-height: 1; }
.lk-act-body { min-width: 0; }
.lk-act-text { color: var(--text); font-weight: 500; line-height: 1.35; }
.lk-act-detail { color: var(--text-3); font-size: 0.58rem; margin-top: 2px; letter-spacing: 0; }
.lk-act-time { text-align: right; flex-shrink: 0; }
.lk-act-rel {
  font-size: 0.58rem;
  color: var(--lk-cyan-bright);
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.lk-act-abs {
  font-size: 0.5rem;
  color: var(--text-3);
  margin-top: 2px;
  letter-spacing: 0.04em;
}

/* ---- Quest panel ---- */
.lk-quest-body { display: flex; align-items: center; gap: 16px; }
.lk-quest-ring { flex-shrink: 0; }
.lk-quest-stats { display: grid; grid-template-columns: repeat(3, 1fr); flex: 1; gap: 8px; text-align: center; }
.lk-q-stat-v { font-family: var(--font-mono); font-size: 1.15rem; font-weight: 800; letter-spacing: 0.02em; }
.lk-q-stat-l {
  font-family: var(--font-mono); font-size: 0.5rem;
  letter-spacing: 0.16em; text-transform: uppercase;
  color: var(--text-3); margin-top: 2px;
}
.lk-q-done .lk-q-stat-v { color: var(--lk-green); }
.lk-q-started .lk-q-stat-v { color: var(--lk-amber); }
.lk-q-none .lk-q-stat-v { color: var(--text-3); }

/* ---- Clues ---- */
.lk-clues-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 1px; background: var(--lk-line); border: 1px solid var(--lk-line); }
@media (max-width: 480px) { .lk-clues-grid { grid-template-columns: repeat(3, 1fr); } }
.lk-clue { text-align: left; padding: 10px 12px; background: rgba(8,12,15,0.92); border-top: 2px solid; }
.lk-clue-easy   { border-top-color: #6b8c3a; }
.lk-clue-medium { border-top-color: #5b8caa; }
.lk-clue-hard   { border-top-color: #c75c3c; }
.lk-clue-elite  { border-top-color: var(--purple); }
.lk-clue-master { border-top-color: var(--lk-amber); }
.lk-clue-v { font-family: var(--font-mono); font-size: 1rem; font-weight: 800; color: var(--text); letter-spacing: 0.02em; }
.lk-clue-l { font-family: var(--font-mono); font-size: 0.5rem; letter-spacing: 0.18em; text-transform: uppercase; color: var(--text-3); margin-top: 4px; }

/* ---- Footer ---- */
.lk-footer {
  padding: 10px 14px;
  background: rgba(4,6,10,0.7);
  border: 1px solid var(--lk-line);
  border-top: 1px solid var(--lk-line-bright);
  display: flex; flex-direction: column; gap: 4px;
  clip-path: polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px);
}
.lk-footer-row {
  display: flex; align-items: baseline; gap: 8px;
  font-family: var(--font-mono);
  font-size: 0.6rem;
  letter-spacing: 0.06em;
  flex-wrap: wrap;
}
.lk-footer-row-sub { font-size: 0.54rem; color: var(--text-3); }
.lk-footer-k {
  font-size: 0.5rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--text-3);
  min-width: 90px;
}
.lk-footer-v { color: var(--text-2); }
.lk-footer-mono { color: var(--lk-cyan-bright); font-weight: 700; }
.lk-footer-sep { color: var(--text-3); opacity: 0.4; }

.lk-empty {
  text-align: center;
  color: var(--text-3);
  padding: 18px 12px;
  font-size: 0.65rem;
  font-family: var(--font-mono);
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

/* ---- Mobile tightening ---- */
@media (max-width: 480px) {
  .lk-station-bar { font-size: 0.5rem; padding: 6px 10px; }
  .lk-station-meta { gap: 8px; }
  .lk-search-frame { height: 50px; }
  .lk-search-prefix { padding: 0 10px; font-size: 0.55rem; gap: 6px; }
  .lk-input { font-size: 0.85rem; padding: 0 10px; }
  .lk-btn { padding: 0 12px; font-size: 0.55rem; gap: 6px; }
  .lk-banner { padding: 12px 12px 14px; }
  .lk-banner-controls { gap: 3px; }
  .lk-icon-btn { width: 26px; height: 26px; }
  .lk-toggle { padding: 4px 8px; font-size: 0.5rem; }
  .lk-vital { padding: 10px 8px 8px; }
  .lk-skill-row { grid-template-columns: 18px 1fr auto auto 40px; gap: 6px; padding: 4px 6px; font-size: 0.62rem; }
  .lk-skill-xp { font-size: 0.52rem; min-width: 40px; }
  .lk-act-item { gap: 6px; padding: 6px 8px; font-size: 0.62rem; }
  .lk-act-rel { font-size: 0.52rem; }
  .lk-act-abs { font-size: 0.46rem; }
  .lk-standout-row { grid-template-columns: 1fr; }
}
@media (prefers-reduced-motion: reduce) {
  .lk-live-dot, .lk-status-pip-dot, .lk-station-status-dot { animation: none; }
  .lk-cbar-fill, .lk-skill-bar-fill { transition: none; }
}
`;
  document.head.appendChild(s);
}
