/* =============================================
   RS3 Leaderboard — script.js
   i18n, tabs, cache-first, Easter event
   ============================================= */

const PLAYERS = ["Fiorovizk", "Decxus"];
const REFRESH_MS = 5 * 60 * 1000;

const API = {
  profile: (n) =>
    `https://apps.runescape.com/runemetrics/profile/profile?user=${enc(n)}&activities=20`,
  hiscores: (n) =>
    `https://secure.runescape.com/m=hiscore/index_lite.json?player=${enc(n)}`,
  quests: (n) => `https://apps.runescape.com/runemetrics/quests?user=${enc(n)}`,
};
const CACHE = {
  profile: (n) => `data/${n.toLowerCase()}_profile.json`,
  hiscores: (n) => `data/${n.toLowerCase()}_hiscores.json`,
  quests: (n) => `data/${n.toLowerCase()}_quests.json`,
  meta: "data/meta.json",
};
function enc(s) {
  return encodeURIComponent(s);
}

// ---- RS3 Skill Icons from Wiki ----
const SKILL_NAMES_EN = {
  0:'Attack',1:'Defence',2:'Strength',3:'Constitution',4:'Ranged',5:'Prayer',
  6:'Magic',7:'Cooking',8:'Woodcutting',9:'Fletching',10:'Fishing',11:'Firemaking',
  12:'Crafting',13:'Smithing',14:'Mining',15:'Herblore',16:'Agility',17:'Thieving',
  18:'Slayer',19:'Farming',20:'Runecrafting',21:'Hunter',22:'Construction',
  23:'Summoning',24:'Dungeoneering',25:'Divination',26:'Invention',27:'Archaeology',28:'Necromancy'
};
function SKILL_ICON(id) {
  const name = SKILL_NAMES_EN[id];
  return name ? `https://runescape.wiki/images/${name}-icon.png` : '';
}
function skillIconImg(id, size) {
  const s = size || 20;
  return `<img src="${SKILL_ICON(id)}" width="${s}" height="${s}" alt="" loading="lazy" style="vertical-align:middle" onerror="this.style.display='none'">`;
}

// ---- Animated Counter ----
function animateCounter(el, from, to, duration) {
  if (!el || from === to) return;
  const start = performance.now();
  const step = (now) => {
    const pct = Math.min((now - start) / (duration || 800), 1);
    const eased = 1 - Math.pow(1 - pct, 3); // ease-out cubic
    const val = Math.round(from + (to - from) * eased);
    el.textContent = val.toLocaleString();
    if (pct < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// ---- Skills ----
const SKILLS = [
  { id: 0, abbr: "ATK", cat: "combat", max: 99 },
  { id: 1, abbr: "DEF", cat: "combat", max: 99 },
  { id: 2, abbr: "STR", cat: "combat", max: 99 },
  { id: 3, abbr: "HP", cat: "combat", max: 99 },
  { id: 4, abbr: "RNG", cat: "combat", max: 99 },
  { id: 5, abbr: "PRA", cat: "combat", max: 99 },
  { id: 6, abbr: "MAG", cat: "combat", max: 99 },
  { id: 7, abbr: "COK", cat: "artisan", max: 99 },
  { id: 8, abbr: "WC", cat: "gathering", max: 99 },
  { id: 9, abbr: "FLE", cat: "artisan", max: 99 },
  { id: 10, abbr: "FSH", cat: "gathering", max: 99 },
  { id: 11, abbr: "FM", cat: "artisan", max: 99 },
  { id: 12, abbr: "CRA", cat: "artisan", max: 99 },
  { id: 13, abbr: "SMI", cat: "artisan", max: 99 },
  { id: 14, abbr: "MIN", cat: "gathering", max: 99 },
  { id: 15, abbr: "HER", cat: "artisan", max: 120 },
  { id: 16, abbr: "AGI", cat: "support", max: 99 },
  { id: 17, abbr: "THI", cat: "support", max: 99 },
  { id: 18, abbr: "SLA", cat: "support", max: 120 },
  { id: 19, abbr: "FAR", cat: "gathering", max: 120 },
  { id: 20, abbr: "RC", cat: "artisan", max: 99 },
  { id: 21, abbr: "HUN", cat: "gathering", max: 99 },
  { id: 22, abbr: "CON", cat: "artisan", max: 99 },
  { id: 23, abbr: "SUM", cat: "support", max: 99 },
  { id: 24, abbr: "DG", cat: "support", max: 120 },
  { id: 25, abbr: "DIV", cat: "gathering", max: 99 },
  { id: 26, abbr: "INV", cat: "support", max: 150 },
  { id: 27, abbr: "ARC", cat: "gathering", max: 120 },
  { id: 28, abbr: "NEC", cat: "combat", max: 120 },
];

// RS3 XP table: xpForLevel[L] = total XP needed for level L (1-150)
const _XP_TABLE = [0];
(function () {
  let total = 0;
  for (let L = 1; L < 150; L++) {
    total += Math.floor(L + 300 * Math.pow(2, L / 7)) / 4;
    _XP_TABLE.push(Math.floor(total));
  }
})();

function xpForLevel(level) {
  if (level <= 1) return 0;
  if (level > 150) return _XP_TABLE[149];
  return _XP_TABLE[level - 1] || 0;
}

function xpToNextLevel(currentXp, currentLevel, maxLevel) {
  if (currentLevel >= maxLevel) return { needed: 0, total: 0, pct: 100 };
  const nextLvlXp = xpForLevel(currentLevel + 1);
  const currLvlXp = xpForLevel(currentLevel);
  const needed = Math.max(0, nextLvlXp - currentXp);
  const levelXpRange = nextLvlXp - currLvlXp;
  const progress =
    levelXpRange > 0
      ? Math.min(100, ((currentXp - currLvlXp) / levelXpRange) * 100)
      : 100;
  return { needed, total: levelXpRange, pct: Math.round(progress) };
}

// ---- Journal Goals ----
const JOURNAL = [
  {
    id: "cb30",
    cat: "combat",
    icon: "\u2694",
    pts: 5,
    check: (p) => p.combatLevel >= 30,
  },
  {
    id: "cb50",
    cat: "combat",
    icon: "\u2694",
    pts: 10,
    check: (p) => p.combatLevel >= 50,
  },
  {
    id: "cb75",
    cat: "combat",
    icon: "\u2694",
    pts: 20,
    check: (p) => p.combatLevel >= 75,
  },
  {
    id: "cb100",
    cat: "combat",
    icon: "\u2694",
    pts: 35,
    check: (p) => p.combatLevel >= 100,
  },
  {
    id: "cb120",
    cat: "combat",
    icon: "\u2694",
    pts: 50,
    check: (p) => p.combatLevel >= 120,
  },
  {
    id: "cb138",
    cat: "combat",
    icon: "\u2694",
    pts: 75,
    check: (p) => p.combatLevel >= 138,
  },
  {
    id: "tl200",
    cat: "skills",
    icon: "\u2B50",
    pts: 5,
    check: (p) => p.totalLevel >= 200,
  },
  {
    id: "tl500",
    cat: "skills",
    icon: "\u2B50",
    pts: 10,
    check: (p) => p.totalLevel >= 500,
  },
  {
    id: "tl750",
    cat: "skills",
    icon: "\u2B50",
    pts: 15,
    check: (p) => p.totalLevel >= 750,
  },
  {
    id: "tl1k",
    cat: "skills",
    icon: "\u2B50",
    pts: 25,
    check: (p) => p.totalLevel >= 1000,
  },
  {
    id: "tl15",
    cat: "skills",
    icon: "\u2B50",
    pts: 40,
    check: (p) => p.totalLevel >= 1500,
  },
  {
    id: "tl2k",
    cat: "skills",
    icon: "\u2B50",
    pts: 60,
    check: (p) => p.totalLevel >= 2000,
  },
  {
    id: "tl25",
    cat: "skills",
    icon: "\u2B50",
    pts: 80,
    check: (p) => p.totalLevel >= 2500,
  },
  {
    id: "first50",
    cat: "skills",
    icon: "\uD83D\uDCAA",
    pts: 10,
    check: (p) => SKILLS.some((s) => (p.skills[s.id] || {}).level >= 50),
  },
  {
    id: "first80",
    cat: "skills",
    icon: "\uD83D\uDCAA",
    pts: 20,
    check: (p) => SKILLS.some((s) => (p.skills[s.id] || {}).level >= 80),
  },
  {
    id: "first99",
    cat: "skills",
    icon: "\uD83D\uDCAA",
    pts: 40,
    check: (p) => SKILLS.some((s) => (p.skills[s.id] || {}).level >= 99),
  },
  {
    id: "all30",
    cat: "skills",
    icon: "\uD83C\uDFAF",
    pts: 25,
    check: (p) => SKILLS.every((s) => (p.skills[s.id] || {}).level >= 30),
  },
  {
    id: "all50",
    cat: "skills",
    icon: "\uD83C\uDFAF",
    pts: 50,
    check: (p) => SKILLS.every((s) => (p.skills[s.id] || {}).level >= 50),
  },
  {
    id: "xp100k",
    cat: "xp",
    icon: "\uD83D\uDCB0",
    pts: 5,
    check: (p) => p.totalXp >= 100000,
  },
  {
    id: "xp1m",
    cat: "xp",
    icon: "\uD83D\uDCB0",
    pts: 10,
    check: (p) => p.totalXp >= 1000000,
  },
  {
    id: "xp5m",
    cat: "xp",
    icon: "\uD83D\uDCB0",
    pts: 20,
    check: (p) => p.totalXp >= 5000000,
  },
  {
    id: "xp10m",
    cat: "xp",
    icon: "\uD83D\uDCB0",
    pts: 30,
    check: (p) => p.totalXp >= 10000000,
  },
  {
    id: "xp50m",
    cat: "xp",
    icon: "\uD83D\uDCB0",
    pts: 45,
    check: (p) => p.totalXp >= 50000000,
  },
  {
    id: "xp100m",
    cat: "xp",
    icon: "\uD83D\uDCB0",
    pts: 60,
    check: (p) => p.totalXp >= 100000000,
  },
  {
    id: "q1",
    cat: "quests",
    icon: "\uD83D\uDCDC",
    pts: 5,
    check: (p) => p.questsDone >= 1,
  },
  {
    id: "q10",
    cat: "quests",
    icon: "\uD83D\uDCDC",
    pts: 10,
    check: (p) => p.questsDone >= 10,
  },
  {
    id: "q25",
    cat: "quests",
    icon: "\uD83D\uDCDC",
    pts: 20,
    check: (p) => p.questsDone >= 25,
  },
  {
    id: "q50",
    cat: "quests",
    icon: "\uD83D\uDCDC",
    pts: 35,
    check: (p) => p.questsDone >= 50,
  },
  {
    id: "q100",
    cat: "quests",
    icon: "\uD83D\uDCDC",
    pts: 55,
    check: (p) => p.questsDone >= 100,
  },
  {
    id: "q200",
    cat: "quests",
    icon: "\uD83D\uDCDC",
    pts: 80,
    check: (p) => p.questsDone >= 200,
  },
  {
    id: "qds",
    cat: "quests",
    icon: "\uD83D\uDC09",
    pts: 15,
    check: (p) => hasQuest(p, "Dragon Slayer"),
  },
  {
    id: "qnec",
    cat: "quests",
    icon: "\uD83D\uDC80",
    pts: 10,
    check: (p) => hasQuest(p, "Necromancy!"),
  },
  {
    id: "qww",
    cat: "quests",
    icon: "\uD83D\uDC3A",
    pts: 8,
    check: (p) => hasQuest(p, "Wolf Whistle"),
  },
  {
    id: "qhg",
    cat: "quests",
    icon: "\uD83C\uDFC6",
    pts: 12,
    check: (p) => hasQuest(p, "Holy Grail"),
  },
  {
    id: "qrm",
    cat: "quests",
    icon: "\uD83D\uDC8E",
    pts: 8,
    check: (p) => hasQuest(p, "Rune Mysteries"),
  },
  {
    id: "all70",
    cat: "skills",
    icon: "🎯",
    pts: 70,
    check: (p) => SKILLS.every((s) => (p.skills[s.id] || {}).level >= 70),
  },
  {
    id: "first120",
    cat: "skills",
    icon: "🌟",
    pts: 80,
    check: (p) => SKILLS.some((s) => (p.skills[s.id] || {}).level >= 120),
  },
  {
    id: "qcape",
    cat: "quests",
    icon: "👑",
    pts: 100,
    check: (p) => p.questsDone >= p.totalQuests,
  },
  {
    id: "rs1k",
    cat: "xp",
    icon: "🏅",
    pts: 25,
    check: (p) => p.runeScore >= 1000,
  },
  {
    id: "rs5k",
    cat: "xp",
    icon: "🏅",
    pts: 50,
    check: (p) => p.runeScore >= 5000,
  },
  {
    id: "xp250m",
    cat: "xp",
    icon: "💰",
    pts: 75,
    check: (p) => p.totalXp >= 250000000,
  },
  {
    id: "xp500m",
    cat: "xp",
    icon: "💰",
    pts: 90,
    check: (p) => p.totalXp >= 500000000,
  },
  {
    id: "qpe",
    cat: "quests",
    icon: "🌍",
    pts: 15,
    check: (p) => hasQuest(p, "Plague's End"),
  },
  {
    id: "qwgs",
    cat: "quests",
    icon: "⚡",
    pts: 20,
    check: (p) => hasQuest(p, "While Guthix Sleeps"),
  },
  {
    id: "qww2",
    cat: "quests",
    icon: "🌅",
    pts: 15,
    check: (p) => hasQuest(p, "The World Wakes"),
  },
];
function hasQuest(p, name) {
  return p.questList.some((q) => q.title === name && q.status === "COMPLETED");
}
const MAX_PTS = JOURNAL.reduce((a, g) => a + g.pts, 0);

// ---- State ----
let data = [];
let source = "";
let timer = null;
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

// ---- Fetch ----
// ---- Fetch helpers with proper timeout cleanup ----
function fetchWithTimeout(url, opts, ms) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms || 10000);
  return fetch(url, { ...opts, signal: ctrl.signal })
    .then(r => { clearTimeout(timer); return r; })
    .catch(e => { clearTimeout(timer); throw e; });
}

async function directFetch(url) {
  const r = await fetchWithTimeout(url, {}, 10000);
  if (!r.ok) throw new Error("fetch_fail");
  return r.json();
}

async function proxyFetch(url) {
  const proxy = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
  const r = await fetchWithTimeout(proxy, {}, 8000);
  if (!r.ok) throw new Error("proxy_fail");
  const wrapper = await r.json();
  if (!wrapper.contents) throw new Error("proxy_empty");
  return JSON.parse(wrapper.contents);
}

async function liveFetch(url) {
  // Try direct first (works locally), fall back to proxy (works on GitHub Pages)
  try { return await directFetch(url); }
  catch { return await proxyFetch(url); }
}

async function cacheFetch(path) {
  const r = await fetchWithTimeout(path, {}, 6000);
  if (!r.ok) throw new Error("cache_miss");
  return r.json();
}

// ---- In-memory data cache ----
let _memCache = {}; // keyed by player name → parsed player object
let _memCacheTime = 0;
const MEM_CACHE_TTL = 4.5 * 60 * 1000; // 4.5 min (just under REFRESH_MS)

function memCacheGet(name) {
  if (Date.now() - _memCacheTime > MEM_CACHE_TTL) return null;
  return _memCache[name] || null;
}

function memCacheSet(results) {
  _memCache = Object.fromEntries(PLAYERS.map((n, i) => [n, results[i]]));
  _memCacheTime = Date.now();
}

function parse(profile, hiscores, quests) {
  if (profile.error) throw new Error(profile.error);
  const skills = {};
  for (const s of profile.skillvalues || [])
    skills[s.id] = { level: s.level, xp: Math.floor(s.xp / 10), rank: s.rank };
  let runeScore = 0;
  const clues = { easy: 0, medium: 0, hard: 0, elite: 0, master: 0 };
  if (hiscores?.activities) {
    for (const a of hiscores.activities) {
      if (a.name === "RuneScore") runeScore = a.score;
      const m = a.name.match(/Clue Scrolls \((\w+)\)/);
      if (m && m[1] in clues) clues[m[1]] = a.score;
    }
  }
  return {
    name: profile.name,
    rank: profile.rank,
    totalLevel: profile.totalskill,
    totalXp: profile.totalxp,
    combatLevel: profile.combatlevel,
    melee: profile.melee,
    magic: profile.magic,
    ranged: profile.ranged,
    questsDone: profile.questscomplete,
    questsStarted: profile.questsstarted,
    questsNone: profile.questsnotstarted,
    totalQuests:
      profile.questscomplete + profile.questsstarted + profile.questsnotstarted,
    activities: profile.activities || [],
    skills,
    runeScore,
    clues,
    questList: quests?.quests || [],
    questPoints: (quests?.quests || []).reduce(
      (sum, q) => sum + (q.status === "COMPLETED" ? q.questPoints || 0 : 0),
      0,
    ),
  };
}
async function fetchLive(n) {
  const [p, h, q] = await Promise.allSettled([
    liveFetch(API.profile(n)),
    liveFetch(API.hiscores(n)),
    liveFetch(API.quests(n)),
  ]);
  if (p.status === "rejected") throw new Error("live_fail");
  return parse(
    p.value,
    h.status === "fulfilled" ? h.value : null,
    q.status === "fulfilled" ? q.value : null,
  );
}
async function fetchCached(n) {
  const [p, h, q] = await Promise.allSettled([
    cacheFetch(CACHE.profile(n)),
    cacheFetch(CACHE.hiscores(n)),
    cacheFetch(CACHE.quests(n)),
  ]);
  if (p.status === "rejected") throw new Error("cache_fail");
  return parse(
    p.value,
    h.status === "fulfilled" ? h.value : null,
    q.status === "fulfilled" ? q.value : null,
  );
}

// ---- Formatting ----
function fmt(n) {
  return n == null ? "\u2014" : n.toLocaleString("en-US");
}
function fmtShort(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return String(n);
}
const _ESC = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};
function esc(s) {
  return s == null ? "" : String(s).replace(/[&<>"']/g, (c) => _ESC[c]);
}
const SWORD =
  '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m14.5 17.5 3 3 4-4-3-3"/><path d="m3 3 7.5 7.5"/><path d="m14.5 6.5 4-4"/><path d="M18.5 2.5 22 6"/><path d="m2 22 5.5-5.5"/><path d="m6.5 17.5-3-3"/></svg>';

// ---- Render: Player Cards (Character Sheet style) ----
function renderCards(players) {
  $("#player-cards").innerHTML = players
    .map((p, i) => {
      const c = i === 0 ? "p1" : "p2";
      const other = players[1 - i];
      let ahead = 0;
      SKILLS.forEach((sk) => {
        if (((p.skills[sk.id] || {}).xp || 0) > ((other.skills[sk.id] || {}).xp || 0)) ahead++;
      });
      const totalClues = Object.values(p.clues).reduce((a, b) => a + b, 0);
      const topSkills = SKILLS
        .map(sk => ({ sk, lvl: (p.skills[sk.id] || {}).level || 1 }))
        .sort((a, b) => b.lvl - a.lvl)
        .slice(0, 3);
      const lowest = SKILLS
        .map(sk => ({ sk, lvl: (p.skills[sk.id] || {}).level || 1 }))
        .sort((a, b) => a.lvl - b.lvl)[0];

      return `
      <div class="p-card ${c}">
        <div class="p-card-name">${esc(p.name)}</div>
        <div class="p-card-combat-shield">${t("combat")} ${p.combatLevel} &middot; ${t("overallRank")} #${esc(p.rank)}</div>
        <div class="p-card-skills-preview">
          ${topSkills.map(s => `<span class="skill-preview-item">${skillIconImg(s.sk.id, 16)}<span class="sp-level">${s.lvl}</span><span class="sp-name">${tSkill(s.sk.id)}</span></span>`).join("")}
          <span class="skill-preview-item"><span class="sp-level sp-low">${lowest.lvl}</span><span class="sp-name">${tSkill(lowest.sk.id)}</span></span>
        </div>
        <div class="p-stats">
          <div class="stat-item"><span class="stat-val" data-counter="${p.totalLevel}">${fmt(p.totalLevel)}</span><span class="stat-label">${t("totalLevel")}</span></div>
          <div class="stat-item"><span class="stat-val">${fmtShort(p.totalXp)}</span><span class="stat-label">${t("totalXp")}</span></div>
          <div class="stat-item"><span class="stat-val">${fmt(p.runeScore)}</span><span class="stat-label">${t("runeScore")}</span></div>
          <div class="stat-item"><span class="stat-val">${p.questsDone}/${p.totalQuests}</span><span class="stat-label">${t("questsDone")}</span></div>
          <div class="stat-item"><span class="stat-val">${totalClues}</span><span class="stat-label">${t("clueScrolls")}</span></div>
          <div class="stat-item"><span class="stat-val">${ahead}/${SKILLS.length}</span><span class="stat-label">${t("skillsAhead")}</span></div>
        </div>
      </div>`;
    })
    .join("");
}

// ---- Render: H2H ----
function renderH2H(players) {
  const [a, b] = players;
  const lang = currentLang;
  const rows = [
    { label: t("totalLevel"), v1: a.totalLevel, v2: b.totalLevel },
    { label: t("totalXp"), v1: a.totalXp, v2: b.totalXp },
    { label: t("combat"), v1: a.combatLevel, v2: b.combatLevel },
    { label: t("questsDone"), v1: a.questsDone, v2: b.questsDone },
    { label: t("runeScore"), v1: a.runeScore, v2: b.runeScore },
    {
      label: t("combatXp"),
      v1: a.melee + a.magic + a.ranged,
      v2: b.melee + b.magic + b.ranged,
    },
    {
      label: t("clueScrollsLabel"),
      v1: Object.values(a.clues).reduce((s, v) => s + v, 0),
      v2: Object.values(b.clues).reduce((s, v) => s + v, 0),
    },
    {
      label: t("skills50plus"),
      v1: SKILLS.filter((sk) => ((a.skills[sk.id] || {}).level || 0) >= 50)
        .length,
      v2: SKILLS.filter((sk) => ((b.skills[sk.id] || {}).level || 0) >= 50)
        .length,
    },
  ];

  const winsA = rows.filter((r) => r.v1 > r.v2).length;
  const winsB = rows.filter((r) => r.v2 > r.v1).length;
  const verdict =
    winsA > winsB
      ? a.name
      : winsB > winsA
        ? b.name
        : lang === "pt"
          ? "Empate"
          : "Tied";

  $("#h2h-container").innerHTML = `
    <div class="h2h-header"><div class="h2h-name p1" style="text-align:right">${esc(a.name)}</div><div></div><div class="h2h-name p2">${esc(b.name)}</div></div>
    ${rows
      .map((r) => {
        const mx = Math.max(r.v1, r.v2, 1);
        return `
      <div class="h2h-row">
        <div class="h2h-bar-wrap left${r.v1 >= r.v2 ? " winner" : ""}"><div class="h2h-bar" style="width:${(r.v1 / mx) * 100}%"></div><div class="h2h-val">${fmt(r.v1)}</div></div>
        <div class="h2h-label">${r.label}</div>
        <div class="h2h-bar-wrap right${r.v2 >= r.v1 ? " winner" : ""}"><div class="h2h-bar" style="width:${(r.v2 / mx) * 100}%"></div><div class="h2h-val">${fmt(r.v2)}</div></div>
      </div>`;
      })
      .join("")}
    <div style="text-align:center;margin-top:8px;font-size:0.72rem;color:var(--text-3)">
      ${t("verdict")}: <strong style="color:${winsA > winsB ? "var(--gold)" : winsB > winsA ? "var(--teal)" : "var(--text-2)"}">${esc(verdict)}</strong>
      (${winsA}-${winsB})
    </div>`;
}

// ---- Render: Skills ----
function renderSkills(players) {
  const [a, b] = players;
  $("#legend-p1").textContent = a.name;
  $("#legend-p2").textContent = b.name;
  $("#skills-grid").innerHTML = SKILLS.map((sk) => {
    const s1 = a.skills[sk.id] || { level: 1, xp: 0 },
      s2 = b.skills[sk.id] || { level: 1, xp: 0 };
    const a1 = s1.xp > s2.xp ? "ahead" : s1.xp < s2.xp ? "behind" : "tied";
    const a2 = s2.xp > s1.xp ? "ahead" : s2.xp < s1.xp ? "behind" : "tied";
    const prog1 = xpToNextLevel(s1.xp, s1.level, sk.max);
    const prog2 = xpToNextLevel(s2.xp, s2.level, sk.max);
    const lang = currentLang;
    const toNextLabel = (p, lvl, max) => {
      if (lvl >= max) return t("maxed");
      return `${fmt(p.needed)} → ${lvl + 1}`;
    };
    return `
      <div class="skill-row" data-cat="${sk.cat}">
        <div class="sk-name-col"><div class="sk-icon ${sk.cat}">${skillIconImg(sk.id, 22)}</div><div class="sk-name">${tSkill(sk.id)}</div></div>
        <div class="sk-player-col">
          <div class="sk-level ${a1}">${s1.level}</div>
          <div class="sk-xp">${fmt(s1.xp)} ${t("xp")}</div>
          <div class="sk-to-next">${toNextLabel(prog1, s1.level, sk.max)}</div>
          <div class="sk-bar"><div class="sk-bar-fill p1" style="width:${prog1.pct}%"></div></div>
        </div>
        <div class="sk-player-col">
          <div class="sk-level ${a2}">${s2.level}</div>
          <div class="sk-xp">${fmt(s2.xp)} ${t("xp")}</div>
          <div class="sk-to-next">${toNextLabel(prog2, s2.level, sk.max)}</div>
          <div class="sk-bar"><div class="sk-bar-fill p2" style="width:${prog2.pct}%"></div></div>
        </div>
      </div>`;
  }).join("");
}

// ---- Activity classification ----
function classifyActivity(text) {
  if (!text) return "other";
  if (/Levelled up|I levelled/i.test(text)) return "levelup";
  if (/Quest complete/i.test(text)) return "quest";
  if (/I killed|I defeated|boss/i.test(text)) return "boss";
  if (/Dungeon floor|breached floor/i.test(text)) return "dungeon";
  return "other";
}

const ACT_ICONS = {
  levelup: "⬆️",
  quest: "📜",
  boss: "⚔️",
  dungeon: "🏰",
  other: "💬",
};

// ---- Render: Activity ----
function renderActivity(players) {
  const all = [];
  players.forEach((p, i) => {
    for (const a of p.activities)
      all.push({
        ...a,
        player: p.name,
        pi: i,
        ts: parseDate(a.date),
        type: classifyActivity(a.text),
      });
  });
  all.sort((a, b) => b.ts - a.ts);
  $("#activity-count").textContent = all.length;

  if (!all.length) {
    $("#activity-feed").innerHTML =
      `<div style="text-align:center;color:var(--text-3);padding:24px">${t("noActivity")}</div>`;
    return;
  }
  const FEED_PAGE = 10;
  const feed = $("#activity-feed");
  const renderItem = (a) => {
    const c = a.pi === 0 ? "p1" : "p2";
    return `<div class="feed-item" data-atype="${a.type}">
      <div class="feed-icon">${ACT_ICONS[a.type] || ""}</div>
      <div class="feed-body">
        <span class="feed-player ${c}">${esc(a.player)}</span> <span class="feed-text">${esc(localizeActivity(a.text))}</span>
        ${a.details ? `<div class="feed-details">${esc(localizeActivity(a.details))}</div>` : ""}
      </div>
      <div class="feed-time">${fmtTime(a.date)}</div>
    </div>`;
  };
  let shown = FEED_PAGE;
  feed.innerHTML = all.slice(0, shown).map(renderItem).join("")
    + (all.length > shown ? `<button class="pill feed-more" style="display:block;margin:10px auto;padding:6px 20px">${currentLang === "pt" ? "Mostrar mais" : "Show more"} (${all.length - shown})</button>` : "");

  feed.addEventListener("click", function handler(e) {
    const btn = e.target.closest(".feed-more");
    if (!btn) return;
    const next = Math.min(shown + FEED_PAGE, all.length);
    const frag = all.slice(shown, next).map(renderItem).join("");
    btn.insertAdjacentHTML("beforebegin", frag);
    shown = next;
    if (shown >= all.length) btn.remove();
    else btn.textContent = `${currentLang === "pt" ? "Mostrar mais" : "Show more"} (${all.length - shown})`;
    // Re-apply active filter
    const activeFilter = document.querySelector("#activity-filters .pill.active");
    if (activeFilter && activeFilter.dataset.afilter !== "all") {
      $$(".feed-item").forEach(r => r.classList.toggle("hidden", r.dataset.atype !== activeFilter.dataset.afilter));
    }
  });
}

// ---- Render: Quests ----
function renderQuests(players) {
  const [a, b] = players;
  const lang = currentLang;

  // Build quest map: merge both players' quest lists
  const questMap = new Map();
  for (const p of players) {
    for (const q of p.questList) {
      if (!questMap.has(q.title)) questMap.set(q.title, { ...q, statuses: [] });
      questMap.get(q.title).statuses.push(q.status);
    }
  }

  // Summary cards with quest points
  const qpA = a.questPoints || 0;
  const qpB = b.questPoints || 0;

  $("#quest-cards").innerHTML = players
    .map((p, i) => {
      const c = i === 0 ? "p1" : "p2";
      const qp = i === 0 ? qpA : qpB;
      const total = p.totalQuests || 1;
      return `<div class="q-card ${c} fade-in">
      <div class="q-header"><div class="q-name">${esc(p.name)}</div><div class="q-pct">${Math.round((p.questsDone / total) * 100)}%</div></div>
      <div class="q-bar"><div class="q-bar-fill done" style="width:${(p.questsDone / total) * 100}%"></div><div class="q-bar-fill started" style="width:${(p.questsStarted / total) * 100}%"></div></div>
      <div class="q-stats">
        <div class="q-stat"><div class="q-stat-val done">${p.questsDone}</div><div class="q-stat-lbl">${t("complete")}</div></div>
        <div class="q-stat"><div class="q-stat-val started">${p.questsStarted}</div><div class="q-stat-lbl">${t("started")}</div></div>
        <div class="q-stat"><div class="q-stat-val none">${p.questsNone}</div><div class="q-stat-lbl">${t("remaining")}</div></div>
      </div>
      <div style="margin-top:10px;text-align:center;font-size:0.72rem;color:var(--text-3)">
        <span style="font-family:var(--font-mono);font-weight:700;color:${i === 0 ? "var(--gold)" : "var(--teal)"}">${qp}</span> ${t("questPoints")}
      </div>
    </div>`;
    })
    .join("");

  // Quest list
  const quests = Array.from(questMap.values()).sort((x, y) =>
    x.title.localeCompare(y.title),
  );
  const diffStars = (d) => "\u2605".repeat(Math.min(d, 5)) || "\u2606";
  const statusClass = (s) =>
    s === "COMPLETED" ? "done" : s === "STARTED" ? "started" : "none";
  const statusIcon = (s) =>
    s === "COMPLETED" ? "\u2713" : s === "STARTED" ? "~" : "";

  const getQCat = (q) => {
    const s0 = q.statuses[0] || "NOT_STARTED";
    const s1 = q.statuses[1] || "NOT_STARTED";
    if (s0 === "COMPLETED" && s1 === "COMPLETED") return "both-done";
    if (s0 === "COMPLETED" || s1 === "COMPLETED") return "one-done";
    if (s0 === "STARTED" || s1 === "STARTED") return "in-progress";
    return "none";
  };

  // For "do next" we want quests where exactly one player completed it
  const doNextQuests = quests.filter((q) => {
    const s0 = q.statuses[0] || "NOT_STARTED";
    const s1 = q.statuses[1] || "NOT_STARTED";
    return (s0 === "COMPLETED") !== (s1 === "COMPLETED");
  });

  const questListEl = document.getElementById("quest-list");
  if (questListEl) {
    questListEl.innerHTML = quests
      .map((q) => {
        const cat = getQCat(q);
        const isDN = doNextQuests.includes(q);
        const wikiUrl = `https://runescape.wiki/w/${encodeURIComponent(q.title.replace(/ /g, "_"))}`;
        return `<div class="ql-row" data-qcat="${cat}${isDN ? " do-next" : ""}">
        <div class="ql-name"><a href="${wikiUrl}" target="_blank" rel="noopener">${esc(q.title)}</a>
          <span class="ql-diff">${diffStars(q.difficulty)}</span>
          ${q.members ? '<span class="ql-members">P2P</span>' : ""}
        </div>
        ${q.questPoints ? `<div class="ql-pts">${q.questPoints}QP</div>` : "<div></div>"}
        <div class="ql-statuses">
          <div class="ql-status ${statusClass(q.statuses[0] || "NOT_STARTED")}" title="${esc(a.name)}">${statusIcon(q.statuses[0] || "NOT_STARTED")}</div>
          <div class="ql-status ${statusClass(q.statuses[1] || "NOT_STARTED")}" title="${esc(b.name)}">${statusIcon(q.statuses[1] || "NOT_STARTED")}</div>
        </div>
      </div>`;
      })
      .join("");
  }

  // Recommendations
  const recA = doNextQuests
    .filter(
      (q) => q.statuses[1] === "COMPLETED" && q.statuses[0] !== "COMPLETED",
    )
    .sort((x, y) => x.difficulty - y.difficulty)
    .slice(0, 5);
  const recB = doNextQuests
    .filter(
      (q) => q.statuses[0] === "COMPLETED" && q.statuses[1] !== "COMPLETED",
    )
    .sort((x, y) => x.difficulty - y.difficulty)
    .slice(0, 5);

  let recHtml = "";
  if (recA.length || recB.length) {
    recHtml = `<div class="ql-recommend"><h3>\uD83D\uDCDC ${t("questsRecommended")}</h3><div class="ql-recommend-list">`;
    for (const q of recA)
      recHtml += `<div class="ql-rec-item"><span class="ql-rec-player p1">${esc(a.name)}</span>${esc(q.title)} <span class="ql-diff">${diffStars(q.difficulty)}</span></div>`;
    for (const q of recB)
      recHtml += `<div class="ql-rec-item"><span class="ql-rec-player p2">${esc(b.name)}</span>${esc(q.title)} <span class="ql-diff">${diffStars(q.difficulty)}</span></div>`;
    recHtml += "</div></div>";
  }

  // Append recommendations after quest list
  const existingRec = document.getElementById("quest-recommend");
  if (existingRec) existingRec.remove();
  if (recHtml) {
    const div = document.createElement("div");
    div.id = "quest-recommend";
    div.innerHTML = recHtml;
    const questPage = document.querySelector('[data-page="quests"]');
    if (questPage) questPage.appendChild(div);
  }
}

// ---- Render: Journal ----
function renderJournal(players, targetScores, targetGrid) {
  const scores = players.map((p) => {
    let tot = 0,
      done = 0;
    JOURNAL.forEach((g) => {
      if (g.check(p)) {
        tot += g.pts;
        done++;
      }
    });
    return { tot, done };
  });
  $(targetScores).innerHTML = players
    .map((p, i) => {
      const c = i === 0 ? "p1" : "p2";
      const s = scores[i];
      return `<div class="j-score-card ${c} fade-in"><div class="j-score-name">${esc(p.name)}</div>
      <div class="j-score-value">${s.tot}</div>
      <div class="j-score-sub">${s.done}/${JOURNAL.length} ${t("goals")} \u00b7 ${MAX_PTS} ${t("max")}</div>
      <div class="j-score-bar"><div class="j-score-bar-fill" style="width:${(s.tot / MAX_PTS) * 100}%"></div></div></div>`;
    })
    .join("");

  if (!targetGrid) return;
  $(targetGrid).innerHTML = JOURNAL.map((g) => {
    const j = tJournal(g.id);
    const p1d = g.check(players[0]);
    const p2d = g.check(players[1]);
    return `<div class="j-row" data-jcat="${g.cat}"><div class="j-info">
      <div class="j-title"><span class="j-title-icon">${g.icon}</span>${j.title}</div><div class="j-desc">${j.desc}</div></div>
      <div class="j-pts">${g.pts} ${t("pts")}</div>
      <div class="j-checks">
        <div class="j-check p1-color${p1d ? " done" : ""}" title="${players[0].name}">${p1d ? "\u2713" : ""}</div>
        <div class="j-check p2-color${p2d ? " done" : ""}" title="${players[1].name}">${p2d ? "\u2713" : ""}</div>
      </div></div>`;
  }).join("");
}

// ---- Utils ----
function parseDate(s) {
  if (!s) return 0;
  const d = new Date(s.replace(/-/g, " "));
  return isNaN(d) ? 0 : d.getTime();
}
function fmtTime(s) {
  if (!s) return "";
  const m = s.match(/^(\d+)-(\w+)-\d+\s+(.+)$/);
  return m ? `${m[2]} ${m[1]}, ${m[3]}` : s;
}

// Translate activity text by replacing English skill names with localized ones
const EN_SKILL_NAMES = [
  "Attack",
  "Defence",
  "Strength",
  "Constitution",
  "Ranged",
  "Prayer",
  "Magic",
  "Cooking",
  "Woodcutting",
  "Fletching",
  "Fishing",
  "Firemaking",
  "Crafting",
  "Smithing",
  "Mining",
  "Herblore",
  "Agility",
  "Thieving",
  "Slayer",
  "Farming",
  "Runecrafting",
  "Hunter",
  "Construction",
  "Summoning",
  "Dungeoneering",
  "Divination",
  "Invention",
  "Archaeology",
  "Necromancy",
];
const _SKILL_RX = EN_SKILL_NAMES.map((en, i) => ({
  rx: new RegExp("\\b" + en + "\\b", "g"),
  id: i,
}));
const _PHRASE_RX = [
  [/Levelled up/g, "Subiu de n\u00edvel em"],
  [/Quest complete:/g, "Miss\u00e3o completa:"],
  [/Total levels gained/g, "N\u00edveis totais alcan\u00e7ados"],
  [/I levelled my/g, "Subi n\u00edvel em"],
  [/skill, I am now level/g, ", agora estou no n\u00edvel"],
  [/I killed (\d+) boss monsters?\s+in/g, "Matei $1 bosses em"],
  [/I killed (\d+) boss monsters?\s+called:/g, "Matei $1 bosses chamados:"],
  [/I killed (\d+) boss monsters?/g, "Matei $1 bosses"],
  [/Dungeon floor (\d+) reached/g, "Andar $1 de Dungeon alcan\u00e7ado"],
  [
    /I have breached floor (\d+) of Daemonheim for the first time/g,
    "Alcancei o andar $1 de Daemonheim pela primeira vez",
  ],
  [/I now have a total level of/g, "Agora tenho um n\u00edvel total de"],
  [
    /split among all my skills/g,
    "distribu\u00eddo entre todas as minhas habilidades",
  ],
  [/I defeated/g, "Derrotei"],
  [/Quest complete$/g, "Miss\u00e3o completa"],
];

function localizeActivity(text) {
  if (currentLang === "en" || !text) return text;
  let out = text;
  for (const { rx, id } of _SKILL_RX) out = out.replace(rx, tSkill(id));
  for (const [rx, rep] of _PHRASE_RX) out = out.replace(rx, rep);
  return out;
}

// ---- UI: update all i18n text ----
function updateUIText() {
  const lang = currentLang;
  const s = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
  const h = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
  const p = (id, text) => { const el = document.getElementById(id); if (el) el.placeholder = text; };

  // Header
  h("logo-text", `RS3 <span class="accent">${t("title").replace("RS3 ", "")}</span>`);
  s("subtitle-text", t("subtitle"));
  s("lang-label", lang === "pt" ? "EN" : "PT");
  document.documentElement.lang = lang === "pt" ? "pt-BR" : "en";
  document.title = t("title") + " \u2014 Fiorovizk & Decxus";

  // Tabs
  s("tab-overview", t("navOverview"));
  s("tab-skills", t("navSkills"));
  s("tab-journal", t("navJournal"));
  s("tab-quests", t("navQuests"));
  s("tab-activity", t("navActivity"));
  h("tab-combat", "\u2694\uFE0F " + t("navCombat"));
  h("tab-money", "\uD83D\uDCB0 " + t("navMoney"));
  h("tab-lookup", "\uD83D\uDD0D " + t("navLookup"));
  h("tab-senntisten", "\u2694\uFE0F " + t("navSenntisten"));
  h("tab-prifddinas", "\uD83C\uDFF0 " + t("navPrifddinas"));

  // Combat section
  h("combat-title", "\u2694\uFE0F " + t("navCombat") + " & Revolution");
  s("combat-notice", t("combatNotice"));
  s("combat-wiki-link", t("combatWikiLink") + " \u2192");

  // Section titles
  s("h2h-title", t("h2hTitle"));
  s("journal-score-title", t("journalTitle"));
  s("skills-title", t("skillsTitle"));
  s("journal-title", t("journalTitle"));
  s("quests-title", t("questsTitle"));
  s("goals-title", "\uD83C\uDFAF " + (lang === "pt" ? "Metas" : "Goals"));
  s("activity-title", t("activityTitle"));
  s("legend-ahead", t("ahead"));
  s("lookup-title", "\uD83D\uDD0D " + t("navLookup"));

  // Skill filters
  s("filter-all", t("all"));
  s("filter-combat", t("catCombat"));
  s("filter-gathering", t("catGathering"));
  s("filter-artisan", t("catArtisan"));
  s("filter-support", t("catSupport"));

  // Journal filters
  s("jfilter-all", t("all"));
  s("jfilter-combat", tJournalCat("combat"));
  s("jfilter-skills", tJournalCat("skills"));
  s("jfilter-quests", tJournalCat("quests"));

  // Quest filters
  s("qfilter-all", t("all"));
  s("qf-both-done", t("qfBothDone"));
  s("qf-one-done", t("qfOneDone"));
  s("qf-do-next", t("qfDoNext"));
  s("qf-in-progress", t("qfInProgress"));

  // Activity filters
  s("af-all", t("all"));
  s("af-levelup", "\u2B06\uFE0F " + t("afLevelups"));
  s("af-quest", "\uD83D\uDCDC " + t("afQuests"));
  s("af-boss", "\u2694\uFE0F " + t("afBosses"));
  s("af-other", "\uD83D\uDCAC " + t("afOther"));

  // Footer
  s("footer-api", t("footerApi"));
  s("footer-refresh", t("footerRefresh"));
  s("loader-text", t("loading"));

  // Easter
  s("easter-title", t("easterTitle"));
  s("easter-sub", "Blooming Burrow \u00b7 30 Mar - 20 " + (lang === "pt" ? "Abr" : "Apr"));

  // Next Steps
  h("nextsteps-title", "\uD83C\uDFAF " + t("nextStepsTitle"));

  // Money
  h("money-title", "\uD83D\uDCB0 " + t("moneyTitle"));
  s("money-disclaimer", t("moneyDisclaimer"));

  // Home grid card labels
  s("hc-goals", lang === "pt" ? "Objetivos" : "Goals");
  s("hc-skills", t("navSkills"));
  s("hc-senntisten", t("navSenntisten"));
  s("hc-prifddinas", t("navPrifddinas"));
  s("hc-lookup", t("navLookup"));
  s("hc-quests", t("navQuests"));
  s("hc-activity", t("navActivity"));
  s("hc-combat", t("navCombat"));
  s("hc-journal", t("navJournal"));
  s("hc-money", t("navMoney"));
  s("home-grid-title", lang === "pt" ? "Explorar" : "Explore");
}

// ---- Navigation: Home Grid + Floating Dock ----
let _navFromPop = false; // flag to prevent pushState during popstate

function launchSection(page) {
  // Alias: overview → dashboard
  if (page === "overview") page = "dashboard";
  // Fallback: unknown pages → dashboard (handles dead hashes like #senntisten, #easter, etc.)
  const validPages = new Set(Array.from($$(".page")).map(p => p.dataset.page));
  if (!validPages.has(page)) page = "dashboard";
  const dock = document.getElementById("dock");

  // Show target page
  $$(".page").forEach((p) => {
    const match = p.dataset.page === page;
    p.classList.toggle("active", match);
  });

  // Update dock active states
  if (dock) {
    dock.classList.add("visible");
    dock.querySelectorAll(".dock-btn").forEach((b) =>
      b.classList.toggle("active", b.dataset.launch === page)
    );
  }

  if (!_navFromPop) history.pushState({ page }, "", "#" + page);

  // Lazy render
  if (page === "lookup") {
    if (!_rendered.has(page)) renderTab(page, data);
  } else if (data.length && !_rendered.has(page)) {
    renderTab(page, data);
  }
}

function initNavigation() {
  $$("[data-launch]").forEach((el) => {
    el.addEventListener("click", () => launchSection(el.dataset.launch));
  });
  const dock = document.getElementById("dock");
  if (dock) {
    dock.classList.add("visible");
    dock.querySelectorAll(".dock-btn").forEach((b) =>
      b.classList.toggle("active", b.dataset.launch === "dashboard")
    );
  }
}
// Alias for backward compat
function initTabs() { initNavigation(); }

// Update home card stats from live data
function updateHomeStats() {
  if (!data.length) return;
  const p = data[0];
  const s = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
  s("hcs-skills", `${t("totalLevel")}: ${fmt(p.totalLevel)}`);
  s("hcs-quests", `${p.questsDone}/${p.totalQuests}`);
  s("hcs-activity", `${p.activities.length} ${currentLang === "pt" ? "recentes" : "recent"}`);
  s("hcs-combat", `${t("combat")} ${p.combatLevel}`);
  s("hcs-journal", `${fmt(p.totalXp)} XP`);
  s("hcs-money", `${Object.keys(gePrices).length} ${currentLang === "pt" ? "itens" : "items"}`);
  // Goals summary stat
  if (typeof GOALS !== "undefined" && typeof goalProgress === "function") {
    let totalDone = 0, totalItems = 0;
    for (const g of GOALS) {
      const prog = goalProgress(g, p);
      totalDone += prog.done;
      totalItems += prog.total;
    }
    const pct = totalItems ? Math.round((totalDone / totalItems) * 100) : 0;
    s("hcs-goals", `${pct}% (${totalDone}/${totalItems})`);
  }
}

// ---- Filters ----
function initFilters() {
  $$("#skill-filters .pill").forEach((b) =>
    b.addEventListener("click", () => {
      $$("#skill-filters .pill").forEach((x) => x.classList.remove("active"));
      b.classList.add("active");
      $$(".skill-row").forEach((r) =>
        r.classList.toggle(
          "hidden",
          b.dataset.filter !== "all" && r.dataset.cat !== b.dataset.filter,
        ),
      );
    }),
  );
  $$("#journal-filters .pill").forEach((b) =>
    b.addEventListener("click", () => {
      $$("#journal-filters .pill").forEach((x) => x.classList.remove("active"));
      b.classList.add("active");
      $$(".j-row").forEach((r) =>
        r.classList.toggle(
          "hidden",
          b.dataset.jfilter !== "all" && r.dataset.jcat !== b.dataset.jfilter,
        ),
      );
    }),
  );
  $$("#skill-sort .pill").forEach((b) =>
    b.addEventListener("click", () => {
      $$("#skill-sort .pill").forEach((x) => x.classList.remove("active"));
      b.classList.add("active");
      const grid = document.getElementById("skills-grid");
      const rows = Array.from(grid.querySelectorAll(".skill-row"));
      const sortType = b.dataset.sort;

      rows.sort((a, b) => {
        if (sortType === "default") return 0;
        if (sortType === "alpha")
          return a
            .querySelector(".sk-name")
            .textContent.localeCompare(b.querySelector(".sk-name").textContent);
        if (sortType === "gap") {
          const getLevels = (r) =>
            Array.from(r.querySelectorAll(".sk-level")).map(
              (el) => parseInt(el.textContent) || 0,
            );
          const [a1, a2] = getLevels(a);
          const [b1, b2] = getLevels(b);
          return Math.abs(b1 - b2) - Math.abs(a1 - a2);
        }
        if (sortType === "combined-xp") {
          const getXp = (r) =>
            Array.from(r.querySelectorAll(".sk-xp")).reduce(
              (s, el) =>
                s + parseInt(el.textContent.replace(/[^0-9]/g, "") || "0"),
              0,
            );
          return getXp(b) - getXp(a);
        }
        return 0;
      });

      if (sortType === "default" && data.length) {
        renderSkills(data);
        return;
      }
      rows.forEach((r) => grid.appendChild(r));
    }),
  );
  $$("#quest-filters .pill").forEach((b) =>
    b.addEventListener("click", () => {
      $$("#quest-filters .pill").forEach((x) => x.classList.remove("active"));
      b.classList.add("active");
      const filter = b.dataset.qfilter;
      $$(".ql-row").forEach((r) => {
        if (filter === "all") {
          r.classList.remove("hidden");
          return;
        }
        const cats = r.dataset.qcat.split(" ");
        r.classList.toggle("hidden", !cats.includes(filter));
      });
    }),
  );
  $$("#activity-filters .pill").forEach((b) =>
    b.addEventListener("click", () => {
      $$("#activity-filters .pill").forEach((x) =>
        x.classList.remove("active"),
      );
      b.classList.add("active");
      const filter = b.dataset.afilter;
      $$(".feed-item").forEach((r) => {
        if (filter === "all") {
          r.classList.remove("hidden");
          return;
        }
        r.classList.toggle("hidden", r.dataset.atype !== filter);
      });
    }),
  );
}

// ---- Next Steps: auto-generated suggestions per player ----
function renderNextSteps(players) {
  const el = $("#next-steps");
  if (!el) return;
  const lang = currentLang;
  const items = [];
  for (const p of players) {
    const pi = players.indexOf(p);
    const c = pi === 0 ? "p1" : "p2";
    // Suggest lowest skills to train
    const lowSkills = SKILLS
      .map(sk => ({ sk, lvl: (p.skills[sk.id] || {}).level || 1 }))
      .sort((a, b) => a.lvl - b.lvl)
      .slice(0, 2);
    for (const ls of lowSkills) {
      items.push(`<div class="ns-item"><span class="ns-icon">📈</span><span class="ns-tag ${c}">${esc(p.name)}</span><span class="ns-text">${tSkill(ls.sk.id)}: ${lang === "pt" ? "treinar de" : "train from"} ${ls.lvl}</span><span class="ns-detail">${lang === "pt" ? "menor hab." : "lowest skill"}</span></div>`);
    }
    // Suggest quests if few done
    if (p.questsDone < 50) {
      items.push(`<div class="ns-item"><span class="ns-icon">📜</span><span class="ns-tag ${c}">${esc(p.name)}</span><span class="ns-text">${lang === "pt" ? "Fazer mais missões" : "Do more quests"} (${p.questsDone}/${p.totalQuests})</span><span class="ns-detail">${lang === "pt" ? "progresso" : "progress"}</span></div>`);
    }
  }
  el.innerHTML = items.join("") || `<div style="color:var(--text-3);font-size:0.78rem;text-align:center;padding:16px">${lang === "pt" ? "Nenhuma sugestão" : "No suggestions"}</div>`;
}

// ---- Status ----
function setSource(state, text) {
  $(".source-dot").className = "source-dot " + state;
  $("#source-text").textContent = text;
}
function showError(msg) {
  $("#error-message").textContent = msg;
  $("#error-banner").classList.remove("hidden");
}
function hideError() {
  $("#error-banner").classList.add("hidden");
}

// ---- Visitor stats (GoatCounter public API) ----
async function loadVisitorStats() {
  const el = document.getElementById("visitor-stats");
  if (!el) return;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    const resp = await fetch("https://rs3placar.goatcounter.com/counter/TOTAL.json", { signal: ctrl.signal });
    clearTimeout(t);
    if (!resp.ok) return;
    const json = await resp.json();
    const count = json.count || json.count_unique || 0;
    if (count > 0) {
      el.textContent = `${count} ${currentLang === "pt" ? "visitas" : "visits"}`;
    }
  } catch (_) { /* GoatCounter unavailable — silent */ }
}

// ---- Lazy tab rendering ----
const _renderers = {
  dashboard: (r) => {
    if (typeof renderMajorGoals === "function") renderMajorGoals(r);
    renderCards(r);
    renderH2H(r);
    renderJournal(r, "#journal-scores", null);
  },
  // Alias: old "overview" hash → dashboard
  overview: (r) => { _renderers.dashboard(r); },
  skills: (r) => {
    renderSkills(r);
    if (typeof renderCombat === "function") renderCombat(r);
  },
  quests: (r) => {
    renderQuests(r);
  },
  activity: (r) => {
    renderActivity(r);
  },
  money: (r) => {
    if (typeof renderMoney === "function") renderMoney(r);
  },
  goals: (r) => {
    if (typeof renderGoalsPage === "function") renderGoalsPage(r);
  },
  journal: (r) => {
    renderJournal(r, "#journal-scores-full", "#journal-grid");
  },
  lookup: () => {
    if (typeof renderLookupPage === "function") renderLookupPage();
  },
};
const _rendered = new Set();

function getActiveTab() {
  const active = document.querySelector(".page.active");
  return active ? active.dataset.page : "dashboard";
}

function renderTab(tab, results) {
  const fn = _renderers[tab];
  if (fn) {
    try {
      fn(results);
    } catch (e) {
      console.error(`Render ${tab} failed:`, e);
    }
  }
  _rendered.add(tab);
}

function showToast(message, type) {
  const container =
    document.getElementById("toast-container") ||
    (() => {
      const div = document.createElement("div");
      div.id = "toast-container";
      div.style.cssText =
        "position:fixed;top:80px;right:16px;z-index:300;display:flex;flex-direction:column;gap:8px;pointer-events:none";
      document.body.appendChild(div);
      return div;
    })();
  const toast = document.createElement("div");
  toast.style.cssText = `padding:10px 16px;background:var(--bg-card);border:1px solid ${type === "quest" ? "var(--green)" : "var(--gold-dim)"};border-radius:var(--radius-sm);font-size:0.75rem;color:var(--text);box-shadow:0 4px 20px rgba(0,0,0,0.4);animation:fadeInUp 0.3s ease;pointer-events:auto`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transition = "opacity 0.3s";
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}

function renderAll(results) {
  // Milestone notifications
  if (data.length === 2 && results.length === 2) {
    for (let i = 0; i < 2; i++) {
      const old = data[i],
        nw = results[i];
      if (!old || !nw) continue;
      // Level-ups
      for (const sk of SKILLS) {
        const oldLvl = (old.skills[sk.id] || {}).level || 0;
        const newLvl = (nw.skills[sk.id] || {}).level || 0;
        if (newLvl > oldLvl && oldLvl > 0) {
          showToast(
            `🎉 ${nw.name} ${t("toastReached")} ${tSkill(sk.id)} ${newLvl}!`,
            "level",
          );
        }
      }
      // Quest completions
      if (nw.questsDone > (old.questsDone || 0) && old.questsDone > 0) {
        showToast(
          `📜 ${nw.name}: +${nw.questsDone - old.questsDone} ${t("toastQuestsCompleted")}!`,
          "quest",
        );
      }
    }
  }
  const prevData = data.length ? data : null;
  // Skip DOM rebuild if nothing changed (same XP + quests)
  const changed = !prevData || results.some((r, i) =>
    !prevData[i] || r.totalXp !== prevData[i].totalXp || r.questsDone !== prevData[i].questsDone
  );
  data = results;
  if (changed) _rendered.clear();
  renderTab(getActiveTab(), results);
  updateHomeStats();

  // Animate XP counters if data changed (Variable Reward Schedule)
  if (prevData) {
    setTimeout(() => {
      $$("[data-counter]").forEach(el => {
        const to = parseInt(el.dataset.counter, 10);
        if (!isNaN(to)) animateCounter(el, 0, to, 1200);
      });
    }, 200);
  }

  $("#loading-overlay").classList.add("hidden");
  $("#main-content").classList.add("visible");
}

// ---- Per-player resilient fetch (cache → live, per player) ----
async function fetchPlayerResilient(name) {
  // Tier 1: Memory cache (instant, no network)
  const mem = memCacheGet(name);
  if (mem) return { data: mem, src: "memory" };

  // Tier 2: Static file cache (GitHub Actions JSON)
  let cached = null;
  try { cached = await fetchCached(name); } catch (_) {}
  // Don't return cached yet — try live in parallel but show cached immediately

  // Tier 3: Live API (direct → allorigins proxy fallback)
  let live = null;
  try { live = await fetchLive(name); } catch (_) {}

  if (live) return { data: live, src: "live" };
  if (cached) return { data: cached, src: "cached" };
  return { data: null, src: "fail" };
}

// ---- Main: resilient load with per-player fallback ----
async function load() {
  const btn = $("#btn-refresh");
  btn.classList.add("spinning");
  setSource("loading", t("refreshing"));
  hideError();

  let cacheAge = null;
  try {
    const meta = await cacheFetch(CACHE.meta);
    cacheAge = Math.round((Date.now() - new Date(meta.timestamp)) / 60000);
  } catch (_) {}

  // Step 1: Show cached data fast
  let cachedResults = null;
  setSource("loading", currentLang === "pt" ? "Carregando cache..." : "Loading cache...");
  try {
    const settled = await Promise.allSettled(PLAYERS.map(fetchCached));
    cachedResults = settled.map(r => r.status === "fulfilled" ? r.value : null);
    if (cachedResults.some(r => r !== null)) {
      cachedResults = cachedResults.map((r, i) => r || memCacheGet(PLAYERS[i]));
      if (cachedResults.every(r => r !== null)) {
        renderAll(cachedResults);
        memCacheSet(cachedResults);
      }
      const ageStr = cacheAge != null ? ` (${cacheAge}${t("agoMin")})` : "";
      setSource("loading", `${t("cached")}${ageStr} \u2014 ${t("updatingLive")}`);
      if (cacheAge > 120) showError(`\u26A0\uFE0F ${t("errOutdated").replace("{n}", cacheAge)}`);
    }
  } catch (_) {}

  // Step 2: Try live API per-player with granular status
  try {
    const liveResults = [];
    for (let i = 0; i < PLAYERS.length; i++) {
      const name = PLAYERS[i];
      setSource("loading", `${currentLang === "pt" ? "Buscando" : "Fetching"} ${name}...`);
      let result = null;
      try { result = await fetchLive(name); } catch (_) {}
      if (result) {
        liveResults.push(result);
      } else if (cachedResults && cachedResults[i]) {
        liveResults.push(cachedResults[i]);
      } else {
        const mem = memCacheGet(name);
        liveResults.push(mem);
      }
    }

    if (liveResults.every(r => r !== null)) {
      renderAll(liveResults);
      memCacheSet(liveResults);
      const anyLive = liveResults.some((r, i) => {
        const cached = cachedResults && cachedResults[i];
        return !cached || r.totalXp !== cached.totalXp;
      });
      if (anyLive) {
        setSource("", t("live"));
        hideError();
        const now = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
        $("#last-updated").textContent = `${t("updated")} ${now}`;
      } else {
        const ageStr = cacheAge != null ? ` (${cacheAge}${t("agoMin")})` : "";
        setSource("", `${t("cached")}${ageStr}`);
      }
      btn.classList.remove("spinning");
      return;
    }
  } catch (_) {}

  // Step 3: Finalize with whatever we have
  if (cachedResults && cachedResults.every(r => r !== null)) {
    const ageStr = cacheAge != null ? ` (${cacheAge}${t("agoMin")})` : "";
    setSource("", `${t("cached")}${ageStr}`);
    $("#last-updated").textContent = cacheAge != null
      ? `${t("cached")} ${cacheAge}${t("agoMin")}`
      : t("cachedData");
  } else {
    setSource("error", t("offline"));
    showError(t("errFailed"));
    $("#loading-overlay").classList.add("hidden");
    $("#main-content").classList.add("visible");
    clearTimeout(timer);
    timer = setTimeout(scheduledLoad, 30000);
  }
  btn.classList.remove("spinning");
}

// ---- Scheduled load with guard ----
let _loading = false;
async function scheduledLoad() {
  if (_loading) return;
  _loading = true;
  try {
    await load();
  } finally {
    _loading = false;
  }
  timer = setTimeout(scheduledLoad, REFRESH_MS);
}

// ---- Init ----
document.addEventListener("DOMContentLoaded", () => {
  updateUIText();
  // URL deep linking via hash
  const hashTab = window.location.hash.replace("#", "");
  if (hashTab && hashTab !== "dashboard" && hashTab !== "overview") {
    _navFromPop = true;
    launchSection(hashTab);
    _navFromPop = false;
  }
  history.replaceState({ page: hashTab || "dashboard" }, "", window.location.hash || "#dashboard");
  initNavigation();
  // Handle browser back/forward (Android back button)
  window.addEventListener("popstate", (e) => {
    const page = (e.state && e.state.page) || window.location.hash.replace("#", "") || "dashboard";
    _navFromPop = true;
    launchSection(page);
    _navFromPop = false;
  });
  initFilters();
  Promise.all([
    loadGEPrices(),
    Promise.resolve(),
  ]).then(() => { scheduledLoad(); loadVisitorStats(); });
  $("#btn-refresh").addEventListener("click", () => {
    clearTimeout(timer);
    scheduledLoad();
  });
  $("#btn-dismiss-error").addEventListener("click", hideError);
  $("#lang-toggle").addEventListener("click", () => {
    setLang(currentLang === "pt" ? "en" : "pt");
    updateUIText();
    if (data.length) renderAll(data);
  });

});
