/* =============================================
   RS3 Leaderboard — script.js
   ============================================= */

// ---- Configuration ----
const PLAYERS = ['Fiorovizk', 'Decxus'];
const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

const API = {
  profile: (name) => `https://apps.runescape.com/runemetrics/profile/profile?user=${encodeURIComponent(name)}&activities=20`,
  hiscores: (name) => `https://secure.runescape.com/m=hiscore/index_lite.json?player=${encodeURIComponent(name)}`,
  quests: (name) => `https://apps.runescape.com/runemetrics/quests?user=${encodeURIComponent(name)}`,
};

// Cached data URLs (GitHub Actions pre-fetched)
const CACHED = {
  profile: (name) => `data/${name.toLowerCase()}_profile.json`,
  hiscores: (name) => `data/${name.toLowerCase()}_hiscores.json`,
  quests: (name) => `data/${name.toLowerCase()}_quests.json`,
  meta: 'data/meta.json',
};

const CORS_PROXIES = [
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
];

// ---- Skill Definitions ----
const SKILLS = [
  { id: 0, name: 'Attack', abbr: 'ATK', cat: 'combat', max: 99 },
  { id: 1, name: 'Defence', abbr: 'DEF', cat: 'combat', max: 99 },
  { id: 2, name: 'Strength', abbr: 'STR', cat: 'combat', max: 99 },
  { id: 3, name: 'Constitution', abbr: 'HP', cat: 'combat', max: 99 },
  { id: 4, name: 'Ranged', abbr: 'RNG', cat: 'combat', max: 99 },
  { id: 5, name: 'Prayer', abbr: 'PRA', cat: 'combat', max: 99 },
  { id: 6, name: 'Magic', abbr: 'MAG', cat: 'combat', max: 99 },
  { id: 7, name: 'Cooking', abbr: 'COK', cat: 'artisan', max: 99 },
  { id: 8, name: 'Woodcutting', abbr: 'WC', cat: 'gathering', max: 99 },
  { id: 9, name: 'Fletching', abbr: 'FLE', cat: 'artisan', max: 99 },
  { id: 10, name: 'Fishing', abbr: 'FSH', cat: 'gathering', max: 99 },
  { id: 11, name: 'Firemaking', abbr: 'FM', cat: 'artisan', max: 99 },
  { id: 12, name: 'Crafting', abbr: 'CRA', cat: 'artisan', max: 99 },
  { id: 13, name: 'Smithing', abbr: 'SMI', cat: 'artisan', max: 99 },
  { id: 14, name: 'Mining', abbr: 'MIN', cat: 'gathering', max: 99 },
  { id: 15, name: 'Herblore', abbr: 'HER', cat: 'artisan', max: 120 },
  { id: 16, name: 'Agility', abbr: 'AGI', cat: 'support', max: 99 },
  { id: 17, name: 'Thieving', abbr: 'THI', cat: 'support', max: 99 },
  { id: 18, name: 'Slayer', abbr: 'SLA', cat: 'support', max: 120 },
  { id: 19, name: 'Farming', abbr: 'FAR', cat: 'gathering', max: 120 },
  { id: 20, name: 'Runecrafting', abbr: 'RC', cat: 'artisan', max: 99 },
  { id: 21, name: 'Hunter', abbr: 'HUN', cat: 'gathering', max: 99 },
  { id: 22, name: 'Construction', abbr: 'CON', cat: 'artisan', max: 99 },
  { id: 23, name: 'Summoning', abbr: 'SUM', cat: 'support', max: 99 },
  { id: 24, name: 'Dungeoneering', abbr: 'DG', cat: 'support', max: 120 },
  { id: 25, name: 'Divination', abbr: 'DIV', cat: 'gathering', max: 99 },
  { id: 26, name: 'Invention', abbr: 'INV', cat: 'support', max: 150 },
  { id: 27, name: 'Archaeology', abbr: 'ARC', cat: 'gathering', max: 120 },
  { id: 28, name: 'Necromancy', abbr: 'NEC', cat: 'combat', max: 120 },
];

// ---- State ----
let playerData = [];
let refreshTimer = null;
let dataSource = 'live'; // 'live' or 'cached'

// ---- DOM Refs ----
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ---- Fetch with CORS proxy fallback ----
async function fetchWithProxy(url) {
  // Try direct first
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const text = await res.text();
      return JSON.parse(text);
    }
  } catch (_) { /* expected CORS failure */ }

  // Try proxies
  for (const proxyFn of CORS_PROXIES) {
    try {
      const proxyUrl = proxyFn(url);
      const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(10000) });
      if (res.ok) {
        const text = await res.text();
        return JSON.parse(text);
      }
    } catch (_) { continue; }
  }

  throw new Error(`All proxies failed for: ${url}`);
}

// ---- Fetch cached data (from data/ directory) ----
async function fetchCached(path) {
  const res = await fetch(path, { signal: AbortSignal.timeout(5000), cache: 'no-cache' });
  if (!res.ok) throw new Error(`Cache miss: ${path}`);
  return res.json();
}

// ---- Parse profile data into unified format ----
function parseProfile(profileData, hiscoresData, questsData) {
  if (profileData.error) throw new Error(profileData.error);

  const skills = {};
  for (const sv of (profileData.skillvalues || [])) {
    skills[sv.id] = {
      level: sv.level,
      xp: Math.floor(sv.xp / 10),
      rank: sv.rank,
    };
  }

  let runeScore = 0;
  let clueScrolls = { easy: 0, medium: 0, hard: 0, elite: 0, master: 0 };
  if (hiscoresData && hiscoresData.activities) {
    for (const act of hiscoresData.activities) {
      if (act.name === 'RuneScore') runeScore = act.score;
      if (act.name === 'Clue Scrolls (easy)') clueScrolls.easy = act.score;
      if (act.name === 'Clue Scrolls (medium)') clueScrolls.medium = act.score;
      if (act.name === 'Clue Scrolls (hard)') clueScrolls.hard = act.score;
      if (act.name === 'Clue Scrolls (elite)') clueScrolls.elite = act.score;
      if (act.name === 'Clue Scrolls (master)') clueScrolls.master = act.score;
    }
  }

  return {
    name: profileData.name,
    rank: profileData.rank,
    totalLevel: profileData.totalskill,
    totalXp: profileData.totalxp,
    combatLevel: profileData.combatlevel,
    melee: profileData.melee,
    magic: profileData.magic,
    ranged: profileData.ranged,
    questsComplete: profileData.questscomplete,
    questsStarted: profileData.questsstarted,
    questsNotStarted: profileData.questsnotstarted,
    recentActivities: profileData.activities || [],
    skills,
    runeScore,
    clueScrolls,
    quests: questsData && questsData.quests ? questsData.quests : [],
  };
}

// ---- Fetch all data for a player (live via CORS proxy) ----
async function fetchPlayerLive(name) {
  const [profile, hiscores, quests] = await Promise.allSettled([
    fetchWithProxy(API.profile(name)),
    fetchWithProxy(API.hiscores(name)),
    fetchWithProxy(API.quests(name)),
  ]);

  if (profile.status === 'rejected') throw new Error(`Live fetch failed for ${name}`);
  return parseProfile(
    profile.value,
    hiscores.status === 'fulfilled' ? hiscores.value : null,
    quests.status === 'fulfilled' ? quests.value : null,
  );
}

// ---- Fetch all data for a player (cached from data/) ----
async function fetchPlayerCached(name) {
  const [profile, hiscores, quests] = await Promise.allSettled([
    fetchCached(CACHED.profile(name)),
    fetchCached(CACHED.hiscores(name)),
    fetchCached(CACHED.quests(name)),
  ]);

  if (profile.status === 'rejected') throw new Error(`Cache fetch failed for ${name}`);
  return parseProfile(
    profile.value,
    hiscores.status === 'fulfilled' ? hiscores.value : null,
    quests.status === 'fulfilled' ? quests.value : null,
  );
}

// ---- Number Formatting ----
function fmtNum(n) {
  if (n == null) return '\u2014';
  return n.toLocaleString('en-US');
}

function fmtXpShort(xp) {
  if (xp >= 1_000_000) return (xp / 1_000_000).toFixed(1) + 'M';
  if (xp >= 1_000) return (xp / 1_000).toFixed(1) + 'K';
  return String(xp);
}

// ---- Render Overview Cards ----
function renderOverview(players) {
  const grid = $('#overview-grid');
  grid.innerHTML = players.map((p, i) => {
    const cls = i === 0 ? 'p1' : 'p2';
    const questTotal = p.questsComplete + p.questsStarted + p.questsNotStarted;
    const totalClues = p.clueScrolls.easy + p.clueScrolls.medium + p.clueScrolls.hard + p.clueScrolls.elite + p.clueScrolls.master;
    return `
      <div class="player-card ${cls} fade-in" style="animation-delay:${i * 0.1}s">
        <div class="player-name">${esc(p.name)}</div>
        <div class="player-rank">Overall Rank #${esc(p.rank)}</div>
        <div class="combat-badge">Combat Level ${p.combatLevel}</div>
        <div class="stats-row">
          <div class="stat-box">
            <div class="stat-value">${fmtNum(p.totalLevel)}</div>
            <div class="stat-label">Total Level</div>
          </div>
          <div class="stat-box">
            <div class="stat-value">${fmtXpShort(p.totalXp)}</div>
            <div class="stat-label">Total XP</div>
          </div>
          <div class="stat-box">
            <div class="stat-value">${fmtNum(p.runeScore)}</div>
            <div class="stat-label">RuneScore</div>
          </div>
          <div class="stat-box">
            <div class="stat-value">${p.questsComplete}</div>
            <div class="stat-label">Quests Done</div>
          </div>
          <div class="stat-box">
            <div class="stat-value">${questTotal}</div>
            <div class="stat-label">Total Quests</div>
          </div>
          <div class="stat-box">
            <div class="stat-value">${totalClues}</div>
            <div class="stat-label">Clue Scrolls</div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ---- Render Comparison Bars ----
function renderComparison(players) {
  const container = $('#comparison-bars');
  const p1 = players[0];
  const p2 = players[1];

  const metrics = [
    { label: 'Total Level', v1: p1.totalLevel, v2: p2.totalLevel },
    { label: 'Total XP', v1: p1.totalXp, v2: p2.totalXp },
    { label: 'Combat Level', v1: p1.combatLevel, v2: p2.combatLevel },
    { label: 'Quests Done', v1: p1.questsComplete, v2: p2.questsComplete },
    { label: 'RuneScore', v1: p1.runeScore, v2: p2.runeScore },
  ];

  container.innerHTML = `
    <div class="comp-row" style="margin-bottom:4px">
      <div style="text-align:right;font-size:0.75rem;font-weight:700;color:var(--player1);padding-right:8px">${esc(p1.name)}</div>
      <div></div>
      <div style="text-align:left;font-size:0.75rem;font-weight:700;color:var(--player2);padding-left:8px">${esc(p2.name)}</div>
    </div>
    ${metrics.map(m => {
      const max = Math.max(m.v1, m.v2, 1);
      const pct1 = (m.v1 / max) * 100;
      const pct2 = (m.v2 / max) * 100;
      return `
        <div class="comp-row">
          <div class="comp-bar-wrap left">
            <div class="comp-bar" style="width:${pct1}%"></div>
            <div class="comp-value">${fmtNum(m.v1)}</div>
          </div>
          <div class="comp-label">${m.label}</div>
          <div class="comp-bar-wrap right">
            <div class="comp-bar" style="width:${pct2}%"></div>
            <div class="comp-value">${fmtNum(m.v2)}</div>
          </div>
        </div>
      `;
    }).join('')}
  `;
}

// ---- Render Skills Grid ----
function renderSkills(players) {
  const grid = $('#skills-grid');
  const p1 = players[0];
  const p2 = players[1];

  grid.innerHTML = SKILLS.map(skill => {
    const s1 = p1.skills[skill.id] || { level: 1, xp: 0, rank: 0 };
    const s2 = p2.skills[skill.id] || { level: 1, xp: 0, rank: 0 };

    const ahead1 = s1.xp > s2.xp ? 'ahead' : s1.xp < s2.xp ? 'behind' : 'tied';
    const ahead2 = s2.xp > s1.xp ? 'ahead' : s2.xp < s1.xp ? 'behind' : 'tied';

    const pct1 = Math.min((s1.level / skill.max) * 100, 100);
    const pct2 = Math.min((s2.level / skill.max) * 100, 100);

    return `
      <div class="skill-row" data-category="${skill.cat}">
        <div class="skill-name-col">
          <div class="skill-icon ${skill.cat}">${skill.abbr}</div>
          <div class="skill-name">${skill.name}</div>
        </div>
        <div class="skill-player-col">
          <div class="skill-level ${ahead1}">${s1.level}</div>
          <div class="skill-xp">${fmtNum(s1.xp)} xp</div>
          <div class="skill-bar-track"><div class="skill-bar-fill p1-bar" style="width:${pct1}%"></div></div>
        </div>
        <div class="skill-player-col">
          <div class="skill-level ${ahead2}">${s2.level}</div>
          <div class="skill-xp">${fmtNum(s2.xp)} xp</div>
          <div class="skill-bar-track"><div class="skill-bar-fill p2-bar" style="width:${pct2}%"></div></div>
        </div>
      </div>
    `;
  }).join('');
}

// ---- Render Activity Feed ----
function renderActivities(players) {
  const feed = $('#activity-feed');
  const allActivities = [];

  players.forEach((p, i) => {
    for (const act of p.recentActivities) {
      allActivities.push({
        player: p.name,
        playerIndex: i,
        text: act.text,
        details: act.details,
        date: act.date,
        timestamp: parseRSDate(act.date),
      });
    }
  });

  allActivities.sort((a, b) => b.timestamp - a.timestamp);

  if (allActivities.length === 0) {
    feed.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:20px">No recent activity</div>';
    return;
  }

  feed.innerHTML = allActivities.map(act => {
    const cls = act.playerIndex === 0 ? 'p1' : 'p2';
    return `
      <div class="activity-item">
        <div class="activity-dot ${cls}"></div>
        <div>
          <div class="activity-text">
            <span class="activity-player ${cls}">${esc(act.player)}</span> \u2014 ${esc(act.text)}
          </div>
          ${act.details ? `<div class="activity-detail">${esc(act.details)}</div>` : ''}
        </div>
        <div class="activity-time">${esc(act.date)}</div>
      </div>
    `;
  }).join('');
}

// ---- Render Quest Progress ----
function renderQuests(players) {
  const grid = $('#quest-grid');

  grid.innerHTML = players.map((p, i) => {
    const cls = i === 0 ? 'p1' : 'p2';
    const total = p.questsComplete + p.questsStarted + p.questsNotStarted;
    const pctComplete = total > 0 ? (p.questsComplete / total) * 100 : 0;
    const pctStarted = total > 0 ? (p.questsStarted / total) * 100 : 0;

    return `
      <div class="quest-card ${cls} fade-in">
        <div class="quest-card-header">
          <div class="quest-player-name">${esc(p.name)}</div>
          <div class="quest-total">${p.questsComplete}/${total} quests</div>
        </div>
        <div class="quest-bar-track">
          <div class="quest-bar-fill completed" style="width:${pctComplete}%"></div>
          <div class="quest-bar-fill started" style="width:${pctStarted}%"></div>
        </div>
        <div class="quest-stats">
          <div class="quest-stat">
            <div class="quest-stat-value completed">${p.questsComplete}</div>
            <div class="quest-stat-label">Complete</div>
          </div>
          <div class="quest-stat">
            <div class="quest-stat-value started">${p.questsStarted}</div>
            <div class="quest-stat-label">In Progress</div>
          </div>
          <div class="quest-stat">
            <div class="quest-stat-value not-started">${p.questsNotStarted}</div>
            <div class="quest-stat-label">Not Started</div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ---- Utility ----
function parseRSDate(dateStr) {
  if (!dateStr) return 0;
  const d = new Date(dateStr.replace(/-/g, ' '));
  return isNaN(d.getTime()) ? 0 : d.getTime();
}

function esc(str) {
  if (str == null) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

// ---- Skill Filters ----
function setupFilters() {
  $$('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.dataset.filter;
      $$('.skill-row').forEach(row => {
        row.classList.toggle('hidden', filter !== 'all' && row.dataset.category !== filter);
      });
    });
  });
}

// ---- Status ----
function setStatus(state, text) {
  const dot = $('#status-badge .status-dot');
  const label = $('#status-badge .status-text');
  dot.className = 'status-dot ' + state;
  label.textContent = text;
}

function showError(msg) {
  $('#error-message').textContent = msg;
  $('#error-banner').classList.remove('hidden');
}

function hideError() {
  $('#error-banner').classList.add('hidden');
}

// ---- Main Load ----
async function loadData() {
  const refreshBtn = $('#btn-refresh');
  refreshBtn.classList.add('spinning');
  setStatus('loading', 'Refreshing...');
  hideError();

  let results = null;

  // Strategy 1: Try live data via CORS proxies
  try {
    results = await Promise.all(PLAYERS.map(fetchPlayerLive));
    dataSource = 'live';
  } catch (liveErr) {
    console.warn('Live fetch failed, trying cached data:', liveErr.message);

    // Strategy 2: Fall back to cached data from data/ directory
    try {
      results = await Promise.all(PLAYERS.map(fetchPlayerCached));
      dataSource = 'cached';
    } catch (cacheErr) {
      console.error('Both live and cached fetch failed:', cacheErr.message);
      setStatus('error', 'Error');
      showError('Failed to load data from all sources. Will retry in 30s.');
      $('#loading-overlay').classList.add('hidden');
      $('#main-content').classList.add('visible');
      refreshBtn.classList.remove('spinning');

      clearInterval(refreshTimer);
      setTimeout(() => {
        loadData();
        refreshTimer = setInterval(loadData, REFRESH_INTERVAL);
      }, 30000);
      return;
    }
  }

  playerData = results;

  renderOverview(results);
  renderComparison(results);
  renderSkills(results);
  renderActivities(results);
  renderQuests(results);
  setupFilters();

  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  if (dataSource === 'cached') {
    // Show when the cached data was fetched
    try {
      const meta = await fetchCached(CACHED.meta);
      const cacheTime = new Date(meta.timestamp);
      const ago = Math.round((now - cacheTime) / 60000);
      setStatus('', `Cached (${ago}m ago)`);
      $('#last-updated').textContent = `Cached data from ${ago}m ago \u00b7 ${timeStr}`;
    } catch (_) {
      setStatus('', `Cached \u00b7 ${timeStr}`);
      $('#last-updated').textContent = `Using cached data \u00b7 ${timeStr}`;
    }
  } else {
    setStatus('', `Live \u00b7 ${timeStr}`);
    $('#last-updated').textContent = `Live data \u00b7 Last updated: ${timeStr}`;
  }

  $('#loading-overlay').classList.add('hidden');
  $('#main-content').classList.add('visible');
  refreshBtn.classList.remove('spinning');
}

// ---- Init ----
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  refreshTimer = setInterval(loadData, REFRESH_INTERVAL);

  $('#btn-refresh').addEventListener('click', () => {
    clearInterval(refreshTimer);
    loadData();
    refreshTimer = setInterval(loadData, REFRESH_INTERVAL);
  });

  $('#btn-dismiss-error').addEventListener('click', hideError);
});
