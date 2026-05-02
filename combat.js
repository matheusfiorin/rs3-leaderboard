/* =============================================
   RS3 Leaderboard — Combat Section
   Revolution bars, gear recommendations
   Post-Combat Style Modernisation (March 2026)
   Bilingual PT-BR / EN
   ============================================= */

const WIKI_IMG = (name) =>
  `https://runescape.wiki/w/Special:FilePath/${name.replace(/ /g, "_")}.png`;

// ---- Ability Database (post-March 2026 Combat Modernisation) ----
const ABILITIES = {
  melee: {
    attack_basic: {
      name: { pt: "Ataque", en: "Attack" },
      lvl: 1,
      type: "basic",
      desc: {
        pt: "110-130% de dano. Ataque corpo a corpo b\u00e1sico.",
        en: "110-130% damage. Basic melee attack.",
      },
      icon: "Slice",
    },
    assault: {
      name: { pt: "Assalto", en: "Assault" },
      lvl: 3,
      type: "enhanced",
      desc: {
        pt: "4 golpes de 130-150%. Consome Sede de Sangue para curar.",
        en: "4 hits of 130-150%. Consumes Bloodlust for healing.",
      },
      icon: "Assault",
    },
    adaptive_str: {
      name: { pt: "Golpe Adaptativo", en: "Adaptive Strike" },
      lvl: 7,
      type: "basic",
      desc: {
        pt: "2H: AoE at\u00e9 9 alvos. DW: alvo \u00fanico + sangramento.",
        en: "2H: AoE up to 9 targets. DW: single + bleed.",
      },
      icon: "Smash",
    },
    rend: {
      name: { pt: "Rasgar", en: "Rend" },
      lvl: 18,
      type: "basic",
      desc: {
        pt: "135-165% de dano. Gera 2 cargas de Sede de Sangue.",
        en: "135-165% damage. Generates 2 Bloodlust stacks.",
      },
      icon: "Sever",
    },
    fury: {
      name: { pt: "F\u00faria", en: "Fury" },
      lvl: 21,
      type: "basic",
      desc: {
        pt: "110-130% + 25% chance de cr\u00edtico no pr\u00f3ximo ataque.",
        en: "110-130% + 25% crit chance on next attack.",
      },
      icon: "Fury",
    },
    hurricane: {
      name: { pt: "Furac\u00e3o", en: "Hurricane" },
      lvl: 37,
      type: "enhanced",
      desc: {
        pt: "AoE 220-260%. Reseta CD em multi-hit. Apenas 2H.",
        en: "AoE 220-260%. Resets CD on multi-hit. 2H only.",
      },
      icon: "Hurricane",
    },
    dismember: {
      name: { pt: "Desmembrar", en: "Dismember" },
      lvl: 50,
      type: "enhanced",
      desc: {
        pt: "Sangramento: 8 golpes. Substitui Massacre.",
        en: "Bleed: 8 hits. Replaces Slaughter/Massacre.",
      },
      icon: "Dismember",
    },
    punish: {
      name: { pt: "Punir", en: "Punish" },
      lvl: 60,
      type: "basic",
      desc: {
        pt: "110-130%. 2.5x em alvos abaixo de 50% HP.",
        en: "110-130%. 2.5x on targets below 50% HP.",
      },
      icon: "Punish",
    },
    berserk: {
      name: { pt: "Fren\u00e9tico", en: "Berserk" },
      lvl: 42,
      type: "ultimate",
      desc: {
        pt: "Dano dobrado por 20s. Custa 100% adrenalina.",
        en: "Double damage for 20s. Costs 100%.",
      },
      icon: "Berserk",
    },
  },
  ranged: {
    ranged_basic: {
      name: { pt: "Dist\u00e2ncia", en: "Ranged" },
      lvl: 1,
      type: "basic",
      desc: {
        pt: "90-110% de dano. Ataque \u00e0 dist\u00e2ncia b\u00e1sico.",
        en: "90-110% damage. Basic ranged attack.",
      },
      icon: "Piercing_Shot",
    },
    snap: {
      name: { pt: "Tiro Certeiro", en: "Snap Shot" },
      lvl: 3,
      type: "enhanced",
      desc: {
        pt: "145-175% x2 golpes. 25% adrenalina.",
        en: "145-175% x2 hits. 25% adrenaline.",
      },
      icon: "Snap_Shot",
    },
    snipe: {
      name: { pt: "Emboscada", en: "Snipe" },
      lvl: 5,
      type: "enhanced",
      desc: {
        pt: "300-360% dano \u00fanico. CD 1 min.",
        en: "300-360% single hit. 1min CD.",
      },
      icon: "Snipe",
    },
    piercing: {
      name: { pt: "Tiro Perfurante", en: "Piercing Shot" },
      lvl: 13,
      type: "basic",
      desc: {
        pt: "45-55% x2 golpes. Reduz CD do Emboscada.",
        en: "45-55% x2 hits. Reduces Snipe CD.",
      },
      icon: "Needle_Strike",
    },
    deadshot: {
      name: { pt: "Tiro Mortal", en: "Deadshot" },
      lvl: 21,
      type: "ultimate",
      desc: { pt: "125-145% x5 golpes.", en: "125-145% x5 hits." },
      icon: "Deadshot",
    },
    binding: {
      name: { pt: "Tiro Prendedor", en: "Binding Shot" },
      lvl: 31,
      type: "basic",
      desc: {
        pt: "65-75% + atordoa por 3.6s.",
        en: "65-75% + stun/bind for 3.6s.",
      },
      icon: "Binding_Shot",
    },
    bombardment: {
      name: { pt: "Bombardeio", en: "Bombardment" },
      lvl: 36,
      type: "enhanced",
      desc: {
        pt: "AoE 220-260% em \u00e1rea 5x5.",
        en: "AoE 220-260% in 5x5 area.",
      },
      icon: "Bombardment",
    },
    galeshot: {
      name: { pt: "Rajada", en: "Galeshot" },
      lvl: 58,
      type: "basic",
      desc: {
        pt: "Aplica buff Ventos Ardentes.",
        en: "Applies Searing Winds buff.",
      },
      icon: "Dazing_Shot",
    },
    rapid: {
      name: { pt: "Tiro R\u00e1pido", en: "Rapid Fire" },
      lvl: 62,
      type: "enhanced",
      desc: {
        pt: "Canaliza\u00e7\u00e3o: 8 golpes de 75-85%.",
        en: "Channel: 8 hits of 75-85%.",
      },
      icon: "Rapid_Fire",
    },
    ricochet: {
      name: { pt: "Ricochete", en: "Ricochet" },
      lvl: 67,
      type: "basic",
      desc: {
        pt: "AoE: ricochete em alvos pr\u00f3ximos.",
        en: "AoE: bounces to nearby targets.",
      },
      icon: "Ricochet",
    },
  },
  magic: {
    magic_basic: {
      name: { pt: "Magia", en: "Magic" },
      lvl: 1,
      type: "basic",
      desc: {
        pt: "90-110% de dano. Ataque m\u00e1gico b\u00e1sico.",
        en: "90-110% damage. Basic magic attack.",
      },
      icon: "Wrack",
    },
    sonic: {
      name: { pt: "Onda S\u00f4nica", en: "Sonic Wave" },
      lvl: 6,
      type: "basic",
      desc: {
        pt: "90-110%. Concede Fluxo (reduz custo da pr\u00f3xima habilidade).",
        en: "90-110%. Grants Flow (reduces next ability cost).",
      },
      icon: "Sonic_Wave",
    },
    combust: {
      name: { pt: "Combust\u00e3o", en: "Combust" },
      lvl: 10,
      type: "basic",
      desc: {
        pt: "Queimadura: 10 golpes de ~30% = 300% total.",
        en: "Burn DoT: 10 hits of ~30% = 300% total.",
      },
      icon: "Combust",
    },
    omnipower: {
      name: { pt: "Onipot\u00eancia", en: "Omnipower" },
      lvl: 12,
      type: "ultimate",
      desc: { pt: "420-500% de dano.", en: "420-500% damage." },
      icon: "Omnipower",
    },
    dragon_breath: {
      name: { pt: "Sopro do Drag\u00e3o", en: "Dragon Breath" },
      lvl: 19,
      type: "basic",
      desc: {
        pt: "AoE 110-130% em linha. +25% vs alvos queimando.",
        en: "AoE 110-130% line. +25% vs burning targets.",
      },
      icon: "Dragon_Breath",
    },
    runic_charge: {
      name: { pt: "Carga R\u00fanica", en: "Runic Charge" },
      lvl: 26,
      type: "basic",
      desc: {
        pt: "Empodera pr\u00f3xima habilidade. Sem GCD.",
        en: "Empowers next ability. No GCD.",
      },
      icon: "Surge",
    },
    impact: {
      name: { pt: "Impacto", en: "Impact" },
      lvl: 40,
      type: "basic",
      desc: { pt: "65-75% + atordoa 1.2s.", en: "65-75% + stun 1.2s." },
      icon: "Impact",
    },
    chain: {
      name: { pt: "Corrente", en: "Chain" },
      lvl: 45,
      type: "basic",
      desc: {
        pt: "AoE: 70-90% + 2 pr\u00f3ximos. Compartilha 30% da pr\u00f3xima habilidade.",
        en: "AoE: 70-90% + 2 nearby. Shares 30% of next ability.",
      },
      icon: "Chain",
    },
    wild_magic: {
      name: { pt: "Magia Selvagem", en: "Wild Magic" },
      lvl: 55,
      type: "enhanced",
      desc: {
        pt: "125-155% x2 golpes. 25% adrenalina.",
        en: "125-155% x2 hits. 25% adrenaline.",
      },
      icon: "Wild_Magic",
    },
    conc_blast: {
      name: { pt: "Explos\u00e3o Concentrada", en: "Concentrated Blast" },
      lvl: 66,
      type: "basic",
      desc: {
        pt: "35% x3 canaliza\u00e7\u00e3o. Chance de cr\u00edtico acumulativa.",
        en: "35% x3 channel. Stacking crit chance.",
      },
      icon: "Concentrated_Blast",
    },
    sunshine: {
      name: { pt: "Luz Solar", en: "Sunshine" },
      lvl: 50,
      type: "ultimate",
      desc: { pt: "+50% de dano por 30s.", en: "+50% damage for 30s." },
      icon: "Sunshine",
    },
  },
  necro: {
    touch_of_death: {
      name: { pt: "Toque da Morte", en: "Touch of Death" },
      lvl: 1,
      type: "basic",
      desc: {
        pt: "30-120% de dano. Gera cargas de necrose.",
        en: "30-120% damage. Generates necrosis stacks.",
      },
      icon: "Touch_of_Death",
    },
    soul_sap: {
      name: { pt: "Drenar Alma", en: "Soul Sap" },
      lvl: 5,
      type: "basic",
      desc: {
        pt: "22.8-57%. Gera almas residuais.",
        en: "22.8-57%. Generates residual souls.",
      },
      icon: "Soul_Sap",
    },
    spectral_scythe: {
      name: { pt: "Foice Espectral", en: "Spectral Scythe" },
      lvl: 10,
      type: "basic",
      desc: {
        pt: "AoE em cone frontal, 3 usos.",
        en: "AoE in frontal cone, 3 recasts.",
      },
      icon: "Spectral_Scythe",
    },
    finger_of_death: {
      name: { pt: "Dedo da Morte", en: "Finger of Death" },
      lvl: 12,
      type: "enhanced",
      desc: {
        pt: "50-250%. Consome necrose (custo reduzido).",
        en: "50-250%. Consumes necrosis (reduced cost).",
      },
      icon: "Finger_of_Death",
    },
    blood_siphon: {
      name: { pt: "Sif\u00e3o de Sangue", en: "Blood Siphon" },
      lvl: 20,
      type: "basic",
      desc: {
        pt: "36-180%. Cura por hit em AoE.",
        en: "36-180%. Heal per hit on AoE.",
      },
      icon: "Blood_Siphon",
    },
    bloat: {
      name: { pt: "Incha\u00e7o", en: "Bloat" },
      lvl: 24,
      type: "basic",
      desc: {
        pt: "Sangramento: 4 golpes em 6s.",
        en: "Bleed: 4 hits over 6s.",
      },
      icon: "Bloat",
    },
    volley_of_souls: {
      name: { pt: "Rajada de Almas", en: "Volley of Souls" },
      lvl: 30,
      type: "enhanced",
      desc: {
        pt: "4 golpes. Consome almas residuais.",
        en: "4 hits. Consumes residual souls.",
      },
      icon: "Volley_of_Souls",
    },
    command_skel: {
      name: { pt: "Comandar Esqueleto", en: "Command Skeleton" },
      lvl: 32,
      type: "basic",
      desc: {
        pt: "Invoca esqueleto para ataques extras.",
        en: "Summon skeleton for extra hits.",
      },
      icon: "Command_Skeleton_Warrior",
    },
    death_skulls: {
      name: { pt: "Cr\u00e2nios da Morte", en: "Death Skulls" },
      lvl: 40,
      type: "enhanced",
      desc: {
        pt: "4 golpes ricocheteantes de 45-135%.",
        en: "Bouncing 4 hits of 45-135%.",
      },
      icon: "Death_Skulls",
    },
    living_death: {
      name: { pt: "Morte Viva", en: "Living Death" },
      lvl: 50,
      type: "ultimate",
      desc: {
        pt: "Dedo da Morte gr\u00e1tis por 30s.",
        en: "Free Finger of Death for 30s.",
      },
      icon: "Living_Death",
    },
  },
};

// ---- Gear with wiki image references + combat stats ----
// dmg = weapon tier damage, armour = armour rating, hp = LP bonus from armour
const GEAR = {
  melee: [
    {
      minLvl: 1,
      dmg: 48,
      armour: 33,
      hp: 300,
      weapon: { name: "Bronze sword", icon: "Bronze_sword" },
      armor: { name: "Bronze armour", icon: "Bronze_platebody" },
      tier: "T1",
    },
    {
      minLvl: 10,
      dmg: 96,
      armour: 108,
      hp: 500,
      weapon: { name: "Black sword", icon: "Black_longsword" },
      armor: { name: "Black armour", icon: "Black_platebody" },
      tier: "T10",
    },
    {
      minLvl: 20,
      dmg: 192,
      armour: 226,
      hp: 700,
      weapon: { name: "Mithril 2h sword", icon: "Mithril_2h_sword" },
      armor: { name: "Mithril armour", icon: "Mithril_platebody" },
      tier: "T20",
    },
    {
      minLvl: 30,
      dmg: 288,
      armour: 338,
      hp: 900,
      weapon: { name: "Adamant 2h sword", icon: "Adamant_2h_sword" },
      armor: { name: "Adamant armour", icon: "Adamant_platebody" },
      tier: "T30",
    },
    {
      minLvl: 40,
      dmg: 384,
      armour: 451,
      hp: 1100,
      weapon: { name: "Rune 2h sword", icon: "Rune_2h_sword" },
      armor: { name: "Rune armour", icon: "Rune_platebody" },
      tier: "T40",
    },
    {
      minLvl: 50,
      dmg: 480,
      armour: 563,
      hp: 1300,
      weapon: { name: "Granite maul", icon: "Granite_maul" },
      armor: { name: "Rock-shell armour", icon: "Rock-shell_plate" },
      tier: "T50",
    },
    {
      minLvl: 60,
      dmg: 768,
      armour: 675,
      hp: 1500,
      weapon: { name: "Dragon rider lance", icon: "Dragon_Rider_lance" },
      armor: { name: "Dragon armour", icon: "Dragon_platebody" },
      tier: "T60",
    },
    {
      minLvl: 70,
      dmg: 864,
      armour: 788,
      hp: 1700,
      weapon: { name: "Abyssal whip", icon: "Abyssal_whip" },
      armor: { name: "Bandos armour", icon: "Bandos_chestplate" },
      tier: "T70",
    },
  ],
  ranged: [
    {
      minLvl: 1,
      dmg: 48,
      armour: 27,
      hp: 300,
      weapon: { name: "Chargebow", icon: "Chargebow" },
      armor: { name: "Leather armour", icon: "Leather_body" },
      tier: "T1",
    },
    {
      minLvl: 20,
      dmg: 192,
      armour: 170,
      hp: 600,
      weapon: { name: "Willow shortbow", icon: "Willow_shortbow" },
      armor: { name: "Studded leather", icon: "Studded_body" },
      tier: "T20",
    },
    {
      minLvl: 30,
      dmg: 288,
      armour: 260,
      hp: 800,
      weapon: { name: "Maple shortbow", icon: "Maple_shortbow" },
      armor: { name: "Snakeskin set", icon: "Snakeskin_body" },
      tier: "T30",
    },
    {
      minLvl: 40,
      dmg: 384,
      armour: 338,
      hp: 1000,
      weapon: { name: "Magic shortbow", icon: "Magic_shortbow" },
      armor: { name: "Green d'hide", icon: "Green_dragonhide_body" },
      tier: "T40",
    },
    {
      minLvl: 50,
      dmg: 480,
      armour: 451,
      hp: 1200,
      weapon: { name: "Rune crossbow", icon: "Rune_crossbow" },
      armor: { name: "Blue d'hide", icon: "Blue_dragonhide_body" },
      tier: "T50",
    },
    {
      minLvl: 60,
      dmg: 768,
      armour: 563,
      hp: 1400,
      weapon: { name: "Dragon crossbow", icon: "Dragon_crossbow" },
      armor: { name: "Black d'hide", icon: "Black_dragonhide_body" },
      tier: "T60",
    },
    {
      minLvl: 70,
      dmg: 864,
      armour: 675,
      hp: 1600,
      weapon: { name: "Crystal bow", icon: "Crystal_bow" },
      armor: { name: "Armadyl armour", icon: "Armadyl_chestplate" },
      tier: "T70",
    },
  ],
  magic: [
    {
      minLvl: 1,
      dmg: 48,
      armour: 27,
      hp: 300,
      weapon: { name: "Air staff", icon: "Staff_of_air" },
      armor: { name: "Wizard robes", icon: "Blue_wizard_robe_top" },
      tier: "T1",
    },
    {
      minLvl: 30,
      dmg: 288,
      armour: 260,
      hp: 800,
      weapon: { name: "Mystic wand", icon: "Mystic_wand" },
      armor: { name: "Mystic robes", icon: "Mystic_robe_top" },
      tier: "T30",
    },
    {
      minLvl: 40,
      dmg: 384,
      armour: 338,
      hp: 1000,
      weapon: { name: "Mystic staff", icon: "Mystic_staff" },
      armor: { name: "Splitbark", icon: "Splitbark_body" },
      tier: "T40",
    },
    {
      minLvl: 50,
      dmg: 480,
      armour: 451,
      hp: 1200,
      weapon: { name: "Grifolic wand", icon: "Grifolic_wand" },
      armor: { name: "Grifolic", icon: "Grifolic_poncho" },
      tier: "T50",
    },
    {
      minLvl: 60,
      dmg: 768,
      armour: 563,
      hp: 1400,
      weapon: { name: "Staff of light", icon: "Staff_of_light" },
      armor: { name: "Ganodermic", icon: "Ganodermic_poncho" },
      tier: "T60",
    },
    {
      minLvl: 70,
      dmg: 864,
      armour: 675,
      hp: 1600,
      weapon: { name: "Wand of the Cywir", icon: "Wand_of_the_Cywir_elders" },
      armor: { name: "Subjugation", icon: "Garb_of_subjugation" },
      tier: "T70",
    },
  ],
  necro: [
    {
      minLvl: 1,
      dmg: 48,
      armour: 27,
      hp: 300,
      weapon: { name: "Deathwarden T1", icon: "Deathwarden_hood_(tier_1)" },
      armor: { name: "Deathwarden T1", icon: "Deathwarden_robe_top_(tier_1)" },
      tier: "T1",
    },
    {
      minLvl: 20,
      dmg: 192,
      armour: 170,
      hp: 600,
      weapon: { name: "Deathwarden T20", icon: "Deathwarden_hood_(tier_20)" },
      armor: {
        name: "Deathwarden T20",
        icon: "Deathwarden_robe_top_(tier_20)",
      },
      tier: "T20",
    },
    {
      minLvl: 40,
      dmg: 384,
      armour: 338,
      hp: 1000,
      weapon: { name: "Deathwarden T40", icon: "Deathwarden_hood_(tier_40)" },
      armor: {
        name: "Deathwarden T40",
        icon: "Deathwarden_robe_top_(tier_40)",
      },
      tier: "T40",
    },
    {
      minLvl: 60,
      dmg: 768,
      armour: 563,
      hp: 1400,
      weapon: { name: "Deathwarden T60", icon: "Deathwarden_hood_(tier_60)" },
      armor: {
        name: "Deathwarden T60",
        icon: "Deathwarden_robe_top_(tier_60)",
      },
      tier: "T60",
    },
    {
      minLvl: 70,
      dmg: 864,
      armour: 675,
      hp: 1600,
      weapon: { name: "Death guard T70", icon: "Death_guard_(tier_70)" },
      armor: {
        name: "Deathwarden T70",
        icon: "Deathwarden_robe_top_(tier_70)",
      },
      tier: "T70",
    },
  ],
};

// ---- DPS Estimation ----
// Simplified RS3 damage formula: ability damage = level * 4 + weapon_dmg
// Average ability % with revolution: ~120% (basics avg ~110%, enhanced ~160%, weighted)
// Ticks per ability cycle: ~5 (3s average with GCD)
function estimateDPS(level, gear, barAbilities) {
  const abilityDmg = level * 4 + gear.dmg;
  // Calculate weighted average ability % from the bar
  let totalPct = 0;
  let count = 0;
  for (const ab of barAbilities) {
    // Average the ability damage range
    const desc = ab.desc.en || "";
    const nums = desc.match(/(\d+)-(\d+)%/);
    if (nums) {
      totalPct += (parseInt(nums[1]) + parseInt(nums[2])) / 2;
      count++;
    } else {
      totalPct += 110; // default basic average
      count++;
    }
  }
  const avgPct = count > 0 ? totalPct / count : 110;
  // DPS = (abilityDmg * avgPct/100) / 1.8s (avg GCD)
  const dpsRaw = (abilityDmg * avgPct) / 100 / 1.8;
  return {
    dps: Math.round(dpsRaw),
    abilityDmg,
    avgPct: Math.round(avgPct),
    armour: gear.armour,
    hp: gear.hp,
  };
}

function getGearForLevel(style, level) {
  const tiers = GEAR[style] || [];
  let best = tiers[0];
  for (const g of tiers) {
    if (g.minLvl <= level) best = g;
  }
  return best;
}

// ---- Bar builders ----
function getBarsForStyle(style, level) {
  const abs = ABILITIES[style];
  if (!abs) return { single: [], aoe: [] };
  switch (style) {
    case "melee":
      return getMeleeBars(abs, level);
    case "ranged":
      return getRangedBars(abs, level);
    case "magic":
      return getMagicBars(abs, level);
    case "necro":
      return getNecroBars(abs, level);
    default:
      return { single: [], aoe: [] };
  }
}

function getMeleeBars(a, lvl) {
  const s = [],
    ao = [];
  if (lvl >= 50) s.push(a.dismember);
  if (lvl >= 3) s.push(a.assault);
  if (lvl >= 21) s.push(a.fury);
  if (lvl >= 18) s.push(a.rend);
  if (lvl >= 7) s.push(a.adaptive_str);
  s.push(a.attack_basic);
  if (lvl >= 60) s.push(a.punish);
  if (lvl >= 37) ao.push(a.hurricane);
  if (lvl >= 3) ao.push(a.assault);
  if (lvl >= 7) ao.push(a.adaptive_str);
  if (lvl >= 50) ao.push(a.dismember);
  if (lvl >= 21) ao.push(a.fury);
  if (lvl >= 18) ao.push(a.rend);
  ao.push(a.attack_basic);
  return { single: s.slice(0, 9), aoe: ao.slice(0, 9) };
}
function getRangedBars(a, lvl) {
  const s = [],
    ao = [];
  if (lvl >= 62) s.push(a.rapid);
  if (lvl >= 3) s.push(a.snap);
  if (lvl >= 5) s.push(a.snipe);
  if (lvl >= 13) s.push(a.piercing);
  if (lvl >= 58) s.push(a.galeshot);
  if (lvl >= 31) s.push(a.binding);
  s.push(a.ranged_basic);
  if (lvl >= 36) ao.push(a.bombardment);
  if (lvl >= 67) ao.push(a.ricochet);
  if (lvl >= 3) ao.push(a.snap);
  if (lvl >= 62) ao.push(a.rapid);
  if (lvl >= 13) ao.push(a.piercing);
  if (lvl >= 5) ao.push(a.snipe);
  ao.push(a.ranged_basic);
  return { single: s.slice(0, 9), aoe: ao.slice(0, 9) };
}
function getMagicBars(a, lvl) {
  const s = [],
    ao = [];
  if (lvl >= 55) s.push(a.wild_magic);
  if (lvl >= 66) s.push(a.conc_blast);
  if (lvl >= 19) s.push(a.dragon_breath);
  if (lvl >= 6) s.push(a.sonic);
  if (lvl >= 10) s.push(a.combust);
  s.push(a.magic_basic);
  if (lvl >= 40) s.push(a.impact);
  if (lvl >= 26) s.push(a.runic_charge);
  if (lvl >= 19) ao.push(a.dragon_breath);
  if (lvl >= 45) ao.push(a.chain);
  if (lvl >= 55) ao.push(a.wild_magic);
  if (lvl >= 10) ao.push(a.combust);
  if (lvl >= 6) ao.push(a.sonic);
  ao.push(a.magic_basic);
  if (lvl >= 26) ao.push(a.runic_charge);
  return { single: s.slice(0, 9), aoe: ao.slice(0, 9) };
}
function getNecroBars(a, lvl) {
  const s = [],
    ao = [];
  if (lvl >= 40) s.push(a.death_skulls);
  if (lvl >= 30) s.push(a.volley_of_souls);
  if (lvl >= 12) s.push(a.finger_of_death);
  if (lvl >= 24) s.push(a.bloat);
  if (lvl >= 20) s.push(a.blood_siphon);
  if (lvl >= 5) s.push(a.soul_sap);
  s.push(a.touch_of_death);
  if (lvl >= 32) s.push(a.command_skel);
  if (lvl >= 10) ao.push(a.spectral_scythe);
  if (lvl >= 40) ao.push(a.death_skulls);
  if (lvl >= 30) ao.push(a.volley_of_souls);
  if (lvl >= 20) ao.push(a.blood_siphon);
  if (lvl >= 12) ao.push(a.finger_of_death);
  if (lvl >= 24) ao.push(a.bloat);
  if (lvl >= 5) ao.push(a.soul_sap);
  ao.push(a.touch_of_death);
  return { single: s.slice(0, 9), aoe: ao.slice(0, 9) };
}

// ---- Style labels ----
const STYLE_INFO = {
  melee: {
    icon: "\u2694\uFE0F",
    skillIds: [0, 2],
    color: "#dc2626",
    label: { pt: "Corpo a Corpo", en: "Melee" },
  },
  ranged: {
    icon: "\uD83C\uDFF9",
    skillIds: [4],
    color: "#16a34a",
    label: { pt: "Combate \u00e0 Dist\u00e2ncia", en: "Ranged" },
  },
  magic: {
    icon: "\u2728",
    skillIds: [6],
    color: "#2563eb",
    label: { pt: "Magia", en: "Magic" },
  },
  necro: {
    icon: "\uD83D\uDC80",
    skillIds: [28],
    color: "#a78bfa",
    label: { pt: "Necromancia", en: "Necromancy" },
  },
};

// ---- Render ----
function renderCombat(players) {
  const el = document.getElementById("combat-grid");
  if (!el) return;
  const lang = currentLang;
  const styles = ["melee", "ranged", "magic", "necro"];
  const L = {
    single: t("cbSingleTarget"),
    aoe: t("cbAoe"),
    gear: t("cbGear"),
    weapon: t("cbWeapon"),
    armor: t("cbArmor"),
  };

  const root = el;
  el.innerHTML = players
    .map((p, pi) => {
      const cls = pi === 0 ? "p1" : "p2";
      return `<div class="combat-player-col ${cls}">
      <div class="combat-player-name ${cls}">${esc(p.name)}</div>
      ${styles
        .map((style) => {
          const info = STYLE_INFO[style];
          let level = 1;
          for (const sid of info.skillIds) {
            const sk = p.skills[sid];
            if (sk && sk.level > level) level = sk.level;
          }
          const bars = getBarsForStyle(style, level);
          const gear = getGearForLevel(style, level);
          const styleName = info.label[lang] || info.label.en;
          const dps = estimateDPS(level, gear, bars.single);
          const dpsAoe = estimateDPS(level, gear, bars.aoe);
          const hitRange = {
            min: Math.round(dps.abilityDmg * 0.9),
            max: Math.round(dps.abilityDmg * 1.3),
          };
          const constitution = (p.skills[3] || {}).level || 10;
          const maxHp = constitution * 100 + gear.hp;

          return `<div class="combat-style-card" style="--style-color:${info.color}">
          <div class="combat-style-header">
            <span class="combat-style-icon">${info.icon}</span>
            <span class="combat-style-name">${styleName}</span>
            <span class="combat-style-level">Lv. ${level}</span>
          </div>

          <div class="dps-stats">
            <div class="dps-stat">
              <div class="dps-stat-val" style="color:var(--style-color)">${dps.dps}</div>
              <div class="dps-stat-label">DPS (${L.single.split(" ")[0]})</div>
            </div>
            <div class="dps-stat">
              <div class="dps-stat-val" style="color:var(--style-color)">${dpsAoe.dps}</div>
              <div class="dps-stat-label">DPS (AoE)</div>
            </div>
            <div class="dps-stat">
              <div class="dps-stat-val">${hitRange.min}-${hitRange.max}</div>
              <div class="dps-stat-label">${t("cbBaseHit")}</div>
            </div>
            <div class="dps-stat">
              <div class="dps-stat-val">${dps.armour}</div>
              <div class="dps-stat-label">${t("cbArmour")}</div>
            </div>
            <div class="dps-stat">
              <div class="dps-stat-val">${maxHp.toLocaleString()}</div>
              <div class="dps-stat-label">${t("cbMaxHp")}</div>
            </div>
            <div class="dps-stat">
              <div class="dps-stat-val">${dps.avgPct}%</div>
              <div class="dps-stat-label">${t("cbAvgAbility")}</div>
            </div>
          </div>

          <div style="font-size:0.48rem;color:var(--text-3);font-style:italic;text-align:center;margin-bottom:6px;opacity:0.7">${t("cbEstimate")}</div>
          ${(() => {
            const prayerLvl = (p.skills[5] || {}).level || 1;
            const hasCurses = prayerLvl >= 92;
            return hasCurses
              ? `<div style="font-size:0.52rem;color:var(--green);text-align:center;margin-bottom:4px">✦ ${t("cbCursesAvailable").replace("{n}", prayerLvl)}</div>`
              : "";
          })()}

          <div class="combat-subsection">
            <div class="combat-sub-label">${L.single}</div>
            <div class="revo-bar">${renderBar(bars.single, lang)}</div>
          </div>
          <div class="combat-subsection">
            <div class="combat-sub-label">${L.aoe}</div>
            <div class="revo-bar">${renderBar(bars.aoe, lang)}</div>
          </div>
          <div class="combat-subsection">
            <div class="combat-sub-label">${L.gear} (${gear.tier})</div>
            <div class="gear-tiles">
              ${renderGearTile(gear.weapon, L.weapon, lang)}
              ${renderGearTile(gear.armor, L.armor, lang)}
            </div>
          </div>
        </div>`;
        })
        .join("")}
    </div>`;
    })
    .join("");
  if (typeof attachImgFallbacks === "function") attachImgFallbacks(root);
}

function renderBar(abilities, lang) {
  return abilities
    .map((ab, i) => {
      const typeClass =
        ab.type === "enhanced"
          ? "enhanced"
          : ab.type === "ultimate"
            ? "ultimate"
            : "basic";
      const typeName =
        ab.type === "enhanced"
          ? lang === "pt"
            ? "Aprimorada"
            : "Enhanced"
          : ab.type === "ultimate"
            ? "Ultimate"
            : lang === "pt"
              ? "B\u00e1sica"
              : "Basic";
      const name = ab.name[lang] || ab.name.en;
      const desc = ab.desc[lang] || ab.desc.en;
      return `<div class="revo-slot ${typeClass}">
        <img src="${WIKI_IMG(ab.icon)}" alt="${name}" class="revo-icon" loading="lazy" data-fallback="next">
        <div class="revo-fallback">${(ab.name.en || "").slice(0, 3)}</div>
        <div class="revo-num">${i + 1}</div>
        <div class="ability-tooltip">
          <div class="ability-tooltip-name">${name}</div>
          <div class="ability-tooltip-type">${typeName} \u00b7 Lv. ${ab.lvl}</div>
          <div class="ability-tooltip-desc">${desc}</div>
        </div>
      </div>`;
    })
    .join("");
}

function renderGearTile(item, label, lang) {
  return `<div class="gear-tile">
    <img src="${WIKI_IMG(item.icon)}" alt="${item.name}" class="gear-tile-img" loading="lazy" data-fallback="next">
    <div class="gear-tile-fallback">\uD83D\uDEE1\uFE0F</div>
    <div class="gear-tile-info">
      <div class="gear-tile-label">${label}</div>
      <div class="gear-tile-name">${item.name}</div>
    </div>
  </div>`;
}
