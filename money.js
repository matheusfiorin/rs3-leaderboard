/* =============================================
   RS3 Leaderboard — money.js
   Money-making methods, GE prices, profit calc
   Depends on globals from i18n.js + script.js:
     SKILLS, t, tSkill, fmt, fmtShort, esc, $, $$,
     currentLang, hasQuest, cacheFetch, skillIconImg
   ============================================= */

// Skill IDs: 0=ATK 1=DEF 2=STR 3=HP 4=RNG 5=PRA 6=MAG 7=COK 8=WC 9=FLE 10=FSH 11=FM 12=CRA 13=SMI 14=MIN 15=HER 16=AGI 17=THI 18=SLA 19=FAR 20=RC 21=HUN 22=CON 23=SUM 24=DG 25=DIV 26=INV 27=ARC 28=NEC
const MONEY_METHODS = [
  // ---- DYNAMIC: Prices from GE ----
  {
    id: "tan_green_dhide",
    pt: { name: "Curtir Green Dragonhide", desc: "Compre green d'hide no GE, curta em green dragon leather. Portable Crafter ou curtidor NPC." },
    en: { name: "Tan Green Dragonhide", desc: "Buy green d'hide on GE, tan into green dragon leather. Portable Crafter or NPC tanner." },
    reqs: {},
    members: true,
    inputs: [{ id: 1745, qty: 1, name: "Green dragonhide", extraCost: 20 }],
    outputs: [{ id: 2505, qty: 1, name: "Green dragon leather" }],
    actionsPerHour: 5000,
  },
  {
    id: "tan_blue_dhide",
    pt: { name: "Curtir Blue Dragonhide", desc: "Compre blue d'hide no GE, curta em blue dragon leather." },
    en: { name: "Tan Blue Dragonhide", desc: "Buy blue d'hide on GE, tan into blue dragon leather." },
    reqs: {},
    members: true,
    inputs: [{ id: 1747, qty: 1, name: "Blue dragonhide", extraCost: 20 }],
    outputs: [{ id: 2507, qty: 1, name: "Blue dragon leather" }],
    actionsPerHour: 5000,
  },
  {
    id: "craft_mist_runes",
    pt: { name: "Criar Mist Runes", desc: "Runas de ar + altar de água com talisma. Binding necklace recomendado." },
    en: { name: "Craft Mist Runes", desc: "Air runes + water altar with talisman. Binding necklace recommended." },
    reqs: { 20: 6 },
    members: true,
    inputs: [{ id: 556, qty: 1, name: "Air rune" }],
    outputs: [{ id: 4694, qty: 1, name: "Mist rune" }],
    actionsPerHour: 2200,
  },
  {
    id: "craft_dust_runes",
    pt: { name: "Criar Dust Runes", desc: "Runas de ar + altar de terra. Binding necklace recomendado." },
    en: { name: "Craft Dust Runes", desc: "Air runes + earth altar with talisman. Binding necklace recommended." },
    reqs: { 20: 6 },
    members: true,
    inputs: [{ id: 556, qty: 1, name: "Air rune" }],
    outputs: [{ id: 4698, qty: 1, name: "Dust rune" }],
    actionsPerHour: 2200,
  },
  {
    id: "craft_mud_runes",
    pt: { name: "Criar Mud Runes", desc: "Runas de água + altar de terra. Binding necklace recomendado." },
    en: { name: "Craft Mud Runes", desc: "Water runes + earth altar. Binding necklace recommended." },
    reqs: { 20: 13 },
    members: true,
    inputs: [{ id: 555, qty: 1, name: "Water rune" }],
    outputs: [{ id: 4695, qty: 1, name: "Mud rune" }],
    actionsPerHour: 2200,
  },
  {
    id: "unf_ranarr_pots",
    pt: { name: "Poções Inacabadas de Ranarr", desc: "Combine ranarr limpo + vial of water. Venda poção inacabada." },
    en: { name: "Ranarr Unfinished Potions", desc: "Combine clean ranarr + vial of water. Sell unfinished potion." },
    reqs: { 15: 25 },
    members: true,
    inputs: [{ id: 259, qty: 1, name: "Clean ranarr" }, { id: 2481, qty: 1, name: "Vial of water" }],
    outputs: [{ id: 99, qty: 1, name: "Ranarr potion (unf)" }],
    actionsPerHour: 2800,
  },
  {
    id: "unf_guam_pots",
    pt: { name: "Poções Inacabadas de Guam", desc: "Combine guam limpo + vial of water. Iniciante em Herbologia." },
    en: { name: "Guam Unfinished Potions", desc: "Combine clean guam + vial of water. Beginner Herblore." },
    reqs: { 15: 1 },
    members: true,
    inputs: [{ id: 249, qty: 1, name: "Clean guam" }, { id: 2481, qty: 1, name: "Vial of water" }],
    outputs: [{ id: 91, qty: 1, name: "Guam potion (unf)" }],
    actionsPerHour: 2800,
  },
  {
    id: "cut_sapphires",
    pt: { name: "Cortar Safiras", desc: "Compre safiras brutas no GE, corte com cinzel." },
    en: { name: "Cut Sapphires", desc: "Buy uncut sapphires on GE, cut with chisel." },
    reqs: { 12: 20 },
    members: false,
    inputs: [{ id: 1623, qty: 1, name: "Uncut sapphire" }],
    outputs: [{ id: 1607, qty: 1, name: "Sapphire" }],
    actionsPerHour: 2800,
  },
  {
    id: "cut_rubies",
    pt: { name: "Cortar Rubis", desc: "Compre rubis brutos no GE, corte com cinzel." },
    en: { name: "Cut Rubies", desc: "Buy uncut rubies on GE, cut with chisel." },
    reqs: { 12: 63 },
    members: false,
    inputs: [{ id: 1619, qty: 1, name: "Uncut ruby" }],
    outputs: [{ id: 1609, qty: 1, name: "Ruby" }],
    actionsPerHour: 2800,
  },
  {
    id: "smelt_mithril",
    pt: { name: "Fundir Barras de Mithril", desc: "1 minério de mithril + 4 carvões = 1 barra de mithril." },
    en: { name: "Smelt Mithril Bars", desc: "1 mithril ore + 4 coal = 1 mithril bar." },
    reqs: { 13: 50 },
    members: false,
    inputs: [{ id: 447, qty: 1, name: "Mithril ore" }, { id: 453, qty: 4, name: "Coal" }],
    outputs: [{ id: 2355, qty: 1, name: "Mithril bar" }],
    actionsPerHour: 1100,
  },
  {
    id: "smelt_adamant",
    pt: { name: "Fundir Barras de Adamantio", desc: "1 minério de adamantio + 6 carvões = 1 barra de adamantio." },
    en: { name: "Smelt Adamant Bars", desc: "1 adamantite ore + 6 coal = 1 adamant bar." },
    reqs: { 13: 70 },
    members: false,
    inputs: [{ id: 449, qty: 1, name: "Adamantite ore" }, { id: 453, qty: 6, name: "Coal" }],
    outputs: [{ id: 2361, qty: 1, name: "Adamant bar" }],
    actionsPerHour: 1100,
  },
  {
    id: "make_soft_clay",
    pt: { name: "Fazer Soft Clay", desc: "Use jarro de água em clay. Humidify spell é o mais rápido." },
    en: { name: "Make Soft Clay", desc: "Use water on clay. Humidify spell is fastest." },
    reqs: {},
    members: false,
    inputs: [{ id: 434, qty: 1, name: "Clay" }],
    outputs: [{ id: 1761, qty: 1, name: "Soft clay" }],
    actionsPerHour: 4000,
  },
  {
    id: "cook_karambwan",
    pt: { name: "Cozinhar Karambwan", desc: "Compre karambwan cru, cozinhe. Requer Tai Bwo Wannai Trio." },
    en: { name: "Cook Karambwan", desc: "Buy raw karambwan, cook. Requires Tai Bwo Wannai Trio quest." },
    reqs: { 7: 30 },
    members: true, quest: "Tai Bwo Wannai Trio",
    inputs: [{ id: 3142, qty: 1, name: "Raw karambwan" }],
    outputs: [{ id: 3144, qty: 1, name: "Cooked karambwan" }],
    actionsPerHour: 1400,
  },
  {
    id: "fletch_maple_longs",
    pt: { name: "Fletching: Maple Longbow (u)", desc: "Corte toras de maple em longbow (u). Sem corda." },
    en: { name: "Fletch Maple Longbows (u)", desc: "Cut maple logs into longbow (u). Unstrung." },
    reqs: { 9: 55 },
    members: true,
    inputs: [{ id: 1517, qty: 1, name: "Maple logs" }],
    outputs: [{ id: 64, qty: 1, name: "Maple longbow (u)" }],
    actionsPerHour: 2400,
  },
  {
    id: "fletch_yew_longs",
    pt: { name: "Fletching: Yew Longbow (u)", desc: "Corte toras de teixo em longbow (u)." },
    en: { name: "Fletch Yew Longbows (u)", desc: "Cut yew logs into longbow (u)." },
    reqs: { 9: 70 },
    members: true,
    inputs: [{ id: 1515, qty: 1, name: "Yew logs" }],
    outputs: [{ id: 60, qty: 1, name: "Yew longbow (u)" }],
    actionsPerHour: 2400,
  },
  {
    id: "craft_death_runes",
    pt: { name: "Criar Runas da Morte", desc: "Altar de morte via Abyss. Bom lucro passivo." },
    en: { name: "Craft Death Runes", desc: "Death altar via Abyss. Good passive income." },
    reqs: { 20: 65 },
    members: true,
    inputs: [],
    outputs: [{ id: 560, qty: 1, name: "Death rune" }],
    actionsPerHour: 2500,
  },
  {
    id: "craft_blood_runes",
    pt: { name: "Criar Runas de Sangue", desc: "Altar de sangue via Abyss. Alto valor por runa." },
    en: { name: "Craft Blood Runes", desc: "Blood altar via Abyss. High value per rune." },
    reqs: { 20: 77 },
    members: true,
    inputs: [],
    outputs: [{ id: 565, qty: 1, name: "Blood rune" }],
    actionsPerHour: 2200,
  },
  // ---- FIXED PROFIT (not GE-driven) ----
  {
    id: "fort_frames",
    fixedProfit: 3400000,
    pt: { name: "Fazer Wooden Frames (Fort Forinthry)", desc: "Quest: New Foundations. Transforme planks em frames no sawmill do forte." },
    en: { name: "Make Wooden Frames (Fort Forinthry)", desc: "Quest: New Foundations. Turn planks into frames at fort sawmill." },
    reqs: { 22: 1 }, members: true, quest: "New Foundations",
    inputs: [], outputs: [], actionsPerHour: 1,
  },
  // ---- EXISTING DYNAMIC ----
  {
    id: "smelt_iron",
    pt: {
      name: "Fundir Barras de Ferro",
      desc: "Funda min\u00e9rio de ferro em barras (anel de forja = 100% sucesso)",
    },
    en: {
      name: "Smelt Iron Bars",
      desc: "Smelt iron ore into bars (ring of forging for 100%)",
    },
    reqs: { 13: 15 },
    members: false,
    inputs: [{ id: 440, qty: 1, name: "Iron ore" }],
    outputs: [{ id: 2351, qty: 1, name: "Iron bar" }],
    actionsPerHour: 1100,
  },
  {
    id: "smelt_gold",
    pt: {
      name: "Fundir Barras de Ouro",
      desc: "Funda min\u00e9rio de ouro em barras. Goldsmith gauntlets recomendado.",
    },
    en: {
      name: "Smelt Gold Bars",
      desc: "Smelt gold ore into gold bars. Goldsmith gauntlets recommended.",
    },
    reqs: { 13: 40 },
    members: false,
    inputs: [{ id: 444, qty: 1, name: "Gold ore" }],
    outputs: [{ id: 2357, qty: 1, name: "Gold bar" }],
    actionsPerHour: 1100,
  },
  {
    id: "headless_arrows",
    pt: {
      name: "Fazer Flechas sem Ponta",
      desc: "Compre hastes + penas, fa\u00e7a flechas sem ponta. Baixo risco, f\u00e1cil.",
    },
    en: {
      name: "Fletch Headless Arrows",
      desc: "Buy shafts + feathers, fletch headless arrows. Low risk, easy.",
    },
    reqs: {},
    members: false,
    inputs: [
      { id: 52, qty: 15, name: "Arrow shaft" },
      { id: 314, qty: 15, name: "Feather" },
    ],
    outputs: [{ id: 53, qty: 15, name: "Headless arrow" }],
    actionsPerHour: 2700,
  },
  {
    id: "spin_flax",
    pt: {
      name: "Fiar Linho em Cordas de Arco",
      desc: "Roda de fiar em Lumbridge. Compre flax, venda bowstring.",
    },
    en: {
      name: "Spin Flax into Bowstrings",
      desc: "Spinning wheel in Lumbridge. Buy flax, sell bowstrings.",
    },
    reqs: { 12: 10 },
    members: true,
    inputs: [{ id: 1779, qty: 1, name: "Flax" }],
    outputs: [{ id: 1777, qty: 1, name: "Bowstring" }],
    actionsPerHour: 1500,
  },
  {
    id: "nature_runes",
    pt: {
      name: "Criar Runas da Natureza",
      desc: "Altar via Abyss. Quest Enter the Abyss necess\u00e1ria.",
    },
    en: {
      name: "Craft Nature Runes",
      desc: "Altar via Abyss. Enter the Abyss miniquest required.",
    },
    reqs: { 20: 44 },
    members: true, quest: "Enter the Abyss",
    inputs: [],
    outputs: [{ id: 561, qty: 1, name: "Nature rune" }],
    actionsPerHour: 2500,
  },
  // DAILY/RECURRING
  {
    id: "shop_run",
    fixedProfit: 800000,
    pt: {
      name: "Shop Run Di\u00e1ria (Penas + Runas)",
      desc: "Compre penas e runas baratas em lojas NPCs, venda no GE. ~10 min/dia.",
    },
    en: {
      name: "Daily Shop Run (Feathers + Runes)",
      desc: "Buy cheap feathers & runes from NPC shops, sell on GE. ~10 min/day.",
    },
    reqs: {},
    members: true,
    daily: true,
    inputs: [],
    outputs: [],
    actionsPerHour: 1,
  },
  // ALMOST UNLOCKED (within reach)
  {
    id: "necro_candles",
    fixedProfit: 5000000,
    pt: {
      name: "Ritual Candles (Necromancia)",
      desc: "Upgrade ritual candles. Precisa Necromancia 60. Fiorovizk: faltam 1 n\u00edvel!",
    },
    en: {
      name: "Ritual Candles (Necromancy)",
      desc: "Upgrade ritual candles. Needs Necromancy 60. Fiorovizk: 1 level away!",
    },
    reqs: { 28: 60 },
    members: true,
    inputs: [],
    outputs: [],
    actionsPerHour: 1,
  },
  {
    id: "miasma_runes",
    fixedProfit: 23000000,
    pt: {
      name: "Criar Runas de Miasma",
      desc: "Cria\u00e7\u00e3o de Runas 60. Fiorovizk: 10 n\u00edveis! Melhor m\u00e9todo de RC.",
    },
    en: {
      name: "Craft Miasma Runes",
      desc: "Runecrafting 60. Fiorovizk: 10 levels away! Best RC method.",
    },
    reqs: { 20: 60 },
    members: true,
    inputs: [],
    outputs: [],
    actionsPerHour: 1,
  },
  {
    id: "necronium_bars",
    fixedProfit: 6000000,
    pt: {
      name: "Fundir Barras de Necr\u00f4nio",
      desc: "Metalurgia 70. Fiorovizk: 5 n\u00edveis! 3000+ barras/hr com b\u00f4nus de duplica\u00e7\u00e3o.",
    },
    en: {
      name: "Smelt Necronium Bars",
      desc: "Smithing 70. Fiorovizk: 5 levels away! 3000+ bars/hr with doubling bonus.",
    },
    reqs: { 13: 70 },
    members: true,
    inputs: [],
    outputs: [],
    actionsPerHour: 1,
  },
  {
    id: "combo_magic_imbue",
    fixedProfit: 17000000,
    pt: {
      name: "Runas Combinadas + Magic Imbue",
      desc: "Magia 82 = 100% sucesso sem talism\u00e3. 14-20M/hr! Ambos longe, mas vale o grind.",
    },
    en: {
      name: "Combo Runes + Magic Imbue",
      desc: "Magic 82 = 100% success, no talisman needed. 14-20M/hr! Worth the grind.",
    },
    reqs: { 6: 82 },
    members: true,
    inputs: [],
    outputs: [],
    actionsPerHour: 1,
  },
  {
    id: "cut_yews",
    pt: {
      name: "Cortar Teixos",
      desc: "Corte teixos e venda. Precisa Corte de Lenha 60. Ambos perto!",
    },
    en: {
      name: "Cut Yew Trees",
      desc: "Chop yew trees and sell logs. Needs Woodcutting 60.",
    },
    reqs: { 8: 60 },
    members: false,
    inputs: [],
    outputs: [{ id: 1515, qty: 1, name: "Yew logs" }],
    actionsPerHour: 180,
  },
  {
    id: "smelt_steel",
    pt: {
      name: "Fundir Barras de A\u00e7o",
      desc: "1 min\u00e9rio de ferro + 2 carv\u00f5es = 1 barra de a\u00e7o",
    },
    en: { name: "Smelt Steel Bars", desc: "1 iron ore + 2 coal = 1 steel bar" },
    reqs: { 13: 30 },
    members: false,
    inputs: [
      { id: 440, qty: 1, name: "Iron ore" },
      { id: 453, qty: 2, name: "Coal" },
    ],
    outputs: [{ id: 2353, qty: 1, name: "Steel bar" }],
    actionsPerHour: 1100,
  },
  {
    id: "tan_cowhide",
    pt: {
      name: "Curtir Couro de Vaca",
      desc: "Compre couro no GE, curta no artesão. Sem requisitos.",
    },
    en: {
      name: "Tan Cowhide",
      desc: "Buy cowhide on GE, tan at a tanner. No requirements.",
    },
    reqs: {},
    members: false,
    inputs: [{ id: 1739, qty: 1, name: "Cowhide" }],
    outputs: [{ id: 1743, qty: 1, name: "Hard leather" }],
    actionsPerHour: 2500,
  },
  {
    id: "cook_sharks",
    pt: {
      name: "Cozinhar Tubarões",
      desc: "Compre tubarões crus, cozinhe com luvas de culinária.",
    },
    en: {
      name: "Cook Sharks",
      desc: "Buy raw sharks, cook with cooking gauntlets.",
    },
    reqs: { 7: 80 },
    members: true,
    inputs: [{ id: 383, qty: 1, name: "Raw shark" }],
    outputs: [{ id: 385, qty: 1, name: "Shark" }],
    actionsPerHour: 1400,
  },
  {
    id: "cut_magic_logs",
    pt: {
      name: "Cortar Troncos Mágicos",
      desc: "Corte de Lenha 75. Troncos valiosos.",
    },
    en: { name: "Cut Magic Trees", desc: "Woodcutting 75. Valuable logs." },
    reqs: { 8: 75 },
    members: true,
    inputs: [],
    outputs: [{ id: 1513, qty: 1, name: "Magic logs" }],
    actionsPerHour: 120,
  },
];

let gePrices = {};
let _gePriceSource = "none";

async function loadGEPrices() {
  // Collect all unique item IDs from money methods
  const ids = new Set();
  for (const m of MONEY_METHODS) {
    for (const inp of m.inputs || []) if (inp.id) ids.add(inp.id);
    for (const out of m.outputs || []) if (out.id) ids.add(out.id);
  }
  // Try live Weird Gloop API first (CORS-friendly, single batch)
  try {
    const query = [...ids].join("|");
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const resp = await fetch(`https://api.weirdgloop.org/exchange/history/rs/latest?id=${query}`, { signal: ctrl.signal });
    clearTimeout(t);
    if (resp.ok) {
      const data = await resp.json();
      gePrices = {};
      for (const [key, val] of Object.entries(data)) {
        gePrices[String(val.id)] = { name: key, price: val.price };
      }
      _gePriceSource = "live";
      _gePriceTime = new Date();
      return;
    }
  } catch (_) {}
  // Fallback to cached static file
  try {
    gePrices = await cacheFetch("data/ge_prices.json");
    _gePriceSource = "cached";
    _gePriceTime = null;
  } catch (_) {
    gePrices = {};
    _gePriceSource = "none";
    _gePriceTime = null;
  }
}
let _gePriceTime = null;

function getPrice(itemId) {
  const p = gePrices[String(itemId)];
  return p ? p.price : 0;
}

function calcProfit(method) {
  if (method.fixedProfit) return method.fixedProfit;
  let inputCost = 0;
  for (const inp of method.inputs) {
    inputCost += (getPrice(inp.id) + (inp.extraCost || 0)) * inp.qty;
  }
  let outputValue = 0;
  for (const out of method.outputs) {
    outputValue += getPrice(out.id) * out.qty;
  }
  const profitPerAction = outputValue - inputCost;
  return profitPerAction * method.actionsPerHour;
}

function canDoMethod(player, method) {
  for (const [skillId, reqLevel] of Object.entries(method.reqs)) {
    const sk = player.skills[Number(skillId)];
    if (!sk || sk.level < reqLevel) return false;
  }
  if (method.quest && !hasQuest(player, method.quest)) return false;
  return true;
}

// Compute "almost unlocked" dynamically: player is within 10 levels of ALL skill reqs
// and meets all quest reqs (or has no quest req)
function isAlmostUnlocked(player, method) {
  if (canDoMethod(player, method)) return false; // already unlocked
  if (method.quest && !hasQuest(player, method.quest)) return false; // blocked by quest, not "almost"
  let missingSkills = 0;
  for (const [skillId, reqLevel] of Object.entries(method.reqs)) {
    const sk = player.skills[Number(skillId)];
    const cur = sk ? sk.level : 1;
    const gap = reqLevel - cur;
    if (gap > 0 && gap <= 10) continue; // within range
    if (gap > 10) return false; // too far
  }
  return true;
}

const MONEY_TOP_N = 10;
let _moneyFilter = "all"; // all | available | upcoming

function moneyCardHTML(m, players, lang) {
  const info = m[lang] || m.en;
  let desc = info.desc;
  if (m.almostUnlocked) {
    const parts = [];
    for (const p of players) {
      if (canDoMethod(p, m)) {
        parts.push(`${p.name}: \u2713`);
      } else {
        for (const [sid, reqLvl] of Object.entries(m.reqs)) {
          const sk = p.skills[Number(sid)];
          const curLvl = sk ? sk.level : 1;
          const gap = reqLvl - curLvl;
          if (gap > 0) parts.push(`${p.name}: ${tSkill(Number(sid))} ${curLvl}\u2192${reqLvl} (${gap} ${t("levels")})`);
        }
      }
    }
    if (parts.length) desc = parts.join(" | ");
  }
  const profitStr = m.profit > 0 ? fmtShort(m.profit) + " gp/h" : "?";
  const dailyGp = m.profit * 3;
  const reqTags = Object.entries(m.reqs).map(([sid, lvl]) => {
    const met = players.some(p => canDoMethod(p, { reqs: { [sid]: lvl } }));
    return `<span class="money-req ${met ? "met" : "unmet"}">${tSkill(Number(sid))} ${lvl}</span>`;
  }).join("") || `<span class="money-req met">${t("noReqs")}</span>`;
  const p1can = canDoMethod(players[0], m);
  const p2can = players[1] ? canDoMethod(players[1], m) : false;
  const badges = [];
  if (m.almostUnlocked) badges.push(`<span style="font-size:0.6rem;color:var(--orange);background:rgba(251,191,36,0.08);padding:2px 6px;border-radius:100px;font-weight:700">${t("soon")}</span>`);
  if (m.daily) badges.push(`<span style="font-size:0.6rem;color:var(--purple);background:var(--purple-bg);padding:2px 6px;border-radius:100px;font-weight:700">${t("daily")}</span>`);

  return `<div class="money-card"${m.almostUnlocked ? ' style="border-left:3px solid var(--orange);opacity:0.85"' : ""}>
    <div class="money-card-header">
      <div class="money-card-title">${info.name}${m.members ? " \u2B50" : ""}${badges.length ? " " + badges.join(" ") : ""}</div>
      <div class="money-card-profit">${profitStr}</div>
    </div>
    <div class="money-card-desc">${desc}</div>
    <div class="money-card-reqs">${reqTags}</div>
    <div class="money-card-players">
      <span class="money-player-tag ${p1can ? "can" : "cant"}">${esc(players[0].name)} ${p1can ? "\u2713" : "\u2717"}</span>
      ${players[1] ? `<span class="money-player-tag ${p2can ? "can" : "cant"}">${esc(players[1].name)} ${p2can ? "\u2713" : "\u2717"}</span>` : ""}
    </div>
    ${!m.daily && dailyGp > 0 ? `<div class="money-card-daily">${t("perDay")}: <strong>${fmtShort(dailyGp)} gp</strong></div>` : ""}
  </div>`;
}

function renderMoney(players) {
  const lang = currentLang;
  const all = MONEY_METHODS.map((m) => ({
    ...m,
    profit: calcProfit(m),
    almostUnlocked: !players.some(p => canDoMethod(p, m)) && players.some(p => isAlmostUnlocked(p, m)),
  })).sort((a, b) => b.profit - a.profit);

  // Filter
  let filtered = all;
  if (_moneyFilter === "available") filtered = all.filter(m => players.some(p => canDoMethod(p, m)) && !m.almostUnlocked);
  else if (_moneyFilter === "upcoming") filtered = all.filter(m => m.almostUnlocked || !players.some(p => canDoMethod(p, m)));

  const showAll = filtered.length <= MONEY_TOP_N;
  const visible = showAll ? filtered : filtered.slice(0, MONEY_TOP_N);
  const hidden = showAll ? [] : filtered.slice(MONEY_TOP_N);

  // Filter pills + price source badge
  const grid = $("#money-grid");
  const priceLabel = _gePriceSource === "live"
    ? `<span style="font-size:0.6rem;color:var(--green);margin-left:auto">&#x25CF; ${lang === "pt" ? "Preços ao vivo" : "Live prices"}</span>`
    : _gePriceSource === "cached"
      ? `<span style="font-size:0.6rem;color:var(--text-3);margin-left:auto">&#x25CB; ${lang === "pt" ? "Preços em cache" : "Cached prices"}</span>`
      : "";
  const filtersHTML = `<div class="pill-filters" style="margin-bottom:12px;display:flex;flex-wrap:wrap;align-items:center">
    <button class="pill money-fpill ${_moneyFilter === "all" ? "active" : ""}" data-mf="all">${t("all")} (${all.length})</button>
    <button class="pill money-fpill ${_moneyFilter === "available" ? "active" : ""}" data-mf="available">\u2713 ${lang === "pt" ? "Disponíveis" : "Available"} (${all.filter(m => players.some(p => canDoMethod(p, m)) && !m.almostUnlocked).length})</button>
    <button class="pill money-fpill ${_moneyFilter === "upcoming" ? "active" : ""}" data-mf="upcoming">\u23F3 ${lang === "pt" ? "Em breve" : "Upcoming"} (${all.filter(m => m.almostUnlocked || !players.some(p => canDoMethod(p, m))).length})</button>
    ${priceLabel}
  </div>`;

  grid.innerHTML = filtersHTML +
    visible.map(m => moneyCardHTML(m, players, lang)).join("") +
    (hidden.length ? `<div id="money-hidden" style="display:none">${hidden.map(m => moneyCardHTML(m, players, lang)).join("")}</div>
    <button id="money-show-more" class="pill" style="display:block;margin:12px auto;padding:8px 24px">
      ${lang === "pt" ? "Mostrar mais" : "Show more"} (+${hidden.length})
    </button>` : "");

  // Filter pill handlers
  grid.querySelectorAll(".money-fpill").forEach(btn => {
    btn.addEventListener("click", () => {
      _moneyFilter = btn.dataset.mf;
      renderMoney(players);
    });
  });

  // Show more handler
  const moreBtn = document.getElementById("money-show-more");
  if (moreBtn) {
    moreBtn.addEventListener("click", () => {
      document.getElementById("money-hidden").style.display = "block";
      moreBtn.remove();
    });
  }
}
