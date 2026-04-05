/* =============================================
   RS3 Leaderboard — Unified Major Goals Page
   4 trackers: Soul Split, Prifddinas, World Wakes, Invention
   Auto-checks from live RuneMetrics + manual localStorage
   ============================================= */

// ---- Goal Definitions ----

const GOALS = [
  {
    id: "senntisten",
    icon: `<img src="https://runescape.wiki/images/Soul_Split.png" width="28" height="28" alt="Soul Split" loading="lazy" onerror="this.outerHTML='⚔️'">`,
    color: "gold",
    label_pt: "Rumo ao Soul Split",
    label_en: "Road to Soul Split",
    sub_pt: "Temple at Senntisten — Desbloquear Ancient Curses",
    sub_en: "Temple at Senntisten — Unlock Ancient Curses",
    skills: [
      { id: 21, required: 51, reason: "Defender of Varrock" },
      { id: 16, required: 61, reason: "The Curse of Arrav" },
      { id: 2,  required: 64, reason: "The Curse of Arrav" },
      { id: 17, required: 66, reason: "The Curse of Arrav" },
      { id: 22, required: 35, reason: "Missing My Mummy" },
      { id: 4,  required: 64, reason: "The Curse of Arrav" },
      { id: 7,  required: 35, reason: "Missing My Mummy" },
      { id: 23, required: 41, reason: "The Curse of Arrav" },
      { id: 11, required: 50, reason: "Desert Treasure" },
      { id: 12, required: 45, reason: "Missing My Mummy 100%" },
    ],
    quests: [
      "Priest in Peril", "Death Plateau", "Goblin Diplomacy", "The Lost Tribe",
      "Stolen Hearts", "Diamond in the Rough", "Gertrude's Cat", "The Dig Site",
      "The Tourist Trap", "Temple of Ikov", "The Tale of the Muspah", "The Golem",
      "Nature Spirit", "Creature of Fenkenstrain", "Shades of Mort'ton",
      "Garden of Tranquillity", "Family Crest", "What Lies Below", "Troll Stronghold",
      "Icthlarin's Little Helper", "Missing My Mummy", "Wanted!", "Troll Romance",
      "Devious Minds", "Desert Treasure", "Defender of Varrock", "The Curse of Arrav",
      "The Temple at Senntisten",
    ],
    manual: [
      { id: "sn_cat", label_pt: "Gato crescido (Gertrude's Cat)", label_en: "Cat grown (Gertrude's Cat)" },
      { id: "sn_senliten", label_pt: "Senliten restaurada 100%", label_en: "Senliten restored 100%" },
      { id: "sn_ice_gloves", label_pt: "Ice Gloves obtidas", label_en: "Ice Gloves obtained" },
      { id: "sn_dt_supplies", label_pt: "Suprimentos Desert Treasure", label_en: "Desert Treasure supplies" },
      { id: "sn_kudos", label_pt: "125 Kudos no Museu", label_en: "125 Museum Kudos" },
    ],
  },
  {
    id: "prifddinas",
    icon: `<img src="https://runescape.wiki/images/Prifddinas_lodestone_icon.png" width="28" height="28" alt="Prifddinas" loading="lazy" onerror="this.outerHTML='🏰'">`,
    color: "teal",
    label_pt: "Rumo a Prifddinas",
    label_en: "Road to Prifddinas",
    sub_pt: "Plague's End — Desbloquear a cidade dos elfos",
    sub_en: "Plague's End — Unlock the elf city",
    skills: [
      { id: 16, required: 75, reason: "Plague's End" },
      { id: 22, required: 75, reason: "Plague's End" },
      { id: 12, required: 75, reason: "Plague's End" },
      { id: 24, required: 75, reason: "Plague's End" },
      { id: 15, required: 75, reason: "Plague's End" },
      { id: 14, required: 75, reason: "Plague's End" },
      { id: 5,  required: 75, reason: "Plague's End" },
      { id: 23, required: 75, reason: "Plague's End" },
      { id: 4,  required: 75, reason: "Within the Light" },
      { id: 8,  required: 75, reason: "Within the Light" },
      { id: 9,  required: 70, reason: "Within the Light" },
      { id: 17, required: 50, reason: "Mourning's End Part I" },
      { id: 7,  required: 30, reason: "Big Chompy Bird Hunting" },
    ],
    quests: [
      "Plague City", "Biohazard", "Underground Pass", "Regicide", "Roving Elves",
      "Mourning's End Part I", "Mourning's End Part II", "Within the Light",
      "Big Chompy Bird Hunting", "Sheep Herder", "Catapult Construction",
      "Making History", "Plague's End",
    ],
    manual: [
      { id: "pe_mourning_gear", label_pt: "Mourning gear preparada", label_en: "Mourning gear ready" },
      { id: "pe_agility_short", label_pt: "Atalhos Underground Pass", label_en: "Underground Pass shortcuts" },
      { id: "pe_crystal_seed", label_pt: "Crystal seed obtida", label_en: "Crystal seed obtained" },
    ],
  },
  {
    id: "worldwakes",
    icon: `<img src="https://runescape.wiki/images/Sunshine.png" width="28" height="28" alt="Sunshine" loading="lazy" onerror="this.outerHTML='☀️'">`,
    color: "orange",
    label_pt: "The World Wakes",
    label_en: "The World Wakes",
    sub_pt: "Desbloquear Sunshine & Death's Swiftness",
    sub_en: "Unlock Sunshine & Death's Swiftness",
    skills: [
      { id: 6,  required: 76, reason: "Sunshine" },
      { id: 4,  required: 76, reason: "Death's Swiftness" },
      { id: 1,  required: 85, reason: "Natural Instinct" },
      { id: 3,  required: 85, reason: "Guthix's Blessing" },
      { id: 11, required: 74, reason: "Full quest rewards" },
      { id: 18, required: 70, reason: "Full quest rewards" },
    ],
    quests: [
      "The World Wakes",
    ],
    manual: [
      { id: "ww_combat_100", label_pt: "Nível de combate 100+ (recomendado)", label_en: "Combat level 100+ (recommended)" },
      { id: "ww_food_pots", label_pt: "Comida e poções para o boss", label_en: "Food and potions for the boss" },
    ],
  },
  {
    id: "invention",
    icon: `<img src="https://runescape.wiki/images/Invention_icon.png" width="28" height="28" alt="Invention" loading="lazy" onerror="this.outerHTML='⚙️'">`,
    color: "purple",
    label_pt: "Desbloquear Invenção",
    label_en: "Unlock Invention",
    sub_pt: "80 Crafting + 80 Divination + 80 Smithing",
    sub_en: "80 Crafting + 80 Divination + 80 Smithing",
    skills: [
      { id: 12, required: 80, reason: "Invention unlock" },
      { id: 25, required: 80, reason: "Invention unlock" },
      { id: 13, required: 80, reason: "Invention unlock" },
    ],
    quests: [],
    manual: [
      { id: "inv_tutorial", label_pt: "Tutorial da Invenção completo", label_en: "Invention Tutorial complete" },
      { id: "inv_augmentor", label_pt: "Primeiro augmentor criado", label_en: "First augmentor crafted" },
      { id: "inv_gizmo", label_pt: "Primeiro gizmo com perk", label_en: "First gizmo with a perk" },
    ],
  },
];

// ---- Storage ----
const GOALS_STORAGE = "rs3lb-goals";
function goalsLoadManual() {
  try { return JSON.parse(localStorage.getItem(GOALS_STORAGE) || "{}"); }
  catch { return {}; }
}
function goalsSaveManual(s) { localStorage.setItem(GOALS_STORAGE, JSON.stringify(s)); }

// ---- Progress calculation ----
function goalProgress(goal, player) {
  const manual = goalsLoadManual();
  let skillsDone = 0, questsDone = 0, manualDone = 0;
  for (const sk of goal.skills) {
    const lvl = (player.skills[sk.id] || {}).level || 1;
    if (lvl >= sk.required) skillsDone++;
  }
  for (const q of goal.quests) {
    if (typeof hasQuest === "function" && hasQuest(player, q)) questsDone++;
  }
  for (const m of goal.manual) {
    if (manual[`${m.id}_${player.name}`]) manualDone++;
  }
  const total = goal.skills.length + goal.quests.length + goal.manual.length;
  const done = skillsDone + questsDone + manualDone;
  return { skillsDone, questsDone, manualDone, done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}

// ---- SVG Progress Ring ----
function goalRing(pct, size, color) {
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(pct, 100) / 100) * c;
  const fill = pct >= 100 ? "var(--green)" : `var(--${color})`;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" class="gl-ring">
    <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="4"/>
    <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${fill}" stroke-width="4"
      stroke-dasharray="${c}" stroke-dashoffset="${offset}" stroke-linecap="round"
      transform="rotate(-90 ${size/2} ${size/2})" style="transition:stroke-dashoffset 1s ease"/>
    <text x="${size/2}" y="${size/2}" text-anchor="middle" dominant-baseline="central"
      font-family="var(--font-mono)" font-size="${size * 0.22}" font-weight="800"
      fill="${fill}">${pct}%</text>
  </svg>`;
}

// ---- Skill row ----
function goalSkillRow(player, sk) {
  const cur = (player.skills[sk.id] || {}).level || 1;
  const met = cur >= sk.required;
  const pct = met ? 100 : Math.round((cur / sk.required) * 100);
  return `<div class="gl-skill ${met ? "gl-met" : ""}">
    <span class="gl-skill-icon">${typeof skillIconImg === "function" ? skillIconImg(sk.id, 18) : (met ? "✅" : "🔴")}</span>
    <span class="gl-skill-name">${typeof tSkill === "function" ? tSkill(sk.id) : sk.id}</span>
    <span class="gl-skill-lvl">${cur}</span>
    <span class="gl-skill-sep">/</span>
    <span class="gl-skill-req">${sk.required}</span>
    <span class="gl-skill-bar"><span class="gl-skill-fill" style="width:${pct}%"></span></span>
    <span class="gl-skill-reason">${typeof esc === "function" ? esc(sk.reason) : sk.reason}</span>
  </div>`;
}

// ---- Quest row ----
function goalQuestRow(player, questName) {
  const done = typeof hasQuest === "function" && hasQuest(player, questName);
  const wiki = `https://runescape.wiki/w/${encodeURIComponent(questName.replace(/ /g, "_"))}`;
  return `<div class="gl-quest ${done ? "gl-met" : ""}">
    <span class="gl-quest-icon">${done ? "✅" : "⬜"}</span>
    <span class="gl-quest-name">${typeof esc === "function" ? esc(questName) : questName}</span>
    <a class="gl-quest-wiki" href="${wiki}" target="_blank" rel="noopener">Wiki</a>
  </div>`;
}

// ---- Manual checkbox ----
function goalManualRow(player, item) {
  const key = `${item.id}_${player.name}`;
  const manual = goalsLoadManual();
  const checked = manual[key] ? "checked" : "";
  const lang = typeof currentLang !== "undefined" ? currentLang : "en";
  const label = lang === "pt" ? item.label_pt : item.label_en;
  return `<div class="gl-manual">
    <input type="checkbox" class="gl-check" data-key="${key}" ${checked}>
    <span class="gl-manual-label">${typeof esc === "function" ? esc(label) : label}</span>
  </div>`;
}

// ---- Single goal card ----
function goalCard(goal, player, playerIdx) {
  const prog = goalProgress(goal, player);
  const lang = typeof currentLang !== "undefined" ? currentLang : "en";
  const label = lang === "pt" ? goal.label_pt : goal.label_en;
  const sub = lang === "pt" ? goal.sub_pt : goal.sub_en;
  const allDone = prog.pct >= 100;

  let body = "";

  // Skills
  if (goal.skills.length) {
    body += `<div class="gl-section">
      <div class="gl-section-title">${lang === "pt" ? "Habilidades" : "Skills"} (${prog.skillsDone}/${goal.skills.length})</div>
      ${goal.skills.map(sk => goalSkillRow(player, sk)).join("")}
    </div>`;
  }

  // Quests
  if (goal.quests.length) {
    body += `<div class="gl-section">
      <div class="gl-section-title">${lang === "pt" ? "Missões" : "Quests"} (${prog.questsDone}/${goal.quests.length})</div>
      ${goal.quests.map(q => goalQuestRow(player, q)).join("")}
    </div>`;
  }

  // Manual
  if (goal.manual.length) {
    body += `<div class="gl-section">
      <div class="gl-section-title">${lang === "pt" ? "Itens Manuais" : "Manual Items"} (${prog.manualDone}/${goal.manual.length})</div>
      ${goal.manual.map(m => goalManualRow(player, m)).join("")}
    </div>`;
  }

  // Celebration
  if (allDone) {
    body += `<div class="gl-celebration">${lang === "pt" ? "🎉 Completo!" : "🎉 Complete!"}</div>`;
  }

  return `<details class="gl-card gl-card-${goal.color}" ${allDone ? "" : "open"}>
    <summary class="gl-card-header">
      <span class="gl-card-icon">${goal.icon}</span>
      <div class="gl-card-info">
        <div class="gl-card-title">${label}</div>
        <div class="gl-card-sub">${sub}</div>
      </div>
      ${goalRing(prog.pct, 52, goal.color)}
    </summary>
    <div class="gl-card-body">${body}</div>
  </details>`;
}

// ---- Inject CSS ----
function goalsInjectStyles() {
  if (document.getElementById("gl-styles")) return;
  const s = document.createElement("style");
  s.id = "gl-styles";
  s.textContent = `
.gl-page-hero { text-align:center; margin-bottom:24px; }
.gl-page-title { font-family:var(--font-display); font-size:1.4rem; font-weight:800; color:var(--gold-bright); letter-spacing:1px; }
.gl-page-sub { font-size:0.75rem; color:var(--text-3); margin-top:4px; }
.gl-player-tabs { display:flex; justify-content:center; gap:8px; margin-bottom:20px; }
.gl-player-tab { appearance:none; padding:6px 18px; border:1px solid var(--border); border-radius:100px; background:var(--bg-card); color:var(--text-2); cursor:pointer; font-size:0.75rem; font-weight:600; font-family:var(--font); transition:all 0.2s; }
.gl-player-tab:hover { border-color:var(--border-glow); }
.gl-player-tab.active { border-color:var(--gold-dim); color:var(--gold); background:var(--gold-bg); }
.gl-player-tab.p2.active { border-color:var(--teal-dim); color:var(--teal); background:var(--teal-bg); }

.gl-card { background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius); margin-bottom:10px; overflow:hidden; }
.gl-card-gold { border-left:3px solid var(--gold-dim); }
.gl-card-teal { border-left:3px solid var(--teal-dim); }
.gl-card-orange { border-left:3px solid var(--orange); }
.gl-card-purple { border-left:3px solid var(--purple-dim); }

.gl-card-header { display:flex; align-items:center; gap:12px; padding:16px 18px; cursor:pointer; list-style:none; }
.gl-card-header::-webkit-details-marker { display:none; }
.gl-card-icon { font-size:1.5rem; flex-shrink:0; }
.gl-card-info { flex:1; min-width:0; }
.gl-card-title { font-family:var(--font-display); font-size:0.9rem; font-weight:700; color:var(--text); letter-spacing:0.5px; }
.gl-card-sub { font-size:0.65rem; color:var(--text-3); margin-top:2px; }
.gl-ring { flex-shrink:0; }

.gl-card-body { padding:0 18px 16px; }

.gl-section { margin-bottom:14px; }
.gl-section-title { font-size:0.68rem; font-weight:700; color:var(--text-3); text-transform:uppercase; letter-spacing:0.8px; margin-bottom:6px; padding-bottom:4px; border-bottom:1px solid var(--border); }

.gl-skill { display:grid; grid-template-columns:auto 1fr auto 8px auto 80px auto; align-items:center; gap:4px; padding:3px 0; font-size:0.73rem; }
.gl-skill-icon { font-size:0.65rem; }
.gl-skill-name { font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.gl-skill-lvl { font-family:var(--font-mono); font-weight:700; text-align:right; }
.gl-skill-sep { color:var(--text-3); text-align:center; }
.gl-skill-req { font-family:var(--font-mono); color:var(--text-3); }
.gl-skill-bar { height:3px; background:var(--bg-raised); border-radius:2px; overflow:hidden; }
.gl-skill-fill { height:100%; background:var(--gold-dim); border-radius:2px; transition:width 0.6s ease; }
.gl-met .gl-skill-fill { background:var(--green); }
.gl-met .gl-skill-name { color:var(--green); }
.gl-met .gl-skill-lvl { color:var(--green); }
.gl-skill-reason { font-size:0.6rem; color:var(--text-3); text-align:right; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

.gl-quest { display:flex; align-items:center; gap:6px; padding:3px 0; font-size:0.73rem; }
.gl-quest-icon { font-size:0.65rem; flex-shrink:0; }
.gl-quest-name { flex:1; }
.gl-met .gl-quest-name { color:var(--green); text-decoration:line-through; text-decoration-color:rgba(52,211,153,0.3); }
.gl-quest-wiki { font-size:0.6rem; color:var(--text-3); text-decoration:none; padding:1px 6px; border:1px solid var(--border); border-radius:var(--radius-xs); transition:all 0.2s; }
.gl-quest-wiki:hover { color:var(--gold); border-color:var(--gold-dim); text-decoration:none; }

.gl-manual { display:flex; align-items:center; gap:8px; padding:4px 0; font-size:0.73rem; }
.gl-check { accent-color:var(--gold); width:16px; height:16px; cursor:pointer; }
.gl-manual-label { color:var(--text-2); }

.gl-celebration { text-align:center; padding:12px; font-size:0.85rem; font-weight:700; color:var(--green); background:var(--green-bg); border-radius:var(--radius-xs); margin-top:8px; }

@media(max-width:640px) {
  .gl-skill { grid-template-columns:auto 1fr auto 8px auto 50px; }
  .gl-skill-reason { display:none; }
  .gl-card-header { padding:12px 14px; }
}
`;
  document.head.appendChild(s);
}

// ---- Main render function ----
function renderGoalsPage(players) {
  goalsInjectStyles();
  const section = $('[data-page="goals"]');
  if (!section) return;
  if (!players || !players.length) return;

  const lang = typeof currentLang !== "undefined" ? currentLang : "en";
  const activeIdx = parseInt(section.dataset.glActive || "0", 10);
  const player = players[Math.min(activeIdx, players.length - 1)];

  let html = `<button class="section-back" id="gl-back">\u2190 ${lang === "pt" ? "Início" : "Home"}</button>
  <div class="gl-page-hero">
    <div class="gl-page-title">${lang === "pt" ? "Objetivos Principais" : "Major Goals"}</div>
    <div class="gl-page-sub">${lang === "pt" ? "Progresso rumo aos maiores marcos do jogo" : "Progress toward the biggest milestones"}</div>
  </div>`;

  // Player tabs
  if (players.length > 1) {
    html += `<div class="gl-player-tabs">`;
    players.forEach((p, i) => {
      const cls = i === activeIdx ? "active" : "";
      const pcls = i === 0 ? "" : "p2";
      html += `<button class="gl-player-tab ${pcls} ${cls}" data-gl-player="${i}">${typeof esc === "function" ? esc(p.name) : p.name}</button>`;
    });
    html += `</div>`;
  }

  // Goal cards
  for (const goal of GOALS) {
    html += goalCard(goal, player, activeIdx);
  }

  section.innerHTML = html;

  // Event: back button
  const backBtn = section.querySelector("#gl-back");
  if (backBtn) backBtn.addEventListener("click", () => { if (typeof launchSection === "function") launchSection("overview"); });

  // Event: player tabs
  section.querySelectorAll(".gl-player-tab").forEach(btn => {
    btn.addEventListener("click", () => {
      section.dataset.glActive = btn.dataset.glPlayer;
      renderGoalsPage(players);
    });
  });

  // Event: manual checkboxes
  section.addEventListener("change", function handler(e) {
    if (!e.target.classList.contains("gl-check")) return;
    const s = goalsLoadManual();
    if (e.target.checked) s[e.target.dataset.key] = true;
    else delete s[e.target.dataset.key];
    goalsSaveManual(s);
    renderGoalsPage(players);
  }, { once: true });
}

// ---- Overview: Major Goals summary cards ----
function renderGoalsSummary(players) {
  goalsInjectStyles();
  const el = document.getElementById("major-goals");
  if (!el || !players || !players.length) return;

  const lang = typeof currentLang !== "undefined" ? currentLang : "en";
  const p = players[0];

  el.innerHTML = `<div class="section-head">
    <h2 class="section-title">${lang === "pt" ? "Objetivos Principais" : "Major Goals"}</h2>
  </div>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:8px;margin-bottom:8px">
    ${GOALS.map(g => {
      const prog = goalProgress(g, p);
      const colorVar = g.color === "gold" ? "--gold" : g.color === "teal" ? "--teal" : g.color === "orange" ? "--orange" : "--purple";
      const label = lang === "pt" ? g.label_pt : g.label_en;
      // Endowed progress: emphasize what's done, not what's left
      const remaining = prog.total - prog.done;
      const almostLabel = prog.pct >= 80 && prog.pct < 100
        ? `<span style="font-size:0.5rem;color:var(--orange);font-weight:700">${lang === "pt" ? "QUASE!" : "ALMOST!"}</span>`
        : "";
      const progressBar = `<span style="display:block;height:3px;background:rgba(255,255,255,0.05);border-radius:2px;margin-top:4px;overflow:hidden;width:100%"><span style="display:block;height:100%;width:${prog.pct}%;background:var(${prog.pct >= 100 ? "--green" : colorVar});border-radius:2px;transition:width 1s ease"></span></span>`;
      return `<button class="home-card" data-launch="goals" style="border-left:3px solid var(${colorVar});text-align:left;align-items:stretch">
        <span style="display:flex;align-items:center;gap:8px">
          <span class="home-card-icon" style="font-size:1rem">${g.icon}</span>
          <span class="home-card-label" style="font-size:0.58rem;text-align:left">${label}</span>
        </span>
        <span class="home-card-stat" style="color:var(${prog.pct >= 100 ? "--green" : colorVar});display:flex;justify-content:space-between;align-items:center">
          <span>${prog.pct}%</span>
          <span style="font-size:0.5rem;color:var(--text-3)">${prog.done}/${prog.total}</span>
          ${almostLabel}
        </span>
        ${progressBar}
      </button>`;
    }).join("")}
  </div>`;

  // Bind click to navigate to goals page
  el.querySelectorAll("[data-launch='goals']").forEach(btn => {
    btn.addEventListener("click", () => {
      if (typeof launchSection === "function") launchSection("goals");
    });
  });
}
