/* =============================================
   RS3 Leaderboard — Prifddinas Tracker
   Road to Prifddinas (Plague's End) quest chain tracker
   Auto-checks skills/quests from live data,
   manual checkboxes persisted in localStorage.
   ============================================= */

// ---- Skill requirements (RS3 RuneMetrics API IDs) ----
const PE_SKILLS = [
  { id: 16, abbr: "AGI", required: 75, reason: "Plague's End" },
  { id: 22, abbr: "CON", required: 75, reason: "Plague's End" },
  { id: 12, abbr: "CRA", required: 75, reason: "Plague's End" },
  { id: 24, abbr: "DG",  required: 75, reason: "Plague's End" },
  { id: 15, abbr: "HER", required: 75, reason: "Plague's End" },
  { id: 14, abbr: "MIN", required: 75, reason: "Plague's End" },
  { id: 5,  abbr: "PRA", required: 75, reason: "Plague's End" },
  { id: 23, abbr: "SUM", required: 75, reason: "Plague's End" },
  { id: 4,  abbr: "RNG", required: 75, reason: "Within the Light" },
  { id: 8,  abbr: "WC",  required: 75, reason: "Within the Light" },
  { id: 9,  abbr: "FLE", required: 70, reason: "Within the Light" },
  { id: 17, abbr: "THI", required: 50, reason: "Mourning's End Part I" },
  { id: 7,  abbr: "COK", required: 30, reason: "Big Chompy Bird Hunting" },
];

// ---- Quest chain grouped by phase ----
const PE_PHASES = [
  {
    id: 1,
    label_pt: "Fase 1 — Serie Plague City",
    label_en: "Phase 1 — Plague City Series",
    quests: ["Plague City", "Biohazard"],
  },
  {
    id: 2,
    label_pt: "Fase 2 — Subterraneo",
    label_en: "Phase 2 — Underground",
    quests: ["Underground Pass"],
  },
  {
    id: 3,
    label_pt: "Fase 3 — Reino Elfico",
    label_en: "Phase 3 — Elf Kingdom",
    quests: ["Regicide", "Roving Elves"],
  },
  {
    id: 4,
    label_pt: "Fase 4 — Mourning's End",
    label_en: "Phase 4 — Mourning's End",
    quests: ["Mourning's End Part I", "Mourning's End Part II"],
  },
  {
    id: 5,
    label_pt: "Fase 5 — Puzzles de Luz",
    label_en: "Phase 5 — Light Puzzles",
    quests: ["Within the Light"],
  },
  {
    id: 6,
    label_pt: "Fase 6 — Missoes Secundarias",
    label_en: "Phase 6 — Side Quests",
    quests: [
      "Big Chompy Bird Hunting",
      "Sheep Herder",
      "Catapult Construction",
      "Making History",
    ],
  },
  {
    id: 7,
    label_pt: "Fase 7 — Final",
    label_en: "Phase 7 — Finale",
    quests: ["Plague's End"],
  },
];

// ---- Manual checklist items (not detectable from API) ----
const PE_MANUAL = [
  {
    id: "pe_crystal_seed",
    phase: 7,
    label_pt: "Crystal seed obtida",
    label_en: "Crystal seed obtained",
  },
  {
    id: "pe_mourning_gear",
    phase: 4,
    label_pt: "Mourning gear preparada",
    label_en: "Mourning gear ready",
  },
  {
    id: "pe_agility_shortcuts",
    phase: 3,
    label_pt: "Atalhos de agilidade do Underground Pass",
    label_en: "Underground Pass agility shortcuts",
  },
];

// Wiki link builder for quest names
const PE_WIKI = (quest) =>
  `https://runescape.wiki/w/${quest.replace(/ /g, "_")}`;

// Total items across all trackable categories
const PE_ALL_QUESTS = PE_PHASES.flatMap((p) => p.quests);
const PE_TOTAL_ITEMS =
  PE_SKILLS.length + PE_ALL_QUESTS.length + PE_MANUAL.length;

// localStorage key for manual checkboxes
const PE_STORAGE_KEY = "rs3lb-prifddinas";

// ---- i18n helper (bilingual fallback) ----
function peT(key) {
  const map = {
    peTitle:      { pt: "Rumo a Prifddinas",                en: "Road to Prifddinas" },
    peSubtitle:   { pt: "Plague's End quest chain tracker",  en: "Plague's End quest chain tracker" },
    peSkills:     { pt: "Requisitos de Habilidade",          en: "Skill Requirements" },
    peQuests:     { pt: "Missoes Necessarias",               en: "Required Quests" },
    peManual:     { pt: "Itens Manuais",                     en: "Manual Items" },
    pePhase:      { pt: "Fase",                              en: "Phase" },
    peCurrentLvl: { pt: "Atual",                             en: "Current" },
    peRequired:   { pt: "Necessario",                        en: "Required" },
    peGap:        { pt: "Falta",                             en: "Gap" },
    peComplete:   { pt: "Completo",                          en: "Complete" },
    pePrif:       { pt: "Prifddinas Desbloqueada!",          en: "Prifddinas Unlocked!" },
    peProgress:   { pt: "Progresso Geral",                   en: "Overall Progress" },
    peWikiLink:   { pt: "Wiki",                              en: "Wiki" },
    peSkillMet:   { pt: "Requisito atingido",                en: "Requirement met" },
    peSkillGap:   { pt: "niveis restantes",                  en: "levels remaining" },
    peNoQuests:   { pt: "Nenhuma missao nesta fase",         en: "No quests in this phase" },
    peSkillOnly:  { pt: "Apenas treino de habilidades",      en: "Skill training only" },
    peUnlocked:   { pt: "Desbloqueado",                      en: "Unlocked" },
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
function peLoadManual() {
  try {
    return JSON.parse(localStorage.getItem(PE_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

// ---- Save manual checkbox state ----
function peSaveManual(state) {
  localStorage.setItem(PE_STORAGE_KEY, JSON.stringify(state));
}

// ---- Get player skill level safely ----
function peSkillLevel(player, skillId) {
  return (player.skills[skillId] || {}).level || 1;
}

// ---- Count completed items for a player ----
function peCountDone(player) {
  const manual = peLoadManual();
  let skills = 0, quests = 0, manualDone = 0;

  for (const sk of PE_SKILLS) {
    if (peSkillLevel(player, sk.id) >= sk.required) skills++;
  }
  for (const q of PE_ALL_QUESTS) {
    if (hasQuest(player, q)) quests++;
  }
  for (const m of PE_MANUAL) {
    const key = `${m.id}_${player.name}`;
    if (manual[key]) manualDone++;
  }
  return { skills, quests, manualDone, total: skills + quests + manualDone };
}

// ---- Build progress bar HTML ----
function peProgressBar(pct, cls) {
  const clamped = Math.max(0, Math.min(100, pct));
  const colorCls = clamped >= 100 ? "pe-bar-done" : "";
  return `<div class="pe-bar ${cls || ""}">
    <div class="pe-bar-fill ${colorCls}" style="width:${clamped}%"></div>
  </div>`;
}

// ---- Build skill row HTML for one player ----
function peSkillRow(player, sk) {
  const current = peSkillLevel(player, sk.id);
  const met = current >= sk.required;
  const gap = met ? 0 : sk.required - current;
  const pct = met ? 100 : Math.round((current / sk.required) * 100);
  const icon = met ? "&#x2705;" : "&#x1f534;";

  return `<tr class="pe-skill-row ${met ? "pe-met" : "pe-unmet"}">
    <td class="pe-skill-icon">${icon}</td>
    <td class="pe-skill-name">${tSkill(sk.id)}</td>
    <td class="pe-skill-cur">${current}</td>
    <td class="pe-skill-req">${sk.required}</td>
    <td class="pe-skill-gap">${met ? peT("peComplete") : gap}</td>
    <td class="pe-skill-bar-cell">${peProgressBar(pct)}</td>
    <td class="pe-skill-reason">${esc(sk.reason)}</td>
  </tr>`;
}

// ---- Build quest item HTML ----
function peQuestItem(player, questName) {
  const done = hasQuest(player, questName);
  const icon = done ? "&#x2705;" : "&#x2B1C;";
  const cls = done ? "pe-quest-done" : "pe-quest-todo";
  const wikiUrl = PE_WIKI(questName);
  return `<div class="pe-quest-item ${cls}">
    <span class="pe-quest-icon">${icon}</span>
    <span class="pe-quest-name">${esc(questName)}</span>
    <a class="pe-quest-wiki" href="${esc(wikiUrl)}" target="_blank" rel="noopener">${peT("peWikiLink")}</a>
  </div>`;
}

// ---- Build manual checkbox HTML ----
function peManualItem(player, item, manual) {
  const key = `${item.id}_${player.name}`;
  const checked = manual[key] ? "checked" : "";
  const lang = typeof currentLang !== "undefined" ? currentLang : "en";
  const label = lang === "pt" ? item.label_pt : item.label_en;
  return `<div class="pe-manual-item">
    <input type="checkbox" class="pe-check" data-key="${esc(key)}" ${checked}>
    <span class="pe-manual-label">${esc(label)}</span>
  </div>`;
}

// ---- Build phase accordion section ----
function pePhaseSection(player, phase, manual) {
  const lang = typeof currentLang !== "undefined" ? currentLang : "en";
  const phaseLabel = lang === "pt" ? phase.label_pt : phase.label_en;

  // Count done quests in this phase
  const phaseQuestsDone = phase.quests.filter((q) => hasQuest(player, q)).length;
  // Manual items in this phase
  const phaseManuals = PE_MANUAL.filter((m) => m.phase === phase.id);
  const phaseManualDone = phaseManuals.filter(
    (m) => manual[`${m.id}_${player.name}`]
  ).length;
  // No dedicated skill-only phases in Prifddinas chain; skills shown in phase 7
  const isSkillPhase = false;

  const totalInPhase =
    phase.quests.length + phaseManuals.length + (isSkillPhase ? PE_SKILLS.length : 0);
  const doneInPhase =
    phaseQuestsDone + phaseManualDone +
    (isSkillPhase
      ? PE_SKILLS.filter((sk) => peSkillLevel(player, sk.id) >= sk.required).length
      : 0);
  const phasePct = totalInPhase > 0 ? Math.round((doneInPhase / totalInPhase) * 100) : 100;
  const phaseComplete = phasePct >= 100;

  let body = "";

  // Skill table shown in phase 7 (Finale) since all skills gate Plague's End
  if (phase.id === 7) {
    body += `<div class="pe-skill-section">
      <h4 class="pe-section-label">${peT("peSkills")}</h4>
      <table class="pe-skill-table">
        <thead>
          <tr>
            <th></th>
            <th>${peT("peSkills")}</th>
            <th>${peT("peCurrentLvl")}</th>
            <th>${peT("peRequired")}</th>
            <th>${peT("peGap")}</th>
            <th></th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${PE_SKILLS.map((sk) => peSkillRow(player, sk)).join("")}
        </tbody>
      </table>
    </div>`;
  }

  // Quest list
  if (phase.quests.length > 0) {
    body += `<div class="pe-quest-section">
      <h4 class="pe-section-label">${peT("peQuests")}</h4>
      <div class="pe-quest-list">
        ${phase.quests.map((q) => peQuestItem(player, q)).join("")}
      </div>
    </div>`;
  }

  // Manual items for this phase
  if (phaseManuals.length > 0) {
    body += `<div class="pe-manual-section">
      <h4 class="pe-section-label">${peT("peManual")}</h4>
      ${phaseManuals.map((m) => peManualItem(player, m, manual)).join("")}
    </div>`;
  }

  // Empty phase message
  if (phase.quests.length === 0 && phaseManuals.length === 0 && !isSkillPhase) {
    body += `<p class="pe-empty">${peT("peComplete")}</p>`;
  }

  return `<details class="pe-phase ${phaseComplete ? "pe-phase-done" : ""}" ${phase.id <= 2 ? "open" : ""}>
    <summary class="pe-phase-header">
      <span class="pe-phase-title">${esc(phaseLabel)}</span>
      <span class="pe-phase-badge">${doneInPhase}/${totalInPhase}</span>
      ${peProgressBar(phasePct, "pe-bar-mini")}
    </summary>
    <div class="pe-phase-body">${body}</div>
  </details>`;
}

// ---- Prifddinas celebration banner ----
function peCelebration() {
  return `<div class="pe-celebration">
    <div class="pe-celebration-glow"></div>
    <div class="pe-celebration-text">${peT("pePrif")}</div>
    <div class="pe-celebration-sub">Crystal City</div>
  </div>`;
}

// ---- Inject scoped CSS (idempotent) ----
function peInjectStyles() {
  if (document.getElementById("pe-styles")) return;
  const style = document.createElement("style");
  style.id = "pe-styles";
  style.textContent = `
/* ---- Prifddinas Tracker ---- */
.pe-hero {
  text-align: center;
  padding: var(--sp-6) var(--sp-4);
  margin-bottom: var(--sp-4);
}
.pe-hero-title {
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--gold-bright);
  margin: 0 0 var(--sp-1);
}
.pe-hero-sub {
  font-size: 0.78rem;
  color: var(--text-3);
  margin: 0 0 var(--sp-4);
}
.pe-hero-pct {
  font-family: var(--font-mono);
  font-size: 2rem;
  font-weight: 800;
  color: var(--gold);
}
.pe-hero-pct.pe-done { color: var(--green); }

/* Progress bars */
.pe-bar {
  height: 6px;
  background: var(--bg-raised);
  border-radius: 3px;
  overflow: hidden;
  min-width: 60px;
}
.pe-bar-fill {
  height: 100%;
  background: var(--gold-dim);
  border-radius: 3px;
  transition: width 0.4s ease;
}
.pe-bar-fill.pe-bar-done { background: var(--green); }
.pe-bar-mini { height: 4px; min-width: 40px; flex: 1; margin-left: var(--sp-2); }
.pe-bar-hero { height: 8px; max-width: 320px; margin: var(--sp-3) auto 0; }

/* Player selector */
.pe-player-tabs {
  display: flex;
  justify-content: center;
  gap: var(--sp-3);
  margin-bottom: var(--sp-5);
}
.pe-player-tab {
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
.pe-player-tab:hover { border-color: var(--border-glow); background: var(--bg-hover); }
.pe-player-tab.active { border-color: var(--gold-dim); color: var(--gold); background: var(--gold-bg); }
.pe-player-tab.p2.active { border-color: var(--teal-dim); color: var(--teal); background: var(--teal-bg); }

/* Phase accordion */
.pe-phase {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  margin-bottom: var(--sp-2);
  overflow: hidden;
}
.pe-phase-done { border-color: rgba(52,211,153,0.2); }
.pe-phase-header {
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
.pe-phase-header::-webkit-details-marker { display: none; }
.pe-phase-header::before {
  content: "\\25B6";
  font-size: 0.6rem;
  color: var(--text-3);
  transition: transform 0.2s;
}
details.pe-phase[open] > .pe-phase-header::before { transform: rotate(90deg); }
.pe-phase-title { flex: 0 0 auto; }
.pe-phase-badge {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: var(--text-3);
  background: var(--bg-raised);
  padding: 2px 6px;
  border-radius: var(--radius-xs);
}
.pe-phase-done .pe-phase-badge { color: var(--green); background: var(--green-bg); }
.pe-phase-body { padding: 0 var(--sp-4) var(--sp-4); }

/* Section labels inside phases */
.pe-section-label {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--text-3);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: var(--sp-3) 0 var(--sp-2);
}

/* Skill table */
.pe-skill-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.75rem;
}
.pe-skill-table th {
  text-align: left;
  padding: var(--sp-1) var(--sp-2);
  color: var(--text-3);
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom: 1px solid var(--border);
}
.pe-skill-row td {
  padding: var(--sp-1) var(--sp-2);
  border-bottom: 1px solid var(--border);
}
.pe-skill-row.pe-met { color: var(--green); }
.pe-skill-row.pe-unmet .pe-skill-gap { color: var(--orange); font-weight: 600; }
.pe-skill-cur { font-family: var(--font-mono); font-weight: 700; }
.pe-skill-req { font-family: var(--font-mono); color: var(--text-3); }
.pe-skill-reason { color: var(--text-3); font-size: 0.68rem; }
.pe-skill-bar-cell { min-width: 60px; }

/* Quest list */
.pe-quest-list { display: flex; flex-direction: column; gap: var(--sp-1); }
.pe-quest-item {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-1) 0;
  font-size: 0.78rem;
}
.pe-quest-done .pe-quest-name { color: var(--green); text-decoration: line-through; text-decoration-color: rgba(52,211,153,0.3); }
.pe-quest-todo .pe-quest-name { color: var(--text); }
.pe-quest-wiki {
  font-size: 0.65rem;
  color: var(--text-3);
  text-decoration: none;
  margin-left: auto;
  padding: 1px 6px;
  border: 1px solid var(--border);
  border-radius: var(--radius-xs);
  transition: color 0.2s, border-color 0.2s;
}
.pe-quest-wiki:hover { color: var(--gold); border-color: var(--gold-dim); }

/* Manual items */
.pe-manual-item {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-1) 0;
  font-size: 0.78rem;
}
.pe-check {
  accent-color: var(--gold);
  cursor: pointer;
  width: 16px;
  height: 16px;
}
.pe-manual-label { color: var(--text-2); }
.pe-empty { color: var(--text-3); font-size: 0.75rem; font-style: italic; margin: var(--sp-2) 0; }

/* Prifddinas celebration */
.pe-celebration {
  position: relative;
  text-align: center;
  padding: var(--sp-8) var(--sp-4);
  margin: var(--sp-4) 0;
  border-radius: var(--radius);
  background: var(--bg-card);
  border: 1px solid rgba(212,168,67,0.3);
  overflow: hidden;
}
.pe-celebration-glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at center, rgba(212,168,67,0.15) 0%, transparent 70%);
  animation: pe-pulse 2.5s ease-in-out infinite;
  pointer-events: none;
}
.pe-celebration-text {
  font-family: var(--font-display);
  font-size: 1.6rem;
  font-weight: 800;
  color: var(--gold-bright);
  text-shadow: 0 0 20px rgba(212,168,67,0.5), 0 0 40px rgba(212,168,67,0.2);
  position: relative;
}
.pe-celebration-sub {
  font-size: 0.82rem;
  color: var(--text-3);
  margin-top: var(--sp-2);
  position: relative;
}
@keyframes pe-pulse {
  0%, 100% { opacity: 0.5; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.05); }
}

/* Responsive */
@media (max-width: 640px) {
  .pe-skill-table { font-size: 0.68rem; }
  .pe-skill-reason { display: none; }
  .pe-hero-title { font-size: 1.2rem; }
  .pe-hero-pct { font-size: 1.5rem; }
  .pe-celebration-text { font-size: 1.2rem; }
}
`;
  document.head.appendChild(style);
}

// ---- Ensure the page section exists in the DOM ----
function peEnsureSection() {
  let section = document.querySelector('[data-page="prifddinas"]');
  if (!section) {
    section = document.createElement("section");
    section.className = "page";
    section.dataset.page = "prifddinas";
    section.setAttribute("role", "tabpanel");
    section.id = "pe-page";
    // Insert before the closing </main>
    const main = document.getElementById("main-content");
    if (main) main.appendChild(section);
  }
  return section;
}

// ============================================================
// Main render function — called by _renderers["prifddinas"]
// ============================================================
function renderPrifddinas(players) {
  peInjectStyles();
  const section = peEnsureSection();
  if (!players || players.length === 0) return;

  const manual = peLoadManual();

  // Default to first player
  const activeIdx = parseInt(section.dataset.peActive || "0", 10);
  const player = players[Math.min(activeIdx, players.length - 1)];

  const counts = peCountDone(player);
  const pct = PE_TOTAL_ITEMS > 0
    ? Math.round((counts.total / PE_TOTAL_ITEMS) * 100)
    : 0;
  const allDone = counts.total >= PE_TOTAL_ITEMS;

  // ---- Build HTML ----
  let html = "";

  // Hero section
  html += `<div class="pe-hero">
    <h2 class="pe-hero-title">${peT("peTitle")}</h2>
    <p class="pe-hero-sub">${peT("peSubtitle")}</p>
    <div class="pe-hero-pct ${allDone ? "pe-done" : ""}">${pct}%</div>
    <div class="pe-hero-stat">${counts.total} / ${PE_TOTAL_ITEMS}</div>
    ${peProgressBar(pct, "pe-bar-hero")}
  </div>`;

  // Player selector tabs (if more than one player)
  if (players.length > 1) {
    html += `<div class="pe-player-tabs">`;
    players.forEach((p, i) => {
      const cls = i === activeIdx ? "active" : "";
      const pCls = i === 0 ? "p1" : "p2";
      const pCounts = peCountDone(p);
      const pPct = Math.round((pCounts.total / PE_TOTAL_ITEMS) * 100);
      html += `<button class="pe-player-tab ${pCls} ${cls}" data-pe-player="${i}">
        ${esc(p.name)} (${pPct}%)
      </button>`;
    });
    html += `</div>`;
  }

  // Celebration banner (if all done)
  if (allDone) {
    html += peCelebration();
  }

  // Phase accordions
  for (const phase of PE_PHASES) {
    html += pePhaseSection(player, phase, manual);
  }

  section.innerHTML = html;

  // ---- Event delegation ----
  // Player tab switching
  section.querySelectorAll(".pe-player-tab").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const idx = e.currentTarget.dataset.pePlayer;
      section.dataset.peActive = idx;
      renderPrifddinas(players);
    });
  });

  // Manual checkbox persistence
  section.addEventListener("change", function handler(e) {
    if (!e.target.classList.contains("pe-check")) return;
    const state = peLoadManual();
    if (e.target.checked) {
      state[e.target.dataset.key] = true;
    } else {
      delete state[e.target.dataset.key];
    }
    peSaveManual(state);
    // Re-render to update progress counts
    renderPrifddinas(players);
  }, { once: true });
  // Note: we use { once: true } and re-attach on each render to avoid
  // stacking listeners, since renderPrifddinas replaces innerHTML.
}
