/* =============================================
   RS3 Leaderboard — session.js
   Today's strategic co-op session briefing.
   Renders a bold, scroll-like campaign dispatch
   with phases, shopping manifest, boss plans,
   and personalized XP/fun projections.
   ============================================= */

// ---- Static session plan for 2026-04-27 ----
// Built from live hiscores + quest status at time of writing.
// Fiorovizk: cb 98, total 1443, xp 15.77M, Soul Split unlocked, Necromancy 72, Prayer 95.
// Decxus: cb 67, total 979, xp 1.98M, Prayer 66, Herblore 64, Necromancy 53, 41 quests done.

const SESSION_PLAN = {
  id: "2026-04-27-rotm-prep",
  date: "2026-04-27",
  heroPhaseKey: "lunar",
  codename: {
    pt: "Sonhos de Lua",
    en: "Moonlit Dreams",
  },
  tagline: {
    pt: "Soul Split conquistado. Agora Fio sonha em Lunar Isle, Decxus rachando o crânio do dragão Elvarg.",
    en: "Soul Split is in the bag. Fio dreams his way to Lunar Isle while Decxus cracks Elvarg's skull.",
  },
  briefing: {
    pt: "Senntisten caiu (Soul Split desbloqueado, Wrath ativada, altar pessoal a 2k Prayer XP/h). O próximo grande arco é o Ritual dos Mahjarrat — mas ele exige Lunar Diplomacy + While Guthix Sleeps antes. Esta sessão prepara essa cadeia: Fiorovizk treina Cooking até 40 (gating de Lunar) e mergulha no Fremennik Trials. Em paralelo, Decxus fecha Dragon Slayer (capa, plate, +9.65k XP em 2 skills) e empilha Necromancy contra carniçais para colar no resto da dupla.",
    en: "Senntisten fell — Soul Split unlocked, Wrath active, personal altar humming at 2k Prayer XP/h. The next big arc is Ritual of the Mahjarrat — but it gates behind Lunar Diplomacy + While Guthix Sleeps. Tonight preps that chain: Fiorovizk pushes Cooking to 40 (Lunar gate) and dives into the Fremennik Trials. Meanwhile Decxus puts down Elvarg for the Dragon Slayer cape (+9.65k XP across 2 skills) and farms Necromancy on ghouls to close the dupla gap.",
  },
  duration: "4h",
  difficulty: 3, // 1-5

  phases: [
    {
      i: 1,
      roman: "I",
      key: "prep",
      time: "15m",
      players: ["both"],
      title: { pt: "Quartel-General", en: "Muster" },
      subtitle: { pt: "Varrock GE, 20h BRT", en: "Varrock GE, 8pm BRT" },
      location: { pt: "Grand Exchange", en: "Grand Exchange" },
      what: {
        pt: "Encontro no pilar oeste do GE. Fio passa no Senntisten Altar para empilhar 50 Prayer XP em 2 min e equipa Soul Split — primeira sessão usando-o em campo. Decxus puxa Anti-dragon shield + Prayer pots para Elvarg.",
        en: "Meet at the west pillar of GE. Fio detours to the Senntisten Altar for a 50k Prayer XP top-up (2 min) and equips Soul Split — first field run with it. Decxus stocks Anti-dragon shield + Prayer pots for Elvarg.",
      },
      steps: [
        {
          pt: "Fio: 5 min de ossos no Altar de Senntisten (~2k Prayer XP/h)",
          en: "Fio: 5 min bone burning at Senntisten Altar (~2k Prayer XP/h)",
        },
        {
          pt: "Comprar loadout da lista de compras abaixo",
          en: "Buy the loadout from the shopping manifest below",
        },
        {
          pt: "Banco: presets \"combate-soulsplit\" e \"quest-lunar\" configurados",
          en: "Bank: set up \"combat-soulsplit\" and \"quest-lunar\" presets",
        },
      ],
      reward: { xp: "+10k Prayer (Fio)", gp: "-1.2M", note: { pt: "Suprimentos + leilão de surplus", en: "Supplies + surplus auction" } },
      xpScore: 1,
      funScore: 2,
      wiki: "https://runescape.wiki/w/Grand_Exchange",
    },
    {
      i: 2,
      roman: "II",
      key: "dragonslayer",
      time: "55m",
      players: ["Decxus"],
      title: { pt: "Sangue de Dragão", en: "Dragonblood" },
      subtitle: {
        pt: "Dragon Slayer — Elvarg cai hoje",
        en: "Dragon Slayer — Elvarg falls tonight",
      },
      location: { pt: "Ilha de Crandor", en: "Isle of Crandor" },
      what: {
        pt: "Decxus já fez Priest in Peril ✓ e Demon Slayer ✓. Pré-requisitos? 32 QP — ele tem 59. Hora da capa: falar com Guild Master, juntar 3 mapas, barco até Crandor. Stats atuais (cb 67, 51 Def, 46 HP, Prayer 66) cobrem com folga. Fio escolta o início e usa Soul Split nas mobs do labirinto.",
        en: "Decxus already cleared Priest in Peril ✓ and Demon Slayer ✓. Gate is 32 QP — he has 59. Time for the cape: talk to the Guild Master, grab the 3 map pieces, sail to Crandor. Stats (cb 67, 51 Def, 46 HP, Prayer 66) cover comfortably. Fio escorts the maze and Soul-Splits through the trash.",
      },
      steps: [
        {
          pt: "Champions' Guild → falar com Guild Master",
          en: "Champions' Guild → talk to the Guild Master",
        },
        {
          pt: "Mapas: Melzar's Maze (Fio tanka) → Thurgo (Asgarnia) → Lozar (Oziach)",
          en: "Map pieces: Melzar's Maze (Fio tanks) → Thurgo (Asgarnia) → Lozar (Oziach)",
        },
        {
          pt: "Port Sarim: anti-dragon shield + barco para Crandor",
          en: "Port Sarim: anti-dragon shield + commission ship to Crandor",
        },
        {
          pt: "Elvarg: Protect from Magic, manter HP > 40, Necromancy ultimate",
          en: "Elvarg: Protect from Magic, HP > 40, Necromancy ultimate",
        },
      ],
      reward: {
        xp: "+18.65k em 2 skills à escolha",
        gp: "~300k loot",
        note: {
          pt: "🗡️ Capa de Caça-Dragões, 2 QP, rune platebody desbloqueado",
          en: "🗡️ Dragon Slayer cape, 2 QP, rune platebody unlocked",
        },
      },
      xpScore: 4,
      funScore: 5,
      wiki: "https://runescape.wiki/w/Dragon_Slayer",
    },
    {
      i: 3,
      roman: "III",
      key: "lunar",
      time: "55m",
      players: ["Fiorovizk"],
      title: { pt: "Tribunal Fremennik", en: "Fremennik Trials" },
      subtitle: {
        pt: "Sete provas — porta de entrada para Lunar Isle",
        en: "Seven trials — gateway to Lunar Isle",
      },
      location: { pt: "Rellekka", en: "Rellekka" },
      what: {
        pt: "Bloqueador de Lunar Diplomacy. Fio cumpre os requisitos (Crafting 65 ✓, Fletching 51 ✓, etc.). As 7 provas variam de tedioso a duro: poesia, prova de força (Strength 64 ajuda), corte de yew tree, navio mecânico, Khazard fight, e o Council Speaker. Cada uma feita marca progresso na cadeia ROTM.",
        en: "Hard gate for Lunar Diplomacy. Fio meets the floor (Crafting 65 ✓, Fletching 51 ✓, etc.). The 7 trials swing from tedious to tough: poetry, strength duel (Strength 64 helps), yew chop, ship-mechanic, Khazard fight, Council Speaker. Each one ticks the ROTM chain forward.",
      },
      steps: [
        {
          pt: "Falar com Brundt no Longhall de Rellekka",
          en: "Talk to Brundt in Rellekka's Longhall",
        },
        {
          pt: "Provas 1-4: Sigli, Manni, Thorvald, Olaf (lógica + skill checks)",
          en: "Trials 1-4: Sigli, Manni, Thorvald, Olaf (logic + skill checks)",
        },
        {
          pt: "Provas 5-7: Asleif, Swensen, Council Speaker (combate + retórica)",
          en: "Trials 5-7: Asleif, Swensen, Council Speaker (combat + rhetoric)",
        },
        {
          pt: "Reward: ouro Helm of Neitiznot disponível, acesso a Fremennik Province",
          en: "Reward: golden Helm of Neitiznot route opens, Fremennik Province access",
        },
      ],
      reward: {
        xp: "+12.65k em 5 skills à escolha",
        gp: "~50k em mat sobrando",
        note: {
          pt: "🗝️ Destrava Lunar Diplomacy → Dream Mentor → ROTM",
          en: "🗝️ Unlocks Lunar Diplomacy → Dream Mentor → ROTM",
        },
      },
      xpScore: 3,
      funScore: 3,
      wiki: "https://runescape.wiki/w/The_Fremennik_Trials",
    },
    {
      i: 4,
      roman: "IV",
      key: "cooking",
      time: "30m",
      players: ["Fiorovizk"],
      title: { pt: "Pirralho da Panela", en: "Sous-Chef Sprint" },
      subtitle: {
        pt: "Cooking 38 → 40 (gate de Lunar)",
        en: "Cooking 38 → 40 (Lunar gate)",
      },
      location: { pt: "Cozinha do Castelo de Lumbridge", en: "Lumbridge Castle kitchen" },
      what: {
        pt: "Lunar Diplomacy exige 40 Cooking — Fio está em 38. ~5k XP separa do desbloqueio. Pizza-loop em Catherby ou trout/salmon assados em Rogue's Den dá 40 em 30 min. Pequeno gargalo, grande retorno: trava a cadeia ROTM inteira.",
        en: "Lunar Diplomacy needs 40 Cooking — Fio is at 38. ~5k XP separates him from the unlock. Pizza-loop in Catherby or trout/salmon at Rogue's Den hits 40 in 30 min. Small bottleneck, huge unlock: gates the entire ROTM chain.",
      },
      steps: [
        {
          pt: "Comprar 200 raw trout + 200 raw salmon no GE",
          en: "Buy 200 raw trout + 200 raw salmon at the GE",
        },
        {
          pt: "Rogue's Den fire (sem queimas) ou Lumbridge stove",
          en: "Rogue's Den fire (no burns) or Lumbridge stove",
        },
        {
          pt: "Confirmar 40 Cooking → falar com Lokar Searunner em Rellekka",
          en: "Confirm 40 Cooking → talk to Lokar Searunner in Rellekka",
        },
      ],
      reward: {
        xp: "+5k Cooking",
        gp: "~80k venda dos cozinhados",
        note: {
          pt: "🗝️ Lunar Diplomacy desbloqueada (próxima sessão)",
          en: "🗝️ Lunar Diplomacy unlocked (next session)",
        },
      },
      xpScore: 1,
      funScore: 2,
      wiki: "https://runescape.wiki/w/Cooking_training",
    },
    {
      i: 5,
      roman: "V",
      key: "dungeoneering",
      time: "55m",
      players: ["both"],
      title: { pt: "Duo em Daemonheim", en: "Daemonheim Duo" },
      subtitle: {
        pt: "Fio DG 48 → 54 · Decxus 47 → 52",
        en: "Fio DG 48 → 54 · Decxus 47 → 52",
      },
      location: { pt: "Daemonheim (Fremennik)", en: "Daemonheim (Fremennik)" },
      what: {
        pt: "Fio em 48 DG, Decxus em 47 — quase pareados. Alvo: Fio passa de 54 para destravar Scroll of Rigour (Ranged DPS perm). Floors 22-28 em complexidade 4-5, party de 2 com Fio tankando boss e Necromancy ultimate. Decxus farma skill XP secundário no caminho.",
        en: "Fio at DG 48, Decxus at 47 — almost matched. Target: push Fio past 54 to unlock Scroll of Rigour (perm Ranged DPS). Floors 22-28 at complexity 4-5, two-man party with Fio boss-tanking + Necromancy ultimate. Decxus farms secondary skill XP en route.",
      },
      steps: [
        {
          pt: "Selecionar Floor 22, Medium dungeon, complexidade 4",
          en: "Select Floor 22, Medium dungeon, complexity 4",
        },
        {
          pt: "Fio: tank + Necromancy ultimate em bosses, Soul Split ligado",
          en: "Fio: tank + Necromancy ultimate on bosses, Soul Split on",
        },
        {
          pt: "Decxus: skill stations + apoio Ranged, cozinhar peixes do floor",
          en: "Decxus: skill stations + Ranged support, cook fish from the floor",
        },
      ],
      reward: {
        xp: "+45k DG (Fio), +35k DG (Dec)",
        gp: "12k tokens",
        note: {
          pt: "🎯 Scroll of Rigour quando Fio bater 54 DG",
          en: "🎯 Scroll of Rigour when Fio hits 54 DG",
        },
      },
      xpScore: 5,
      funScore: 4,
      wiki: "https://runescape.wiki/w/Dungeoneering",
    },
    {
      i: 6,
      roman: "VI",
      key: "barrows",
      time: "30m",
      players: ["both"],
      title: { pt: "Irmãos das Lápides", en: "The Barrows Brothers" },
      subtitle: {
        pt: "Morytania — Rush de 3 runs com Soul Split",
        en: "Morytania — 3-run rush with Soul Split",
      },
      location: { pt: "Barrows, Morytania", en: "Barrows, Morytania" },
      what: {
        pt: "Ambos já têm Priest in Peril ✓. Com Soul Split equipado (Fio) e 43+ Prayer dos dois (Fio 95, Decxus 66), Barrows fica MUITO mais barato em supplies — Soul Split sustenta HP enquanto dano. Matar os 6 irmãos alternadamente. Run 1 = Fio carrega, run 2-3 = Decxus aprende rotação.",
        en: "Both have Priest in Peril ✓. With Soul Split on Fio and 43+ Prayer for both (Fio 95, Dec 66), Barrows costs WAY less in supplies — Soul Split heals on damage. Kill the 6 brothers in rotation. Run 1 = Fio carries, runs 2-3 = Decxus learns the loop.",
      },
      steps: [
        {
          pt: "Teleporte Canifis → fast travel para Barrows",
          en: "Canifis teleport → fast travel to Barrows",
        },
        {
          pt: "Fio: ativar Soul Split, dividir irmãos: Karil+Ahrim",
          en: "Fio: Soul Split on, take Karil+Ahrim",
        },
        {
          pt: "Decxus: Guthan+Torag (estilo melee), Verac/Dharok por último em equipe",
          en: "Decxus: Guthan+Torag (melee), Verac/Dharok last together",
        },
      ],
      reward: {
        xp: "+30k combat XP cada",
        gp: "~120k × 3 runs = 360k",
        note: {
          pt: "🎲 RNG: Barrows armor drop (1/400)",
          en: "🎲 RNG: Barrows armor drop (1/400)",
        },
      },
      xpScore: 3,
      funScore: 5,
      wiki: "https://runescape.wiki/w/Barrows",
    },
    {
      i: 7,
      roman: "VII",
      key: "cooldown",
      time: "15m",
      players: ["both"],
      title: { pt: "Herb Run Noturno", en: "Evening Herb Run" },
      subtitle: { pt: "Plantar, colher, desconectar", en: "Plant, harvest, log off" },
      location: { pt: "Catherby → Ardougne → Canifis", en: "Catherby → Ardougne → Canifis" },
      what: {
        pt: "Rotação de 5 patches. Fio (Farming 32): marrentill/tarromin garantidos, ranarr começa a render. Decxus (Farming ~25): guam/marrentill seguros. Setup que continua rendendo XP passivo nas próximas 24h. Em paralelo, lembrar do Vis Wax e do shop run de runas.",
        en: "5-patch rotation. Fio (Farming 32): marrentill/tarromin solid, ranarr starts paying. Decxus (Farming ~25): guam/marrentill safe. Setup keeps ticking passive XP for the next 24h. While at it, daily reminder for Vis Wax + rune shop run.",
      },
      steps: [
        {
          pt: "Catherby patch → Ardougne patch → Canifis patch",
          en: "Catherby patch → Ardougne patch → Canifis patch",
        },
        {
          pt: "Supercompost em cada, magic secateurs se tiver",
          en: "Supercompost each, magic secateurs if owned",
        },
        {
          pt: "Fase final: plantar oak tree em Falador (cresce 6h)",
          en: "Final step: plant oak tree in Falador (6h grow)",
        },
      ],
      reward: {
        xp: "+4k Farming cada",
        gp: "~80k em herbs maduras",
        note: {
          pt: "Passivo enquanto offline",
          en: "Passive while offline",
        },
      },
      xpScore: 2,
      funScore: 3,
      wiki: "https://runescape.wiki/w/Herb_run",
    },
  ],

  shopping: {
    Fiorovizk: [
      { pt: "Sharks × 600", en: "Sharks × 600", gp: "1.1M", icon: "🐟" },
      { pt: "Super restore (4) × 25", en: "Super restore (4) × 25", gp: "375k", icon: "💊" },
      { pt: "Raw trout/salmon × 400 (Cooking)", en: "Raw trout/salmon × 400 (Cooking)", gp: "120k", icon: "🍳" },
      { pt: "Yew log bow stock × 60", en: "Yew log + bow stock × 60", gp: "65k", icon: "🏹" },
      { pt: "Ring of Wealth (i)", en: "Ring of Wealth (i)", gp: "150k", icon: "💍" },
      { pt: "Stamina potion (4) × 10", en: "Stamina potion (4) × 10", gp: "180k", icon: "⚡" },
    ],
    Decxus: [
      { pt: "Rune armor set (lent by Fio)", en: "Rune armor set (lent by Fio)", gp: "0gp", icon: "⚔️" },
      { pt: "Swordfish × 250", en: "Swordfish × 250", gp: "100k", icon: "🐟" },
      { pt: "Prayer potion (4) × 30", en: "Prayer potion (4) × 30", gp: "270k", icon: "🧪" },
      { pt: "Anti-dragon shield", en: "Anti-dragon shield", gp: "12k", icon: "🛡️" },
      { pt: "Rune scimitar", en: "Rune scimitar", gp: "15k", icon: "🗡️" },
      { pt: "Antifire (4) × 6", en: "Antifire (4) × 6", gp: "20k", icon: "🪄" },
    ],
  },

  rewards: {
    Fiorovizk: {
      xp: [
        { skill: 7, amount: 5500 }, // Cooking (Lunar gate)
        { skill: 24, amount: 45000 }, // Dungeoneering
        { skill: 5, amount: 12000 }, // Prayer (Senntisten altar warmup)
        { skill: 28, amount: 25000 }, // Necromancy (Barrows + DG)
        { skill: 4, amount: 14000 }, // Ranged
        { skill: 19, amount: 4000 }, // Farming
        { skill: 12, amount: 4000 }, // Crafting (Trials)
      ],
      qp: 3,
      unlocks: [
        { pt: "Fremennik Trials concluídas", en: "Fremennik Trials cleared", epic: true },
        { pt: "Cooking 40 — gate Lunar OK", en: "Cooking 40 — Lunar gate OK", epic: false },
        { pt: "Scroll of Rigour (se DG ≥ 54)", en: "Scroll of Rigour (if DG ≥ 54)", epic: false },
      ],
    },
    Decxus: {
      xp: [
        { skill: 24, amount: 35000 }, // Dungeoneering
        { skill: 0, amount: 9000 }, // Attack (Elvarg + Barrows)
        { skill: 2, amount: 9000 }, // Strength
        { skill: 3, amount: 6500 }, // HP
        { skill: 28, amount: 18000 }, // Necromancy
        { skill: 19, amount: 3500 }, // Farming
      ],
      qp: 2,
      unlocks: [
        { pt: "Capa de Caça-Dragões", en: "Dragon Slayer cape", epic: true },
        { pt: "Rune Platebody equipável", en: "Rune Platebody wearable", epic: false },
        { pt: "Crandor + Karamja teleport", en: "Crandor + Karamja teleport", epic: false },
      ],
    },
  },

  hooks: {
    pt: "Próxima sessão: Lunar Diplomacy → Dream Mentor → While Guthix Sleeps (porta final do Ritual dos Mahjarrat). Decxus mira Family Crest + Lost City para destrancar membership de elfos.",
    en: "Next session: Lunar Diplomacy → Dream Mentor → While Guthix Sleeps (the last gate before Ritual of the Mahjarrat). Decxus targets Family Crest + Lost City for the elf membership unlock.",
  },
};

// ---- i18n helper ----
function sT(key) {
  const map = {
    sessionTitle: { pt: "Próxima Sessão", en: "Next Session" },
    sessionDate: { pt: "27 de Abril, 2026", en: "April 27, 2026" },
    briefing: { pt: "Briefing", en: "Briefing" },
    phases: { pt: "Fases", en: "Phases" },
    shopping: { pt: "Manifesto de Compras", en: "Shopping Manifest" },
    rewards: { pt: "Espólio Projetado", en: "Projected Spoils" },
    duration: { pt: "Duração", en: "Duration" },
    difficulty: { pt: "Dificuldade", en: "Difficulty" },
    phase: { pt: "Fase", en: "Phase" },
    location: { pt: "Local", en: "Where" },
    objective: { pt: "Objetivo", en: "Objective" },
    steps: { pt: "Passo a passo", en: "Playbook" },
    estimated: { pt: "Projeção", en: "Projection" },
    xp: { pt: "XP", en: "XP" },
    gp: { pt: "GP", en: "GP" },
    unlocks: { pt: "Desbloqueios", en: "Unlocks" },
    fun: { pt: "Fator Diversão", en: "Fun Factor" },
    xpFactor: { pt: "Fator XP", en: "XP Factor" },
    wiki: { pt: "Wiki", en: "Wiki" },
    both: { pt: "Dupla", en: "Duo" },
    questPoints: { pt: "pontos de missão", en: "quest points" },
    hook: { pt: "Depois disso", en: "Then what" },
    total: { pt: "Total", en: "Total" },
    note: { pt: "Obs.", en: "Note" },
    timeBudget: { pt: "Tempo", en: "Time" },
    ready: { pt: "Pronto", en: "Ready" },
    gate: { pt: "Pré-requisito", en: "Gate" },
    hero: { pt: "A Aposta", en: "The Wager" },
    nextUp: { pt: "A Próxima", en: "Up Next" },
  };
  const entry = map[key];
  if (!entry) return key;
  const lang = typeof currentLang !== "undefined" ? currentLang : "en";
  return entry[lang] || entry.en || key;
}

function sL(obj) {
  if (!obj) return "";
  const lang = typeof currentLang !== "undefined" ? currentLang : "en";
  if (typeof obj === "string") return obj;
  return obj[lang] || obj.en || "";
}

// ---- Find player by name in loaded data ----
function sFindPlayer(players, name) {
  if (!players) return null;
  return players.find((p) => p.name === name) || null;
}

// ---- Player avatar chip ----
function sPlayerChip(name, size) {
  const cls = name === "Fiorovizk" ? "ss-chip-p1" : "ss-chip-p2";
  const s = size || "md";
  return `<span class="ss-chip ${cls} ss-chip-${s}">${name}</span>`;
}

function sPlayersChip(players) {
  if (!players || !players.length) return "";
  if (players.includes("both")) {
    return `<span class="ss-chip ss-chip-both ss-chip-md">${sT("both")}</span>`;
  }
  return players.map((n) => sPlayerChip(n)).join("");
}

// ---- XP / Fun bars ----
function sRatingBar(value, max, cls) {
  const dots = [];
  for (let i = 0; i < max; i++) {
    dots.push(
      `<span class="ss-rating-pip ${i < value ? "ss-rating-pip-on " + cls : ""}"></span>`,
    );
  }
  return `<span class="ss-rating">${dots.join("")}</span>`;
}

// ---- Phase card ----
function sPhaseCard(phase, idx) {
  const steps = phase.steps
    .map(
      (s) =>
        `<li class="ss-step"><span class="ss-step-check">·</span>${typeof esc === "function" ? esc(sL(s)) : sL(s)}</li>`,
    )
    .join("");
  const xpStr = phase.reward.xp || "-";
  const gpStr = phase.reward.gp || "-";
  const playersHTML = sPlayersChip(phase.players);
  const title = typeof esc === "function" ? esc(sL(phase.title)) : sL(phase.title);
  const subtitle = typeof esc === "function" ? esc(sL(phase.subtitle)) : sL(phase.subtitle);

  return `<article class="ss-phase ss-stagger" style="--si:${idx}">
    <div class="ss-phase-rail">
      <span class="ss-phase-num">${phase.roman}</span>
      <span class="ss-phase-line"></span>
    </div>
    <div class="ss-phase-body">
      <header class="ss-phase-head">
        <div class="ss-phase-heading">
          <h3 class="ss-phase-title">${title}</h3>
          <p class="ss-phase-sub">${subtitle}</p>
        </div>
        <div class="ss-phase-meta">
          <span class="ss-chip-time">⏱ ${phase.time}</span>
          ${playersHTML}
        </div>
      </header>

      <p class="ss-phase-what">${typeof esc === "function" ? esc(sL(phase.what)) : sL(phase.what)}</p>

      <ol class="ss-steps">${steps}</ol>

      <div class="ss-phase-foot">
        <div class="ss-reward">
          <span class="ss-reward-line"><span class="ss-reward-k">${sT("xp")}</span><span class="ss-reward-v">${typeof esc === "function" ? esc(xpStr) : xpStr}</span></span>
          <span class="ss-reward-line"><span class="ss-reward-k">${sT("gp")}</span><span class="ss-reward-v">${typeof esc === "function" ? esc(gpStr) : gpStr}</span></span>
          ${phase.reward.note ? `<span class="ss-reward-note">${typeof esc === "function" ? esc(sL(phase.reward.note)) : sL(phase.reward.note)}</span>` : ""}
        </div>
        <div class="ss-scores">
          <div class="ss-score-row"><span class="ss-score-label">${sT("xpFactor")}</span>${sRatingBar(phase.xpScore, 5, "ss-pip-gold")}</div>
          <div class="ss-score-row"><span class="ss-score-label">${sT("fun")}</span>${sRatingBar(phase.funScore, 5, "ss-pip-teal")}</div>
        </div>
        <a class="ss-wiki-link" href="${phase.wiki}" target="_blank" rel="noopener">${sT("wiki")} →</a>
      </div>
    </div>
  </article>`;
}

// ---- Shopping manifest ----
function sShopping() {
  const sec = (name) => {
    const items = SESSION_PLAN.shopping[name] || [];
    const cls = name === "Fiorovizk" ? "ss-shop-p1" : "ss-shop-p2";
    const total = items.reduce((sum, it) => {
      const m = it.gp.match(/([0-9.]+)([Mk])?/);
      if (!m) return sum;
      const v = parseFloat(m[1]);
      const mult = m[2] === "M" ? 1e6 : m[2] === "k" ? 1e3 : 1;
      return sum + v * mult;
    }, 0);
    const totalStr =
      total >= 1e6 ? (total / 1e6).toFixed(1) + "M" : total >= 1e3 ? Math.round(total / 1e3) + "k" : String(total);
    return `<div class="ss-shop-col ${cls}">
      <div class="ss-shop-head">
        <span class="ss-shop-name">${name}</span>
        <span class="ss-shop-total">${totalStr}</span>
      </div>
      <ul class="ss-shop-list">${items
        .map(
          (it) =>
            `<li class="ss-shop-item"><span class="ss-shop-icon">${it.icon}</span><span class="ss-shop-label">${typeof esc === "function" ? esc(sL(it)) : sL(it)}</span><span class="ss-shop-gp">${typeof esc === "function" ? esc(it.gp) : it.gp}</span></li>`,
        )
        .join("")}</ul>
    </div>`;
  };
  return `<div class="ss-shop-grid">${sec("Fiorovizk")}${sec("Decxus")}</div>`;
}

// ---- Rewards projection ----
function sRewardsCard(name, players) {
  const r = SESSION_PLAN.rewards[name];
  if (!r) return "";
  const cls = name === "Fiorovizk" ? "ss-reward-p1" : "ss-reward-p2";
  const player = sFindPlayer(players, name);
  const cur = player ? player.totalXp : null;
  const totalGain = r.xp.reduce((s, e) => s + e.amount, 0);
  const projected = cur ? cur + totalGain : totalGain;

  const skillRows = r.xp
    .map((e) => {
      const skName = typeof tSkill === "function" ? tSkill(e.skill) : e.skill;
      const icon = typeof skillIconImg === "function" ? skillIconImg(e.skill, 18) : "📊";
      return `<div class="ss-reward-skill">
        <span class="ss-reward-skill-icon">${icon}</span>
        <span class="ss-reward-skill-name">${skName}</span>
        <span class="ss-reward-skill-xp">+${typeof fmt === "function" ? fmt(e.amount) : e.amount}</span>
      </div>`;
    })
    .join("");

  const unlockRows = r.unlocks
    .map(
      (u) =>
        `<div class="ss-unlock ${u.epic ? "ss-unlock-epic" : ""}">
          <span class="ss-unlock-dot"></span>
          <span class="ss-unlock-label">${typeof esc === "function" ? esc(sL(u)) : sL(u)}</span>
          ${u.epic ? '<span class="ss-unlock-badge">★</span>' : ""}
        </div>`,
    )
    .join("");

  return `<div class="ss-reward-card ${cls}">
    <header class="ss-reward-head">
      <h4 class="ss-reward-name">${name}</h4>
      <div class="ss-reward-totals">
        <span class="ss-reward-total-item"><span class="ss-reward-total-k">XP</span><span class="ss-reward-total-v">+${typeof fmtShort === "function" ? fmtShort(totalGain) : totalGain}</span></span>
        <span class="ss-reward-total-item"><span class="ss-reward-total-k">QP</span><span class="ss-reward-total-v">+${r.qp}</span></span>
      </div>
    </header>
    <div class="ss-reward-skills">${skillRows}</div>
    <div class="ss-reward-unlocks-head">${sT("unlocks")}</div>
    <div class="ss-reward-unlocks">${unlockRows}</div>
  </div>`;
}

// ---- Hero snapshot ----
function sHero(players) {
  const fio = sFindPlayer(players, "Fiorovizk");
  const dec = sFindPlayer(players, "Decxus");
  const fioCb = fio ? fio.combatLevel : 96;
  const decCb = dec ? dec.combatLevel : 67;
  const fioQ = fio ? `${fio.questsDone}/${fio.totalQuests}` : "54/—";
  const decQ = dec ? `${dec.questsDone}/${dec.totalQuests}` : "40/—";
  const diffDots = Array.from({ length: 5 }, (_, i) => `<span class="ss-diff-pip ${i < SESSION_PLAN.difficulty ? "on" : ""}"></span>`).join("");

  return `<section class="ss-hero ss-stagger" style="--si:0">
    <div class="ss-hero-grain"></div>
    <div class="ss-hero-kicker">
      <span class="ss-kicker-mark">⚜</span>
      <span class="ss-kicker-label">${sT("sessionTitle")}</span>
      <span class="ss-kicker-sep">·</span>
      <span class="ss-kicker-date">${sT("sessionDate")}</span>
    </div>
    <h1 class="ss-hero-codename">${typeof esc === "function" ? esc(sL(SESSION_PLAN.codename)) : sL(SESSION_PLAN.codename)}</h1>
    <p class="ss-hero-tagline">${typeof esc === "function" ? esc(sL(SESSION_PLAN.tagline)) : sL(SESSION_PLAN.tagline)}</p>
    <div class="ss-hero-meta">
      <div class="ss-meta-block">
        <span class="ss-meta-k">${sT("duration")}</span>
        <span class="ss-meta-v">${SESSION_PLAN.duration}</span>
      </div>
      <div class="ss-meta-block">
        <span class="ss-meta-k">${sT("difficulty")}</span>
        <span class="ss-meta-v ss-meta-dots">${diffDots}</span>
      </div>
      <div class="ss-meta-block">
        <span class="ss-meta-k">${sT("phases")}</span>
        <span class="ss-meta-v">${SESSION_PLAN.phases.length}</span>
      </div>
    </div>
    <div class="ss-hero-crew">
      <div class="ss-crew-card ss-crew-p1">
        <span class="ss-crew-rank">I</span>
        <div class="ss-crew-body">
          <div class="ss-crew-name">Fiorovizk</div>
          <div class="ss-crew-stats">CB ${fioCb} · Q ${fioQ}</div>
          <div class="ss-crew-role">${typeof currentLang !== "undefined" && currentLang === "pt" ? "Capitão" : "Captain"}</div>
        </div>
      </div>
      <div class="ss-crew-vs">×</div>
      <div class="ss-crew-card ss-crew-p2">
        <span class="ss-crew-rank">II</span>
        <div class="ss-crew-body">
          <div class="ss-crew-name">Decxus</div>
          <div class="ss-crew-stats">CB ${decCb} · Q ${decQ}</div>
          <div class="ss-crew-role">${typeof currentLang !== "undefined" && currentLang === "pt" ? "Aprendiz" : "Apprentice"}</div>
        </div>
      </div>
    </div>
    <blockquote class="ss-briefing">${typeof esc === "function" ? esc(sL(SESSION_PLAN.briefing)) : sL(SESSION_PLAN.briefing)}</blockquote>
  </section>`;
}

// ---- Dashboard spotlight card ----
function renderSessionSpotlight(players) {
  sInjectStyles();
  sInjectSpotlightStyles();
  const el = document.getElementById("session-spotlight");
  if (!el) return;

  const lang = typeof currentLang !== "undefined" ? currentLang : "en";
  const code = sL(SESSION_PLAN.codename);
  const tag = sL(SESSION_PLAN.tagline);
  const cta = lang === "pt" ? "Ver briefing" : "Open briefing";
  const heroPhase = SESSION_PLAN.phases.find((p) => p.key === SESSION_PLAN.heroPhaseKey) || SESSION_PLAN.phases[0];
  const heroTitle = sL(heroPhase.title);
  const heroHook = lang === "pt" ? "Destaque:" : "Highlight:";
  const kicker = lang === "pt" ? "PRÓXIMA SESSÃO" : "NEXT SESSION";

  el.innerHTML = `
    <button class="ss-spotlight" type="button" aria-label="${cta}">
      <div class="ss-spotlight-grain"></div>
      <div class="ss-spotlight-body">
        <div class="ss-spotlight-kicker">
          <span class="ss-spotlight-mark">⚜</span>
          <span>${kicker}</span>
          <span class="ss-spotlight-sep">·</span>
          <span>${sT("sessionDate")}</span>
          <span class="ss-spotlight-sep">·</span>
          <span>${SESSION_PLAN.duration}</span>
        </div>
        <div class="ss-spotlight-title">${esc(code)}</div>
        <div class="ss-spotlight-tag">${esc(tag)}</div>
        <div class="ss-spotlight-hl"><span class="ss-spotlight-hl-k">${heroHook}</span><span class="ss-spotlight-hl-v">${esc(heroTitle)}</span></div>
      </div>
      <div class="ss-spotlight-cta">
        <span>${cta}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
      </div>
    </button>
  `;

  const btn = el.querySelector(".ss-spotlight");
  if (btn) {
    btn.addEventListener("click", () => {
      if (typeof launchSection === "function") launchSection("session");
    });
  }
}

function sInjectSpotlightStyles() {
  if (document.getElementById("ss-spotlight-styles")) return;
  const s = document.createElement("style");
  s.id = "ss-spotlight-styles";
  s.textContent = `
.ss-spotlight {
  position: relative;
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 18px 22px;
  margin: 0 0 24px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background:
    radial-gradient(ellipse 60% 100% at 100% 50%, rgba(212,168,67,0.16) 0%, transparent 55%),
    radial-gradient(ellipse 50% 120% at 0% 120%, rgba(34,211,187,0.08) 0%, transparent 55%),
    linear-gradient(135deg, #18142a 0%, #0d0b18 100%);
  color: var(--text);
  text-align: left;
  cursor: pointer;
  font-family: inherit;
  overflow: hidden;
  isolation: isolate;
  transition: transform .22s ease, border-color .22s ease, box-shadow .22s ease;
}
.ss-spotlight:hover {
  transform: translateY(-2px);
  border-color: var(--gold-dim);
  box-shadow: 0 12px 40px -16px rgba(212,168,67,0.3);
}
.ss-spotlight:active { transform: translateY(0); }
.ss-spotlight::before {
  content: "";
  position: absolute; top: 0; left: 0; right: 0; height: 2px;
  background: linear-gradient(90deg, transparent 0%, var(--gold) 50%, transparent 100%);
}
.ss-spotlight-grain {
  position: absolute; inset: 0;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='1.1' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.9 0 0 0 0 0.75 0 0 0 0 0.4 0 0 0 0.06 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
  mix-blend-mode: overlay;
  opacity: 0.5;
  pointer-events: none;
  z-index: -1;
}
.ss-spotlight-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.ss-spotlight-kicker {
  display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
  font-family: var(--font-mono);
  font-size: 0.56rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--gold);
  margin-bottom: 4px;
}
.ss-spotlight-mark {
  display: inline-block;
  font-size: 0.85rem;
  line-height: 1;
  color: var(--gold);
  text-shadow: 0 0 12px rgba(212, 168, 67, 0.6);
  transform: translateY(-1px);
}
.ss-spotlight-sep { color: var(--text-3); }
.ss-spotlight-title {
  font-family: var(--font-display);
  font-size: clamp(1.4rem, 4vw, 2rem);
  font-weight: 900;
  line-height: 1.05;
  letter-spacing: 0.01em;
  background: linear-gradient(140deg, #ede7db 0%, #f0c75e 50%, #ede7db 90%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.ss-spotlight-tag {
  font-size: 0.82rem;
  color: var(--text-2);
  font-style: italic;
  max-width: 560px;
}
.ss-spotlight-hl {
  display: inline-flex; align-items: center; gap: 8px;
  margin-top: 6px;
  padding: 4px 10px 4px 8px;
  background: rgba(6,5,10,0.55);
  border: 1px solid var(--border);
  border-radius: 100px;
  font-size: 0.66rem;
  width: fit-content;
}
.ss-spotlight-hl-k {
  font-family: var(--font-mono);
  font-size: 0.52rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--text-3);
}
.ss-spotlight-hl-v {
  color: var(--gold-bright);
  font-weight: 700;
}
.ss-spotlight-cta {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 10px 16px;
  background: var(--gold-bg);
  border: 1px solid var(--gold-dim);
  border-radius: 100px;
  color: var(--gold-bright);
  font-family: var(--font-mono);
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  white-space: nowrap;
  transition: all 0.2s;
}
.ss-spotlight:hover .ss-spotlight-cta {
  background: var(--gold-dim);
  color: #0c0a14;
  border-color: var(--gold-bright);
}

/* Accent dock button for session */
.dock-btn-accent {
  color: var(--gold);
  background: rgba(212,168,67,0.08);
}
.dock-btn-accent:hover { color: var(--gold-bright); }
.dock-btn-accent.active { color: var(--gold-bright); background: rgba(212,168,67,0.14); }

@media (max-width: 640px) {
  .ss-spotlight { grid-template-columns: 1fr; padding: 16px 16px; }
  .ss-spotlight-cta { justify-self: flex-start; padding: 8px 14px; font-size: 0.62rem; }
  .ss-spotlight-title { font-size: 1.35rem; }
  .ss-spotlight-tag { font-size: 0.76rem; }
}
`;
  document.head.appendChild(s);
}

// ---- Main render ----
function renderSession(players) {
  sInjectStyles();
  const el = document.getElementById("session-content");
  if (!el) return;

  const phasesHTML = SESSION_PLAN.phases
    .map((p, i) => sPhaseCard(p, i + 1))
    .join("");

  el.innerHTML = `
    ${sHero(players)}

    <section class="ss-block">
      <div class="ss-block-head">
        <span class="ss-block-num">${SESSION_PLAN.phases.length.toString().padStart(2, "0")}</span>
        <h2 class="ss-block-title">${sT("phases")}</h2>
        <span class="ss-block-rule"></span>
      </div>
      <div class="ss-phases">${phasesHTML}</div>
    </section>

    <section class="ss-block ss-stagger" style="--si:${SESSION_PLAN.phases.length + 1}">
      <div class="ss-block-head">
        <span class="ss-block-num">§</span>
        <h2 class="ss-block-title">${sT("shopping")}</h2>
        <span class="ss-block-rule"></span>
      </div>
      ${sShopping()}
    </section>

    <section class="ss-block ss-stagger" style="--si:${SESSION_PLAN.phases.length + 2}">
      <div class="ss-block-head">
        <span class="ss-block-num">★</span>
        <h2 class="ss-block-title">${sT("rewards")}</h2>
        <span class="ss-block-rule"></span>
      </div>
      <div class="ss-rewards-grid">
        ${sRewardsCard("Fiorovizk", players)}
        ${sRewardsCard("Decxus", players)}
      </div>
    </section>

    <section class="ss-hook ss-stagger" style="--si:${SESSION_PLAN.phases.length + 3}">
      <div class="ss-hook-label">${sT("hook")} →</div>
      <p class="ss-hook-body">${typeof esc === "function" ? esc(sL(SESSION_PLAN.hooks)) : sL(SESSION_PLAN.hooks)}</p>
    </section>
  `;
}

// ---- Styles ----
function sInjectStyles() {
  if (document.getElementById("ss-styles")) return;
  const s = document.createElement("style");
  s.id = "ss-styles";
  s.textContent = `
/* ============================================
   SESSION PAGE — Strategic Campaign Briefing
   Bold editorial type, ruled columns, gold glints
   ============================================ */

@keyframes ssSlideIn {
  from { opacity:0; transform: translateY(18px); }
  to   { opacity:1; transform: none; }
}
.ss-stagger {
  opacity: 0;
  animation: ssSlideIn .55s cubic-bezier(.22,1,.36,1) forwards;
  animation-delay: calc(var(--si, 0) * 70ms);
}
@media (prefers-reduced-motion: reduce) {
  .ss-stagger { animation: none; opacity: 1; }
}

/* Page wrap — no extra padding, inherit .main */

/* ---------- HERO ---------- */
.ss-hero {
  position: relative;
  padding: 40px 28px 32px;
  margin: 0 0 36px;
  border: 1px solid var(--border);
  border-radius: 18px;
  background:
    radial-gradient(ellipse 80% 60% at 80% 10%, rgba(212,168,67,0.14) 0%, transparent 65%),
    radial-gradient(ellipse 60% 50% at 10% 100%, rgba(34,211,187,0.08) 0%, transparent 60%),
    linear-gradient(135deg, #161222 0%, #0c0a14 100%);
  overflow: hidden;
  isolation: isolate;
}
/* Noise/grain texture via SVG */
.ss-hero-grain {
  position: absolute; inset: 0;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='1.1' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.9 0 0 0 0 0.75 0 0 0 0 0.4 0 0 0 0.08 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
  mix-blend-mode: overlay;
  opacity: 0.45;
  pointer-events: none;
  z-index: -1;
}
.ss-hero::before {
  content: "";
  position: absolute; top: 0; left: 0; right: 0; height: 2px;
  background: linear-gradient(90deg, transparent 2%, rgba(212,168,67,0.7) 50%, transparent 98%);
  z-index: 0;
}

.ss-hero-kicker {
  display: flex; align-items: center; gap: 8px;
  font-family: var(--font-mono);
  font-size: 0.62rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--gold);
  margin-bottom: 20px;
}
.ss-kicker-mark {
  display: inline-block;
  font-size: 0.95rem; line-height: 1;
  color: var(--gold);
  text-shadow: 0 0 14px rgba(212, 168, 67, 0.55);
  transform: translateY(-1px);
}
.ss-kicker-sep { color: var(--text-3); }
.ss-kicker-date { color: var(--text-2); letter-spacing: 0.18em; }

.ss-hero-codename {
  font-family: var(--font-display);
  font-size: clamp(2.2rem, 7vw, 3.8rem);
  font-weight: 900;
  line-height: 0.95;
  letter-spacing: 0.01em;
  color: var(--text);
  margin: 0 0 14px;
  text-shadow: 0 2px 24px rgba(0,0,0,0.6);
  background: linear-gradient(140deg, #ede7db 0%, #f0c75e 45%, #ede7db 80%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.ss-hero-tagline {
  font-family: var(--font);
  font-size: 1.05rem;
  font-weight: 400;
  line-height: 1.4;
  color: var(--text-2);
  margin: 0 0 28px;
  max-width: 620px;
  font-style: italic;
}

.ss-hero-meta {
  display: flex; flex-wrap: wrap; gap: 32px;
  margin-bottom: 24px;
  padding: 16px 0;
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
}
.ss-meta-block { display: flex; flex-direction: column; gap: 2px; }
.ss-meta-k {
  font-family: var(--font-mono); font-size: 0.55rem;
  letter-spacing: 0.22em; text-transform: uppercase;
  color: var(--text-3);
}
.ss-meta-v {
  font-family: var(--font-display); font-size: 1.15rem;
  font-weight: 800; color: var(--gold-bright);
}
.ss-meta-dots { display: flex; gap: 4px; align-items: center; height: 22px; }
.ss-diff-pip {
  width: 10px; height: 10px; border-radius: 2px;
  background: rgba(255,255,255,0.06);
  transform: skewX(-15deg);
}
.ss-diff-pip.on {
  background: var(--gold);
  box-shadow: 0 0 6px rgba(212,168,67,0.5);
}

.ss-hero-crew {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}
.ss-crew-card {
  display: flex; align-items: center; gap: 14px;
  padding: 14px 18px;
  background: rgba(6,5,10,0.55);
  border: 1px solid var(--border);
  border-radius: 14px;
  backdrop-filter: blur(8px);
  transition: all 0.3s;
}
.ss-crew-p1 { border-left: 3px solid var(--gold-dim); }
.ss-crew-p2 {
  border-right: 3px solid var(--teal-dim);
  border-left: 1px solid var(--border);
  flex-direction: row-reverse;
  text-align: right;
}
.ss-crew-card:hover { border-color: var(--border-hover); transform: translateY(-2px); }
.ss-crew-rank {
  font-family: var(--font-display);
  font-size: 2rem;
  font-weight: 900;
  line-height: 1;
  opacity: 0.6;
}
.ss-crew-p1 .ss-crew-rank { color: var(--gold-dim); }
.ss-crew-p2 .ss-crew-rank { color: var(--teal-dim); }
.ss-crew-body { display: flex; flex-direction: column; gap: 2px; }
.ss-crew-name {
  font-family: var(--font-display);
  font-size: 1.1rem;
  font-weight: 800;
  letter-spacing: 0.5px;
}
.ss-crew-p1 .ss-crew-name { color: var(--gold-bright); }
.ss-crew-p2 .ss-crew-name { color: var(--teal-bright); }
.ss-crew-stats {
  font-family: var(--font-mono); font-size: 0.62rem;
  color: var(--text-2); letter-spacing: 0.05em;
}
.ss-crew-role {
  font-family: var(--font-mono); font-size: 0.52rem;
  letter-spacing: 0.3em; text-transform: uppercase;
  color: var(--text-3); margin-top: 2px;
}
.ss-crew-vs {
  font-family: var(--font-display);
  font-size: 1.6rem; font-weight: 400;
  color: var(--text-3);
  padding: 0 6px;
}

.ss-briefing {
  font-family: var(--font);
  font-size: 0.82rem;
  line-height: 1.7;
  color: var(--text-2);
  border-left: 2px solid var(--gold-dim);
  padding: 4px 0 4px 18px;
  margin: 0;
  font-style: italic;
  max-width: 700px;
}

/* ---------- BLOCK HEADS ---------- */
.ss-block { margin-bottom: 40px; }
.ss-block-head {
  display: flex; align-items: baseline;
  gap: 14px;
  margin-bottom: 22px;
  padding-bottom: 10px;
}
.ss-block-num {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.2em;
  color: var(--gold);
  min-width: 28px;
}
.ss-block-title {
  font-family: var(--font-display);
  font-size: 1.6rem;
  font-weight: 900;
  color: var(--text);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  line-height: 1;
  margin: 0;
}
.ss-block-title::before { content: none !important; }
.ss-block-rule {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, var(--gold-dim) 0%, transparent 100%);
  margin-left: 8px;
  align-self: center;
  margin-bottom: 4px;
}

/* ---------- PHASES ---------- */
.ss-phases {
  display: flex; flex-direction: column;
  gap: 0;
}
.ss-phase {
  display: grid;
  grid-template-columns: 64px 1fr;
  gap: 0;
  padding: 0 0 28px;
  position: relative;
}
.ss-phase-rail {
  position: relative;
  display: flex; flex-direction: column; align-items: center;
}
.ss-phase-num {
  font-family: var(--font-display);
  font-size: 2rem;
  font-weight: 900;
  line-height: 1;
  color: var(--gold-dim);
  padding: 4px 0;
  position: sticky;
  top: 76px;
  letter-spacing: 0.02em;
  transition: color 0.3s;
}
.ss-phase:hover .ss-phase-num { color: var(--gold-bright); text-shadow: 0 0 18px rgba(240,199,94,0.35); }
.ss-phase-line {
  flex: 1;
  width: 1px;
  background: linear-gradient(180deg, var(--gold-dim) 0%, rgba(212,168,67,0.1) 100%);
  margin-top: 6px;
  min-height: 40px;
}
.ss-phase:last-child .ss-phase-line {
  background: linear-gradient(180deg, var(--gold-dim) 0%, transparent 100%);
}
.ss-phase-body {
  padding: 6px 0 0 16px;
  border-left: 1px solid transparent;
}

.ss-phase-head {
  display: flex; justify-content: space-between; align-items: flex-start;
  gap: 16px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}
.ss-phase-heading { flex: 1; min-width: 220px; }
.ss-phase-title {
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--text);
  letter-spacing: 0.02em;
  margin: 0 0 4px;
  line-height: 1.15;
}
.ss-phase-sub {
  font-family: var(--font-mono);
  font-size: 0.64rem;
  color: var(--gold);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin: 0;
}

.ss-phase-meta {
  display: flex; flex-wrap: wrap; gap: 6px;
  align-items: center;
}
.ss-chip {
  display: inline-flex; align-items: center;
  padding: 3px 10px;
  font-family: var(--font-mono);
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  border-radius: 100px;
  border: 1px solid var(--border);
  background: var(--bg-raised);
}
.ss-chip-p1 {
  color: var(--gold-bright);
  border-color: var(--gold-dim);
  background: rgba(212,168,67,0.1);
}
.ss-chip-p2 {
  color: var(--teal-bright);
  border-color: var(--teal-dim);
  background: rgba(34,211,187,0.1);
}
.ss-chip-both {
  color: var(--text);
  border-color: var(--border-hover);
  background: linear-gradient(90deg, rgba(212,168,67,0.08), rgba(34,211,187,0.08));
}
.ss-chip-time {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 3px 10px;
  font-family: var(--font-mono);
  font-size: 0.6rem;
  font-weight: 700;
  color: var(--text-2);
  background: var(--bg-raised);
  border: 1px solid var(--border);
  border-radius: 100px;
}

.ss-phase-what {
  font-family: var(--font);
  font-size: 0.86rem;
  line-height: 1.65;
  color: var(--text-2);
  margin: 0 0 14px;
  max-width: 640px;
}

.ss-steps {
  list-style: none;
  margin: 0 0 18px;
  padding: 0;
  display: flex; flex-direction: column; gap: 6px;
}
.ss-step {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 7px 12px;
  background: rgba(6,5,10,0.5);
  border-left: 2px solid var(--gold-dim);
  border-radius: 0 4px 4px 0;
  font-size: 0.78rem;
  color: var(--text-2);
  line-height: 1.5;
  transition: all 0.2s;
}
.ss-step:hover {
  border-left-color: var(--gold-bright);
  background: rgba(212,168,67,0.06);
  color: var(--text);
}
.ss-step-check {
  color: var(--gold);
  font-weight: 900;
  font-size: 0.9rem;
  line-height: 1;
  margin-top: 1px;
}

.ss-phase-foot {
  display: grid;
  grid-template-columns: 1.1fr 1fr auto;
  gap: 20px;
  padding: 14px 16px;
  background: rgba(6,5,10,0.55);
  border: 1px solid var(--border);
  border-radius: 8px;
  align-items: center;
}
.ss-reward { display: flex; flex-direction: column; gap: 4px; }
.ss-reward-line { display: flex; gap: 8px; align-items: baseline; font-size: 0.72rem; }
.ss-reward-k {
  font-family: var(--font-mono);
  font-size: 0.55rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--text-3);
  min-width: 24px;
}
.ss-reward-v {
  font-family: var(--font-mono);
  font-weight: 700;
  color: var(--gold-bright);
}
.ss-reward-note {
  font-size: 0.7rem;
  color: var(--text-2);
  font-style: italic;
  margin-top: 2px;
}
.ss-scores { display: flex; flex-direction: column; gap: 5px; }
.ss-score-row { display: flex; align-items: center; gap: 10px; font-size: 0.62rem; }
.ss-score-label {
  font-family: var(--font-mono);
  font-size: 0.5rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--text-3);
  min-width: 74px;
}
.ss-rating { display: inline-flex; gap: 3px; }
.ss-rating-pip {
  width: 16px; height: 4px; border-radius: 2px;
  background: rgba(255,255,255,0.06);
  transition: background 0.3s;
}
.ss-rating-pip-on.ss-pip-gold {
  background: var(--gold);
  box-shadow: 0 0 4px rgba(212,168,67,0.45);
}
.ss-rating-pip-on.ss-pip-teal {
  background: var(--teal);
  box-shadow: 0 0 4px rgba(34,211,187,0.45);
}
.ss-wiki-link {
  font-family: var(--font-mono);
  font-size: 0.58rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--text-3);
  padding: 4px 10px;
  border: 1px solid var(--border);
  border-radius: 100px;
  transition: all 0.2s;
  white-space: nowrap;
}
.ss-wiki-link:hover {
  color: var(--gold-bright);
  border-color: var(--gold-dim);
  background: var(--gold-bg);
}

/* ---------- SHOPPING ---------- */
.ss-shop-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
.ss-shop-col {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 16px 18px;
  position: relative;
  overflow: hidden;
}
.ss-shop-col::before {
  content: ""; position: absolute; top: 0; left: 0; right: 0; height: 2px;
}
.ss-shop-p1::before { background: linear-gradient(90deg, transparent, var(--gold), transparent); }
.ss-shop-p2::before { background: linear-gradient(90deg, transparent, var(--teal), transparent); }

.ss-shop-head {
  display: flex; justify-content: space-between; align-items: baseline;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px dashed var(--border);
}
.ss-shop-name {
  font-family: var(--font-display);
  font-size: 0.95rem;
  font-weight: 800;
  letter-spacing: 0.04em;
}
.ss-shop-p1 .ss-shop-name { color: var(--gold-bright); }
.ss-shop-p2 .ss-shop-name { color: var(--teal-bright); }
.ss-shop-total {
  font-family: var(--font-mono);
  font-size: 0.68rem;
  font-weight: 800;
  color: var(--text-2);
}

.ss-shop-list { list-style: none; padding: 0; margin: 0; }
.ss-shop-item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 10px;
  padding: 6px 0;
  border-bottom: 1px dotted rgba(255,255,255,0.04);
  font-size: 0.74rem;
}
.ss-shop-item:last-child { border-bottom: none; }
.ss-shop-icon { font-size: 0.85rem; line-height: 1; }
.ss-shop-label { color: var(--text-2); }
.ss-shop-gp {
  font-family: var(--font-mono);
  font-size: 0.65rem;
  color: var(--text-3);
  font-weight: 700;
}

/* ---------- REWARDS ---------- */
.ss-rewards-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
.ss-reward-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 18px 20px;
  position: relative;
  overflow: hidden;
}
.ss-reward-p1 {
  background: linear-gradient(135deg, rgba(212,168,67,0.06) 0%, var(--bg-card) 50%);
  border-left: 3px solid var(--gold-dim);
}
.ss-reward-p2 {
  background: linear-gradient(135deg, rgba(34,211,187,0.06) 0%, var(--bg-card) 50%);
  border-right: 3px solid var(--teal-dim);
  border-left: 1px solid var(--border);
}

.ss-reward-head {
  display: flex; justify-content: space-between; align-items: flex-start;
  margin-bottom: 14px; padding-bottom: 10px;
  border-bottom: 1px solid var(--border);
}
.ss-reward-name {
  font-family: var(--font-display);
  font-size: 1.1rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  margin: 0;
}
.ss-reward-p1 .ss-reward-name { color: var(--gold-bright); }
.ss-reward-p2 .ss-reward-name { color: var(--teal-bright); }
.ss-reward-totals {
  display: flex; gap: 14px;
}
.ss-reward-total-item {
  display: flex; flex-direction: column; align-items: flex-end; gap: 1px;
}
.ss-reward-total-k {
  font-family: var(--font-mono); font-size: 0.5rem;
  letter-spacing: 0.2em; text-transform: uppercase;
  color: var(--text-3);
}
.ss-reward-total-v {
  font-family: var(--font-mono);
  font-size: 1rem;
  font-weight: 800;
  color: var(--text);
}

.ss-reward-skills {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 4px 12px;
  margin-bottom: 14px;
}
.ss-reward-skill {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 6px;
  padding: 4px 0;
  font-size: 0.72rem;
}
.ss-reward-skill-icon { line-height: 1; }
.ss-reward-skill-name { color: var(--text-2); }
.ss-reward-skill-xp {
  font-family: var(--font-mono);
  font-weight: 800;
  color: var(--gold-bright);
  font-size: 0.68rem;
}
.ss-reward-p2 .ss-reward-skill-xp { color: var(--teal-bright); }

.ss-reward-unlocks-head {
  font-family: var(--font-mono);
  font-size: 0.55rem;
  letter-spacing: 0.25em;
  text-transform: uppercase;
  color: var(--text-3);
  margin-bottom: 6px;
}
.ss-reward-unlocks { display: flex; flex-direction: column; gap: 4px; }
.ss-unlock {
  display: flex; align-items: center; gap: 8px;
  padding: 5px 10px;
  background: rgba(6,5,10,0.55);
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 0.74rem;
}
.ss-unlock-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--text-3);
}
.ss-unlock-epic {
  border-color: var(--gold-dim);
  background: linear-gradient(90deg, rgba(212,168,67,0.12) 0%, transparent 100%);
  box-shadow: 0 0 18px -6px rgba(240,199,94,0.4);
}
.ss-reward-p2 .ss-unlock-epic {
  border-color: var(--teal-dim);
  background: linear-gradient(90deg, rgba(34,211,187,0.12) 0%, transparent 100%);
  box-shadow: 0 0 18px -6px rgba(94,234,212,0.4);
}
.ss-unlock-epic .ss-unlock-dot { background: var(--gold); box-shadow: 0 0 8px var(--gold); }
.ss-reward-p2 .ss-unlock-epic .ss-unlock-dot { background: var(--teal); box-shadow: 0 0 8px var(--teal); }
.ss-unlock-label { flex: 1; color: var(--text); font-weight: 500; }
.ss-unlock-badge {
  color: var(--gold-bright);
  font-size: 0.85rem;
  line-height: 1;
  margin-left: auto;
  animation: ssGlint 3s ease-in-out infinite;
}
.ss-reward-p2 .ss-unlock-badge { color: var(--teal-bright); }
@keyframes ssGlint {
  0%,100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.15); }
}

/* ---------- HOOK ---------- */
.ss-hook {
  position: relative;
  padding: 24px 28px;
  background:
    radial-gradient(ellipse 60% 80% at 100% 50%, rgba(167,139,250,0.07) 0%, transparent 60%),
    var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 14px;
  margin-bottom: 20px;
}
.ss-hook-label {
  font-family: var(--font-mono);
  font-size: 0.6rem;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: #a78bfa;
  margin-bottom: 8px;
}
.ss-hook-body {
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 500;
  line-height: 1.45;
  color: var(--text);
  margin: 0;
  max-width: 680px;
  font-style: italic;
}

/* ---------- RESPONSIVE ---------- */
@media (max-width: 720px) {
  .ss-hero { padding: 28px 20px 22px; margin-bottom: 28px; }
  .ss-hero-codename { font-size: clamp(1.8rem, 9vw, 2.6rem); }
  .ss-hero-tagline { font-size: 0.92rem; }
  .ss-hero-meta { gap: 20px; }
  .ss-hero-crew { grid-template-columns: 1fr; gap: 8px; }
  .ss-crew-vs { display: none; }
  .ss-crew-p2 { flex-direction: row; text-align: left; border-left: 3px solid var(--teal-dim); border-right: 1px solid var(--border); }

  .ss-block-title { font-size: 1.2rem; }
  .ss-phase { grid-template-columns: 48px 1fr; padding-bottom: 22px; }
  .ss-phase-num { font-size: 1.6rem; }
  .ss-phase-title { font-size: 1.05rem; }
  .ss-phase-body { padding-left: 10px; }
  .ss-phase-foot { grid-template-columns: 1fr; gap: 12px; }
  .ss-wiki-link { justify-self: flex-start; }

  .ss-shop-grid { grid-template-columns: 1fr; }
  .ss-rewards-grid { grid-template-columns: 1fr; }
  .ss-reward-skills { grid-template-columns: 1fr; }
}
@media (max-width: 420px) {
  .ss-hero-codename { font-size: 1.9rem; }
  .ss-hero-meta { gap: 14px; }
  .ss-meta-v { font-size: 0.95rem; }
  .ss-phase-head { gap: 8px; }
}
`;
  document.head.appendChild(s);
}
