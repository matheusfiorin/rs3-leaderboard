/* =============================================
   RS3 Leaderboard — next-steps.js
   Dynamic "Mission Control" panel: derives the
   most actionable next move for each player from
   live skill levels + quest chain progress.
   Renders into #mission-control on dashboard.
   ============================================= */

// ---- Threshold catalogue: skill levels that unlock something memorable.
// Sorted by level ascending; the renderer picks the closest above-current.
// Each entry: { id: skillId, level, unlock_pt, unlock_en, hint_pt, hint_en }
const NS_UNLOCKS = [
  // Fishing — basically anything matters (Fio is at 7)
  { id: 10, level: 20, u_pt: "Pesca de Lobster", u_en: "Lobster fishing", hint_pt: "Catherby", hint_en: "Catherby" },
  { id: 10, level: 35, u_pt: "Pesca de Tuna/Swordfish", u_en: "Tuna/Swordfish", hint_pt: "Karamja docks", hint_en: "Karamja docks" },
  { id: 10, level: 76, u_pt: "Pesca de Tubarão (lucro)", u_en: "Shark fishing (profit)", hint_pt: "Fishing Guild", hint_en: "Fishing Guild" },

  // Cooking — Lunar gate
  { id: 7, level: 40, u_pt: "Lunar Diplomacy desbloqueada", u_en: "Lunar Diplomacy unlock", hint_pt: "Pré-requisito ROTM", hint_en: "ROTM prerequisite" },
  { id: 7, level: 80, u_pt: "Cozinhar Sharks (lucro)", u_en: "Cook sharks (profit)", hint_pt: "AFK money", hint_en: "AFK money" },

  // Necromancy
  { id: 28, level: 80, u_pt: "Conjurar Phantom Guardian", u_en: "Phantom Guardian", hint_pt: "Boss-tier familiar", hint_en: "Boss-tier familiar" },
  { id: 28, level: 92, u_pt: "Boss Rasial", u_en: "Rasial boss fight", hint_pt: "Top-tier Necro drop", hint_en: "Top-tier Necro drop" },
  { id: 28, level: 100, u_pt: "Necromancia maxada", u_en: "Necromancy maxed", hint_pt: "Cape de Necro", hint_en: "Necromancy cape" },

  // Prayer
  { id: 5, level: 99, u_pt: "Prayer 99 — Cape", u_en: "Prayer 99 cape", hint_pt: "Skillcape de oração", hint_en: "Skillcape of Prayer" },

  // Combat skills (Decxus catch-up)
  { id: 0, level: 50, u_pt: "Rune scimitar", u_en: "Rune scimitar", hint_pt: "Melee tier 50", hint_en: "Melee tier 50" },
  { id: 0, level: 70, u_pt: "Dragon weapons", u_en: "Dragon weapons", hint_pt: "Tier 60-70 melee", hint_en: "Tier 60-70 melee" },
  { id: 2, level: 70, u_pt: "Dragon weapons", u_en: "Dragon weapons", hint_pt: "Strength gate", hint_en: "Strength gate" },
  { id: 6, level: 75, u_pt: "Sunshine", u_en: "Sunshine", hint_pt: "The World Wakes reward", hint_en: "The World Wakes reward" },
  { id: 4, level: 75, u_pt: "Death's Swiftness", u_en: "Death's Swiftness", hint_pt: "TWW reward", hint_en: "TWW reward" },
  { id: 1, level: 70, u_pt: "Tetsu/Death Lotus armor (T80)", u_en: "Tetsu/Death Lotus (T80)", hint_pt: "Defence gate", hint_en: "Defence gate" },

  // Slayer
  { id: 18, level: 55, u_pt: "Slayer Tower elites", u_en: "Slayer Tower elites", hint_pt: "Black demons / Aberrants", hint_en: "Black demons / Aberrants" },
  { id: 18, level: 75, u_pt: "Tarefa Abyssal Demons", u_en: "Abyssal Demon task", hint_pt: "Whip drops", hint_en: "Whip drops" },

  // Smithing / Mining
  { id: 14, level: 75, u_pt: "Mineração de Drakolith/Necrite", u_en: "Drakolith/Necrite mining", hint_pt: "Mid-tier ore profit", hint_en: "Mid-tier ore profit" },
  { id: 13, level: 70, u_pt: "Forjar barras de Necronium", u_en: "Smelt Necronium bars", hint_pt: "Smithing GP", hint_en: "Smithing GP" },

  // Runecrafting
  { id: 20, level: 77, u_pt: "Crafting de Nature Runes (Abyss)", u_en: "Nature runes (Abyss)", hint_pt: "Runecraft money", hint_en: "Runecraft money" },

  // Herblore
  { id: 15, level: 82, u_pt: "Aggression potions", u_en: "Aggression potions", hint_pt: "AFK Herblore profit", hint_en: "AFK Herblore profit" },

  // Crafting / Divination / Smithing for Invention
  { id: 12, level: 80, u_pt: "Invenção desbloqueada", u_en: "Invention unlock", hint_pt: "Inv tutorial", hint_en: "Inv tutorial" },
  { id: 25, level: 80, u_pt: "Invenção desbloqueada", u_en: "Invention unlock", hint_pt: "Inv tutorial", hint_en: "Inv tutorial" },
  { id: 13, level: 80, u_pt: "Invenção desbloqueada", u_en: "Invention unlock", hint_pt: "Inv tutorial", hint_en: "Inv tutorial" },

  // Farming
  { id: 19, level: 38, u_pt: "Plantar Limpwurt + Avantoe", u_en: "Plant Limpwurt + Avantoe", hint_pt: "Herb run upgrade", hint_en: "Herb run upgrade" },
  { id: 19, level: 50, u_pt: "Plantar Cadantine", u_en: "Plant Cadantine", hint_pt: "Mid-herbs profit", hint_en: "Mid-herbs profit" },

  // Agility
  { id: 16, level: 70, u_pt: "Wilderness Course (Hati)", u_en: "Wilderness Agility Course", hint_pt: "Best Agility XP/h", hint_en: "Best Agility XP/h" },

  // Hunter
  { id: 21, level: 63, u_pt: "Red Chinchompas", u_en: "Red Chinchompas", hint_pt: "GP + range XP", hint_en: "GP + range XP" },

  // Construction
  { id: 22, level: 50, u_pt: "Player-Owned House altar", u_en: "POH altar", hint_pt: "Solo Prayer alt", hint_en: "Solo Prayer alt" },

  // Summoning
  { id: 23, level: 67, u_pt: "Pack Yak", u_en: "Pack Yak", hint_pt: "Top-tier BoB", hint_en: "Top-tier BoB" },
];

// ---- Major quest chain priorities — the "what should I quest next" rail.
// Ordered by player progress: first incomplete in the list is the recommendation.
// Different rails for Fio (deep into chain) vs Decxus (early game).
const NS_QUEST_RAILS = {
  Fiorovizk: [
    { name: "Lunar Diplomacy", chain: "ROTM", pt: "Próximo da cadeia ROTM", en: "Next in ROTM chain" },
    { name: "Dream Mentor", chain: "ROTM", pt: "Continuação Lunar", en: "Lunar continuation" },
    { name: "Wanted!", chain: "ROTM", pt: "Bridge para WGS", en: "Bridge to WGS" },
    { name: "The Hunt for Surok", chain: "ROTM", pt: "Pré-WGS", en: "Pre-WGS" },
    { name: "While Guthix Sleeps", chain: "ROTM", pt: "Última porta antes do Ritual", en: "Last gate before Ritual" },
    { name: "Ritual of the Mahjarrat", chain: "ROTM", pt: "Capstone do arco", en: "Arc capstone" },
    { name: "The World Wakes", chain: "Sunshine", pt: "Sunshine + Death's Swiftness", en: "Sunshine + Death's Swiftness" },
    { name: "Plague's End", chain: "Prifddinas", pt: "Cidade dos Elfos", en: "Elf city unlock" },
  ],
  Decxus: [
    { name: "Dragon Slayer", chain: "starter", pt: "Capa Caça-Dragões + rune", en: "DS cape + rune access" },
    { name: "Lost City", chain: "elf", pt: "Acesso a Zanaris + dragon dagger", en: "Zanaris + dragon dagger" },
    { name: "The Lost Tribe", chain: "starter", pt: "Acesso a Dorgesh-Kaan", en: "Dorgesh-Kaan access" },
    { name: "Family Crest", chain: "qol", pt: "Family gauntlets (utility)", en: "Family gauntlets (utility)" },
    { name: "Heroes' Quest", chain: "qol", pt: "Heroes' Guild + Dragon battleaxe", en: "Heroes' Guild + Dragon battleaxe" },
    { name: "Recipe for Disaster", chain: "qol", pt: "Diary multi-stage", en: "Multi-stage diary" },
    { name: "Plague City", chain: "elf", pt: "Início da cadeia élfica", en: "Start of elf chain" },
    { name: "Underground Pass", chain: "elf", pt: "Pré-Regicide", en: "Pre-Regicide" },
  ],
};

// ---- Daily / passive recommendations — quick hits that take <5 min.
// Each tied to a feasibility check.
function nsDailyMoves(player) {
  const out = [];
  const lvl = (id) => (player.skills[id] || {}).level || 1;
  const has = (q) => typeof hasQuest === "function" && hasQuest(player, q);

  if (lvl(19) >= 12) {
    out.push({ ic: "🌿", pt: "Herb run (5 patches)", en: "Herb run (5 patches)", min: 12, gp: "150-400k" });
  }
  if (has("Throne of Miscellania")) {
    out.push({ ic: "👑", pt: "Coletar Miscellania", en: "Collect Miscellania", min: 3, gp: "150k" });
  } else if (has("Royal Trouble") || has("The Fremennik Trials")) {
    // Will unlock soon - skip
  }
  if (lvl(14) >= 81) {
    out.push({ ic: "💎", pt: "Red Sandstone diário", en: "Daily Red Sandstone", min: 4, gp: "1.5M" });
  }
  // Senntisten Altar - if Soul Split unlocked (Fio)
  if (has("The Temple at Senntisten")) {
    out.push({ ic: "💀", pt: "Ossos no Altar de Senntisten", en: "Bones at Senntisten Altar", min: 30, gp: "Prayer XP" });
  }
  // Always show shop runs as a daily for everyone
  out.push({ ic: "🪄", pt: "Shop run de runas", en: "Rune shop run", min: 8, gp: "2-3M" });

  return out.slice(0, 3);
}

// ---- Pick the closest skill unlock for a player ----
function nsPickClosestUnlock(player) {
  const candidates = NS_UNLOCKS
    .map(u => {
      const cur = (player.skills[u.id] || {}).level || 1;
      const gap = u.level - cur;
      return { ...u, cur, gap };
    })
    .filter(u => u.gap > 0 && u.gap <= 25)
    .sort((a, b) => a.gap - b.gap);
  return candidates[0] || null;
}

// ---- Pick first incomplete quest from rail ----
function nsPickNextQuest(player) {
  const rail = NS_QUEST_RAILS[player.name] || NS_QUEST_RAILS.Fiorovizk;
  for (const q of rail) {
    if (typeof hasQuest === "function" && !hasQuest(player, q.name)) return q;
  }
  return null;
}

// ---- i18n helper ----
function nsT(key) {
  const lang = typeof currentLang !== "undefined" ? currentLang : "en";
  const map = {
    title:        { pt: "Centro de Comando",            en: "Mission Control" },
    sub:          { pt: "Próximas jogadas, computadas dos seus dados ao vivo", en: "Next moves, computed from your live data" },
    nextUnlock:   { pt: "PRÓXIMO DESBLOQUEIO",           en: "NEXT UNLOCK" },
    nextQuest:    { pt: "PRÓXIMA MISSÃO",                en: "NEXT QUEST" },
    daily:        { pt: "ROTINA DIÁRIA",                 en: "DAILY ROUTINE" },
    levels:       { pt: "níveis",                        en: "levels" },
    xpToGo:       { pt: "XP até",                        en: "XP to" },
    open:         { pt: "Abrir habilidades",             en: "Open skills" },
    openQuests:   { pt: "Abrir missões",                 en: "Open quests" },
    openMoney:    { pt: "Abrir GP",                      en: "Open GP" },
    nothingNear:  { pt: "Nada próximo no radar",         en: "Nothing on the radar" },
    questDone:    { pt: "Trilha completa! 🏆",           en: "Trail cleared! 🏆" },
    minShort:     { pt: "min",                           en: "min" },
    chainBadge:   { pt: "Cadeia",                        en: "Chain" },
    progressTo:   { pt: "Progresso para",                en: "Progress to" },
  };
  const e = map[key];
  return e ? (e[lang] || e.en) : key;
}

// ---- Render one player column ----
function nsPlayerColumn(player, idx) {
  const c = idx === 0 ? "p1" : "p2";
  const lang = typeof currentLang !== "undefined" ? currentLang : "en";
  const unlock = nsPickClosestUnlock(player);
  const quest = nsPickNextQuest(player);
  const dailies = nsDailyMoves(player);

  // Build unlock card
  let unlockHTML = "";
  if (unlock) {
    const skName = typeof tSkill === "function" ? tSkill(unlock.id) : unlock.id;
    const ico = typeof skillIconImg === "function" ? skillIconImg(unlock.id, 22) : "•";
    const targetXp = typeof xpForLevel === "function" ? xpForLevel(unlock.level) : 0;
    const curXp = (player.skills[unlock.id] || {}).xp || 0;
    const xpLeft = Math.max(0, targetXp - curXp);
    const curLvlXp = typeof xpForLevel === "function" ? xpForLevel(unlock.cur) : 0;
    const range = targetXp - curLvlXp;
    const pct = range > 0 ? Math.max(2, Math.min(98, Math.round(((curXp - curLvlXp) / range) * 100))) : 0;
    const unlockLabel = lang === "pt" ? unlock.u_pt : unlock.u_en;
    const hint = lang === "pt" ? unlock.hint_pt : unlock.hint_en;
    const xpShort = typeof fmtShort === "function" ? fmtShort(xpLeft) : xpLeft;

    unlockHTML = `
      <div class="ns-block ns-block-unlock" data-ns-go="skills">
        <div class="ns-block-kicker">${nsT("nextUnlock")}</div>
        <div class="ns-unlock-row">
          <div class="ns-unlock-icon">${ico}</div>
          <div class="ns-unlock-body">
            <div class="ns-unlock-title">${esc(skName)} <span class="ns-unlock-arrow">→</span> <strong>${unlock.level}</strong></div>
            <div class="ns-unlock-sub">${esc(unlockLabel)}</div>
          </div>
          <div class="ns-unlock-gap">
            <div class="ns-gap-num">${unlock.gap}</div>
            <div class="ns-gap-lbl">${nsT("levels")}</div>
          </div>
        </div>
        <div class="ns-progress">
          <div class="ns-progress-fill ns-progress-${c}" style="width:${pct}%"></div>
        </div>
        <div class="ns-progress-meta">
          <span>${xpShort} ${nsT("xpToGo")} ${unlock.level}</span>
          <span class="ns-hint">${esc(hint)}</span>
        </div>
      </div>`;
  } else {
    unlockHTML = `<div class="ns-block ns-block-empty">${nsT("nothingNear")}</div>`;
  }

  // Quest card
  let questHTML = "";
  if (quest) {
    const wikiUrl = `https://runescape.wiki/w/${encodeURIComponent(quest.name.replace(/ /g, "_"))}`;
    const note = lang === "pt" ? quest.pt : quest.en;
    questHTML = `
      <div class="ns-block ns-block-quest" data-ns-go="quests">
        <div class="ns-block-kicker">${nsT("nextQuest")}</div>
        <div class="ns-quest-row">
          <div class="ns-quest-mark">📜</div>
          <div class="ns-quest-body">
            <div class="ns-quest-title">${esc(quest.name)}</div>
            <div class="ns-quest-sub">${esc(note)}</div>
          </div>
          <a class="ns-quest-wiki" href="${wikiUrl}" target="_blank" rel="noopener noreferrer">Wiki ↗</a>
        </div>
        <div class="ns-chain-tag">${nsT("chainBadge")}: ${esc(quest.chain)}</div>
      </div>`;
  } else {
    questHTML = `<div class="ns-block ns-block-quest ns-block-done">${nsT("questDone")}</div>`;
  }

  // Daily card
  const dailyRows = dailies.map(d => {
    const label = lang === "pt" ? d.pt : d.en;
    return `<div class="ns-daily-row">
      <span class="ns-daily-icon">${d.ic}</span>
      <span class="ns-daily-label">${esc(label)}</span>
      <span class="ns-daily-time">${d.min}${nsT("minShort")}</span>
      <span class="ns-daily-gp">${esc(d.gp)}</span>
    </div>`;
  }).join("");
  const dailyHTML = dailies.length
    ? `<div class="ns-block ns-block-daily" data-ns-go="money">
         <div class="ns-block-kicker">${nsT("daily")}</div>
         ${dailyRows}
       </div>` : "";

  return `<div class="ns-col ns-col-${c}">
    <div class="ns-col-header">
      <span class="ns-col-rune">${idx === 0 ? "I" : "II"}</span>
      <div class="ns-col-meta">
        <div class="ns-col-name">${esc(player.name)}</div>
        <div class="ns-col-stats">CB ${player.combatLevel} · ${typeof fmt === "function" ? fmt(player.totalLevel) : player.totalLevel} · ${player.questsDone}/${player.totalQuests}q</div>
      </div>
    </div>
    ${unlockHTML}
    ${questHTML}
    ${dailyHTML}
  </div>`;
}

// ---- Main render ----
function renderMissionControl(players) {
  nsInjectStyles();
  const el = document.getElementById("mission-control");
  if (!el || !players || players.length === 0) return;

  const cols = players.map((p, i) => nsPlayerColumn(p, i)).join("");

  el.innerHTML = `
    <section class="ns-panel ns-stagger" style="--si:0">
      <div class="ns-panel-grain"></div>
      <header class="ns-panel-head">
        <div class="ns-head-mark">⚜</div>
        <div class="ns-head-text">
          <h2 class="ns-head-title">${nsT("title")}</h2>
          <p class="ns-head-sub">${nsT("sub")}</p>
        </div>
      </header>
      <div class="ns-grid">${cols}</div>
    </section>`;

  // Block click handlers (delegate)
  el.querySelectorAll("[data-ns-go]").forEach(b => {
    b.addEventListener("click", (e) => {
      // Don't trigger nav if user clicked the wiki link
      if (e.target.closest(".ns-quest-wiki")) return;
      const tab = b.dataset.nsGo;
      if (typeof launchSection === "function") launchSection(tab);
    });
  });
}

// ---- Inject scoped CSS (idempotent) ----
function nsInjectStyles() {
  if (document.getElementById("ns-styles")) return;
  const s = document.createElement("style");
  s.id = "ns-styles";
  s.textContent = `
.ns-panel {
  position: relative;
  margin: 0 0 22px;
  padding: 22px 22px 18px;
  background:
    radial-gradient(ellipse 50% 80% at 100% 0%, rgba(212,168,67,0.10) 0%, transparent 55%),
    radial-gradient(ellipse 50% 80% at 0% 100%, rgba(34,211,187,0.06) 0%, transparent 55%),
    linear-gradient(160deg, #16121f 0%, #0c0a14 100%);
  border: 1px solid var(--border);
  border-radius: 14px;
  overflow: hidden;
  isolation: isolate;
}
.ns-panel::before {
  content: "";
  position: absolute; inset: 0;
  background: linear-gradient(180deg, rgba(212,168,67,0.18) 0%, transparent 1px),
              linear-gradient(0deg, rgba(34,211,187,0.10) 0%, transparent 1px);
  background-size: 100% 1px, 100% 1px;
  background-repeat: no-repeat;
  background-position: top, bottom;
  pointer-events: none;
}
.ns-panel-grain {
  position: absolute; inset: 0;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='1.4' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.92 0 0 0 0 0.78 0 0 0 0 0.42 0 0 0 0.05 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
  mix-blend-mode: overlay;
  opacity: 0.55;
  pointer-events: none;
  z-index: -1;
}
.ns-panel-head {
  display: flex; align-items: center; gap: 14px;
  padding-bottom: 14px;
  border-bottom: 1px solid rgba(212,168,67,0.10);
  margin-bottom: 18px;
}
.ns-head-mark {
  font-size: 1.6rem; line-height: 1;
  color: var(--gold);
  text-shadow: 0 0 18px rgba(212,168,67,0.55);
}
.ns-head-title {
  font-family: var(--font-display);
  font-size: clamp(1.05rem, 2.4vw, 1.4rem);
  font-weight: 800;
  letter-spacing: 0.04em;
  line-height: 1.1;
  background: linear-gradient(140deg, #ede7db 0%, #f0c75e 60%, #ede7db 95%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.ns-head-sub {
  font-size: 0.66rem;
  color: var(--text-3);
  margin-top: 2px;
  letter-spacing: 0.02em;
}
.ns-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 18px;
}
@media (min-width: 720px) {
  .ns-grid { grid-template-columns: 1fr 1fr; gap: 16px; }
}

.ns-col {
  display: flex; flex-direction: column; gap: 10px;
  padding: 14px 14px 12px;
  background: rgba(6,5,10,0.45);
  border: 1px solid rgba(255,255,255,0.04);
  border-radius: 11px;
  position: relative;
}
.ns-col-p1 { border-top: 2px solid var(--gold-dim); }
.ns-col-p2 { border-top: 2px solid var(--teal-dim); }

.ns-col-header {
  display: flex; align-items: center; gap: 10px;
  padding-bottom: 8px;
  border-bottom: 1px dashed rgba(255,255,255,0.05);
}
.ns-col-rune {
  font-family: var(--font-display);
  font-size: 1.1rem; font-weight: 900;
  width: 28px; height: 28px;
  display: flex; align-items: center; justify-content: center;
  background: var(--bg-raised);
  border-radius: 6px;
  letter-spacing: 0;
}
.ns-col-p1 .ns-col-rune { color: var(--gold-bright); border: 1px solid rgba(212,168,67,0.25); }
.ns-col-p2 .ns-col-rune { color: var(--teal-bright); border: 1px solid rgba(34,211,187,0.25); }
.ns-col-meta { flex: 1; min-width: 0; }
.ns-col-name {
  font-family: var(--font-display);
  font-size: 0.95rem; font-weight: 700;
  letter-spacing: 0.04em;
}
.ns-col-p1 .ns-col-name { color: var(--gold-bright); }
.ns-col-p2 .ns-col-name { color: var(--teal-bright); }
.ns-col-stats {
  font-family: var(--font-mono);
  font-size: 0.6rem;
  color: var(--text-3);
  letter-spacing: 0.04em;
  margin-top: 2px;
}

.ns-block {
  background: rgba(20,17,30,0.6);
  border: 1px solid var(--border);
  border-radius: 9px;
  padding: 11px 12px;
  cursor: pointer;
  transition: border-color 0.18s, transform 0.18s, background 0.18s;
}
.ns-block:hover {
  background: var(--bg-hover);
  border-color: var(--border-hover);
  transform: translateX(2px);
}
.ns-block-empty,
.ns-block-done {
  cursor: default;
  text-align: center;
  font-size: 0.74rem;
  color: var(--text-3);
  padding: 16px 12px;
}
.ns-block-empty:hover, .ns-block-done:hover { transform: none; background: rgba(20,17,30,0.6); border-color: var(--border); }

.ns-block-kicker {
  font-family: var(--font-mono);
  font-size: 0.5rem;
  font-weight: 800;
  letter-spacing: 0.22em;
  color: var(--gold);
  margin-bottom: 8px;
  display: inline-flex; align-items: center; gap: 4px;
}
.ns-block-quest .ns-block-kicker { color: var(--teal); }
.ns-block-daily .ns-block-kicker { color: var(--purple); }

/* ---- Unlock block ---- */
.ns-unlock-row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}
.ns-unlock-icon {
  width: 32px; height: 32px;
  display: flex; align-items: center; justify-content: center;
  background: var(--bg-raised);
  border-radius: 6px;
  flex-shrink: 0;
}
.ns-unlock-body { min-width: 0; }
.ns-unlock-title {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text);
}
.ns-unlock-title strong {
  font-family: var(--font-mono);
  color: var(--gold-bright);
  font-weight: 800;
}
.ns-col-p2 .ns-unlock-title strong { color: var(--teal-bright); }
.ns-unlock-arrow {
  color: var(--text-3);
  font-family: var(--font-mono);
  font-size: 0.7rem;
  margin: 0 2px;
}
.ns-unlock-sub {
  font-size: 0.62rem;
  color: var(--text-2);
  margin-top: 1px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ns-unlock-gap {
  text-align: right;
  flex-shrink: 0;
  background: rgba(240,160,48,0.08);
  border: 1px solid rgba(240,160,48,0.16);
  border-radius: 8px;
  padding: 4px 8px;
  min-width: 50px;
}
.ns-gap-num {
  font-family: var(--font-mono);
  font-size: 0.95rem;
  font-weight: 800;
  line-height: 1;
  color: var(--orange);
}
.ns-gap-lbl {
  font-family: var(--font-mono);
  font-size: 0.5rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-3);
}

.ns-progress {
  height: 4px;
  background: rgba(0,0,0,0.4);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 4px;
}
.ns-progress-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.7s cubic-bezier(0.22,1,0.36,1);
}
.ns-progress-p1 {
  background: linear-gradient(90deg, var(--gold-dim), var(--gold-bright));
  box-shadow: 0 0 8px rgba(212,168,67,0.4);
}
.ns-progress-p2 {
  background: linear-gradient(90deg, var(--teal-dim), var(--teal-bright));
  box-shadow: 0 0 8px rgba(34,211,187,0.35);
}
.ns-progress-meta {
  display: flex; align-items: center; justify-content: space-between;
  font-family: var(--font-mono);
  font-size: 0.55rem;
  color: var(--text-3);
  letter-spacing: 0.04em;
}
.ns-hint {
  color: var(--text-2);
  font-style: italic;
  font-family: var(--font);
  font-size: 0.6rem;
}

/* ---- Quest block ---- */
.ns-quest-row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 10px;
}
.ns-quest-mark {
  font-size: 1.1rem;
  width: 32px; height: 32px;
  display: flex; align-items: center; justify-content: center;
  background: rgba(34,211,187,0.06);
  border-radius: 6px;
  flex-shrink: 0;
}
.ns-quest-body { min-width: 0; }
.ns-quest-title {
  font-family: var(--font-display);
  font-size: 0.84rem;
  font-weight: 700;
  color: var(--text);
  letter-spacing: 0.02em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ns-quest-sub {
  font-size: 0.62rem;
  color: var(--text-2);
  margin-top: 1px;
}
.ns-quest-wiki {
  font-family: var(--font-mono);
  font-size: 0.55rem;
  font-weight: 700;
  color: var(--text-3);
  text-decoration: none;
  padding: 4px 9px;
  border: 1px solid var(--border);
  border-radius: 100px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  flex-shrink: 0;
  transition: all 0.18s;
}
.ns-quest-wiki:hover {
  color: var(--teal-bright);
  border-color: var(--teal-dim);
  background: var(--teal-bg);
}
.ns-chain-tag {
  margin-top: 8px;
  font-family: var(--font-mono);
  font-size: 0.5rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--text-3);
}

/* ---- Daily block ---- */
.ns-block-daily { padding: 11px 12px 8px; }
.ns-daily-row {
  display: grid;
  grid-template-columns: 18px 1fr auto auto;
  align-items: center;
  gap: 8px;
  padding: 5px 0;
  font-size: 0.7rem;
  border-bottom: 1px dashed rgba(255,255,255,0.04);
}
.ns-daily-row:last-child { border-bottom: none; }
.ns-daily-icon { font-size: 0.85rem; line-height: 1; }
.ns-daily-label {
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ns-daily-time {
  font-family: var(--font-mono);
  font-size: 0.55rem;
  color: var(--text-3);
  background: var(--bg-raised);
  padding: 2px 6px;
  border-radius: 100px;
}
.ns-daily-gp {
  font-family: var(--font-mono);
  font-size: 0.6rem;
  font-weight: 700;
  color: var(--green);
  white-space: nowrap;
}

/* ---- Stagger animation ---- */
.ns-stagger {
  opacity: 0;
  animation: nsSlideIn 0.5s cubic-bezier(0.22,1,0.36,1) forwards;
  animation-delay: calc(var(--si, 0) * 80ms);
}
@keyframes nsSlideIn {
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: none; }
}

/* ---- Mobile tightening ---- */
@media (max-width: 480px) {
  .ns-panel { padding: 16px 14px 12px; }
  .ns-head-title { font-size: 1.05rem; }
  .ns-head-sub { font-size: 0.6rem; }
  .ns-col { padding: 12px 11px; }
  .ns-unlock-row { gap: 8px; }
  .ns-unlock-icon, .ns-quest-mark { width: 28px; height: 28px; }
  .ns-unlock-title { font-size: 0.74rem; }
  .ns-quest-title { font-size: 0.78rem; }
  .ns-gap-num { font-size: 0.85rem; }
  .ns-daily-time { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  .ns-stagger { animation: none; opacity: 1; }
  .ns-progress-fill { transition: none; }
}
`;
  document.head.appendChild(s);
}
