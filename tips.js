/* =============================================
   RS3 Leaderboard — tips.js
   Context-aware training tips for the active skill
   on the live view. Pulls from money.js (gp/h),
   combat.js (gear + bars), goals.js (gating goals),
   next-steps.js (NS_UNLOCKS), and an in-file curated
   training method DB enriched from the RS3 wiki.
   ============================================= */

// Skill ID reminder:
// 0 ATK 1 DEF 2 STR 3 HP 4 RNG 5 PRA 6 MAG 7 COK 8 WC 9 FLE 10 FSH 11 FM
// 12 CRA 13 SMI 14 MIN 15 HER 16 AGI 17 THI 18 SLA 19 FAR 20 RC 21 HUN
// 22 CON 23 SUM 24 DG 25 DIV 26 INV 27 ARC 28 NEC

// ---- Curated training method DB (xp/hr at level + setup notes) ----
// Compact entries: { id, sk, lvl, name, xph, intensity, members, setup, wiki, perks }
// Filled by /research over RS3 wiki "Pay-to-play X training" pages. Static.
// Each tip is selected by skill + player level (best entry where lvl<=cur).
const TIPS_METHODS = {
  // Mining (14)
  14: [
    { lvl: 1,  name: { pt: "Iron ore (Mining Guild)", en: "Iron ore (Mining Guild)" }, xph: 30000, intensity: "moderate", setup: { pt: "Banco próximo, sem requisitos.", en: "Banked next door, no reqs." } },
    { lvl: 60, name: { pt: "Concentrated coal", en: "Concentrated coal" }, xph: 75000, intensity: "moderate", setup: { pt: "Living Rock Caverns. Bom GP+XP.", en: "Living Rock Caverns. Solid GP+XP." } },
    { lvl: 75, name: { pt: "Drakolith / Necrite", en: "Drakolith / Necrite" }, xph: 90000, intensity: "high", setup: { pt: "Tirannwn lodestone + bag espiritual.", en: "Tirannwn lodestone + spirit bag." } },
    { lvl: 80, name: { pt: "Banded iron / Light animica", en: "Banded iron / Light animica" }, xph: 110000, intensity: "high", setup: { pt: "Anachronia / Empyrean. Avalanche perk help.", en: "Anachronia / Empyrean. Avalanche perk helps." } },
    { lvl: 89, name: { pt: "Dark animica", en: "Dark animica" }, xph: 130000, intensity: "high", setup: { pt: "Empyrean Citadel. Top tier ore.", en: "Empyrean Citadel. Top-tier ore." } },
  ],
  // Smithing (13)
  13: [
    { lvl: 1,  name: { pt: "Bronze 2h swords", en: "Bronze 2h swords" }, xph: 25000, intensity: "moderate" },
    { lvl: 50, name: { pt: "Adamant burial armour", en: "Adamant burial armour" }, xph: 110000, intensity: "moderate", setup: { pt: "Artisan's Workshop, sem perda.", en: "Artisan's Workshop, no loss." } },
    { lvl: 70, name: { pt: "Necronium burial armour", en: "Necronium burial armour" }, xph: 150000, intensity: "moderate" },
    { lvl: 80, name: { pt: "Bane burial armour", en: "Bane burial armour" }, xph: 200000, intensity: "moderate" },
    { lvl: 90, name: { pt: "Elder rune burial armour", en: "Elder rune burial armour" }, xph: 280000, intensity: "moderate", setup: { pt: "Top XP — desbloqueado em 90.", en: "Top XP — unlocks at 90." } },
  ],
  // Woodcutting (8)
  8: [
    { lvl: 1,  name: { pt: "Regular trees", en: "Regular trees" }, xph: 20000, intensity: "moderate" },
    { lvl: 60, name: { pt: "Yew trees", en: "Yew trees" }, xph: 45000, intensity: "moderate" },
    { lvl: 75, name: { pt: "Magic trees / Crystal trees", en: "Magic trees / Crystal trees" }, xph: 75000, intensity: "moderate", setup: { pt: "Magic trees Sorcerer's Tower. Crystal só Prif.", en: "Magic trees at Sorcerer's Tower. Crystal in Prif only." } },
    { lvl: 90, name: { pt: "Elder trees + Sawmill", en: "Elder trees + Sawmill" }, xph: 130000, intensity: "high" },
  ],
  // Fishing (10)
  10: [
    { lvl: 1,  name: { pt: "Shrimps → Trout", en: "Shrimps → Trout" }, xph: 15000, intensity: "moderate" },
    { lvl: 76, name: { pt: "Sharks (Catherby)", en: "Sharks (Catherby)" }, xph: 50000, intensity: "moderate" },
    { lvl: 90, name: { pt: "Rocktail (Frozen Floes)", en: "Rocktail (Frozen Floes)" }, xph: 70000, intensity: "moderate" },
    { lvl: 96, name: { pt: "Sailfish", en: "Sailfish" }, xph: 110000, intensity: "moderate" },
  ],
  // Cooking (7)
  7: [
    { lvl: 80, name: { pt: "Sharks (Range@Rogue Den)", en: "Sharks (Range @ Rogue Den)" }, xph: 220000, intensity: "low" },
    { lvl: 95, name: { pt: "Rocktail / Sailfish", en: "Rocktail / Sailfish" }, xph: 350000, intensity: "low" },
  ],
  // Firemaking (11)
  11: [
    { lvl: 30, name: { pt: "Maple logs (bonfire)", en: "Maple logs (bonfire)" }, xph: 90000, intensity: "low" },
    { lvl: 60, name: { pt: "Yew logs (bonfire)", en: "Yew logs (bonfire)" }, xph: 200000, intensity: "low" },
    { lvl: 75, name: { pt: "Magic logs (bonfire)", en: "Magic logs (bonfire)" }, xph: 270000, intensity: "low" },
    { lvl: 90, name: { pt: "Elder logs (bonfire)", en: "Elder logs (bonfire)" }, xph: 380000, intensity: "low" },
  ],
  // Crafting (12)
  12: [
    { lvl: 1,  name: { pt: "Cut sapphires", en: "Cut sapphires" }, xph: 30000, intensity: "moderate" },
    { lvl: 80, name: { pt: "Magic batwing", en: "Magic batwing" }, xph: 200000, intensity: "high", setup: { pt: "Trahaearn Clan Voice of Seren.", en: "Trahaearn during Voice of Seren." } },
    { lvl: 90, name: { pt: "Portent of restoration X", en: "Portent of restoration X" }, xph: 250000, intensity: "moderate" },
  ],
  // Fletching (9)
  9: [
    { lvl: 30, name: { pt: "Headless arrows (passive)", en: "Headless arrows (AFK)" }, xph: 90000, intensity: "low" },
    { lvl: 75, name: { pt: "Magic shortbows (u)", en: "Magic shortbows (u)" }, xph: 150000, intensity: "moderate" },
    { lvl: 85, name: { pt: "Elder shortbows (u)", en: "Elder shortbows (u)" }, xph: 200000, intensity: "moderate" },
  ],
  // Herblore (15)
  15: [
    { lvl: 25, name: { pt: "Ranarr unfinished pots", en: "Ranarr unf potions" }, xph: 80000, intensity: "low" },
    { lvl: 82, name: { pt: "Aggression potion (4)", en: "Aggression potion (4)" }, xph: 320000, intensity: "moderate", setup: { pt: "Plague's End. Top XP/h via mod-extreme.", en: "Plague's End. Top XP/h via overload-tier." } },
    { lvl: 96, name: { pt: "Overloads", en: "Overloads" }, xph: 400000, intensity: "moderate" },
  ],
  // Agility (16)
  16: [
    { lvl: 1,  name: { pt: "Gnome Stronghold", en: "Gnome Stronghold" }, xph: 20000, intensity: "high" },
    { lvl: 70, name: { pt: "Wilderness course (Hati)", en: "Wilderness course (Hati)" }, xph: 90000, intensity: "high" },
    { lvl: 85, name: { pt: "Hefin agility (Prif)", en: "Hefin agility (Prif)" }, xph: 70000, intensity: "moderate", setup: { pt: "Voice of Seren bonifica.", en: "Voice of Seren boosts." } },
  ],
  // Thieving (17)
  17: [
    { lvl: 60, name: { pt: "Pyramid Plunder", en: "Pyramid Plunder" }, xph: 280000, intensity: "high" },
    { lvl: 91, name: { pt: "Dragon impling jar (Puro)", en: "Dragon implings (Puro)" }, xph: 200000, intensity: "moderate" },
  ],
  // Slayer (18)
  18: [
    { lvl: 75, name: { pt: "Abyssal Demons (Slayer Tower)", en: "Abyssal Demons (Slayer Tower)" }, xph: 60000, intensity: "high", setup: { pt: "Whip drops + bom XP.", en: "Whip drops + good XP." } },
    { lvl: 90, name: { pt: "Airut / Glacors", en: "Airut / Glacors" }, xph: 90000, intensity: "high" },
  ],
  // Farming (19)
  19: [
    { lvl: 32, name: { pt: "Herb runs (Ranarr+)", en: "Herb runs (Ranarr+)" }, xph: 40000, intensity: "low", setup: { pt: "5 patches a cada ~80min. AFK.", en: "5 patches every ~80 min. AFK." } },
    { lvl: 80, name: { pt: "Tree runs (Magic)", en: "Tree runs (Magic)" }, xph: 200000, intensity: "low" },
    { lvl: 90, name: { pt: "Tree runs (Elder)", en: "Tree runs (Elder)" }, xph: 350000, intensity: "low" },
  ],
  // Runecrafting (20)
  20: [
    { lvl: 50, name: { pt: "Soul Runes (ZMI alt)", en: "Soul runes (alt)" }, xph: 60000, intensity: "moderate" },
    { lvl: 77, name: { pt: "Nature runes via Abyss", en: "Nature runes via Abyss" }, xph: 80000, intensity: "high", setup: { pt: "Maximum profit at this level.", en: "Maximum profit at this level." } },
    { lvl: 91, name: { pt: "Astral runes (lunar isle)", en: "Astral runes" }, xph: 100000, intensity: "moderate" },
  ],
  // Hunter (21)
  21: [
    { lvl: 63, name: { pt: "Red Chinchompas", en: "Red Chinchompas" }, xph: 140000, intensity: "moderate", setup: { pt: "Carnillean Rising rewards.", en: "Carnillean Rising rewards." } },
    { lvl: 80, name: { pt: "Polar kebbits / Big game", en: "Big game hunter" }, xph: 200000, intensity: "moderate" },
  ],
  // Construction (22)
  22: [
    { lvl: 50, name: { pt: "Mahogany tables", en: "Mahogany tables" }, xph: 110000, intensity: "low", setup: { pt: "Servant: Demon butler. POH.", en: "Demon butler. POH." } },
    { lvl: 74, name: { pt: "Gnome benches", en: "Gnome benches" }, xph: 250000, intensity: "low" },
  ],
  // Summoning (23)
  23: [
    { lvl: 67, name: { pt: "Pack Yak pouches", en: "Pack Yak pouches" }, xph: 220000, intensity: "moderate", setup: { pt: "Yak hides + spirit shards.", en: "Yak hides + spirit shards." } },
  ],
  // Dungeoneering (24)
  24: [
    { lvl: 10, name: { pt: "Sinkholes (D&D)", en: "Sinkholes (D&D)" }, xph: 80000, intensity: "high" },
    { lvl: 1,  name: { pt: "Daemonheim solo small", en: "Daemonheim solo small" }, xph: 50000, intensity: "high" },
  ],
  // Divination (25)
  25: [
    { lvl: 80, name: { pt: "Incandescent wisps", en: "Incandescent wisps" }, xph: 250000, intensity: "moderate" },
    { lvl: 95, name: { pt: "Lustrous memories", en: "Lustrous memories" }, xph: 280000, intensity: "moderate" },
  ],
  // Invention (26)
  26: [
    { lvl: 1,  name: { pt: "Disassemble alch items", en: "Disassemble alch items" }, xph: 50000, intensity: "low", setup: { pt: "Yak track perks aceleram.", en: "Yak track perks accelerate." } },
    { lvl: 80, name: { pt: "Augmented gear training", en: "Augmented gear training" }, xph: 150000, intensity: "low", setup: { pt: "Treine combate/slayer com gear augmented + scavenging.", en: "Train combat/slayer with augmented gear + scavenging." } },
  ],
  // Archaeology (27)
  27: [
    { lvl: 1,  name: { pt: "Kharid-et excavation", en: "Kharid-et excavation" }, xph: 30000, intensity: "moderate" },
    { lvl: 76, name: { pt: "Stormguard Citadel", en: "Stormguard Citadel" }, xph: 130000, intensity: "moderate" },
    { lvl: 91, name: { pt: "Orthen", en: "Orthen" }, xph: 180000, intensity: "moderate" },
  ],
  // Necromancy (28)
  28: [
    { lvl: 1,  name: { pt: "Ghosts (City of Um)", en: "Ghosts (City of Um)" }, xph: 50000, intensity: "high" },
    { lvl: 30, name: { pt: "Ghorrock prison", en: "Ghorrock prison" }, xph: 80000, intensity: "high" },
    { lvl: 80, name: { pt: "Phantom guardian familiars", en: "Phantom guardian familiars" }, xph: 150000, intensity: "high" },
    { lvl: 92, name: { pt: "Rasial / Top-tier slayer", en: "Rasial / Top-tier slayer" }, xph: 250000, intensity: "high" },
  ],
  // Combat skills (0/1/2/3/4/6) — generic recommendation
  0: [{ lvl: 1, name: { pt: "Treine via Necromancia ou tarefas Slayer", en: "Train via Necromancy or Slayer tasks" }, xph: 0, intensity: "high" }],
  1: [{ lvl: 1, name: { pt: "Aposente XP via combate", en: "Channel XP via combat" }, xph: 0, intensity: "high" }],
  2: [{ lvl: 1, name: { pt: "Treine via Slayer / bosses", en: "Train via Slayer / bosses" }, xph: 0, intensity: "high" }],
  3: [{ lvl: 1, name: { pt: "Auto-treina com qualquer combate", en: "Auto-trains with any combat" }, xph: 0, intensity: "low" }],
  4: [{ lvl: 1, name: { pt: "Slayer com bow/cross", en: "Slayer with bow/cross" }, xph: 0, intensity: "high" }],
  5: [{ lvl: 1, name: { pt: "Ossos no altar", en: "Bones at altar" }, xph: 0, intensity: "low", setup: { pt: "Senntisten altar = melhor XP.", en: "Senntisten altar = best XP." } }],
  6: [{ lvl: 1, name: { pt: "Slayer com magia", en: "Slayer with magic" }, xph: 0, intensity: "high" }],
};

function _tipsActiveMethod(skillId, lvl) {
  const list = TIPS_METHODS[skillId] || [];
  let best = null;
  for (const m of list) {
    if (m.lvl <= lvl) best = m;
  }
  return best;
}

// ---- money.js cross-reference ----
function _tipsMoneyMethods(player, skillId) {
  if (typeof MONEY_METHODS === "undefined" || typeof canDoMethod !== "function" || typeof calcProfit !== "function") return [];
  return MONEY_METHODS
    .filter(m => m.reqs && m.reqs[skillId] != null)
    .filter(m => canDoMethod(player, m))
    .map(m => ({ ...m, profit: calcProfit(m) }))
    .filter(m => m.profit > 0)
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 3);
}

// ---- next-steps.js: NS_UNLOCKS for this skill ----
function _tipsNextUnlock(player, skillId) {
  if (typeof NS_UNLOCKS === "undefined") return null;
  const cur = (player.skills[skillId] || {}).level || 1;
  const candidates = NS_UNLOCKS
    .filter(u => u.id === skillId && u.level > cur)
    .sort((a, b) => a.level - b.level);
  return candidates[0] || null;
}

// ---- goals.js: which Major Goals does this skill block? ----
function _tipsBlockingGoals(player, skillId) {
  if (typeof GOALS === "undefined" || typeof goalProgress !== "function") return [];
  const cur = (player.skills[skillId] || {}).level || 1;
  const out = [];
  for (const g of GOALS) {
    const skl = (g.skills || []).find(s => s.id === skillId);
    if (!skl) continue;
    if (skl.required <= cur) continue;
    const prog = goalProgress(g, player);
    if (prog.capstoneDone) continue;
    out.push({ goal: g, required: skl.required, gap: skl.required - cur });
  }
  return out.sort((a, b) => a.gap - b.gap);
}

// ---- combat.js: gear / bar recommendation if combat skill ----
function _tipsCombatSetup(player, skillId) {
  // Map skillId -> combat style key in STYLE_INFO
  const styleByLayer = {
    0: "melee", 2: "melee", 3: null,    // attack/strength = melee; HP shared
    4: "ranged",
    6: "magic",
    28: "necro",
    1: "melee",                           // defence trains via any
  };
  const style = styleByLayer[skillId];
  if (!style) return null;
  if (typeof getGearForLevel !== "function" || typeof STYLE_INFO === "undefined") return null;
  const lvl = (player.skills[skillId] || {}).level || 1;
  const gear = getGearForLevel(style, lvl);
  return { style, gear, lvl };
}

// ---- Public: build full tip list for active skill ----
function buildTips(player, skillId) {
  const lang = typeof currentLang !== "undefined" ? currentLang : "en";
  const cur = (player.skills[skillId] || {}).level || 1;
  const tips = [];

  // 1. Best curated method at this level
  const m = _tipsActiveMethod(skillId, cur);
  if (m) {
    const name = m.name[lang] || m.name.en;
    const setup = m.setup ? (m.setup[lang] || m.setup.en) : null;
    tips.push({
      kind: "method",
      icon: "🎯",
      title: name,
      detail: m.xph > 0 ? `~${(m.xph / 1000).toFixed(0)}k XP/h · ${m.intensity}` : (lang === "pt" ? "Melhor caminho" : "Best path"),
      sub: setup,
    });
  }

  // 2. Top GP/h methods cross-referenced
  const moneyMs = _tipsMoneyMethods(player, skillId);
  for (const mm of moneyMs.slice(0, 2)) {
    const mname = mm.name[lang] || mm.name.en;
    tips.push({
      kind: "money",
      icon: "💰",
      title: mname,
      detail: `~${(mm.profit / 1e6).toFixed(1)}M gp/h`,
      sub: lang === "pt" ? "Disponível para você" : "Available to you",
      goto: "money",
    });
  }

  // 3. Next memorable unlock at this skill
  const unlock = _tipsNextUnlock(player, skillId);
  if (unlock) {
    const cur2 = (player.skills[skillId] || {}).level || 1;
    const gap = unlock.level - cur2;
    const u = lang === "pt" ? unlock.u_pt : unlock.u_en;
    const hint = lang === "pt" ? unlock.hint_pt : unlock.hint_en;
    tips.push({
      kind: "unlock",
      icon: "🔓",
      title: `${u} @ ${unlock.level}`,
      detail: lang === "pt" ? `${gap} níveis` : `${gap} levels`,
      sub: hint,
    });
  }

  // 4. Major goal this skill is blocking
  const blocking = _tipsBlockingGoals(player, skillId);
  for (const b of blocking.slice(0, 1)) {
    const label = lang === "pt" ? b.goal.label_pt : b.goal.label_en;
    tips.push({
      kind: "goal",
      icon: "👑",
      title: label,
      detail: lang === "pt" ? `Precisa de ${b.required}` : `Needs ${b.required}`,
      sub: lang === "pt" ? `${b.gap} níveis para destravar` : `${b.gap} levels to unlock`,
      goto: "goals",
      goalId: b.goal.id,
    });
  }

  // 5. Combat: best gear at this level
  const cs = _tipsCombatSetup(player, skillId);
  if (cs) {
    tips.push({
      kind: "gear",
      icon: "⚔️",
      title: cs.gear.tier ? `${cs.gear.tier} ${cs.style}` : cs.style,
      detail: `${cs.gear.weapon.name} · ${cs.gear.armor.name}`,
      sub: lang === "pt" ? "Equipamento recomendado" : "Recommended gear",
      goto: "skills",
    });
  }

  return tips;
}
