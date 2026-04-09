/* =============================================
   RS3 Leaderboard — Major Goals Cards
   Steam Big Picture-style tiles for the Overview.
   Reads progress from senntisten.js & prifddinas.js
   globals and renders into #major-goals.
   ============================================= */

// ---- i18n helper ----
function mgT(key) {
  const map = {
    mgTitle:       { pt: "Grandes Objetivos",           en: "Major Goals" },
    mgSoulSplit:   { pt: "Rumo ao Soul Split",          en: "Road to Soul Split" },
    mgSoulSub:     { pt: "The Temple at Senntisten",    en: "The Temple at Senntisten" },
    mgPrif:        { pt: "Rumo a Prifddinas",           en: "Road to Prifddinas" },
    mgPrifSub:     { pt: "Plague's End",                en: "Plague's End" },
    mgItems:       { pt: "itens completos",             en: "items complete" },
    mgComplete:    { pt: "Completo!",                   en: "Complete!" },
    mgRitualTitle: { pt: "Ritual dos Mahjarrat",        en: "Ritual of the Mahjarrat" },
    mgRitualSub:   { pt: "Grandmaster quest",           en: "Grandmaster quest" },
  };
  const global = typeof t === "function" ? t(key) : key;
  if (global !== key) return global;
  const entry = map[key];
  if (!entry) return key;
  const lang = typeof currentLang !== "undefined" ? currentLang : "en";
  return entry[lang] || entry.en || key;
}

// ---- SVG circular progress ring ----
function mgRing(pct, size, stroke, color) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(pct, 100) / 100) * circ;
  const done = pct >= 100;
  const fillColor = done ? "var(--green)" : color;
  return `<svg class="mg-ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}"
      fill="none" stroke="var(--bg-raised)" stroke-width="${stroke}" />
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}"
      fill="none" stroke="${fillColor}" stroke-width="${stroke}"
      stroke-linecap="round"
      stroke-dasharray="${circ}" stroke-dashoffset="${offset}"
      transform="rotate(-90 ${size / 2} ${size / 2})"
      style="transition:stroke-dashoffset .6s ease" />
    <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle"
      class="mg-ring-text" fill="${fillColor}"
      font-size="${size * 0.26}px" font-weight="800"
      font-family="var(--font-mono)">${Math.round(pct)}%</text>
  </svg>`;
}

// ---- Count via goalProgress from goals.js ----
function mgGoalCount(goalId) {
  return function(player) {
    if (typeof GOALS === "undefined" || typeof goalProgress !== "function") return { done: 0, total: 0 };
    const goal = GOALS.find(g => g.id === goalId);
    if (!goal) return { done: 0, total: 0 };
    const p = goalProgress(goal, player);
    return { done: p.done, total: p.total };
  };
}

// ---- Navigate to section ----
function mgGoTab(tabName) {
  // Use the new launchSection() from the home-grid nav system
  if (typeof launchSection === "function") {
    launchSection(tabName);
  } else {
    // Fallback: click a data-launch button or set hash
    const btn = document.querySelector(`[data-launch="${tabName}"]`);
    if (btn) btn.click();
    else window.location.hash = tabName;
  }
}

// ---- Player badge (small avatar chip) ----
function mgBadge(player, idx, pct) {
  const c = idx === 0 ? "p1" : "p2";
  const color = idx === 0 ? "var(--gold)" : "var(--teal)";
  const done = pct >= 100;
  return `<div class="mg-badge mg-badge-${c}">
    <span class="mg-badge-name">${esc(player.name)}</span>
    <span class="mg-badge-pct" style="color:${done ? "var(--green)" : color}">${Math.round(pct)}%</span>
  </div>`;
}

// ---- Build one goal card ----
function mgCard(cfg, players) {
  const counts = players.map((p) => cfg.count(p));
  // Combined progress (average of both)
  const totalDone = counts.reduce((a, c) => a + c.done, 0);
  const totalAll = counts.reduce((a, c) => a + c.total, 0);
  const combinedPct = totalAll > 0 ? (totalDone / totalAll) * 100 : 0;
  const done = combinedPct >= 100;

  const badges = players
    .map((p, i) => {
      const pct = counts[i].total > 0 ? (counts[i].done / counts[i].total) * 100 : 0;
      return mgBadge(p, i, pct);
    })
    .join("");

  const subtitle = done
    ? mgT("mgComplete")
    : `${totalDone}/${totalAll} ${mgT("mgItems")}`;

  return `<button class="mg-card mg-card-${cfg.theme}" onclick="mgGoTab('${cfg.tab}')" aria-label="${cfg.title}">
    <div class="mg-card-glow"></div>
    <div class="mg-card-body">
      <div class="mg-card-left">
        <div class="mg-card-icon">${cfg.icon}</div>
        <div class="mg-card-info">
          <div class="mg-card-title">${cfg.title}</div>
          <div class="mg-card-sub">${subtitle}</div>
          <div class="mg-badges">${badges}</div>
        </div>
      </div>
      <div class="mg-card-right">
        ${mgRing(combinedPct, 88, 6, cfg.ringColor)}
      </div>
    </div>
  </button>`;
}

// ---- Ritual of the Mahjarrat data ----
// Cumulative skill requirements across the entire chain
// (ROTM + WGS + Temple at Senntisten + all sub-quests)
const ROTM_SKILLS = [
  { id: 16, required: 77 },  // Agility (ROTM)
  { id: 12, required: 76 },  // Crafting (ROTM)
  { id: 14, required: 76 },  // Mining (ROTM)
  { id: 6,  required: 75 },  // Magic (WGS)
  { id: 19, required: 65 },  // Farming (WGS)
  { id: 15, required: 65 },  // Herblore (WGS)
  { id: 17, required: 66 },  // Thieving (Curse of Arrav)
  { id: 4,  required: 64 },  // Ranged (Curse of Arrav)
  { id: 2,  required: 64 },  // Strength (Curse of Arrav)
  { id: 21, required: 55 },  // Hunter (WGS)
  { id: 13, required: 65 },  // Smithing (Devious Minds)
  { id: 5,  required: 50 },  // Prayer (Temple at Senntisten)
  { id: 20, required: 50 },  // Runecrafting (Devious Minds)
  { id: 9,  required: 50 },  // Fletching (Devious Minds)
  { id: 11, required: 50 },  // Firemaking (Desert Treasure)
  { id: 23, required: 41 },  // Summoning (Curse of Arrav)
  { id: 1,  required: 40 },  // Defence (WGS)
  { id: 22, required: 35 },  // Construction (Missing My Mummy)
  { id: 7,  required: 35 },  // Cooking (Missing My Mummy)
];

// Full quest chain (every quest required transitively)
const ROTM_QUESTS = [
  // Temple at Senntisten chain
  "Death Plateau", "Priest in Peril", "Stolen Hearts", "Diamond in the Rough",
  "Gertrude's Cat", "Icthlarin's Little Helper", "The Golem",
  "The Dig Site", "Troll Stronghold", "Temple of Ikov",
  "What Lies Below", "Creature of Fenkenstrain", "The Restless Ghost",
  "Garden of Tranquillity", "Missing My Mummy", "Family Crest",
  "The Tale of the Muspah", "Defender of Varrock",
  "Desert Treasure", "Devious Minds", "The Curse of Arrav",
  "The Temple at Senntisten",
  // While Guthix Sleeps chain (additional)
  "Jungle Potion", "Shilo Village", "Lost City", "The Fremennik Trials",
  "Lunar Diplomacy", "Dream Mentor",
  "Dragon Slayer", "Heroes' Quest", "Legends' Quest",
  "Tree Gnome Village", "The Grand Tree", "Waterfall Quest",
  "The Eyes of Glouphrie", "The Path of Glouphrie",
  "Tears of Guthix", "Enter the Abyss",
  "Wanted!", "The Hunt for Surok",
  "While Guthix Sleeps",
  // ROTM additional
  "Hazeel Cult", "Enakhra's Lament",
  "Sea Slug", "The Slug Menace",
  "A Fairy Tale I - Growing Pains", "A Fairy Tale II - Cure a Queen",
  "Pirate's Treasure", "Rum Deal", "Cabin Fever",
  "A Tail of Two Cats", "Fight Arena",
  "Ritual of the Mahjarrat",
];

function mgRotmCount(player) {
  let done = 0;
  const total = ROTM_SKILLS.length + ROTM_QUESTS.length;
  for (const sk of ROTM_SKILLS) {
    if ((player.skills[sk.id] || {}).level >= sk.required) done++;
  }
  for (const q of ROTM_QUESTS) {
    if (hasQuest(player, q)) done++;
  }
  return { done, total };
}

// ---- Main render ----
function renderMajorGoals(players) {
  mgInjectStyles();
  const el = document.getElementById("major-goals");
  if (!el || !players || players.length === 0) return;

  // Build goals from the GOALS array in goals.js
  const themeMap = { senntisten: "gold", prifddinas: "teal", rotm: "purple" };
  const ringMap = { gold: "var(--gold-bright)", teal: "var(--teal-bright)", purple: "#a78bfa" };
  const goals = [];

  if (typeof GOALS !== "undefined") {
    for (const g of GOALS) {
      const theme = themeMap[g.id] || "gold";
      const lang = typeof currentLang !== "undefined" ? currentLang : "en";
      goals.push({
        title: lang === "pt" ? g.label_pt : g.label_en,
        icon: g.icon || "\u2694\uFE0F",
        theme,
        tab: "goals",
        ringColor: ringMap[theme] || "var(--gold-bright)",
        count: mgGoalCount(g.id),
      });
    }
  }

  // ROTM (defined locally since it's not in goals.js)
  goals.push({
    title: mgT("mgRitualTitle"),
    icon: "\uD83D\uDD25",
    theme: "purple",
    tab: "goals",
    ringColor: "#a78bfa",
    count: mgRotmCount,
  });

  el.innerHTML = `
    <div class="section-head" style="margin-top:24px">
      <h2 class="section-title">${mgT("mgTitle")}</h2>
    </div>
    <div class="mg-grid">${goals.map((g) => mgCard(g, players)).join("")}</div>`;
}

// ---- Inject scoped CSS (idempotent) ----
function mgInjectStyles() {
  if (document.getElementById("mg-styles")) return;
  const s = document.createElement("style");
  s.id = "mg-styles";
  s.textContent = `
/* ---- Major Goals Cards ---- */
.mg-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--sp-4, 16px);
  margin-bottom: var(--sp-6, 24px);
}
@media (min-width: 680px) {
  .mg-grid { grid-template-columns: repeat(2, 1fr); }
}

.mg-card {
  position: relative;
  display: block;
  width: 100%;
  min-height: 180px;
  border: 1px solid var(--border);
  border-radius: var(--radius, 10px);
  background: var(--bg-card);
  overflow: hidden;
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  color: var(--text);
  padding: 0;
  transition: transform .22s ease, box-shadow .22s ease, border-color .22s ease;
}
.mg-card:hover {
  transform: translateY(-4px);
  border-color: var(--border-glow);
}
.mg-card:active { transform: translateY(-1px); }

/* Theme: gold (Senntisten) */
.mg-card-gold {
  background: linear-gradient(135deg, rgba(212,168,67,0.10) 0%, var(--bg-card) 60%);
}
.mg-card-gold:hover {
  box-shadow: 0 8px 40px rgba(212,168,67,0.18), 0 0 60px rgba(212,168,67,0.06);
  border-color: var(--gold-dim);
}
.mg-card-gold .mg-card-glow {
  background: radial-gradient(ellipse at 20% 50%, rgba(212,168,67,0.14) 0%, transparent 70%);
}
.mg-card-gold:hover .mg-card-glow {
  background: radial-gradient(ellipse at 20% 50%, rgba(212,168,67,0.24) 0%, transparent 70%);
}

/* Theme: teal (Prifddinas) */
.mg-card-teal {
  background: linear-gradient(135deg, rgba(34,211,187,0.10) 0%, var(--bg-card) 60%);
}
.mg-card-teal:hover {
  box-shadow: 0 8px 40px rgba(34,211,187,0.18), 0 0 60px rgba(34,211,187,0.06);
  border-color: var(--teal-dim);
}
.mg-card-teal .mg-card-glow {
  background: radial-gradient(ellipse at 20% 50%, rgba(34,211,187,0.14) 0%, transparent 70%);
}
.mg-card-teal:hover .mg-card-glow {
  background: radial-gradient(ellipse at 20% 50%, rgba(34,211,187,0.24) 0%, transparent 70%);
}
.mg-card-purple {
  background: linear-gradient(135deg, rgba(167,139,250,0.10) 0%, var(--bg-card) 60%);
}
.mg-card-purple:hover {
  box-shadow: 0 8px 40px rgba(167,139,250,0.18), 0 0 60px rgba(167,139,250,0.06);
  border-color: rgba(167,139,250,0.4);
}
.mg-card-purple .mg-card-glow {
  background: radial-gradient(ellipse at 20% 50%, rgba(167,139,250,0.14) 0%, transparent 70%);
}
.mg-card-purple:hover .mg-card-glow {
  background: radial-gradient(ellipse at 20% 50%, rgba(167,139,250,0.24) 0%, transparent 70%);
}

/* Inner glow layer */
.mg-card-glow {
  position: absolute;
  inset: 0;
  pointer-events: none;
  transition: background .3s ease;
}

/* Body layout */
.mg-card-body {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--sp-5, 20px) var(--sp-5, 20px);
  min-height: 180px;
}
.mg-card-left {
  display: flex;
  align-items: center;
  gap: var(--sp-4, 16px);
  flex: 1;
  min-width: 0;
}
.mg-card-icon {
  font-size: 2.2rem;
  flex-shrink: 0;
  line-height: 1;
}
.mg-card-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.mg-card-title {
  font-family: var(--font-display);
  font-size: 1.15rem;
  font-weight: 700;
  line-height: 1.25;
  color: var(--text);
}
.mg-card-gold .mg-card-title { color: var(--gold-bright); }
.mg-card-teal .mg-card-title { color: var(--teal-bright); }
.mg-card-purple .mg-card-title { color: #a78bfa; }

.mg-card-sub {
  font-size: 0.78rem;
  color: var(--text-3);
  font-family: var(--font-mono);
}
.mg-card-right {
  flex-shrink: 0;
  margin-left: var(--sp-3, 12px);
}

/* SVG ring */
.mg-ring { display: block; }

/* Player badges */
.mg-badges {
  display: flex;
  gap: var(--sp-2, 8px);
  margin-top: 6px;
  flex-wrap: wrap;
}
.mg-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: var(--radius-xs, 5px);
  font-size: 0.68rem;
  font-weight: 600;
  background: var(--bg-raised);
  border: 1px solid var(--border);
}
.mg-badge-p1 { border-color: rgba(212,168,67,0.15); }
.mg-badge-p2 { border-color: rgba(34,211,187,0.15); }
.mg-badge-name { color: var(--text-2); }
.mg-badge-pct { font-family: var(--font-mono); font-weight: 800; }

/* Responsive */
@media (max-width: 480px) {
  .mg-card-body { padding: var(--sp-4, 16px); min-height: 150px; }
  .mg-card-icon { font-size: 1.6rem; }
  .mg-card-title { font-size: 1rem; }
}
`;
  document.head.appendChild(s);
}
