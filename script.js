/* =============================================
   RS3 Leaderboard — script.js
   i18n, tabs, cache-first, Easter event
   ============================================= */

// ---- Global Error Handler ----
// Setup unhandled rejection and global error handlers
(function initGlobalErrorHandling() {
  if (window.__errorHandlerInit) return; // Prevent double-init
  window.__errorHandlerInit = true;
  
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled Promise Rejection:', event.reason);
    event.preventDefault();
    
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed; top: 20px; right: 20px;
      background: #ff4444; color: white; padding: 16px 20px;
      border-radius: 4px; font-size: 14px; z-index: 10000;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    `;
    notification.textContent = 'Network error. Retrying...';
    if (document.body) {
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 5000);
    }
  });
  
  // Handle global errors
  window.addEventListener('error', (event) => {
    console.error('Global Error:', event.error);
  });
})();

const PLAYERS = ["Decxus", "Soclopata"];
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
  return name ? `data/icons/${name}-icon.png` : '';
}
function skillIconImg(id, size) {
  const s = size || 20;
  return `<img src="${SKILL_ICON(id)}" width="${s}" height="${s}" alt="" loading="lazy" style="vertical-align:middle" data-fallback="hide">`;
}

// ---- Image fallback helper (CSP-safe replacement for inline onerror) ----
// Modes:
//   data-fallback="hide"  -> hide the broken image
//   data-fallback="next"  -> hide image AND make next sibling visible (grid)
//   data-fallback="emoji" -> replace with the emoji in data-emoji
function attachImgFallbacks(scope) {
  if (!scope) return;
  scope.querySelectorAll("img[data-fallback]").forEach(img => {
    if (img._fb) return;
    img._fb = true;
    img.addEventListener("error", () => {
      const mode = img.dataset.fallback;
      if (mode === "hide") {
        img.style.display = "none";
      } else if (mode === "next") {
        img.style.display = "none";
        const sib = img.nextElementSibling;
        if (sib) sib.style.display = "grid";
      } else if (mode === "emoji") {
        const emo = img.dataset.emoji || "";
        const span = document.createElement("span");
        span.textContent = emo;
        img.replaceWith(span);
      }
    });
  });
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
// Caps reflect mid-2026 RS3 state:
//   Attack/Strength/Defence/Constitution/Ranged/Magic — 120 (Combat Style
//     Modernisation, 2025-09); Prayer stayed 99.
//   Mining/Smithing — 110 (Aug 2024).
//   Woodcutting/Fletching/Firemaking — 110 (Dec 2024).
//   Runecrafting — 110 (Mar 2025).
//   Crafting — 110 (Jun 2025).
//   Thieving — 120 (Nov 2025).
//   Hunter — 110 (Mar 2026).
// Cosmetic-max caps (Cooking/Fishing/Farming/Agility/Construction/Summoning/
// Herblore/Slayer/Dungeoneering/Divination/Archaeology/Necromancy/Invention)
// kept at their existing values.
const SKILLS = [
  { id: 0, abbr: "ATK", cat: "combat", max: 120 },
  { id: 1, abbr: "DEF", cat: "combat", max: 120 },
  { id: 2, abbr: "STR", cat: "combat", max: 120 },
  { id: 3, abbr: "HP", cat: "combat", max: 120 },
  { id: 4, abbr: "RNG", cat: "combat", max: 120 },
  { id: 5, abbr: "PRA", cat: "combat", max: 99 },
  { id: 6, abbr: "MAG", cat: "combat", max: 120 },
  { id: 7, abbr: "COK", cat: "artisan", max: 99 },
  { id: 8, abbr: "WC", cat: "gathering", max: 110 },
  { id: 9, abbr: "FLE", cat: "artisan", max: 110 },
  { id: 10, abbr: "FSH", cat: "gathering", max: 99 },
  { id: 11, abbr: "FM", cat: "artisan", max: 110 },
  { id: 12, abbr: "CRA", cat: "artisan", max: 110 },
  { id: 13, abbr: "SMI", cat: "artisan", max: 110 },
  { id: 14, abbr: "MIN", cat: "gathering", max: 110 },
  { id: 15, abbr: "HER", cat: "artisan", max: 120 },
  { id: 16, abbr: "AGI", cat: "support", max: 99 },
  { id: 17, abbr: "THI", cat: "support", max: 120 },
  { id: 18, abbr: "SLA", cat: "support", max: 120 },
  { id: 19, abbr: "FAR", cat: "gathering", max: 120 },
  { id: 20, abbr: "RC", cat: "artisan", max: 110 },
  { id: 21, abbr: "HUN", cat: "gathering", max: 110 },
  { id: 22, abbr: "CON", cat: "artisan", max: 99 },
  { id: 23, abbr: "SUM", cat: "support", max: 99 },
  { id: 24, abbr: "DG", cat: "support", max: 120 },
  { id: 25, abbr: "DIV", cat: "gathering", max: 99 },
  { id: 26, abbr: "INV", cat: "support", max: 150 },
  { id: 27, abbr: "ARC", cat: "gathering", max: 120 },
  { id: 28, abbr: "NEC", cat: "combat", max: 120 },
];

// RS3 XP table: xpForLevel[L] = total XP needed for level L (1..150).
// Loop runs 149 iterations covering L=2..150; _XP_TABLE indices 0..149,
// xpForLevel(L) reads index L-1. xpForLevel(>150) clamps at level 150.
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
    check: (p) => p.totalQuests > 0 && p.questsDone >= p.totalQuests,
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
  return (p.questList || []).some((q) => q.title === name && q.status === "COMPLETED");
}
const MAX_PTS = JOURNAL.reduce((a, g) => a + g.pts, 0);

// ---- State ----
let data = [];
let persistedSnapshot = null;

// ---- Cache hierarchy (3 tiers) ----
//   1) _memCache      → in-memory, ~4.5 min, per-session (`memCacheGet/Set`)
//   2) cacheStore     → localStorage, 24h TTL, snapshot only (this block)
//   3) data/*.json    → GitHub Pages-served, ~30 min cron build
// All three are independent; failures cascade down the list.
const SNAPSHOT_TTL_MS = 24 * 60 * 60 * 1000;
const cacheStore = {
  set(key, value) {
    const wrapped = { at: Date.now(), value };
    if (typeof storage !== "undefined" && storage) { storage.set(key, wrapped); return; }
    try { localStorage.setItem("rs3lb-" + key, JSON.stringify(wrapped)); } catch {}
  },
  get(key, ttlMs) {
    let wrapped = null;
    if (typeof storage !== "undefined" && storage) {
      wrapped = storage.get(key, null);
    } else {
      try {
        const raw = localStorage.getItem("rs3lb-" + key);
        wrapped = raw ? JSON.parse(raw) : null;
      } catch { wrapped = null; }
    }
    if (!wrapped || typeof wrapped !== "object") return null;
    if (ttlMs != null && wrapped.at && Date.now() - wrapped.at > ttlMs) return null;
    return wrapped.value !== undefined ? wrapped.value : wrapped;
  },
};

// Load persisted snapshot (24h TTL). Reads the new wrapped shape; falls back
// to the legacy `rs3lb-snapshot` raw payload for one transition window.
(function _loadSnapshot() {
  const fresh = cacheStore.get("snapshot", SNAPSHOT_TTL_MS);
  if (fresh) { persistedSnapshot = fresh; return; }
  try {
    const stored = localStorage.getItem("rs3lb-snapshot");
    if (stored) {
      const parsed = JSON.parse(stored);
      // Legacy shape was the raw snapshot; new shape is `{at, value}`.
      persistedSnapshot = parsed && parsed.value ? parsed.value : parsed;
    }
  } catch (e) {
    console.warn("Failed to load persisted snapshot:", e);
  }
})();
let source = "";
let timer = null;
// Last-updated stamp: kind = "cached" with cacheAgeMin, or "live" with Date.
// Stashed at module level so updateUIText() can re-render in the new locale
// when the user toggles language without waiting for a data refresh.
let _lastUpdated = null;

function renderLastUpdated() {
  const el = document.getElementById("last-updated");
  if (!el || !_lastUpdated) return;
  if (_lastUpdated.kind === "cached") {
    const min = _lastUpdated.cacheAgeMin;
    el.textContent = min != null
      ? `${t("cached")} ${min}${t("agoMin")}`
      : t("cachedData");
  } else if (_lastUpdated.kind === "live") {
    const time = _lastUpdated.at.toLocaleTimeString(currentLang === "pt" ? "pt-BR" : "en-US", { hour: "2-digit", minute: "2-digit" });
    el.textContent = `${t("updated")} ${time}`;
  }
}
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

// ---- Fetch ----
// On GitHub Pages, direct fetch to runescape.com is always CORS-blocked, so
// we skip it entirely in the browser and race multiple CORS proxies. Local
// dev (file:// or localhost) where direct fetch works falls back gracefully.
const IS_LOCAL = typeof location !== "undefined" && /^(localhost|127\.|file)/.test(location.hostname || location.protocol);

function fetchWithTimeout(url, opts, ms) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms || 10000);
  return fetch(url, { ...opts, signal: ctrl.signal })
    .then(r => { clearTimeout(timer); return r; })
    .catch(e => { clearTimeout(timer); throw e; });
}

// CORS proxy adapters. Each takes the original URL and returns a promise of
// the parsed JSON. We race them in parallel so the first success wins —
// this masks transient slowness/outages on any single provider.
const PROXIES = [
  // CodeTabs — body passthrough, currently the most reliable.
  async (url, ms) => {
    const r = await fetchWithTimeout(`https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(url)}`, {}, ms);
    if (!r.ok) throw new Error("codetabs_fail");
    return r.json();
  },
  // AllOrigins — wraps response in {contents: stringJSON}. Sometimes slow / rate-limited.
  async (url, ms) => {
    const r = await fetchWithTimeout(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`, {}, ms);
    if (!r.ok) throw new Error("allorigins_fail");
    const w = await r.json();
    if (!w.contents) throw new Error("allorigins_empty");
    return JSON.parse(w.contents);
  },
];

// Race all proxies in parallel, take first success.
function raceProxies(url, ms) {
  return new Promise((resolve, reject) => {
    let pending = PROXIES.length, done = false;
    for (const fn of PROXIES) {
      fn(url, ms).then(v => {
        if (!done) { done = true; resolve(v); }
      }, () => {
        pending--;
        if (pending === 0 && !done) reject(new Error("all_proxies_failed"));
      });
    }
  });
}

async function liveFetch(url) {
  if (IS_LOCAL) {
    // Localhost: direct works, skip proxy round-trip.
    try {
      const r = await fetchWithTimeout(url, {}, 5000);
      if (r.ok) return await r.json();
    } catch (_) { /* fall through to proxies */ }
  }
  return raceProxies(url, 7000);
}

async function cacheFetch(path) {
  // Pages serves data/*.json with max-age=600. Without revalidation the browser
  // would happily serve a stale (potentially error-state) body for 10 minutes
  // after a fresh deploy. `no-cache` forces a conditional GET (If-None-Match),
  // so the response is either 304 (cheap) or 200 with the latest body.
  const r = await fetchWithTimeout(path, { cache: "no-cache" }, 3000);
  if (!r.ok) throw new Error("cache_miss");
  return r.json();
}

// ---- In-memory data cache ----
let _memCache = {}; // keyed by player name → parsed player object
let _memCacheTime = 0;
// TTL must outlive REFRESH_MS so memCache is still valid when the next
// scheduled load lands; otherwise a tab open >5 min always re-fetches even
// though a refresh just finished.
const MEM_CACHE_TTL = REFRESH_MS + 30_000;

function memCacheGet(name) {
  if (Date.now() - _memCacheTime > MEM_CACHE_TTL) return null;
  return _memCache[name] || null;
}

function memCacheSet(results) {
  // Preserve truthy entries instead of stomping the whole map; if only one
  // player's live fetch succeeds we still want the other's cached snapshot.
  for (let i = 0; i < PLAYERS.length; i++) {
    if (results[i]) _memCache[PLAYERS[i]] = results[i];
  }
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
  // Normalize display name. RuneMetrics returns the actual stored casing,
  // which is occasionally mixed-case "SOClOPATA". UI looks cleaner if we
  // match the canonical PLAYERS roster (Pascal-cased login).
  const rawName = profile.name || "";
  const canonical = PLAYERS.find((p) => p.toLowerCase() === rawName.toLowerCase());
  return {
    name: canonical || rawName,
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
// Dedup concurrent fetchLive(name) calls so a fast double-click on Refresh
// doesn't fan out to 12 parallel proxy requests.
const _fetchLiveInflight = new Map();
async function fetchLive(n) {
  if (_fetchLiveInflight.has(n)) return _fetchLiveInflight.get(n);
  const promise = (async () => {
    // Fetch all three live AND read cache in parallel; fall back to cached
    // pieces when individual live calls fail (e.g. quests endpoint timing
    // out via proxy while profile succeeds).
    const [p, h, q, cp, ch, cq] = await Promise.allSettled([
      liveFetch(API.profile(n)),
      liveFetch(API.hiscores(n)),
      liveFetch(API.quests(n)),
      cacheFetch(CACHE.profile(n)),
      cacheFetch(CACHE.hiscores(n)),
      cacheFetch(CACHE.quests(n)),
    ]);
    // Profile is the load-bearing piece. If live profile fails, fall back to
    // cached profile when present so we don't discard hiscores+quests data
    // that already came in. Only throw when no profile source resolved.
    let profile = null;
    if (p.status === "fulfilled") profile = p.value;
    else if (cp.status === "fulfilled") profile = cp.value;
    if (!profile) throw new Error("live_fail");
    const hiscores = h.status === "fulfilled" ? h.value : (ch.status === "fulfilled" ? ch.value : null);
    const quests   = q.status === "fulfilled" ? q.value   : (cq.status === "fulfilled" ? cq.value : null);
    return parse(profile, hiscores, quests);
  })().finally(() => _fetchLiveInflight.delete(n));
  _fetchLiveInflight.set(n, promise);
  return promise;
}

// ---- Formatting ----
// Intl.NumberFormat per locale, lazy-built and cached. Called thousands of
// times during a full render \u2014 allocating a new locale string per call was
// a measurable hot spot.
const _fmtCache = { pt: null, en: null };
function fmt(n) {
  if (n == null) return "\u2014";
  const lang = currentLang === "pt" ? "pt" : "en";
  let f = _fmtCache[lang];
  if (!f) {
    f = new Intl.NumberFormat(lang === "pt" ? "pt-BR" : "en-US");
    _fmtCache[lang] = f;
  }
  return f.format(n);
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
        : t("tied");

  $("#h2h-container").innerHTML = `
    <div class="h2h-header"><div class="h2h-name p1" style="text-align:right">${esc(a.name)}</div><div></div><div class="h2h-name p2">${esc(b.name)}</div></div>
    ${rows
      // Drop rows where both sides are 0 — the "empty bars on either side"
      // visual reads as broken rather than informative.
      .filter((r) => r.v1 > 0 || r.v2 > 0)
      .map((r) => {
        const mx = Math.max(r.v1, r.v2, 1);
        // Floor non-zero bars at 6% so a small count stays visible against a
        // larger comparator.
        const barPct = (val) => {
          if (val <= 0) return 0;
          return Math.max((val / mx) * 100, 6);
        };
        // Delta chip: rendered in the label gutter with a side hint so the
        // viewer doesn't have to mentally subtract. Hidden when tied.
        const diff = Math.abs(r.v1 - r.v2);
        const aheadCls = r.v1 > r.v2 ? "h2h-delta-p1" : r.v2 > r.v1 ? "h2h-delta-p2" : "";
        const deltaChip = diff > 0
          ? `<span class="h2h-delta ${aheadCls}">${aheadCls === "h2h-delta-p1" ? "◂ " : ""}${fmt(diff)}${aheadCls === "h2h-delta-p2" ? " ▸" : ""}</span>`
          : "";
        return `
      <div class="h2h-row">
        <div class="h2h-bar-wrap left${r.v1 >= r.v2 ? " winner" : ""}"><div class="h2h-bar" style="width:${barPct(r.v1)}%"></div><div class="h2h-val">${fmt(r.v1)}</div></div>
        <div class="h2h-label">${r.label}${deltaChip}</div>
        <div class="h2h-bar-wrap right${r.v2 >= r.v1 ? " winner" : ""}"><div class="h2h-bar" style="width:${barPct(r.v2)}%"></div><div class="h2h-val">${fmt(r.v2)}</div></div>
      </div>`;
      })
      .join("")}
    <div style="text-align:center;margin-top:8px;font-size:0.72rem;color:var(--text-3)">
      ${t("verdict")}: <strong style="color:${winsA > winsB ? "var(--purple-bright)" : winsB > winsA ? "var(--gold-bright)" : "var(--text-2)"}">${esc(verdict)}</strong>
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

  // Feed each entry through the notification system. The persistent seen-set
  // in notif.add() makes this safe across reloads — already-known entries are
  // no-ops and never re-toast. The activity tab badge mirrors today's unseen
  // count for backward compat with the existing #activity-count element.
  if (typeof notif !== "undefined" && notif.add) {
    for (const a of all) {
      if (!a.ts) continue;
      notif.add({
        type: "activity",
        ts: a.ts,
        player: a.player,
        payload: { text: a.text, classified: a.type },
      });
    }
    const todayActs = notif.todayList ? notif.todayList().filter(e => e.type === "activity" && !e.seen).length : 0;
    const badge = $("#activity-count");
    if (badge) badge.textContent = String(todayActs);
  }

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
    + (all.length > shown ? `<button class="pill feed-more" style="display:block;margin:10px auto;padding:6px 20px">${t("showMore")} (${all.length - shown})</button>` : "");

  // Remove previous listener if it exists (prevent memory leak from multiple renders)
  if (feed._activityHandler) feed.removeEventListener("click", feed._activityHandler);
  
  feed._activityHandler = function handler(e) {
    const btn = e.target.closest(".feed-more");
    if (!btn) return;
    const next = Math.min(shown + FEED_PAGE, all.length);
    const frag = all.slice(shown, next).map(renderItem).join("");
    btn.insertAdjacentHTML("beforebegin", frag);
    shown = next;
    if (shown >= all.length) btn.remove();
    else btn.textContent = `${t("showMore")} (${all.length - shown})`;
    // Re-apply active filter
    const activeFilter = document.querySelector("#activity-filters .pill.active");
    if (activeFilter && activeFilter.dataset.afilter !== "all") {
      $$(".feed-item").forEach(r => r.classList.toggle("hidden", r.dataset.atype !== activeFilter.dataset.afilter));
    }
  };
  
  feed.addEventListener("click", feed._activityHandler);
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
        <span style="font-family:var(--font-mono);font-weight:700;color:${i === 0 ? "var(--purple-bright)" : "var(--gold-bright)"}">${qp}</span> ${t("questPoints")}
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
    // After (re-)render, re-apply the current pill + search filters so a
    // cache→live re-render doesn't reset the user's view.
    queueMicrotask(() => { try { applyQuestFilters(); } catch (_) {} });
    questListEl.innerHTML = quests
      .map((q) => {
        const cat = getQCat(q);
        const isDN = doNextQuests.includes(q);
        const wikiUrl = `https://runescape.wiki/w/${encodeURIComponent(q.title.replace(/ /g, "_"))}`;
        return `<div class="ql-row" data-qcat="${cat}${isDN ? " do-next" : ""}" data-qname="${esc(q.title.toLowerCase())}">
        <div class="ql-name"><a href="${wikiUrl}" target="_blank" rel="noopener noreferrer">${esc(q.title)}</a>
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
        <div class="j-check p1-color${p1d ? " done" : ""}" title="${esc(players[0].name)}">${p1d ? "\u2713" : ""}</div>
        <div class="j-check p2-color${p2d ? " done" : ""}" title="${esc(players[1].name)}">${p2d ? "\u2713" : ""}</div>
      </div></div>`;
  }).join("");
}

// ---- Utils ----
function parseDate(s) {
  if (!s) return 0;
  // Try ISO 8601 first (e.g. meta.json timestamps); fall back to legacy
  // RuneMetrics format "DD-Mon-YYYY HH:MM" which Date() can't parse with
  // dashes.
  const iso = new Date(s);
  if (!isNaN(iso)) return iso.getTime();
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
  [/I found an /g, "Encontrei um(a) "],
  [/I found a /g, "Encontrei um(a) "],
  [/After killing a /g, "Depois de matar um(a) "],
  [/, it dropped /g, ", soltou "],
  [/I have uncovered volume (\d+) of Daemonheim's history\. I now have (\d+) volumes in total/g,
   "Descobri o volume $1 da hist\u00f3ria de Daemonheim. Agora tenho $2 volumes no total"],
  [/Daemonheim's history uncovered, (\d+) volumes found/g, "Hist\u00f3ria de Daemonheim descoberta, $1 volumes encontrados"],
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
  // Brand wordmark: "Sexta" + accented "Era". Split on the last word so a
  // future i18n title still highlights the trailing word.
  h("logo-text", (() => {
    const full = t("title") || "Sexta Era";
    const parts = full.split(" ");
    const head = parts.slice(0, -1).join(" ");
    const tail = parts.slice(-1)[0];
    return head ? `${head} <span class="accent">${tail}</span>` : `<span class="accent">${tail}</span>`;
  })());
  s("subtitle-text", t("subtitle"));
  s("lang-label", lang === "pt" ? "EN" : "PT");
  document.documentElement.lang = lang === "pt" ? "pt-BR" : "en";
  document.title = t("title") + " \u2014 Decxus & Soclopata";

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
  s("goals-title", "\uD83C\uDFAF " + t("navGoals"));
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
  const qsearch = document.getElementById("quest-search");
  if (qsearch) {
    qsearch.placeholder = t("questSearchPlaceholder");
    qsearch.setAttribute("aria-label", t("questSearchPlaceholder"));
  }

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

  // Easter event removed \u2014 section no longer exists in index.html.

  // Next Steps
  h("nextsteps-title", "\uD83C\uDFAF " + t("nextStepsTitle"));

  // Money
  h("money-title", "\uD83D\uDCB0 " + t("moneyTitle"));
  s("money-disclaimer", t("moneyDisclaimer"));

  // Home grid card labels
  s("hc-goals", t("navGoals"));
  s("hc-skills", t("navSkills"));
  s("hc-senntisten", t("navSenntisten"));
  s("hc-lookup", t("navLookup"));
  s("hc-quests", t("navQuests"));
  s("hc-activity", t("navActivity"));
  s("hc-combat", t("navCombat"));
  s("hc-journal", t("navJournal"));
  s("hc-money", t("navMoney"));
  s("home-grid-title", t("explore"));

  // Dock buttons: keep title= and aria-label= localized.
  const DOCK_KEYS = {
    dashboard: "navOverview", skills: "navSkills", quests: "navQuests",
    goals: "navGoals", activity: "navActivity", money: "navMoney",
    lookup: "navLookup", live: "navLive",
  };
  document.querySelectorAll(".dock .dock-btn[data-launch]").forEach(btn => {
    const k = DOCK_KEYS[btn.dataset.launch];
    if (k) {
      const label = t(k);
      btn.setAttribute("title", label);
      btn.setAttribute("aria-label", label);
    }
  });

  // Footer "Updated HH:MM" / "Atualizado HH:MM" relocalizes here so the lang
  // toggle doesn't have to wait for the next data refresh.
  renderLastUpdated();
  // Same treatment for the header "Cache (3min atrás)" / "Cached 3m ago" pill.
  renderSource();

  // Localize chrome tooltips so screen readers + native tooltips match the
  // active language.
  const refreshBtn = document.getElementById("btn-refresh");
  if (refreshBtn) {
    refreshBtn.setAttribute("title", t("refresh"));
    refreshBtn.setAttribute("aria-label", t("refresh"));
  }
  const langBtn = document.getElementById("lang-toggle");
  if (langBtn) {
    // Switcher, not a binary toggle — aria-label describes the destination.
    const dest = lang === "pt" ? "Switch to English" : "Mudar para português";
    langBtn.setAttribute("aria-label", dest);
    langBtn.setAttribute("title", dest);
    langBtn.removeAttribute("aria-pressed");
  }

  // Memorial section text is bilingual; re-render on lang flip.
  if (typeof renderMemorial === "function") renderMemorial();
}

// ---- Navigation: Home Grid + Floating Dock ----
let _navFromPop = false; // flag to prevent pushState during popstate

function launchSection(page) {
  // Alias: overview → dashboard
  if (page === "overview") page = "dashboard";
  // Fallback: unknown pages → dashboard (handles dead hashes like #senntisten, #easter, etc.)
  const validPages = new Set(Array.from($$(".page")).map(p => p.dataset.page));
  const wasInvalid = !validPages.has(page);
  if (wasInvalid) page = "dashboard";

  // If leaving the live tab, tear down its polling.
  const prevPage = getActiveTab();
  if (prevPage === "live" && page !== "live" && typeof liveStop === "function") {
    liveStop();
  }
  const dock = document.getElementById("dock");

  // Show target page
  $$(".page").forEach((p) => {
    const match = p.dataset.page === page;
    p.classList.toggle("active", match);
  });

  // Update dock active states
  if (dock) {
    dock.classList.add("visible");
    dock.querySelectorAll(".dock-btn").forEach((b) => {
      const isActive = b.dataset.launch === page;
      b.classList.toggle("active", isActive);
      b.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
  }

  // Normalize URL: replace stale hash on fallback so back/forward + share-links work.
  if (wasInvalid) {
    history.replaceState({ page }, "", "#" + page);
  } else if (!_navFromPop) {
    history.pushState({ page }, "", "#" + page);
  }

  // Move keyboard focus to main content for accessibility (WCAG 2.4.3)
  const pageEls = $$(".page");
  for (const el of pageEls) {
    if (el.dataset.page === page) {
      el.setAttribute("tabindex", "-1");
      el.focus();
      break;
    }
  }

  // Lazy render
  if (page === "lookup") {
    if (!_rendered.has(page)) renderTab(page, data);
  } else if (page === "archive") {
    // Archive sub-route: render the In Memoriam tribute (frozen Fiorovizk data).
    if (typeof renderMemorial === "function") renderMemorial();
  } else if (page === "live") {
    // Live tab is stateful; always re-render so it remounts and resumes polling.
    _rendered.delete("live");
    if (data.length) renderTab(page, data);
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
    // Match dock active to the currently-active page (set by launchSection
    // moments earlier on cold deep-link). Hard-coding "dashboard" here would
    // race with launchSection() and clobber the highlight.
    const active = getActiveTab();
    dock.querySelectorAll(".dock-btn").forEach((b) => {
      const isActive = b.dataset.launch === active;
      b.classList.toggle("active", isActive);
      b.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
  }
}

// Update home card stats from live data
// Removed: updateHomeStats() — targets non-existent DOM IDs (hcs-*)
// These dashboard elements don't exist in current index.html

// ---- Filters ----
// Marks one button in a pill group active + sets aria-pressed on the whole
// group so SR users hear the toggle state without title= guesses.
function _activatePill(groupSel, btn) {
  $$(groupSel + " .pill").forEach((x) => {
    const on = x === btn;
    x.classList.toggle("active", on);
    x.setAttribute("aria-pressed", on ? "true" : "false");
  });
}

function initFilters() {
  // Initial aria-pressed sync for groups that come pre-active in markup.
  for (const g of ["#skill-filters", "#skill-sort", "#journal-filters",
                   "#quest-filters", "#activity-filters"]) {
    const active = $(g + " .pill.active");
    if (active) _activatePill(g, active);
  }
  $$("#skill-filters .pill").forEach((b) =>
    b.addEventListener("click", () => {
      _activatePill("#skill-filters", b);
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
      _activatePill("#journal-filters", b);
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
      _activatePill("#skill-sort", b);
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
      _activatePill("#quest-filters", b);
      applyQuestFilters();
    }),
  );
  const questSearchEl = document.getElementById("quest-search");
  if (questSearchEl) {
    let _qsTimer = null;
    questSearchEl.addEventListener("input", () => {
      clearTimeout(_qsTimer);
      _qsTimer = setTimeout(applyQuestFilters, 120);
    });
  }
  $$("#activity-filters .pill").forEach((b) =>
    b.addEventListener("click", () => {
      _activatePill("#activity-filters", b);
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

// Quest filter pills + search box share a single re-apply function so they
// compose correctly. Module-scoped so renderQuests() can re-call it after a
// cache→live re-render.
function applyQuestFilters() {
  const activePill = document.querySelector("#quest-filters .pill.active");
  const filter = activePill ? activePill.dataset.qfilter : "all";
  const searchEl = document.getElementById("quest-search");
  const q = (searchEl ? searchEl.value : "").trim().toLowerCase();
  const rows = document.querySelectorAll(".ql-row");
  let shown = 0;
  rows.forEach((r) => {
    let show = true;
    if (filter !== "all") {
      const cats = (r.dataset.qcat || "").split(" ");
      show = cats.includes(filter);
    }
    if (show && q) {
      const name = (r.dataset.qname || r.textContent || "").toLowerCase();
      show = name.includes(q);
    }
    r.classList.toggle("hidden", !show);
    if (show) shown++;
  });
  // Result count chip (aria-live polite). Hidden on default empty state.
  const countEl = document.getElementById("quest-search-count");
  if (countEl) {
    if (q || filter !== "all") {
      const lang = typeof currentLang !== "undefined" ? currentLang : "en";
      const ofWord = lang === "pt" ? "de" : "of";
      countEl.textContent = `${shown} ${ofWord} ${rows.length}`;
      countEl.hidden = false;
    } else {
      countEl.textContent = "";
      countEl.hidden = true;
    }
  }
}

// ---- Status ----
// Tracked at module scope so updateUIText() can re-render in the new locale
// when the user toggles language without waiting for the next refresh.
let _sourceState = null;
function setSource(state, text, kind, payload) {
  $(".source-dot").className = "source-dot " + state;
  $("#source-text").textContent = text;
  _sourceState = { state, kind: kind || "text", payload };
}
function renderSource() {
  if (!_sourceState) return;
  const dot = $(".source-dot");
  const txt = $("#source-text");
  if (!dot || !txt) return;
  dot.className = "source-dot " + (_sourceState.state || "");
  const k = _sourceState.kind;
  if (k === "cached") {
    const min = _sourceState.payload;
    txt.textContent = min != null
      ? `${t("cached")} ${min}${t("agoMin")}`
      : t("cachedData");
  } else if (k === "live") {
    txt.textContent = t("live");
  } else if (k === "loading-live") {
    txt.textContent = t("updatingLive");
  } else if (k === "loading-refresh") {
    txt.textContent = t("refreshing");
  } else if (k === "offline") {
    txt.textContent = t("offline");
  }
}
function showError(msg) {
  $("#error-message").textContent = msg;
  $("#error-banner").classList.remove("hidden");
}
function hideError() {
  $("#error-banner").classList.add("hidden");
}

// ---- Codex hero: tier ribbon + era stamp ----
// The ribbon shows global goal-progress per tier (early / mid / end).
// Each sigil opens the goals page and scrolls to its tier section.
// Renders against the FIRST player by default — average across players when
// more than one is loaded so we don't show only Decxus's progress.
const TIER_ARC_LEN = 150.796;  // 2π · 24 (matches r=24 in HTML svg)

function _tierLabel(tierId) {
  const key = tierId === "early" ? "tierEarly" : tierId === "mid" ? "tierMid" : "tierEnd";
  return typeof t === "function" ? t(key) : tierId;
}

function _tierProgress(tierId, players) {
  if (typeof GOALS === "undefined" || typeof goalProgress !== "function") return null;
  const goalsInTier = GOALS.filter(g => g.tier === tierId);
  if (!goalsInTier.length) return null;
  let totalPct = 0, totalCount = 0;
  for (const p of players) {
    if (!p) continue;
    for (const g of goalsInTier) {
      const prog = goalProgress(g, p);
      totalPct += prog.pct;
      totalCount++;
    }
  }
  return totalCount ? Math.round(totalPct / totalCount) : 0;
}

function _tierIsLocked(tierId, players) {
  if (typeof TIER_DEFS === "undefined") return false;
  const def = TIER_DEFS.find(t => t.id === tierId);
  if (!def || typeof def.gate !== "function") return false;
  // Locked only when EVERY active player fails the gate
  return players.every(p => !def.gate(p));
}

function renderTierRibbon(players) {
  const ribbon = document.getElementById("tier-ribbon");
  if (!ribbon || !players || !players.length) return;
  ribbon.querySelectorAll(".tier-sigil").forEach(sigil => {
    const tier = sigil.dataset.tier;
    const pct = _tierProgress(tier, players);
    const locked = _tierIsLocked(tier, players);
    sigil.classList.toggle("tier-locked", locked);
    const nameEl = sigil.querySelector("[data-tier-name]");
    if (nameEl) nameEl.textContent = _tierLabel(tier);
    const pctEl = sigil.querySelector("[data-tier-pct]");
    if (pctEl) pctEl.textContent = pct == null ? "—" : `${pct}%`;
    const arc = sigil.querySelector("[data-tier-arc]");
    if (arc) {
      const offset = TIER_ARC_LEN * (1 - Math.max(0, Math.min(100, pct || 0)) / 100);
      arc.style.strokeDashoffset = offset.toFixed(1);
    }
  });
}

// Era stamp: roman-numeral day + month abbreviation in the masthead.
const _ROMAN = [
  [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
];
function _toRoman(n) {
  let out = "", x = n;
  for (const [v, s] of _ROMAN) while (x >= v) { out += s; x -= v; }
  return out || "I";
}
function renderEraStamp() {
  // Era stamp now serves as the In Memoriam archive entry — static text in
  // markup. Kept as a no-op so legacy callers don't break.
}
function _yearRoman(y) {
  // RS lore: Sixth Age — keep a stylized 4-digit Roman for current year.
  const map = {1:"I",2:"II",3:"III",4:"IV",5:"V",6:"VI",7:"VII",8:"VIII",9:"IX"};
  const M = "M".repeat(Math.floor(y / 1000));
  const c = Math.floor((y % 1000) / 100);
  const C = c === 9 ? "CM" : c >= 5 ? "D" + "C".repeat(c - 5) : c === 4 ? "CD" : "C".repeat(c);
  const x = Math.floor((y % 100) / 10);
  const X = x === 9 ? "XC" : x >= 5 ? "L" + "X".repeat(x - 5) : x === 4 ? "XL" : "X".repeat(x);
  const u = y % 10;
  const U = u === 9 ? "IX" : u >= 5 ? "V" + "I".repeat(u - 5) : u === 4 ? "IV" : "I".repeat(u);
  return M + C + X + U;
}

// Ribbon click handler — jump to goals page + scroll to the chosen tier.
if (typeof window !== "undefined") {
  document.addEventListener("click", (e) => {
    const sigil = e.target.closest(".tier-sigil");
    if (!sigil) return;
    const tier = sigil.dataset.tier;
    if (!tier) return;
    if (typeof launchSection === "function") launchSection("goals");
    // Defer scroll until the goals page renders its tier <details> elements
    setTimeout(() => {
      const target = document.querySelector(`.gl-tier[data-tier="${tier}"]`);
      if (target) {
        if (target.tagName === "DETAILS" && !target.open) target.setAttribute("open", "");
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 250);
  });
}

// ---- Lazy tab rendering ----
const _renderers = {
  dashboard: (r) => {
    if (typeof renderMissionControl === "function") renderMissionControl(r);
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
  live: (r) => {
    if (typeof renderLive === "function") renderLive(r);
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
  // Attach error fallbacks only to images in the active page, not entire document.
  // This avoids a full-document query-selector on every render. Idempotent: per-img
  // _fb flag prevents duplicate listeners.
  const pageEl = document.querySelector('[data-page="' + tab + '"]');
  attachImgFallbacks(pageEl || document.body);
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
  // Roll the notification window first so midnight crossings drop yesterday's
  // events before we compute level-up / quest deltas.
  if (typeof notif !== "undefined" && notif.purgeOld) notif.purgeOld();

  // Milestone notifications routed through notif.add() so dedup is persistent
  // across reloads (seen-set in localStorage). notif.add() handles toast +
  // panel insertion + cross-tab badge update; we just feed it the delta events.
  if (results.length === 2 && typeof notif !== "undefined") {
    for (let i = 0; i < 2; i++) {
      const old = data[i] || (persistedSnapshot && persistedSnapshot.players && persistedSnapshot.players[i]);
      const nw = results[i];
      if (!old || !nw) continue;
      // Level-ups: one event per skill level boundary crossed
      for (const sk of SKILLS) {
        const oldLvl = (old.skills[sk.id] || {}).level || 0;
        const newLvl = (nw.skills[sk.id] || {}).level || 0;
        if (newLvl > oldLvl && oldLvl > 0) {
          notif.add({
            type: "levelup",
            player: nw.name,
            payload: { skillId: sk.id, skillName: tSkill(sk.id), level: newLvl },
          });
        }
      }
      // Quest completion: net positive delta
      if (nw.questsDone > (old.questsDone || 0) && old.questsDone > 0) {
        const delta = nw.questsDone - old.questsDone;
        notif.add({
          type: "quest",
          player: nw.name,
          payload: { questName: `+${delta} ${t("toastQuestsCompleted")}`, delta },
        });
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

  // Codex hero: refresh the tier ribbon + era stamp on every data render.
  if (typeof renderTierRibbon === "function") renderTierRibbon(results);
  if (typeof renderEraStamp === "function") renderEraStamp();

  // Surface a non-blocking warning when the quests endpoint silently failed.
  // Without a quest list, every hasQuest()-based goal/journal item under-counts.
  const missingQuests = results.some(r => r && r.questsDone > 0 && (!r.questList || r.questList.length === 0));
  if (missingQuests) {
    showError(currentLang === "pt"
      ? "Lista de missões não carregou — alguns objetivos podem aparecer incompletos."
      : "Quest list failed to load — some goals may show as incomplete.");
  }
  // Only re-render the active tab if data actually changed
  const activeTab = getActiveTab();
  if (changed || !_rendered.has(activeTab)) {
    renderTab(activeTab, results);
  }
  // updateHomeStats() removed — targets non-existent DOM IDs

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

// ---- Main: cache-first load. Live is a quiet background enhancement. ----
//
// Flow:
//   1. Render cache instantly (preloaded by <link rel=preload>) - usually <300ms.
//   2. If cache is fresh enough (cron runs every 30m, so <25m = trust it) -> done.
//   3. Otherwise quietly try live in parallel (both players, racing 3 proxies).
//      If it succeeds, silently update; if it fails, the cache is still there.
//
// User clicking the refresh button passes forceLive=true to bypass the gate.
const CACHE_FRESH_MS = 25 * 60 * 1000;

async function load(forceLive) {
  const btn = $("#btn-refresh");
  if (btn) btn.classList.add("spinning");
  hideError();

  try {
    // ---- Step 1: read meta + every cache file in parallel
    const [metaR, ...cacheRs] = await Promise.allSettled([
      cacheFetch(CACHE.meta),
      ...PLAYERS.flatMap(n => [cacheFetch(CACHE.profile(n)), cacheFetch(CACHE.hiscores(n)), cacheFetch(CACHE.quests(n))]),
    ]);

  const meta = metaR.status === "fulfilled" ? metaR.value : null;
  const cacheAgeMs = meta ? Date.now() - new Date(meta.timestamp).getTime() : null;
  const cacheAgeMin = cacheAgeMs != null ? Math.max(0, Math.round(cacheAgeMs / 60000)) : null;

  const cachedResults = PLAYERS.map((_, i) => {
    const off = i * 3;
    const p = cacheRs[off].status === "fulfilled" ? cacheRs[off].value : null;
    const h = cacheRs[off + 1].status === "fulfilled" ? cacheRs[off + 1].value : null;
    const q = cacheRs[off + 2].status === "fulfilled" ? cacheRs[off + 2].value : null;
    if (!p || p.error) return memCacheGet(PLAYERS[i]);
    try { return parse(p, h, q); } catch (_) { return memCacheGet(PLAYERS[i]); }
  });

  const haveAllCache = cachedResults.every(r => r !== null);
  if (haveAllCache) {
    renderAll(cachedResults);
    memCacheSet(cachedResults);
    // Persist snapshot for cold-load level-up detection (24h TTL via cacheStore)
    cacheStore.set("snapshot", { at: Date.now(), players: cachedResults });
    const ageStr = cacheAgeMin != null ? ` (${cacheAgeMin}${t("agoMin")})` : "";
    setSource("", `${t("cached")}${ageStr}`, "cached", cacheAgeMin);
    _lastUpdated = { kind: "cached", cacheAgeMin };
    renderLastUpdated();
  }

  // ---- Step 2: smart-skip live when cache is cron-fresh
  const cacheIsFresh = cacheAgeMs != null && cacheAgeMs < CACHE_FRESH_MS;
  if (haveAllCache && cacheIsFresh && !forceLive) {
    btn.classList.remove("spinning");
    return;
  }

  // ---- Step 3: try live in parallel (both players, racing proxies)
  if (haveAllCache) {
    setSource("loading", t("updatingLive"), "loading-live");
  } else {
    setSource("loading", t("refreshing"), "loading-refresh");
  }

  const liveSettled = await Promise.allSettled(PLAYERS.map(fetchLive));
  const liveResults = liveSettled.map((r, i) =>
    r.status === "fulfilled" ? r.value : (cachedResults[i] || memCacheGet(PLAYERS[i]))
  );

  if (liveResults.every(r => r !== null)) {
    const anyFromLive = liveSettled.some(r => r.status === "fulfilled");
    renderAll(liveResults);
    // Persist snapshot for cold-load level-up detection (24h TTL via cacheStore)
    cacheStore.set("snapshot", { at: Date.now(), players: liveResults });
    memCacheSet(liveResults);
    if (anyFromLive) {
      setSource("", t("live"), "live");
      hideError();
      _lastUpdated = { kind: "live", at: new Date() };
      renderLastUpdated();
    } else if (cacheAgeMin != null) {
      const ageStr = ` (${cacheAgeMin}${t("agoMin")})`;
      setSource("", `${t("cached")}${ageStr}`, "cached", cacheAgeMin);
      _lastUpdated = { kind: "cached", cacheAgeMin };
      renderLastUpdated();
      if (cacheAgeMin > 120) showError(`⚠️ ${t("errOutdated").replace("{n}", cacheAgeMin)}`);
    }
    btn.classList.remove("spinning");
    return;
  }

  // ---- Step 4: nothing worked - show what we have
  if (haveAllCache) {
    const ageStr = cacheAgeMin != null ? ` (${cacheAgeMin}${t("agoMin")})` : "";
    setSource("", `${t("cached")}${ageStr}`, "cached", cacheAgeMin);
    if (cacheAgeMin != null && cacheAgeMin > 120) {
      showError(`⚠️ ${t("errOutdated").replace("{n}", cacheAgeMin)}`);
    }
  } else {
    setSource("error", t("offline"), "offline");
    showError(t("errFailed"));
    $("#loading-overlay").classList.add("hidden");
    $("#main-content").classList.add("visible");
    clearTimeout(timer);
    timer = setTimeout(scheduledLoad, 30000);
  }
    btn.classList.remove("spinning");
  } catch (err) {
    console.error("Load fatal error:", err);
    const btn = $("#btn-refresh");
    if (btn) btn.classList.remove("spinning");
    // Ensure overlay is hidden on any fatal error
    const overlay = $("#loading-overlay");
    if (overlay) overlay.classList.add("hidden");
    const content = $("#main-content");
    if (content) content.classList.add("visible");
    showError(currentLang === "pt" ? "Erro ao carregar dados. Tente novamente." : "Error loading data. Please try again.");
    // Re-throw so scheduledLoad catches it
    throw err;
  }
}

// ---- Scheduled load with guard + timeout ----
let _loading = false;
const LOAD_TIMEOUT_MS = 10000;

async function scheduledLoad(forceLive) {
  if (_loading) return;
  _loading = true;
  try {
    const loadPromise = load(forceLive);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("load_timeout")), LOAD_TIMEOUT_MS)
    );
    await Promise.race([loadPromise, timeoutPromise]);
  } catch (err) {
    console.error("Load error:", err);
    const btn = $("#btn-refresh");
    if (btn) btn.classList.remove("spinning");
    const overlay = $("#loading-overlay");
    if (overlay) overlay.classList.add("hidden");
    const content = $("#main-content");
    if (content) content.classList.add("visible");
    const errMsg = err?.message === "load_timeout"
      ? (currentLang === "pt" ? "Carregamento expirou. Tente novamente." : "Loading timed out. Please try again.")
      : (currentLang === "pt" ? "Erro ao carregar dados. Tente novamente." : "Error loading data. Please try again.");
    showError(errMsg);
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
  // Render the dashboard from cache IMMEDIATELY — don't wait for the GE
  // price API. GE prices are only needed by the money page; loading them
  // first added ~1.5s to first paint for no benefit on dashboard.
  scheduledLoad();
  // Background tasks: GE prices (used by money page).
  loadGEPrices();
  const refreshBtn = $("#btn-refresh");
  if (refreshBtn) refreshBtn.addEventListener("click", () => {
    clearTimeout(timer);
    scheduledLoad(true); // force-live: bypass the cache-fresh skip
  });
  const dismissBtn = $("#btn-dismiss-error");
  if (dismissBtn) dismissBtn.addEventListener("click", hideError);

  // ---- Notification bell ----
  // Toggle the panel; mark events as seen on open. Click-outside closes.
  // Badge updates via notif's `notif:added` and `storage` listeners already.
  const bellBtn = document.getElementById("notif-bell");
  const notifPanel = document.getElementById("notif-panel");
  if (bellBtn && notifPanel && typeof notif !== "undefined") {
    const closePanel = () => {
      notifPanel.hidden = true;
      bellBtn.setAttribute("aria-expanded", "false");
    };
    const openPanel = () => {
      notif.renderPanel(notifPanel);
      notifPanel.hidden = false;
      bellBtn.setAttribute("aria-expanded", "true");
      // Mark seen after a tick so the unseen-dots render once before fading
      setTimeout(() => {
        notif.markAllSeen();
        notif.updateBadge();
      }, 600);
    };
    bellBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (notifPanel.hidden) openPanel(); else closePanel();
    });
    document.addEventListener("click", (e) => {
      if (notifPanel.hidden) return;
      if (notifPanel.contains(e.target) || bellBtn.contains(e.target)) return;
      closePanel();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !notifPanel.hidden) closePanel();
    });
    window.addEventListener("notif:added", () => {
      notif.updateBadge();
      if (!notifPanel.hidden) notif.renderPanel(notifPanel);
    });
    notif.updateBadge();
  }

  const langBtn = $("#lang-toggle");
  if (langBtn) langBtn.addEventListener("click", () => {
    setLang(currentLang === "pt" ? "en" : "pt");
    updateUIText();
    // Force re-render of every cached tab so pills/footer/show-more strings
    // pick up the new locale immediately (renderAll's change-detection only
    // looks at XP/quest deltas, not language).
    _rendered.clear();
    if (data.length) renderAll(data);
  });
  // Pause 5-min refresh when tab is hidden to save battery and API quota
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (timer) clearTimeout(timer);
    } else {
      if (!_loading) scheduledLoad(); // Resume if not already loading
    }
  });

});
