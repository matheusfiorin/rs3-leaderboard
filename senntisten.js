/* =============================================
   RS3 Leaderboard — Temple at Senntisten Tracker
   Road to Soul Split quest chain tracker
   Auto-checks skills/quests from live data,
   manual checkboxes persisted in localStorage.
   ============================================= */

// ---- Skill requirements (RS3 RuneMetrics API IDs) ----
const SN_SKILLS = [
  { id: 21, abbr: "HUN", required: 51, reason: "Defender of Varrock" },
  { id: 16, abbr: "AGI", required: 61, reason: "The Curse of Arrav" },
  { id: 2,  abbr: "STR", required: 64, reason: "The Curse of Arrav" },
  { id: 17, abbr: "THI", required: 66, reason: "The Curse of Arrav" },
  { id: 22, abbr: "CON", required: 35, reason: "Missing My Mummy" },
  { id: 4,  abbr: "RNG", required: 64, reason: "The Curse of Arrav" },
  { id: 7,  abbr: "COK", required: 35, reason: "Missing My Mummy" },
  { id: 23, abbr: "SUM", required: 41, reason: "The Curse of Arrav" },
  { id: 11, abbr: "FM",  required: 50, reason: "Desert Treasure" },
  { id: 12, abbr: "CRA", required: 45, reason: "Missing My Mummy 100%" },
];

// ---- Quest chain grouped by phase ----
const SN_PHASES = [
  {
    id: 1,
    label_pt: "Fase 1 — Treino Inicial",
    label_en: "Phase 1 — Buyable Skills",
    quests: [],
    // Phase 1 is skill training only — no quests
  },
  {
    id: 2,
    label_pt: "Fase 2 — Missoes Faceis",
    label_en: "Phase 2 — Easy Quests",
    quests: [
      "Priest in Peril",
      "Death Plateau",
      "Goblin Diplomacy",
      "The Lost Tribe",
      "Stolen Hearts",
      "Diamond in the Rough",
      "Gertrude's Cat",
      "The Dig Site",
      "The Tourist Trap",
      "Temple of Ikov",
      "The Tale of the Muspah",
      "The Golem",
      "Nature Spirit",
      "Creature of Fenkenstrain",
      "Shades of Mort'ton",
      "Garden of Tranquillity",
      "Family Crest",
      "What Lies Below",
      "Troll Stronghold",
    ],
  },
  {
    id: 3,
    label_pt: "Fase 3 — Cadeia de Icthlarin",
    label_en: "Phase 3 — Icthlarin Chain",
    quests: [
      "Icthlarin's Little Helper",
      "Missing My Mummy",
      "Wanted!",
      "Troll Romance",
      "Devious Minds",
    ],
  },
  {
    id: 4,
    label_pt: "Fase 4 — Desert Treasure",
    label_en: "Phase 4 — Desert Treasure",
    quests: ["Desert Treasure"],
  },
  {
    id: 5,
    label_pt: "Fase 5 — Grinds Longos",
    label_en: "Phase 5 — Long Grinds",
    quests: [],
    // Phase 5 is skill grinding only
  },
  {
    id: 6,
    label_pt: "Fase 6 — Missoes Finais",
    label_en: "Phase 6 — Final Quests",
    quests: ["Defender of Varrock", "The Curse of Arrav"],
  },
  {
    id: 7,
    label_pt: "Fase 7 — Conclusao",
    label_en: "Phase 7 — Finish",
    quests: ["The Temple at Senntisten"],
  },
];

// ---- Manual checklist items (not detectable from API) ----
const SN_MANUAL = [
  {
    id: "cat_grown",
    phase: 3,
    label_pt: "Gato crescido (de Gertrude's Cat)",
    label_en: "Cat grown (from Gertrude's Cat)",
  },
  {
    id: "senliten_100",
    phase: 3,
    label_pt: "Senliten restaurada 100%",
    label_en: "Senliten restored 100%",
  },
  {
    id: "ice_gloves",
    phase: 4,
    label_pt: "Ice Gloves obtidas",
    label_en: "Ice Gloves obtained",
  },
  {
    id: "dt_supplies",
    phase: 4,
    label_pt: "Suprimentos para Desert Treasure",
    label_en: "Desert Treasure supplies ready",
  },
  {
    id: "kudos_125",
    phase: 7,
    label_pt: "125 Kudos no Museu de Varrock",
    label_en: "125 Varrock Museum Kudos",
  },
];

// Wiki link builder for quest names
const SN_WIKI = (quest) =>
  `https://runescape.wiki/w/${quest.replace(/ /g, "_")}`;

// Total items across all trackable categories
const SN_ALL_QUESTS = SN_PHASES.flatMap((p) => p.quests);
const SN_TOTAL_ITEMS =
  SN_SKILLS.length + SN_ALL_QUESTS.length + SN_MANUAL.length;

// localStorage key for manual checkboxes
const SN_STORAGE_KEY = "rs3lb-senntisten";

// ---- i18n helper (bilingual fallback) ----
function snT(key) {
  const map = {
    snTitle:      { pt: "Rumo ao Soul Split",           en: "Road to Soul Split" },
    snSubtitle:   { pt: "The Temple at Senntisten",      en: "The Temple at Senntisten" },
    snSkills:     { pt: "Requisitos de Habilidade",      en: "Skill Requirements" },
    snQuests:     { pt: "Missoes Necessarias",           en: "Required Quests" },
    snManual:     { pt: "Itens Manuais",                 en: "Manual Items" },
    snPhase:      { pt: "Fase",                          en: "Phase" },
    snCurrentLvl: { pt: "Atual",                         en: "Current" },
    snRequired:   { pt: "Necessario",                    en: "Required" },
    snGap:        { pt: "Falta",                         en: "Gap" },
    snComplete:   { pt: "Completo",                      en: "Complete" },
    snSoulSplit:  { pt: "Soul Split Desbloqueado!",      en: "Soul Split Unlocked!" },
    snProgress:   { pt: "Progresso Geral",               en: "Overall Progress" },
    snWikiLink:   { pt: "Wiki",                          en: "Wiki" },
    snSkillMet:   { pt: "Requisito atingido",            en: "Requirement met" },
    snSkillGap:   { pt: "niveis restantes",              en: "levels remaining" },
    snNoQuests:   { pt: "Nenhuma missao nesta fase",     en: "No quests in this phase" },
    snSkillOnly:  { pt: "Apenas treino de habilidades",  en: "Skill training only" },
    snUnlocked:   { pt: "Desbloqueado",                  en: "Unlocked" },
  };
  // Use global t() first (if the key is registered in LANG), then local fallback
  const global = typeof t === "function" ? t(key) : key;
  if (global !== key) return global;
  const entry = map[key];
  if (!entry) return key;
  const lang = typeof currentLang !== "undefined" ? currentLang : "en";
  return entry[lang] || entry.en || key;
}

// ---- Load manual checkbox state ----
function snLoadManual() {
  try {
    return JSON.parse(localStorage.getItem(SN_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

// ---- Save manual checkbox state ----
function snSaveManual(state) {
  localStorage.setItem(SN_STORAGE_KEY, JSON.stringify(state));
}

// ---- Get player skill level safely ----
function snSkillLevel(player, skillId) {
  return (player.skills[skillId] || {}).level || 1;
}

// ---- Count completed items for a player ----
function snCountDone(player) {
  const manual = snLoadManual();
  let skills = 0, quests = 0, manualDone = 0;

  for (const sk of SN_SKILLS) {
    if (snSkillLevel(player, sk.id) >= sk.required) skills++;
  }
  for (const q of SN_ALL_QUESTS) {
    if (hasQuest(player, q)) quests++;
  }
  for (const m of SN_MANUAL) {
    const key = `${m.id}_${player.name}`;
    if (manual[key]) manualDone++;
  }
  return { skills, quests, manualDone, total: skills + quests + manualDone };
}

// ---- Build progress bar HTML ----
function snProgressBar(pct, cls) {
  const clamped = Math.max(0, Math.min(100, pct));
  const colorCls = clamped >= 100 ? "sn-bar-done" : "";
  return `<div class="sn-bar ${cls || ""}">
    <div class="sn-bar-fill ${colorCls}" style="width:${clamped}%"></div>
  </div>`;
}

// ---- Build skill row HTML for one player ----
function snSkillRow(player, sk) {
  const current = snSkillLevel(player, sk.id);
  const met = current >= sk.required;
  const gap = met ? 0 : sk.required - current;
  const pct = met ? 100 : Math.round((current / sk.required) * 100);
  const icon = met ? "&#x2705;" : "&#x1f534;";

  return `<tr class="sn-skill-row ${met ? "sn-met" : "sn-unmet"}">
    <td class="sn-skill-icon">${icon}</td>
    <td class="sn-skill-name">${tSkill(sk.id)}</td>
    <td class="sn-skill-cur">${current}</td>
    <td class="sn-skill-req">${sk.required}</td>
    <td class="sn-skill-gap">${met ? snT("snComplete") : gap}</td>
    <td class="sn-skill-bar-cell">${snProgressBar(pct)}</td>
    <td class="sn-skill-reason">${esc(sk.reason)}</td>
  </tr>`;
}

// ---- Build quest item HTML ----
function snQuestItem(player, questName) {
  const done = hasQuest(player, questName);
  const icon = done ? "&#x2705;" : "&#x2B1C;";
  const cls = done ? "sn-quest-done" : "sn-quest-todo";
  const wikiUrl = SN_WIKI(questName);
  return `<div class="sn-quest-item ${cls}">
    <span class="sn-quest-icon">${icon}</span>
    <span class="sn-quest-name">${esc(questName)}</span>
    <a class="sn-quest-wiki" href="${esc(wikiUrl)}" target="_blank" rel="noopener">${snT("snWikiLink")}</a>
  </div>`;
}

// ---- Build manual checkbox HTML ----
function snManualItem(player, item, manual) {
  const key = `${item.id}_${player.name}`;
  const checked = manual[key] ? "checked" : "";
  const lang = typeof currentLang !== "undefined" ? currentLang : "en";
  const label = lang === "pt" ? item.label_pt : item.label_en;
  return `<div class="sn-manual-item">
    <input type="checkbox" class="sn-check" data-key="${esc(key)}" ${checked}>
    <span class="sn-manual-label">${esc(label)}</span>
  </div>`;
}

// ---- Build phase accordion section ----
function snPhaseSection(player, phase, manual) {
  const lang = typeof currentLang !== "undefined" ? currentLang : "en";
  const phaseLabel = lang === "pt" ? phase.label_pt : phase.label_en;

  // Count done quests in this phase
  const phaseQuestsDone = phase.quests.filter((q) => hasQuest(player, q)).length;
  // Manual items in this phase
  const phaseManuals = SN_MANUAL.filter((m) => m.phase === phase.id);
  const phaseManualDone = phaseManuals.filter(
    (m) => manual[`${m.id}_${player.name}`]
  ).length;
  // Skills relevant to this phase (phases 1 and 5 are skill-training)
  const isSkillPhase = phase.id === 1 || phase.id === 5;

  const totalInPhase =
    phase.quests.length + phaseManuals.length + (isSkillPhase ? SN_SKILLS.length : 0);
  const doneInPhase =
    phaseQuestsDone + phaseManualDone +
    (isSkillPhase
      ? SN_SKILLS.filter((sk) => snSkillLevel(player, sk.id) >= sk.required).length
      : 0);
  const phasePct = totalInPhase > 0 ? Math.round((doneInPhase / totalInPhase) * 100) : 100;
  const phaseComplete = phasePct >= 100;

  let body = "";

  // Skill table for skill-training phases
  if (isSkillPhase) {
    body += `<div class="sn-skill-section">
      <h4 class="sn-section-label">${snT("snSkills")}</h4>
      <table class="sn-skill-table">
        <thead>
          <tr>
            <th></th>
            <th>${snT("snSkills")}</th>
            <th>${snT("snCurrentLvl")}</th>
            <th>${snT("snRequired")}</th>
            <th>${snT("snGap")}</th>
            <th></th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${SN_SKILLS.map((sk) => snSkillRow(player, sk)).join("")}
        </tbody>
      </table>
    </div>`;
  }

  // Quest list
  if (phase.quests.length > 0) {
    body += `<div class="sn-quest-section">
      <h4 class="sn-section-label">${snT("snQuests")}</h4>
      <div class="sn-quest-list">
        ${phase.quests.map((q) => snQuestItem(player, q)).join("")}
      </div>
    </div>`;
  }

  // Manual items for this phase
  if (phaseManuals.length > 0) {
    body += `<div class="sn-manual-section">
      <h4 class="sn-section-label">${snT("snManual")}</h4>
      ${phaseManuals.map((m) => snManualItem(player, m, manual)).join("")}
    </div>`;
  }

  // Empty phase message
  if (phase.quests.length === 0 && phaseManuals.length === 0 && !isSkillPhase) {
    body += `<p class="sn-empty">${snT("snComplete")}</p>`;
  }

  return `<details class="sn-phase ${phaseComplete ? "sn-phase-done" : ""}" ${phase.id <= 2 ? "open" : ""}>
    <summary class="sn-phase-header">
      <span class="sn-phase-title">${esc(phaseLabel)}</span>
      <span class="sn-phase-badge">${doneInPhase}/${totalInPhase}</span>
      ${snProgressBar(phasePct, "sn-bar-mini")}
    </summary>
    <div class="sn-phase-body">${body}</div>
  </details>`;
}

// ---- Soul Split celebration banner ----
function snCelebration() {
  return `<div class="sn-celebration">
    <div class="sn-celebration-glow"></div>
    <div class="sn-celebration-text">${snT("snSoulSplit")}</div>
    <div class="sn-celebration-sub">Ancient Curses</div>
  </div>`;
}

// ---- Inject scoped CSS (idempotent) ----
function snInjectStyles() {
  if (document.getElementById("sn-styles")) return;
  const style = document.createElement("style");
  style.id = "sn-styles";
  style.textContent = `
/* ---- Senntisten Tracker ---- */
.sn-hero {
  text-align: center;
  padding: var(--sp-6) var(--sp-4);
  margin-bottom: var(--sp-4);
}
.sn-hero-title {
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--gold-bright);
  margin: 0 0 var(--sp-1);
}
.sn-hero-sub {
  font-size: 0.78rem;
  color: var(--text-3);
  margin: 0 0 var(--sp-4);
}
.sn-hero-pct {
  font-family: var(--font-mono);
  font-size: 2rem;
  font-weight: 800;
  color: var(--gold);
}
.sn-hero-pct.sn-done { color: var(--green); }

/* Progress bars */
.sn-bar {
  height: 6px;
  background: var(--bg-raised);
  border-radius: 3px;
  overflow: hidden;
  min-width: 60px;
}
.sn-bar-fill {
  height: 100%;
  background: var(--gold-dim);
  border-radius: 3px;
  transition: width 0.4s ease;
}
.sn-bar-fill.sn-bar-done { background: var(--green); }
.sn-bar-mini { height: 4px; min-width: 40px; flex: 1; margin-left: var(--sp-2); }
.sn-bar-hero { height: 8px; max-width: 320px; margin: var(--sp-3) auto 0; }

/* Player selector */
.sn-player-tabs {
  display: flex;
  justify-content: center;
  gap: var(--sp-3);
  margin-bottom: var(--sp-5);
}
.sn-player-tab {
  padding: var(--sp-2) var(--sp-4);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-card);
  color: var(--text-2);
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 600;
  transition: all 0.2s;
}
.sn-player-tab:hover { border-color: var(--border-glow); background: var(--bg-hover); }
.sn-player-tab.active { border-color: var(--gold-dim); color: var(--gold); background: var(--gold-bg); }
.sn-player-tab.p2.active { border-color: var(--teal-dim); color: var(--teal); background: var(--teal-bg); }

/* Phase accordion */
.sn-phase {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  margin-bottom: var(--sp-2);
  overflow: hidden;
}
.sn-phase-done { border-color: rgba(52,211,153,0.2); }
.sn-phase-header {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-3) var(--sp-4);
  cursor: pointer;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text);
  list-style: none;
}
.sn-phase-header::-webkit-details-marker { display: none; }
.sn-phase-header::before {
  content: "\\25B6";
  font-size: 0.6rem;
  color: var(--text-3);
  transition: transform 0.2s;
}
details.sn-phase[open] > .sn-phase-header::before { transform: rotate(90deg); }
.sn-phase-title { flex: 0 0 auto; }
.sn-phase-badge {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: var(--text-3);
  background: var(--bg-raised);
  padding: 2px 6px;
  border-radius: var(--radius-xs);
}
.sn-phase-done .sn-phase-badge { color: var(--green); background: var(--green-bg); }
.sn-phase-body { padding: 0 var(--sp-4) var(--sp-4); }

/* Section labels inside phases */
.sn-section-label {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--text-3);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: var(--sp-3) 0 var(--sp-2);
}

/* Skill table */
.sn-skill-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.75rem;
}
.sn-skill-table th {
  text-align: left;
  padding: var(--sp-1) var(--sp-2);
  color: var(--text-3);
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom: 1px solid var(--border);
}
.sn-skill-row td {
  padding: var(--sp-1) var(--sp-2);
  border-bottom: 1px solid var(--border);
}
.sn-skill-row.sn-met { color: var(--green); }
.sn-skill-row.sn-unmet .sn-skill-gap { color: var(--orange); font-weight: 600; }
.sn-skill-cur { font-family: var(--font-mono); font-weight: 700; }
.sn-skill-req { font-family: var(--font-mono); color: var(--text-3); }
.sn-skill-reason { color: var(--text-3); font-size: 0.68rem; }
.sn-skill-bar-cell { min-width: 60px; }

/* Quest list */
.sn-quest-list { display: flex; flex-direction: column; gap: var(--sp-1); }
.sn-quest-item {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-1) 0;
  font-size: 0.78rem;
}
.sn-quest-done .sn-quest-name { color: var(--green); text-decoration: line-through; text-decoration-color: rgba(52,211,153,0.3); }
.sn-quest-todo .sn-quest-name { color: var(--text); }
.sn-quest-wiki {
  font-size: 0.65rem;
  color: var(--text-3);
  text-decoration: none;
  margin-left: auto;
  padding: 1px 6px;
  border: 1px solid var(--border);
  border-radius: var(--radius-xs);
  transition: color 0.2s, border-color 0.2s;
}
.sn-quest-wiki:hover { color: var(--gold); border-color: var(--gold-dim); }

/* Manual items */
.sn-manual-item {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-1) 0;
  font-size: 0.78rem;
}
.sn-check {
  accent-color: var(--gold);
  cursor: pointer;
  width: 16px;
  height: 16px;
}
.sn-manual-label { color: var(--text-2); }
.sn-empty { color: var(--text-3); font-size: 0.75rem; font-style: italic; margin: var(--sp-2) 0; }

/* Soul Split celebration */
.sn-celebration {
  position: relative;
  text-align: center;
  padding: var(--sp-8) var(--sp-4);
  margin: var(--sp-4) 0;
  border-radius: var(--radius);
  background: var(--bg-card);
  border: 1px solid rgba(212,168,67,0.3);
  overflow: hidden;
}
.sn-celebration-glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at center, rgba(212,168,67,0.15) 0%, transparent 70%);
  animation: sn-pulse 2.5s ease-in-out infinite;
  pointer-events: none;
}
.sn-celebration-text {
  font-family: var(--font-display);
  font-size: 1.6rem;
  font-weight: 800;
  color: var(--gold-bright);
  text-shadow: 0 0 20px rgba(212,168,67,0.5), 0 0 40px rgba(212,168,67,0.2);
  position: relative;
}
.sn-celebration-sub {
  font-size: 0.82rem;
  color: var(--text-3);
  margin-top: var(--sp-2);
  position: relative;
}
@keyframes sn-pulse {
  0%, 100% { opacity: 0.5; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.05); }
}

/* Responsive */
@media (max-width: 640px) {
  .sn-skill-table { font-size: 0.68rem; }
  .sn-skill-reason { display: none; }
  .sn-hero-title { font-size: 1.2rem; }
  .sn-hero-pct { font-size: 1.5rem; }
  .sn-celebration-text { font-size: 1.2rem; }
}
`;
  document.head.appendChild(style);
}

// ---- Ensure the page section exists in the DOM ----
function snEnsureSection() {
  let section = document.querySelector('[data-page="senntisten"]');
  if (!section) {
    section = document.createElement("section");
    section.className = "page";
    section.dataset.page = "senntisten";
    section.setAttribute("role", "tabpanel");
    section.id = "sn-page";
    // Insert before the closing </main>
    const main = document.getElementById("main-content");
    if (main) main.appendChild(section);
  }
  return section;
}

// ============================================================
// Main render function — called by _renderers["senntisten"]
// ============================================================
function renderSenntisten(players) {
  snInjectStyles();
  const section = snEnsureSection();
  if (!players || players.length === 0) return;

  const manual = snLoadManual();

  // Default to first player
  const activeIdx = parseInt(section.dataset.snActive || "0", 10);
  const player = players[Math.min(activeIdx, players.length - 1)];

  const counts = snCountDone(player);
  const pct = SN_TOTAL_ITEMS > 0
    ? Math.round((counts.total / SN_TOTAL_ITEMS) * 100)
    : 0;
  const allDone = counts.total >= SN_TOTAL_ITEMS;

  // ---- Build HTML ----
  let html = "";

  // Hero section
  html += `<div class="sn-hero">
    <h2 class="sn-hero-title">${snT("snTitle")}</h2>
    <p class="sn-hero-sub">${snT("snSubtitle")}</p>
    <div class="sn-hero-pct ${allDone ? "sn-done" : ""}">${pct}%</div>
    <div class="sn-hero-stat">${counts.total} / ${SN_TOTAL_ITEMS}</div>
    ${snProgressBar(pct, "sn-bar-hero")}
  </div>`;

  // Player selector tabs (if more than one player)
  if (players.length > 1) {
    html += `<div class="sn-player-tabs">`;
    players.forEach((p, i) => {
      const cls = i === activeIdx ? "active" : "";
      const pCls = i === 0 ? "p1" : "p2";
      const pCounts = snCountDone(p);
      const pPct = Math.round((pCounts.total / SN_TOTAL_ITEMS) * 100);
      html += `<button class="sn-player-tab ${pCls} ${cls}" data-sn-player="${i}">
        ${esc(p.name)} (${pPct}%)
      </button>`;
    });
    html += `</div>`;
  }

  // Celebration banner (if all done)
  if (allDone) {
    html += snCelebration();
  }

  // Phase accordions
  for (const phase of SN_PHASES) {
    html += snPhaseSection(player, phase, manual);
  }

  section.innerHTML = html;

  // ---- Event delegation ----
  // Player tab switching
  section.querySelectorAll(".sn-player-tab").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const idx = e.currentTarget.dataset.snPlayer;
      section.dataset.snActive = idx;
      renderSenntisten(players);
    });
  });

  // Manual checkbox persistence
  section.addEventListener("change", function handler(e) {
    if (!e.target.classList.contains("sn-check")) return;
    const state = snLoadManual();
    if (e.target.checked) {
      state[e.target.dataset.key] = true;
    } else {
      delete state[e.target.dataset.key];
    }
    snSaveManual(state);
    // Re-render to update progress counts
    renderSenntisten(players);
  }, { once: true });
  // Note: we use { once: true } and re-attach on each render to avoid
  // stacking listeners, since renderSenntisten replaces innerHTML.
}

// ============================================================
// Agility Grind Tracker — live XP chart + rate/ETA
// ============================================================

const SN_GRIND_KEY = "rs3lb-sn-grind";
const SN_GRIND_SKILL_ID = 16; // Agility
const SN_GRIND_TARGET_XP = 302288; // Level 61
const SN_GRIND_TARGET_LVL = 61;
const SN_GRIND_MAX_SNAPSHOTS = 500;

function snLoadSnapshots() {
  try { return JSON.parse(localStorage.getItem(SN_GRIND_KEY) || "[]"); }
  catch { return []; }
}

function snSaveSnapshots(arr) {
  localStorage.setItem(SN_GRIND_KEY, JSON.stringify(arr));
}

function snRecordSnapshot(player) {
  const sk = player.skills[SN_GRIND_SKILL_ID] || {};
  const xp = (sk.xp || 0);
  const lvl = sk.level || 1;
  const snaps = snLoadSnapshots();
  // Deduplicate: skip if XP unchanged
  if (snaps.length > 0 && snaps[snaps.length - 1].xp === xp) return snaps;
  snaps.push({ t: Date.now(), xp, lvl });
  // Cap length
  if (snaps.length > SN_GRIND_MAX_SNAPSHOTS) snaps.splice(0, snaps.length - SN_GRIND_MAX_SNAPSHOTS);
  snSaveSnapshots(snaps);
  return snaps;
}

function snCalcStats(snaps) {
  if (snaps.length < 1) return null;
  const first = snaps[0];
  const last = snaps[snaps.length - 1];
  const sessionGain = last.xp - first.xp;
  const sessionMs = last.t - first.t;
  const sessionHrs = sessionMs / 3600000;

  // Rate from recent snapshots (last 30 min or all)
  const thirtyAgo = last.t - 30 * 60 * 1000;
  const recent = snaps.filter(s => s.t >= thirtyAgo);
  let ratePerHr = 0;
  if (recent.length >= 2) {
    const rFirst = recent[0];
    const rLast = recent[recent.length - 1];
    const dt = (rLast.t - rFirst.t) / 3600000;
    if (dt > 0) ratePerHr = (rLast.xp - rFirst.xp) / dt;
  } else if (sessionHrs > 0) {
    ratePerHr = sessionGain / sessionHrs;
  }

  const remaining = Math.max(0, SN_GRIND_TARGET_XP - last.xp);
  const etaHrs = ratePerHr > 0 ? remaining / ratePerHr : null;

  return {
    sessionGain, ratePerHr: Math.round(ratePerHr),
    remaining, etaHrs, currentXp: last.xp, currentLvl: last.lvl,
    elapsed: sessionMs, snapCount: snaps.length,
    done: last.xp >= SN_GRIND_TARGET_XP,
  };
}

function snFormatEta(hrs) {
  if (hrs == null || hrs <= 0) return "--";
  const h = Math.floor(hrs);
  const m = Math.round((hrs - h) * 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function snFormatElapsed(ms) {
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

function snRenderGrindStats(stats) {
  if (!stats) return `<div class="sn-grind-stats"><p class="sn-empty">Waiting for data...</p></div>`;
  const lang = typeof currentLang !== "undefined" ? currentLang : "en";
  const pct = Math.min(100, Math.round((stats.currentXp / SN_GRIND_TARGET_XP) * 100));
  const labels = lang === "pt"
    ? { rate: "XP/hora", eta: "ETA p/ 61", gained: "Ganho", elapsed: "Tempo", remaining: "Restante" }
    : { rate: "XP/hour", eta: "ETA to 61", gained: "Gained", elapsed: "Elapsed", remaining: "Remaining" };

  return `<div class="sn-grind-stats">
    <div class="sn-grind-stat">
      <span class="sn-grind-val ${stats.ratePerHr > 0 ? "sn-grind-live" : ""}">${stats.ratePerHr > 0 ? stats.ratePerHr.toLocaleString() : "--"}</span>
      <span class="sn-grind-label">${labels.rate}</span>
    </div>
    <div class="sn-grind-stat">
      <span class="sn-grind-val">${snFormatEta(stats.etaHrs)}</span>
      <span class="sn-grind-label">${labels.eta}</span>
    </div>
    <div class="sn-grind-stat">
      <span class="sn-grind-val">${stats.sessionGain > 0 ? "+" + stats.sessionGain.toLocaleString() : "0"}</span>
      <span class="sn-grind-label">${labels.gained}</span>
    </div>
    <div class="sn-grind-stat">
      <span class="sn-grind-val">${stats.remaining.toLocaleString()}</span>
      <span class="sn-grind-label">${labels.remaining}</span>
    </div>
    <div class="sn-grind-stat">
      <span class="sn-grind-val">${snFormatElapsed(stats.elapsed)}</span>
      <span class="sn-grind-label">${labels.elapsed}</span>
    </div>
  </div>
  ${snProgressBar(pct, "sn-bar-hero")}
  <div style="text-align:center;margin-top:4px;">
    <span style="font-family:var(--font-mono);font-size:0.72rem;color:var(--text-3);">
      Lvl ${stats.currentLvl} — ${stats.currentXp.toLocaleString()} / ${SN_GRIND_TARGET_XP.toLocaleString()} XP (${pct}%)
    </span>
  </div>`;
}

function snRenderGrindChart(snaps) {
  if (typeof Chart === "undefined" || snaps.length < 1) return "";
  const canvasId = "sn-grind-chart";
  return `<div class="sn-grind-chart-wrap">
    <canvas id="${canvasId}" height="200"></canvas>
  </div>`;
}

function snBuildGrindChart(snaps, stats) {
  if (typeof Chart === "undefined" || typeof makeChart !== "function" || snaps.length < 1) return;
  const canvasId = "sn-grind-chart";
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const t0 = snaps[0].t;
  const dataPoints = snaps.map(s => ({ x: (s.t - t0) / 60000, y: s.xp }));

  const datasets = [
    {
      label: "Agility XP",
      data: dataPoints,
      borderColor: "rgba(212,168,67,1)",
      backgroundColor: "rgba(212,168,67,0.1)",
      borderWidth: 2,
      pointRadius: snaps.length > 50 ? 0 : 3,
      pointBackgroundColor: "rgba(212,168,67,1)",
      fill: true,
      tension: 0.3,
    },
    {
      label: `Target (Lvl ${SN_GRIND_TARGET_LVL})`,
      data: [{ x: 0, y: SN_GRIND_TARGET_XP }, { x: Math.max(dataPoints[dataPoints.length - 1].x, 60), y: SN_GRIND_TARGET_XP }],
      borderColor: "rgba(52,211,153,0.6)",
      borderWidth: 2,
      borderDash: [8, 4],
      pointRadius: 0,
      fill: false,
    },
  ];

  // Projected line if we have a rate
  if (stats && stats.ratePerHr > 0 && !stats.done) {
    const lastPt = dataPoints[dataPoints.length - 1];
    const minsToTarget = ((SN_GRIND_TARGET_XP - lastPt.y) / stats.ratePerHr) * 60;
    datasets.push({
      label: "Projected",
      data: [{ x: lastPt.x, y: lastPt.y }, { x: lastPt.x + minsToTarget, y: SN_GRIND_TARGET_XP }],
      borderColor: "rgba(212,168,67,0.35)",
      borderWidth: 2,
      borderDash: [4, 4],
      pointRadius: 0,
      fill: false,
    });
  }

  makeChart(canvasId, {
    type: "line",
    data: { datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "nearest", intersect: false },
      scales: {
        x: {
          type: "linear",
          title: { display: true, text: "Minutes", color: "#9a9488", font: { size: 10 } },
          ticks: { callback: (v) => Math.round(v) + "m" },
        },
        y: {
          title: { display: true, text: "XP", color: "#9a9488", font: { size: 10 } },
          ticks: { callback: (v) => (v / 1000).toFixed(0) + "k" },
          suggestedMin: snaps[0].xp * 0.98,
          suggestedMax: SN_GRIND_TARGET_XP * 1.02,
        },
      },
      plugins: {
        legend: { display: true, position: "top" },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${Math.round(ctx.parsed.y).toLocaleString()} XP`,
            title: (items) => {
              if (!items.length) return "";
              const mins = Math.round(items[0].parsed.x);
              const h = Math.floor(mins / 60);
              const m = mins % 60;
              return h > 0 ? `+${h}h ${m}m` : `+${m}m`;
            },
          },
        },
      },
    },
  });
}

// ---- Inject grind tracker styles ----
function snInjectGrindStyles() {
  if (document.getElementById("sn-grind-styles")) return;
  const style = document.createElement("style");
  style.id = "sn-grind-styles";
  style.textContent = `
.sn-grind-section {
  margin: var(--sp-5) 0 var(--sp-3);
  padding: var(--sp-4);
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}
.sn-grind-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--sp-3);
}
.sn-grind-title {
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 700;
  color: var(--gold-bright);
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}
.sn-grind-reset {
  font-size: 0.65rem;
  padding: 3px 8px;
  border: 1px solid var(--border);
  border-radius: var(--radius-xs);
  background: var(--bg-raised);
  color: var(--text-3);
  cursor: pointer;
  transition: all 0.2s;
}
.sn-grind-reset:hover { border-color: var(--orange); color: var(--orange); }
.sn-grind-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(90px, 1fr));
  gap: var(--sp-2);
  margin-bottom: var(--sp-3);
}
.sn-grind-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--sp-2);
  background: var(--bg-raised);
  border-radius: var(--radius-xs);
}
.sn-grind-val {
  font-family: var(--font-mono);
  font-size: 0.9rem;
  font-weight: 800;
  color: var(--text);
}
.sn-grind-val.sn-grind-live { color: var(--gold-bright); }
.sn-grind-label {
  font-size: 0.62rem;
  color: var(--text-3);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-top: 2px;
}
.sn-grind-chart-wrap {
  position: relative;
  height: 220px;
  margin-top: var(--sp-3);
}
@media (max-width: 640px) {
  .sn-grind-stats { grid-template-columns: repeat(3, 1fr); }
  .sn-grind-chart-wrap { height: 180px; }
  .sn-grind-val { font-size: 0.78rem; }
}
`;
  document.head.appendChild(style);
}

// ---- Hook into renderSenntisten ----
const _origRenderSenntisten = renderSenntisten;
renderSenntisten = function(players) {
  _origRenderSenntisten(players);
  snInjectGrindStyles();

  const section = document.querySelector('[data-page="senntisten"]');
  if (!section || !players || !players.length) return;

  // Use the currently active player (same logic as main render)
  const activeIdx = parseInt(section.dataset.snActive || "0", 10);
  const player = players[Math.min(activeIdx, players.length - 1)];

  // Record snapshot
  const snaps = snRecordSnapshot(player);
  const stats = snCalcStats(snaps);

  // Build grind tracker HTML
  const lang = typeof currentLang !== "undefined" ? currentLang : "en";
  const title = lang === "pt" ? "Grind de Agility" : "Agility Grind Tracker";
  const resetLabel = lang === "pt" ? "Resetar" : "Reset";

  let grindHtml = `<div class="sn-grind-section">
    <div class="sn-grind-header">
      <div class="sn-grind-title">
        ${skillIconImg(SN_GRIND_SKILL_ID, 22)}
        ${title}
      </div>
      <button class="sn-grind-reset" id="sn-grind-reset">${resetLabel}</button>
    </div>
    ${snRenderGrindStats(stats)}
    ${snRenderGrindChart(snaps)}
  </div>`;

  // Insert after existing content
  const wrapper = document.createElement("div");
  wrapper.innerHTML = grindHtml;
  section.appendChild(wrapper.firstElementChild);

  // Build chart after DOM insertion
  snBuildGrindChart(snaps, stats);

  // Reset button
  const resetBtn = document.getElementById("sn-grind-reset");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      snSaveSnapshots([]);
      renderSenntisten(players);
    });
  }
};
