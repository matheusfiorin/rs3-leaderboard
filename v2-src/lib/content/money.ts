// GP-making methods, ported from the legacy money.js database and re-verified
// against runescape.wiki (mid-2026 game state).
//
// Two rules govern this file, both of them fixes for real bugs in the legacy
// version:
//
// 1. ITEM IDS. A `recipe` may only reference an id that is present in
//    public/data/ge_prices.json AND whose cached name matches the real RS3
//    item. The legacy file failed both halves — it priced ids that were absent
//    from the cache (pure essence 7936, rune arrowheads 41, uncut dragonstone
//    1631) and ids the cache names differently (mithril bar 2359 vs 2355).
//    Both silently produced fake profit. Anything that cannot clear the bar
//    ships as `baseGpPerHour` instead, which is a stated estimate rather than
//    a fabricated calculation.
//
// 2. REQUIREMENTS ARE HARD GATES. `requirements` holds only what actually
//    blocks entry. Levels that are merely advisable carry an explicit
//    `note: "Recommended..."` so the UI can say so rather than implying the
//    content is locked. Quest titles are copied from the RuneMetrics quest
//    list, including the " (miniquest)" suffix — a wrong title is a
//    requirement that can never be satisfied.

import type {
  ContentEntry,
  GateResult,
  GePrices,
  Requirement,
} from "../types";
import { evaluate, type EvalContext } from "../requirements";

export type MoneyCategory =
  | "processing"
  | "afk"
  | "gathering"
  | "combat"
  | "daily";

export type MoneyIntensity = "low" | "moderate" | "high";

/** Consumed and produced quantities are per hour, not per action. */
export interface MoneyRecipe {
  inputs: { id: number; qty: number }[];
  outputs: { id: number; qty: number }[];
}

export interface MoneyMethod extends ContentEntry {
  category: MoneyCategory;
  intensity: MoneyIntensity;
  members: boolean;
  /** Fixed estimate used when the method has no GE-priced recipe. */
  baseGpPerHour?: number;
  /** Priced recipe: what you consume and what you produce, per hour. */
  recipe?: MoneyRecipe;
  notes?: string;
}

/** Marks a level that improves the method but does not gate it. */
const RECOMMENDED = "Recommended, not a hard gate.";

/** The Abyss is opened by a miniquest, not by Runecrafting level. */
const ENTER_THE_ABYSS: Requirement = { kind: "quest", title: "Enter the Abyss (miniquest)" };

export const MONEY_METHODS: MoneyMethod[] = [
  // ===================== PROCESSING =====================
  {
    id: "tan-cowhide",
    name: "Tan cowhide",
    tier: "early",
    wiki: "Leather",
    blurb: "Buy hides, tan them, sell leather. No skill needed at all.",
    category: "processing",
    intensity: "low",
    members: false,
    requirements: [],
    icon: "Leather_body.png",
    recipe: {
      inputs: [{ id: 1739, qty: 5000 }],
      outputs: [{ id: 1741, qty: 5000 }],
    },
    notes: "The 1 gp/hide tanner fee is not modelled — treat the figure as a ceiling.",
  },
  {
    id: "tan-green-dhide",
    name: "Tan green dragonhide",
    tier: "early",
    wiki: "Green dragon leather",
    blurb: "The classic no-requirement flip: hide in, leather out, 5k an hour.",
    category: "processing",
    intensity: "low",
    members: true,
    requirements: [],
    icon: "Green_dragon_leather.png",
    recipe: {
      inputs: [{ id: 1745, qty: 5000 }],
      outputs: [{ id: 2505, qty: 5000 }],
    },
    notes: "Excludes the 20 gp/hide tanner fee, which the recipe shape cannot express.",
  },
  {
    id: "tan-blue-dhide",
    name: "Tan blue dragonhide",
    tier: "mid",
    wiki: "Blue dragon leather",
    blurb: "Same loop one tier up. Margin swings hard with hide supply.",
    category: "processing",
    intensity: "low",
    members: true,
    requirements: [],
    icon: "Blue_dragon_leather.png",
    recipe: {
      inputs: [{ id: 1747, qty: 5000 }],
      outputs: [{ id: 2507, qty: 5000 }],
    },
    notes: "Blue leather regularly trades below blue hide; check the live number before committing.",
  },
  {
    id: "tan-red-dhide",
    name: "Tan red dragonhide",
    tier: "mid",
    wiki: "Red dragon leather",
    blurb: "Usually the widest of the three tanning margins.",
    category: "processing",
    intensity: "low",
    members: true,
    requirements: [],
    icon: "Red_dragon_leather.png",
    recipe: {
      inputs: [{ id: 1749, qty: 5000 }],
      outputs: [{ id: 2509, qty: 5000 }],
    },
    notes: "Excludes the 20 gp/hide tanner fee.",
  },
  {
    id: "soften-clay",
    name: "Humidify soft clay",
    tier: "early",
    wiki: "Soft clay",
    blurb: "Cast Humidify on inventories of clay. Genuinely one-button AFK.",
    category: "processing",
    intensity: "low",
    members: true,
    requirements: [
      { kind: "skill", skill: 6, level: 68, note: "Humidify" },
      { kind: "quest", title: "Lunar Diplomacy" },
    ],
    recipe: {
      inputs: [{ id: 434, qty: 3500 }],
      outputs: [{ id: 1761, qty: 3500 }],
    },
    notes: "Astral/water/fire rune cost is not in the recipe; subtract roughly 200k/hr.",
  },
  {
    id: "smelt-steel-bars",
    name: "Smelt steel bars",
    tier: "mid",
    wiki: "Steel bar",
    blurb: "Iron plus coal at the Blast Furnace. F2P and endlessly liquid.",
    category: "processing",
    intensity: "moderate",
    members: false,
    requirements: [{ kind: "skill", skill: 13, level: 30 }],
    icon: "Steel_bar.png",
    recipe: {
      // RS3 ratio since the Mining & Smithing rework: 1 iron + 2 coal per bar.
      inputs: [
        { id: 453, qty: 3600 },
        { id: 440, qty: 1800 },
      ],
      outputs: [{ id: 2353, qty: 1800 }],
    },
  },
  {
    id: "smelt-mithril-bars",
    name: "Smelt mithril bars",
    tier: "mid",
    wiki: "Mithril bar",
    blurb: "Four coal per ore. Steady demand from every Smithing trainer.",
    category: "processing",
    intensity: "moderate",
    members: true,
    requirements: [{ kind: "skill", skill: 13, level: 50 }],
    icon: "Mithril_bar.png",
    baseGpPerHour: 500_000,
    notes:
      "No recipe: the real mithril bar id (2359) is absent from the GE cache, and the id the cache labels 'Mithril bar' (2355) is silver in game.",
  },
  {
    id: "smelt-necronium-bars",
    name: "Smelt necronium bars",
    tier: "late",
    wiki: "Necronium bar",
    blurb: "Necrite plus phasmatite. The bar most people would rather buy.",
    category: "processing",
    intensity: "moderate",
    members: true,
    requirements: [{ kind: "skill", skill: 13, level: 70 }],
    baseGpPerHour: 3_000_000,
    notes: "Neither ore nor bar is in the GE cache, so this is an estimate.",
  },
  {
    id: "cook-sharks",
    name: "Cook sharks",
    tier: "mid",
    wiki: "Shark",
    blurb: "Bank-stand cooking. Profit lives or dies on the raw/cooked spread.",
    category: "processing",
    intensity: "low",
    members: true,
    requirements: [{ kind: "skill", skill: 7, level: 80 }],
    icon: "Shark.png",
    recipe: {
      inputs: [{ id: 383, qty: 1400 }],
      outputs: [{ id: 385, qty: 1400 }],
    },
    notes: "Frequently negative — sharks are cooked for XP more often than for gold.",
  },
  {
    id: "cut-rubies",
    name: "Cut rubies",
    tier: "mid",
    wiki: "Ruby",
    blurb: "Buy uncut, chisel, sell cut. The most liquid gem flip in the game.",
    category: "processing",
    intensity: "low",
    members: false,
    requirements: [{ kind: "skill", skill: 12, level: 34 }],
    icon: "Ruby.png",
    recipe: {
      inputs: [{ id: 1619, qty: 2800 }],
      outputs: [{ id: 1609, qty: 2800 }],
    },
  },
  {
    id: "cut-dragonstones",
    name: "Cut dragonstones",
    tier: "late",
    wiki: "Dragonstone",
    blurb: "Same flip, bigger unit price and a much thinner order book.",
    category: "processing",
    intensity: "low",
    members: true,
    requirements: [{ kind: "skill", skill: 12, level: 55 }],
    icon: "Dragonstone.png",
    baseGpPerHour: 2_000_000,
    notes: "Neither uncut (1631) nor cut (1615) dragonstone is in the GE cache.",
  },
  {
    id: "fletch-rune-arrows",
    name: "Fletch rune arrows",
    tier: "mid",
    wiki: "Rune arrow",
    blurb: "Heads onto shafts, fifteen at a time. Thoughtless and steady.",
    category: "processing",
    intensity: "low",
    members: true,
    // Fletching the arrow needs 50; the 85 Smithing for the heads only matters
    // if you make them yourself instead of buying them.
    requirements: [{ kind: "skill", skill: 9, level: 50 }],
    icon: "Rune_arrow.png",
    baseGpPerHour: 1_800_000,
    notes: "Rune arrowheads (41) and rune arrows (42) are absent from the GE cache.",
  },
  {
    id: "decorated-mining-urns",
    name: "Craft decorated mining urns",
    tier: "late",
    wiki: "Decorated mining urn",
    blurb: "Every miner burns these. You make them, they buy them.",
    category: "processing",
    intensity: "low",
    members: true,
    // Jagex raised the Crafting requirement from 59 to 78; the legacy entry
    // still had 59. The Mining 61 it also listed belongs to the *user* of the
    // urn, not the crafter.
    requirements: [{ kind: "skill", skill: 12, level: 78 }],
    baseGpPerHour: 1_200_000,
  },
  {
    id: "unfinished-ranarr",
    name: "Make ranarr unfinished potions",
    tier: "mid",
    wiki: "Ranarr potion (unf)",
    blurb: "Herb into vial, repeat. The lowest-effort Herblore margin there is.",
    category: "processing",
    intensity: "low",
    members: true,
    requirements: [{ kind: "skill", skill: 15, level: 30 }],
    icon: "Clean_ranarr.png",
    baseGpPerHour: 1_400_000,
    notes:
      "No recipe: the cache's vial-of-water id (2481) is lantadyme in game, so pricing it would misstate the input cost.",
  },
  {
    id: "super-antipoison",
    name: "Make super antipoisons",
    tier: "mid",
    wiki: "Super antipoison",
    blurb: "Irit plus unicorn horn dust. Quietly one of the better mid margins.",
    category: "processing",
    intensity: "moderate",
    members: true,
    requirements: [{ kind: "skill", skill: 15, level: 48 }],
    icon: "Super_antipoison.png",
    baseGpPerHour: 1_800_000,
  },
  {
    id: "super-strength",
    name: "Make super strength potions",
    tier: "mid",
    wiki: "Super strength",
    blurb: "Kwuarm into vials. Feeds the overload pipeline above it.",
    category: "processing",
    intensity: "moderate",
    members: true,
    requirements: [{ kind: "skill", skill: 15, level: 55 }],
    icon: "Super_strength.png",
    baseGpPerHour: 1_500_000,
  },
  {
    id: "aggression-potions",
    name: "Make aggression potions",
    tier: "late",
    wiki: "Aggression potion",
    blurb: "Bloodweed plus vial. Every AFK slayer in the game consumes these.",
    category: "processing",
    intensity: "moderate",
    members: true,
    requirements: [
      { kind: "skill", skill: 15, level: 82 },
      { kind: "quest", title: "Plague's End", note: "Bloodweed comes from Prifddinas farming." },
    ],
    icon: "Clean_bloodweed.png",
    baseGpPerHour: 8_000_000,
    notes: "Bloodweed and the unfinished potion are absent from the GE cache.",
  },
  {
    id: "elder-overloads",
    name: "Make elder overload potions",
    tier: "end",
    wiki: "Elder overload potion",
    blurb: "Supreme overload, primal extract, fellstalk. The endgame potion tax.",
    category: "processing",
    intensity: "moderate",
    members: true,
    requirements: [{ kind: "skill", skill: 15, level: 106, boostable: true }],
    icon: "Herblore-icon.png",
    baseGpPerHour: 7_000_000,
    notes:
      "Margin is thin and flips negative when primal extract spikes. Herblore 120 with the master cape batches 5 potions from 4 sets of ingredients.",
  },
  {
    id: "craft-water-runes-abyss",
    name: "Craft water runes (Abyss)",
    tier: "early",
    wiki: "Water rune",
    blurb: "The starter Abyss run. Low value per rune, enormous multiplier.",
    category: "processing",
    intensity: "high",
    members: true,
    requirements: [{ kind: "skill", skill: 20, level: 5 }, ENTER_THE_ABYSS],
    icon: "Water_rune.png",
    baseGpPerHour: 1_200_000,
  },
  {
    id: "craft-cosmic-runes-abyss",
    name: "Craft cosmic runes (Abyss)",
    tier: "mid",
    wiki: "Cosmic rune",
    blurb: "Cheap entry, respectable return, permanent Invention demand.",
    category: "processing",
    intensity: "high",
    members: true,
    // Cosmic runes are 27 Runecrafting. The legacy entry said 23.
    requirements: [
      { kind: "skill", skill: 20, level: 27 },
      { kind: "quest", title: "Lost City" },
      ENTER_THE_ABYSS,
    ],
    icon: "Cosmic_rune.png",
    baseGpPerHour: 3_200_000,
  },
  {
    id: "craft-nature-runes-abyss",
    name: "Craft nature runes (Abyss)",
    tier: "mid",
    wiki: "Nature rune",
    blurb: "The Abyss run everyone knows. Alchers keep the price honest.",
    category: "processing",
    intensity: "high",
    members: true,
    // 44 is the actual gate. The legacy entry's 79 was a guess at the level
    // where the rune multiplier makes the run worth the pouch repairs.
    requirements: [{ kind: "skill", skill: 20, level: 44 }, ENTER_THE_ABYSS],
    icon: "Nature_rune.png",
    baseGpPerHour: 5_500_000,
    notes: "Rate quoted at 91+ Runecrafting, where the higher rune multiplier kicks in.",
  },
  {
    id: "craft-blood-runes-abyss",
    name: "Craft blood runes (Abyss)",
    tier: "late",
    wiki: "Blood rune",
    blurb: "The best per-essence rune in the Abyss, gated behind Meiyerditch.",
    category: "processing",
    intensity: "high",
    members: true,
    requirements: [
      { kind: "skill", skill: 20, level: 77 },
      { kind: "quest", title: "Legacy of Seergaze" },
      ENTER_THE_ABYSS,
    ],
    icon: "Blood_rune.png",
    baseGpPerHour: 6_000_000,
  },
  {
    id: "craft-soul-runes",
    name: "Craft soul runes",
    tier: "end",
    wiki: "Soul rune",
    blurb: "Menaphos soul altar. Necromancy made this the busiest altar in game.",
    category: "processing",
    intensity: "high",
    members: true,
    requirements: [
      { kind: "skill", skill: 20, level: 90 },
      { kind: "quest", title: "'Phite Club" },
    ],
    icon: "Runecrafting-icon.png",
    baseGpPerHour: 6_500_000,
  },
  {
    id: "craft-mist-runes",
    name: "Craft mist runes",
    tier: "early",
    wiki: "Mist rune",
    blurb: "Combination runes via Magic Imbue. Two runes for one essence.",
    category: "processing",
    intensity: "high",
    members: true,
    requirements: [
      { kind: "skill", skill: 20, level: 6 },
      { kind: "quest", title: "Lunar Diplomacy", note: "Magic Imbue." },
    ],
    icon: "Mist_rune.png",
    baseGpPerHour: 2_200_000,
    notes: "No recipe: pure essence (7936) has no cached price, and omitting it would inflate profit.",
  },
  {
    id: "craft-mud-runes",
    name: "Craft mud runes",
    tier: "mid",
    wiki: "Mud rune",
    blurb: "The other combination rune. Higher unit price, thinner volume.",
    category: "processing",
    intensity: "high",
    members: true,
    requirements: [
      { kind: "skill", skill: 20, level: 13 },
      { kind: "quest", title: "Lunar Diplomacy", note: "Magic Imbue." },
    ],
    icon: "Mud_rune.png",
    baseGpPerHour: 2_000_000,
  },

  // ===================== GATHERING =====================
  {
    id: "mine-luminite",
    name: "Mine luminite",
    tier: "mid",
    wiki: "Luminite",
    blurb: "Feeds every mid-tier bar recipe. Never short of buyers.",
    category: "gathering",
    intensity: "moderate",
    members: true,
    requirements: [{ kind: "skill", skill: 14, level: 40 }],
    icon: "Mining-icon.png",
    baseGpPerHour: 1_500_000,
  },
  {
    id: "mine-runite-ore",
    name: "Mine runite ore",
    tier: "mid",
    wiki: "Runite ore",
    blurb: "Still the recognisable name in ore. Rate scales hard with tools.",
    category: "gathering",
    intensity: "moderate",
    members: true,
    requirements: [{ kind: "skill", skill: 14, level: 50 }],
    icon: "Mining-icon.png",
    baseGpPerHour: 2_000_000,
  },
  {
    id: "fish-sharks",
    name: "Fish sharks",
    tier: "mid",
    wiki: "Raw shark",
    blurb: "Deeply AFK. The income is an accident of training Fishing.",
    category: "gathering",
    intensity: "low",
    members: true,
    requirements: [{ kind: "skill", skill: 10, level: 76 }],
    icon: "Raw_shark.png",
    baseGpPerHour: 1_200_000,
  },
  {
    id: "fish-sailfish",
    name: "Fish sailfish",
    tier: "end",
    wiki: "Raw sailfish",
    blurb: "Deep Sea Fishing Hub, north-east corner. Best fish in the game.",
    category: "gathering",
    intensity: "moderate",
    members: true,
    requirements: [
      { kind: "skill", skill: 10, level: 97 },
      { kind: "quest", title: "Deadliest Catch" },
    ],
    icon: "Fishing-icon.png",
    baseGpPerHour: 3_000_000,
  },
  {
    id: "chop-magic-logs",
    name: "Chop magic logs",
    tier: "mid",
    wiki: "Magic logs",
    blurb: "Semi-AFK woodcutting with a log that always sells.",
    category: "gathering",
    intensity: "low",
    members: true,
    requirements: [{ kind: "skill", skill: 8, level: 75 }],
    icon: "Woodcutting-icon.png",
    baseGpPerHour: 1_200_000,
  },
  {
    id: "chop-elder-logs",
    name: "Chop elder logs",
    tier: "late",
    wiki: "Elder logs",
    blurb: "Top-tier log, propped up by Firemaking and Fort Forinthry demand.",
    category: "gathering",
    intensity: "low",
    members: true,
    requirements: [{ kind: "skill", skill: 8, level: 90 }],
    icon: "Woodcutting-icon.png",
    baseGpPerHour: 2_400_000,
  },
  {
    id: "hunt-red-chinchompas",
    name: "Hunt red chinchompas",
    tier: "mid",
    wiki: "Red chinchompa",
    blurb: "Box traps in Feldip. The Hunter method everyone starts with.",
    category: "gathering",
    intensity: "high",
    members: true,
    requirements: [{ kind: "skill", skill: 21, level: 63 }],
    icon: "Hunter-icon.png",
    baseGpPerHour: 4_000_000,
  },
  {
    id: "hunt-black-chinchompas",
    name: "Hunt black chinchompas",
    tier: "late",
    wiki: "Black chinchompa",
    blurb: "Same traps, Wilderness rules. Bring nothing you mind losing.",
    category: "gathering",
    intensity: "high",
    members: true,
    requirements: [{ kind: "skill", skill: 21, level: 73 }],
    icon: "Hunter-icon.png",
    baseGpPerHour: 6_000_000,
    notes: "PvP-enabled area — the quoted rate assumes you survive the hour.",
  },
  {
    id: "big-game-hunter",
    name: "Big Game Hunter",
    tier: "late",
    wiki: "Big Game Hunter",
    blurb: "Trap and kill Anachronia dinosaurs for hides, bones and tusks.",
    category: "gathering",
    intensity: "high",
    members: true,
    requirements: [{ kind: "skill", skill: 21, level: 75 }],
    icon: "Hunter-icon.png",
    baseGpPerHour: 4_000_000,
    notes: "Each dinosaur has its own Hunter level; 75 opens the lower half of the roster.",
  },
  {
    id: "harvest-radiant-energy",
    name: "Harvest radiant energy",
    tier: "mid",
    wiki: "Radiant energy",
    blurb: "First Divination tier worth harvesting purely for gold.",
    category: "gathering",
    intensity: "low",
    members: true,
    requirements: [{ kind: "skill", skill: 25, level: 85 }],
    icon: "Divination-icon.png",
    baseGpPerHour: 1_800_000,
  },
  {
    id: "harvest-luminous-energy",
    name: "Harvest luminous energy",
    tier: "late",
    wiki: "Luminous energy",
    blurb: "One wisp tier up, and the Invention charge market eats all of it.",
    category: "gathering",
    intensity: "low",
    members: true,
    requirements: [{ kind: "skill", skill: 25, level: 90 }],
    icon: "Divination-icon.png",
    baseGpPerHour: 2_500_000,
  },
  {
    id: "harvest-incandescent-energy",
    name: "Harvest incandescent energy",
    tier: "late",
    wiki: "Incandescent energy",
    blurb: "The top wisp. Divine charges are made of this and nothing else.",
    category: "gathering",
    intensity: "low",
    members: true,
    requirements: [{ kind: "skill", skill: 25, level: 95 }],
    icon: "Divination-icon.png",
    baseGpPerHour: 4_000_000,
  },
  {
    id: "excavate-orthen",
    name: "Excavate Orthen materials",
    tier: "end",
    wiki: "Orthen Dig Site",
    blurb: "Dinosaur-era hotspots. Sell the materials, keep the chronotes.",
    category: "gathering",
    intensity: "low",
    members: true,
    requirements: [
      { kind: "skill", skill: 27, level: 90 },
      {
        kind: "manual",
        id: "arch-associate-qualification",
        label: "Archaeology Guild associate qualification",
      },
    ],
    icon: "Archaeology-icon.png",
    baseGpPerHour: 5_000_000,
    notes:
      "Rate is material sales, not chronotes. The last site (Xolo City) additionally needs Archaeology 108 and Hunter 86, both boostable.",
  },
  {
    id: "telegrab-wines-of-zamorak",
    name: "Telegrab wines of Zamorak",
    tier: "early",
    wiki: "Wine of Zamorak",
    blurb: "Steal from the Chaos Temple altar without ever entering aggro range.",
    category: "gathering",
    intensity: "moderate",
    members: true,
    requirements: [{ kind: "skill", skill: 6, level: 33, note: "Telekinetic Grab." }],
    baseGpPerHour: 1_800_000,
  },

  // ===================== COMBAT =====================
  {
    id: "kill-hellhounds",
    name: "Kill hellhounds",
    tier: "mid",
    wiki: "Hellhound",
    blurb: "Taverley Dungeon with Soul Split on. Charms, clues and hard leather.",
    category: "combat",
    intensity: "moderate",
    members: true,
    requirements: [{ kind: "skill", skill: 1, level: 70, note: RECOMMENDED }],
    baseGpPerHour: 3_000_000,
  },
  {
    id: "kill-spiritual-warriors",
    name: "Kill spiritual warriors",
    tier: "mid",
    wiki: "Spiritual warrior",
    blurb: "God Wars trash that drops rune gear and Zarosian killcount.",
    category: "combat",
    intensity: "moderate",
    members: true,
    requirements: [{ kind: "skill", skill: 18, level: 68 }],
    icon: "Slayer-icon.png",
    baseGpPerHour: 2_500_000,
  },
  {
    id: "kill-barrows",
    name: "Barrows runs",
    tier: "mid",
    wiki: "Barrows",
    blurb: "Six brothers, one chest, twenty years of muscle memory.",
    category: "combat",
    intensity: "moderate",
    members: true,
    requirements: [{ kind: "skill", skill: 0, level: 60, note: RECOMMENDED }],
    baseGpPerHour: 3_000_000,
  },
  {
    id: "kill-arch-glacor",
    name: "Kill Arch-Glacor (normal)",
    tier: "late",
    wiki: "Arch-Glacor",
    blurb: "Turn the mechanics off, learn the rotation, print money forever.",
    category: "combat",
    intensity: "moderate",
    members: true,
    requirements: [{ kind: "skill", skill: 1, level: 80, note: RECOMMENDED }],
    baseGpPerHour: 10_000_000,
    notes: "No entry requirement at all — mechanics are individually toggleable, so the floor is gear, not levels.",
  },
  {
    id: "kill-general-graardor",
    name: "Kill General Graardor",
    tier: "late",
    wiki: "General Graardor",
    blurb: "Bandos throne room. Still the friendliest GWD1 boss to learn on.",
    category: "combat",
    intensity: "high",
    members: true,
    // The 70 opens the Bandos door. War's Retreat's boss portal skips it, so
    // this is a convenience gate rather than a hard one — hence the note.
    requirements: [{ kind: "skill", skill: 2, level: 70, note: "Bandos door; the War's Retreat portal bypasses it." }],
    icon: "Bandos_chestplate.png",
    baseGpPerHour: 6_000_000,
  },
  {
    id: "kill-kreearra",
    name: "Kill Kree'arra",
    tier: "late",
    wiki: "Kree'arra",
    blurb: "Armadyl eyrie. Ranged-only, and the armour still holds its price.",
    category: "combat",
    intensity: "high",
    members: true,
    requirements: [{ kind: "skill", skill: 4, level: 70, note: "Armadyl door; the War's Retreat portal bypasses it." }],
    icon: "Armadyl_chestplate.png",
    baseGpPerHour: 8_000_000,
  },
  {
    id: "kill-vindicta",
    name: "Kill Vindicta",
    tier: "late",
    wiki: "Vindicta",
    blurb: "Cheapest GWD2 entry. Dragon Rider lance pays for the whole trip.",
    category: "combat",
    intensity: "high",
    members: true,
    requirements: [{ kind: "quest", title: "Fate of the Gods" }],
    icon: "Dragon_Rider_lance.png",
    baseGpPerHour: 8_000_000,
  },
  {
    id: "kill-twin-furies",
    name: "Kill the Twin Furies",
    tier: "late",
    wiki: "Twin Furies",
    blurb: "Two bosses, one AoE rotation, off-hand drygore drops.",
    category: "combat",
    intensity: "high",
    members: true,
    requirements: [{ kind: "quest", title: "The Mighty Fall" }],
    baseGpPerHour: 7_000_000,
  },
  {
    id: "kill-vorkath",
    name: "Kill Vorkath",
    tier: "late",
    wiki: "Vorkath",
    blurb: "Undead dragon, so Necromancy eats it. Dense alchable drop table.",
    category: "combat",
    intensity: "high",
    members: true,
    requirements: [{ kind: "quest", title: "Defender of Varrock" }],
    icon: "Necromancy-icon.png",
    baseGpPerHour: 12_000_000,
  },
  {
    id: "kill-ripper-demons",
    name: "Kill ripper demons",
    tier: "end",
    wiki: "Ripper Demon",
    blurb: "High-tier Slayer with a weapon drop table and absurd Slayer XP.",
    category: "combat",
    intensity: "high",
    members: true,
    requirements: [{ kind: "skill", skill: 18, level: 96 }],
    icon: "Slayer-icon.png",
    baseGpPerHour: 11_000_000,
    notes: "Best done on task with demonbane gear and an Oldak coil.",
  },
  {
    id: "kill-araxxi",
    name: "Kill Araxxor and Araxxi",
    tier: "end",
    wiki: "Araxxi",
    blurb: "Three paths, three rotations, components for three tier-90 weapons.",
    category: "combat",
    intensity: "high",
    members: true,
    requirements: [{ kind: "skill", skill: 1, level: 90, note: RECOMMENDED }],
    baseGpPerHour: 22_000_000,
    notes: "No skill or quest gate — the only real barrier is the acid path and the enrage-scaled drop table.",
  },
  {
    id: "ed3-shadow-reef",
    name: "The Shadow Reef runs",
    tier: "end",
    wiki: "The Shadow Reef",
    blurb: "Elite Dungeon 3. Trash-only runs are the AFK-adjacent money version.",
    category: "combat",
    intensity: "high",
    members: true,
    requirements: [{ kind: "skill", skill: 1, level: 80, note: RECOMMENDED }],
    baseGpPerHour: 12_000_000,
    notes: "The treasure-chest teleport needs Impressing the Locals; walking in needs nothing.",
  },
  {
    id: "kill-nex",
    name: "Kill Nex",
    tier: "end",
    wiki: "Nex",
    blurb: "The Ancient Prison. Four-way team boss that still funds mid accounts.",
    category: "combat",
    intensity: "high",
    members: true,
    // Nex has no skill or quest requirement. Entry is a frozen key assembled
    // from four GWD1 shards, plus 40 Zarosian kills for the lobby.
    requirements: [
      { kind: "manual", id: "nex-frozen-key", label: "Frozen key assembled" },
      { kind: "skill", skill: 1, level: 80, note: RECOMMENDED },
    ],
    baseGpPerHour: 25_000_000,
  },
  {
    id: "croesus-team",
    name: "Croesus (team)",
    tier: "end",
    wiki: "Croesus",
    blurb: "The skilling boss. Cryptbloom and Bik scriptures, no combat needed.",
    category: "combat",
    intensity: "high",
    members: true,
    // The wiki is explicit: 80 is recommended, there is no actual requirement.
    requirements: [
      { kind: "skill", skill: 14, level: 80, note: RECOMMENDED },
      { kind: "skill", skill: 10, level: 80, note: RECOMMENDED },
      { kind: "skill", skill: 8, level: 80, note: RECOMMENDED },
      { kind: "skill", skill: 21, level: 80, note: RECOMMENDED },
    ],
    baseGpPerHour: 15_000_000,
    notes: "Elder Trove drops additionally need Azzanadra's Quest completed.",
  },
  {
    id: "kill-vorago",
    name: "Kill Vorago",
    tier: "end",
    wiki: "Vorago",
    blurb: "Seven rotations, a team, and a maul that has held value for a decade.",
    category: "combat",
    intensity: "high",
    members: true,
    requirements: [
      { kind: "skill", skill: 1, level: 90, note: RECOMMENDED },
      { kind: "manual", id: "vorago-rotation", label: "Learned the week's Vorago rotation" },
    ],
    baseGpPerHour: 25_000_000,
    notes: "Rate assumes a competent team; a learning group is comfortably negative.",
  },
  {
    id: "kill-kerapac",
    name: "Kill Kerapac, the Bound",
    tier: "end",
    wiki: "Kerapac, the bound",
    blurb: "Solo endgame with a strict enrage clock and a fat unique table.",
    category: "combat",
    intensity: "high",
    members: true,
    // Kerapac is fought at the end of Desperate Measures. The legacy entry
    // named Desperate Times, which is the preceding quest.
    requirements: [{ kind: "quest", title: "Desperate Measures" }],
    baseGpPerHour: 22_000_000,
  },
  {
    id: "kill-solak",
    name: "Kill Solak",
    tier: "end",
    wiki: "Solak",
    blurb: "Group boss in the Lost Grove. Grimoire and Merethiel's lance.",
    category: "combat",
    intensity: "high",
    members: true,
    requirements: [{ kind: "quest", title: "The Light Within" }],
    baseGpPerHour: 25_000_000,
  },
  {
    id: "kill-raksha",
    name: "Kill Raksha, the Shadow Colossus",
    tier: "apex",
    wiki: "Raksha, the Shadow Colossus",
    blurb: "Orthen Oubliette. Solo or duo, and the shadow spike table is huge.",
    category: "combat",
    intensity: "high",
    members: true,
    // RuneMetrics lists the unlock as a quest with this exact title.
    requirements: [{ kind: "quest", title: "Raksha, the Shadow Colossus" }],
    baseGpPerHour: 40_000_000,
  },
  {
    id: "kill-rasial",
    name: "Kill Rasial, the First Necromancer",
    tier: "apex",
    wiki: "Rasial, the First Necromancer",
    blurb: "The Necromancy capstone. Tier 95 gear drops straight into your bank.",
    category: "combat",
    intensity: "high",
    members: true,
    // Access is the Alpha vs Omega quest, not The Spirit of War as the legacy
    // file had it.
    requirements: [
      { kind: "quest", title: "Alpha vs Omega" },
      { kind: "skill", skill: 28, level: 90, note: RECOMMENDED },
    ],
    icon: "Death_Skulls.png",
    baseGpPerHour: 45_000_000,
  },
  {
    id: "kill-zamorak-hard",
    name: "Kill Zamorak, Lord of Chaos (hard mode)",
    tier: "apex",
    wiki: "Zamorak, Lord of Chaos",
    blurb: "The Zamorakian Undercity finale. Currently the best gp/hr in game.",
    category: "combat",
    intensity: "high",
    members: true,
    // A single Undercity clear unlocks direct access to the boss portal.
    requirements: [
      {
        kind: "manual",
        id: "zamorak-undercity-clear",
        label: "Completed a Zamorakian Undercity run",
      },
      { kind: "skill", skill: 1, level: 95, note: RECOMMENDED },
    ],
    baseGpPerHour: 55_000_000,
    notes: "Story mode exists for learning and pays a fraction of this.",
  },
  {
    id: "kill-telos",
    name: "Kill Telos, the Warden",
    tier: "apex",
    wiki: "Telos, the Warden",
    blurb: "Enrage scaling means the drop table is whatever you can survive.",
    category: "combat",
    intensity: "high",
    members: true,
    // Telos needs an Ancient sigil, not a quest. The legacy file gated it
    // behind Heart of Stone, which is unrelated.
    requirements: [
      { kind: "manual", id: "telos-ancient-sigil", label: "Ancient sigil obtained" },
      { kind: "skill", skill: 1, level: 90, note: RECOMMENDED },
    ],
    baseGpPerHour: 40_000_000,
    notes: "Quoted around 100% enrage; streaking far higher multiplies both the drops and the deaths.",
  },

  // ===================== AFK / PASSIVE SETUPS =====================
  {
    id: "fort-forinthry-walls",
    name: "Fort Forinthry stone wall segments",
    tier: "mid",
    wiki: "Fort Forinthry",
    blurb: "Build segments, sell the surplus. Almost entirely hands-off.",
    category: "afk",
    intensity: "low",
    members: true,
    requirements: [],
    baseGpPerHour: 3_000_000,
  },
  {
    id: "player-owned-farm",
    name: "Player-owned farm",
    tier: "mid",
    wiki: "Player-owned farm",
    blurb: "Breed animals, sell the good ones. Checked twice a day, not played.",
    category: "afk",
    intensity: "low",
    members: true,
    requirements: [{ kind: "skill", skill: 19, level: 35 }],
    icon: "Farming-icon.png",
    baseGpPerHour: 2_500_000,
    notes: "Rate is amortised across a day; higher-tier animals need more Farming.",
  },
  {
    id: "player-owned-ports",
    name: "Player-owned ports",
    tier: "late",
    wiki: "Player-owned port",
    blurb: "Send voyages, collect resources next login. Near-zero attention.",
    category: "afk",
    intensity: "low",
    members: true,
    // Ports unlocks at level 90 in ANY ONE of a list of skills. The
    // requirement model has no OR, and the legacy file wrongly demanded all
    // five at once, so this is a manual unlock instead.
    requirements: [
      {
        kind: "manual",
        id: "ports-unlocked",
        label: "Player-owned port unlocked (90 in any Ports skill)",
      },
    ],
    baseGpPerHour: 4_000_000,
    notes: "Weekly income averaged into an hourly figure; there is no hour to actually spend.",
  },

  // ===================== DAILY =====================
  {
    id: "manage-miscellania",
    name: "Manage Miscellania",
    tier: "early",
    wiki: "Managing Miscellania",
    blurb: "Top up the coffers, collect resources. Two minutes a day, forever.",
    category: "daily",
    intensity: "low",
    members: true,
    requirements: [{ kind: "quest", title: "Throne of Miscellania" }],
    baseGpPerHour: 1_500_000,
    notes: "Daily reset; the figure is the daily haul, not a sustainable hourly rate.",
  },
  {
    id: "kill-bork",
    name: "Kill Bork",
    tier: "early",
    wiki: "Bork",
    blurb: "One kill a day for uncut gems and a fistful of charms.",
    category: "daily",
    intensity: "low",
    members: true,
    // RuneMetrics spells this "The Hunt for Surok (miniquest)". The legacy
    // file's "Hunt for Surok" never matched and locked the entry forever.
    requirements: [{ kind: "quest", title: "The Hunt for Surok (miniquest)" }],
    baseGpPerHour: 500_000,
    notes: "Daily reset.",
  },
  {
    id: "collect-red-sandstone",
    name: "Collect red sandstone",
    tier: "late",
    wiki: "Red sandstone",
    blurb: "Menaphos daily. Grinds down into crafting sand nobody wants to mine.",
    category: "daily",
    intensity: "low",
    members: true,
    requirements: [
      { kind: "skill", skill: 14, level: 81 },
      { kind: "quest", title: "The Jack of Spades", note: "Menaphos access." },
    ],
    baseGpPerHour: 900_000,
    notes: "Daily reset.",
  },
  {
    id: "collect-crystal-sandstone",
    name: "Collect crystal sandstone",
    tier: "late",
    wiki: "Crystal sandstone",
    blurb: "The Prifddinas counterpart. Same trip, different city.",
    category: "daily",
    intensity: "low",
    members: true,
    requirements: [
      { kind: "skill", skill: 14, level: 81 },
      { kind: "quest", title: "Plague's End", note: "Prifddinas access." },
    ],
    baseGpPerHour: 800_000,
    notes: "Daily reset.",
  },
  {
    id: "divine-locations",
    name: "Divine locations",
    tier: "mid",
    wiki: "Divine location",
    blurb: "Plant a node, harvest it, and let everyone else harvest it too.",
    category: "daily",
    intensity: "low",
    members: true,
    requirements: [{ kind: "skill", skill: 25, level: 60 }],
    icon: "Divination-icon.png",
    baseGpPerHour: 700_000,
    notes: "Daily reset; each location type has its own Divination level.",
  },
];

// ---------------------------------------------------------------------------
// Calculator
// ---------------------------------------------------------------------------

/**
 * Cached GE price for an item, or null when we have no usable number.
 *
 * A zero or absent price is deliberately null rather than 0: treating an
 * unpriced input as free is exactly how the legacy calculator invented profit.
 */
function priceOf(id: number, prices: GePrices): number | null {
  const row = prices[String(id)];
  if (!row || typeof row.price !== "number" || row.price <= 0) return null;
  return row.price;
}

/**
 * GP per hour for a method.
 *
 * With a recipe, that is output value minus input cost at cached prices. With
 * no recipe, the stated `baseGpPerHour`. If any single price in the recipe is
 * missing the answer is 0 — never a partial sum, which would read as profit.
 */
export function methodProfit(m: MoneyMethod, prices: GePrices): number {
  if (!m.recipe) return m.baseGpPerHour ?? 0;

  let gp = 0;
  for (const out of m.recipe.outputs) {
    const price = priceOf(out.id, prices);
    if (price === null) return 0;
    gp += price * out.qty;
  }
  for (const input of m.recipe.inputs) {
    const price = priceOf(input.id, prices);
    if (price === null) return 0;
    gp -= price * input.qty;
  }
  return Math.round(gp);
}

export interface RankedMethod {
  method: MoneyMethod;
  gp: number;
  gate: GateResult;
}

/**
 * Every method priced and gated, richest first.
 *
 * Locked methods are kept in the list rather than filtered out — the UI greys
 * them and shows the gap, which is the whole point of ranking by gp instead of
 * by proximity.
 */
export function rankMethods(
  methods: MoneyMethod[],
  prices: GePrices,
  ctx: EvalContext,
): RankedMethod[] {
  return methods
    .map((method) => ({
      method,
      gp: methodProfit(method, prices),
      gate: evaluate(method.requirements, ctx),
    }))
    .sort((a, b) => b.gp - a.gp);
}
