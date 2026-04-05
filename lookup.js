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
  if (!root) return;
  root.innerHTML = `
    <div class="lk-search-box">
      <input id="lk-input" class="chat-key-input" type="text"
             placeholder="${esc(t("lookupPlaceholder"))}"
             autocomplete="off" spellcheck="false">
      <button id="lk-btn" class="chat-key-btn">${esc(t("lookupSearch"))}</button>
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

function lkTriggerSearch(rsn) {
  if (!rsn) return;
  $("#lk-input").value = rsn;
  doLookup(rsn);
}

/* ── CORS proxy for fetching arbitrary RSNs from browser ─────────── */
// RuneMetrics/Hiscores APIs don't send CORS headers, so browser fetch
// from github.io fails. We proxy through corsproxy.io for lookup only.
const LK_CORS_PROXY = "https://corsproxy.io/?url=";

async function lkFetchJSON(url) {
  const proxied = LK_CORS_PROXY + encodeURIComponent(url);
  const r = await fetch(proxied, { signal: AbortSignal.timeout(12000) });
  if (!r.ok) throw new Error("fetch_fail");
  return r.json();
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
    status.innerHTML = `<p class="lk-error">${esc(t("lookupError"))}</p>`;
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
          <div class="sk-icon ${sk.cat}">${sk.abbr}</div>
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
