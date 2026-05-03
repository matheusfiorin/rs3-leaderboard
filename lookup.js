/**
 * lookup.js — RSN Lookup module for RS3 Leaderboard
 * Renders search UI, fetches RuneMetrics data, displays full player profile.
 * Depends on globals from script.js: fetchLive, SKILLS, t, tSkill, fmt, fmtShort,
 * xpToNextLevel, esc, $, $$, currentLang, classifyActivity, localizeActivity,
 * ACT_ICONS, fmtTime
 */

/* ── Constants ─────────────────────────────────────────────────────── */

const LK_HISTORY_KEY = "rs3lb-lookup-history";
const LK_MAX_HISTORY = 5;
const LK_MAX_ACTIVITIES = 20;

/* ── History helpers ───────────────────────────────────────────────── */

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

/* ── Main entry: render search page ────────────────────────────────── */

function renderLookupPage() {
  const root = $("#lookup-content");
  if (!root) { console.error("Lookup: #lookup-content not found"); return; }
  // Don't re-render if already has content (preserves search results)
  if (root.querySelector("#lk-input")) return;
  root.innerHTML = `
    <div class="lk-search-box">
      <input id="lk-input" class="lk-input" type="text"
             placeholder="${esc(t("lookupPlaceholder"))}"
             aria-label="${esc(t("lookupPlaceholder"))}"
             autocomplete="off" spellcheck="false">
      <button id="lk-btn" class="lk-btn">${esc(t("lookupSearch"))}</button>
    </div>
    <div id="lk-history" class="lk-history"></div>
    <div id="lk-status"></div>
    <div id="lk-results"></div>`;

  const input = $("#lk-input");
  const btn = $("#lk-btn");
  btn.addEventListener("click", () => lkTriggerSearch(input.value.trim()));
  input.addEventListener("keydown", e => {
    if (e.key === "Enter") lkTriggerSearch(input.value.trim());
  });

  lkRenderHistory();
}

/* ── Search trigger ────────────────────────────────────────────────── */

// RS3 RSNs: 1–12 chars, letters/digits/space/_/-. Validate before burning
// proxy quota on garbage input.
const LK_RSN_RE = /^[A-Za-z0-9 _-]{1,12}$/;

function lkTriggerSearch(rsn) {
  rsn = (rsn || "").trim();
  if (!rsn) return;
  if (!LK_RSN_RE.test(rsn)) {
    const status = $("#lk-status");
    if (status) status.innerHTML = `<p class="lk-error">${esc(t("lookupError"))}</p>`;
    return;
  }
  $("#lk-input").value = rsn;
  doLookup(rsn);
}

/* ── CORS proxy for fetching arbitrary RSNs from browser ─────────── */
// On localhost, direct fetch works; on github.io, browser CORS blocks the
// runescape APIs so we race multiple proxies in parallel and take the
// first to respond. AllOrigins is intermittently slow; CodeTabs is currently
// the most reliable.
const LK_IS_LOCAL = typeof location !== "undefined" && /^(localhost|127\.|file)/.test(location.hostname || location.protocol);

const LK_PROXIES = [
  async (url, ms) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    try {
      const r = await fetch(`https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(url)}`, { signal: ctrl.signal });
      clearTimeout(t);
      if (!r.ok) throw new Error("codetabs_" + r.status);
      return r.json();
    } finally { clearTimeout(t); }
  },
  async (url, ms) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    try {
      const r = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`, { signal: ctrl.signal });
      clearTimeout(t);
      if (!r.ok) throw new Error("allorigins_" + r.status);
      const w = await r.json();
      if (!w.contents) throw new Error("allorigins_empty");
      return JSON.parse(w.contents);
    } finally { clearTimeout(t); }
  },
];

async function lkFetchJSON(url) {
  // On localhost, try direct first (fast, no proxy needed)
  if (LK_IS_LOCAL) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 5000);
      const r = await fetch(url, { signal: ctrl.signal });
      clearTimeout(t);
      if (r.ok) return await r.json();
    } catch (_) { /* fall through to proxies */ }
  }
  // Race all proxies in parallel; first success wins. ~7s timeout each.
  return new Promise((resolve, reject) => {
    let pending = LK_PROXIES.length, done = false;
    for (const fn of LK_PROXIES) {
      fn(url, 7000).then(v => {
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
  const questsUrl = `https://apps.runescape.com/runemetrics/quests?user=${enc}`;

  // Fetch profile (required) and quests (optional) in parallel
  const [profileRes, questsRes] = await Promise.allSettled([
    lkFetchJSON(profileUrl),
    lkFetchJSON(questsUrl),
  ]);

  if (profileRes.status === "rejected") throw new Error("fetch_fail");
  const profile = profileRes.value;
  if (profile.error) throw new Error(profile.error);

  const quests = questsRes.status === "fulfilled" ? questsRes.value : null;

  // Parse into the same format as script.js parse()
  return parse(profile, null, quests);
}

/* ── Fetch & render full profile ───────────────────────────────────── */

async function doLookup(rsn) {
  const status = $("#lk-status");
  const results = $("#lk-results");
  results.innerHTML = "";
  status.innerHTML = `<div class="lk-spinner">${esc(t("lookupLoading"))}</div>`;

  try {
    const player = await lkFetchPlayer(rsn);
    if (!player || !player.name) throw new Error(t("lookupError"));

    lkSaveToHistory(player.name);
    lkRenderHistory();
    status.innerHTML = "";
    results.innerHTML =
      lkBuildBackBtn() +
      lkBuildProfileCard(player) +
      lkBuildSkillsGrid(player) +
      lkBuildActivities(player) +
      lkBuildQuestSummary(player);

    $("#lk-back-btn")?.addEventListener("click", () => {
      results.innerHTML = "";
      $("#lk-input").value = "";
      $("#lk-input").focus();
    });
  } catch (err) {
    console.error("Lookup failed:", err);
    const msg = err.message === "NOT_A_MEMBER" || err.message === "PROFILE_PRIVATE"
      ? t("lookupError")
      : t("lookupError") + ` (${err.message})`;
    status.innerHTML = `<p class="lk-error">${esc(msg)}</p>`;
  }
}

/* ── History pills ─────────────────────────────────────────────────── */

function lkRenderHistory() {
  const wrap = $("#lk-history");
  if (!wrap) return;
  const hist = lkGetHistory();
  if (!hist.length) { wrap.innerHTML = ""; return; }
  wrap.innerHTML = `<span style="font-size:0.65rem;color:var(--text-3);margin-right:4px">${esc(t("lookupRecent"))}:</span>` +
    hist.map(h =>
      `<button class="pill lk-hist-pill" data-rsn="${esc(h)}">${esc(h)}</button>`
    ).join("");
  wrap.querySelectorAll(".lk-hist-pill").forEach(btn => {
    btn.addEventListener("click", () => lkTriggerSearch(btn.dataset.rsn));
  });
}

/* ── Back button ───────────────────────────────────────────────────── */

function lkBuildBackBtn() {
  return `<button id="lk-back-btn" class="lk-back-btn">&larr; ${esc(t("lookupBack"))}</button>`;
}

/* ── Profile card ──────────────────────────────────────────────────── */

function lkBuildProfileCard(p) {
  const totalClues = p.clues ? Object.values(p.clues).reduce((a, b) => a + b, 0) : 0;
  const stats = [
    { label: t("combatLevel"), val: p.combatLevel || "—" },
    { label: t("totalLevel"),  val: fmt(p.totalLevel || 0) },
    { label: t("totalXp"),     val: fmtShort(p.totalXp || 0) },
    { label: t("overallRank"), val: p.rank ? `#${p.rank}` : "—" },
    { label: t("questsDone"),  val: `${p.questsDone || 0}/${p.totalQuests || 0}` },
    { label: t("runeScore"),   val: fmt(p.runeScore || 0) },
  ];

  return `
    <div class="p-card p1 lk-profile fade-in">
      <div class="p-card-name">${esc(p.name)}</div>
      <div class="p-card-rank">${t("overallRank")} #${esc(String(p.rank || "—"))}</div>
      <div class="p-card-combat">${SWORD || "⚔"} ${t("combat")} ${p.combatLevel}</div>
      <div class="p-stats">
        ${stats.map(s => `
          <div class="p-stat">
            <div class="p-stat-val">${esc(String(s.val))}</div>
            <div class="p-stat-label">${esc(s.label)}</div>
          </div>`).join("")}
      </div>
    </div>`;
}

/* ── Skills grid ───────────────────────────────────────────────────── */

function lkBuildSkillsGrid(p) {
  // p.skills is {id: {level, xp, rank}} from parse()
  const rows = SKILLS.map(sk => {
    const s = p.skills[sk.id] || { level: 1, xp: 0 };
    const prog = xpToNextLevel(s.xp, s.level, sk.max);

    return `
      <div class="skill-row" data-cat="${sk.cat}">
        <div class="sk-name-col">
          <div class="sk-icon ${sk.cat}">${skillIconImg(sk.id, 22)}</div>
          <div class="sk-name">${tSkill(sk.id)}</div>
        </div>
        <div class="sk-player-col">
          <div class="sk-level">${s.level}</div>
          <div class="sk-xp">${fmt(s.xp)} ${t("xp")}</div>
          <div class="sk-to-next">${s.level >= sk.max ? t("maxed") : fmt(prog.needed) + " → " + (s.level + 1)}</div>
          <div class="sk-bar"><div class="sk-bar-fill p1" style="width:${prog.pct}%"></div></div>
        </div>
      </div>`;
  });

  return `
    <div class="lk-result-section">
      <h3>${t("skillsTitle")}</h3>
      <div class="lk-skill-grid">${rows.join("")}</div>
    </div>`;
}

/* ── Recent activities ─────────────────────────────────────────────── */

function lkBuildActivities(p) {
  const acts = (p.activities || []).slice(0, LK_MAX_ACTIVITIES);
  if (!acts.length) return "";

  const items = acts.map(a => {
    const type = classifyActivity(a.text);
    const icon = (typeof ACT_ICONS !== "undefined" && ACT_ICONS[type]) || "💬";
    return `
      <div class="act-item">
        <div class="act-dot">${icon}</div>
        <div class="act-body">
          <div class="act-text">${esc(localizeActivity(a.text))}</div>
          ${a.details ? `<div class="act-detail">${esc(localizeActivity(a.details))}</div>` : ""}
        </div>
        <div class="act-time">${fmtTime(a.date)}</div>
      </div>`;
  });

  return `
    <div class="lk-result-section">
      <h3>${t("activityTitle")}</h3>
      <div class="activity-feed" style="max-height:none">${items.join("")}</div>
    </div>`;
}

/* ── Quest summary ─────────────────────────────────────────────────── */

function lkBuildQuestSummary(p) {
  const done = p.questsDone || 0;
  const started = p.questsStarted || 0;
  const none = p.questsNone || 0;
  const total = p.totalQuests || (done + started + none);
  const pct = total ? Math.round((done / total) * 100) : 0;

  return `
    <div class="lk-result-section">
      <h3>${t("questsTitle")}</h3>
      <div class="q-card p1 fade-in">
        <div class="q-header">
          <div class="q-name">${esc(p.name)}</div>
          <div class="q-pct">${pct}%</div>
        </div>
        <div class="q-bar">
          <div class="q-bar-fill done" style="width:${total ? (done/total)*100 : 0}%"></div>
          <div class="q-bar-fill started" style="width:${total ? (started/total)*100 : 0}%"></div>
        </div>
        <div class="q-stats">
          <div class="q-stat"><div class="q-stat-val done">${done}</div><div class="q-stat-lbl">${t("complete")}</div></div>
          <div class="q-stat"><div class="q-stat-val started">${started}</div><div class="q-stat-lbl">${t("started")}</div></div>
          <div class="q-stat"><div class="q-stat-val none">${none}</div><div class="q-stat-lbl">${t("remaining")}</div></div>
        </div>
        ${p.questPoints ? `<div style="margin-top:10px;text-align:center;font-size:0.72rem;color:var(--text-3)">
          <span style="font-family:var(--font-mono);font-weight:700;color:var(--gold)">${p.questPoints}</span> ${t("questPoints")}
        </div>` : ""}
      </div>
    </div>`;
}
