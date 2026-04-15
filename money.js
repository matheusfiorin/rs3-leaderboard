/* =============================================
   RS3 Leaderboard — money.js
   Personalized money-making recommender.
   Filters 100+ methods by player skills/quests,
   ranks by GP/hr using live GE prices.
   ============================================= */

// Skill IDs: 0=ATK 1=DEF 2=STR 3=HP 4=RNG 5=PRA 6=MAG 7=COK 8=WC 9=FLE 10=FSH 11=FM 12=CRA 13=SMI 14=MIN 15=HER 16=AGI 17=THI 18=SLA 19=FAR 20=RC 21=HUN 22=CON 23=SUM 24=DG 25=DIV 26=INV 27=ARC 28=NEC

// ---- Curated Methods Database ----
// Sources: RS3 Wiki Money Making Guide, KB rs3-money domain (655 methods analyzed, top ~100 selected)
// GP/hr figures from wiki as of April 2026, recalculated with live GE when inputs/outputs available

const MONEY_METHODS = [
  // ======== PROCESSING ========
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
  { id:"craft_water_abyss", cat:"processing", intensity:"high", members:true, gp:22771000,
    name:{pt:"Criar Water Runes (Abyss)",en:"Craft Water Runes (Abyss)"},
    desc:{pt:"Requisito mínimo de Runecrafting. Excelente para iniciantes.",en:"Minimal Runecrafting req. Excellent for beginners."},
    reqs:{20:5}, recReqs:{20:110},
    inputs:[{id:7936,qty:1,name:"Pure essence"}], outputs:[{id:555,qty:10,name:"Water rune"}], actionsPerHour:2200,
    wiki:"https://runescape.wiki/w/Money_making_guide/Crafting_water_runes_through_the_Abyss" },
  { id:"make_aggression_pots", cat:"processing", intensity:"moderate", members:true, gp:22800000,
    name:{pt:"Fazer Aggression Potions",en:"Make Aggression Potions"},
    desc:{pt:"Combina clean bloodweed + vial of water. AFK e lucrativo.",en:"Combine clean bloodweed + vial of water. AFK and profitable."},
    reqs:{15:82},
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
    desc:{pt:"Fundição com 2 coal + 1 iron ore. Blast furnace recomendado.",en:"Smelting with 2 coal + 1 iron ore."},
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
    desc:{pt:"Alto nível de Smithing para barras valiosas.",en:"High Smithing for valuable bars."},
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
    reqs:{12:63},
    inputs:[{id:1619,qty:1,name:"Uncut ruby"}], outputs:[{id:1603,qty:1,name:"Ruby"}], actionsPerHour:2800,
    wiki:"https://runescape.wiki/w/Money_making_guide/Cutting_rubies" },
  { id:"cut_dragonstones", cat:"processing", intensity:"low", members:true, gp:3500000,
    name:{pt:"Cortar Dragonstones",en:"Cut Dragonstones"},
    desc:{pt:"Compre dragonstones brutas, corte.",en:"Buy uncut dragonstones, cut."},
    reqs:{12:55},
    inputs:[{id:1631,qty:1,name:"Uncut dragonstone"}], outputs:[{id:1615,qty:1,name:"Dragonstone"}], actionsPerHour:2800,
    wiki:"https://runescape.wiki/w/Money_making_guide/Cutting_dragonstones" },

  // ======== GATHERING ========
  { id:"mine_runite_ore", cat:"gathering", intensity:"moderate", members:true, gp:3000000,
    name:{pt:"Minerar Runite Ore",en:"Mine Runite Ore"},
    desc:{pt:"Mining de alto nível, boa renda passiva.",en:"High-level mining, good passive income."},
    reqs:{14:50},
    inputs:[], outputs:[], actionsPerHour:0, fixedProfit:3000000,
    wiki:"https://runescape.wiki/w/Money_making_guide/Mining_runite_ore" },
  { id:"mine_luminite", cat:"gathering", intensity:"moderate", members:true, gp:2200000,
    name:{pt:"Minerar Luminite",en:"Mine Luminite"},
    desc:{pt:"Mineral útil para barras de rune e orichalcite.",en:"Useful ore for rune and orichalcite bars."},
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
    desc:{pt:"Pesca de alto nível em Deep Sea.",en:"High-level fishing at Deep Sea."},
    reqs:{10:97},
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

  // ======== COLLECTING ========
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
  { id:"vis_wax", cat:"collecting", intensity:"low", members:true, gp:5000000,
    name:{pt:"Criar Vis Wax (diário)",en:"Make Vis Wax (daily)"},
    desc:{pt:"Rune Goldberg Machine. 50 RC requerido.",en:"Rune Goldberg Machine. 50 RC required."},
    reqs:{20:50},
    inputs:[], outputs:[], actionsPerHour:0, fixedProfit:5000000, daily:true,
    wiki:"https://runescape.wiki/w/Money_making_guide/Making_vis_wax" },

  // ======== RECURRING ========
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
  return p ? p.price : 0;
}

function calcProfit(method) {
  if (method.fixedProfit) return method.fixedProfit;
  if (!method.inputs?.length || !method.outputs?.length || !method.actionsPerHour) return method.gp || 0;
  let inputCost = 0;
  for (const inp of method.inputs) {
    inputCost += (getPrice(inp.id) + (inp.extraCost || 0)) * inp.qty;
  }
  let outputValue = 0;
  for (const out of method.outputs) {
    outputValue += getPrice(out.id) * out.qty;
  }
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
    if (cur < reqLevel) gaps.push({ id: Number(skillId), cur, req: reqLevel, gap: reqLevel - cur });
  }
  return gaps;
}

// ---- Rendering ----
const CAT_LABELS = {
  processing: { pt: "Processamento", en: "Processing", icon: "⚗️" },
  gathering:  { pt: "Coleta", en: "Gathering", icon: "⛏️" },
  combat:     { pt: "Combate", en: "Combat", icon: "⚔️" },
  collecting:  { pt: "Coleção", en: "Collecting", icon: "🛒" },
  recurring:  { pt: "Recorrente", en: "Recurring", icon: "🔄" },
};

const INTENSITY_LABELS = {
  low:      { pt: "AFK", en: "AFK", color: "var(--green)" },
  moderate: { pt: "Médio", en: "Moderate", color: "var(--gold)" },
  high:     { pt: "Ativo", en: "Active", color: "var(--orange)" },
};

let _moneyFilter = "available";
let _moneyCat = "all";
let _moneyPlayerIdx = 0;

function moneyCardHTML(m, player, lang, rank) {
  const info = m.name[lang] || m.name.en;
  const desc = (m.desc[lang] || m.desc.en);
  const profitStr = m._profit > 0 ? fmtShort(m._profit) : "?";
  const catInfo = CAT_LABELS[m.cat] || { pt: m.cat, en: m.cat, icon: "📦" };
  const intInfo = INTENSITY_LABELS[m.intensity] || INTENSITY_LABELS.moderate;
  const catLabel = catInfo[lang] || catInfo.en;
  const intLabel = intInfo[lang] || intInfo.en;
  const can = canDoMethod(player, m);
  const almost = !can && m._almost;

  // Skill requirement tags
  const reqTags = Object.entries(m.reqs || {}).map(([sid, lvl]) => {
    const sk = player.skills[Number(sid)];
    const met = sk && sk.level >= lvl;
    return `<span class="mn-req ${met ? "met" : "unmet"}">${typeof tSkill === "function" ? tSkill(Number(sid)) : sid} ${lvl}</span>`;
  }).join("");

  // Almost unlocked: show skill gaps
  let gapHTML = "";
  if (almost) {
    const gaps = getSkillGaps(player, m);
    gapHTML = `<div class="mn-gaps">${gaps.map(g =>
      `<span class="mn-gap">${typeof tSkill === "function" ? tSkill(g.id) : g.id} ${g.cur}→${g.req} <b>(${g.gap})</b></span>`
    ).join("")}</div>`;
  }

  const badges = [];
  if (m.daily) badges.push(`<span class="mn-badge mn-badge-daily">${lang === "pt" ? "Diário" : "Daily"}</span>`);
  if (almost) badges.push(`<span class="mn-badge mn-badge-soon">${lang === "pt" ? "Quase" : "Soon"}</span>`);

  const rankBadge = rank != null ? `<span class="mn-rank">#${rank}</span>` : "";

  return `<div class="mn-card ${almost ? "mn-almost" : ""} ${can ? "" : almost ? "" : "mn-locked"}">
    <div class="mn-card-head">
      ${rankBadge}
      <div class="mn-card-title">${info}${m.members ? " ⭐" : ""}${badges.length ? " " + badges.join("") : ""}</div>
      <div class="mn-card-profit">${profitStr} <span class="mn-gph">gp/h</span></div>
    </div>
    <div class="mn-card-desc">${desc}</div>
    <div class="mn-card-meta">
      <span class="mn-cat">${catInfo.icon} ${catLabel}</span>
      <span class="mn-int" style="color:${intInfo.color}">${intLabel}</span>
      ${m.wiki ? `<a class="mn-wiki" href="${m.wiki}" target="_blank" rel="noopener">Wiki</a>` : ""}
    </div>
    ${reqTags ? `<div class="mn-reqs">${reqTags}</div>` : ""}
    ${gapHTML}
  </div>`;
}

function renderMoney(players) {
  const lang = typeof currentLang !== "undefined" ? currentLang : "en";
  const grid = document.getElementById("money-grid");
  if (!grid || !players?.length) return;

  const player = players[Math.min(_moneyPlayerIdx, players.length - 1)];

  // Calculate profits and sort
  const all = MONEY_METHODS.map(m => ({
    ...m,
    _profit: calcProfit(m),
    _can: canDoMethod(player, m),
    _almost: isAlmostUnlocked(player, m),
  })).sort((a, b) => b._profit - a._profit);

  const available = all.filter(m => m._can);
  const almost = all.filter(m => m._almost).sort((a, b) => {
    const gaA = getSkillGaps(player, a).reduce((s, g) => s + g.gap, 0);
    const gaB = getSkillGaps(player, b).reduce((s, g) => s + g.gap, 0);
    return gaA - gaB;
  });
  const locked = all.filter(m => !m._can && !m._almost);

  // Apply category filter
  const catFilter = m => _moneyCat === "all" || m.cat === _moneyCat;

  let filtered;
  if (_moneyFilter === "available") filtered = available.filter(catFilter);
  else if (_moneyFilter === "upcoming") filtered = almost.filter(catFilter);
  else filtered = all.filter(catFilter);

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
  </div>`;

  // Section header
  const headerText = _moneyFilter === "available"
    ? (lang === "pt" ? `Top métodos para ${player.name}` : `Top methods for ${player.name}`)
    : _moneyFilter === "upcoming"
      ? (lang === "pt" ? `Quase desbloqueados para ${player.name}` : `Almost unlocked for ${player.name}`)
      : (lang === "pt" ? "Todos os métodos" : "All methods");

  // Render cards
  const top10 = filtered.slice(0, 10);
  const rest = filtered.slice(10);

  const cardsHTML = top10.map((m, i) =>
    moneyCardHTML(m, player, lang, _moneyFilter === "available" ? i + 1 : null)
  ).join("");

  const restHTML = rest.length ? `
    <div id="mn-rest" style="display:none">${rest.map(m => moneyCardHTML(m, player, lang, null)).join("")}</div>
    <button id="mn-show-more" class="pill" style="display:block;margin:12px auto;padding:8px 24px">
      ${lang === "pt" ? "Mostrar mais" : "Show more"} (+${rest.length})
    </button>` : "";

  grid.innerHTML = `
    ${playerTabs}
    ${filterPills}
    <div class="mn-section-title">${headerText}</div>
    ${filtered.length ? cardsHTML + restHTML : `<div class="mn-empty">${lang === "pt" ? "Nenhum método encontrado" : "No methods found"}</div>`}
  `;

  // Inject styles
  moneyInjectStyles();

  // Events
  grid.querySelectorAll(".mn-fpill").forEach(b => b.addEventListener("click", () => { _moneyFilter = b.dataset.mf; renderMoney(players); }));
  grid.querySelectorAll(".mn-cpill").forEach(b => b.addEventListener("click", () => { _moneyCat = b.dataset.mc; renderMoney(players); }));
  grid.querySelectorAll(".mn-ptab").forEach(b => b.addEventListener("click", () => { _moneyPlayerIdx = Number(b.dataset.mnPlayer); renderMoney(players); }));

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

.mn-section-title { font-family:var(--font-display); font-size:0.82rem; font-weight:700; color:var(--gold-bright); margin-bottom:10px; letter-spacing:.3px; }

.mn-card { background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius); padding:14px 16px; margin-bottom:8px; transition:border-color .2s; }
.mn-card:hover { border-color:var(--border-hover); }
.mn-almost { border-left:3px solid var(--orange); opacity:0.88; }
.mn-locked { opacity:0.5; }

.mn-card-head { display:flex; align-items:baseline; gap:8px; margin-bottom:4px; }
.mn-rank { font-family:var(--font-mono); font-size:0.65rem; font-weight:800; color:var(--gold); background:var(--gold-bg); padding:1px 6px; border-radius:100px; flex-shrink:0; }
.mn-card-title { font-weight:700; font-size:0.8rem; color:var(--text); flex:1; min-width:0; }
.mn-card-profit { font-family:var(--font-mono); font-size:0.82rem; font-weight:800; color:var(--green); white-space:nowrap; }
.mn-gph { font-size:0.6rem; font-weight:500; color:var(--text-3); }

.mn-card-desc { font-size:0.68rem; color:var(--text-3); margin-bottom:6px; line-height:1.4; }

.mn-card-meta { display:flex; align-items:center; gap:10px; font-size:0.64rem; margin-bottom:6px; }
.mn-cat { color:var(--text-2); }
.mn-int { font-weight:600; }
.mn-wiki { color:var(--text-3); text-decoration:none; padding:1px 6px; border:1px solid var(--border); border-radius:var(--radius-xs); transition:all .2s; margin-left:auto; }
.mn-wiki:hover { color:var(--gold); border-color:var(--gold-dim); }

.mn-reqs { display:flex; flex-wrap:wrap; gap:4px; margin-bottom:4px; }
.mn-req { font-size:0.6rem; font-family:var(--font-mono); padding:1px 6px; border-radius:100px; }
.mn-req.met { color:var(--green); background:var(--green-bg); }
.mn-req.unmet { color:var(--red); background:var(--red-bg); }

.mn-gaps { display:flex; flex-wrap:wrap; gap:4px; margin-top:4px; }
.mn-gap { font-size:0.62rem; font-family:var(--font-mono); color:var(--orange); background:rgba(240,160,48,0.08); padding:2px 6px; border-radius:100px; }

.mn-badge { font-size:0.58rem; font-weight:700; padding:1px 6px; border-radius:100px; vertical-align:middle; }
.mn-badge-daily { color:var(--purple); background:var(--purple-bg); }
.mn-badge-soon { color:var(--orange); background:rgba(240,160,48,0.08); }

.mn-empty { text-align:center; color:var(--text-3); padding:32px 16px; font-size:0.78rem; }

@media(max-width:640px) {
  .mn-card-head { flex-wrap:wrap; }
  .mn-card-profit { width:100%; }
  .mn-cat-row { overflow-x:auto; flex-wrap:nowrap; }
}
`;
  document.head.appendChild(s);
}
