/* =============================================
   RS3 Leaderboard — i18n (Internationalization)
   Official PT-BR names from pt.runescape.wiki
   ============================================= */

const LANG = {
  pt: {
    // Header
    title: "RS3 Placar",
    subtitle: "Jornada cooperativa em tempo real",
    refresh: "Atualizar",
    loading: "Carregando...",
    refreshing: "Atualizando...",
    live: "Ao vivo",
    cached: "Cache",
    offline: "Sem conex\u00e3o",
    agoMin: "min atr\u00e1s",
    updatingLive: "atualizando...",

    // Navigation
    navOverview: "Visão Geral",
    navSkills: "Habilidades",
    navJournal: "Diário",
    navQuests: "Missões",
    navActivity: "Atividade",
    navCombat: "Combate",
    navMoney: "GP",
    navChat: "Chat",
    navMeetup: "Encontros",
    navEaster: "Páscoa",
    noReqs: "Sem requisitos",
    daily: "DIÁRIO",
    soon: "QUASE",
    sessionSummary: "Resumo da Sessão",

    // Lookup
    navLookup: "Consulta",
    lookupPlaceholder: "Digite um nome de jogador...",
    lookupSearch: "Buscar",
    lookupLoading: "Buscando dados...",
    lookupError: "Jogador não encontrado ou perfil privado",
    lookupRecent: "Buscas recentes",
    lookupBack: "Nova busca",

    // Senntisten
    navSenntisten: "Senntisten",
    snTitle: "Rumo ao Soul Split",
    snSubtitle: "Rastreador da cadeia Temple at Senntisten",
    snSkills: "Habilidades Necessárias",
    snQuests: "Missões Necessárias",
    snManual: "Itens Manuais",
    snPhase: "Fase",
    snCurrentLvl: "Atual",
    snRequired: "Necessário",
    snGap: "Falta",
    snComplete: "Completo",
    snSoulSplit: "Soul Split Desbloqueado!",
    snProgress: "Progresso Geral",

    // Quest filters
    qfBothDone: "Ambos",
    qfOneDone: "Um Feito",
    qfDoNext: "Fazer a Seguir",
    qfInProgress: "Em Progresso",

    // Activity filters
    afLevelups: "Subiu Nível",
    afQuests: "Missões",
    afBosses: "Chefes",
    afOther: "Outros",

    // Skill sort
    sortId: "ID",
    sortGap: "Gap",
    sortAlpha: "A-Z",
    sortXp: "XP",

    // Toasts & errors
    toastReached: "alcançou",
    toastQuestsCompleted: "missões completas",
    errOutdated: "Dados podem estar desatualizados — última atualização há {n} minutos",
    errFailed: "Falha ao carregar. Tentando novamente em 30s...",

    // Misc labels (script.js inline ternaries)
    clueScrollsLabel: "Pergaminhos",
    skills50plus: "Hab. 50+",
    verdict: "Veredito",
    maxed: "Máximo",
    levels: "níveis",
    perDay: "~3h/dia",

    // Combat labels (combat.js)
    cbSingleTarget: "Alvo Único",
    cbAoe: "AoE (Área)",
    cbGear: "Equipamento",
    cbWeapon: "Arma",
    cbArmor: "Armadura",
    cbBaseHit: "Dano Base",
    cbArmour: "Armadura",
    cbMaxHp: "Vida Máx",
    cbAvgAbility: "Média Hab.",
    cbEstimate: "Estimativa base — sem orações, poções, perks ou auras",
    cbCursesAvailable: "Maldições disponíveis (Oração {n}) — +10% DPS com Tormento/Angústia/Turbulência",

    // Meetup labels (meetup.js)
    meetupCompleted: "Concluído",
    meetupNoPlanned: "Nenhum encontro planejado.",

    // Money
    moneyTitle: "Formas de Ganhar GP",
    moneyDisclaimer: "Preços do Grand Exchange atualizados a cada 15 min via GitHub Actions. Lucro real pode variar.",

    // Combat
    combatNotice: "Barras baseadas no Combat Style Modernisation (Março 2026). Arraste habilidades no jogo para ajustar.",
    combatWikiLink: "Wiki Revolution Bars",

    // Chat
    chatAssistant: "Assistente RS3",
    chatKeyDesc: "Cole sua API key da Anthropic para conversar. A key não é salva — usada apenas durante esta sessão.",
    chatStart: "Iniciar",
    chatHint: "Usa Claude Haiku 4.5 para respostas rápidas.",
    chatPlaceholder: "Pergunte sobre RS3...",

    // Meetup
    meetupXpPerSkill: "XP Ganho por Habilidade",
    meetupTotalXp: "XP Total Ganho",
    meetupTotalLevels: "Níveis Totais Ganhos",
    meetupResult: "Resultado",
    meetupSessionSummary: "Resumo da Sessão",
    meetupXpGained: "XP Ganho",
    meetupHighlights: "Destaques",
    meetupEmpty: "Nenhum encontro planejado.",
    meetupChartsEmpty: "Gráficos disponíveis após o primeiro encontro registrado.",
    meetupLevelsGained: "Níveis Ganhos",

    // Easter
    easterTitle: "Caça aos Ovos de Gielinor 2026",

    // Quest points
    questPoints: "pontos de missão",
    questsRecommended: "Missões Recomendadas",

    // Gains
    gainsTitle: "Ganhos desde o último snapshot",
    nextStepsTitle: "Próximos Passos",

    // Overview
    h2hTitle: "Comparativo",
    totalLevel: "Nível Total",
    totalXp: "XP Total",
    combatLevel: "Nível de Combate",
    combat: "Combate",
    combatXp: "XP de Combate",
    runeScore: "RuneScore",
    questsDone: "Missões",
    clueScrolls: "Pergaminhos",
    skillsAhead: "Liderando",
    rank: "Posição",
    overallRank: "Posição Global",

    // Skills
    skillsTitle: "Todas as Habilidades",
    all: "Todas",
    catCombat: "Combate",
    catGathering: "Coleta",
    catArtisan: "Produção",
    catSupport: "Suporte",
    xp: "xp",
    ahead: "À frente",

    // Quests
    questsTitle: "Missões",
    complete: "Completas",
    started: "Iniciadas",
    remaining: "Restantes",

    // Activity
    activityTitle: "Atividade Recente",
    noActivity: "Sem atividade recente",

    // Journal
    journalTitle: "Diário de Aventuras",
    goals: "objetivos",
    max: "máx",
    pts: "pts",
    skills: "Habilidades",
    quests: "Missões",

    // Footer
    footerApi: "Dados da API RuneMetrics & Hiscores",
    footerRefresh: "Atualiza a cada 5 min",
    updated: "Atualizado",
    cachedData: "Dados em cache",

    // Skill names (official PT-BR from pt.runescape.wiki)
    skillNames: {
      0: "Ataque",
      1: "Defesa",
      2: "Força",
      3: "Condição Física",
      4: "Combate à Distância",
      5: "Oração",
      6: "Magia",
      7: "Culinária",
      8: "Corte de Lenha",
      9: "Arco e Flecha",
      10: "Pesca",
      11: "Arte do Fogo",
      12: "Artesanato",
      13: "Metalurgia",
      14: "Mineração",
      15: "Herbologia",
      16: "Agilidade",
      17: "Roubo",
      18: "Extermínio",
      19: "Agricultura",
      20: "Criação de Runas",
      21: "Caça",
      22: "Construção",
      23: "Evocação",
      24: "Dungeon",
      25: "Divinação",
      26: "Invenção",
      27: "Arqueologia",
      28: "Necromancia",
    },

    // Journal goal titles and descriptions
    journal: {
      cb30: {
        title: "Aprendiz de Guerreiro",
        desc: "Alcançar Nível de Combate 30",
      },
      cb50: { title: "Guerreiro", desc: "Alcançar Nível de Combate 50" },
      cb75: { title: "Cavaleiro", desc: "Alcançar Nível de Combate 75" },
      cb100: { title: "Campeão", desc: "Alcançar Nível de Combate 100" },
      cb120: {
        title: "Senhor da Guerra",
        desc: "Alcançar Nível de Combate 120",
      },
      cb138: { title: "Combate Máximo", desc: "Alcançar Nível de Combate 138" },
      tl200: { title: "Primeiros Passos", desc: "Alcançar Nível Total 200" },
      tl500: { title: "Versátil", desc: "Alcançar Nível Total 500" },
      tl750: { title: "Habilidoso", desc: "Alcançar Nível Total 750" },
      tl1k: { title: "Experiente", desc: "Alcançar Nível Total 1.000" },
      tl15: { title: "Especialista", desc: "Alcançar Nível Total 1.500" },
      tl2k: { title: "Mestre", desc: "Alcançar Nível Total 2.000" },
      tl25: { title: "Lendário", desc: "Alcançar Nível Total 2.500" },
      first50: { title: "Dedicado", desc: "Qualquer habilidade no Nível 50" },
      first80: { title: "Devoto", desc: "Qualquer habilidade no Nível 80" },
      first99: {
        title: "Mestre de Uma",
        desc: "Qualquer habilidade no Nível 99",
      },
      all30: { title: "Completo", desc: "Todas as habilidades no Nível 30+" },
      all50: {
        title: "Polivalente",
        desc: "Todas as habilidades no Nível 50+",
      },
      xp100k: { title: "Começando", desc: "Ganhar 100.000 XP Total" },
      xp1m: { title: "Esforçado", desc: "Ganhar 1.000.000 XP Total" },
      xp5m: { title: "Dedicado", desc: "Ganhar 5.000.000 XP Total" },
      xp10m: { title: "Veterano", desc: "Ganhar 10.000.000 XP Total" },
      xp50m: { title: "Experiente", desc: "Ganhar 50.000.000 XP Total" },
      xp100m: { title: "Lorde do XP", desc: "Ganhar 100.000.000 XP Total" },
      q1: { title: "Aventureiro", desc: "Completar sua primeira missão" },
      q10: { title: "Buscador", desc: "Completar 10 missões" },
      q25: { title: "Explorador", desc: "Completar 25 missões" },
      q50: { title: "Herói", desc: "Completar 50 missões" },
      q100: { title: "Lenda", desc: "Completar 100 missões" },
      q200: { title: "Mestre do Saber", desc: "Completar 200 missões" },
      qds: { title: "Caça-Dragões", desc: "Completar Caça-Dragões" },
      qnec: { title: "Necromante", desc: "Completar Necromancia!" },
      qww: { title: "Invocador", desc: "Completar Assobio do Lobo" },
      qhg: { title: "Guerreiro Sagrado", desc: "Completar Santo Graal" },
      qrm: { title: "Criador de Runas", desc: "Completar Mistérios Rúnicos" },
      all70: { title: "Versado", desc: "Todas as habilidades no Nível 70+" },
      first120: {
        title: "Além do Limite",
        desc: "Qualquer habilidade no Nível 120",
      },
      qcape: { title: "Capa de Missões", desc: "Completar todas as missões" },
      rs1k: { title: "Reconhecido", desc: "Alcançar 1.000 RuneScore" },
      rs5k: { title: "Ilustre", desc: "Alcançar 5.000 RuneScore" },
      xp250m: { title: "Mestre do Grind", desc: "Ganhar 250.000.000 XP Total" },
      xp500m: { title: "Semi-Deus", desc: "Ganhar 500.000.000 XP Total" },
      qpe: { title: "Élfico", desc: "Completar Fim da Praga" },
      qwgs: {
        title: "Guardião de Guthix",
        desc: "Completar Enquanto Guthix Dorme",
      },
      qww2: { title: "Despertar", desc: "Completar O Despertar do Mundo" },
    },

    // Journal categories
    journalCats: {
      combat: "Combate",
      skills: "Habilidades",
      xp: "XP",
      quests: "Missões",
    },
  },

  en: {
    title: "RS3 Leaderboard",
    subtitle: "Co-op adventure tracker",
    refresh: "Refresh",
    loading: "Loading...",
    refreshing: "Refreshing...",
    live: "Live",
    cached: "Cached",
    offline: "Offline",
    agoMin: "m ago",
    updatingLive: "updating...",

    navOverview: "Overview",
    navSkills: "Skills",
    navJournal: "Journal",
    navQuests: "Quests",
    navActivity: "Activity",
    navCombat: "Combat",
    navMoney: "GP",
    navChat: "Chat",
    navMeetup: "Meetups",
    navEaster: "Easter",
    noReqs: "No requirements",
    daily: "DAILY",
    soon: "SOON",
    sessionSummary: "Session Summary",

    // Lookup
    navLookup: "Lookup",
    lookupPlaceholder: "Enter a player name...",
    lookupSearch: "Search",
    lookupLoading: "Fetching data...",
    lookupError: "Player not found or profile is private",
    lookupRecent: "Recent searches",
    lookupBack: "New search",

    // Senntisten
    navSenntisten: "Senntisten",
    snTitle: "Road to Soul Split",
    snSubtitle: "Temple at Senntisten quest chain tracker",
    snSkills: "Skill Requirements",
    snQuests: "Quest Requirements",
    snManual: "Manual Items",
    snPhase: "Phase",
    snCurrentLvl: "Current",
    snRequired: "Required",
    snGap: "Gap",
    snComplete: "Complete",
    snSoulSplit: "Soul Split Unlocked!",
    snProgress: "Overall Progress",

    // Quest filters
    qfBothDone: "Both Done",
    qfOneDone: "One Done",
    qfDoNext: "Do Next",
    qfInProgress: "In Progress",

    // Activity filters
    afLevelups: "Level-ups",
    afQuests: "Quests",
    afBosses: "Bosses",
    afOther: "Other",

    // Skill sort
    sortId: "ID",
    sortGap: "Gap",
    sortAlpha: "A-Z",
    sortXp: "XP",

    // Toasts & errors
    toastReached: "reached",
    toastQuestsCompleted: "quests completed",
    errOutdated: "Data may be outdated — last updated {n} minutes ago",
    errFailed: "Failed to load. Retrying in 30s...",

    // Misc labels
    clueScrollsLabel: "Clue Scrolls",
    skills50plus: "Skills 50+",
    verdict: "Verdict",
    maxed: "Maxed",
    levels: "levels",
    perDay: "~3h/day",

    // Combat labels
    cbSingleTarget: "Single Target",
    cbAoe: "AoE",
    cbGear: "Gear",
    cbWeapon: "Weapon",
    cbArmor: "Armor",
    cbBaseHit: "Base Hit",
    cbArmour: "Armour",
    cbMaxHp: "Max HP",
    cbAvgAbility: "Avg Ability",
    cbEstimate: "Baseline estimate — no prayers, potions, perks, or auras",
    cbCursesAvailable: "Curses available (Prayer {n}) — +10% DPS with Turmoil/Anguish/Torment",

    // Meetup labels
    meetupCompleted: "Completed",
    meetupNoPlanned: "No meetups planned.",

    // Money
    moneyTitle: "Money Making",
    moneyDisclaimer: "Grand Exchange prices updated every 15 min via GitHub Actions. Actual profit may vary.",

    // Combat
    combatNotice: "Bars based on Combat Style Modernisation (March 2026). Drag abilities in-game to adjust.",
    combatWikiLink: "Wiki Revolution Bars",

    // Chat
    chatAssistant: "RS3 Assistant",
    chatKeyDesc: "Paste your Anthropic API key to chat. The key is not saved — used only during this session.",
    chatStart: "Start",
    chatHint: "Uses Claude Haiku 4.5 for quick responses.",
    chatPlaceholder: "Ask about RS3...",

    // Meetup
    meetupXpPerSkill: "XP Gained per Skill",
    meetupTotalXp: "Total XP Gained",
    meetupTotalLevels: "Total Levels Gained",
    meetupResult: "Result",
    meetupSessionSummary: "Session Summary",
    meetupXpGained: "XP Gained",
    meetupHighlights: "Highlights",
    meetupEmpty: "No meetups planned.",
    meetupChartsEmpty: "Charts available after the first recorded meetup.",
    meetupLevelsGained: "Levels Gained",

    // Easter
    easterTitle: "Gielinor Egg Hunt 2026",

    // Quest points
    questPoints: "quest points",
    questsRecommended: "Recommended Quests",

    // Gains
    gainsTitle: "Gains since last snapshot",
    nextStepsTitle: "Next Steps",

    h2hTitle: "Side by Side",
    totalLevel: "Total Level",
    totalXp: "Total XP",
    combatLevel: "Combat Level",
    combat: "Combat",
    combatXp: "Combat XP",
    runeScore: "RuneScore",
    questsDone: "Quests",
    clueScrolls: "Clue Scrolls",
    skillsAhead: "Leading",
    rank: "Rank",
    overallRank: "Overall Rank",

    skillsTitle: "All Skills",
    all: "All",
    catCombat: "Combat",
    catGathering: "Gathering",
    catArtisan: "Artisan",
    catSupport: "Support",
    xp: "xp",
    ahead: "Ahead",

    questsTitle: "Quests",
    complete: "Complete",
    started: "Started",
    remaining: "Remaining",

    activityTitle: "Recent Activity",
    noActivity: "No recent activity",

    journalTitle: "Adventure Journal",
    goals: "goals",
    max: "max",
    pts: "pts",
    skills: "Skills",
    quests: "Quests",

    footerApi: "Data from RuneMetrics & Hiscores API",
    footerRefresh: "Auto-refreshes every 5 min",
    updated: "Updated",
    cachedData: "Cached data",

    skillNames: {
      0: "Attack",
      1: "Defence",
      2: "Strength",
      3: "Constitution",
      4: "Ranged",
      5: "Prayer",
      6: "Magic",
      7: "Cooking",
      8: "Woodcutting",
      9: "Fletching",
      10: "Fishing",
      11: "Firemaking",
      12: "Crafting",
      13: "Smithing",
      14: "Mining",
      15: "Herblore",
      16: "Agility",
      17: "Thieving",
      18: "Slayer",
      19: "Farming",
      20: "Runecrafting",
      21: "Hunter",
      22: "Construction",
      23: "Summoning",
      24: "Dungeoneering",
      25: "Divination",
      26: "Invention",
      27: "Archaeology",
      28: "Necromancy",
    },

    journal: {
      cb30: { title: "Apprentice Fighter", desc: "Reach Combat Level 30" },
      cb50: { title: "Warrior", desc: "Reach Combat Level 50" },
      cb75: { title: "Knight", desc: "Reach Combat Level 75" },
      cb100: { title: "Champion", desc: "Reach Combat Level 100" },
      cb120: { title: "Warlord", desc: "Reach Combat Level 120" },
      cb138: { title: "Max Combat", desc: "Reach Combat Level 138" },
      tl200: { title: "First Steps", desc: "Reach Total Level 200" },
      tl500: { title: "Jack of Trades", desc: "Reach Total Level 500" },
      tl750: { title: "Skilled", desc: "Reach Total Level 750" },
      tl1k: { title: "Versatile", desc: "Reach Total Level 1,000" },
      tl15: { title: "Expert", desc: "Reach Total Level 1,500" },
      tl2k: { title: "Master", desc: "Reach Total Level 2,000" },
      tl25: { title: "Legendary", desc: "Reach Total Level 2,500" },
      first50: { title: "Specialist", desc: "Get any skill to Level 50" },
      first80: { title: "Devoted", desc: "Get any skill to Level 80" },
      first99: { title: "Master of One", desc: "Get any skill to Level 99" },
      all30: { title: "Well-Rounded", desc: "All skills at least Level 30" },
      all50: { title: "All-Rounder", desc: "All skills at least Level 50" },
      xp100k: { title: "Getting Started", desc: "Earn 100,000 Total XP" },
      xp1m: { title: "Grinder", desc: "Earn 1,000,000 Total XP" },
      xp5m: { title: "Dedicated", desc: "Earn 5,000,000 Total XP" },
      xp10m: { title: "Veteran", desc: "Earn 10,000,000 Total XP" },
      xp50m: { title: "Seasoned", desc: "Earn 50,000,000 Total XP" },
      xp100m: { title: "XP Lord", desc: "Earn 100,000,000 Total XP" },
      q1: { title: "Adventurer", desc: "Complete your first quest" },
      q10: { title: "Seeker", desc: "Complete 10 quests" },
      q25: { title: "Explorer", desc: "Complete 25 quests" },
      q50: { title: "Hero", desc: "Complete 50 quests" },
      q100: { title: "Legend", desc: "Complete 100 quests" },
      q200: { title: "Loremaster", desc: "Complete 200 quests" },
      qds: { title: "Dragon Slayer", desc: "Complete Dragon Slayer" },
      qnec: { title: "Necromancer", desc: "Complete Necromancy!" },
      qww: { title: "Spirit Caller", desc: "Complete Wolf Whistle" },
      qhg: { title: "Holy Warrior", desc: "Complete Holy Grail" },
      qrm: { title: "Rune Crafter", desc: "Complete Rune Mysteries" },
      all70: { title: "Proficient", desc: "All skills at least Level 70" },
      first120: {
        title: "Beyond the Limit",
        desc: "Get any skill to Level 120",
      },
      qcape: { title: "Quest Cape", desc: "Complete all quests" },
      rs1k: { title: "Recognized", desc: "Reach 1,000 RuneScore" },
      rs5k: { title: "Illustrious", desc: "Reach 5,000 RuneScore" },
      xp250m: { title: "Grind Master", desc: "Earn 250,000,000 Total XP" },
      xp500m: { title: "Demigod", desc: "Earn 500,000,000 Total XP" },
      qpe: { title: "Elf Friend", desc: "Complete Plague's End" },
      qwgs: {
        title: "Guthix's Guardian",
        desc: "Complete While Guthix Sleeps",
      },
      qww2: { title: "Awakened", desc: "Complete The World Wakes" },
    },

    journalCats: {
      combat: "Combat",
      skills: "Skills",
      xp: "XP",
      quests: "Quests",
    },
  },
};

// Current language
let currentLang = localStorage.getItem("rs3lb-lang") || "pt";

function t(key) {
  return LANG[currentLang][key] || LANG.en[key] || key;
}

function tSkill(id) {
  return LANG[currentLang].skillNames[id] || LANG.en.skillNames[id] || "?";
}

function tJournal(goalId) {
  return (
    (LANG[currentLang].journal || {})[goalId] ||
    (LANG.en.journal || {})[goalId] || { title: goalId, desc: "" }
  );
}

function tJournalCat(cat) {
  return (LANG[currentLang].journalCats || {})[cat] || cat;
}

function setLang(lang) {
  currentLang = lang;
  localStorage.setItem("rs3lb-lang", lang);
}
