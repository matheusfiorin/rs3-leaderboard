/* =============================================
   RS3 Leaderboard — script.js
   i18n, tabs, cache-first, Easter event
   ============================================= */

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
  { id:0,  abbr:'ATK', cat:'combat',    max:99  },
  { id:1,  abbr:'DEF', cat:'combat',    max:99  },
  { id:2,  abbr:'STR', cat:'combat',    max:99  },
  { id:3,  abbr:'HP',  cat:'combat',    max:99  },
  { id:4,  abbr:'RNG', cat:'combat',    max:99  },
  { id:5,  abbr:'PRA', cat:'combat',    max:99  },
  { id:6,  abbr:'MAG', cat:'combat',    max:99  },
  { id:7,  abbr:'COK', cat:'artisan',   max:99  },
  { id:8,  abbr:'WC',  cat:'gathering', max:99  },
  { id:9,  abbr:'FLE', cat:'artisan',   max:99  },
  { id:10, abbr:'FSH', cat:'gathering', max:99  },
  { id:11, abbr:'FM',  cat:'artisan',   max:99  },
  { id:12, abbr:'CRA', cat:'artisan',   max:99  },
  { id:13, abbr:'SMI', cat:'artisan',   max:99  },
  { id:14, abbr:'MIN', cat:'gathering', max:99  },
  { id:15, abbr:'HER', cat:'artisan',   max:120 },
  { id:16, abbr:'AGI', cat:'support',   max:99  },
  { id:17, abbr:'THI', cat:'support',   max:99  },
  { id:18, abbr:'SLA', cat:'support',   max:120 },
  { id:19, abbr:'FAR', cat:'gathering', max:120 },
  { id:20, abbr:'RC',  cat:'artisan',   max:99  },
  { id:21, abbr:'HUN', cat:'gathering', max:99  },
  { id:22, abbr:'CON', cat:'artisan',   max:99  },
  { id:23, abbr:'SUM', cat:'support',   max:99  },
  { id:24, abbr:'DG',  cat:'support',   max:120 },
  { id:25, abbr:'DIV', cat:'gathering', max:99  },
  { id:26, abbr:'INV', cat:'support',   max:150 },
  { id:27, abbr:'ARC', cat:'gathering', max:120 },
  { id:28, abbr:'NEC', cat:'combat',    max:120 },
];

// ---- Journal Goals ----
const JOURNAL = [
  { id:'cb30',  cat:'combat', icon:'\u2694', pts:5,   check: p => p.combatLevel >= 30 },
  { id:'cb50',  cat:'combat', icon:'\u2694', pts:10,  check: p => p.combatLevel >= 50 },
  { id:'cb75',  cat:'combat', icon:'\u2694', pts:20,  check: p => p.combatLevel >= 75 },
  { id:'cb100', cat:'combat', icon:'\u2694', pts:35,  check: p => p.combatLevel >= 100 },
  { id:'cb120', cat:'combat', icon:'\u2694', pts:50,  check: p => p.combatLevel >= 120 },
  { id:'cb138', cat:'combat', icon:'\u2694', pts:75,  check: p => p.combatLevel >= 138 },
  { id:'tl200', cat:'skills', icon:'\u2B50', pts:5,   check: p => p.totalLevel >= 200 },
  { id:'tl500', cat:'skills', icon:'\u2B50', pts:10,  check: p => p.totalLevel >= 500 },
  { id:'tl750', cat:'skills', icon:'\u2B50', pts:15,  check: p => p.totalLevel >= 750 },
  { id:'tl1k',  cat:'skills', icon:'\u2B50', pts:25,  check: p => p.totalLevel >= 1000 },
  { id:'tl15',  cat:'skills', icon:'\u2B50', pts:40,  check: p => p.totalLevel >= 1500 },
  { id:'tl2k',  cat:'skills', icon:'\u2B50', pts:60,  check: p => p.totalLevel >= 2000 },
  { id:'tl25',  cat:'skills', icon:'\u2B50', pts:80,  check: p => p.totalLevel >= 2500 },
  { id:'first50', cat:'skills', icon:'\uD83D\uDCAA', pts:10, check: p => SKILLS.some(s => (p.skills[s.id]||{}).level >= 50) },
  { id:'first80', cat:'skills', icon:'\uD83D\uDCAA', pts:20, check: p => SKILLS.some(s => (p.skills[s.id]||{}).level >= 80) },
  { id:'first99', cat:'skills', icon:'\uD83D\uDCAA', pts:40, check: p => SKILLS.some(s => (p.skills[s.id]||{}).level >= 99) },
  { id:'all30',  cat:'skills', icon:'\uD83C\uDFAF', pts:25, check: p => SKILLS.every(s => (p.skills[s.id]||{}).level >= 30) },
  { id:'all50',  cat:'skills', icon:'\uD83C\uDFAF', pts:50, check: p => SKILLS.every(s => (p.skills[s.id]||{}).level >= 50) },
  { id:'xp100k', cat:'xp', icon:'\uD83D\uDCB0', pts:5,  check: p => p.totalXp >= 100000 },
  { id:'xp1m',   cat:'xp', icon:'\uD83D\uDCB0', pts:10, check: p => p.totalXp >= 1000000 },
  { id:'xp5m',   cat:'xp', icon:'\uD83D\uDCB0', pts:20, check: p => p.totalXp >= 5000000 },
  { id:'xp10m',  cat:'xp', icon:'\uD83D\uDCB0', pts:30, check: p => p.totalXp >= 10000000 },
  { id:'xp50m',  cat:'xp', icon:'\uD83D\uDCB0', pts:45, check: p => p.totalXp >= 50000000 },
  { id:'xp100m', cat:'xp', icon:'\uD83D\uDCB0', pts:60, check: p => p.totalXp >= 100000000 },
  { id:'q1',   cat:'quests', icon:'\uD83D\uDCDC', pts:5,  check: p => p.questsDone >= 1 },
  { id:'q10',  cat:'quests', icon:'\uD83D\uDCDC', pts:10, check: p => p.questsDone >= 10 },
  { id:'q25',  cat:'quests', icon:'\uD83D\uDCDC', pts:20, check: p => p.questsDone >= 25 },
  { id:'q50',  cat:'quests', icon:'\uD83D\uDCDC', pts:35, check: p => p.questsDone >= 50 },
  { id:'q100', cat:'quests', icon:'\uD83D\uDCDC', pts:55, check: p => p.questsDone >= 100 },
  { id:'q200', cat:'quests', icon:'\uD83D\uDCDC', pts:80, check: p => p.questsDone >= 200 },
  { id:'qds',  cat:'quests', icon:'\uD83D\uDC09', pts:15, check: p => hasQuest(p, 'Dragon Slayer') },
  { id:'qnec', cat:'quests', icon:'\uD83D\uDC80', pts:10, check: p => hasQuest(p, 'Necromancy!') },
  { id:'qww',  cat:'quests', icon:'\uD83D\uDC3A', pts:8,  check: p => hasQuest(p, 'Wolf Whistle') },
  { id:'qhg',  cat:'quests', icon:'\uD83C\uDFC6', pts:12, check: p => hasQuest(p, 'Holy Grail') },
  { id:'qrm',  cat:'quests', icon:'\uD83D\uDC8E', pts:8,  check: p => hasQuest(p, 'Rune Mysteries') },
];
function hasQuest(p, name) { return p.questList.some(q => q.title === name && q.status === 'COMPLETED'); }
const MAX_PTS = JOURNAL.reduce((a, g) => a + g.pts, 0);

// ---- Easter Goals (manual, localStorage) ----
const EASTER = [
  { id: 'e_tutorial', icon: '\uD83D\uDC30' },
  { id: 'e_week1',    icon: '\uD83E\uDD5A' },
  { id: 'e_week2',    icon: '\uD83E\uDD5A' },
  { id: 'e_week3',    icon: '\uD83E\uDD5A' },
  { id: 'e_all21',    icon: '\uD83C\uDFC6' },
  { id: 'e_tokens',   icon: '\uD83D\uDCB0' },
  { id: 'e_reward',   icon: '\uD83C\uDF81' },
  { id: 'e_bunny',    icon: '\uD83D\uDC30' },
];
const EASTER_I18N = {
  pt: {
    e_tutorial: { title: 'Completar Blooming Burrow Egg Hunt', desc: 'Pr\u00e9-requisito para a Ca\u00e7a aos Ovos' },
    e_week1:    { title: 'Encontrar Ovos da Semana 1', desc: '7 ovos dourados (3 F2P)' },
    e_week2:    { title: 'Encontrar Ovos da Semana 2', desc: '7 ovos dourados (3 F2P)' },
    e_week3:    { title: 'Encontrar Ovos da Semana 3', desc: '7 ovos dourados (3 F2P)' },
    e_all21:    { title: 'Encontrar todos os 21 ovos', desc: 'Mestre da Ca\u00e7a aos Ovos' },
    e_tokens:   { title: 'Gastar Spring Tokens', desc: 'Na loja Grand Eggs-change' },
    e_reward:   { title: 'Receber Holiday Reward Casket', desc: 'Completar 12+ ovos e falar com Nougat Bunny' },
    e_bunny:    { title: 'Desbloquear Bunny Pet Cosmetic', desc: 'Token de apar\u00eancia de bichinho de P\u00e1scoa' },
    infoTitle:  'Sobre o Evento',
    infoItems: [
      'Blooming Burrow acess\u00edvel pelo portal ao norte do Grand Exchange em Varrock',
      'Evento: 30 Mar - 20 Abr 2026',
      'Cada ovo encontrado d\u00e1 200 Spring Tokens + 10 Treasure Trail Points',
      'Ovos liberados semanalmente (7 por semana, 3 F2P)',
      'Fale com Nougat Bunny para a primeira pista de cada semana',
      'Spring Tokens tamb\u00e9m obtidos treinando habilidades durante o evento',
    ],
  },
  en: {
    e_tutorial: { title: 'Complete Blooming Burrow Egg Hunt', desc: 'Prerequisite for the Egg Hunt' },
    e_week1:    { title: 'Find Week 1 Eggs', desc: '7 golden eggs (3 F2P)' },
    e_week2:    { title: 'Find Week 2 Eggs', desc: '7 golden eggs (3 F2P)' },
    e_week3:    { title: 'Find Week 3 Eggs', desc: '7 golden eggs (3 F2P)' },
    e_all21:    { title: 'Find all 21 eggs', desc: 'Master Egg Hunter' },
    e_tokens:   { title: 'Spend Spring Tokens', desc: 'At The Grand Eggs-change' },
    e_reward:   { title: 'Receive Holiday Reward Casket', desc: 'Complete 12+ eggs and talk to Nougat Bunny' },
    e_bunny:    { title: 'Unlock Bunny Pet Cosmetic', desc: 'Easter pet appearance token' },
    infoTitle:  'About the Event',
    infoItems: [
      'Blooming Burrow accessible via portal north of Grand Exchange in Varrock',
      'Event: Mar 30 - Apr 20, 2026',
      'Each egg found awards 200 Spring Tokens + 10 Treasure Trail Points',
      'Eggs released weekly (7 per week, 3 F2P)',
      'Talk to Nougat Bunny for each week\'s first clue',
      'Spring Tokens also earnable through skilling during the event',
    ],
  },
};

// ---- State ----
let data = [];
let source = '';
let timer = null;
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

// ---- Fetch ----
function timeoutSignal(ms) { const c = new AbortController(); setTimeout(() => c.abort(), ms); return c.signal; }

async function proxyFetch(url) {
  try { const r = await fetch(url, { signal: timeoutSignal(3000) }); if (r.ok) return await r.json(); } catch (_) {}
  for (const px of PROXIES) {
    try { const r = await fetch(px(url), { signal: timeoutSignal(5000) }); if (r.ok) return await r.json(); } catch (_) {}
  }
  throw new Error('proxy_fail');
}
async function cacheFetch(path) {
  const r = await fetch(path, { signal: timeoutSignal(5000), cache: 'no-cache' });
  if (!r.ok) throw new Error('cache_miss');
  return await r.json();
}

function parse(profile, hiscores, quests) {
  if (profile.error) throw new Error(profile.error);
  const skills = {};
  for (const s of (profile.skillvalues || [])) skills[s.id] = { level: s.level, xp: Math.floor(s.xp / 10), rank: s.rank };
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
    name: profile.name, rank: profile.rank, totalLevel: profile.totalskill, totalXp: profile.totalxp,
    combatLevel: profile.combatlevel, melee: profile.melee, magic: profile.magic, ranged: profile.ranged,
    questsDone: profile.questscomplete, questsStarted: profile.questsstarted, questsNone: profile.questsnotstarted,
    totalQuests: profile.questscomplete + profile.questsstarted + profile.questsnotstarted,
    activities: profile.activities || [], skills, runeScore, clues,
    questList: quests?.quests || [],
  };
}
async function fetchLive(n) {
  const [p,h,q] = await Promise.allSettled([proxyFetch(API.profile(n)), proxyFetch(API.hiscores(n)), proxyFetch(API.quests(n))]);
  if (p.status==='rejected') throw new Error('live_fail');
  return parse(p.value, h.status==='fulfilled'?h.value:null, q.status==='fulfilled'?q.value:null);
}
async function fetchCached(n) {
  const [p,h,q] = await Promise.allSettled([cacheFetch(CACHE.profile(n)), cacheFetch(CACHE.hiscores(n)), cacheFetch(CACHE.quests(n))]);
  if (p.status==='rejected') throw new Error('cache_fail');
  return parse(p.value, h.status==='fulfilled'?h.value:null, q.status==='fulfilled'?q.value:null);
}

// ---- Formatting ----
function fmt(n) { return n == null ? '\u2014' : n.toLocaleString('en-US'); }
function fmtShort(n) { if (n>=1e6) return (n/1e6).toFixed(1)+'M'; if (n>=1e3) return (n/1e3).toFixed(1)+'K'; return String(n); }
function esc(s) { if (s==null) return ''; const d=document.createElement('div'); d.textContent=String(s); return d.innerHTML; }
const SWORD='<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m14.5 17.5 3 3 4-4-3-3"/><path d="m3 3 7.5 7.5"/><path d="m14.5 6.5 4-4"/><path d="M18.5 2.5 22 6"/><path d="m2 22 5.5-5.5"/><path d="m6.5 17.5-3-3"/></svg>';

// ---- Render: Player Cards ----
function renderCards(players) {
  $('#player-cards').innerHTML = players.map((p,i) => {
    const c = i===0?'p1':'p2';
    const other = players[1-i];
    let ahead=0;
    SKILLS.forEach(sk => { if(((p.skills[sk.id]||{}).xp||0)>((other.skills[sk.id]||{}).xp||0)) ahead++; });
    const totalClues = Object.values(p.clues).reduce((a,b)=>a+b,0);
    return `
      <div class="p-card ${c} fade-in" style="animation-delay:${i*0.08}s">
        <div class="p-card-name">${esc(p.name)}</div>
        <div class="p-card-rank">${t('overallRank')} #${esc(p.rank)}</div>
        <div class="p-card-combat">${SWORD} ${t('combat')} ${p.combatLevel}</div>
        <div class="p-stats">
          <div class="p-stat"><div class="p-stat-val">${fmt(p.totalLevel)}</div><div class="p-stat-label">${t('totalLevel')}</div></div>
          <div class="p-stat"><div class="p-stat-val">${fmtShort(p.totalXp)}</div><div class="p-stat-label">${t('totalXp')}</div></div>
          <div class="p-stat"><div class="p-stat-val">${fmt(p.runeScore)}</div><div class="p-stat-label">${t('runeScore')}</div></div>
          <div class="p-stat"><div class="p-stat-val">${p.questsDone}<small style="font-size:0.6em;color:var(--text-3)">/${p.totalQuests}</small></div><div class="p-stat-label">${t('questsDone')}</div></div>
          <div class="p-stat"><div class="p-stat-val">${totalClues}</div><div class="p-stat-label">${t('clueScrolls')}</div></div>
          <div class="p-stat"><div class="p-stat-val">${ahead}<small style="font-size:0.6em;color:var(--text-3)">/29</small></div><div class="p-stat-label">${t('skillsAhead')}</div></div>
        </div>
      </div>`;
  }).join('');
}

// ---- Render: H2H ----
function renderH2H(players) {
  const [a,b] = players;
  const rows = [
    { label: t('totalLevel'), v1:a.totalLevel, v2:b.totalLevel },
    { label: t('totalXp'), v1:a.totalXp, v2:b.totalXp },
    { label: t('combat'), v1:a.combatLevel, v2:b.combatLevel },
    { label: t('questsDone'), v1:a.questsDone, v2:b.questsDone },
    { label: t('runeScore'), v1:a.runeScore, v2:b.runeScore },
    { label: t('combatXp'), v1:a.melee+a.magic+a.ranged, v2:b.melee+b.magic+b.ranged },
  ];
  $('#h2h-container').innerHTML = `
    <div class="h2h-header"><div class="h2h-name p1" style="text-align:right">${esc(a.name)}</div><div></div><div class="h2h-name p2">${esc(b.name)}</div></div>
    ${rows.map(r => { const mx=Math.max(r.v1,r.v2,1); return `
      <div class="h2h-row">
        <div class="h2h-bar-wrap left${r.v1>=r.v2?' winner':''}"><div class="h2h-bar" style="width:${(r.v1/mx)*100}%"></div><div class="h2h-val">${fmt(r.v1)}</div></div>
        <div class="h2h-label">${r.label}</div>
        <div class="h2h-bar-wrap right${r.v2>=r.v1?' winner':''}"><div class="h2h-bar" style="width:${(r.v2/mx)*100}%"></div><div class="h2h-val">${fmt(r.v2)}</div></div>
      </div>`; }).join('')}`;
}

// ---- Render: Skills ----
function renderSkills(players) {
  const [a,b] = players;
  $('#legend-p1').textContent = a.name;
  $('#legend-p2').textContent = b.name;
  $('#skills-grid').innerHTML = SKILLS.map(sk => {
    const s1=a.skills[sk.id]||{level:1,xp:0}, s2=b.skills[sk.id]||{level:1,xp:0};
    const a1=s1.xp>s2.xp?'ahead':s1.xp<s2.xp?'behind':'tied';
    const a2=s2.xp>s1.xp?'ahead':s2.xp<s1.xp?'behind':'tied';
    return `
      <div class="skill-row" data-cat="${sk.cat}">
        <div class="sk-name-col"><div class="sk-icon ${sk.cat}">${sk.abbr}</div><div class="sk-name">${tSkill(sk.id)}</div></div>
        <div class="sk-player-col"><div class="sk-level ${a1}">${s1.level}</div><div class="sk-xp">${fmt(s1.xp)} ${t('xp')}</div>
          <div class="sk-bar"><div class="sk-bar-fill p1" style="width:${Math.min(s1.level/sk.max*100,100)}%"></div></div></div>
        <div class="sk-player-col"><div class="sk-level ${a2}">${s2.level}</div><div class="sk-xp">${fmt(s2.xp)} ${t('xp')}</div>
          <div class="sk-bar"><div class="sk-bar-fill p2" style="width:${Math.min(s2.level/sk.max*100,100)}%"></div></div></div>
      </div>`;
  }).join('');
}

// ---- Render: Activity ----
function renderActivity(players) {
  const all=[];
  players.forEach((p,i)=>{ for(const a of p.activities) all.push({...a,player:p.name,pi:i,ts:parseDate(a.date)}); });
  all.sort((a,b)=>b.ts-a.ts);
  $('#activity-count').textContent=all.length;
  if(!all.length){ $('#activity-feed').innerHTML=`<div style="text-align:center;color:var(--text-3);padding:24px">${t('noActivity')}</div>`; return; }
  $('#activity-feed').innerHTML=all.map(a=>{const c=a.pi===0?'p1':'p2'; return `
    <div class="act-item"><div class="act-dot ${c}"></div><div class="act-body">
      <div class="act-text"><span class="act-player ${c}">${esc(a.player)}</span> \u2014 ${esc(localizeActivity(a.text))}</div>
      ${a.details?`<div class="act-detail">${esc(localizeActivity(a.details))}</div>`:''}</div>
      <div class="act-time">${fmtTime(a.date)}</div></div>`; }).join('');
}

// ---- Render: Quests ----
function renderQuests(players) {
  $('#quest-cards').innerHTML = players.map((p,i) => {
    const c=i===0?'p1':'p2'; const total=p.totalQuests||1;
    return `
      <div class="q-card ${c} fade-in"><div class="q-header"><div class="q-name">${esc(p.name)}</div><div class="q-pct">${Math.round(p.questsDone/total*100)}%</div></div>
        <div class="q-bar"><div class="q-bar-fill done" style="width:${(p.questsDone/total)*100}%"></div><div class="q-bar-fill started" style="width:${(p.questsStarted/total)*100}%"></div></div>
        <div class="q-stats">
          <div class="q-stat"><div class="q-stat-val done">${p.questsDone}</div><div class="q-stat-lbl">${t('complete')}</div></div>
          <div class="q-stat"><div class="q-stat-val started">${p.questsStarted}</div><div class="q-stat-lbl">${t('started')}</div></div>
          <div class="q-stat"><div class="q-stat-val none">${p.questsNone}</div><div class="q-stat-lbl">${t('remaining')}</div></div>
        </div></div>`; }).join('');
}

// ---- Render: Journal ----
function renderJournal(players, targetScores, targetGrid) {
  const scores = players.map(p => { let tot=0,done=0; JOURNAL.forEach(g=>{if(g.check(p)){tot+=g.pts;done++;}}); return {tot,done}; });
  $(targetScores).innerHTML = players.map((p,i) => {
    const c=i===0?'p1':'p2'; const s=scores[i];
    return `<div class="j-score-card ${c} fade-in"><div class="j-score-name">${esc(p.name)}</div>
      <div class="j-score-value">${s.tot}</div>
      <div class="j-score-sub">${s.done}/${JOURNAL.length} ${t('goals')} \u00b7 ${MAX_PTS} ${t('max')}</div>
      <div class="j-score-bar"><div class="j-score-bar-fill" style="width:${(s.tot/MAX_PTS)*100}%"></div></div></div>`; }).join('');

  if(!targetGrid) return;
  $(targetGrid).innerHTML = JOURNAL.map(g => {
    const j=tJournal(g.id); const p1d=g.check(players[0]); const p2d=g.check(players[1]);
    return `<div class="j-row" data-jcat="${g.cat}"><div class="j-info">
      <div class="j-title"><span class="j-title-icon">${g.icon}</span>${j.title}</div><div class="j-desc">${j.desc}</div></div>
      <div class="j-pts">${g.pts} ${t('pts')}</div>
      <div class="j-checks">
        <div class="j-check p1-color${p1d?' done':''}" title="${players[0].name}">${p1d?'\u2713':''}</div>
        <div class="j-check p2-color${p2d?' done':''}" title="${players[1].name}">${p2d?'\u2713':''}</div>
      </div></div>`; }).join('');
}

// ---- Render: Easter ----
function renderEaster(players) {
  const easterLang = EASTER_I18N[currentLang] || EASTER_I18N.en;
  const saved = JSON.parse(localStorage.getItem('rs3lb-easter') || '{}');

  $('#easter-checklist').innerHTML = EASTER.map(e => {
    const info = easterLang[e.id] || {};
    return players.map((p,i) => {
      const key = `${e.id}_${p.name}`;
      const checked = saved[key] ? 'checked' : '';
      const c = i===0?'p1':'p2';
      return `<div class="easter-item">
        <input type="checkbox" class="easter-check" data-key="${key}" ${checked}>
        <div class="easter-item-info"><div class="easter-item-title">${e.icon} ${info.title||e.id}</div><div class="easter-item-desc">${info.desc||''}</div></div>
        <div class="easter-item-player ${c}">${esc(p.name)}</div>
      </div>`;
    }).join('');
  }).join('');

  // Save checkbox state
  $$('.easter-check').forEach(cb => {
    cb.addEventListener('change', () => {
      const s = JSON.parse(localStorage.getItem('rs3lb-easter')||'{}');
      if(cb.checked) s[cb.dataset.key]=true; else delete s[cb.dataset.key];
      localStorage.setItem('rs3lb-easter', JSON.stringify(s));
    });
  });

  // Info section
  $('#easter-info').innerHTML = `<h3>${easterLang.infoTitle||'Info'}</h3><ul>${(easterLang.infoItems||[]).map(i=>`<li>${i}</li>`).join('')}</ul>`;
}

// ---- Utils ----
function parseDate(s) { if(!s) return 0; const d=new Date(s.replace(/-/g,' ')); return isNaN(d)?0:d.getTime(); }
function fmtTime(s) { if(!s) return ''; const m=s.match(/^(\d+)-(\w+)-\d+\s+(.+)$/); return m?`${m[2]} ${m[1]}, ${m[3]}`:s; }

// Translate activity text by replacing English skill names with localized ones
const EN_SKILL_NAMES = ['Attack','Defence','Strength','Constitution','Ranged','Prayer','Magic','Cooking','Woodcutting','Fletching','Fishing','Firemaking','Crafting','Smithing','Mining','Herblore','Agility','Thieving','Slayer','Farming','Runecrafting','Hunter','Construction','Summoning','Dungeoneering','Divination','Invention','Archaeology','Necromancy'];
function localizeActivity(text) {
  if (currentLang === 'en' || !text) return text;
  let out = text;
  // Replace English skill names with PT-BR
  EN_SKILL_NAMES.forEach((en, i) => { out = out.replace(new RegExp('\\b'+en+'\\b','g'), tSkill(i)); });
  // Common phrases
  out = out.replace(/Levelled up/g, 'Subiu de n\u00edvel em');
  out = out.replace(/Quest complete:/g, 'Miss\u00e3o completa:');
  out = out.replace(/Total levels gained/g, 'N\u00edveis totais alcan\u00e7ados');
  out = out.replace(/I levelled my/g, 'Subi n\u00edvel em');
  out = out.replace(/skill, I am now level/g, ', agora estou no n\u00edvel');
  return out;
}

// ---- UI: update all i18n text ----
function updateUIText() {
  const lang = currentLang;
  // Header
  $('#logo-text').innerHTML = `RS3 <span class="accent">${lang==='pt'?'Placar':'Leaderboard'}</span>`;
  $('#subtitle-text').textContent = t('subtitle');
  $('#lang-label').textContent = lang==='pt'?'EN':'PT';
  document.documentElement.lang = lang==='pt'?'pt-BR':'en';
  document.title = lang==='pt'?'RS3 Placar \u2014 Fiorovizk vs Decxus':'RS3 Leaderboard \u2014 Fiorovizk vs Decxus';
  // Tabs
  $('#tab-overview').textContent = t('navOverview');
  $('#tab-skills').textContent = t('navSkills');
  $('#tab-journal').textContent = t('navJournal');
  $('#tab-quests').textContent = t('navQuests');
  $('#tab-activity').textContent = t('navActivity');
  $('#tab-easter').innerHTML = '\uD83E\uDD5A ' + (lang==='pt'?'P\u00e1scoa':'Easter');
  // Section titles
  $('#h2h-title').textContent = t('h2hTitle');
  $('#journal-score-title').textContent = t('journalTitle');
  $('#skills-title').textContent = t('skillsTitle');
  $('#journal-title').textContent = t('journalTitle');
  $('#quests-title').textContent = t('questsTitle');
  $('#activity-title').textContent = t('activityTitle');
  $('#legend-ahead').textContent = t('ahead');
  // Filters
  $('#filter-all').textContent = t('all');
  $('#filter-combat').textContent = t('catCombat');
  $('#filter-gathering').textContent = t('catGathering');
  $('#filter-artisan').textContent = t('catArtisan');
  $('#filter-support').textContent = t('catSupport');
  $('#jfilter-all').textContent = t('all');
  $('#jfilter-combat').textContent = tJournalCat('combat');
  $('#jfilter-skills').textContent = tJournalCat('skills');
  $('#jfilter-quests').textContent = tJournalCat('quests');
  // Footer
  $('#footer-api').textContent = t('footerApi');
  $('#footer-refresh').textContent = t('footerRefresh');
  // Loader
  $('#loader-text').textContent = t('loading');
  // Easter
  const eLang = EASTER_I18N[lang] || EASTER_I18N.en;
  $('#easter-title').textContent = 'Gielinor Egg Hunt 2026';
  $('#easter-sub').textContent = 'Blooming Burrow \u00b7 30 Mar - 20 ' + (lang==='pt'?'Abr':'Apr');
  // Money
  $('#money-title').innerHTML = '\uD83D\uDCB0 ' + (lang==='pt'?'Formas de Ganhar GP':'Money Making');
  $('#money-disclaimer').textContent = lang==='pt'
    ? 'Pre\u00e7os do Grand Exchange atualizados via GitHub Actions. Lucro real pode variar.'
    : 'Grand Exchange prices updated via GitHub Actions. Actual profit may vary.';
}

// ---- Tabs ----
function initTabs() {
  $$('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      $$('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const page = tab.dataset.tab;
      $$('.page').forEach(p => p.classList.toggle('active', p.dataset.page === page));
    });
  });
}

// ---- Filters ----
function initFilters() {
  $$('#skill-filters .pill').forEach(b => b.addEventListener('click', () => {
    $$('#skill-filters .pill').forEach(x=>x.classList.remove('active')); b.classList.add('active');
    $$('.skill-row').forEach(r=>r.classList.toggle('hidden',b.dataset.filter!=='all'&&r.dataset.cat!==b.dataset.filter));
  }));
  $$('#journal-filters .pill').forEach(b => b.addEventListener('click', () => {
    $$('#journal-filters .pill').forEach(x=>x.classList.remove('active')); b.classList.add('active');
    $$('.j-row').forEach(r=>r.classList.toggle('hidden',b.dataset.jfilter!=='all'&&r.dataset.jcat!==b.dataset.jfilter));
  }));
}

// ---- Money Making Methods ----
// Skill IDs: 0=ATK 1=DEF 2=STR 3=HP 4=RNG 5=PRA 6=MAG 7=COK 8=WC 9=FLE 10=FSH 11=FM 12=CRA 13=SMI 14=MIN 15=HER 16=AGI 17=THI 18=SLA 19=FAR 20=RC 21=HUN 22=CON 23=SUM 24=DG 25=DIV 26=INV 27=ARC 28=NEC
const MONEY_METHODS = [
  {
    id:'headless_arrows',
    pt:{name:'Fazer Flechas sem Ponta',desc:'Compre hastes de flecha e penas, faça flechas sem ponta no GE'},
    en:{name:'Fletch Headless Arrows',desc:'Buy arrow shafts and feathers, fletch into headless arrows'},
    reqs:{}, members:false,
    inputs:[{id:52,qty:15,name:'Arrow shaft'},{id:314,qty:15,name:'Feather'}],
    outputs:[{id:53,qty:15,name:'Headless arrow'}],
    actionsPerHour:2700,
  },
  {
    id:'tan_leather',
    pt:{name:'Curtir Couro',desc:'Compre couros crus, curta no curtidor de Al Kharid, venda couro'},
    en:{name:'Tan Leather',desc:'Buy cowhides, tan at Al Kharid tanner, sell leather'},
    reqs:{}, members:false,
    inputs:[{id:1739,qty:1,name:'Cowhide',extraCost:3}],
    outputs:[{id:1743,qty:1,name:'Hard leather'}],
    actionsPerHour:2000,
  },
  {
    id:'smelt_iron',
    pt:{name:'Fundir Barras de Ferro',desc:'Funda min\u00e9rio de ferro em barras (com anel de forja para 100%)'},
    en:{name:'Smelt Iron Bars',desc:'Smelt iron ore into bars (ring of forging for 100% success)'},
    reqs:{13:15}, members:false,
    inputs:[{id:440,qty:1,name:'Iron ore'}],
    outputs:[{id:2351,qty:1,name:'Iron bar'}],
    actionsPerHour:1100,
  },
  {
    id:'smelt_steel',
    pt:{name:'Fundir Barras de A\u00e7o',desc:'Funda 1 min\u00e9rio de ferro + 2 carv\u00f5es em barras de a\u00e7o'},
    en:{name:'Smelt Steel Bars',desc:'Smelt 1 iron ore + 2 coal into steel bars'},
    reqs:{13:30}, members:false,
    inputs:[{id:440,qty:1,name:'Iron ore'},{id:453,qty:2,name:'Coal'}],
    outputs:[{id:2353,qty:1,name:'Steel bar'}],
    actionsPerHour:1100,
  },
  {
    id:'spin_flax',
    pt:{name:'Fiar Linho',desc:'Transforme linho em cordas de arco na roda de fiar'},
    en:{name:'Spin Flax',desc:'Spin flax into bowstrings on a spinning wheel'},
    reqs:{12:10}, members:true,
    inputs:[{id:1779,qty:1,name:'Flax'}],
    outputs:[{id:1777,qty:1,name:'Bowstring'}],
    actionsPerHour:1500,
  },
  {
    id:'smelt_gold',
    pt:{name:'Fundir Barras de Ouro',desc:'Funda min\u00e9rio de ouro em barras no forno'},
    en:{name:'Smelt Gold Bars',desc:'Smelt gold ore into gold bars at a furnace'},
    reqs:{13:40}, members:false,
    inputs:[{id:444,qty:1,name:'Gold ore'}],
    outputs:[{id:2357,qty:1,name:'Gold bar'}],
    actionsPerHour:1100,
  },
  {
    id:'cut_yews',
    pt:{name:'Cortar Teixos',desc:'Corte \u00e1rvores de teixo e venda os troncos'},
    en:{name:'Cut Yew Trees',desc:'Chop yew trees and sell the logs'},
    reqs:{8:60}, members:false,
    inputs:[],
    outputs:[{id:1515,qty:1,name:'Yew logs'}],
    actionsPerHour:180,
  },
  {
    id:'cut_magics',
    pt:{name:'Cortar \u00c1rvores M\u00e1gicas',desc:'Corte \u00e1rvores m\u00e1gicas e venda os troncos'},
    en:{name:'Cut Magic Trees',desc:'Chop magic trees and sell the logs'},
    reqs:{8:75}, members:true,
    inputs:[],
    outputs:[{id:1513,qty:1,name:'Magic logs'}],
    actionsPerHour:130,
  },
  {
    id:'cook_sharks',
    pt:{name:'Cozinhar Tubar\u00f5es',desc:'Compre tubar\u00f5es crus, cozinhe e venda'},
    en:{name:'Cook Sharks',desc:'Buy raw sharks, cook and sell cooked sharks'},
    reqs:{7:80}, members:true,
    inputs:[{id:383,qty:1,name:'Raw shark'}],
    outputs:[{id:385,qty:1,name:'Shark'}],
    actionsPerHour:1300,
  },
  {
    id:'nature_runes',
    pt:{name:'Criar Runas da Natureza',desc:'Crie runas da natureza no altar (requer acesso ao abismo)'},
    en:{name:'Craft Nature Runes',desc:'Craft nature runes at the altar (requires abyss access)'},
    reqs:{20:44}, members:true,
    inputs:[],
    outputs:[{id:561,qty:1,name:'Nature rune'}],
    actionsPerHour:2500,
  },
];

let gePrices = {};

async function loadGEPrices() {
  try { gePrices = await cacheFetch('data/ge_prices.json'); }
  catch(_) { gePrices = {}; }
}

function getPrice(itemId) {
  const p = gePrices[String(itemId)];
  return p ? p.price : 0;
}

function calcProfit(method) {
  let inputCost = 0;
  for (const inp of method.inputs) {
    inputCost += (getPrice(inp.id) + (inp.extraCost||0)) * inp.qty;
  }
  let outputValue = 0;
  for (const out of method.outputs) {
    outputValue += getPrice(out.id) * out.qty;
  }
  const profitPerAction = outputValue - inputCost;
  return profitPerAction * method.actionsPerHour;
}

function canDoMethod(player, method) {
  for (const [skillId, reqLevel] of Object.entries(method.reqs)) {
    const sk = player.skills[Number(skillId)];
    if (!sk || sk.level < reqLevel) return false;
  }
  return true;
}

function renderMoney(players) {
  const lang = currentLang;
  const avgHoursPerDay = 3; // "medium gameplay day"

  const sorted = MONEY_METHODS.map(m => ({ ...m, profit: calcProfit(m) })).sort((a,b) => b.profit - a.profit);

  $('#money-grid').innerHTML = sorted.map(m => {
    const info = m[lang] || m.en;
    const profitStr = m.profit > 0 ? fmtShort(m.profit) + ' gp/h' : '?';
    const dailyGp = m.profit * avgHoursPerDay;

    // Requirement tags
    const reqTags = Object.entries(m.reqs).map(([sid, lvl]) => {
      const sName = tSkill(Number(sid));
      const p1met = canDoMethod(players[0], m);
      const p2met = canDoMethod(players[1], m);
      return `<span class="money-req">${sName} ${lvl}</span>`;
    }).join('') || `<span class="money-req met">${lang==='pt'?'Sem requisitos':'No requirements'}</span>`;

    const p1can = canDoMethod(players[0], m);
    const p2can = canDoMethod(players[1], m);

    return `
      <div class="money-card">
        <div class="money-card-header">
          <div class="money-card-title">${info.name}${m.members?' \u2B50':''}</div>
          <div class="money-card-profit">${profitStr}</div>
        </div>
        <div class="money-card-desc">${info.desc}</div>
        <div class="money-card-reqs">${reqTags}</div>
        <div class="money-card-players">
          <span class="money-player-tag ${p1can?'can':'cant'}">${esc(players[0].name)} ${p1can?'\u2713':'\u2717'}</span>
          <span class="money-player-tag ${p2can?'can':'cant'}">${esc(players[1].name)} ${p2can?'\u2713':'\u2717'}</span>
        </div>
        ${dailyGp>0?`<div class="money-card-daily">${lang==='pt'?'~3h/dia':'~3h/day'}: <strong>${fmtShort(dailyGp)} gp</strong></div>`:''}
      </div>`;
  }).join('');
}

// ---- Status ----
function setSource(state,text) { $('.source-dot').className='source-dot '+state; $('#source-text').textContent=text; }
function showError(msg) { $('#error-message').textContent=msg; $('#error-banner').classList.remove('hidden'); }
function hideError() { $('#error-banner').classList.add('hidden'); }

// ---- Render all ----
function renderAll(results) {
  data=results;
  renderCards(results);
  renderH2H(results);
  renderSkills(results);
  renderActivity(results);
  renderQuests(results);
  renderJournal(results,'#journal-scores',null);
  renderJournal(results,'#journal-scores-full','#journal-grid');
  renderEaster(results);
  renderMoney(results);
  initFilters();
  $('#loading-overlay').classList.add('hidden');
  $('#main-content').classList.add('visible');
}

// ---- Main: cache-first ----
async function load() {
  const btn=$('#btn-refresh');
  btn.classList.add('spinning');
  setSource('loading',t('refreshing'));
  hideError();

  let hasCached=false;
  try {
    const cached = await Promise.all(PLAYERS.map(fetchCached));
    renderAll(cached); source='cached'; hasCached=true;
    try { const meta=await cacheFetch(CACHE.meta); const ago=Math.round((Date.now()-new Date(meta.timestamp))/60000); setSource('loading',`${t('cached')} (${ago}${t('agoMin')}) \u2014 ${t('updatingLive')}`); }
    catch(_) { setSource('loading',`${t('cached')} \u2014 ${t('updatingLive')}`); }
  } catch(_) {}

  try {
    const live = await Promise.all(PLAYERS.map(fetchLive));
    renderAll(live); source='live';
    setSource('',t('live'));
    $('#last-updated').textContent=`${t('updated')} ${new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}`;
    btn.classList.remove('spinning'); return;
  } catch(_) {}

  if(hasCached) {
    try { const meta=await cacheFetch(CACHE.meta); const ago=Math.round((Date.now()-new Date(meta.timestamp))/60000); setSource('',`${t('cached')} (${ago}${t('agoMin')})`); $('#last-updated').textContent=`${t('cached')} ${ago}${t('agoMin')}`; }
    catch(_) { setSource('',t('cached')); $('#last-updated').textContent=t('cachedData'); }
    btn.classList.remove('spinning'); return;
  }

  setSource('error',t('offline'));
  showError(currentLang==='pt'?'Falha ao carregar. Tentando novamente em 30s...':'Failed to load. Retrying in 30s...');
  $('#loading-overlay').classList.add('hidden');
  $('#main-content').classList.add('visible');
  btn.classList.remove('spinning');
  clearInterval(timer);
  setTimeout(()=>{load();timer=setInterval(load,REFRESH_MS);},30000);
}

// ---- Init ----
document.addEventListener('DOMContentLoaded', () => {
  updateUIText();
  initTabs();
  loadGEPrices().then(() => load());
  timer = setInterval(load, REFRESH_MS);
  $('#btn-refresh').addEventListener('click',()=>{clearInterval(timer);load();timer=setInterval(load,REFRESH_MS);});
  $('#btn-dismiss-error').addEventListener('click', hideError);
  $('#lang-toggle').addEventListener('click', () => {
    setLang(currentLang==='pt'?'en':'pt');
    updateUIText();
    if(data.length) renderAll(data);
  });
});
