/* =============================================
   RS3 Leaderboard — script.js
   Full-featured player comparison dashboard
   ============================================= */

// ---- Config ----
const PLAYERS = ['Fiorovizk', 'Decxus'];
const REFRESH_MS = 5 * 60 * 1000;

const API = {
  profile: (n) => `https://apps.runescape.com/runemetrics/profile/profile?user=${enc(n)}&activities=20`,
  hiscores: (n) => `https://secure.runescape.com/m=hiscore/index_lite.json?player=${enc(n)}`,
  quests: (n) => `https://apps.runescape.com/runemetrics/quests?user=${enc(n)}`,
};

const CACHE = {
  profile: (n) => `data/${n.toLowerCase()}_profile.json`,
  hiscores: (n) => `data/${n.toLowerCase()}_hiscores.json`,
  quests: (n) => `data/${n.toLowerCase()}_quests.json`,
  meta: 'data/meta.json',
};

const PROXIES = [
  (u) => `https://corsproxy.io/?${enc(u)}`,
  (u) => `https://api.allorigins.win/raw?url=${enc(u)}`,
  (u) => `https://api.codetabs.com/v1/proxy?quest=${enc(u)}`,
];

function enc(s) { return encodeURIComponent(s); }

// ---- Skills ----
const SKILLS = [
  { id:0,  name:'Attack',        abbr:'ATK', cat:'combat',    max:99  },
  { id:1,  name:'Defence',       abbr:'DEF', cat:'combat',    max:99  },
  { id:2,  name:'Strength',      abbr:'STR', cat:'combat',    max:99  },
  { id:3,  name:'Constitution',  abbr:'HP',  cat:'combat',    max:99  },
  { id:4,  name:'Ranged',        abbr:'RNG', cat:'combat',    max:99  },
  { id:5,  name:'Prayer',        abbr:'PRA', cat:'combat',    max:99  },
  { id:6,  name:'Magic',         abbr:'MAG', cat:'combat',    max:99  },
  { id:7,  name:'Cooking',       abbr:'COK', cat:'artisan',   max:99  },
  { id:8,  name:'Woodcutting',   abbr:'WC',  cat:'gathering', max:99  },
  { id:9,  name:'Fletching',     abbr:'FLE', cat:'artisan',   max:99  },
  { id:10, name:'Fishing',       abbr:'FSH', cat:'gathering', max:99  },
  { id:11, name:'Firemaking',    abbr:'FM',  cat:'artisan',   max:99  },
  { id:12, name:'Crafting',      abbr:'CRA', cat:'artisan',   max:99  },
  { id:13, name:'Smithing',      abbr:'SMI', cat:'artisan',   max:99  },
  { id:14, name:'Mining',        abbr:'MIN', cat:'gathering', max:99  },
  { id:15, name:'Herblore',      abbr:'HER', cat:'artisan',   max:120 },
  { id:16, name:'Agility',       abbr:'AGI', cat:'support',   max:99  },
  { id:17, name:'Thieving',      abbr:'THI', cat:'support',   max:99  },
  { id:18, name:'Slayer',        abbr:'SLA', cat:'support',   max:120 },
  { id:19, name:'Farming',       abbr:'FAR', cat:'gathering', max:120 },
  { id:20, name:'Runecrafting',  abbr:'RC',  cat:'artisan',   max:99  },
  { id:21, name:'Hunter',        abbr:'HUN', cat:'gathering', max:99  },
  { id:22, name:'Construction',  abbr:'CON', cat:'artisan',   max:99  },
  { id:23, name:'Summoning',     abbr:'SUM', cat:'support',   max:99  },
  { id:24, name:'Dungeoneering', abbr:'DG',  cat:'support',   max:120 },
  { id:25, name:'Divination',    abbr:'DIV', cat:'gathering', max:99  },
  { id:26, name:'Invention',     abbr:'INV', cat:'support',   max:150 },
  { id:27, name:'Archaeology',   abbr:'ARC', cat:'gathering', max:120 },
  { id:28, name:'Necromancy',    abbr:'NEC', cat:'combat',    max:120 },
];

// ---- Journal Goals ----
const JOURNAL = [
  // Combat milestones
  { id:'cb30',  cat:'combat', icon:'\u2694', title:'Apprentice Fighter',   desc:'Reach Combat Level 30',               pts:5,   check: p => p.combatLevel >= 30 },
  { id:'cb50',  cat:'combat', icon:'\u2694', title:'Warrior',              desc:'Reach Combat Level 50',               pts:10,  check: p => p.combatLevel >= 50 },
  { id:'cb75',  cat:'combat', icon:'\u2694', title:'Knight',               desc:'Reach Combat Level 75',               pts:20,  check: p => p.combatLevel >= 75 },
  { id:'cb100', cat:'combat', icon:'\u2694', title:'Champion',             desc:'Reach Combat Level 100',              pts:35,  check: p => p.combatLevel >= 100 },
  { id:'cb120', cat:'combat', icon:'\u2694', title:'Warlord',              desc:'Reach Combat Level 120',              pts:50,  check: p => p.combatLevel >= 120 },
  { id:'cb138', cat:'combat', icon:'\u2694', title:'Max Combat',           desc:'Reach Combat Level 138',              pts:75,  check: p => p.combatLevel >= 138 },

  // Skill milestones
  { id:'tl200', cat:'skills', icon:'\u2B50', title:'First Steps',         desc:'Reach Total Level 200',               pts:5,   check: p => p.totalLevel >= 200 },
  { id:'tl500', cat:'skills', icon:'\u2B50', title:'Jack of Trades',      desc:'Reach Total Level 500',               pts:10,  check: p => p.totalLevel >= 500 },
  { id:'tl750', cat:'skills', icon:'\u2B50', title:'Skilled',             desc:'Reach Total Level 750',               pts:15,  check: p => p.totalLevel >= 750 },
  { id:'tl1k',  cat:'skills', icon:'\u2B50', title:'Versatile',           desc:'Reach Total Level 1,000',             pts:25,  check: p => p.totalLevel >= 1000 },
  { id:'tl15',  cat:'skills', icon:'\u2B50', title:'Expert',              desc:'Reach Total Level 1,500',             pts:40,  check: p => p.totalLevel >= 1500 },
  { id:'tl2k',  cat:'skills', icon:'\u2B50', title:'Master',              desc:'Reach Total Level 2,000',             pts:60,  check: p => p.totalLevel >= 2000 },
  { id:'tl25',  cat:'skills', icon:'\u2B50', title:'Legendary',           desc:'Reach Total Level 2,500',             pts:80,  check: p => p.totalLevel >= 2500 },
  { id:'first50', cat:'skills', icon:'\u{1F4AA}', title:'Specialist',     desc:'Get any skill to Level 50',           pts:10,  check: p => SKILLS.some(s => (p.skills[s.id]||{}).level >= 50) },
  { id:'first80', cat:'skills', icon:'\u{1F4AA}', title:'Devoted',        desc:'Get any skill to Level 80',           pts:20,  check: p => SKILLS.some(s => (p.skills[s.id]||{}).level >= 80) },
  { id:'first99', cat:'skills', icon:'\u{1F4AA}', title:'Master of One',  desc:'Get any skill to Level 99',           pts:40,  check: p => SKILLS.some(s => (p.skills[s.id]||{}).level >= 99) },
  { id:'all30',  cat:'skills', icon:'\u{1F3AF}', title:'Well-Rounded',    desc:'All skills at least Level 30',        pts:25,  check: p => SKILLS.every(s => (p.skills[s.id]||{}).level >= 30) },
  { id:'all50',  cat:'skills', icon:'\u{1F3AF}', title:'All-Rounder',     desc:'All skills at least Level 50',        pts:50,  check: p => SKILLS.every(s => (p.skills[s.id]||{}).level >= 50) },

  // XP milestones
  { id:'xp100k', cat:'xp', icon:'\u{1F4B0}', title:'Getting Started',    desc:'Earn 100,000 Total XP',               pts:5,   check: p => p.totalXp >= 100000 },
  { id:'xp1m',   cat:'xp', icon:'\u{1F4B0}', title:'Grinder',            desc:'Earn 1,000,000 Total XP',             pts:10,  check: p => p.totalXp >= 1000000 },
  { id:'xp5m',   cat:'xp', icon:'\u{1F4B0}', title:'Dedicated',          desc:'Earn 5,000,000 Total XP',             pts:20,  check: p => p.totalXp >= 5000000 },
  { id:'xp10m',  cat:'xp', icon:'\u{1F4B0}', title:'Veteran',            desc:'Earn 10,000,000 Total XP',            pts:30,  check: p => p.totalXp >= 10000000 },
  { id:'xp50m',  cat:'xp', icon:'\u{1F4B0}', title:'Seasoned',           desc:'Earn 50,000,000 Total XP',            pts:45,  check: p => p.totalXp >= 50000000 },
  { id:'xp100m', cat:'xp', icon:'\u{1F4B0}', title:'XP Lord',            desc:'Earn 100,000,000 Total XP',           pts:60,  check: p => p.totalXp >= 100000000 },

  // Quest milestones
  { id:'q1',   cat:'quests', icon:'\u{1F4DC}', title:'Adventurer',        desc:'Complete your first quest',           pts:5,   check: p => p.questsDone >= 1 },
  { id:'q10',  cat:'quests', icon:'\u{1F4DC}', title:'Seeker',            desc:'Complete 10 quests',                  pts:10,  check: p => p.questsDone >= 10 },
  { id:'q25',  cat:'quests', icon:'\u{1F4DC}', title:'Explorer',          desc:'Complete 25 quests',                  pts:20,  check: p => p.questsDone >= 25 },
  { id:'q50',  cat:'quests', icon:'\u{1F4DC}', title:'Hero',              desc:'Complete 50 quests',                  pts:35,  check: p => p.questsDone >= 50 },
  { id:'q100', cat:'quests', icon:'\u{1F4DC}', title:'Legend',            desc:'Complete 100 quests',                 pts:55,  check: p => p.questsDone >= 100 },
  { id:'q200', cat:'quests', icon:'\u{1F4DC}', title:'Loremaster',        desc:'Complete 200 quests',                 pts:80,  check: p => p.questsDone >= 200 },

  // Notable quest milestones (check quest list)
  { id:'qds',  cat:'quests', icon:'\u{1F409}', title:'Dragon Slayer',     desc:'Complete Dragon Slayer',              pts:15,  check: p => hasQuest(p, 'Dragon Slayer') },
  { id:'qnec', cat:'quests', icon:'\u{1F480}', title:'Necromancer',       desc:'Complete Necromancy! quest',          pts:10,  check: p => hasQuest(p, 'Necromancy!') },
  { id:'qww',  cat:'quests', icon:'\u{1F43A}', title:'Spirit Caller',     desc:'Complete Wolf Whistle',               pts:8,   check: p => hasQuest(p, 'Wolf Whistle') },
  { id:'qhg',  cat:'quests', icon:'\u{1F3C6}', title:'Holy Warrior',      desc:'Complete Holy Grail',                 pts:12,  check: p => hasQuest(p, 'Holy Grail') },
  { id:'qrm',  cat:'quests', icon:'\u{1F48E}', title:'Rune Crafter',      desc:'Complete Rune Mysteries',             pts:8,   check: p => hasQuest(p, 'Rune Mysteries') },
];

function hasQuest(p, questName) {
  return p.questList.some(q => q.title === questName && q.status === 'COMPLETED');
}

// Max possible journal score
const MAX_JOURNAL_PTS = JOURNAL.reduce((a, g) => a + g.pts, 0);

// ---- State ----
let data = [];
let source = '';
let timer = null;

// ---- DOM ----
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

// ---- Fetch helpers ----
function timeoutSignal(ms) {
  const c = new AbortController();
  setTimeout(() => c.abort(), ms);
  return c.signal;
}

async function proxyFetch(url) {
  // Try direct
  try {
    const r = await fetch(url, { signal: timeoutSignal(4000) });
    if (r.ok) return await r.json();
  } catch (e) { console.log('[direct fail]', url.slice(0, 60), e.message); }

  // Try proxies
  for (const px of PROXIES) {
    try {
      const purl = px(url);
      console.log('[proxy]', purl.slice(0, 80));
      const r = await fetch(purl, { signal: timeoutSignal(10000) });
      if (r.ok) return await r.json();
      console.log('[proxy status]', r.status);
    } catch (e) { console.log('[proxy fail]', e.message); }
  }
  throw new Error('All proxies failed for: ' + url.slice(0, 60));
}

async function cacheFetch(path) {
  console.log('[cache]', path);
  const r = await fetch(path, { signal: timeoutSignal(5000), cache: 'no-cache' });
  if (!r.ok) throw new Error('cache_miss: ' + path + ' status=' + r.status);
  return await r.json();
}

// ---- Parse ----
function parse(profile, hiscores, quests) {
  if (profile.error) throw new Error(profile.error);

  const skills = {};
  for (const s of (profile.skillvalues || [])) {
    skills[s.id] = { level: s.level, xp: Math.floor(s.xp / 10), rank: s.rank };
  }

  let runeScore = 0;
  const clues = { easy:0, medium:0, hard:0, elite:0, master:0 };

  if (hiscores?.activities) {
    for (const a of hiscores.activities) {
      if (a.name === 'RuneScore') runeScore = a.score;
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
    totalQuests: profile.questscomplete + profile.questsstarted + profile.questsnotstarted,
    activities: profile.activities || [],
    skills,
    runeScore,
    clues,
    questList: quests?.quests || [],
  };
}

async function fetchLive(name) {
  const [p, h, q] = await Promise.allSettled([
    proxyFetch(API.profile(name)),
    proxyFetch(API.hiscores(name)),
    proxyFetch(API.quests(name)),
  ]);
  if (p.status === 'rejected') throw new Error('live_fail');
  return parse(p.value, h.status === 'fulfilled' ? h.value : null, q.status === 'fulfilled' ? q.value : null);
}

async function fetchCached(name) {
  const [p, h, q] = await Promise.allSettled([
    cacheFetch(CACHE.profile(name)),
    cacheFetch(CACHE.hiscores(name)),
    cacheFetch(CACHE.quests(name)),
  ]);
  if (p.status === 'rejected') throw new Error('cache_fail');
  return parse(p.value, h.status === 'fulfilled' ? h.value : null, q.status === 'fulfilled' ? q.value : null);
}

// ---- Formatting ----
function fmt(n) { return n == null ? '\u2014' : n.toLocaleString('en-US'); }
function fmtShort(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return String(n);
}

function esc(s) {
  if (s == null) return '';
  const d = document.createElement('div');
  d.textContent = String(s);
  return d.innerHTML;
}

const SWORD = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m14.5 17.5 3 3 4-4-3-3"/><path d="m3 3 7.5 7.5"/><path d="m14.5 6.5 4-4"/><path d="M18.5 2.5 22 6"/><path d="m2 22 5.5-5.5"/><path d="m6.5 17.5-3-3"/></svg>';

// ---- Render: Player Cards ----
function renderCards(players) {
  $('#player-cards').innerHTML = players.map((p, i) => {
    const c = i === 0 ? 'p1' : 'p2';
    const other = players[1 - i];
    let ahead = 0;
    SKILLS.forEach(sk => {
      if (((p.skills[sk.id] || {}).xp || 0) > ((other.skills[sk.id] || {}).xp || 0)) ahead++;
    });
    const totalClues = Object.values(p.clues).reduce((a, b) => a + b, 0);

    return `
      <div class="p-card ${c} fade-in" style="animation-delay:${i * 0.08}s">
        <div class="p-card-name">${esc(p.name)}</div>
        <div class="p-card-rank">Rank #${esc(p.rank)}</div>
        <div class="p-card-combat">${SWORD} Combat ${p.combatLevel}</div>
        <div class="p-stats">
          <div class="p-stat"><div class="p-stat-val">${fmt(p.totalLevel)}</div><div class="p-stat-label">Total Level</div></div>
          <div class="p-stat"><div class="p-stat-val">${fmtShort(p.totalXp)}</div><div class="p-stat-label">Total XP</div></div>
          <div class="p-stat"><div class="p-stat-val">${fmt(p.runeScore)}</div><div class="p-stat-label">RuneScore</div></div>
          <div class="p-stat"><div class="p-stat-val">${p.questsDone}<small style="font-size:0.6em;color:var(--text-3)">/${p.totalQuests}</small></div><div class="p-stat-label">Quests</div></div>
          <div class="p-stat"><div class="p-stat-val">${totalClues}</div><div class="p-stat-label">Clue Scrolls</div></div>
          <div class="p-stat"><div class="p-stat-val">${ahead}<small style="font-size:0.6em;color:var(--text-3)">/29</small></div><div class="p-stat-label">Skills Ahead</div></div>
        </div>
      </div>
    `;
  }).join('');
}

// ---- Render: H2H ----
function renderH2H(players) {
  const [a, b] = players;
  const rows = [
    { label: 'Total Lvl', v1: a.totalLevel, v2: b.totalLevel },
    { label: 'Total XP', v1: a.totalXp, v2: b.totalXp },
    { label: 'Combat', v1: a.combatLevel, v2: b.combatLevel },
    { label: 'Quests', v1: a.questsDone, v2: b.questsDone },
    { label: 'RuneScore', v1: a.runeScore, v2: b.runeScore },
    { label: 'Combat XP', v1: a.melee + a.magic + a.ranged, v2: b.melee + b.magic + b.ranged },
  ];

  $('#h2h-container').innerHTML = `
    <div class="h2h-header">
      <div class="h2h-name p1" style="text-align:right">${esc(a.name)}</div>
      <div></div>
      <div class="h2h-name p2">${esc(b.name)}</div>
    </div>
    ${rows.map(r => {
      const mx = Math.max(r.v1, r.v2, 1);
      return `
        <div class="h2h-row">
          <div class="h2h-bar-wrap left${r.v1 >= r.v2 ? ' winner' : ''}">
            <div class="h2h-bar" style="width:${(r.v1 / mx) * 100}%"></div>
            <div class="h2h-val">${fmt(r.v1)}</div>
          </div>
          <div class="h2h-label">${r.label}</div>
          <div class="h2h-bar-wrap right${r.v2 >= r.v1 ? ' winner' : ''}">
            <div class="h2h-bar" style="width:${(r.v2 / mx) * 100}%"></div>
            <div class="h2h-val">${fmt(r.v2)}</div>
          </div>
        </div>
      `;
    }).join('')}
  `;
}

// ---- Render: Skills ----
function renderSkills(players) {
  const [a, b] = players;
  $('#legend-p1').textContent = a.name;
  $('#legend-p2').textContent = b.name;

  $('#skills-grid').innerHTML = SKILLS.map(sk => {
    const s1 = a.skills[sk.id] || { level: 1, xp: 0 };
    const s2 = b.skills[sk.id] || { level: 1, xp: 0 };
    const a1 = s1.xp > s2.xp ? 'ahead' : s1.xp < s2.xp ? 'behind' : 'tied';
    const a2 = s2.xp > s1.xp ? 'ahead' : s2.xp < s1.xp ? 'behind' : 'tied';

    return `
      <div class="skill-row" data-cat="${sk.cat}">
        <div class="sk-name-col">
          <div class="sk-icon ${sk.cat}">${sk.abbr}</div>
          <div class="sk-name">${sk.name}</div>
        </div>
        <div class="sk-player-col">
          <div class="sk-level ${a1}">${s1.level}</div>
          <div class="sk-xp">${fmt(s1.xp)} xp</div>
          <div class="sk-bar"><div class="sk-bar-fill p1" style="width:${Math.min(s1.level / sk.max * 100, 100)}%"></div></div>
        </div>
        <div class="sk-player-col">
          <div class="sk-level ${a2}">${s2.level}</div>
          <div class="sk-xp">${fmt(s2.xp)} xp</div>
          <div class="sk-bar"><div class="sk-bar-fill p2" style="width:${Math.min(s2.level / sk.max * 100, 100)}%"></div></div>
        </div>
      </div>
    `;
  }).join('');
}

// ---- Render: Activity ----
function renderActivity(players) {
  const all = [];
  players.forEach((p, i) => {
    for (const a of p.activities) all.push({ ...a, player: p.name, pi: i, ts: parseDate(a.date) });
  });
  all.sort((a, b) => b.ts - a.ts);
  $('#activity-count').textContent = all.length;

  if (!all.length) {
    $('#activity-feed').innerHTML = '<div style="text-align:center;color:var(--text-3);padding:24px">No recent activity</div>';
    return;
  }

  $('#activity-feed').innerHTML = all.map(a => {
    const c = a.pi === 0 ? 'p1' : 'p2';
    return `
      <div class="act-item">
        <div class="act-dot ${c}"></div>
        <div class="act-body">
          <div class="act-text"><span class="act-player ${c}">${esc(a.player)}</span> \u2014 ${esc(a.text)}</div>
          ${a.details ? `<div class="act-detail">${esc(a.details)}</div>` : ''}
        </div>
        <div class="act-time">${fmtTime(a.date)}</div>
      </div>
    `;
  }).join('');
}

// ---- Render: Quests ----
function renderQuests(players) {
  $('#quest-cards').innerHTML = players.map((p, i) => {
    const c = i === 0 ? 'p1' : 'p2';
    const t = p.totalQuests || 1;
    return `
      <div class="q-card ${c} fade-in" style="animation-delay:${i * 0.08}s">
        <div class="q-header">
          <div class="q-name">${esc(p.name)}</div>
          <div class="q-pct">${Math.round(p.questsDone / t * 100)}%</div>
        </div>
        <div class="q-bar">
          <div class="q-bar-fill done" style="width:${(p.questsDone / t) * 100}%"></div>
          <div class="q-bar-fill started" style="width:${(p.questsStarted / t) * 100}%"></div>
        </div>
        <div class="q-stats">
          <div class="q-stat"><div class="q-stat-val done">${p.questsDone}</div><div class="q-stat-lbl">Complete</div></div>
          <div class="q-stat"><div class="q-stat-val started">${p.questsStarted}</div><div class="q-stat-lbl">Started</div></div>
          <div class="q-stat"><div class="q-stat-val none">${p.questsNone}</div><div class="q-stat-lbl">Remaining</div></div>
        </div>
      </div>
    `;
  }).join('');
}

// ---- Render: Journal ----
function renderJournal(players) {
  // Calculate scores
  const scores = players.map(p => {
    let total = 0;
    let done = 0;
    JOURNAL.forEach(g => { if (g.check(p)) { total += g.pts; done++; } });
    return { total, done };
  });

  // Score cards
  $('#journal-scores').innerHTML = players.map((p, i) => {
    const c = i === 0 ? 'p1' : 'p2';
    const s = scores[i];
    return `
      <div class="j-score-card ${c} fade-in" style="animation-delay:${i * 0.08}s">
        <div class="j-score-name">${esc(p.name)}</div>
        <div class="j-score-value">${s.total}</div>
        <div class="j-score-sub">${s.done}/${JOURNAL.length} goals &middot; ${MAX_JOURNAL_PTS} max</div>
        <div class="j-score-bar"><div class="j-score-bar-fill" style="width:${(s.total / MAX_JOURNAL_PTS) * 100}%"></div></div>
      </div>
    `;
  }).join('');

  // Goal rows
  $('#journal-grid').innerHTML = JOURNAL.map(g => {
    const p1done = g.check(players[0]);
    const p2done = g.check(players[1]);
    return `
      <div class="j-row" data-jcat="${g.cat}">
        <div class="j-info">
          <div class="j-title"><span class="j-title-icon">${g.icon}</span>${g.title}</div>
          <div class="j-desc">${g.desc}</div>
        </div>
        <div class="j-pts">${g.pts} pts</div>
        <div class="j-checks">
          <div class="j-check p1-color${p1done ? ' done' : ''}" title="${players[0].name}">${p1done ? '\u2713' : ''}</div>
          <div class="j-check p2-color${p2done ? ' done' : ''}" title="${players[1].name}">${p2done ? '\u2713' : ''}</div>
        </div>
      </div>
    `;
  }).join('');
}

// ---- Utils ----
function parseDate(s) {
  if (!s) return 0;
  const d = new Date(s.replace(/-/g, ' '));
  return isNaN(d) ? 0 : d.getTime();
}

function fmtTime(s) {
  if (!s) return '';
  const m = s.match(/^(\d+)-(\w+)-\d+\s+(.+)$/);
  return m ? `${m[2]} ${m[1]}, ${m[3]}` : s;
}

// ---- Filters ----
function initFilters() {
  // Skill filters
  $$('#skill-filters .pill').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('#skill-filters .pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const f = btn.dataset.filter;
      $$('.skill-row').forEach(r => r.classList.toggle('hidden', f !== 'all' && r.dataset.cat !== f));
    });
  });

  // Journal filters
  $$('#journal-filters .pill').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('#journal-filters .pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const f = btn.dataset.jfilter;
      $$('.j-row').forEach(r => r.classList.toggle('hidden', f !== 'all' && r.dataset.jcat !== f));
    });
  });
}

// ---- Status ----
function setSource(state, text) {
  $('.source-dot').className = 'source-dot ' + state;
  $('.source-text').textContent = text;
}

function showError(msg) { $('#error-message').textContent = msg; $('#error-banner').classList.remove('hidden'); }
function hideError() { $('#error-banner').classList.add('hidden'); }

// ---- Main ----
async function load() {
  const btn = $('#btn-refresh');
  btn.classList.add('spinning');
  setSource('loading', 'Refreshing...');
  hideError();

  let results = null;

  try {
    results = await Promise.all(PLAYERS.map(fetchLive));
    source = 'live';
  } catch (_) {
    try {
      results = await Promise.all(PLAYERS.map(fetchCached));
      source = 'cached';
    } catch (__) {
      setSource('error', 'Offline');
      showError('Could not load data. Retrying in 30s...');
      $('#loading-overlay').classList.add('hidden');
      $('#main-content').classList.add('visible');
      btn.classList.remove('spinning');
      clearInterval(timer);
      setTimeout(() => { load(); timer = setInterval(load, REFRESH_MS); }, 30000);
      return;
    }
  }

  data = results;
  renderCards(results);
  renderH2H(results);
  renderSkills(results);
  renderActivity(results);
  renderQuests(results);
  renderJournal(results);
  initFilters();

  const t = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  if (source === 'cached') {
    try {
      const meta = await cacheFetch(CACHE.meta);
      const ago = Math.round((Date.now() - new Date(meta.timestamp)) / 60000);
      setSource('', `Cached (${ago}m ago)`);
      $('#last-updated').textContent = `Cached ${ago}m ago`;
    } catch (_) {
      setSource('', 'Cached');
      $('#last-updated').textContent = 'Cached data';
    }
  } else {
    setSource('', 'Live');
    $('#last-updated').textContent = `Updated ${t}`;
  }

  $('#loading-overlay').classList.add('hidden');
  $('#main-content').classList.add('visible');
  btn.classList.remove('spinning');
}

// ---- Init ----
document.addEventListener('DOMContentLoaded', () => {
  load();
  timer = setInterval(load, REFRESH_MS);
  $('#btn-refresh').addEventListener('click', () => { clearInterval(timer); load(); timer = setInterval(load, REFRESH_MS); });
  $('#btn-dismiss-error').addEventListener('click', hideError);
});
