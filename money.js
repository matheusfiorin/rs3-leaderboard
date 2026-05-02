/* =============================================
   RS3 Leaderboard — money.js
   Personalized money-making recommender.
   Filters 100+ methods by player skills/quests,
   ranks by GP/hr using live GE prices.
   ============================================= */

// Skill IDs: 0=ATK 1=DEF 2=STR 3=HP 4=RNG 5=PRA 6=MAG 7=COK 8=WC 9=FLE 10=FSH 11=FM 12=CRA 13=SMI 14=MIN 15=HER 16=AGI 17=THI 18=SLA 19=FAR 20=RC 21=HUN 22=CON 23=SUM 24=DG 25=DIV 26=INV 27=ARC 28=NEC

// ---- Tiny helper to render a wiki item icon (lazy, fail-silent) ----
function mnItemIcon(name, size) {
  if (!name) return "";
  const s = size || 16;
  const n = String(name).replace(/\s+/g, "_");
  return `<img class="mn-iicon" src="https://runescape.wiki/images/${n}.png" width="${s}" height="${s}" alt="" loading="lazy" data-fallback="hide">`;
}

// ---- Curated Methods Database ----
// Sources: RS3 Wiki Money Making Guide. GP/hr figures recalc'd with live GE when inputs/outputs available.
// fallback `gp` is the wiki figure used when the live calc returns <= 0 (missing prices, unusual mechanics, etc.).
const MONEY_METHODS = [
  // ======== PROCESSING (runes / herblore / smithing / cooking / fletching / crafting) ========
  { id:"craft_nature_abyss", cat:"processing", intensity:"high", members:true, gp:28205000,
    name:{pt:"Criar Nature Runes (Abyss)",en:"Craft Nature Runes (Abyss)"},
    desc:{pt:"Leve pure essence pelo Abyss até o altar de natureza.",en:"Run pure essence through the Abyss to the nature altar."},
    reqs:{20:79}, recReqs:{20:105}, quest:null,
    inputs:[{id:7936,qty:1,name:"Pure essence"}], outputs:[{id:561,qty:5,name:"Nature rune"}], actionsPerHour:2200,
    wiki:"https://runescape.wiki/w/Money_making_guide/Crafting_nature_runes_through_the_Abyss" },
  { id:"craft_blood_abyss", cat:"processing", intensity:"high", members:true, gp:23301000,
    name:{pt:"Criar Blood Runes (Abyss)",en:"Craft Blood Runes (Abyss)"},
    desc:{pt:"Requer Legacy of Seergaze. Altamente lucrativo.",en:"Requires Legacy of Seergaze. Highly profitable."},
    reqs:{20:77}, quest:"Legacy of Seergaze",
    inputs:[{id:7936,qty:1,name:"Pure essence"}], outputs:[{id:565,qty:3,name:"Blood rune"}], actionsPerHour:2000,
    wiki:"https://runescape.wiki/w/Money_making_guide/Crafting_blood_runes_through_the_Abyss" },
  { id:"craft_cosmic_abyss", cat:"processing", intensity:"high", members:true, gp:23887000,
    name:{pt:"Criar Cosmic Runes (Abyss)",en:"Craft Cosmic Runes (Abyss)"},
    desc:{pt:"Bom lucro com requisitos baixos. Precisa de Lost City.",en:"Good profit with low requirements. Needs Lost City."},
    reqs:{20:23}, quest:"Lost City",
    inputs:[{id:7936,qty:1,name:"Pure essence"}], outputs:[{id:564,qty:4,name:"Cosmic rune"}], actionsPerHour:2200,
    wiki:"https://runescape.wiki/w/Money_making_guide/Crafting_cosmic_runes_through_the_Abyss" },
  { id:"craft_water_abyss", cat:"processing", intensity:"high", members:true, gp:1500000,
    name:{pt:"Criar Water Runes (Abyss)",en:"Craft Water Runes (Abyss)"},
    desc:{pt:"Requisito mínimo de Runecrafting. Bom para iniciantes.",en:"Minimal Runecrafting req. Good for beginners."},
    reqs:{20:5}, recReqs:{20:110},
    inputs:[{id:7936,qty:1,name:"Pure essence"}], outputs:[{id:555,qty:10,name:"Water rune"}], actionsPerHour:2200,
    wiki:"https://runescape.wiki/w/Money_making_guide/Crafting_water_runes_through_the_Abyss" },
  { id:"make_aggression_pots", cat:"processing", intensity:"moderate", members:true, gp:22800000,
    name:{pt:"Fazer Aggression Potions",en:"Make Aggression Potions"},
    desc:{pt:"Combina clean bloodweed + vial of water. Bloodweed precisa de Plague's End.",en:"Combine clean bloodweed + vial of water. Bloodweed requires Plague's End."},
    reqs:{15:82}, quest:"Plague's End",
    inputs:[{id:37975,qty:1,name:"Clean bloodweed"},{id:2481,qty:1,name:"Vial of water"}], outputs:[{id:37965,qty:1,name:"Aggression potion (unf)"}], actionsPerHour:2800,
    wiki:"https://runescape.wiki/w/Money_making_guide/Making_aggression_potions" },
  { id:"make_super_antipoison", cat:"processing", intensity:"moderate", members:true, gp:11700000,
    name:{pt:"Fazer Super Antipoison",en:"Make Super Antipoison"},
    desc:{pt:"Herblore médio, bom lucro.",en:"Mid-level Herblore, good profit."},
    reqs:{15:48},
    inputs:[{id:259,qty:1,name:"Clean irit"},{id:235,qty:1,name:"Unicorn horn dust"}], outputs:[{id:181,qty:1,name:"Super antipoison"}], actionsPerHour:2600,
    wiki:"https://runescape.wiki/w/Money_making_guide/Making_super_antipoisons" },
  { id:"make_super_str", cat:"processing", intensity:"moderate", members:true, gp:9800000,
    name:{pt:"Fazer Super Strength",en:"Make Super Strength"},
    desc:{pt:"Poções de força com kwuarm.",en:"Strength potions with kwuarm."},
    reqs:{15:55},
    inputs:[{id:263,qty:1,name:"Clean kwuarm"},{id:2481,qty:1,name:"Vial of water"}], outputs:[{id:157,qty:1,name:"Super strength"}], actionsPerHour:2600,
    wiki:"https://runescape.wiki/w/Money_making_guide/Making_super_strength_potions" },
  { id:"tan_green_dhide", cat:"processing", intensity:"low", members:true, gp:8000000,
    name:{pt:"Curtir Green Dragonhide",en:"Tan Green Dragonhide"},
    desc:{pt:"Compre green d'hide, curta em leather. Sem requisitos de skill.",en:"Buy green d'hide, tan into leather. No skill requirements."},
    reqs:{},
    inputs:[{id:1745,qty:1,name:"Green dragonhide",extraCost:20}], outputs:[{id:2505,qty:1,name:"Green dragon leather"}], actionsPerHour:5000,
    wiki:"https://runescape.wiki/w/Money_making_guide/Tanning_green_dragonhide" },
  { id:"tan_blue_dhide", cat:"processing", intensity:"low", members:true, gp:6000000,
    name:{pt:"Curtir Blue Dragonhide",en:"Tan Blue Dragonhide"},
    desc:{pt:"Compre blue d'hide, curta em leather.",en:"Buy blue d'hide, tan into leather."},
    reqs:{},
    inputs:[{id:1747,qty:1,name:"Blue dragonhide",extraCost:20}], outputs:[{id:2507,qty:1,name:"Blue dragon leather"}], actionsPerHour:5000,
    wiki:"https://runescape.wiki/w/Money_making_guide/Tanning_blue_dragonhide" },
  { id:"tan_red_dhide", cat:"processing", intensity:"low", members:true, gp:5500000,
    name:{pt:"Curtir Red Dragonhide",en:"Tan Red Dragonhide"},
    desc:{pt:"Compre red d'hide, curta em leather.",en:"Buy red d'hide, tan into leather."},
    reqs:{},
    inputs:[{id:1749,qty:1,name:"Red dragonhide",extraCost:20}], outputs:[{id:2509,qty:1,name:"Red dragon leather"}], actionsPerHour:5000,
    wiki:"https://runescape.wiki/w/Money_making_guide/Tanning_red_dragonhide" },
  { id:"craft_mist_runes", cat:"processing", intensity:"high", members:true, gp:7000000,
    name:{pt:"Criar Mist Runes",en:"Craft Mist Runes"},
    desc:{pt:"Combination runes: ar + altar de água.",en:"Combination runes: air + water altar."},
    reqs:{20:6},
    inputs:[{id:556,qty:1,name:"Air rune"}], outputs:[{id:4694,qty:1,name:"Mist rune"}], actionsPerHour:2200,
    wiki:"https://runescape.wiki/w/Money_making_guide/Crafting_mist_runes" },
  { id:"craft_mud_runes", cat:"processing", intensity:"high", members:true, gp:6500000,
    name:{pt:"Criar Mud Runes",en:"Craft Mud Runes"},
    desc:{pt:"Combination runes: água + altar de terra.",en:"Combination runes: water + earth altar."},
    reqs:{20:13},
    inputs:[{id:555,qty:1,name:"Water rune"}], outputs:[{id:4695,qty:1,name:"Mud rune"}], actionsPerHour:2200,
    wiki:"https://runescape.wiki/w/Money_making_guide/Crafting_mud_runes" },
  { id:"unf_ranarr", cat:"processing", intensity:"low", members:true, gp:5000000,
    name:{pt:"Poções Inacabadas de Ranarr",en:"Ranarr Unfinished Potions"},
    desc:{pt:"Combine clean ranarr + vial of water. AFK.",en:"Combine clean ranarr + vial of water. AFK."},
    reqs:{15:25},
    inputs:[{id:259,qty:1,name:"Clean ranarr"},{id:2481,qty:1,name:"Vial of water"}], outputs:[{id:99,qty:1,name:"Ranarr potion (unf)"}], actionsPerHour:2800,
    wiki:"https://runescape.wiki/w/Money_making_guide/Making_ranarr_potions_(unf)" },
  { id:"smelt_steel_bars", cat:"processing", intensity:"moderate", members:false, gp:3000000,
    name:{pt:"Fundir Barras de Aço",en:"Smelt Steel Bars"},
    desc:{pt:"Fundição com 2 coal + 1 iron ore. Blast furnace recomendado.",en:"Smelting with 2 coal + 1 iron ore. Blast Furnace recommended."},
    reqs:{13:30},
    inputs:[{id:453,qty:2,name:"Coal"},{id:440,qty:1,name:"Iron ore"}], outputs:[{id:2353,qty:1,name:"Steel bar"}], actionsPerHour:1800,
    wiki:"https://runescape.wiki/w/Money_making_guide/Smelting_steel_bars" },
  { id:"smelt_mithril_bars", cat:"processing", intensity:"moderate", members:true, gp:4200000,
    name:{pt:"Fundir Barras de Mithril",en:"Smelt Mithril Bars"},
    desc:{pt:"Fundição com coal + mithril ore.",en:"Smelting with coal + mithril ore."},
    reqs:{13:50},
    inputs:[{id:453,qty:4,name:"Coal"},{id:447,qty:1,name:"Mithril ore"}], outputs:[{id:2359,qty:1,name:"Mithril bar"}], actionsPerHour:1800,
    wiki:"https://runescape.wiki/w/Money_making_guide/Smelting_mithril_bars" },
  { id:"smelt_necronium_bars", cat:"processing", intensity:"moderate", members:true, gp:6000000,
    name:{pt:"Fundir Barras de Necrônio",en:"Smelt Necronium Bars"},
    desc:{pt:"Combina com luminite. Smithing 70.",en:"Combine with luminite. Smithing 70."},
    reqs:{13:70},
    inputs:[], outputs:[], actionsPerHour:0, fixedProfit:6000000,
    wiki:"https://runescape.wiki/w/Money_making_guide/Smelting_necronium_bars" },
  { id:"cook_sharks", cat:"processing", intensity:"low", members:true, gp:2500000,
    name:{pt:"Cozinhar Tubarões",en:"Cook Sharks"},
    desc:{pt:"Cooking AFK com lucro consistente.",en:"AFK cooking with consistent profit."},
    reqs:{7:80},
    inputs:[{id:383,qty:1,name:"Raw shark"}], outputs:[{id:385,qty:1,name:"Shark"}], actionsPerHour:1400,
    wiki:"https://runescape.wiki/w/Money_making_guide/Cooking_sharks" },
  { id:"fletch_rune_arrows", cat:"processing", intensity:"low", members:true, gp:4000000,
    name:{pt:"Fletchar Rune Arrows",en:"Fletch Rune Arrows"},
    desc:{pt:"Combine rune arrowheads + arrow shafts.",en:"Combine rune arrowheads + arrow shafts."},
    reqs:{9:75},
    inputs:[{id:44,qty:15,name:"Arrow shaft"},{id:41,qty:15,name:"Rune arrowheads"}], outputs:[{id:42,qty:15,name:"Rune arrow"}], actionsPerHour:2800,
    wiki:"https://runescape.wiki/w/Money_making_guide/Fletching_rune_arrows" },
  { id:"cut_rubies", cat:"processing", intensity:"low", members:false, gp:2000000,
    name:{pt:"Cortar Rubis",en:"Cut Rubies"},
    desc:{pt:"Compre rubis brutos, corte com cinzel.",en:"Buy uncut rubies, cut with chisel."},
    reqs:{12:34},
    inputs:[{id:1619,qty:1,name:"Uncut ruby"}], outputs:[{id:1603,qty:1,name:"Ruby"}], actionsPerHour:2800,
    wiki:"https://runescape.wiki/w/Money_making_guide/Cutting_rubies" },
  { id:"cut_dragonstones", cat:"processing", intensity:"low", members:true, gp:3500000,
    name:{pt:"Cortar Dragonstones",en:"Cut Dragonstones"},
    desc:{pt:"Compre dragonstones brutas, corte.",en:"Buy uncut dragonstones, cut."},
    reqs:{12:55},
    inputs:[{id:1631,qty:1,name:"Uncut dragonstone"}], outputs:[{id:1615,qty:1,name:"Dragonstone"}], actionsPerHour:2800,
    wiki:"https://runescape.wiki/w/Money_making_guide/Cutting_dragonstones" },
  // NEW: Bones to Peaches at the Senntisten Altar (passive Prayer xp + GP)
  { id:"bones_to_peaches_senntisten", cat:"processing", intensity:"low", members:true, gp:3500000,
    name:{pt:"Bones to Peaches no Altar de Senntisten",en:"Bones to Peaches at Senntisten Altar"},
    desc:{pt:"Use ossos no altar Ectofuntus/Senntisten para spawn de peaches. Passivo, ótimo com altar próprio.",en:"Bones-to-peaches scroll bonus at the Senntisten Altar. Very passive."},
    reqs:{6:60,5:60}, quest:"The Temple at Senntisten",
    inputs:[], outputs:[], actionsPerHour:0, fixedProfit:3500000,
    wiki:"https://runescape.wiki/w/Bones_to_Peaches" },
  // NEW: Cremate frost dragon bones (Necromancy 80 wiki — Fio doesn't have it yet, fits Almost soon)
  { id:"cremate_frost_dragon_bones", cat:"processing", intensity:"moderate", members:true, gp:4500000,
    name:{pt:"Cremar Frost Dragon Bones",en:"Cremate Frost Dragon Bones"},
    desc:{pt:"Use Necromancy para cremar ossos. XP de Prayer + Necromancy + venda de bone ash.",en:"Necromancy cremation. Prayer + Necromancy XP, plus bone-ash uses."},
    reqs:{28:80},
    inputs:[], outputs:[], actionsPerHour:0, fixedProfit:4500000,
    wiki:"https://runescape.wiki/w/Cremation" },
  // NEW: Decorated Mining Urns (super passive flip — perfect for Fio at Mining 67)
  { id:"craft_decorated_mining_urns", cat:"processing", intensity:"low", members:true, gp:1800000,
    name:{pt:"Fazer Decorated Mining Urns",en:"Craft Decorated Mining Urns"},
    desc:{pt:"Crafting passivo. Vende para outros mineradores.",en:"Passive crafting. Sells well to miners."},
    reqs:{12:59,14:60},
    inputs:[], outputs:[], actionsPerHour:0, fixedProfit:1800000,
    wiki:"https://runescape.wiki/w/Decorated_mining_urn" },
  // NEW: Decorated Fishing Urns
  { id:"craft_decorated_fishing_urns", cat:"processing", intensity:"low", members:true, gp:1500000,
    name:{pt:"Fazer Decorated Fishing Urns",en:"Craft Decorated Fishing Urns"},
    desc:{pt:"Demanda alta de pescadores. Venda no GE.",en:"High demand from fishers. Sell on GE."},
    reqs:{12:71,10:75},
    inputs:[], outputs:[], actionsPerHour:0, fixedProfit:1500000,
    wiki:"https://runescape.wiki/w/Decorated_fishing_urn" },
  // NEW: Decorated Woodcutting Urns
  { id:"craft_decorated_wc_urns", cat:"processing", intensity:"low", members:true, gp:1400000,
    name:{pt:"Fazer Decorated Woodcutting Urns",en:"Craft Decorated Woodcutting Urns"},
    desc:{pt:"Demanda alta de WC. Vendido no GE.",en:"High demand from WC players. Sells on GE."},
    reqs:{12:65,8:60},
    inputs:[], outputs:[], actionsPerHour:0, fixedProfit:1400000,
    wiki:"https://runescape.wiki/w/Decorated_woodcutting_urn" },

  // ======== GATHERING (mining / fishing / wc / hunter / divination / archaeology) ========
  { id:"mine_runite_ore", cat:"gathering", intensity:"moderate", members:true, gp:3000000,
    name:{pt:"Minerar Runite Ore",en:"Mine Runite Ore"},
    desc:{pt:"Mining de alto nível, boa renda passiva.",en:"High-level mining, good passive income."},
    reqs:{14:50},
    inputs:[], outputs:[], actionsPerHour:0, fixedProfit:3000000,
    wiki:"https://runescape.wiki/w/Money_making_guide/Mining_runite_ore" },
  { id:"mine_luminite", cat:"gathering", intensity:"moderate", members:true, gp:2200000,
    name:{pt:"Minerar Luminite",en:"Mine Luminite"},
    desc:{pt:"Mineral útil para barras de rune e necronium.",en:"Useful ore for rune and necronium bars."},
    reqs:{14:40},
    inputs:[], outputs:[], actionsPerHour:0, fixedProfit:2200000,
    wiki:"https://runescape.wiki/w/Money_making_guide/Mining_luminite" },
  { id:"mine_iron_ore", cat:"gathering", intensity:"moderate", members:false, gp:1500000,
    name:{pt:"Minerar Iron Ore",en:"Mine Iron Ore"},
    desc:{pt:"Sem requisitos altos, bom para iniciantes.",en:"No high requirements, good for beginners."},
    reqs:{14:15},
    inputs:[], outputs:[], actionsPerHour:0, fixedProfit:1500000,
    wiki:"https://runescape.wiki/w/Money_making_guide/Mining_iron_ore" },
  { id:"fish_sharks", cat:"gathering", intensity:"low", members:true, gp:1800000,
    name:{pt:"Pescar Tubarões",en:"Fish Sharks"},
    desc:{pt:"AFK com bom lucro. Fishing Guild recomendado.",en:"AFK with good profit. Fishing Guild recommended."},
    reqs:{10:76},
    inputs:[], outputs:[], actionsPerHour:0, fixedProfit:1800000,
    wiki:"https://runescape.wiki/w/Money_making_guide/Fishing_sharks" },
  { id:"fish_sailfish", cat:"gathering", intensity:"moderate", members:true, gp:4500000,
    name:{pt:"Pescar Sailfish",en:"Fish Sailfish"},
    desc:{pt:"Pesca de alto nível em Deep Sea. Requer Deadliest Catch.",en:"High-level Deep Sea fishing. Requires Deadliest Catch."},
    reqs:{10:97}, quest:"Deadliest Catch",
    inputs:[], outputs:[], actionsPerHour:0, fixedProfit:4500000,
    wiki:"https://runescape.wiki/w/Money_making_guide/Fishing_sailfish" },
  { id:"catch_whirligigs_gliding", cat:"gathering", intensity:"high", members:true, gp:7863000,
    name:{pt:"Capturar Whirligigs (Gliding)",en:"Catch Whirligigs (Gliding)"},
    desc:{pt:"Hunter de nível médio com bom lucro.",en:"Mid-level Hunter with good profit."},
    reqs:{21:30},
    inputs:[], outputs:[], actionsPerHour:0, fixedProfit:7863000,
    wiki:"https://runescape.wiki/w/Money_making_guide/Catching_whirligigs_(Gliding)" },
  { id:"catch_whirligigs_speedy", cat:"gathering", intensity:"high", members:true, gp:7708000,
    name:{pt:"Capturar Whirligigs (Speedy)",en:"Catch Whirligigs (Speedy)"},
    desc:{pt:"Hunter de alto nível, variante rápida.",en:"High-level Hunter, speedy variant."},
    reqs:{21:90},
    inputs:[], outputs:[], actionsPerHour:0, fixedProfit:7708000,
    wiki:"https://runescape.wiki/w/Money_making_guide/Catching_whirligigs_(Speedy)" },
  { id:"wc_elder_logs", cat:"gathering", intensity:"low", members:true, gp:2500000,
    name:{pt:"Cortar Elder Logs",en:"Chop Elder Logs"},
    desc:{pt:"Woodcutting AFK com logs valiosos.",en:"AFK Woodcutting with valuable logs."},
    reqs:{8:90},
    inputs:[], outputs:[], actionsPerHour:0, fixedProfit:2500000,
    wiki:"https://runescape.wiki/w/Money_making_guide/Chopping_elder_logs" },
  { id:"wc_magic_logs", cat:"gathering", intensity:"low", members:true, gp:1200000,
    name:{pt:"Cortar Magic Logs",en:"Chop Magic Logs"},
    desc:{pt:"Woodcutting semi-AFK.",en:"Semi-AFK woodcutting."},
    reqs:{8:75},
    inputs:[], outputs:[], actionsPerHour:0, fixedProfit:1200000,
    wiki:"https://runescape.wiki/w/Money_making_guide/Chopping_magic_logs" },
  { id:"hunt_red_chins", cat:"gathering", intensity:"high", members:true, gp:5000000,
    name:{pt:"Caçar Red Chinchompas",en:"Hunt Red Chinchompas"},
    desc:{pt:"Hunter popular com bom GP/hr.",en:"Popular Hunter method with good GP/hr."},
    reqs:{21:63},
    inputs:[], outputs:[], actionsPerHour:0, fixedProfit:5000000,
    wiki:"https://runescape.wiki/w/Money_making_guide/Hunting_red_chinchompas" },
  { id:"hunt_black_chins", cat:"gathering", intensity:"high", members:true, gp:8000000,
    name:{pt:"Caçar Black Chinchompas",en:"Hunt Black Chinchompas"},
    desc:{pt:"Wilderness - arriscado mas muito lucrativo.",en:"Wilderness - risky but very profitable."},
    reqs:{21:73},
    inputs:[], outputs:[], actionsPerHour:0, fixedProfit:8000000,
    wiki:"https://runescape.wiki/w/Money_making_guide/Hunting_black_chinchompas" },
  { id:"div_incandescent", cat:"gathering", intensity:"low", members:true, gp:5000000,
    name:{pt:"Coletar Incandescent Energy",en:"Harvest Incandescent Energy"},
    desc:{pt:"Divination de alto nível, AFK.",en:"High-level Divination, AFK."},
    reqs:{25:95},
    inputs:[], outputs:[], actionsPerHour:0, fixedProfit:5000000,
    wiki:"https://runescape.wiki/w/Money_making_guide/Harvesting_incandescent_energy" },
  { id:"div_luminous", cat:"gathering", intensity:"low", members:true, gp:3000000,
    name:{pt:"Coletar Luminous Energy",en:"Harvest Luminous Energy"},
    desc:{pt:"Divination de nível médio-alto, AFK.",en:"Mid-high Divination, AFK."},
    reqs:{25:90},
    inputs:[], outputs:[], actionsPerHour:0, fixedProfit:3000000,
    wiki:"https://runescape.wiki/w/Money_making_guide/Harvesting_luminous_energy" },
  { id:"div_radiant", cat:"gathering", intensity:"low", members:true, gp:2000000,
    name:{pt:"Coletar Radiant Energy",en:"Harvest Radiant Energy"},
    desc:{pt:"Divination acessível.",en:"Accessible Divination."},
    reqs:{25:85},
    inputs:[], outputs:[], actionsPerHour:0, fixedProfit:2000000,
    wiki:"https://runescape.wiki/w/Money_making_guide/Harvesting_radiant_energy" },
  // NEW: Wisp colonies — relevant for Decxus/Fio progression
  { id:"div_brilliant_wisps", cat:"gathering", intensity:"low", members:true, gp:1100000,
    name:{pt:"Wisps Brilliant",en:"Harvest Brilliant Energy"},
    desc:{pt:"Divination AFK acessível ainda no nível 70.",en:"AFK Divination accessible at level 70."},
    reqs:{25:70},
    inputs:[], outputs:[], actionsPerHour:0, fixedProfit:1100000,
    wiki:"https://runescape.wiki/w/Brilliant_energy" },
  // NEW: Big Game Hunter (Hunter mid-high)
  { id:"big_game_hunter", cat:"gathering", intensity:"high", members:true, gp:6500000,
    name:{pt:"Big Game Hunter",en:"Big Game Hunter"},
    desc:{pt:"Caçada de bichos grandes em equipe ou solo. Drops de marfim.",en:"Hunt large beasts solo/duo. Tusk drops sell well."},
    reqs:{21:75,16:50},
    inputs:[], outputs:[], actionsPerHour:0, fixedProfit:6500000,
    wiki:"https://runescape.wiki/w/Big_Game_Hunter" },
  // NEW: Sandstone collection (Decxus-friendly: Mining 35)
  { id:"sandstone_dailyish", cat:"gathering", intensity:"moderate", members:true, gp:600000,
    name:{pt:"Coletar Sandstone (Menaphos)",en:"Mine Sandstone (Menaphos)"},
    desc:{pt:"Mineração leve para iniciantes em Menaphos. Pedras vendem bem.",en:"Easy Menaphos mining for beginners. Stones sell to crafters."},
    reqs:{14:35},
    inputs:[], outputs:[], actionsPerHour:0, fixedProfit:600000,
    wiki:"https://runescape.wiki/w/Sandstone" },
  // NEW: Kethsi Ruins archaeology (Fio at ARC 31, ~10 levels off — appears in 'almost')
  { id:"arch_kethsi", cat:"gathering", intensity:"low", members:true, gp:2400000,
    name:{pt:"Excavar Kethsi Ruins",en:"Excavate Kethsi Ruins"},
    desc:{pt:"Archaeology AFK em sítio antigo. Drops de elven artefacts.",en:"AFK Archaeology dig site. Elven artefact drops."},
    reqs:{27:42},
    inputs:[], outputs:[], actionsPerHour:0, fixedProfit:2400000,
    wiki:"https://runescape.wiki/w/Kethsi_Ruins" },

  // ======== COMBAT LOW ========
  { id:"kill_giant_mimic", cat:"combat", intensity:"low", members:true, gp:14381000,
    name:{pt:"Matar Giant Mimic (Beginner)",en:"Kill Giant Mimic (Beginner)"},
    desc:{pt:"Boss com dificuldade variável. Drops valiosos.",en:"Boss with variable difficulty. Valuable drops."},
    reqs:{}, recReqs:{0:30},
    inputs:[], outputs:[], actionsPerHour:0, fixedProfit:14381000,
    wiki:"https://runescape.wiki/w/Money_making_guide/Killing_the_Giant_Mimic_(Beginner)" },
  { id:"kill_tortoises", cat:"combat", intensity:"high", members:true, gp:3090000,
    name:{pt:"Matar Tartarugas",en:"Kill Tortoises"},
    desc:{pt:"Drops de gold charms e tortoise shells.",en:"Drops gold charms and tortoise shells."},
    reqs:{}, recReqs:{0:41},
    inputs:[], outputs:[], actionsPerHour:0, fixedProfit:3090000,
    wiki:"https://runescape.wiki/w/Money_making_guide/Killing_tortoises" },
  { id:"kill_chickens", cat:"combat", intensity:"high", members:false, gp:2235000,
    name:{pt:"Matar Galinhas",en:"Kill Chickens"},
    desc:{pt:"Coleta de feathers. Sem requisitos. F2P.",en:"Collect feathers. No requirements. F2P."},
    reqs:{},
    inputs:[], outputs:[], actionsPerHour:0, fixedProfit:2235000,
    wiki:"https://runescape.wiki/w/Money_making_guide/Killing_chickens" },
  { id:"kill_cows", cat:"combat", intensity:"high", members:false, gp:845000,
    name:{pt:"Matar Vacas",en:"Kill Cows"},
    desc:{pt:"Collect cowhides para curtir. Iniciante.",en:"Collect cowhides for tanning. Beginner."},
    reqs:{},
    inputs:[], outputs:[], actionsPerHour:0, fixedProfit:845000,
    wiki:"https://runescape.wiki/w/Money_making_guide/Killing_cows" },
  { id:"kill_basilisks", cat:"combat", intensity:"low", members:true, gp:1800000,
    name:{pt:"Matar Basiliscos",en:"Kill Basilisks"},
    desc:{pt:"Slayer task. Mirror shield necessário.",en:"Slayer task. Mirror shield needed."},
    reqs:{18:40,1:20},
    inputs:[], outputs:[], actionsPerHour:0, fixedProfit:1800000,
    wiki:"https://runescape.wiki/w/Money_making_guide/Killing_basilisks" },

  // ======== COMBAT MID ========
  { id:"kill_hellhounds", cat:"combat", intensity:"high", members:true, gp:22413000,
    name:{pt:"Matar Hellhounds",en:"Kill Hellhounds"},
    desc:{pt:"Drops excelentes com Soul Split. Taverley Dungeon.",en:"Excellent drops with Soul Split. Taverley Dungeon."},
    reqs:{0:45,1:45}, recReqs:{5:92,18:68},
    inputs:[], outputs:[], actionsPerHour:0, fixedProfit:22413000,
    wiki:"https://runescape.wiki/w/Money_making_guide/Killing_hellhounds" },
  { id:"kill_spiritual_warriors", cat:"combat", intensity:"moderate", members:true, gp:8000000,
    name:{pt:"Matar Spiritual Warriors",en:"Kill Spiritual Warriors"},
    desc:{pt:"GWD1 - bons drops de rune items.",en:"GWD1 - good rune item drops."},
    reqs:{18:68,0:70},
    inputs:[], outputs:[], actionsPerHour:0, fixedProfit:8000000,
    wiki:"https://runescape.wiki/w/Money_making_guide/Killing_spiritual_warriors" },
  { id:"kill_arch_glacor_nm", cat:"combat", intensity:"moderate", members:true, gp:12000000,
    name:{pt:"Matar Arch-Glacor (Normal)",en:"Kill Arch-Glacor (Normal Mode)"},
    desc:{pt:"Boss customizável. Mecânicas desligáveis.",en:"Customizable boss. Toggle-off mechanics."},
    reqs:{}, recReqs:{0:80,1:80},
    inputs:[], outputs:[], actionsPerHour:0, fixedProfit:12000000,
    wiki:"https://runescape.wiki/w/Money_making_guide/Killing_Arch-Glacor_(normal_mode)" },
  { id:"kill_barrows", cat:"combat", intensity:"moderate", members:true, gp:6000000,
    name:{pt:"Matar Barrows Brothers",en:"Kill Barrows Brothers"},
    desc:{pt:"Minigame clássico com loot consistente.",en:"Classic minigame with consistent loot."},
    reqs:{}, recReqs:{0:60,6:50,5:43},
    inputs:[], outputs:[], actionsPerHour:0, fixedProfit:6000000,
    wiki:"https://runescape.wiki/w/Money_making_guide/Barrows" },
  { id:"kill_gwd1_kreearra", cat:"combat", intensity:"high", members:true, gp:15000000,
    name:{pt:"Matar Kree'arra (Armadyl)",en:"Kill Kree'arra (Armadyl)"},
    desc:{pt:"GWD1 boss. Armadyl armour drops.",en:"GWD1 boss. Armadyl armour drops."},
    reqs:{4:70,0:70,1:70}, quest:"Troll Stronghold",
    inputs:[], outputs:[], actionsPerHour:0, fixedProfit:15000000,
    wiki:"https://runescape.wiki/w/Money_making_guide/Killing_Kree'arra" },
  { id:"kill_gwd1_graardor", cat:"combat", intensity:"high", members:true, gp:10000000,
    name:{pt:"Matar General Graardor (Bandos)",en:"Kill General Graardor (Bandos)"},
    desc:{pt:"GWD1 boss. Bandos armour drops.",en:"GWD1 boss. Bandos armour drops."},
    reqs:{2:70,0:70,1:70}, quest:"Troll Stronghold",
    inputs:[], outputs:[], actionsPerHour:0, fixedProfit:10000000,
    wiki:"https://runescape.wiki/w/Money_making_guide/Killing_General_Graardor" },
  // NEW: GWD2 — Vindicta (cheap entry)
  { id:"kill_gwd2_vindicta", cat:"combat", intensity:"high", members:true, gp:11000000,
    name:{pt:"Matar Vindicta (GWD2)",en:"Kill Vindicta (GWD2)"},
    desc:{pt:"GWD2 entrada cheap. Dragon Rider lance + drops.",en:"Cheap GWD2 entry. Dragon Rider lance + drops."},
    reqs:{0:80,1:80}, quest:"Fate of the Gods",
    inputs:[], outputs:[], actionsPerHour:0, fixedProfit:11000000,
    wiki:"https://runescape.wiki/w/Money_making_guide/Killing_Vindicta" },
  // NEW: GWD2 — Twin Furies (mid combat req)
  { id:"kill_gwd2_twinfuries", cat:"combat", intensity:"high", members:true, gp:9500000,
    name:{pt:"Matar Twin Furies (GWD2)",en:"Kill Twin Furies (GWD2)"},
    desc:{pt:"GWD2 dueto AOE. Drops de off-hand drygores.",en:"GWD2 AoE duo. Off-hand drygore drops."},
    reqs:{0:80,1:80}, quest:"The Mighty Fall",
    inputs:[], outputs:[], actionsPerHour:0, fixedProfit:9500000,
    wiki:"https://runescape.wiki/w/Money_making_guide/Killing_the_Twin_Furies" },
  // NEW: Vorkath (Necromancy-friendly mid-high boss)
  { id:"kill_vorkath_necro", cat:"combat", intensity:"high", members:true, gp:14000000,
    name:{pt:"Matar Vorkath (Necromancy)",en:"Kill Vorkath (Necromancy)"},
    desc:{pt:"Boss com Necromancy. Drops dragonbones e alchables.",en:"Necromancy-friendly boss. Dragonbones + alch drops."},
    reqs:{28:70,1:70}, quest:"Defender of Varrock",
    inputs:[], outputs:[], actionsPerHour:0, fixedProfit:14000000,
    wiki:"https://runescape.wiki/w/Vorkath" },

  // ======== COMBAT HIGH ========
  { id:"kill_nex", cat:"combat", intensity:"high", members:true, gp:42000000,
    name:{pt:"Matar Nex",en:"Kill Nex"},
    desc:{pt:"Boss end-game em GWD. T80 drops.",en:"End-game boss in GWD. T80 drops."},
    reqs:{0:70,4:70,16:70,3:70},
    inputs:[], outputs:[], actionsPerHour:0, fixedProfit:42000000,
    wiki:"https://runescape.wiki/w/Money_making_guide/Killing_Nex" },
  { id:"kill_ed3_trash", cat:"combat", intensity:"high", members:true, gp:18000000,
    name:{pt:"ED3 Trash Runs",en:"ED3 Trash Runs"},
    desc:{pt:"Elite Dungeon 3 sem bosses. XP + GP.",en:"Elite Dungeon 3 without bosses. XP + GP."},
    reqs:{}, recReqs:{0:80,1:80,6:80},
    inputs:[], outputs:[], actionsPerHour:0, fixedProfit:18000000,
    wiki:"https://runescape.wiki/w/Money_making_guide/Killing_monsters_in_ED3" },
  { id:"kill_croesus_4man", cat:"combat", intensity:"high", members:true, gp:41732000,
    name:{pt:"Croesus (4 jogadores)",en:"Croesus (4-man)"},
    desc:{pt:"Boss de skilling. 80+ em 4 gathering skills.",en:"Skilling boss. 80+ in 4 gathering skills."},
    reqs:{14:80,10:80,8:80,21:80},
    inputs:[], outputs:[], actionsPerHour:0, fixedProfit:41732000,
    wiki:"https://runescape.wiki/w/Money_making_guide/Defeating_Croesus_(4-person)" },
  // NEW: Croesus solo / duo (lower entry)
  { id:"kill_croesus_solo", cat:"combat", intensity:"high", members:true, gp:18000000,
    name:{pt:"Croesus (solo/duo)",en:"Croesus (solo/duo)"},
    desc:{pt:"Boss de skilling em ritmo menor. Mining/Fishing/WC/Hunter 75+.",en:"Skilling boss at lower pace. Mining/Fishing/WC/Hunter 75+."},
    reqs:{14:75,10:75,8:75,21:75},
    inputs:[], outputs:[], actionsPerHour:0, fixedProfit:18000000,
    wiki:"https://runescape.wiki/w/Croesus" },
  // NEW: Necromancy bossing — Rasial (aspirational for Fio at NEC 72)
  { id:"kill_rasial", cat:"combat", intensity:"high", members:true, gp:35000000,
    name:{pt:"Matar Rasial, the First Necromancer",en:"Kill Rasial, the First Necromancer"},
    desc:{pt:"Boss Necromancy end-game. Drops do Necromancy gear T95.",en:"End-game Necromancy boss. T95 Necromancy gear drops."},
    reqs:{28:92}, quest:"The Spirit of War",
    inputs:[], outputs:[], actionsPerHour:0, fixedProfit:35000000,
    wiki:"https://runescape.wiki/w/Rasial,_the_First_Necromancer" },
  // NEW: Zamorak in Necropolis (entry 80, full mode 110+)
  { id:"kill_zamorak_entry", cat:"combat", intensity:"high", members:true, gp:24000000,
    name:{pt:"Zamorak (Necropolis, Story)",en:"Zamorak (Necropolis, Story Mode)"},
    desc:{pt:"Modo história aprende mecânicas; full mode pinga 60M+/h.",en:"Story mode for learning; full mode tops 60M+/h."},
    reqs:{28:80}, quest:"Aftermath",
    inputs:[], outputs:[], actionsPerHour:0, fixedProfit:24000000,
    wiki:"https://runescape.wiki/w/Zamorak,_Lord_of_Chaos" },
  // NEW: Solak (high-end aspirational)
  { id:"kill_solak", cat:"combat", intensity:"high", members:true, gp:30000000,
    name:{pt:"Matar Solak",en:"Kill Solak"},
    desc:{pt:"Boss em equipe. Erethdor's grimoire e Merethiel's lance.",en:"Team boss. Erethdor's grimoire & Merethiel's lance drops."},
    reqs:{0:90,1:90,4:90,6:90}, quest:"The Light Within",
    inputs:[], outputs:[], actionsPerHour:0, fixedProfit:30000000,
    wiki:"https://runescape.wiki/w/Solak" },
  // NEW: Kerapac (high-end)
  { id:"kill_kerapac", cat:"combat", intensity:"high", members:true, gp:28000000,
    name:{pt:"Matar Kerapac, the Bound",en:"Kill Kerapac, the Bound"},
    desc:{pt:"Solo end-game. Dragonbreath shield e Roar of Awakening.",en:"End-game solo. Dragonbreath shield + Roar of Awakening drops."},
    reqs:{0:90,1:90,4:90,6:90,28:80}, quest:"Desperate Times",
    inputs:[], outputs:[], actionsPerHour:0, fixedProfit:28000000,
    wiki:"https://runescape.wiki/w/Kerapac,_the_bound" },
  // NEW: Telos (high-end)
  { id:"kill_telos", cat:"combat", intensity:"high", members:true, gp:50000000,
    name:{pt:"Matar Telos, the Warden",en:"Kill Telos, the Warden"},
    desc:{pt:"Boss escalável. Drops de armas tier 92.",en:"Scaling end-game boss. Tier 92 weapon drops."},
    reqs:{0:80,1:80,4:80,6:80}, quest:"Heart of Stone",
    inputs:[], outputs:[], actionsPerHour:0, fixedProfit:50000000,
    wiki:"https://runescape.wiki/w/Telos,_the_Warden" },

  // ======== COLLECTING (daily/run-based) ========
  { id:"collect_red_sandstone", cat:"collecting", intensity:"low", members:true, gp:1500000,
    name:{pt:"Coletar Red Sandstone (diário)",en:"Collect Red Sandstone (daily)"},
    desc:{pt:"Minere red sandstone diariamente. Rápido e fácil.",en:"Mine red sandstone daily. Quick and easy."},
    reqs:{14:81},
    inputs:[], outputs:[], actionsPerHour:0, fixedProfit:1500000, daily:true,
    wiki:"https://runescape.wiki/w/Money_making_guide/Collecting_red_sandstone" },
  { id:"collect_crystal_sandstone", cat:"collecting", intensity:"low", members:true, gp:1200000,
    name:{pt:"Coletar Crystal Sandstone (diário)",en:"Collect Crystal Sandstone (daily)"},
    desc:{pt:"Requer acesso a Prifddinas.",en:"Requires access to Prifddinas."},
    reqs:{14:81}, quest:"Plague's End",
    inputs:[], outputs:[], actionsPerHour:0, fixedProfit:1200000, daily:true,
    wiki:"https://runescape.wiki/w/Money_making_guide/Collecting_crystal_sandstone" },
  { id:"shop_runs_runes", cat:"collecting", intensity:"low", members:true, gp:3000000,
    name:{pt:"Shop Run de Runas (diário)",en:"Rune Shop Run (daily)"},
    desc:{pt:"Compre runas baratas em NPCs, venda no GE.",en:"Buy cheap runes from NPCs, sell on GE."},
    reqs:{},
    inputs:[], outputs:[], actionsPerHour:0, fixedProfit:3000000, daily:true,
    wiki:"https://runescape.wiki/w/Money_making_guide/Buying_runes" },
  { id:"shop_runs_feathers", cat:"collecting", intensity:"low", members:false, gp:1000000,
    name:{pt:"Comprar Feathers (diário)",en:"Buy Feathers (daily)"},
    desc:{pt:"Compre feathers de NPCs, venda no GE. F2P.",en:"Buy feathers from NPCs, sell on GE. F2P."},
    reqs:{},
    inputs:[], outputs:[], actionsPerHour:0, fixedProfit:1000000, daily:true,
    wiki:"https://runescape.wiki/w/Money_making_guide/Buying_feathers" },
  // NEW: Wines of Zamorak (Decxus-friendly: low-mid Magic + Telegrab)
  { id:"steal_wines_zamorak", cat:"collecting", intensity:"moderate", members:true, gp:2200000,
    name:{pt:"Roubar Wines of Zamorak (Telegrab)",en:"Steal Wines of Zamorak (Telegrab)"},
    desc:{pt:"Use Telekinetic Grab no templo. Decxus-friendly: 33 Magic.",en:"Telekinetic Grab in the temple. Decxus-friendly: 33 Magic."},
    reqs:{6:33},
    inputs:[], outputs:[], actionsPerHour:0, fixedProfit:2200000,
    wiki:"https://runescape.wiki/w/Money_making_guide/Telegrabbing_wines_of_Zamorak" },
  // NEW: Bork (daily, no requirements)
  { id:"kill_bork_daily", cat:"collecting", intensity:"low", members:true, gp:600000,
    name:{pt:"Matar Bork (diário)",en:"Kill Bork (daily)"},
    desc:{pt:"Daily quick boss. Drops de uncuts e charms.",en:"Quick daily boss. Uncut gem + charm drops."},
    reqs:{}, quest:"Hunt for Surok",
    inputs:[], outputs:[], actionsPerHour:0, fixedProfit:600000, daily:true,
    wiki:"https://runescape.wiki/w/Bork" },
  // NEW: Penguin Hide and Seek (weekly, 5 mins, ~265k Slayer XP / week + gp)
  { id:"penguin_hide_seek", cat:"collecting", intensity:"low", members:true, gp:300000,
    name:{pt:"Penguin Hide and Seek (semanal)",en:"Penguin Hide and Seek (weekly)"},
    desc:{pt:"Encontre pinguins. XP + GP semanal.",en:"Find penguins. Weekly XP + GP."},
    reqs:{},
    inputs:[], outputs:[], actionsPerHour:0, fixedProfit:300000, daily:true,
    wiki:"https://runescape.wiki/w/Penguin_Hide_and_Seek" },
  // NEW: Eclectic impling jars hunt
  { id:"eclectic_implings", cat:"collecting", intensity:"moderate", members:true, gp:2000000,
    name:{pt:"Caçar Eclectic Implings",en:"Hunt Eclectic Implings"},
    desc:{pt:"Puro Hunter, Puro Essence drop chance.",en:"Pure Hunter, chance at clue scrolls."},
    reqs:{21:50},
    inputs:[], outputs:[], actionsPerHour:0, fixedProfit:2000000,
    wiki:"https://runescape.wiki/w/Eclectic_impling_jar" },

  // ======== RECURRING (passive / weekly setups) ========
  { id:"fort_forinthry_frames", cat:"recurring", intensity:"low", members:true, gp:4000000,
    name:{pt:"Fort Forinthry: Stone Wall Segments",en:"Fort Forinthry: Stone Wall Segments"},
    desc:{pt:"Construa segmentos de parede de pedra automaticamente.",en:"Build stone wall segments automatically."},
    reqs:{},
    inputs:[], outputs:[], actionsPerHour:0, fixedProfit:4000000,
    wiki:"https://runescape.wiki/w/Money_making_guide/Making_stone_wall_segments" },
  { id:"kingdom_miscellania", cat:"recurring", intensity:"low", members:true, gp:2000000,
    name:{pt:"Gestão de Miscellania",en:"Managing Miscellania"},
    desc:{pt:"Renda passiva do Kingdom. Requer Throne of Miscellania.",en:"Passive income from Kingdom. Requires Throne of Miscellania."},
    reqs:{}, quest:"Throne of Miscellania",
    inputs:[], outputs:[], actionsPerHour:0, fixedProfit:2000000, daily:true,
    wiki:"https://runescape.wiki/w/Money_making_guide/Managing_Miscellania" },
  { id:"player_owned_farm", cat:"recurring", intensity:"low", members:true, gp:3000000,
    name:{pt:"Player Owned Farm",en:"Player Owned Farm"},
    desc:{pt:"Crie e venda animais. Farming passivo.",en:"Breed and sell animals. Passive Farming."},
    reqs:{19:35},
    inputs:[], outputs:[], actionsPerHour:0, fixedProfit:3000000,
    wiki:"https://runescape.wiki/w/Money_making_guide/Player-owned_farm" },
  // NEW: Player-Owned Ports (weekly recurring, big GP)
  { id:"player_owned_ports", cat:"recurring", intensity:"low", members:true, gp:5000000,
    name:{pt:"Player-Owned Ports (semanal)",en:"Player-Owned Ports (weekly)"},
    desc:{pt:"Voyages semanais retornam recursos vendáveis. Quase passivo.",en:"Weekly voyages return tradable resources. Near passive."},
    reqs:{8:90,10:90,21:90,5:90,9:90}, quest:"The Jack of Spades",
    inputs:[], outputs:[], actionsPerHour:0, fixedProfit:5000000, daily:true,
    wiki:"https://runescape.wiki/w/Player-owned_port" },
  // NEW: Artisans' Workshop (smithing/mining trade with rep)
  { id:"artisans_workshop", cat:"recurring", intensity:"moderate", members:true, gp:1800000,
    name:{pt:"Artisans' Workshop",en:"Artisans' Workshop"},
    desc:{pt:"Forje barras e venda hammers tipados por reputação.",en:"Forge bars; trade rep for goldsmith gauntlets etc."},
    reqs:{13:30,14:30},
    inputs:[], outputs:[], actionsPerHour:0, fixedProfit:1800000,
    wiki:"https://runescape.wiki/w/Artisans'_Workshop" },
  // NEW: Divine farming patches (passive Farming income)
  { id:"divine_locations", cat:"recurring", intensity:"low", members:true, gp:1200000,
    name:{pt:"Divine Locations (diário)",en:"Divine Locations (daily)"},
    desc:{pt:"Memórias de Divination criam pontos coletáveis 24h.",en:"Divination memories spawn daily harvestable nodes."},
    reqs:{25:60},
    inputs:[], outputs:[], actionsPerHour:0, fixedProfit:1200000, daily:true,
    wiki:"https://runescape.wiki/w/Divine_location" },
];

// ---- GE Prices ----
let gePrices = {};
let _gePriceSource = "none";
let _gePriceTime = null;

async function loadGEPrices() {
  const ids = new Set();
  for (const m of MONEY_METHODS) {
    for (const inp of m.inputs || []) if (inp.id) ids.add(inp.id);
    for (const out of m.outputs || []) if (out.id) ids.add(out.id);
  }
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

function getPrice(itemId) {
  const p = gePrices[String(itemId)];
  return p && p.price > 0 ? p.price : 0;
}

function calcProfit(method) {
  if (method.fixedProfit) return method.fixedProfit;
  if (!method.inputs?.length || !method.outputs?.length || !method.actionsPerHour) return method.gp || 0;
  let inputCost = 0;
  let missingPrice = false;
  for (const inp of method.inputs) {
    const p = getPrice(inp.id);
    if (p === 0 && !inp.extraCost) missingPrice = true;
    inputCost += (p + (inp.extraCost || 0)) * inp.qty;
  }
  let outputValue = 0;
  for (const out of method.outputs) {
    const p = getPrice(out.id);
    if (p === 0) missingPrice = true;
    outputValue += p * out.qty;
  }
  if (missingPrice) return method.gp || 0;
  const profitPerAction = outputValue - inputCost;
  const calculated = profitPerAction * method.actionsPerHour;
  return calculated > 0 ? calculated : method.gp || 0;
}

// ---- Eligibility ----
function canDoMethod(player, method) {
  for (const [skillId, reqLevel] of Object.entries(method.reqs || {})) {
    const sk = player.skills[Number(skillId)];
    if (!sk || sk.level < reqLevel) return false;
  }
  if (method.quest && typeof hasQuest === "function" && !hasQuest(player, method.quest)) return false;
  return true;
}

function isAlmostUnlocked(player, method) {
  if (canDoMethod(player, method)) return false;
  if (method.quest && typeof hasQuest === "function" && !hasQuest(player, method.quest)) return false;
  for (const [skillId, reqLevel] of Object.entries(method.reqs || {})) {
    const sk = player.skills[Number(skillId)];
    const cur = sk ? sk.level : 1;
    if (reqLevel - cur > 10) return false;
  }
  return true;
}

function getSkillGaps(player, method) {
  const gaps = [];
  for (const [skillId, reqLevel] of Object.entries(method.reqs || {})) {
    const sk = player.skills[Number(skillId)];
    const cur = sk ? sk.level : 1;
    const curXp = sk ? sk.xp : 0;
    if (cur < reqLevel) {
      let pct = 0;
      if (typeof xpForLevel === "function") {
        const reqXp = xpForLevel(reqLevel);
        // Smaller, more useful: % toward target XP from current cur-floor
        const floorXp = xpForLevel(cur);
        if (reqXp > floorXp) pct = Math.max(0, Math.min(100, ((curXp - floorXp) / (reqXp - floorXp)) * 100));
      }
      gaps.push({ id: Number(skillId), cur, req: reqLevel, gap: reqLevel - cur, pct });
    }
  }
  return gaps;
}

// ---- Power-Loop combos: gather + process pairs (hand-curated) ----
const POWER_LOOPS = [
  {
    id:"luminite_to_necronium",
    name:{ pt:"Minerar Luminite + Fundir Necronium", en:"Mine Luminite + Smelt Necronium" },
    desc:{ pt:"Coletar luminite enquanto cresce um estoque, depois fundir necronium para barras valiosas.", en:"Mine luminite, stockpile, then smelt necronium for valuable bars." },
    members:true, methodIds:["mine_luminite","smelt_necronium_bars"], synergyMult:1.15,
  },
  {
    id:"mining_urns_combo",
    name:{ pt:"Minerar Runite + Decorated Mining Urns", en:"Mine Runite + Decorated Mining Urns" },
    desc:{ pt:"Mining é mais rápido com urnas; produza-as e venda o excesso.", en:"Urns boost mining and sell on GE for double profit." },
    members:true, methodIds:["mine_runite_ore","craft_decorated_mining_urns"], synergyMult:1.10,
  },
  {
    id:"hide_to_leather",
    name:{ pt:"Caçar Red Chins + Curtir Red D'hide", en:"Hunt Red Chins + Tan Red D'hide" },
    desc:{ pt:"Hunter ativo + flip passivo de couros para variar a tarefa.", en:"Active Hunter + passive hide flip for task variety." },
    members:true, methodIds:["hunt_red_chins","tan_red_dhide"], synergyMult:1.08,
  },
];

// ---- Rendering ----
const CAT_LABELS = {
  processing: { pt: "Processamento", en: "Processing", icon: "⚗️" },
  gathering:  { pt: "Coleta", en: "Gathering", icon: "⛏️" },
  combat:     { pt: "Combate", en: "Combat", icon: "⚔️" },
  collecting: { pt: "Coleção", en: "Collecting", icon: "🛒" },
  recurring:  { pt: "Recorrente", en: "Recurring", icon: "🔄" },
};

const INTENSITY_LABELS = {
  low:      { pt: "AFK", en: "AFK", color: "var(--green)" },
  moderate: { pt: "Médio", en: "Moderate", color: "var(--gold)" },
  high:     { pt: "Ativo", en: "Active", color: "var(--orange)" },
};

const SORT_LABELS = {
  gph:    { pt: "GP/h", en: "GP/h" },
  afk:    { pt: "AFK", en: "AFK" },
  quick:  { pt: "Quick", en: "Quick" },
};

let _moneyFilter = "available";
let _moneyCat = "all";
let _moneyPlayerIdx = 0;
let _moneySort = "gph";
let _moneyP2P = "all"; // members-only pill: "all" | "p2p"

function moneyCardHTML(m, player, lang, rank, podium) {
  const info = m.name[lang] || m.name.en;
  const desc = (m.desc[lang] || m.desc.en);
  const profitStr = m._profit > 0 ? fmtShort(m._profit) : "?";
  const catInfo = CAT_LABELS[m.cat] || { pt: m.cat, en: m.cat, icon: "📦" };
  const intInfo = INTENSITY_LABELS[m.intensity] || INTENSITY_LABELS.moderate;
  const catLabel = catInfo[lang] || catInfo.en;
  const intLabel = intInfo[lang] || intInfo.en;
  const can = canDoMethod(player, m);
  const almost = !can && m._almost;

  const reqTags = Object.entries(m.reqs || {}).map(([sid, lvl]) => {
    const sk = player.skills[Number(sid)];
    const met = sk && sk.level >= lvl;
    const sLbl = (typeof tSkill === "function") ? tSkill(Number(sid)) : sid;
    const icon = (typeof skillIconImg === "function") ? skillIconImg(Number(sid), 12) : "";
    return `<span class="mn-req ${met ? "met" : "unmet"}">${icon} ${sLbl} ${lvl}</span>`;
  }).join("");

  // Almost unlocked: progress bars instead of static gap badge
  let gapHTML = "";
  if (almost) {
    const gaps = getSkillGaps(player, m);
    gapHTML = `<div class="mn-gaps">${gaps.map(g => {
      const sLbl = (typeof tSkill === "function") ? tSkill(g.id) : g.id;
      const pct = Math.max(2, Math.round(g.pct));
      return `<div class="mn-gap-bar" title="${sLbl} ${g.cur} → ${g.req}">
        <div class="mn-gap-label"><span>${sLbl} ${g.cur}→${g.req}</span><span class="mn-gap-pct">${Math.round(g.pct)}%</span></div>
        <div class="mn-gap-track"><div class="mn-gap-fill" style="width:${pct}%"></div></div>
      </div>`;
    }).join("")}</div>`;
  }

  // Quest gate badge
  const questBadge = m.quest
    ? `<span class="mn-qbadge ${typeof hasQuest === "function" && hasQuest(player, m.quest) ? "ok" : "miss"}" title="${esc(m.quest)}">📜 ${esc(m.quest)}</span>`
    : "";

  const badges = [];
  if (m.daily) badges.push(`<span class="mn-badge mn-badge-daily">${lang === "pt" ? "Diário" : "Daily"}</span>`);
  if (almost) badges.push(`<span class="mn-badge mn-badge-soon">${lang === "pt" ? "Quase" : "Soon"}</span>`);

  const podiumCls = podium ? `mn-podium-${podium}` : "";
  const rankBadge = rank != null ? `<span class="mn-rank ${podiumCls}">#${rank}</span>` : "";

  // Item icons (inputs/outputs first)
  const itemIcons = [...(m.inputs || []), ...(m.outputs || [])]
    .slice(0, 4)
    .map(it => mnItemIcon(it.name, 16))
    .join("");

  return `<div class="mn-card ${almost ? "mn-almost" : ""} ${can ? "" : almost ? "" : "mn-locked"} ${podiumCls}">
    <div class="mn-card-head">
      ${rankBadge}
      <div class="mn-card-title">${itemIcons}<span>${info}</span>${m.members ? " <span class='mn-mem' title='Members'>⭐</span>" : ""}${badges.length ? " " + badges.join("") : ""}</div>
      <div class="mn-card-profit">${profitStr} <span class="mn-gph">gp/h</span></div>
    </div>
    <div class="mn-card-desc">${desc}</div>
    <div class="mn-card-meta">
      <span class="mn-cat">${catInfo.icon} ${catLabel}</span>
      <span class="mn-int" style="color:${intInfo.color}">${intLabel}</span>
      ${m.wiki ? `<a class="mn-wiki" href="${m.wiki}" target="_blank" rel="noopener">Wiki</a>` : ""}
    </div>
    ${reqTags ? `<div class="mn-reqs">${reqTags}${questBadge}</div>` : (questBadge ? `<div class="mn-reqs">${questBadge}</div>` : "")}
    ${gapHTML}
  </div>`;
}

function dailyBundleHTML(player, lang, all) {
  const dailies = all.filter(m => m.daily && m._can);
  if (!dailies.length) return "";
  const total = dailies.reduce((s, m) => s + (m._profit || 0), 0);
  const items = dailies.map(m =>
    `<li><span class="mn-daily-name">${m.name[lang] || m.name.en}</span><span class="mn-daily-gp">${fmtShort(m._profit)}</span></li>`
  ).join("");
  return `<div class="mn-bundle mn-bundle-daily">
    <div class="mn-bundle-head">
      <div class="mn-bundle-icon">📅</div>
      <div>
        <div class="mn-bundle-title">${lang === "pt" ? "Rotina Diária" : "Daily Routine"}</div>
        <div class="mn-bundle-sub">${dailies.length} ${lang === "pt" ? "métodos · ~" : "methods · ~"}${lang === "pt" ? "minutos por dia" : "minutes per day"}</div>
      </div>
      <div class="mn-bundle-total">${fmtShort(total)} <span>${lang === "pt" ? "/ dia" : "/ day"}</span></div>
    </div>
    <ul class="mn-daily-list">${items}</ul>
  </div>`;
}

function powerLoopsHTML(player, lang, all) {
  const lookup = Object.fromEntries(all.map(m => [m.id, m]));
  const eligibles = POWER_LOOPS.map(loop => {
    const ms = loop.methodIds.map(id => lookup[id]).filter(Boolean);
    if (ms.length !== loop.methodIds.length) return null;
    const allUnlocked = ms.every(m => m._can);
    if (!allUnlocked) return null;
    const total = ms.reduce((s, m) => s + (m._profit || 0), 0) * loop.synergyMult;
    return { loop, methods: ms, total };
  }).filter(Boolean).sort((a, b) => b.total - a.total).slice(0, 2);
  if (!eligibles.length) return "";
  return `<div class="mn-bundle mn-bundle-loop">
    <div class="mn-bundle-head">
      <div class="mn-bundle-icon">🔁</div>
      <div>
        <div class="mn-bundle-title">${lang === "pt" ? "Power Loops" : "Power Loops"}</div>
        <div class="mn-bundle-sub">${lang === "pt" ? "Combos de métodos que rendem mais juntos" : "Method combos that earn more together"}</div>
      </div>
    </div>
    <div class="mn-loops">
      ${eligibles.map(e => `
        <div class="mn-loop">
          <div class="mn-loop-head">
            <div class="mn-loop-name">${e.loop.name[lang] || e.loop.name.en}</div>
            <div class="mn-loop-total">${fmtShort(e.total)} <span class="mn-gph">gp/h</span></div>
          </div>
          <div class="mn-loop-desc">${e.loop.desc[lang] || e.loop.desc.en}</div>
          <div class="mn-loop-chain">
            ${e.methods.map((m, i) => `
              <span class="mn-loop-step">${m.name[lang] || m.name.en} <span class="mn-loop-gp">${fmtShort(m._profit)}</span></span>
              ${i < e.methods.length - 1 ? `<span class="mn-loop-arrow">→</span>` : ""}
            `).join("")}
          </div>
        </div>
      `).join("")}
    </div>
  </div>`;
}

function podiumHTML(top3, player, lang) {
  if (!top3.length) return "";
  // Order visually: 2nd, 1st, 3rd to mimic real podium
  const ordered = [];
  if (top3[1]) ordered.push({ m: top3[1], place: 2 });
  if (top3[0]) ordered.push({ m: top3[0], place: 1 });
  if (top3[2]) ordered.push({ m: top3[2], place: 3 });
  return `<div class="mn-podium">
    ${ordered.map(({ m, place }) => {
      const info = m.name[lang] || m.name.en;
      const intInfo = INTENSITY_LABELS[m.intensity] || INTENSITY_LABELS.moderate;
      const intLabel = intInfo[lang] || intInfo.en;
      const catInfo = CAT_LABELS[m.cat] || { icon: "📦", pt: m.cat, en: m.cat };
      const itemIcons = [...(m.inputs || []), ...(m.outputs || [])]
        .slice(0, 3)
        .map(it => mnItemIcon(it.name, 14))
        .join("");
      return `<div class="mn-pcard mn-pcard-${place}" data-mn-jump="${m.id}">
        <div class="mn-pmedal">${place === 1 ? "🥇" : place === 2 ? "🥈" : "🥉"}</div>
        <div class="mn-pname">${itemIcons}${info}</div>
        <div class="mn-pprofit">${fmtShort(m._profit)} <span class="mn-gph">gp/h</span></div>
        <div class="mn-pmeta">${catInfo.icon} · <span style="color:${intInfo.color}">${intLabel}</span></div>
      </div>`;
    }).join("")}
  </div>`;
}

function applyMethodSort(list, mode, player) {
  const arr = [...list];
  if (mode === "afk") {
    const intRank = { low: 0, moderate: 1, high: 2 };
    arr.sort((a, b) => (intRank[a.intensity] - intRank[b.intensity]) || (b._profit - a._profit));
  } else if (mode === "quick") {
    // Smallest total skill gap to unlock first; tie-broken by GP/h
    arr.sort((a, b) => {
      const ga = getSkillGaps(player, a).reduce((s, g) => s + g.gap, 0);
      const gb = getSkillGaps(player, b).reduce((s, g) => s + g.gap, 0);
      return ga - gb || b._profit - a._profit;
    });
  } else {
    arr.sort((a, b) => b._profit - a._profit);
  }
  return arr;
}

function renderMoney(players) {
  const lang = typeof currentLang !== "undefined" ? currentLang : "en";
  const grid = document.getElementById("money-grid");
  if (!grid || !players?.length) return;

  const player = players[Math.min(_moneyPlayerIdx, players.length - 1)];

  const all = MONEY_METHODS.map(m => ({
    ...m,
    _profit: calcProfit(m),
    _can: canDoMethod(player, m),
    _almost: isAlmostUnlocked(player, m),
  })).sort((a, b) => b._profit - a._profit);

  const available = all.filter(m => m._can);
  const almost = all.filter(m => m._almost);
  const locked = all.filter(m => !m._can && !m._almost);

  // Apply category + members filters
  const matchesFilters = m => {
    if (_moneyCat !== "all" && m.cat !== _moneyCat) return false;
    if (_moneyP2P === "p2p" && !m.members) return false;
    if (_moneyP2P === "f2p" && m.members) return false;
    return true;
  };

  let baseList;
  if (_moneyFilter === "available") baseList = available;
  else if (_moneyFilter === "upcoming") baseList = almost;
  else baseList = all;

  const filteredPre = baseList.filter(matchesFilters);
  const filtered = applyMethodSort(filteredPre, _moneyFilter === "upcoming" ? "quick" : _moneySort, player);

  // Player tabs
  let playerTabs = "";
  if (players.length > 1) {
    playerTabs = `<div class="mn-player-tabs">${players.map((p, i) =>
      `<button class="mn-ptab ${i === _moneyPlayerIdx ? "active" : ""} ${i === 0 ? "" : "p2"}" data-mn-player="${i}">${typeof esc === "function" ? esc(p.name) : p.name}</button>`
    ).join("")}</div>`;
  }

  // Price badge
  const priceLabel = _gePriceSource === "live"
    ? `<span class="mn-price-badge mn-price-live">● ${lang === "pt" ? "Preços ao vivo" : "Live prices"}</span>`
    : _gePriceSource === "cached"
      ? `<span class="mn-price-badge mn-price-cached">○ ${lang === "pt" ? "Preços em cache" : "Cached prices"}</span>`
      : `<span class="mn-price-badge">— ${lang === "pt" ? "Sem preços" : "No prices"}</span>`;

  // Filter pills
  const filterPills = `<div class="mn-filters">
    <div class="mn-filter-row">
      <button class="pill mn-fpill ${_moneyFilter === "available" ? "active" : ""}" data-mf="available">✓ ${lang === "pt" ? "Disponíveis" : "Available"} (${available.length})</button>
      <button class="pill mn-fpill ${_moneyFilter === "upcoming" ? "active" : ""}" data-mf="upcoming">⏳ ${lang === "pt" ? "Quase" : "Almost"} (${almost.length})</button>
      <button class="pill mn-fpill ${_moneyFilter === "all" ? "active" : ""}" data-mf="all">${lang === "pt" ? "Todas" : "All"} (${all.length})</button>
      ${priceLabel}
    </div>
    <div class="mn-filter-row mn-cat-row">
      <button class="pill mn-cpill ${_moneyCat === "all" ? "active" : ""}" data-mc="all">${lang === "pt" ? "Todas" : "All"}</button>
      ${Object.entries(CAT_LABELS).map(([k, v]) =>
        `<button class="pill mn-cpill ${_moneyCat === k ? "active" : ""}" data-mc="${k}">${v.icon} ${v[lang] || v.en}</button>`
      ).join("")}
    </div>
    <div class="mn-filter-row mn-sort-row">
      <span class="mn-sort-label">${lang === "pt" ? "Ordenar:" : "Sort:"}</span>
      <button class="pill mn-spill ${_moneySort === "gph" ? "active" : ""}" data-ms="gph">💰 ${SORT_LABELS.gph[lang]}</button>
      <button class="pill mn-spill ${_moneySort === "afk" ? "active" : ""}" data-ms="afk">😴 ${SORT_LABELS.afk[lang]}</button>
      <button class="pill mn-spill ${_moneySort === "quick" ? "active" : ""}" data-ms="quick">⚡ ${SORT_LABELS.quick[lang]}</button>
      <span class="mn-sep"></span>
      <button class="pill mn-p2pill ${_moneyP2P === "all" ? "active" : ""}" data-mp="all">${lang === "pt" ? "Todos" : "All"}</button>
      <button class="pill mn-p2pill ${_moneyP2P === "p2p" ? "active" : ""}" data-mp="p2p">⭐ Members</button>
      <button class="pill mn-p2pill ${_moneyP2P === "f2p" ? "active" : ""}" data-mp="f2p">F2P</button>
    </div>
  </div>`;

  // Header
  const headerText = _moneyFilter === "available"
    ? (lang === "pt" ? `Top métodos para ${player.name}` : `Top methods for ${player.name}`)
    : _moneyFilter === "upcoming"
      ? (lang === "pt" ? `Quase desbloqueados para ${player.name}` : `Almost unlocked for ${player.name}`)
      : (lang === "pt" ? "Todos os métodos" : "All methods");

  // Top sections — only when on Available + sort=gph + cat=all
  let topShowcase = "";
  if (_moneyFilter === "available" && _moneyCat === "all" && _moneyP2P === "all" && _moneySort === "gph") {
    const top3 = filtered.slice(0, 3);
    topShowcase += podiumHTML(top3, player, lang);
    topShowcase += dailyBundleHTML(player, lang, all);
    topShowcase += powerLoopsHTML(player, lang, all);
  }

  // Render cards — when "all" filter + cat=all, group by category with separators
  let cardsBody = "";
  if (_moneyFilter === "all" && _moneyCat === "all") {
    const byCat = {};
    for (const m of filtered) (byCat[m.cat] = byCat[m.cat] || []).push(m);
    const order = ["combat", "processing", "gathering", "collecting", "recurring"];
    cardsBody = order.filter(c => byCat[c] && byCat[c].length).map(c => {
      const ci = CAT_LABELS[c];
      const list = byCat[c];
      return `<div class="mn-cat-sep">${ci.icon} ${ci[lang] || ci.en} <span class="mn-cat-count">${list.length}</span></div>` +
        list.map(m => moneyCardHTML(m, player, lang, null, null)).join("");
    }).join("");
  } else {
    const top10 = filtered.slice(0, 10);
    const rest = filtered.slice(10);
    const cardsHTML = top10.map((m, i) => {
      const rank = (_moneyFilter === "available" && _moneySort === "gph") ? i + 1 : null;
      const podium = (_moneyFilter === "available" && _moneySort === "gph" && i < 3) ? (i + 1) : null;
      return moneyCardHTML(m, player, lang, rank, podium);
    }).join("");
    const restHTML = rest.length ? `
      <div id="mn-rest" style="display:none">${rest.map(m => moneyCardHTML(m, player, lang, null, null)).join("")}</div>
      <button id="mn-show-more" class="pill" style="display:block;margin:12px auto;padding:8px 24px">
        ${lang === "pt" ? "Mostrar mais" : "Show more"} (+${rest.length})
      </button>` : "";
    cardsBody = cardsHTML + restHTML;
  }

  grid.innerHTML = `
    ${playerTabs}
    ${filterPills}
    ${topShowcase}
    <div class="mn-section-title">${headerText} <span class="mn-section-count">${filtered.length}</span></div>
    ${filtered.length ? cardsBody : `<div class="mn-empty">${lang === "pt" ? "Nenhum método encontrado" : "No methods found"}</div>`}
  `;
  if (typeof attachImgFallbacks === "function") attachImgFallbacks(grid);

  moneyInjectStyles();

  // Events (do NOT break existing handlers)
  grid.querySelectorAll(".mn-fpill").forEach(b => b.addEventListener("click", () => { _moneyFilter = b.dataset.mf; renderMoney(players); }));
  grid.querySelectorAll(".mn-cpill").forEach(b => b.addEventListener("click", () => { _moneyCat = b.dataset.mc; renderMoney(players); }));
  grid.querySelectorAll(".mn-ptab").forEach(b => b.addEventListener("click", () => { _moneyPlayerIdx = Number(b.dataset.mnPlayer); renderMoney(players); }));
  grid.querySelectorAll(".mn-spill").forEach(b => b.addEventListener("click", () => { _moneySort = b.dataset.ms; renderMoney(players); }));
  grid.querySelectorAll(".mn-p2pill").forEach(b => b.addEventListener("click", () => { _moneyP2P = b.dataset.mp; renderMoney(players); }));

  const moreBtn = document.getElementById("mn-show-more");
  if (moreBtn) moreBtn.addEventListener("click", () => { document.getElementById("mn-rest").style.display = "block"; moreBtn.remove(); });
}

// ---- Styles ----
function moneyInjectStyles() {
  if (document.getElementById("mn-styles")) return;
  const s = document.createElement("style");
  s.id = "mn-styles";
  s.textContent = `
.mn-player-tabs { display:flex; justify-content:center; gap:8px; margin-bottom:14px; }
.mn-ptab { appearance:none; padding:5px 16px; border:1px solid var(--border); border-radius:100px; background:var(--bg-card); color:var(--text-2); cursor:pointer; font-size:0.73rem; font-weight:600; font-family:var(--font); transition:all .2s; }
.mn-ptab:hover { border-color:var(--border-hover); }
.mn-ptab.active { border-color:var(--gold-dim); color:var(--gold); background:var(--gold-bg); }
.mn-ptab.p2.active { border-color:var(--teal-dim); color:var(--teal); background:var(--teal-bg); }

.mn-filters { margin-bottom:14px; }
.mn-filter-row { display:flex; flex-wrap:wrap; align-items:center; gap:6px; margin-bottom:6px; }
.mn-price-badge { font-size:0.6rem; margin-left:auto; white-space:nowrap; }
.mn-price-live { color:var(--green); }
.mn-price-cached { color:var(--text-3); }
.mn-sort-label { font-size:0.62rem; color:var(--text-3); font-weight:600; text-transform:uppercase; letter-spacing:.5px; margin-right:2px; }
.mn-sep { width:1px; align-self:stretch; background:var(--border); margin:0 4px; }

.mn-section-title { font-family:var(--font-display); font-size:0.82rem; font-weight:700; color:var(--gold-bright); margin: 14px 0 10px; letter-spacing:.3px; display:flex; align-items:center; gap:8px; }
.mn-section-count { font-family:var(--font-mono); font-size:0.6rem; font-weight:700; color:var(--text-3); background:var(--bg-card-alt); border:1px solid var(--border); padding:1px 6px; border-radius:100px; }
.mn-cat-sep { font-family:var(--font-display); font-size:0.74rem; font-weight:700; color:var(--text-2); margin:14px 0 6px; padding:6px 10px; border-left:3px solid var(--gold-dim); background:var(--bg-card-alt); border-radius:var(--radius-sm); display:flex; align-items:center; gap:8px; }
.mn-cat-count { font-family:var(--font-mono); font-size:0.6rem; color:var(--text-3); }

/* Bundles (daily / loops) */
.mn-bundle { background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius); padding:14px 16px; margin-bottom:12px; }
.mn-bundle-daily { border-left:3px solid var(--purple); background:linear-gradient(180deg, var(--purple-bg) 0%, var(--bg-card) 100%); }
.mn-bundle-loop { border-left:3px solid var(--teal); background:linear-gradient(180deg, var(--teal-bg) 0%, var(--bg-card) 100%); }
.mn-bundle-head { display:flex; align-items:center; gap:12px; margin-bottom:10px; }
.mn-bundle-icon { font-size:1.5rem; line-height:1; }
.mn-bundle-title { font-family:var(--font-display); font-weight:700; font-size:0.85rem; color:var(--text); letter-spacing:.3px; }
.mn-bundle-sub { font-size:0.62rem; color:var(--text-3); margin-top:2px; }
.mn-bundle-total { margin-left:auto; font-family:var(--font-mono); font-size:1rem; font-weight:800; color:var(--green); white-space:nowrap; }
.mn-bundle-total span { font-size:0.6rem; color:var(--text-3); font-weight:500; }
.mn-daily-list { list-style:none; margin:0; padding:0; display:grid; gap:4px; }
.mn-daily-list li { display:flex; align-items:center; justify-content:space-between; gap:8px; font-size:0.72rem; padding:4px 8px; border-radius:var(--radius-xs); background:var(--bg-raised); }
.mn-daily-name { color:var(--text-2); }
.mn-daily-gp { font-family:var(--font-mono); color:var(--green); font-weight:700; font-size:0.7rem; }

.mn-loops { display:grid; gap:10px; }
.mn-loop { background:var(--bg-raised); border:1px solid var(--border); border-radius:var(--radius-sm); padding:10px 12px; }
.mn-loop-head { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:4px; }
.mn-loop-name { font-weight:700; font-size:0.74rem; color:var(--text); }
.mn-loop-total { font-family:var(--font-mono); color:var(--teal-bright); font-weight:800; font-size:0.78rem; white-space:nowrap; }
.mn-loop-desc { font-size:0.66rem; color:var(--text-3); margin-bottom:6px; line-height:1.4; }
.mn-loop-chain { display:flex; flex-wrap:wrap; align-items:center; gap:6px; }
.mn-loop-step { font-size:0.66rem; color:var(--text-2); background:var(--bg-card); border:1px solid var(--border); padding:3px 8px; border-radius:100px; }
.mn-loop-gp { font-family:var(--font-mono); color:var(--green); font-weight:700; margin-left:4px; }
.mn-loop-arrow { color:var(--text-3); font-size:0.7rem; }

/* Podium */
.mn-podium { display:grid; grid-template-columns:1fr 1.15fr 1fr; gap:8px; margin-bottom:14px; align-items:end; }
.mn-pcard { background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius); padding:10px; text-align:center; cursor:pointer; transition:transform .15s, border-color .15s; position:relative; }
.mn-pcard:hover { transform:translateY(-2px); border-color:var(--border-hover); }
.mn-pcard-1 { border-color:var(--gold-dim); background:linear-gradient(180deg, var(--gold-bg) 0%, var(--bg-card) 80%); padding:14px 10px; }
.mn-pcard-2 { border-color:rgba(180,180,200,.4); background:linear-gradient(180deg, rgba(180,180,200,.08) 0%, var(--bg-card) 80%); }
.mn-pcard-3 { border-color:rgba(196,128,80,.4); background:linear-gradient(180deg, rgba(196,128,80,.08) 0%, var(--bg-card) 80%); }
.mn-pmedal { font-size:1.5rem; line-height:1; margin-bottom:4px; }
.mn-pname { font-size:0.66rem; font-weight:700; color:var(--text); line-height:1.25; min-height:2.5em; display:flex; align-items:center; justify-content:center; gap:4px; flex-wrap:wrap; }
.mn-pprofit { font-family:var(--font-mono); font-size:0.78rem; font-weight:800; color:var(--green); margin-top:6px; }
.mn-pcard-1 .mn-pprofit { font-size:0.92rem; color:var(--gold-bright); }
.mn-pmeta { font-size:0.58rem; color:var(--text-3); margin-top:4px; }

/* Method cards */
.mn-card { background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius); padding:14px 16px; margin-bottom:8px; transition:border-color .2s; }
.mn-card:hover { border-color:var(--border-hover); }
.mn-almost { border-left:3px solid var(--orange); opacity:0.92; }
.mn-locked { opacity:0.55; }
.mn-podium-1 { border-left:3px solid var(--gold); box-shadow:0 0 0 1px var(--gold-dim) inset; }
.mn-podium-2 { border-left:3px solid rgba(200,200,220,.6); }
.mn-podium-3 { border-left:3px solid rgba(196,128,80,.7); }

.mn-card-head { display:flex; align-items:baseline; gap:8px; margin-bottom:4px; }
.mn-rank { font-family:var(--font-mono); font-size:0.65rem; font-weight:800; color:var(--gold); background:var(--gold-bg); padding:1px 6px; border-radius:100px; flex-shrink:0; }
.mn-rank.mn-podium-1 { color:var(--gold-bright); background:var(--gold-bg); border:1px solid var(--gold-dim); }
.mn-rank.mn-podium-2 { color:#cbd0e0; background:rgba(200,200,220,.1); }
.mn-rank.mn-podium-3 { color:#d99566; background:rgba(196,128,80,.12); }
.mn-card-title { font-weight:700; font-size:0.8rem; color:var(--text); flex:1; min-width:0; display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
.mn-iicon { vertical-align:middle; image-rendering:auto; }
.mn-mem { font-size:0.7em; }
.mn-card-profit { font-family:var(--font-mono); font-size:0.82rem; font-weight:800; color:var(--green); white-space:nowrap; }
.mn-gph { font-size:0.6rem; font-weight:500; color:var(--text-3); }

.mn-card-desc { font-size:0.68rem; color:var(--text-3); margin-bottom:6px; line-height:1.4; }

.mn-card-meta { display:flex; align-items:center; gap:10px; font-size:0.64rem; margin-bottom:6px; }
.mn-cat { color:var(--text-2); }
.mn-int { font-weight:600; }
.mn-wiki { color:var(--text-3); text-decoration:none; padding:1px 6px; border:1px solid var(--border); border-radius:var(--radius-xs); transition:all .2s; margin-left:auto; }
.mn-wiki:hover { color:var(--gold); border-color:var(--gold-dim); }

.mn-reqs { display:flex; flex-wrap:wrap; gap:4px; margin-bottom:4px; align-items:center; }
.mn-req { font-size:0.6rem; font-family:var(--font-mono); padding:1px 6px; border-radius:100px; display:inline-flex; align-items:center; gap:3px; }
.mn-req.met { color:var(--green); background:var(--green-bg); }
.mn-req.unmet { color:var(--red); background:var(--red-bg); }
.mn-qbadge { font-size:0.58rem; padding:1px 6px; border-radius:100px; }
.mn-qbadge.ok { color:var(--green); background:var(--green-bg); }
.mn-qbadge.miss { color:var(--orange); background:rgba(240,160,48,.1); border:1px dashed rgba(240,160,48,.4); }

.mn-gaps { display:grid; gap:6px; margin-top:6px; }
.mn-gap-bar { font-family:var(--font-mono); font-size:0.6rem; }
.mn-gap-label { display:flex; justify-content:space-between; color:var(--orange); margin-bottom:2px; }
.mn-gap-pct { color:var(--text-3); font-weight:700; }
.mn-gap-track { height:5px; background:var(--bg-raised); border-radius:100px; overflow:hidden; }
.mn-gap-fill { height:100%; background:linear-gradient(90deg, var(--orange) 0%, var(--gold) 100%); border-radius:100px; transition:width .4s ease; }

.mn-badge { font-size:0.58rem; font-weight:700; padding:1px 6px; border-radius:100px; vertical-align:middle; }
.mn-badge-daily { color:var(--purple); background:var(--purple-bg); }
.mn-badge-soon { color:var(--orange); background:rgba(240,160,48,0.08); }

.mn-empty { text-align:center; color:var(--text-3); padding:32px 16px; font-size:0.78rem; }

@media(max-width:640px) {
  .mn-card-head { flex-wrap:wrap; }
  .mn-card-profit { width:100%; }
  .mn-cat-row, .mn-sort-row { overflow-x:auto; flex-wrap:nowrap; -webkit-overflow-scrolling:touch; }
  .mn-podium { grid-template-columns:1fr 1fr 1fr; gap:6px; }
  .mn-pcard { padding:8px 6px; }
  .mn-pcard-1 { padding:10px 6px; }
  .mn-pname { font-size:0.6rem; min-height:2.4em; }
  .mn-pprofit { font-size:0.7rem; }
  .mn-pcard-1 .mn-pprofit { font-size:0.78rem; }
  .mn-bundle-total { font-size:0.85rem; }
  .mn-loop-chain { font-size:0.6rem; }
}
@media(max-width:420px) {
  .mn-podium { grid-template-columns:1fr; }
  .mn-pcard, .mn-pcard-1, .mn-pcard-2, .mn-pcard-3 { padding:8px; }
}
`;
  document.head.appendChild(s);
}
