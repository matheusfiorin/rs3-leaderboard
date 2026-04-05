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
  return name ? `https://runescape.wiki/images/${name}_icon.png` : '';
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

// ---- Easter Goals (manual, localStorage) ----
const EASTER = [
  { id: "e_tutorial", icon: "\uD83D\uDC30" },
  { id: "e_week1", icon: "\uD83E\uDD5A" },
  { id: "e_week2", icon: "\uD83E\uDD5A" },
  { id: "e_week3", icon: "\uD83E\uDD5A" },
  { id: "e_all21", icon: "\uD83C\uDFC6" },
  { id: "e_tokens", icon: "\uD83D\uDCB0" },
  { id: "e_reward", icon: "\uD83C\uDF81" },
  { id: "e_bunny", icon: "\uD83D\uDC30" },
];
const EASTER_I18N = {
  pt: {
    e_tutorial: {
      title: "Completar Blooming Burrow Egg Hunt",
      desc: "Pr\u00e9-requisito para a Ca\u00e7a aos Ovos",
    },
    e_week1: {
      title: "Encontrar Ovos da Semana 1",
      desc: "7 ovos dourados (3 F2P)",
    },
    e_week2: {
      title: "Encontrar Ovos da Semana 2",
      desc: "7 ovos dourados (3 F2P)",
    },
    e_week3: {
      title: "Encontrar Ovos da Semana 3",
      desc: "7 ovos dourados (3 F2P)",
    },
    e_all21: {
      title: "Encontrar todos os 21 ovos",
      desc: "Mestre da Ca\u00e7a aos Ovos",
    },
    e_tokens: {
      title: "Gastar Spring Tokens",
      desc: "Na loja Grand Eggs-change",
    },
    e_reward: {
      title: "Receber Ba\u00fa de Recompensa",
      desc: "Completar 12+ ovos e falar com Nougat Bunny",
    },
    e_bunny: {
      title: "Desbloquear Cosm\u00e9tico de Bichinho Coelho",
      desc: "Token de apar\u00eancia de bichinho de P\u00e1scoa",
    },
    infoTitle: "Sobre o Evento",
    infoItems: [
      "Blooming Burrow acess\u00edvel pelo portal ao norte do Grand Exchange em Varrock",
      "Evento: 30 Mar - 20 Abr 2026",
      "Cada ovo encontrado d\u00e1 200 Spring Tokens + 10 Treasure Trail Points",
      "Ovos liberados semanalmente (7 por semana, 3 F2P)",
      "Fale com Nougat Bunny para a primeira pista de cada semana",
      "Spring Tokens tamb\u00e9m obtidos treinando habilidades durante o evento",
    ],
  },
  en: {
    e_tutorial: {
      title: "Complete Blooming Burrow Egg Hunt",
      desc: "Prerequisite for the Egg Hunt",
    },
    e_week1: { title: "Find Week 1 Eggs", desc: "7 golden eggs (3 F2P)" },
    e_week2: { title: "Find Week 2 Eggs", desc: "7 golden eggs (3 F2P)" },
    e_week3: { title: "Find Week 3 Eggs", desc: "7 golden eggs (3 F2P)" },
    e_all21: { title: "Find all 21 eggs", desc: "Master Egg Hunter" },
    e_tokens: {
      title: "Spend Spring Tokens",
      desc: "At The Grand Eggs-change",
    },
    e_reward: {
      title: "Receive Holiday Reward Casket",
      desc: "Complete 12+ eggs and talk to Nougat Bunny",
    },
    e_bunny: {
      title: "Unlock Bunny Pet Cosmetic",
      desc: "Easter pet appearance token",
    },
    infoTitle: "About the Event",
    infoItems: [
      "Blooming Burrow accessible via portal north of Grand Exchange in Varrock",
      "Event: Mar 30 - Apr 20, 2026",
      "Each egg found awards 200 Spring Tokens + 10 Treasure Trail Points",
      "Eggs released weekly (7 per week, 3 F2P)",
      "Talk to Nougat Bunny for each week's first clue",
      "Spring Tokens also earnable through skilling during the event",
    ],
  },
};

// ---- State ----
let data = [];
let source = "";
let timer = null;
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

// ---- Fetch ----
function timeoutSignal(ms) {
  const c = new AbortController();
  setTimeout(() => c.abort(), ms);
  return c.signal;
}

async function directFetch(url) {
  const r = await fetch(url, { signal: timeoutSignal(8000) });
  if (!r.ok) throw new Error("fetch_fail");
  return await r.json();
}
async function cacheFetch(path) {
  const r = await fetch(path, {
    signal: timeoutSignal(5000),
    cache: "no-cache",
  });
  if (!r.ok) throw new Error("cache_miss");
  return await r.json();
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
    directFetch(API.profile(n)),
    directFetch(API.hiscores(n)),
    directFetch(API.quests(n)),
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
      // Top 3 skills for mini-preview
      const topSkills = SKILLS
        .map(sk => ({ sk, lvl: (p.skills[sk.id] || {}).level || 1 }))
        .sort((a, b) => b.lvl - a.lvl)
        .slice(0, 3);
      // Lowest skill (loss aversion)
      const lowest = SKILLS
        .map(sk => ({ sk, lvl: (p.skills[sk.id] || {}).level || 1 }))
        .sort((a, b) => a.lvl - b.lvl)[0];

      return `
      <div class="p-card ${c} fade-in" style="animation-delay:${i * 0.08}s">
        <div class="p-card-top">
          <div>
            <div class="p-card-name">${esc(p.name)}</div>
            <div class="p-card-rank">${t("overallRank")} #${esc(p.rank)}</div>
          </div>
          <div class="p-card-combat-shield">
            <span class="p-shield-num">${p.combatLevel}</span>
            <span class="p-shield-label">${t("combat")}</span>
          </div>
        </div>
        <div class="p-card-skills-preview">
          ${topSkills.map(s => `<span class="p-top-skill">${skillIconImg(s.sk.id, 16)}<span>${s.lvl}</span></span>`).join("")}
          <span class="p-top-skill p-lowest" title="${tSkill(lowest.sk.id)}: ${lowest.lvl}">${skillIconImg(lowest.sk.id, 16)}<span style="color:var(--red)">${lowest.lvl}</span></span>
        </div>
        <div class="p-stats">
          <div class="p-stat"><div class="p-stat-val" data-counter="${p.totalLevel}">${fmt(p.totalLevel)}</div><div class="p-stat-label">${t("totalLevel")}</div></div>
          <div class="p-stat"><div class="p-stat-val">${fmtShort(p.totalXp)}</div><div class="p-stat-label">${t("totalXp")}</div></div>
          <div class="p-stat"><div class="p-stat-val">${fmt(p.runeScore)}</div><div class="p-stat-label">${t("runeScore")}</div></div>
          <div class="p-stat"><div class="p-stat-val">${p.questsDone}<small style="font-size:0.6em;color:var(--text-3)">/${p.totalQuests}</small></div><div class="p-stat-label">${t("questsDone")}</div></div>
          <div class="p-stat"><div class="p-stat-val">${totalClues}</div><div class="p-stat-label">${t("clueScrolls")}</div></div>
          <div class="p-stat"><div class="p-stat-val">${ahead}<small style="font-size:0.6em;color:var(--text-3)">/${SKILLS.length}</small></div><div class="p-stat-label">${t("skillsAhead")}</div></div>
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

  // Summary stats per player
  const stats = players.map((p, i) => {
    const acts = all.filter((a) => a.pi === i);
    return {
      levelups: acts.filter((a) => a.type === "levelup").length,
      quests: acts.filter((a) => a.type === "quest").length,
      bosses: acts.filter((a) => a.type === "boss").length,
    };
  });
  const lang = currentLang;
  $("#activity-summary").innerHTML = players
    .map((p, i) => {
      const s = stats[i];
      const c = i === 0 ? "p1" : "p2";
      return `<span style="font-size:0.72rem;color:var(--${c === "p1" ? "gold" : "teal"});font-weight:600">${esc(p.name)}</span>: ${s.levelups}⬆️ ${s.quests}📜 ${s.bosses}⚔️`;
    })
    .join(" &nbsp;·&nbsp; ");

  if (!all.length) {
    $("#activity-feed").innerHTML =
      `<div style="text-align:center;color:var(--text-3);padding:24px">${t("noActivity")}</div>`;
    return;
  }
  $("#activity-feed").innerHTML = all
    .map((a) => {
      const c = a.pi === 0 ? "p1" : "p2";
      return `<div class="act-item" data-atype="${a.type}">
      <div class="act-dot ${c}" title="${ACT_ICONS[a.type] || ""}">${ACT_ICONS[a.type] || ""}</div>
      <div class="act-body">
        <div class="act-text"><span class="act-player ${c}">${esc(a.player)}</span> — ${esc(localizeActivity(a.text))}</div>
        ${a.details ? `<div class="act-detail">${esc(localizeActivity(a.details))}</div>` : ""}
      </div>
      <div class="act-time">${fmtTime(a.date)}</div>
    </div>`;
    })
    .join("");
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

// ---- Render: Easter ----
function renderEaster(players) {
  const EASTER_END = new Date("2026-04-20T23:59:59Z");
  const tabEl = document.getElementById("tab-easter");
  if (Date.now() > EASTER_END.getTime()) {
    if (tabEl) tabEl.style.display = "none";
    return;
  }
  // Guard: Easter HTML sections may have been removed
  if (!$("#easter-checklist") || !$("#easter-info")) return;
  const easterLang = EASTER_I18N[currentLang] || EASTER_I18N.en;
  const saved = JSON.parse(localStorage.getItem("rs3lb-easter") || "{}");

  const p1Done = EASTER.filter(
    (e) => saved[`${e.id}_${players[0].name}`],
  ).length;
  const p2Done = EASTER.filter(
    (e) => saved[`${e.id}_${players[1].name}`],
  ).length;

  // Render progress
  const progressEl =
    document.getElementById("easter-progress") ||
    (() => {
      const div = document.createElement("div");
      div.id = "easter-progress";
      div.style.cssText =
        "display:flex;gap:16px;justify-content:center;margin-bottom:16px";
      document.querySelector(".easter-hero").after(div);
      return div;
    })();
  progressEl.innerHTML = players
    .map((p, i) => {
      const done = i === 0 ? p1Done : p2Done;
      const c = i === 0 ? "gold" : "teal";
      return `<div style="text-align:center"><span style="font-size:0.72rem;font-weight:700;color:var(--${c})">${esc(p.name)}</span><div style="font-family:var(--font-mono);font-size:1.1rem;font-weight:800;color:var(--${c})">${done}/${EASTER.length}</div></div>`;
    })
    .join("");

  $("#easter-checklist").innerHTML = EASTER.map((e) => {
    const info = easterLang[e.id] || {};
    return players
      .map((p, i) => {
        const key = `${e.id}_${p.name}`;
        const checked = saved[key] ? "checked" : "";
        const c = i === 0 ? "p1" : "p2";
        return `<div class="easter-item">
        <input type="checkbox" class="easter-check" data-key="${key}" ${checked}>
        <div class="easter-item-info"><div class="easter-item-title">${e.icon} ${info.title || e.id}</div><div class="easter-item-desc">${info.desc || ""}</div></div>
        <div class="easter-item-player ${c}">${esc(p.name)}</div>
      </div>`;
      })
      .join("");
  }).join("");

  // Info section
  $("#easter-info").innerHTML =
    `<h3>${easterLang.infoTitle || "Info"}</h3><ul>${(easterLang.infoItems || []).map((i) => `<li>${i}</li>`).join("")}</ul>`;
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
  h("tab-chat", "\uD83E\uDD16 " + t("navChat"));
  h("tab-meetup", "\uD83E\uDD1D " + t("navMeetup"));
  h("tab-easter", "\uD83E\uDD5A " + t("navEaster"));
  h("tab-lookup", "\uD83D\uDD0D " + t("navLookup"));
  h("tab-senntisten", "\u2694\uFE0F " + t("navSenntisten"));
  h("tab-prifddinas", "\uD83C\uDFF0 " + t("navPrifddinas"));

  // Chat i18n (tab removed but keys kept safe)
  s("chat-key-title", t("chatAssistant"));
  s("chat-key-desc", t("chatKeyDesc"));
  s("chat-key-hint", t("chatHint"));
  s("chat-key-submit", t("chatStart"));
  p("chat-input", t("chatPlaceholder"));

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

  // Gains & Next Steps
  s("gains-title", t("gainsTitle"));
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
  s("hc-meetup", t("navMeetup"));
  s("home-grid-title", lang === "pt" ? "Explorar" : "Explore");
}

// ---- Navigation: Home Grid + Floating Dock ----
let _navFromPop = false; // flag to prevent pushState during popstate

function launchSection(page) {
  const dock = document.getElementById("dock");
  if (page === "overview") {
    $$(".page").forEach((p) => p.classList.remove("active"));
    const ov = $('[data-page="overview"]');
    if (ov) ov.classList.add("active");
    if (dock) {
      dock.classList.add("visible");
      dock.querySelectorAll(".dock-btn").forEach((b) =>
        b.classList.toggle("active", b.dataset.launch === "overview")
      );
    }
    if (!_navFromPop) history.pushState({ page: "overview" }, "", "#overview");
    return;
  }
  // Show target section
  $$(".page").forEach((p) => p.classList.toggle("active", p.dataset.page === page));
  // Inject back button if not already present
  const activePage = $(`[data-page="${page}"]`);
  if (activePage && !activePage.querySelector(".section-back")) {
    const btn = document.createElement("button");
    btn.className = "section-back";
    btn.innerHTML = `\u2190 ${currentLang === "pt" ? "Início" : "Home"}`;
    btn.addEventListener("click", () => launchSection("overview"));
    activePage.prepend(btn);
  }
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
  // Home grid cards + dock buttons
  $$("[data-launch]").forEach((el) => {
    el.addEventListener("click", () => launchSection(el.dataset.launch));
  });
  // Show dock immediately (always visible like a game OS)
  const dock = document.getElementById("dock");
  if (dock) {
    dock.classList.add("visible");
    dock.querySelectorAll(".dock-btn").forEach((b) =>
      b.classList.toggle("active", b.dataset.launch === "overview")
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
      $$(".act-item").forEach((r) => {
        if (filter === "all") {
          r.classList.remove("hidden");
          return;
        }
        r.classList.toggle("hidden", r.dataset.atype !== filter);
      });
    }),
  );
}

// ---- Money Making Methods ----
// Skill IDs: 0=ATK 1=DEF 2=STR 3=HP 4=RNG 5=PRA 6=MAG 7=COK 8=WC 9=FLE 10=FSH 11=FM 12=CRA 13=SMI 14=MIN 15=HER 16=AGI 17=THI 18=SLA 19=FAR 20=RC 21=HUN 22=CON 23=SUM 24=DG 25=DIV 26=INV 27=ARC 28=NEC
const MONEY_METHODS = [
  // ---- DYNAMIC: Prices from GE ----
  {
    id: "tan_green_dhide",
    pt: { name: "Curtir Green Dragonhide", desc: "Compre green d'hide no GE, curta em green dragon leather. Portable Crafter ou curtidor NPC." },
    en: { name: "Tan Green Dragonhide", desc: "Buy green d'hide on GE, tan into green dragon leather. Portable Crafter or NPC tanner." },
    reqs: {},
    members: true,
    inputs: [{ id: 1745, qty: 1, name: "Green dragonhide", extraCost: 20 }],
    outputs: [{ id: 2505, qty: 1, name: "Green dragon leather" }],
    actionsPerHour: 5000,
  },
  {
    id: "tan_blue_dhide",
    pt: { name: "Curtir Blue Dragonhide", desc: "Compre blue d'hide no GE, curta em blue dragon leather." },
    en: { name: "Tan Blue Dragonhide", desc: "Buy blue d'hide on GE, tan into blue dragon leather." },
    reqs: {},
    members: true,
    inputs: [{ id: 1747, qty: 1, name: "Blue dragonhide", extraCost: 20 }],
    outputs: [{ id: 2507, qty: 1, name: "Blue dragon leather" }],
    actionsPerHour: 5000,
  },
  {
    id: "craft_mist_runes",
    pt: { name: "Criar Mist Runes", desc: "Runas de ar + altar de água com talisma. Binding necklace recomendado." },
    en: { name: "Craft Mist Runes", desc: "Air runes + water altar with talisman. Binding necklace recommended." },
    reqs: { 20: 6 },
    members: true,
    inputs: [{ id: 556, qty: 1, name: "Air rune" }],
    outputs: [{ id: 4694, qty: 1, name: "Mist rune" }],
    actionsPerHour: 2200,
  },
  {
    id: "craft_dust_runes",
    pt: { name: "Criar Dust Runes", desc: "Runas de ar + altar de terra. Binding necklace recomendado." },
    en: { name: "Craft Dust Runes", desc: "Air runes + earth altar with talisman. Binding necklace recommended." },
    reqs: { 20: 6 },
    members: true,
    inputs: [{ id: 556, qty: 1, name: "Air rune" }],
    outputs: [{ id: 4698, qty: 1, name: "Dust rune" }],
    actionsPerHour: 2200,
  },
  {
    id: "craft_mud_runes",
    pt: { name: "Criar Mud Runes", desc: "Runas de água + altar de terra. Binding necklace recomendado." },
    en: { name: "Craft Mud Runes", desc: "Water runes + earth altar. Binding necklace recommended." },
    reqs: { 20: 13 },
    members: true,
    inputs: [{ id: 555, qty: 1, name: "Water rune" }],
    outputs: [{ id: 4695, qty: 1, name: "Mud rune" }],
    actionsPerHour: 2200,
  },
  {
    id: "unf_ranarr_pots",
    pt: { name: "Poções Inacabadas de Ranarr", desc: "Combine ranarr limpo + vial of water. Venda poção inacabada." },
    en: { name: "Ranarr Unfinished Potions", desc: "Combine clean ranarr + vial of water. Sell unfinished potion." },
    reqs: { 15: 25 },
    members: true,
    inputs: [{ id: 259, qty: 1, name: "Clean ranarr" }, { id: 2481, qty: 1, name: "Vial of water" }],
    outputs: [{ id: 99, qty: 1, name: "Ranarr potion (unf)" }],
    actionsPerHour: 2800,
  },
  {
    id: "unf_guam_pots",
    pt: { name: "Poções Inacabadas de Guam", desc: "Combine guam limpo + vial of water. Iniciante em Herbologia." },
    en: { name: "Guam Unfinished Potions", desc: "Combine clean guam + vial of water. Beginner Herblore." },
    reqs: { 15: 1 },
    members: true,
    inputs: [{ id: 249, qty: 1, name: "Clean guam" }, { id: 2481, qty: 1, name: "Vial of water" }],
    outputs: [{ id: 91, qty: 1, name: "Guam potion (unf)" }],
    actionsPerHour: 2800,
  },
  {
    id: "cut_sapphires",
    pt: { name: "Cortar Safiras", desc: "Compre safiras brutas no GE, corte com cinzel." },
    en: { name: "Cut Sapphires", desc: "Buy uncut sapphires on GE, cut with chisel." },
    reqs: { 12: 20 },
    members: false,
    inputs: [{ id: 1623, qty: 1, name: "Uncut sapphire" }],
    outputs: [{ id: 1607, qty: 1, name: "Sapphire" }],
    actionsPerHour: 2800,
  },
  {
    id: "cut_rubies",
    pt: { name: "Cortar Rubis", desc: "Compre rubis brutos no GE, corte com cinzel." },
    en: { name: "Cut Rubies", desc: "Buy uncut rubies on GE, cut with chisel." },
    reqs: { 12: 63 },
    members: false,
    inputs: [{ id: 1619, qty: 1, name: "Uncut ruby" }],
    outputs: [{ id: 1609, qty: 1, name: "Ruby" }],
    actionsPerHour: 2800,
  },
  {
    id: "smelt_mithril",
    pt: { name: "Fundir Barras de Mithril", desc: "1 minério de mithril + 4 carvões = 1 barra de mithril." },
    en: { name: "Smelt Mithril Bars", desc: "1 mithril ore + 4 coal = 1 mithril bar." },
    reqs: { 13: 50 },
    members: false,
    inputs: [{ id: 447, qty: 1, name: "Mithril ore" }, { id: 453, qty: 4, name: "Coal" }],
    outputs: [{ id: 2355, qty: 1, name: "Mithril bar" }],
    actionsPerHour: 1100,
  },
  {
    id: "smelt_adamant",
    pt: { name: "Fundir Barras de Adamantio", desc: "1 minério de adamantio + 6 carvões = 1 barra de adamantio." },
    en: { name: "Smelt Adamant Bars", desc: "1 adamantite ore + 6 coal = 1 adamant bar." },
    reqs: { 13: 70 },
    members: false,
    inputs: [{ id: 449, qty: 1, name: "Adamantite ore" }, { id: 453, qty: 6, name: "Coal" }],
    outputs: [{ id: 2361, qty: 1, name: "Adamant bar" }],
    actionsPerHour: 1100,
  },
  {
    id: "make_soft_clay",
    pt: { name: "Fazer Soft Clay", desc: "Use jarro de água em clay. Humidify spell é o mais rápido." },
    en: { name: "Make Soft Clay", desc: "Use water on clay. Humidify spell is fastest." },
    reqs: {},
    members: false,
    inputs: [{ id: 434, qty: 1, name: "Clay" }],
    outputs: [{ id: 1761, qty: 1, name: "Soft clay" }],
    actionsPerHour: 4000,
  },
  {
    id: "cook_karambwan",
    pt: { name: "Cozinhar Karambwan", desc: "Compre karambwan cru, cozinhe. Requer Tai Bwo Wannai Trio." },
    en: { name: "Cook Karambwan", desc: "Buy raw karambwan, cook. Requires Tai Bwo Wannai Trio quest." },
    reqs: { 7: 30 },
    members: true,
    inputs: [{ id: 3142, qty: 1, name: "Raw karambwan" }],
    outputs: [{ id: 3144, qty: 1, name: "Cooked karambwan" }],
    actionsPerHour: 1400,
  },
  {
    id: "fletch_maple_longs",
    pt: { name: "Fletching: Maple Longbow (u)", desc: "Corte toras de maple em longbow (u). Sem corda." },
    en: { name: "Fletch Maple Longbows (u)", desc: "Cut maple logs into longbow (u). Unstrung." },
    reqs: { 9: 55 },
    members: true,
    inputs: [{ id: 1517, qty: 1, name: "Maple logs" }],
    outputs: [{ id: 64, qty: 1, name: "Maple longbow (u)" }],
    actionsPerHour: 2400,
  },
  {
    id: "fletch_yew_longs",
    pt: { name: "Fletching: Yew Longbow (u)", desc: "Corte toras de teixo em longbow (u)." },
    en: { name: "Fletch Yew Longbows (u)", desc: "Cut yew logs into longbow (u)." },
    reqs: { 9: 70 },
    members: true,
    inputs: [{ id: 1515, qty: 1, name: "Yew logs" }],
    outputs: [{ id: 60, qty: 1, name: "Yew longbow (u)" }],
    actionsPerHour: 2400,
  },
  {
    id: "craft_death_runes",
    pt: { name: "Criar Runas da Morte", desc: "Altar de morte via Abyss. Bom lucro passivo." },
    en: { name: "Craft Death Runes", desc: "Death altar via Abyss. Good passive income." },
    reqs: { 20: 65 },
    members: true,
    inputs: [],
    outputs: [{ id: 560, qty: 1, name: "Death rune" }],
    actionsPerHour: 2500,
  },
  {
    id: "craft_blood_runes",
    pt: { name: "Criar Runas de Sangue", desc: "Altar de sangue via Abyss. Alto valor por runa." },
    en: { name: "Craft Blood Runes", desc: "Blood altar via Abyss. High value per rune." },
    reqs: { 20: 77 },
    members: true,
    inputs: [],
    outputs: [{ id: 565, qty: 1, name: "Blood rune" }],
    actionsPerHour: 2200,
  },
  // ---- FIXED PROFIT (not GE-driven) ----
  {
    id: "fort_frames",
    fixedProfit: 3400000,
    pt: { name: "Fazer Wooden Frames (Fort Forinthry)", desc: "Quest: New Foundations. Transforme planks em frames no sawmill do forte." },
    en: { name: "Make Wooden Frames (Fort Forinthry)", desc: "Quest: New Foundations. Turn planks into frames at fort sawmill." },
    reqs: { 22: 1 }, members: true, quest: "New Foundations",
    inputs: [], outputs: [], actionsPerHour: 1,
  },
  // ---- EXISTING DYNAMIC ----
  {
    id: "smelt_iron",
    pt: {
      name: "Fundir Barras de Ferro",
      desc: "Funda min\u00e9rio de ferro em barras (anel de forja = 100% sucesso)",
    },
    en: {
      name: "Smelt Iron Bars",
      desc: "Smelt iron ore into bars (ring of forging for 100%)",
    },
    reqs: { 13: 15 },
    members: false,
    inputs: [{ id: 440, qty: 1, name: "Iron ore" }],
    outputs: [{ id: 2351, qty: 1, name: "Iron bar" }],
    actionsPerHour: 1100,
  },
  {
    id: "smelt_gold",
    pt: {
      name: "Fundir Barras de Ouro",
      desc: "Funda min\u00e9rio de ouro em barras. Goldsmith gauntlets recomendado.",
    },
    en: {
      name: "Smelt Gold Bars",
      desc: "Smelt gold ore into gold bars. Goldsmith gauntlets recommended.",
    },
    reqs: { 13: 40 },
    members: false,
    inputs: [{ id: 444, qty: 1, name: "Gold ore" }],
    outputs: [{ id: 2357, qty: 1, name: "Gold bar" }],
    actionsPerHour: 1100,
  },
  {
    id: "headless_arrows",
    pt: {
      name: "Fazer Flechas sem Ponta",
      desc: "Compre hastes + penas, fa\u00e7a flechas sem ponta. Baixo risco, f\u00e1cil.",
    },
    en: {
      name: "Fletch Headless Arrows",
      desc: "Buy shafts + feathers, fletch headless arrows. Low risk, easy.",
    },
    reqs: {},
    members: false,
    inputs: [
      { id: 52, qty: 15, name: "Arrow shaft" },
      { id: 314, qty: 15, name: "Feather" },
    ],
    outputs: [{ id: 53, qty: 15, name: "Headless arrow" }],
    actionsPerHour: 2700,
  },
  {
    id: "spin_flax",
    pt: {
      name: "Fiar Linho em Cordas de Arco",
      desc: "Roda de fiar em Lumbridge. Compre flax, venda bowstring.",
    },
    en: {
      name: "Spin Flax into Bowstrings",
      desc: "Spinning wheel in Lumbridge. Buy flax, sell bowstrings.",
    },
    reqs: { 12: 10 },
    members: true,
    inputs: [{ id: 1779, qty: 1, name: "Flax" }],
    outputs: [{ id: 1777, qty: 1, name: "Bowstring" }],
    actionsPerHour: 1500,
  },
  {
    id: "nature_runes",
    pt: {
      name: "Criar Runas da Natureza",
      desc: "Altar via Abyss. Quest Enter the Abyss necess\u00e1ria.",
    },
    en: {
      name: "Craft Nature Runes",
      desc: "Altar via Abyss. Enter the Abyss miniquest required.",
    },
    reqs: { 20: 44 },
    members: true,
    inputs: [],
    outputs: [{ id: 561, qty: 1, name: "Nature rune" }],
    actionsPerHour: 2500,
  },
  // DAILY/RECURRING
  {
    id: "shop_run",
    fixedProfit: 800000,
    pt: {
      name: "Shop Run Di\u00e1ria (Penas + Runas)",
      desc: "Compre penas e runas baratas em lojas NPCs, venda no GE. ~10 min/dia.",
    },
    en: {
      name: "Daily Shop Run (Feathers + Runes)",
      desc: "Buy cheap feathers & runes from NPC shops, sell on GE. ~10 min/day.",
    },
    reqs: {},
    members: true,
    daily: true,
    inputs: [],
    outputs: [],
    actionsPerHour: 1,
  },
  // ALMOST UNLOCKED (within reach)
  {
    id: "necro_candles",
    fixedProfit: 5000000,
    almostUnlocked: true,
    pt: {
      name: "Ritual Candles (Necromancia)",
      desc: "Upgrade ritual candles. Precisa Necromancia 60. Fiorovizk: faltam 1 n\u00edvel!",
    },
    en: {
      name: "Ritual Candles (Necromancy)",
      desc: "Upgrade ritual candles. Needs Necromancy 60. Fiorovizk: 1 level away!",
    },
    reqs: { 28: 60 },
    members: true,
    inputs: [],
    outputs: [],
    actionsPerHour: 1,
  },
  {
    id: "miasma_runes",
    fixedProfit: 23000000,
    almostUnlocked: true,
    pt: {
      name: "Criar Runas de Miasma",
      desc: "Cria\u00e7\u00e3o de Runas 60. Fiorovizk: 10 n\u00edveis! Melhor m\u00e9todo de RC.",
    },
    en: {
      name: "Craft Miasma Runes",
      desc: "Runecrafting 60. Fiorovizk: 10 levels away! Best RC method.",
    },
    reqs: { 20: 60 },
    members: true,
    inputs: [],
    outputs: [],
    actionsPerHour: 1,
  },
  {
    id: "necronium_bars",
    fixedProfit: 6000000,
    almostUnlocked: true,
    pt: {
      name: "Fundir Barras de Necr\u00f4nio",
      desc: "Metalurgia 70. Fiorovizk: 5 n\u00edveis! 3000+ barras/hr com b\u00f4nus de duplica\u00e7\u00e3o.",
    },
    en: {
      name: "Smelt Necronium Bars",
      desc: "Smithing 70. Fiorovizk: 5 levels away! 3000+ bars/hr with doubling bonus.",
    },
    reqs: { 13: 70 },
    members: true,
    inputs: [],
    outputs: [],
    actionsPerHour: 1,
  },
  {
    id: "combo_magic_imbue",
    fixedProfit: 17000000,
    almostUnlocked: true,
    pt: {
      name: "Runas Combinadas + Magic Imbue",
      desc: "Magia 82 = 100% sucesso sem talism\u00e3. 14-20M/hr! Ambos longe, mas vale o grind.",
    },
    en: {
      name: "Combo Runes + Magic Imbue",
      desc: "Magic 82 = 100% success, no talisman needed. 14-20M/hr! Worth the grind.",
    },
    reqs: { 6: 82 },
    members: true,
    inputs: [],
    outputs: [],
    actionsPerHour: 1,
  },
  {
    id: "cut_yews",
    almostUnlocked: true,
    pt: {
      name: "Cortar Teixos",
      desc: "Corte teixos e venda. Precisa Corte de Lenha 60. Ambos perto!",
    },
    en: {
      name: "Cut Yew Trees",
      desc: "Chop yew trees and sell logs. Needs Woodcutting 60.",
    },
    reqs: { 8: 60 },
    members: false,
    inputs: [],
    outputs: [{ id: 1515, qty: 1, name: "Yew logs" }],
    actionsPerHour: 180,
  },
  {
    id: "smelt_steel",
    pt: {
      name: "Fundir Barras de A\u00e7o",
      desc: "1 min\u00e9rio de ferro + 2 carv\u00f5es = 1 barra de a\u00e7o",
    },
    en: { name: "Smelt Steel Bars", desc: "1 iron ore + 2 coal = 1 steel bar" },
    reqs: { 13: 30 },
    members: false,
    inputs: [
      { id: 440, qty: 1, name: "Iron ore" },
      { id: 453, qty: 2, name: "Coal" },
    ],
    outputs: [{ id: 2353, qty: 1, name: "Steel bar" }],
    actionsPerHour: 1100,
  },
  {
    id: "tan_cowhide",
    pt: {
      name: "Curtir Couro de Vaca",
      desc: "Compre couro no GE, curta no artesão. Sem requisitos.",
    },
    en: {
      name: "Tan Cowhide",
      desc: "Buy cowhide on GE, tan at a tanner. No requirements.",
    },
    reqs: {},
    members: false,
    inputs: [{ id: 1739, qty: 1, name: "Cowhide" }],
    outputs: [{ id: 1743, qty: 1, name: "Hard leather" }],
    actionsPerHour: 2500,
  },
  {
    id: "cook_sharks",
    pt: {
      name: "Cozinhar Tubarões",
      desc: "Compre tubarões crus, cozinhe com luvas de culinária.",
    },
    en: {
      name: "Cook Sharks",
      desc: "Buy raw sharks, cook with cooking gauntlets.",
    },
    reqs: { 7: 80 },
    members: true,
    inputs: [{ id: 383, qty: 1, name: "Raw shark" }],
    outputs: [{ id: 385, qty: 1, name: "Shark" }],
    actionsPerHour: 1400,
  },
  {
    id: "cut_magic_logs",
    almostUnlocked: true,
    pt: {
      name: "Cortar Troncos Mágicos",
      desc: "Corte de Lenha 75. Troncos valiosos.",
    },
    en: { name: "Cut Magic Trees", desc: "Woodcutting 75. Valuable logs." },
    reqs: { 8: 75 },
    members: true,
    inputs: [],
    outputs: [{ id: 1513, qty: 1, name: "Magic logs" }],
    actionsPerHour: 120,
  },
];

let gePrices = {};

async function loadGEPrices() {
  try {
    gePrices = await cacheFetch("data/ge_prices.json");
  } catch (_) {
    gePrices = {};
  }
}

function getPrice(itemId) {
  const p = gePrices[String(itemId)];
  return p ? p.price : 0;
}

function calcProfit(method) {
  if (method.fixedProfit) return method.fixedProfit;
  let inputCost = 0;
  for (const inp of method.inputs) {
    inputCost += (getPrice(inp.id) + (inp.extraCost || 0)) * inp.qty;
  }
  let outputValue = 0;
  for (const out of method.outputs) {
    outputValue += getPrice(out.id) * out.qty;
  }
  const profitPerAction = outputValue - inputCost;
  return profitPerAction * method.actionsPerHour;
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

function canDoMethod(player, method) {
  for (const [skillId, reqLevel] of Object.entries(method.reqs)) {
    const sk = player.skills[Number(skillId)];
    if (!sk || sk.level < reqLevel) return false;
  }
  return true;
}

const MONEY_TOP_N = 10;
let _moneyFilter = "all"; // all | available | upcoming

function moneyCardHTML(m, players, lang) {
  const info = m[lang] || m.en;
  let desc = info.desc;
  if (m.almostUnlocked) {
    const parts = [];
    for (const p of players) {
      if (canDoMethod(p, m)) {
        parts.push(`${p.name}: \u2713`);
      } else {
        for (const [sid, reqLvl] of Object.entries(m.reqs)) {
          const sk = p.skills[Number(sid)];
          const curLvl = sk ? sk.level : 1;
          const gap = reqLvl - curLvl;
          if (gap > 0) parts.push(`${p.name}: ${tSkill(Number(sid))} ${curLvl}\u2192${reqLvl} (${gap} ${t("levels")})`);
        }
      }
    }
    if (parts.length) desc = parts.join(" | ");
  }
  const profitStr = m.profit > 0 ? fmtShort(m.profit) + " gp/h" : "?";
  const dailyGp = m.profit * 3;
  const reqTags = Object.entries(m.reqs).map(([sid, lvl]) => {
    const met = players.some(p => canDoMethod(p, { reqs: { [sid]: lvl } }));
    return `<span class="money-req ${met ? "met" : "unmet"}">${tSkill(Number(sid))} ${lvl}</span>`;
  }).join("") || `<span class="money-req met">${t("noReqs")}</span>`;
  const p1can = canDoMethod(players[0], m);
  const p2can = players[1] ? canDoMethod(players[1], m) : false;
  const badges = [];
  if (m.almostUnlocked) badges.push(`<span style="font-size:0.6rem;color:var(--orange);background:rgba(251,191,36,0.08);padding:2px 6px;border-radius:100px;font-weight:700">${t("soon")}</span>`);
  if (m.daily) badges.push(`<span style="font-size:0.6rem;color:var(--purple);background:var(--purple-bg);padding:2px 6px;border-radius:100px;font-weight:700">${t("daily")}</span>`);

  return `<div class="money-card"${m.almostUnlocked ? ' style="border-left:3px solid var(--orange);opacity:0.85"' : ""}>
    <div class="money-card-header">
      <div class="money-card-title">${info.name}${m.members ? " \u2B50" : ""}${badges.length ? " " + badges.join(" ") : ""}</div>
      <div class="money-card-profit">${profitStr}</div>
    </div>
    <div class="money-card-desc">${desc}</div>
    <div class="money-card-reqs">${reqTags}</div>
    <div class="money-card-players">
      <span class="money-player-tag ${p1can ? "can" : "cant"}">${esc(players[0].name)} ${p1can ? "\u2713" : "\u2717"}</span>
      ${players[1] ? `<span class="money-player-tag ${p2can ? "can" : "cant"}">${esc(players[1].name)} ${p2can ? "\u2713" : "\u2717"}</span>` : ""}
    </div>
    ${!m.daily && dailyGp > 0 ? `<div class="money-card-daily">${t("perDay")}: <strong>${fmtShort(dailyGp)} gp</strong></div>` : ""}
  </div>`;
}

function renderMoney(players) {
  const lang = currentLang;
  const all = MONEY_METHODS.map((m) => ({ ...m, profit: calcProfit(m) })).sort((a, b) => b.profit - a.profit);

  // Filter
  let filtered = all;
  if (_moneyFilter === "available") filtered = all.filter(m => players.some(p => canDoMethod(p, m)) && !m.almostUnlocked);
  else if (_moneyFilter === "upcoming") filtered = all.filter(m => m.almostUnlocked || !players.some(p => canDoMethod(p, m)));

  const showAll = filtered.length <= MONEY_TOP_N;
  const visible = showAll ? filtered : filtered.slice(0, MONEY_TOP_N);
  const hidden = showAll ? [] : filtered.slice(MONEY_TOP_N);

  // Filter pills
  const grid = $("#money-grid");
  const filtersHTML = `<div class="pill-filters" style="margin-bottom:12px">
    <button class="pill money-fpill ${_moneyFilter === "all" ? "active" : ""}" data-mf="all">${t("all")} (${all.length})</button>
    <button class="pill money-fpill ${_moneyFilter === "available" ? "active" : ""}" data-mf="available">\u2713 ${lang === "pt" ? "Disponíveis" : "Available"} (${all.filter(m => players.some(p => canDoMethod(p, m)) && !m.almostUnlocked).length})</button>
    <button class="pill money-fpill ${_moneyFilter === "upcoming" ? "active" : ""}" data-mf="upcoming">\u23F3 ${lang === "pt" ? "Em breve" : "Upcoming"} (${all.filter(m => m.almostUnlocked || !players.some(p => canDoMethod(p, m))).length})</button>
  </div>`;

  grid.innerHTML = filtersHTML +
    visible.map(m => moneyCardHTML(m, players, lang)).join("") +
    (hidden.length ? `<div id="money-hidden" style="display:none">${hidden.map(m => moneyCardHTML(m, players, lang)).join("")}</div>
    <button id="money-show-more" class="pill" style="display:block;margin:12px auto;padding:8px 24px">
      ${lang === "pt" ? "Mostrar mais" : "Show more"} (+${hidden.length})
    </button>` : "");

  // Filter pill handlers
  grid.querySelectorAll(".money-fpill").forEach(btn => {
    btn.addEventListener("click", () => {
      _moneyFilter = btn.dataset.mf;
      renderMoney(players);
    });
  });

  // Show more handler
  const moreBtn = document.getElementById("money-show-more");
  if (moreBtn) {
    moreBtn.addEventListener("click", () => {
      document.getElementById("money-hidden").style.display = "block";
      moreBtn.remove();
    });
  }
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
    const resp = await fetch("https://rs3placar.goatcounter.com/counter/TOTAL.json");
    if (!resp.ok) return;
    const json = await resp.json();
    const count = json.count || json.count_unique || 0;
    if (count > 0) {
      el.textContent = `${count} ${currentLang === "pt" ? "visitas" : "visits"}`;
    }
  } catch (_) { /* GoatCounter not set up yet — silent fail */ }
}

// ---- Lazy tab rendering ----
const _renderers = {
  overview: (r) => {
    if (typeof renderGoalsSummary === "function") renderGoalsSummary(r);
    renderCards(r);
    renderH2H(r);
    renderJournal(r, "#journal-scores", null);
    if (typeof renderOverviewGainsChart === "function")
      renderOverviewGainsChart();
    if (typeof renderNextSteps === "function") renderNextSteps(r);
  },
  skills: (r) => {
    renderSkills(r);
  },
  journal: (r) => {
    renderJournal(r, "#journal-scores-full", "#journal-grid");
  },
  quests: (r) => {
    renderQuests(r);
  },
  activity: (r) => {
    renderActivity(r);
  },
  combat: (r) => {
    if (typeof renderCombat === "function") renderCombat(r);
  },
  money: (r) => {
    renderMoney(r);
  },
  meetup: () => {
    if (typeof renderMeetup === "function") renderMeetup();
  },
  easter: (r) => {
    renderEaster(r);
  },
  chat: () => {},
  lookup: () => {
    if (typeof renderLookupPage === "function") renderLookupPage();
  },
  senntisten: (r) => {
    if (typeof renderSenntisten === "function") renderSenntisten(r);
  },
  prifddinas: (r) => {
    if (typeof renderPrifddinas === "function") renderPrifddinas(r);
  },
  goals: (r) => {
    if (typeof renderGoalsPage === "function") renderGoalsPage(r);
  },
};
const _rendered = new Set();

function getActiveTab() {
  const active = document.querySelector(".page.active");
  return active ? active.dataset.page : "overview";
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
  data = results;
  _rendered.clear();
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

// ---- Main: cache-first ----
async function load() {
  const btn = $("#btn-refresh");
  btn.classList.add("spinning");
  setSource("loading", t("refreshing"));
  hideError();

  let hasCached = false;
  try {
    const cached = await Promise.all(PLAYERS.map(fetchCached));
    renderAll(cached);
    source = "cached";
    hasCached = true;
    try {
      const meta = await cacheFetch(CACHE.meta);
      const ago = Math.round((Date.now() - new Date(meta.timestamp)) / 60000);
      setSource(
        "loading",
        `${t("cached")} (${ago}${t("agoMin")}) \u2014 ${t("updatingLive")}`,
      );
      if (ago > 120) {
        // more than 2 hours
        showError(`⚠️ ${t("errOutdated").replace("{n}", ago)}`);
      }
    } catch (_) {
      setSource("loading", `${t("cached")} \u2014 ${t("updatingLive")}`);
    }
  } catch (_) {}

  try {
    const live = await Promise.all(PLAYERS.map(fetchLive));
    renderAll(live);
    source = "live";
    setSource("", t("live"));
    $("#last-updated").textContent =
      `${t("updated")} ${new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`;
    btn.classList.remove("spinning");
    return;
  } catch (_) {}

  if (hasCached) {
    try {
      const meta = await cacheFetch(CACHE.meta);
      const ago = Math.round((Date.now() - new Date(meta.timestamp)) / 60000);
      setSource("", `${t("cached")} (${ago}${t("agoMin")})`);
      $("#last-updated").textContent = `${t("cached")} ${ago}${t("agoMin")}`;
    } catch (_) {
      setSource("", t("cached"));
      $("#last-updated").textContent = t("cachedData");
    }
    btn.classList.remove("spinning");
    return;
  }

  setSource("error", t("offline"));
  showError(t("errFailed"));
  $("#loading-overlay").classList.add("hidden");
  $("#main-content").classList.add("visible");
  btn.classList.remove("spinning");
  clearTimeout(timer);
  timer = setTimeout(scheduledLoad, 30000);
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
  if (hashTab && hashTab !== "overview") {
    _navFromPop = true;
    launchSection(hashTab);
    _navFromPop = false;
  }
  // Set initial history state
  history.replaceState({ page: hashTab || "overview" }, "", window.location.hash || "#overview");
  initNavigation();
  // Handle browser back/forward (Android back button)
  window.addEventListener("popstate", (e) => {
    const page = (e.state && e.state.page) || window.location.hash.replace("#", "") || "overview";
    _navFromPop = true;
    launchSection(page);
    _navFromPop = false;
  });
  initFilters();
  if (typeof initChat === "function") initChat();
  // Easter event delegation (safe — element may not exist)
  const easterEl = document.getElementById("easter-checklist");
  if (easterEl) {
    easterEl.addEventListener("change", (e) => {
      if (!e.target.classList.contains("easter-check")) return;
      const s = JSON.parse(localStorage.getItem("rs3lb-easter") || "{}");
      if (e.target.checked) s[e.target.dataset.key] = true;
      else delete s[e.target.dataset.key];
      localStorage.setItem("rs3lb-easter", JSON.stringify(s));
    });
  }
  Promise.all([
    loadGEPrices(),
    typeof loadSessions === "function" ? loadSessions() : Promise.resolve(),
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

  // ---- Scroll-triggered reveals (IntersectionObserver) ----
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("revealed");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.06, rootMargin: "0px 0px -30px 0px" }
  );

  // Observe all cards and rows as they're added via MutationObserver
  const mutObs = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType !== 1) continue;
        // Don't reveal-target items inside scroll containers (.act-item, .ql-row)
        // — IntersectionObserver won't fire for offscreen items in overflow containers
        const revealTargets = node.querySelectorAll
          ? node.querySelectorAll(".p-card, .skill-row, .j-row, .money-card, .ns-item, .q-card, .j-score-card")
          : [];
        revealTargets.forEach((el) => {
          el.classList.add("reveal-target");
          revealObserver.observe(el);
        });
        if (node.classList && (node.classList.contains("p-card") || node.classList.contains("skill-row"))) {
          node.classList.add("reveal-target");
          revealObserver.observe(node);
        }
      }
    }
  });
  mutObs.observe(document.getElementById("main-content"), { childList: true, subtree: true });

  // ---- Chart.js RS3 theming ----
  if (typeof Chart !== "undefined") {
    Chart.defaults.color = "#9a9488";
    Chart.defaults.borderColor = "rgba(212,168,67,0.06)";
    Chart.defaults.font.family = "'Sora', 'DM Sans', system-ui, sans-serif";
    Chart.defaults.font.size = 11;
    Chart.defaults.plugins.legend.labels.boxWidth = 10;
    Chart.defaults.plugins.legend.labels.padding = 16;
    Chart.defaults.plugins.tooltip.backgroundColor = "#09091a";
    Chart.defaults.plugins.tooltip.borderColor = "rgba(212,168,67,0.15)";
    Chart.defaults.plugins.tooltip.borderWidth = 1;
    Chart.defaults.plugins.tooltip.titleFont = { weight: "bold", size: 12 };
    Chart.defaults.plugins.tooltip.cornerRadius = 6;
    Chart.defaults.plugins.tooltip.padding = 10;
    Chart.defaults.elements.bar.borderRadius = 3;
    Chart.defaults.elements.line.borderWidth = 2;
    Chart.defaults.elements.point.radius = 3;
    Chart.defaults.elements.point.hoverRadius = 5;
    Chart.defaults.scale.grid = { color: "rgba(212,168,67,0.04)", lineWidth: 1 };
  }
});
