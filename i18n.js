/* =============================================
   RS3 Leaderboard — i18n (Internationalization)
   Official PT-BR names from pt.runescape.wiki
   ============================================= */

const LANG = {
  pt: {
    // Header
    title: 'RS3 Placar',
    subtitle: 'Jornada cooperativa em tempo real',
    refresh: 'Atualizar',
    loading: 'Carregando...',
    refreshing: 'Atualizando...',
    live: 'Ao vivo',
    cached: 'Cache',
    offline: 'Sem conex\u00e3o',
    agoMin: 'min atr\u00e1s',
    updatingLive: 'atualizando...',

    // Navigation
    navOverview: 'Visão Geral',
    navSkills: 'Habilidades',
    navJournal: 'Diário',
    navQuests: 'Missões',
    navActivity: 'Atividade',

    // Overview
    h2hTitle: 'Comparativo',
    totalLevel: 'Nível Total',
    totalXp: 'XP Total',
    combatLevel: 'Nível de Combate',
    combat: 'Combate',
    combatXp: 'XP de Combate',
    runeScore: 'RuneScore',
    questsDone: 'Missões',
    clueScrolls: 'Pergaminhos',
    skillsAhead: 'Liderando',
    rank: 'Posição',
    overallRank: 'Posição Global',

    // Skills
    skillsTitle: 'Todas as Habilidades',
    all: 'Todas',
    catCombat: 'Combate',
    catGathering: 'Coleta',
    catArtisan: 'Produção',
    catSupport: 'Suporte',
    xp: 'xp',
    ahead: 'À frente',

    // Quests
    questsTitle: 'Missões',
    complete: 'Completas',
    started: 'Iniciadas',
    remaining: 'Restantes',

    // Activity
    activityTitle: 'Atividade Recente',
    noActivity: 'Sem atividade recente',

    // Journal
    journalTitle: 'Diário de Aventuras',
    goals: 'objetivos',
    max: 'máx',
    pts: 'pts',
    skills: 'Habilidades',
    quests: 'Missões',

    // Footer
    footerApi: 'Dados da API RuneMetrics & Hiscores',
    footerRefresh: 'Atualiza a cada 5 min',
    updated: 'Atualizado',
    cachedData: 'Dados em cache',

    // Skill names (official PT-BR from pt.runescape.wiki)
    skillNames: {
      0: 'Ataque',
      1: 'Defesa',
      2: 'Força',
      3: 'Condição Física',
      4: 'Combate à Distância',
      5: 'Oração',
      6: 'Magia',
      7: 'Culinária',
      8: 'Corte de Lenha',
      9: 'Arco e Flecha',
      10: 'Pesca',
      11: 'Arte do Fogo',
      12: 'Artesanato',
      13: 'Metalurgia',
      14: 'Mineração',
      15: 'Herbologia',
      16: 'Agilidade',
      17: 'Roubo',
      18: 'Extermínio',
      19: 'Agricultura',
      20: 'Criação de Runas',
      21: 'Caça',
      22: 'Construção',
      23: 'Evocação',
      24: 'Dungeon',
      25: 'Divinação',
      26: 'Invenção',
      27: 'Arqueologia',
      28: 'Necromancia',
    },

    // Journal goal titles and descriptions
    journal: {
      cb30:    { title: 'Aprendiz de Guerreiro', desc: 'Alcançar Nível de Combate 30' },
      cb50:    { title: 'Guerreiro',             desc: 'Alcançar Nível de Combate 50' },
      cb75:    { title: 'Cavaleiro',              desc: 'Alcançar Nível de Combate 75' },
      cb100:   { title: 'Campeão',                desc: 'Alcançar Nível de Combate 100' },
      cb120:   { title: 'Senhor da Guerra',       desc: 'Alcançar Nível de Combate 120' },
      cb138:   { title: 'Combate Máximo',         desc: 'Alcançar Nível de Combate 138' },
      tl200:   { title: 'Primeiros Passos',       desc: 'Alcançar Nível Total 200' },
      tl500:   { title: 'Versátil',               desc: 'Alcançar Nível Total 500' },
      tl750:   { title: 'Habilidoso',             desc: 'Alcançar Nível Total 750' },
      tl1k:    { title: 'Experiente',             desc: 'Alcançar Nível Total 1.000' },
      tl15:    { title: 'Especialista',            desc: 'Alcançar Nível Total 1.500' },
      tl2k:    { title: 'Mestre',                 desc: 'Alcançar Nível Total 2.000' },
      tl25:    { title: 'Lendário',               desc: 'Alcançar Nível Total 2.500' },
      first50: { title: 'Dedicado',               desc: 'Qualquer habilidade no Nível 50' },
      first80: { title: 'Devoto',                 desc: 'Qualquer habilidade no Nível 80' },
      first99: { title: 'Mestre de Uma',          desc: 'Qualquer habilidade no Nível 99' },
      all30:   { title: 'Completo',               desc: 'Todas as habilidades no Nível 30+' },
      all50:   { title: 'Polivalente',            desc: 'Todas as habilidades no Nível 50+' },
      xp100k:  { title: 'Começando',              desc: 'Ganhar 100.000 XP Total' },
      xp1m:    { title: 'Esforçado',              desc: 'Ganhar 1.000.000 XP Total' },
      xp5m:    { title: 'Dedicado',               desc: 'Ganhar 5.000.000 XP Total' },
      xp10m:   { title: 'Veterano',               desc: 'Ganhar 10.000.000 XP Total' },
      xp50m:   { title: 'Experiente',             desc: 'Ganhar 50.000.000 XP Total' },
      xp100m:  { title: 'Lorde do XP',            desc: 'Ganhar 100.000.000 XP Total' },
      q1:      { title: 'Aventureiro',            desc: 'Completar sua primeira missão' },
      q10:     { title: 'Buscador',               desc: 'Completar 10 missões' },
      q25:     { title: 'Explorador',             desc: 'Completar 25 missões' },
      q50:     { title: 'Herói',                  desc: 'Completar 50 missões' },
      q100:    { title: 'Lenda',                  desc: 'Completar 100 missões' },
      q200:    { title: 'Mestre do Saber',        desc: 'Completar 200 missões' },
      qds:     { title: 'Caça-Dragões',           desc: 'Completar Caça-Dragões' },
      qnec:    { title: 'Necromante',             desc: 'Completar Necromancia!' },
      qww:     { title: 'Invocador',              desc: 'Completar Assobio do Lobo' },
      qhg:     { title: 'Guerreiro Sagrado',      desc: 'Completar Santo Graal' },
      qrm:     { title: 'Criador de Runas',       desc: 'Completar Mistérios Rúnicos' },
    },

    // Journal categories
    journalCats: {
      combat: 'Combate',
      skills: 'Habilidades',
      xp: 'XP',
      quests: 'Missões',
    },
  },

  en: {
    title: 'RS3 Leaderboard',
    subtitle: 'Co-op adventure tracker',
    refresh: 'Refresh',
    loading: 'Loading...',
    refreshing: 'Refreshing...',
    live: 'Live',
    cached: 'Cached',
    offline: 'Offline',
    agoMin: 'm ago',
    updatingLive: 'updating...',

    navOverview: 'Overview',
    navSkills: 'Skills',
    navJournal: 'Journal',
    navQuests: 'Quests',
    navActivity: 'Activity',

    h2hTitle: 'Side by Side',
    totalLevel: 'Total Level',
    totalXp: 'Total XP',
    combatLevel: 'Combat Level',
    combat: 'Combat',
    combatXp: 'Combat XP',
    runeScore: 'RuneScore',
    questsDone: 'Quests',
    clueScrolls: 'Clue Scrolls',
    skillsAhead: 'Leading',
    rank: 'Rank',
    overallRank: 'Overall Rank',

    skillsTitle: 'All Skills',
    all: 'All',
    catCombat: 'Combat',
    catGathering: 'Gathering',
    catArtisan: 'Artisan',
    catSupport: 'Support',
    xp: 'xp',
    ahead: 'Ahead',

    questsTitle: 'Quests',
    complete: 'Complete',
    started: 'Started',
    remaining: 'Remaining',

    activityTitle: 'Recent Activity',
    noActivity: 'No recent activity',

    journalTitle: 'Adventure Journal',
    goals: 'goals',
    max: 'max',
    pts: 'pts',
    skills: 'Skills',
    quests: 'Quests',

    footerApi: 'Data from RuneMetrics & Hiscores API',
    footerRefresh: 'Auto-refreshes every 5 min',
    updated: 'Updated',
    cachedData: 'Cached data',

    skillNames: {
      0: 'Attack', 1: 'Defence', 2: 'Strength', 3: 'Constitution',
      4: 'Ranged', 5: 'Prayer', 6: 'Magic', 7: 'Cooking',
      8: 'Woodcutting', 9: 'Fletching', 10: 'Fishing', 11: 'Firemaking',
      12: 'Crafting', 13: 'Smithing', 14: 'Mining', 15: 'Herblore',
      16: 'Agility', 17: 'Thieving', 18: 'Slayer', 19: 'Farming',
      20: 'Runecrafting', 21: 'Hunter', 22: 'Construction', 23: 'Summoning',
      24: 'Dungeoneering', 25: 'Divination', 26: 'Invention',
      27: 'Archaeology', 28: 'Necromancy',
    },

    journal: {
      cb30: { title: 'Apprentice Fighter', desc: 'Reach Combat Level 30' },
      cb50: { title: 'Warrior', desc: 'Reach Combat Level 50' },
      cb75: { title: 'Knight', desc: 'Reach Combat Level 75' },
      cb100: { title: 'Champion', desc: 'Reach Combat Level 100' },
      cb120: { title: 'Warlord', desc: 'Reach Combat Level 120' },
      cb138: { title: 'Max Combat', desc: 'Reach Combat Level 138' },
      tl200: { title: 'First Steps', desc: 'Reach Total Level 200' },
      tl500: { title: 'Jack of Trades', desc: 'Reach Total Level 500' },
      tl750: { title: 'Skilled', desc: 'Reach Total Level 750' },
      tl1k: { title: 'Versatile', desc: 'Reach Total Level 1,000' },
      tl15: { title: 'Expert', desc: 'Reach Total Level 1,500' },
      tl2k: { title: 'Master', desc: 'Reach Total Level 2,000' },
      tl25: { title: 'Legendary', desc: 'Reach Total Level 2,500' },
      first50: { title: 'Specialist', desc: 'Get any skill to Level 50' },
      first80: { title: 'Devoted', desc: 'Get any skill to Level 80' },
      first99: { title: 'Master of One', desc: 'Get any skill to Level 99' },
      all30: { title: 'Well-Rounded', desc: 'All skills at least Level 30' },
      all50: { title: 'All-Rounder', desc: 'All skills at least Level 50' },
      xp100k: { title: 'Getting Started', desc: 'Earn 100,000 Total XP' },
      xp1m: { title: 'Grinder', desc: 'Earn 1,000,000 Total XP' },
      xp5m: { title: 'Dedicated', desc: 'Earn 5,000,000 Total XP' },
      xp10m: { title: 'Veteran', desc: 'Earn 10,000,000 Total XP' },
      xp50m: { title: 'Seasoned', desc: 'Earn 50,000,000 Total XP' },
      xp100m: { title: 'XP Lord', desc: 'Earn 100,000,000 Total XP' },
      q1: { title: 'Adventurer', desc: 'Complete your first quest' },
      q10: { title: 'Seeker', desc: 'Complete 10 quests' },
      q25: { title: 'Explorer', desc: 'Complete 25 quests' },
      q50: { title: 'Hero', desc: 'Complete 50 quests' },
      q100: { title: 'Legend', desc: 'Complete 100 quests' },
      q200: { title: 'Loremaster', desc: 'Complete 200 quests' },
      qds: { title: 'Dragon Slayer', desc: 'Complete Dragon Slayer' },
      qnec: { title: 'Necromancer', desc: 'Complete Necromancy!' },
      qww: { title: 'Spirit Caller', desc: 'Complete Wolf Whistle' },
      qhg: { title: 'Holy Warrior', desc: 'Complete Holy Grail' },
      qrm: { title: 'Rune Crafter', desc: 'Complete Rune Mysteries' },
    },

    journalCats: {
      combat: 'Combat',
      skills: 'Skills',
      xp: 'XP',
      quests: 'Quests',
    },
  },
};

// Current language
let currentLang = localStorage.getItem('rs3lb-lang') || 'pt';

function t(key) {
  return LANG[currentLang][key] || LANG.en[key] || key;
}

function tSkill(id) {
  return LANG[currentLang].skillNames[id] || LANG.en.skillNames[id] || '?';
}

function tJournal(goalId) {
  return (LANG[currentLang].journal || {})[goalId] || (LANG.en.journal || {})[goalId] || { title: goalId, desc: '' };
}

function tJournalCat(cat) {
  return (LANG[currentLang].journalCats || {})[cat] || cat;
}

function setLang(lang) {
  currentLang = lang;
  localStorage.setItem('rs3lb-lang', lang);
}
