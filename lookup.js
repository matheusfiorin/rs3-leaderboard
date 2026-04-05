/**
 * lookup.js — RSN Lookup module for RS3 Leaderboard
 * Renders search UI, fetches RuneMetrics data, displays full player profile.
 * Depends on globals from script.js (fetchLive, parse, SKILLS, t, fmt, etc.)
 */

/* ── Constants ─────────────────────────────────────────────────────── */

const LK_HISTORY_KEY = "rs3lb-lookup-history";
const LK_MAX_HISTORY = 5;
const LK_MAX_ACTIVITIES = 20;

/* Category colours for skill progress bars */
const CAT_COLORS = {
  combat:   "#e74c3c",
  gather:   "#27ae60",
  artisan:  "#f39c12",
  support:  "#3498db",
  elite:    "#9b59b6",
};

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

  /* Bind events */
  const input = $("#lk-input");
  const btn   = $("#lk-btn");
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

/* ── Fetch & render full profile ───────────────────────────────────── */

async function doLookup(rsn) {
  const status  = $("#lk-status");
  const results = $("#lk-results");
  results.innerHTML = "";
  status.innerHTML = `<div class="lk-spinner"></div>`;

  try {
    const data = await fetchLive(rsn);
    if (!data || data.error) throw new Error(data?.error || t("lookupError"));

    lkSaveToHistory(rsn);
    lkRenderHistory();
    status.innerHTML = "";
    results.innerHTML = lkBuildBackBtn() +
      lkBuildProfileCard(data) +
      lkBuildSkillsGrid(data) +
      lkBuildActivities(data) +
      lkBuildQuestSummary(data);

    /* Back-to-search button */
    $("#lk-back-btn")?.addEventListener("click", () => {
      results.innerHTML = "";
      $("#lk-input").value = "";
    });
  } catch (err) {
    status.innerHTML = `<p class="lk-error">${esc(err.message)}</p>`;
  }
}

/* ── History pills ─────────────────────────────────────────────────── */

function lkRenderHistory() {
  const wrap = $("#lk-history");
  if (!wrap) return;
  const hist = lkGetHistory();
  if (!hist.length) { wrap.innerHTML = ""; return; }
  wrap.innerHTML = hist.map(h =>
    `<button class="pill lk-hist-pill" data-rsn="${esc(h)}">${esc(h)}</button>`
  ).join("");
  wrap.querySelectorAll(".lk-hist-pill").forEach(btn => {
    btn.addEventListener("click", () => lkTriggerSearch(btn.dataset.rsn));
  });
}

/* ── Back button ───────────────────────────────────────────────────── */

function lkBuildBackBtn() {
  return `<button id="lk-back-btn" class="pill lk-back">&larr; ${esc(t("lookupBack"))}</button>`;
}

/* ── Profile card ──────────────────────────────────────────────────── */

function lkBuildProfileCard(p) {
  const stats = [
    { label: t("combatLevel"),  val: p.combatlevel ?? "—" },
    { label: t("totalLevel"),   val: fmt(p.totalskill ?? 0) },
    { label: t("totalXP"),      val: fmtShort(p.totalxp ?? 0) },
    { label: t("rank"),         val: p.rank ? fmt(p.rank) : "—" },
    { label: t("questsDone"),   val: `${p.questscomplete ?? 0}/${p.queststotal ?? 0}` },
    { label: t("runeScore"),    val: fmt(p.runescore ?? 0) },
  ];

  return `
    <div class="p-card lk-profile">
      <h2 class="lk-name">${esc(p.name)}</h2>
      <div class="p-stats">
        ${stats.map(s => `
          <div class="p-stat">
            <span class="p-stat-val">${esc(String(s.val))}</span>
            <span class="p-stat-label">${esc(s.label)}</span>
          </div>`).join("")}
      </div>
    </div>`;
}

/* ── Skills grid ───────────────────────────────────────────────────── */

function lkBuildSkillsGrid(p) {
  const skills = p.skillvalues || [];
  const rows = SKILLS.map(sk => {
    const sv  = skills.find(s => s.id === sk.id) || {};
    const lvl = sv.level ?? 1;
    const xp  = sv.xp != null ? sv.xp * 10 : 0; // RuneMetrics XP is /10
    const prog = xpToNextLevel(xp, lvl, sk.max);
    const color = CAT_COLORS[sk.cat] || "#888";

    return `
      <div class="skill-row">
        <div class="sk-name-col">
          <span class="sk-icon" style="background-color:${color}"></span>
          <span class="sk-name">${esc(tSkill(sk.id))}</span>
        </div>
        <div class="sk-player-col">
          <span class="sk-level">${lvl}</span>
          <span class="sk-xp">${fmtShort(xp)}</span>
          <div class="sk-bar">
            <div class="sk-bar-fill" style="width:${prog.pct}%;background:${color}"></div>
          </div>
        </div>
      </div>`;
  });

  return `
    <div class="lk-section">
      <h3>${esc(t("skills"))}</h3>
      <div class="lk-skills-grid">${rows.join("")}</div>
    </div>`;
}

/* ── Recent activities ─────────────────────────────────────────────── */

function lkBuildActivities(p) {
  const acts = (p.activities || []).slice(0, LK_MAX_ACTIVITIES);
  if (!acts.length) return "";

  const items = acts.map(a => {
    const type = classifyActivity(a.text);
    const icon = ACT_ICONS[type] || ACT_ICONS.default || "⬥";
    const text = localizeActivity(a.text);
    const time = fmtTime(a.date);

    return `
      <div class="act-item">
        <span class="act-dot">${icon}</span>
        <div class="act-body">
          <span class="act-text">${esc(text)}</span>
          <span class="act-time">${esc(time)}</span>
        </div>
      </div>`;
  });

  return `
    <div class="lk-section">
      <h3>${esc(t("recentActivity"))}</h3>
      <div class="lk-activities">${items.join("")}</div>
    </div>`;
}

/* ── Quest summary ─────────────────────────────────────────────────── */

function lkBuildQuestSummary(p) {
  const done    = p.questscomplete  ?? 0;
  const started = p.questsstarted   ?? 0;
  const notDone = p.questsnotstarted ?? 0;
  const total   = p.queststotal     ?? (done + started + notDone);
  const pct     = total ? Math.round((done / total) * 100) : 0;

  const segments = [
    { label: t("questsCompleted"),  count: done,    cls: "lk-q-done" },
    { label: t("questsStarted"),    count: started, cls: "lk-q-started" },
    { label: t("questsNotStarted"), count: notDone, cls: "lk-q-not" },
  ];

  return `
    <div class="lk-section">
      <h3>${esc(t("quests"))}</h3>
      <div class="lk-quest-bar-wrap">
        <div class="lk-quest-bar">
          <div class="lk-q-done"    style="width:${total ? (done/total)*100 : 0}%"></div>
          <div class="lk-q-started" style="width:${total ? (started/total)*100 : 0}%"></div>
        </div>
        <span class="lk-quest-pct">${pct}%</span>
      </div>
      <div class="lk-quest-counts">
        ${segments.map(s => `
          <span class="lk-quest-stat">
            <span class="${s.cls}-dot"></span>
            ${esc(s.label)}: <strong>${s.count}</strong>
          </span>`).join("")}
      </div>
    </div>`;
}
