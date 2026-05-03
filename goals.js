/* =============================================
   RS3 Leaderboard — Unified Major Goals Page
   "What's Missing" redesign: prioritizes incomplete
   items, quantifies gaps, shows next actions.
   ============================================= */

// ---- Goal Definitions ----

const GOALS = [
  {
    id: "senntisten",
    icon: `<img src="data/icons/Soul_Split.png" width="28" height="28" alt="Soul Split" loading="lazy" data-fallback="emoji" data-emoji="⚔️">`,
    color: "gold",
    label_pt: "Rumo ao Soul Split",
    label_en: "Road to Soul Split",
    sub_pt: "Temple at Senntisten — Desbloquear Ancient Curses",
    sub_en: "Temple at Senntisten — Unlock Ancient Curses",
    capstone: "The Temple at Senntisten",
    skills: [
      // Combat & gathering (from Curse of Arrav chain)
      { id: 16, required: 61, reason: "The Curse of Arrav" },
      { id: 14, required: 64, reason: "The Curse of Arrav" },
      { id: 2,  required: 64, reason: "The Curse of Arrav" },
      { id: 4,  required: 64, reason: "The Curse of Arrav" },
      { id: 13, required: 65, reason: "The Curse of Arrav" },
      { id: 17, required: 66, reason: "The Curse of Arrav" },
      { id: 23, required: 41, reason: "The Curse of Arrav" },
      { id: 21, required: 51, reason: "Defender of Varrock" },
      // From Desert Treasure / Devious Minds
      { id: 6,  required: 62, reason: "Desert Treasure" },
      { id: 11, required: 50, reason: "Desert Treasure" },
      { id: 9,  required: 50, reason: "Devious Minds" },
      { id: 20, required: 50, reason: "Devious Minds" },
      // From Missing My Mummy / sub-quests
      { id: 22, required: 35, reason: "Missing My Mummy" },
      { id: 7,  required: 35, reason: "Missing My Mummy" },
      { id: 12, required: 45, reason: "Missing My Mummy 100%" },
      // Other chain requirements
      { id: 5,  required: 50, reason: "Temple at Senntisten" },
      { id: 19, required: 25, reason: "Garden of Tranquillity" },
    ],
    quests: [
      "Priest in Peril", "Death Plateau", "Goblin Diplomacy", "The Lost Tribe",
      "Stolen Hearts", "Diamond in the Rough", "Gertrude's Cat", "The Dig Site",
      "The Tourist Trap", "Temple of Ikov", "The Tale of the Muspah", "The Golem",
      "Nature Spirit", "Creature of Fenkenstrain",
      "Garden of Tranquillity", "Family Crest", "What Lies Below", "Troll Stronghold",
      "Icthlarin's Little Helper", "Missing My Mummy", "Wanted!",
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
    icon: `<img src="data/icons/Prifddinas_lodestone_icon.png" width="28" height="28" alt="Prifddinas" loading="lazy" data-fallback="emoji" data-emoji="🏰">`,
    color: "teal",
    label_pt: "Rumo a Prifddinas",
    label_en: "Road to Prifddinas",
    sub_pt: "Plague's End — Desbloquear a cidade dos elfos",
    sub_en: "Plague's End — Unlock the elf city",
    capstone: "Plague's End",
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
    icon: `<img src="data/icons/Sunshine.png" width="28" height="28" alt="Sunshine" loading="lazy" data-fallback="emoji" data-emoji="☀️">`,
    color: "orange",
    label_pt: "The World Wakes",
    label_en: "The World Wakes",
    sub_pt: "Desbloquear Sunshine & Death's Swiftness",
    sub_en: "Unlock Sunshine & Death's Swiftness",
    capstone: "The World Wakes",
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
    icon: `<img src="data/icons/Invention-icon.png" width="28" height="28" alt="Invention" loading="lazy" data-fallback="emoji" data-emoji="⚙️">`,
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
  {
    id: "rotm",
    icon: `<img src="data/icons/Ritual_of_the_Mahjarrat.png" width="28" height="28" alt="Ritual of the Mahjarrat" loading="lazy" data-fallback="emoji" data-emoji="🔥">`,
    color: "purple",
    label_pt: "Ritual dos Mahjarrat",
    label_en: "Ritual of the Mahjarrat",
    sub_pt: "Grandmaster — capstone do arco zariyte/Zaros",
    sub_en: "Grandmaster — capstone of the Zaros/Mahjarrat arc",
    capstone: "Ritual of the Mahjarrat",
    // Chain map for the dedicated guide visualization
    phases: [
      {
        id: "p1",
        title_pt: "Cadeia do Senntisten",
        title_en: "Senntisten Chain",
        quests: [
          "Death Plateau", "Priest in Peril", "Stolen Hearts",
          "Diamond in the Rough", "Gertrude's Cat", "Icthlarin's Little Helper",
          "The Golem", "The Dig Site", "Troll Stronghold", "Temple of Ikov",
          "What Lies Below", "Creature of Fenkenstrain", "The Restless Ghost",
          "Garden of Tranquillity", "Missing My Mummy", "Family Crest",
          "The Tale of the Muspah", "Defender of Varrock",
          "Desert Treasure", "Devious Minds", "The Curse of Arrav",
          "The Temple at Senntisten",
        ],
      },
      {
        id: "p2",
        title_pt: "Cadeia Lunar / WGS",
        title_en: "Lunar / WGS Chain",
        quests: [
          "Jungle Potion", "Shilo Village", "Lost City", "The Fremennik Trials",
          "Lunar Diplomacy", "Dream Mentor",
          "Dragon Slayer", "Heroes' Quest", "Legends' Quest",
          "Tree Gnome Village", "The Grand Tree", "Waterfall Quest",
          "The Eyes of Glouphrie", "The Path of Glouphrie",
          "Tears of Guthix", "Enter the Abyss",
          "Wanted!", "The Hunt for Surok",
          "While Guthix Sleeps",
        ],
      },
      {
        id: "p3",
        title_pt: "Pré-Ritual",
        title_en: "Pre-Ritual",
        quests: [
          "Hazeel Cult", "Enakhra's Lament",
          "Sea Slug", "The Slug Menace",
          "A Fairy Tale I - Growing Pains", "A Fairy Tale II - Cure a Queen",
          "Pirate's Treasure", "Rum Deal", "Cabin Fever",
          "A Tail of Two Cats", "Fight Arena",
        ],
      },
      {
        id: "p4",
        title_pt: "O Ritual",
        title_en: "The Ritual",
        quests: ["Ritual of the Mahjarrat"],
      },
    ],
    // Aggregate skills (highest required across the chain)
    skills: [
      { id: 16, required: 77, reason: "ROTM" },
      { id: 12, required: 76, reason: "ROTM" },
      { id: 14, required: 76, reason: "ROTM" },
      { id: 6,  required: 75, reason: "While Guthix Sleeps" },
      { id: 19, required: 65, reason: "While Guthix Sleeps" },
      { id: 15, required: 65, reason: "While Guthix Sleeps" },
      { id: 17, required: 66, reason: "Curse of Arrav" },
      { id: 4,  required: 64, reason: "Curse of Arrav" },
      { id: 2,  required: 64, reason: "Curse of Arrav" },
      { id: 21, required: 55, reason: "While Guthix Sleeps" },
      { id: 13, required: 65, reason: "Devious Minds" },
      { id: 5,  required: 50, reason: "Temple at Senntisten" },
      { id: 20, required: 50, reason: "Devious Minds" },
      { id: 9,  required: 50, reason: "Devious Minds" },
      { id: 11, required: 50, reason: "Desert Treasure" },
      { id: 23, required: 41, reason: "Curse of Arrav" },
      { id: 1,  required: 40, reason: "While Guthix Sleeps" },
      { id: 22, required: 35, reason: "Missing My Mummy" },
      { id: 7,  required: 35, reason: "Missing My Mummy" },
    ],
    // Will be flattened from phases below
    quests: [],
    manual: [
      { id: "rotm_combat", label_pt: "Combate 100+ recomendado", label_en: "Combat 100+ recommended" },
      { id: "rotm_supplies", label_pt: "Inventário pronto: brews, restores, food T70+", label_en: "Loadout: brews, restores, T70+ food" },
      { id: "rotm_aviantese", label_pt: "Aviantese e Glacors estudados", label_en: "Aviantese & Glacors studied" },
    ],
  },
];

// Flatten ROTM phases into the .quests array for goalProgress() compatibility
(function () {
  const rotm = GOALS.find(g => g.id === "rotm");
  if (rotm && rotm.phases) {
    const all = [];
    for (const p of rotm.phases) for (const q of p.quests) if (!all.includes(q)) all.push(q);
    rotm.quests = all;
  }
})();

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
  let done = skillsDone + questsDone + manualDone;
  // Capstone override: if the capstone quest is completed, the goal is achieved.
  // Stale skill prereqs (e.g. Magic 62 for a sub-quest already finished) are
  // backfilled, since clearing the capstone proves they were met at some point.
  const capstoneDone = goal.capstone && typeof hasQuest === "function" && hasQuest(player, goal.capstone);
  if (capstoneDone) done = total;
  return { skillsDone, questsDone, manualDone, done, total, capstoneDone, pct: total ? Math.round((done / total) * 100) : 0 };
}

// ---- Skill gap computation ----
function goalSkillGap(player, sk) {
  const data = player.skills[sk.id] || {};
  const cur = data.level || 1;
  const curXp = data.xp || 0;
  const met = cur >= sk.required;
  const targetXp = typeof xpForLevel === "function" ? xpForLevel(sk.required) : 0;
  const xpNeeded = met ? 0 : Math.max(0, targetXp - curXp);
  return {
    id: sk.id, required: sk.required, reason: sk.reason,
    cur, met,
    levelsNeeded: met ? 0 : sk.required - cur,
    xpNeeded,
    pct: Math.min(100, Math.round((cur / sk.required) * 100)),
  };
}

// ---- Next Actions: aggregate priorities across all goals ----
function goalBuildNextActions(player) {
  const lang = typeof currentLang !== "undefined" ? currentLang : "en";
  const manual = goalsLoadManual();
  const actions = [];

  for (const goal of GOALS) {
    const label = lang === "pt" ? goal.label_pt : goal.label_en;
    const color = `var(--${goal.color === "purple" ? "purple" : goal.color})`;

    // Missing skills
    for (const sk of goal.skills) {
      const gap = goalSkillGap(player, sk);
      if (!gap.met) {
        actions.push({
          type: "skill", goalId: goal.id, goalLabel: label, goalColor: color,
          sortKey: gap.levelsNeeded,
          label: `${typeof tSkill === "function" ? tSkill(sk.id) : sk.id} ${gap.cur} → ${sk.required}`,
          detail: `${gap.levelsNeeded} ${lang === "pt" ? "níveis" : "levels"} · ~${typeof fmtShort === "function" ? fmtShort(gap.xpNeeded) : gap.xpNeeded} XP`,
          icon: typeof skillIconImg === "function" ? skillIconImg(sk.id, 16) : "📈",
        });
      }
    }

    // First incomplete quest in each goal's chain
    for (const q of goal.quests) {
      if (typeof hasQuest === "function" && !hasQuest(player, q)) {
        actions.push({
          type: "quest", goalId: goal.id, goalLabel: label, goalColor: color,
          sortKey: 100, // quests after close skills
          label: q,
          detail: lang === "pt" ? "missão" : "quest",
          icon: "📜",
        });
        break; // only first incomplete quest per goal
      }
    }
  }

  // Sort: skills by levels needed (ascending), then quests
  actions.sort((a, b) => a.sortKey - b.sortKey);
  return actions.slice(0, 6);
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

// ---- Next Actions Panel ----
function goalNextActionsPanel(player) {
  const lang = typeof currentLang !== "undefined" ? currentLang : "en";
  const actions = goalBuildNextActions(player);
  if (!actions.length) return "";

  const title = lang === "pt" ? "Próximas Ações" : "Next Actions";
  const items = actions.map(a => `
    <div class="gl-na-item">
      <span class="gl-na-dot" style="background:${a.goalColor}"></span>
      <span class="gl-na-icon">${a.icon}</span>
      <span class="gl-na-label">${typeof esc === "function" ? esc(a.label) : a.label}</span>
      <span class="gl-na-detail">${typeof esc === "function" ? esc(a.detail) : a.detail}</span>
      <span class="gl-na-goal">${typeof esc === "function" ? esc(a.goalLabel) : a.goalLabel}</span>
    </div>`).join("");

  return `<div class="gl-next-actions gl-stagger" style="--si:0">
    <div class="gl-na-header">
      <span class="gl-na-title-icon">⚡</span>
      <span class="gl-na-title">${title}</span>
    </div>
    <div class="gl-na-list">${items}</div>
  </div>`;
}

// ---- Segmented Progress Bar ----
function goalSegmentedBar(prog, goal) {
  const lang = typeof currentLang !== "undefined" ? currentLang : "en";
  const segments = [];
  const labels = [];

  if (goal.skills.length) {
    const pct = Math.round((prog.skillsDone / goal.skills.length) * 100);
    segments.push(`<div class="gl-seg gl-seg-skill" style="flex:${goal.skills.length}"><div class="gl-seg-fill" data-tw="${pct}%" style="width:0"></div></div>`);
    labels.push(`<span>${lang === "pt" ? "Hab" : "Skills"} ${prog.skillsDone}/${goal.skills.length}</span>`);
  }
  if (goal.quests.length) {
    const pct = Math.round((prog.questsDone / goal.quests.length) * 100);
    segments.push(`<div class="gl-seg gl-seg-quest" style="flex:${goal.quests.length}"><div class="gl-seg-fill" data-tw="${pct}%" style="width:0"></div></div>`);
    labels.push(`<span>${lang === "pt" ? "Missões" : "Quests"} ${prog.questsDone}/${goal.quests.length}</span>`);
  }
  if (goal.manual.length) {
    const pct = Math.round((prog.manualDone / goal.manual.length) * 100);
    segments.push(`<div class="gl-seg gl-seg-manual" style="flex:${goal.manual.length}"><div class="gl-seg-fill" data-tw="${pct}%" style="width:0"></div></div>`);
    labels.push(`<span>${lang === "pt" ? "Manual" : "Manual"} ${prog.manualDone}/${goal.manual.length}</span>`);
  }

  return `<div class="gl-seg-bar">${segments.join("")}</div>
    <div class="gl-seg-labels">${labels.join("")}</div>`;
}

// ---- Skill Rows ----
function goalSkillRowMissing(player, sk) {
  const gap = goalSkillGap(player, sk);
  const closeClass = gap.levelsNeeded <= 3 ? "gl-close" : "";
  return `<div class="gl-skill-inc ${closeClass}">
    <span class="gl-sk-icon">${typeof skillIconImg === "function" ? skillIconImg(sk.id, 18) : "🔴"}</span>
    <span class="gl-sk-name">${typeof tSkill === "function" ? tSkill(sk.id) : sk.id}</span>
    <span class="gl-sk-levels"><span class="gl-sk-cur">${gap.cur}</span><span class="gl-sk-arrow">→</span><span class="gl-sk-req">${sk.required}</span></span>
    <span class="gl-sk-gap">${gap.levelsNeeded} ${(typeof currentLang !== "undefined" && currentLang === "pt") ? "nív" : "lvl"}</span>
    <span class="gl-sk-xp">~${typeof fmtShort === "function" ? fmtShort(gap.xpNeeded) : gap.xpNeeded} XP</span>
    <span class="gl-sk-bar"><span class="gl-sk-bar-fill" data-tw="${gap.pct}%" style="width:0"></span></span>
  </div>`;
}

function goalSkillRowDone(player, sk) {
  const cur = (player.skills[sk.id] || {}).level || 1;
  return `<div class="gl-skill-done">
    <span class="gl-done-icon">✓</span>
    <span class="gl-done-name">${typeof tSkill === "function" ? tSkill(sk.id) : sk.id}</span>
    <span class="gl-done-val">${cur}/${sk.required}</span>
  </div>`;
}

// ---- Quest Rows ----
function goalQuestRowMissing(questName) {
  const wiki = `https://runescape.wiki/w/${encodeURIComponent(questName.replace(/ /g, "_"))}`;
  return `<div class="gl-quest-inc">
    <span class="gl-q-icon">○</span>
    <span class="gl-q-name">${typeof esc === "function" ? esc(questName) : questName}</span>
    <a class="gl-q-wiki" href="${wiki}" target="_blank" rel="noopener">Wiki</a>
  </div>`;
}

function goalQuestRowDone(questName) {
  return `<div class="gl-quest-done">
    <span class="gl-done-icon">✓</span>
    <span class="gl-done-name">${typeof esc === "function" ? esc(questName) : questName}</span>
  </div>`;
}

// ---- Manual Item Row ----
function goalManualRow(player, item, isDone) {
  const key = `${item.id}_${player.name}`;
  const manual = goalsLoadManual();
  const checked = manual[key] ? "checked" : "";
  const lang = typeof currentLang !== "undefined" ? currentLang : "en";
  const label = lang === "pt" ? item.label_pt : item.label_en;

  if (isDone) {
    return `<div class="gl-manual-done">
      <input type="checkbox" class="gl-check" data-key="${key}" ${checked}>
      <span class="gl-done-name">${typeof esc === "function" ? esc(label) : label}</span>
    </div>`;
  }
  return `<div class="gl-manual-inc">
    <input type="checkbox" class="gl-check" data-key="${key}" ${checked}>
    <span class="gl-manual-label">${typeof esc === "function" ? esc(label) : label}</span>
  </div>`;
}

// ---- Phase Tree (ROTM-style guide) ----
function goalPhaseTree(goal, player) {
  if (!goal.phases || !goal.phases.length) return "";
  const lang = typeof currentLang !== "undefined" ? currentLang : "en";
  const isDone = (q) => typeof hasQuest === "function" && hasQuest(player, q);

  let nextPickedGlobal = false;
  let html = `<div class="gl-phase-tree">`;
  goal.phases.forEach((phase, pi) => {
    const title = lang === "pt" ? phase.title_pt : phase.title_en;
    const phaseDone = phase.quests.filter(isDone).length;
    const phaseTotal = phase.quests.length;
    const phasePct = phaseTotal ? Math.round(phaseDone / phaseTotal * 100) : 0;
    const phaseClass = phaseDone === phaseTotal ? "gl-phase-done" : phaseDone === 0 ? "gl-phase-pending" : "gl-phase-partial";

    html += `<div class="gl-phase ${phaseClass}">
      <div class="gl-phase-rail">
        <div class="gl-phase-marker">${pi + 1}</div>
        <div class="gl-phase-line"></div>
      </div>
      <div class="gl-phase-content">
        <div class="gl-phase-head">
          <span class="gl-phase-title">${typeof esc === "function" ? esc(title) : title}</span>
          <span class="gl-phase-stat">${phaseDone}/${phaseTotal}</span>
          <span class="gl-phase-pct">${phasePct}%</span>
        </div>
        <div class="gl-phase-bar"><div class="gl-phase-bar-fill" style="width:${phasePct}%"></div></div>
        <div class="gl-phase-quests">`;

    for (const q of phase.quests) {
      const done = isDone(q);
      const isNext = !done && !nextPickedGlobal;
      if (isNext) nextPickedGlobal = true;
      const cls = done ? "gl-pq-done" : isNext ? "gl-pq-next" : "gl-pq-todo";
      const wikiUrl = `https://runescape.wiki/w/${encodeURIComponent(q.replace(/ /g, "_"))}`;
      const icon = done ? "✓" : isNext ? "→" : "○";
      html += `<a href="${wikiUrl}" target="_blank" rel="noopener" class="gl-pq ${cls}">
        <span class="gl-pq-icon">${icon}</span>
        <span class="gl-pq-name">${typeof esc === "function" ? esc(q) : q}</span>
      </a>`;
    }
    html += `</div></div></div>`;
  });
  html += `</div>`;
  return html;
}

// ---- Goal Card (restructured) ----
function goalCard(goal, player, playerIdx, staggerIdx) {
  const prog = goalProgress(goal, player);
  const lang = typeof currentLang !== "undefined" ? currentLang : "en";
  const label = lang === "pt" ? goal.label_pt : goal.label_en;
  const sub = lang === "pt" ? goal.sub_pt : goal.sub_en;
  const allDone = prog.pct >= 100 || prog.capstoneDone;
  const manual = goalsLoadManual();

  // Compute gaps for all skills
  const gaps = goal.skills.map(sk => ({ sk, gap: goalSkillGap(player, sk) }));
  const missingSkills = gaps.filter(g => !g.gap.met).sort((a, b) => a.gap.levelsNeeded - b.gap.levelsNeeded);
  const doneSkills = gaps.filter(g => g.gap.met);

  // Split quests
  const missingQuests = goal.quests.filter(q => typeof hasQuest !== "function" || !hasQuest(player, q));
  const doneQuests = goal.quests.filter(q => typeof hasQuest === "function" && hasQuest(player, q));

  // Split manual
  const missingManual = goal.manual.filter(m => !manual[`${m.id}_${player.name}`]);
  const doneManual = goal.manual.filter(m => manual[`${m.id}_${player.name}`]);

  const totalMissing = missingSkills.length + missingQuests.length + missingManual.length;
  const totalCompleted = doneSkills.length + doneQuests.length + doneManual.length;

  let body = "";

  if (allDone) {
    const capLabel = prog.capstoneDone && goal.capstone
      ? `<div class="gl-celebration-sub">${lang === "pt" ? "Capstone:" : "Capstone:"} <strong>${esc(goal.capstone)}</strong> ✓</div>`
      : "";
    body = `<div class="gl-celebration">${lang === "pt" ? "🎉 Objetivo Completo!" : "🎉 Goal Complete!"}${capLabel}</div>`;
  } else if (goal.phases && goal.phases.length) {
    // ROTM-style phase tree guide
    const missingLabel = lang === "pt" ? "O Caminho" : "The Path";
    body += `<div class="gl-missing">`;
    body += `<div class="gl-missing-header">${missingLabel} <span class="gl-missing-count">${totalMissing}</span></div>`;
    body += goalPhaseTree(goal, player);
    if (missingSkills.length) {
      const skillLabel = lang === "pt" ? "Habilidades para treinar" : "Skills to train";
      body += `<div class="gl-section gl-section-skills"><div class="gl-section-title">${skillLabel} (${missingSkills.length})</div>`;
      body += missingSkills.map(g => goalSkillRowMissing(player, g.sk)).join("");
      body += `</div>`;
    }
    if (missingManual.length) {
      const manLabel = lang === "pt" ? "Itens pendentes" : "Pending items";
      body += `<div class="gl-section"><div class="gl-section-title">${manLabel} (${missingManual.length})</div>`;
      body += missingManual.map(m => goalManualRow(player, m, false)).join("");
      body += `</div>`;
    }
    body += `</div>`;
    if (totalCompleted > 0) {
      const doneLabel = lang === "pt" ? "skills/manual já feitos" : "skills/manual already done";
      body += `<details class="gl-done-zone">
        <summary class="gl-done-summary"><span class="gl-done-check-icon">✓</span> ${doneSkills.length + doneManual.length} ${doneLabel}</summary>
        <div class="gl-done-body">`;
      body += doneSkills.map(g => goalSkillRowDone(player, g.sk)).join("");
      body += doneManual.map(m => goalManualRow(player, m, true)).join("");
      body += `</div></details>`;
    }
  } else {
    // ---- MISSING ZONE ----
    const missingLabel = lang === "pt" ? "O que falta" : "What's Missing";
    body += `<div class="gl-missing">`;
    body += `<div class="gl-missing-header">${missingLabel} <span class="gl-missing-count">${totalMissing}</span></div>`;

    // Missing skills
    if (missingSkills.length) {
      const skillLabel = lang === "pt" ? "Habilidades para treinar" : "Skills to train";
      body += `<div class="gl-section"><div class="gl-section-title">${skillLabel} (${missingSkills.length})</div>`;
      body += missingSkills.map(g => goalSkillRowMissing(player, g.sk)).join("");
      body += `</div>`;
    }

    // Missing quests
    if (missingQuests.length) {
      const questLabel = lang === "pt" ? "Missões para completar" : "Quests to complete";
      body += `<div class="gl-section"><div class="gl-section-title">${questLabel} (${missingQuests.length})</div>`;
      body += missingQuests.map(q => goalQuestRowMissing(q)).join("");
      body += `</div>`;
    }

    // Missing manual
    if (missingManual.length) {
      const manLabel = lang === "pt" ? "Itens pendentes" : "Pending items";
      body += `<div class="gl-section"><div class="gl-section-title">${manLabel} (${missingManual.length})</div>`;
      body += missingManual.map(m => goalManualRow(player, m, false)).join("");
      body += `</div>`;
    }
    body += `</div>`;

    // ---- COMPLETED ZONE (collapsed) ----
    if (totalCompleted > 0) {
      const doneLabel = lang === "pt" ? "completos" : "completed";
      body += `<details class="gl-done-zone">
        <summary class="gl-done-summary"><span class="gl-done-check-icon">✓</span> ${totalCompleted} ${doneLabel}</summary>
        <div class="gl-done-body">`;
      body += doneSkills.map(g => goalSkillRowDone(player, g.sk)).join("");
      body += doneQuests.map(q => goalQuestRowDone(q)).join("");
      body += doneManual.map(m => goalManualRow(player, m, true)).join("");
      body += `</div></details>`;
    }
  }

  return `<details class="gl-card gl-card-${goal.color} gl-stagger" style="--si:${staggerIdx}" data-goal-id="${goal.id}" ${allDone ? "" : "open"}>
    <summary class="gl-card-header">
      <span class="gl-card-icon">${goal.icon}</span>
      <div class="gl-card-info">
        <div class="gl-card-title">${label}</div>
        <div class="gl-card-sub">${sub}</div>
        ${goalSegmentedBar(prog, goal)}
      </div>
      ${goalRing(prog.pct, 56, goal.color)}
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
/* ---- Animation ---- */
@keyframes glSlideIn {
  from { opacity:0; transform:translateY(14px); }
  to   { opacity:1; transform:none; }
}
.gl-stagger {
  opacity:0;
  animation: glSlideIn .45s cubic-bezier(.22,1,.36,1) forwards;
  animation-delay: calc(var(--si,0) * 80ms);
}
.gl-no-anim .gl-stagger { animation:none; opacity:1; }

/* ---- Page ---- */
.gl-page-hero { text-align:center; margin-bottom:20px; }
.gl-page-title { font-family:var(--font-display); font-size:1.3rem; font-weight:800; color:var(--gold-bright); letter-spacing:1px; }
.gl-page-sub { font-size:0.72rem; color:var(--text-3); margin-top:4px; }
.gl-player-tabs { display:flex; justify-content:center; gap:8px; margin-bottom:18px; }
.gl-player-tab { appearance:none; padding:6px 18px; border:1px solid var(--border); border-radius:100px; background:var(--bg-card); color:var(--text-2); cursor:pointer; font-size:0.75rem; font-weight:600; font-family:var(--font); transition:all .2s; }
.gl-player-tab:hover { border-color:var(--border-glow); }
.gl-player-tab.active { border-color:var(--gold-dim); color:var(--gold); background:var(--gold-bg); }
.gl-player-tab.p2.active { border-color:var(--teal-dim); color:var(--teal); background:var(--teal-bg); }

/* ---- Next Actions Panel ---- */
.gl-next-actions {
  background:var(--bg-card);
  border:1px solid var(--border);
  border-left:3px solid var(--gold-dim);
  border-radius:var(--radius);
  padding:14px 18px;
  margin-bottom:16px;
}
.gl-na-header { display:flex; align-items:center; gap:8px; margin-bottom:10px; }
.gl-na-title-icon { font-size:1rem; }
.gl-na-title { font-family:var(--font-display); font-size:0.85rem; font-weight:700; color:var(--gold-bright); letter-spacing:.5px; }
.gl-na-list { display:flex; flex-direction:column; gap:6px; }
.gl-na-item { display:flex; align-items:center; gap:8px; padding:5px 0; font-size:0.74rem; }
.gl-na-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
.gl-na-icon { flex-shrink:0; font-size:0.7rem; }
.gl-na-label { font-weight:600; color:var(--text); flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.gl-na-detail { font-family:var(--font-mono); font-size:0.65rem; color:var(--orange); white-space:nowrap; }
.gl-na-goal { font-size:0.6rem; color:var(--text-3); white-space:nowrap; }

/* ---- Card ---- */
.gl-card { background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius); margin-bottom:10px; overflow:hidden; }
.gl-card-gold { border-left:3px solid var(--gold-dim); }
.gl-card-teal { border-left:3px solid var(--teal-dim); }
.gl-card-orange { border-left:3px solid var(--orange); }
.gl-card-purple { border-left:3px solid var(--purple-dim); }

.gl-card-header { display:flex; align-items:center; gap:12px; padding:16px 18px; cursor:pointer; list-style:none; }
.gl-card-header::-webkit-details-marker { display:none; }
.gl-card-icon { font-size:1.5rem; flex-shrink:0; }
.gl-card-info { flex:1; min-width:0; }
.gl-card-title { font-family:var(--font-display); font-size:0.88rem; font-weight:700; color:var(--text); letter-spacing:.5px; }
.gl-card-sub { font-size:0.62rem; color:var(--text-3); margin-top:2px; margin-bottom:6px; }
.gl-ring { flex-shrink:0; }
.gl-card-body { padding:0 18px 16px; }

/* ---- Segmented Bar ---- */
.gl-seg-bar { display:flex; gap:2px; height:4px; border-radius:2px; overflow:hidden; }
.gl-seg { flex:1; background:var(--bg-raised); border-radius:2px; overflow:hidden; }
.gl-seg-fill { height:100%; border-radius:2px; transition:width .7s ease; }
.gl-seg-skill .gl-seg-fill { background:var(--gold-dim); }
.gl-seg-quest .gl-seg-fill { background:var(--teal-dim); }
.gl-seg-manual .gl-seg-fill { background:var(--purple-dim); }
.gl-seg-labels { display:flex; justify-content:space-between; margin-top:3px; font-size:0.56rem; font-family:var(--font-mono); color:var(--text-3); }

/* ---- Missing Zone ---- */
.gl-missing-header {
  font-family:var(--font-display);
  font-size:0.78rem;
  font-weight:700;
  color:var(--orange);
  margin-bottom:12px;
  display:flex;
  align-items:center;
  gap:8px;
}
.gl-missing-count {
  font-family:var(--font-mono);
  font-size:0.65rem;
  font-weight:800;
  background:rgba(240,160,48,0.12);
  color:var(--orange);
  padding:1px 8px;
  border-radius:100px;
}

.gl-section { margin-bottom:14px; }
.gl-section-title { font-size:0.66rem; font-weight:700; color:var(--text-3); text-transform:uppercase; letter-spacing:.8px; margin-bottom:6px; padding-bottom:4px; border-bottom:1px solid var(--border); }

/* ---- Incomplete Skill Row ---- */
.gl-skill-inc {
  display:grid;
  grid-template-columns: auto 1fr auto auto auto 70px;
  align-items:center;
  gap:6px;
  padding:5px 0;
  font-size:0.76rem;
}
.gl-sk-icon { font-size:0.7rem; }
.gl-sk-name { font-weight:600; color:var(--text); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.gl-sk-levels { display:flex; align-items:center; gap:3px; font-family:var(--font-mono); }
.gl-sk-cur { font-weight:800; color:var(--orange); }
.gl-sk-arrow { color:var(--text-3); font-size:0.6rem; }
.gl-sk-req { color:var(--text-2); font-weight:600; }
.gl-close .gl-sk-cur { color:var(--gold-bright); }
.gl-close .gl-sk-bar-fill { background:var(--gold) !important; }
.gl-sk-gap {
  font-family:var(--font-mono);
  font-size:0.6rem;
  font-weight:700;
  color:var(--orange);
  background:rgba(240,160,48,0.1);
  padding:1px 6px;
  border-radius:100px;
  white-space:nowrap;
}
.gl-close .gl-sk-gap { color:var(--gold-bright); background:rgba(212,168,67,0.12); }
.gl-sk-xp {
  font-family:var(--font-mono);
  font-size:0.58rem;
  color:var(--text-3);
  white-space:nowrap;
}
.gl-sk-bar { height:4px; background:var(--bg-raised); border-radius:2px; overflow:hidden; }
.gl-sk-bar-fill { height:100%; background:var(--orange); border-radius:2px; transition:width .6s ease; }

/* ---- Incomplete Quest Row ---- */
.gl-quest-inc {
  display:flex;
  align-items:center;
  gap:6px;
  padding:4px 0;
  font-size:0.74rem;
}
.gl-q-icon { color:var(--text-3); font-size:0.6rem; flex-shrink:0; }
.gl-q-name { flex:1; font-weight:500; color:var(--text); }
.gl-q-wiki { font-size:0.6rem; color:var(--text-3); text-decoration:none; padding:1px 6px; border:1px solid var(--border); border-radius:var(--radius-xs); transition:all .2s; }
.gl-q-wiki:hover { color:var(--gold); border-color:var(--gold-dim); }

/* ---- Incomplete Manual Row ---- */
.gl-manual-inc { display:flex; align-items:center; gap:8px; padding:4px 0; font-size:0.74rem; }
.gl-manual-label { color:var(--text); font-weight:500; }
.gl-check { accent-color:var(--gold); width:16px; height:16px; cursor:pointer; }

/* ---- Completed Zone ---- */
.gl-done-zone {
  margin-top:14px;
  border-top:1px solid var(--border);
  padding-top:8px;
}
.gl-done-summary {
  cursor:pointer;
  list-style:none;
  display:flex;
  align-items:center;
  gap:6px;
  font-size:0.7rem;
  color:var(--text-3);
  padding:4px 0;
  user-select:none;
}
.gl-done-summary::-webkit-details-marker { display:none; }
.gl-done-check-icon { color:var(--green); font-size:0.75rem; }
.gl-done-body {
  columns:2;
  column-gap:16px;
  padding:8px 0 4px;
}
.gl-skill-done, .gl-quest-done, .gl-manual-done {
  display:flex;
  align-items:center;
  gap:4px;
  padding:2px 0;
  font-size:0.64rem;
  color:var(--text-3);
  opacity:0.6;
  break-inside:avoid;
}
.gl-done-icon { color:var(--green); font-size:0.6rem; flex-shrink:0; }
.gl-done-name { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.gl-done-val { font-family:var(--font-mono); margin-left:auto; flex-shrink:0; }
.gl-manual-done .gl-check { width:13px; height:13px; opacity:0.5; }

/* ---- Celebration ---- */
.gl-celebration { text-align:center; padding:16px; font-size:0.88rem; font-weight:700; color:var(--green); background:var(--green-bg); border-radius:var(--radius-xs); }

/* ---- Card flash (deep-link from dashboard) ---- */
.gl-card-flash {
  animation: glCardFlash 1.8s cubic-bezier(0.22,1,0.36,1) 1;
}
@keyframes glCardFlash {
  0% { box-shadow: 0 0 0 2px transparent; }
  20% { box-shadow: 0 0 0 2px var(--gold-bright), 0 0 30px rgba(240,199,94,0.4); }
  100% { box-shadow: 0 0 0 0 transparent; }
}
.gl-card-purple.gl-card-flash {
  animation-name: glCardFlashPurple;
}
@keyframes glCardFlashPurple {
  0% { box-shadow: 0 0 0 2px transparent; }
  20% { box-shadow: 0 0 0 2px var(--purple), 0 0 30px rgba(167,139,250,0.45); }
  100% { box-shadow: 0 0 0 0 transparent; }
}
.gl-celebration-sub { font-size:0.65rem; color:var(--text-2); font-weight:500; margin-top:6px; }
.gl-celebration-sub strong { color:var(--gold-bright); font-family:var(--font-mono); }

/* ---- Phase Tree (ROTM guide) ---- */
.gl-phase-tree {
  display:flex; flex-direction:column;
  gap: 0;
  padding: 4px 0 8px;
}
.gl-phase {
  display: grid;
  grid-template-columns: 30px 1fr;
  gap: 12px;
  padding: 8px 0;
  position: relative;
}
.gl-phase-rail {
  display: flex; flex-direction: column; align-items: center;
  position: relative;
}
.gl-phase-marker {
  width: 26px; height: 26px;
  border-radius: 50%;
  background: var(--bg-raised);
  border: 1px solid var(--border);
  display: flex; align-items: center; justify-content: center;
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 0.75rem;
  color: var(--text-3);
  flex-shrink: 0;
  z-index: 1;
}
.gl-phase-done .gl-phase-marker {
  background: var(--green-bg);
  border-color: var(--green);
  color: var(--green);
}
.gl-phase-partial .gl-phase-marker {
  background: rgba(167,139,250,0.10);
  border-color: rgba(167,139,250,0.45);
  color: var(--purple);
  box-shadow: 0 0 12px rgba(167,139,250,0.20);
}
.gl-phase-line {
  flex: 1;
  width: 2px;
  background: linear-gradient(180deg, var(--border) 0%, transparent 100%);
  margin-top: 4px;
}
.gl-phase:last-child .gl-phase-line { display: none; }

.gl-phase-content {
  padding-bottom: 8px;
}
.gl-phase-head {
  display: flex; align-items: baseline; gap: 8px;
  margin-bottom: 6px;
}
.gl-phase-title {
  font-family: var(--font-display);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--text);
  flex: 1;
}
.gl-phase-done .gl-phase-title { color: var(--green); }
.gl-phase-partial .gl-phase-title { color: var(--purple); }
.gl-phase-stat {
  font-family: var(--font-mono);
  font-size: 0.62rem;
  color: var(--text-2);
}
.gl-phase-pct {
  font-family: var(--font-mono);
  font-size: 0.62rem;
  font-weight: 800;
  color: var(--text-3);
  letter-spacing: 0.02em;
}
.gl-phase-done .gl-phase-pct { color: var(--green); }
.gl-phase-partial .gl-phase-pct { color: var(--purple); }

.gl-phase-bar {
  height: 3px;
  background: rgba(0,0,0,0.4);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 8px;
}
.gl-phase-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--purple-dim), var(--purple));
  border-radius: 2px;
  transition: width 0.7s cubic-bezier(0.22,1,0.36,1);
}
.gl-phase-done .gl-phase-bar-fill {
  background: linear-gradient(90deg, var(--green), var(--green));
}

.gl-phase-quests {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 4px 8px;
}
.gl-pq {
  display: flex; align-items: center; gap: 6px;
  padding: 5px 8px;
  border-radius: var(--radius-xs);
  font-size: 0.7rem;
  text-decoration: none;
  border: 1px solid transparent;
  transition: all 0.15s;
}
.gl-pq:hover { border-color: var(--border-hover); background: var(--bg-raised); }
.gl-pq-icon {
  font-family: var(--font-mono);
  font-size: 0.65rem;
  width: 14px; text-align: center;
  flex-shrink: 0;
}
.gl-pq-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.gl-pq-done {
  color: var(--text-3);
  opacity: 0.6;
}
.gl-pq-done .gl-pq-icon { color: var(--green); opacity: 1; }
.gl-pq-todo {
  color: var(--text-2);
}
.gl-pq-todo .gl-pq-icon { color: var(--text-3); }
.gl-pq-next {
  background: rgba(167,139,250,0.07);
  border-color: rgba(167,139,250,0.30);
  color: var(--purple);
  font-weight: 600;
  position: relative;
}
.gl-pq-next .gl-pq-icon {
  color: var(--purple);
  font-weight: 800;
  animation: glPqPulse 1.4s ease-in-out infinite;
}
@keyframes glPqPulse {
  0%,100% { transform: translateX(0); }
  50% { transform: translateX(2px); }
}
.gl-pq-next:hover {
  background: rgba(167,139,250,0.12);
  border-color: rgba(167,139,250,0.55);
  box-shadow: 0 0 14px rgba(167,139,250,0.18);
}

/* Card-level treatment for ROTM */
.gl-card-purple .gl-phase-marker { font-family: var(--font-display); }

/* ---- Mobile ---- */
@media(max-width:640px) {
  .gl-skill-inc { grid-template-columns:auto 1fr auto auto 50px; }
  .gl-sk-xp { display:none; }
  .gl-card-header { padding:12px 14px; }
  .gl-na-goal { display:none; }
  .gl-done-body { columns:1; }
  .gl-seg-labels { font-size:0.52rem; }
  .gl-phase { grid-template-columns: 24px 1fr; gap: 10px; }
  .gl-phase-marker { width: 22px; height: 22px; font-size: 0.65rem; }
  .gl-phase-quests { grid-template-columns: 1fr; }
  .gl-phase-title { font-size: 0.72rem; }
}
@media(max-width:400px) {
  .gl-sk-gap { font-size:0.55rem; padding:1px 4px; }
}
`;
  document.head.appendChild(s);
}

// ---- Main render function ----
function renderGoalsPage(players) {
  goalsInjectStyles();
  const section = document.querySelector('[data-page="goals"]');
  if (!section) return;
  if (!players || !players.length) return;

  const lang = typeof currentLang !== "undefined" ? currentLang : "en";
  const activeIdx = parseInt(section.dataset.glActive || "0", 10);
  const player = players[Math.min(activeIdx, players.length - 1)];
  const isRerender = section.dataset.glRendered === "1";

  let html = `<button class="section-back" id="gl-back">← ${lang === "pt" ? "Início" : "Home"}</button>
  <div class="gl-page-hero">
    <div class="gl-page-title">${lang === "pt" ? "Objetivos Principais" : "Major Goals"}</div>
    <div class="gl-page-sub">${lang === "pt" ? "O que falta para os maiores marcos do jogo" : "What's missing for the biggest milestones"}</div>
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

  // Next Actions panel
  html += goalNextActionsPanel(player);

  // Goal cards
  let si = 1; // stagger index (0 is the next-actions panel)
  for (const goal of GOALS) {
    html += goalCard(goal, player, activeIdx, si++);
  }

  section.innerHTML = html;
  if (typeof attachImgFallbacks === "function") attachImgFallbacks(section);

  // Apply pending highlight from a major-goal card click (set in major-goals.js).
  // Re-applied on every render so a cache→live refresh can't wipe the open state.
  if (window._mgPendingHighlight) {
    const goalId = window._mgPendingHighlight;
    requestAnimationFrame(() => {
      const target = section.querySelector(`.gl-card[data-goal-id="${goalId}"]`);
      if (target) {
        target.setAttribute("open", "");
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        target.classList.add("gl-card-flash");
        setTimeout(() => target.classList.remove("gl-card-flash"), 1800);
        // Clear so future renders don't re-scroll
        window._mgPendingHighlight = null;
      }
    });
  }

  // Disable stagger on re-renders
  if (isRerender) section.classList.add("gl-no-anim");
  else section.dataset.glRendered = "1";

  // Animate bar fills
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      section.querySelectorAll("[data-tw]").forEach(el => {
        el.style.width = el.dataset.tw;
      });
    });
  });

  // Event: back button
  const backBtn = section.querySelector("#gl-back");
  if (backBtn) backBtn.addEventListener("click", () => { if (typeof launchSection === "function") launchSection("dashboard"); });

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
