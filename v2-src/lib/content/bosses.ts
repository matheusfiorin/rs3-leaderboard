import type { ContentEntry, ContentTier, GateResult, Requirement } from "../types";
import { rankByProximity, type EvalContext } from "../requirements";

/**
 * The PvM ladder, entry tier through apex.
 *
 * Requirements here are *gates*, not gear checks: a quest that opens the door,
 * the skill level the door itself asks for, a Slayer level where the boss is
 * genuinely Slayer-locked, a prior clear where the game demands one. Where the
 * real barrier is execution rather than stats it is a `manual` checkbox, because
 * "can you survive Vorago's phase 5" is not something the RuneMetrics API knows.
 *
 * Levels marked `boostable: true` are ones the wiki explicitly confirms a potion
 * can cover — the UI can soften those in the gap list.
 */
export interface BossEntry extends ContentEntry {
  /** Styles that are actually viable here, not merely legal. */
  style?: ("melee" | "ranged" | "magic" | "necromancy")[];
  group: "solo" | "duo" | "group";
  /** 1-10 band — beefier / more enraged sorts higher *within* the same tier. */
  hpTier: number;
  /** 2-4 notable uniques, names only. */
  dropHighlights: string[];
  /** Typical minutes per kill for a competent player at a normal enrage. */
  killTimeMin?: number;
}

// ---------------------------------------------------------------------------
// Shared gates
// ---------------------------------------------------------------------------

/** Crossing the Salve is the real Morytania gate — Barrows, RotS and the
 *  Araxyte Hive all sit behind it. */
const MORYTANIA: Requirement = {
  kind: "quest",
  title: "Priest in Peril",
  note: "Opens the River Salve crossing into Morytania.",
};

/**
 * Reaching God Wars Dungeon 1 at all. The boulder outside takes 60 Strength
 * *or* 60 Agility — the model has no OR, so this records the Strength path
 * (the one a melee-first account already has) and notes the alternative.
 */
const GWD1_ACCESS: Requirement[] = [
  {
    kind: "quest",
    title: "Troll Stronghold",
    note: "Defeating Dad opens the Death Plateau route to Trollheim.",
  },
  {
    kind: "skill",
    skill: 2,
    level: 60,
    boostable: true,
    note: "Boulder at the entrance. 60 Agility works instead if you have it.",
  },
];

/** Every GWD1/GWD2 boss chamber also wants 40 same-faction killcount. That is
 *  per-trip rather than a permanent unlock, so it stays out of the gate list
 *  and lives in the blurb instead. */

export const BOSSES: BossEntry[] = [
  // -------------------------------------------------------------------------
  // Early — the bosses you learn the genre on.
  // -------------------------------------------------------------------------
  {
    id: "giant-mole",
    name: "Giant Mole",
    tier: "early",
    wiki: "Giant mole",
    blurb: "Falador Park, a spade and a light source. The first boss almost everyone kills.",
    group: "solo",
    hpTier: 1,
    style: ["melee", "ranged", "magic", "necromancy"],
    dropHighlights: ["Mole claw", "Mole skin", "Numbing root", "Clingy mole"],
    killTimeMin: 0.5,
    requirements: [
      // The mole has no game-side gate at all. A soft combat floor is recorded
      // so the entry still ranks in "what's next" instead of reading complete
      // for a level-3 account.
      { kind: "stat", stat: "combatLevel", value: 70, note: "Recommended floor, not a hard gate." },
    ],
  },
  {
    id: "barrows",
    name: "The Barrows Brothers",
    tier: "early",
    wiki: "The Barrows Brothers",
    blurb: "Six crypts, one tunnel, a chest that pays in degradable sets. The classic mid-game money route.",
    group: "solo",
    hpTier: 2,
    style: ["melee", "ranged", "magic", "necromancy"],
    dropHighlights: ["Dharok's greataxe", "Ahrim's staff", "Verac's flail", "Karil's pistol crossbow"],
    killTimeMin: 4,
    requirements: [MORYTANIA],
  },
  {
    id: "king-black-dragon",
    name: "King Black Dragon",
    tier: "early",
    wiki: "King Black Dragon",
    blurb: "Wilderness lair, three dragonbreath types, one very old grudge.",
    group: "solo",
    hpTier: 2,
    style: ["melee", "ranged", "magic", "necromancy"],
    dropHighlights: ["Draconic visage", "Dragon Rider gloves", "King black dragon head"],
    killTimeMin: 1,
    requirements: [
      {
        kind: "manual",
        id: "kbd-antifire",
        label: "Antifire cover for the lair",
        note: "Super antifire or an anti-dragon shield — his breath is otherwise lethal.",
      },
      { kind: "stat", stat: "combatLevel", value: 90, note: "Recommended floor, not a hard gate." },
    ],
  },
  {
    id: "chaos-elemental",
    name: "Chaos Elemental",
    tier: "early",
    wiki: "Chaos Elemental",
    blurb: "Deep Wilderness. Disarms you, teleports you around, and is other players' bait.",
    group: "solo",
    hpTier: 2,
    style: ["melee", "ranged", "magic", "necromancy"],
    dropHighlights: ["Dragon 2h sword", "Corrupt dragon equipment", "Chaos rune"],
    killTimeMin: 1.5,
    requirements: [
      {
        kind: "manual",
        id: "chaos-ele-wildy",
        label: "Comfortable in deep Wilderness",
        note: "The elemental is the easy part; the PKers are the content.",
      },
      { kind: "stat", stat: "combatLevel", value: 90, note: "Recommended floor, not a hard gate." },
    ],
  },
  {
    id: "corporeal-beast",
    name: "Corporeal Beast",
    tier: "early",
    wiki: "Corporeal Beast",
    blurb: "A damage sponge that halves most weapons. The spirit shield lottery.",
    group: "group",
    hpTier: 4,
    style: ["melee", "necromancy"],
    dropHighlights: ["Divine sigil", "Elysian sigil", "Arcane sigil", "Spirit shield"],
    killTimeMin: 3,
    requirements: [
      { kind: "quest", title: "Summer's End", note: "Killing the Spirit Beast is what created him." },
    ],
  },

  // -------------------------------------------------------------------------
  // Mid — the God Wars ladder and its neighbours.
  // -------------------------------------------------------------------------
  {
    id: "dagannoth-kings",
    name: "Dagannoth Kings",
    tier: "mid",
    wiki: "Dagannoth Kings",
    blurb: "Three kings, one room, a hard combat-triangle lesson. Rings and the Seercull.",
    group: "solo",
    hpTier: 3,
    style: ["melee", "ranged", "magic"],
    dropHighlights: ["Berserker ring", "Archers' ring", "Seers' ring", "Seercull"],
    killTimeMin: 2,
    requirements: [
      {
        kind: "quest",
        title: "The Fremennik Trials",
        note: "Needed before Jarvald will ferry you to Waterbirth Island.",
      },
    ],
  },
  {
    id: "kalphite-queen",
    name: "Kalphite Queen",
    tier: "mid",
    wiki: "Kalphite Queen",
    blurb: "Two forms, two styles, one rope you will forget to bring.",
    group: "solo",
    hpTier: 3,
    style: ["melee", "ranged", "magic", "necromancy"],
    dropHighlights: ["Dragon chainbody", "Kalphite queen head", "Dragon 2h sword", "Kalphite egg"],
    killTimeMin: 1.5,
    requirements: [
      {
        kind: "manual",
        id: "kq-ropes",
        label: "Two ropes for the hive",
        note: "One to enter the hive, one to drop into her chamber.",
      },
      { kind: "stat", stat: "combatLevel", value: 100, note: "Recommended floor, not a hard gate." },
    ],
  },
  {
    id: "queen-black-dragon",
    name: "Queen Black Dragon",
    tier: "mid",
    wiki: "Queen Black Dragon",
    blurb: "Solo-only, no-exit chamber at the bottom of the Grotworm Lair. Royal crossbow parts.",
    group: "solo",
    hpTier: 4,
    style: ["ranged", "magic", "necromancy"],
    dropHighlights: ["Royal sight", "Royal frame", "Dragonbone upgrade kit", "Draconic visage"],
    killTimeMin: 3,
    requirements: [
      { kind: "skill", skill: 23, level: 60, note: "Hard gate on the door to her chamber." },
    ],
  },
  {
    id: "general-graardor",
    name: "General Graardor",
    tier: "mid",
    wiki: "General Graardor",
    blurb: "Bandos's Stronghold. The friendliest of the four generals and the usual first GWD kill.",
    group: "group",
    hpTier: 4,
    style: ["melee", "ranged", "necromancy"],
    dropHighlights: ["Bandos chestplate", "Bandos tassets", "Bandos hilt"],
    killTimeMin: 1.5,
    requirements: [
      ...GWD1_ACCESS,
      { kind: "skill", skill: 2, level: 70, note: "Stronghold door. Not boostable." },
    ],
  },
  {
    id: "kreearra",
    name: "Kree'arra",
    tier: "mid",
    wiki: "Kree'arra",
    blurb: "Armadyl's Eyrie. Three bodyguards that hit all three styles at once.",
    group: "group",
    hpTier: 4,
    style: ["ranged", "magic", "necromancy"],
    dropHighlights: ["Armadyl chestplate", "Armadyl chainskirt", "Armadyl hilt"],
    killTimeMin: 1.5,
    requirements: [
      ...GWD1_ACCESS,
      { kind: "skill", skill: 4, level: 70, note: "Eyrie door. Not boostable." },
    ],
  },
  {
    id: "commander-zilyana",
    name: "Commander Zilyana",
    tier: "mid",
    wiki: "Commander Zilyana",
    blurb: "Saradomin's Encampment. Small, fast, and the hardest-hitting general per second.",
    group: "group",
    hpTier: 5,
    style: ["melee", "necromancy"],
    dropHighlights: ["Armadyl crossbow", "Saradomin sword", "Saradomin hilt"],
    killTimeMin: 1.5,
    requirements: [
      ...GWD1_ACCESS,
      { kind: "skill", skill: 16, level: 70, note: "Encampment door. Not boostable." },
    ],
  },
  {
    id: "kril-tsutsaroth",
    name: "K'ril Tsutsaroth",
    tier: "mid",
    wiki: "K'ril Tsutsaroth",
    blurb: "Zamorak's Fortress. Subjugation robes and the road to the Ancient Prison.",
    group: "group",
    hpTier: 4,
    style: ["melee", "necromancy"],
    dropHighlights: ["Zamorakian spear", "Garb of subjugation", "Zamorak hilt"],
    killTimeMin: 1.5,
    requirements: [
      ...GWD1_ACCESS,
      { kind: "skill", skill: 3, level: 70, note: "Fortress door. Not boostable." },
    ],
  },
  {
    id: "legiones",
    name: "Legiones",
    tier: "mid",
    wiki: "Legiones",
    blurb: "Six Ascended commanders, one keystone per entry. Ascension crossbow signets.",
    group: "solo",
    hpTier: 5,
    style: ["ranged", "necromancy"],
    dropHighlights: ["Ascension signet I", "Ascension grips", "Ascension Keystone"],
    killTimeMin: 2,
    requirements: [
      {
        kind: "skill",
        skill: 18,
        level: 95,
        boostable: true,
        note: "Only opens the laboratory door — 90 with a wild pie, 89 with a wilder pie.",
      },
      {
        kind: "manual",
        id: "legiones-keystone",
        label: "An Ascension Keystone",
        note: "One keystone is consumed per entry; they drop from the Ascension members.",
      },
    ],
  },
  {
    id: "gregorovic",
    name: "Gregorovic",
    tier: "mid",
    wiki: "Gregorovic",
    blurb: "Sliske's general in the Heart. Shadow clones, glaives, and a lot of moving.",
    group: "group",
    hpTier: 5,
    style: ["melee", "ranged", "necromancy"],
    dropHighlights: ["Shadow glaive", "Crest of Sliske", "Faceless mask"],
    killTimeMin: 2,
    requirements: [
      {
        kind: "skill",
        skill: 5,
        level: 80,
        boostable: true,
        note: "Sliske's section door. Wendlewick ale takes the real floor to 78.",
      },
    ],
  },
  {
    id: "helwyr",
    name: "Helwyr",
    tier: "mid",
    wiki: "Helwyr",
    blurb: "Seren's Cywir general. Mushrooms, bleeds, and a very punishing arena.",
    group: "group",
    hpTier: 5,
    style: ["melee", "necromancy"],
    dropHighlights: ["Wand of the Cywir elders", "Orb of the Cywir elders", "Crest of Seren"],
    killTimeMin: 2,
    requirements: [
      { kind: "skill", skill: 6, level: 80, boostable: true, note: "Seren's section door." },
    ],
  },

  // -------------------------------------------------------------------------
  // Late — where mechanics start mattering more than gear.
  // -------------------------------------------------------------------------
  {
    id: "twin-furies",
    name: "The Twin Furies",
    tier: "late",
    wiki: "The Twin Furies",
    blurb: "Nymora and Avaryss, killed together or not at all. The AoE-damage tutorial.",
    group: "group",
    hpTier: 5,
    style: ["melee", "necromancy"],
    dropHighlights: ["Blade of Avaryss", "Blade of Nymora", "Crest of Zamorak"],
    killTimeMin: 1.5,
    requirements: [
      {
        kind: "skill",
        skill: 4,
        level: 80,
        boostable: true,
        note: "Zamorak's section door. You do not have to fight them with Ranged.",
      },
    ],
  },
  {
    id: "vindicta",
    name: "Vindicta & Gorvek",
    tier: "late",
    wiki: "Vindicta & Gorvek",
    blurb: "Rider and dragon, three phases, 600k damage. Dragon Rider lance.",
    group: "group",
    hpTier: 6,
    style: ["melee", "ranged", "necromancy"],
    dropHighlights: ["Dragon Rider lance", "Crest of Zaros", "Dormant anima core body"],
    killTimeMin: 2,
    requirements: [
      { kind: "skill", skill: 0, level: 80, boostable: true, note: "Zaros's Bastion door." },
    ],
  },
  {
    id: "araxxor",
    name: "Araxxor",
    tier: "late",
    wiki: "Araxxor",
    blurb: "Three rotating paths, three styles, one Araxxi at the end. Noxious weapon components.",
    group: "duo",
    hpTier: 6,
    style: ["melee", "ranged", "magic"],
    dropHighlights: ["Araxxi's fang", "Araxxi's web", "Araxxi's eye", "Araxyte pheromone"],
    killTimeMin: 5,
    requirements: [
      MORYTANIA,
      {
        kind: "manual",
        id: "araxxor-paths",
        label: "Know the three hive paths",
        note: "No skill gate at all — the barrier is knowing minion/acid/darkness rotations.",
      },
    ],
  },
  {
    id: "kalphite-king",
    name: "Kalphite King",
    tier: "late",
    wiki: "Kalphite King",
    blurb: "Cycles all three styles mid-fight and summons marauders. Drygore weaponry.",
    group: "duo",
    hpTier: 6,
    style: ["melee", "ranged", "magic", "necromancy"],
    dropHighlights: ["Drygore rapier", "Drygore longsword", "Drygore mace", "Perfect chitin"],
    killTimeMin: 2.5,
    requirements: [
      {
        kind: "manual",
        id: "kk-switching",
        label: "Comfortable style-switching mid-fight",
        note: "Exiled Kalphite Hive has no level gate; his style cycle is the actual filter.",
      },
    ],
  },
  {
    id: "rise-of-the-six",
    name: "The Barrows: Rise of the Six",
    tier: "late",
    wiki: "The Barrows: Rise of the Six",
    blurb: "All six brothers at once across two realms. Tier 90 kiteshields.",
    group: "group",
    hpTier: 6,
    style: ["melee", "necromancy"],
    dropHighlights: ["Malevolent kiteshield", "Merciless kiteshield", "Vengeful kiteshield"],
    killTimeMin: 5,
    requirements: [
      MORYTANIA,
      {
        kind: "manual",
        id: "rots-totem",
        label: "A Barrows totem",
        note: "One totem per instance, and only the instance creator has to pay it.",
      },
    ],
  },
  {
    id: "nex",
    name: "Nex",
    tier: "late",
    wiki: "Nex",
    blurb: "Four phases, four elements, one frozen door. Torva, Pernix and Virtus.",
    group: "group",
    hpTier: 7,
    style: ["ranged", "magic", "necromancy"],
    dropHighlights: ["Torva platebody", "Pernix body", "Virtus robe top", "Zaryte bow"],
    killTimeMin: 3,
    requirements: [
      ...GWD1_ACCESS,
      // The four 70s are not the prison door itself — they are what it takes to
      // farm a key fragment from each of the four encampments.
      { kind: "skill", skill: 4, level: 70, note: "Armadyl encampment, for its key fragment." },
      { kind: "skill", skill: 2, level: 70, note: "Bandos encampment, for its key fragment." },
      { kind: "skill", skill: 16, level: 70, note: "Saradomin encampment, for its key fragment." },
      { kind: "skill", skill: 3, level: 70, note: "Zamorak encampment, for its key fragment." },
      {
        kind: "quest",
        title: "The Dig Site",
        note: "Required to assemble the four fragments into a frozen key.",
      },
    ],
  },
  {
    id: "vorago",
    name: "Vorago",
    tier: "late",
    wiki: "Vorago",
    blurb: "Weekly rotations, a seven-player team and a maul. Seismic weaponry.",
    group: "group",
    hpTier: 8,
    style: ["melee", "ranged", "magic"],
    dropHighlights: ["Seismic wand", "Seismic singularity", "Tectonic energy", "Ancient summoning stone"],
    killTimeMin: 12,
    requirements: [
      {
        kind: "manual",
        id: "vorago-rotations",
        label: "Learned the weekly rotation",
        note: "No stat gate. Ceiling collapse, Scopulus, Vitalis, Green bomb, TeamSplit and The End each play differently; hard mode needs a maul finish on all six.",
      },
    ],
  },
  {
    id: "beastmaster-durzag",
    name: "Beastmaster Durzag",
    tier: "late",
    wiki: "Beastmaster Durzag",
    blurb: "First half of Liberation of Mazcab. Beasts, cages, and strict role assignment.",
    group: "group",
    hpTier: 7,
    style: ["melee", "ranged", "magic", "necromancy"],
    dropHighlights: ["Achto Primeval mask", "Achto Tempest cowl", "Achto Teralith helmet"],
    killTimeMin: 8,
    requirements: [
      {
        kind: "manual",
        id: "mazcab-team",
        label: "A raid team and assigned roles",
        note: "Grouping System only — Mazcab has no stat gate, just a coordination one.",
      },
    ],
  },
  {
    id: "yakamaru",
    name: "Yakamaru",
    tier: "late",
    wiki: "Yakamaru",
    blurb: "Second half of Mazcab. Four pools, rotating hazards, the strictest role calls in the game.",
    group: "group",
    hpTier: 8,
    style: ["melee", "ranged", "magic", "necromancy"],
    dropHighlights: ["Achto Primeval robe top", "Achto Tempest body", "Yakamaru's helmet"],
    killTimeMin: 12,
    requirements: [
      {
        kind: "kc",
        boss: "Beastmaster Durzag",
        count: 1,
        note: "Bosses are fought in order unless everyone in the group has already cleared Durzag.",
      },
    ],
  },

  // -------------------------------------------------------------------------
  // End — the tier 92 and elder-god ceiling.
  // -------------------------------------------------------------------------
  {
    id: "telos",
    name: "Telos, the Warden",
    tier: "end",
    wiki: "Telos, the Warden",
    blurb: "Five phases that get longer and angrier with every kill. Every dye in the game.",
    group: "solo",
    hpTier: 7,
    style: ["melee", "ranged", "magic", "necromancy"],
    dropHighlights: ["Dormant Seren godbow", "Dormant Staff of Sliske", "Dormant Zaros godsword", "Shadow dye"],
    killTimeMin: 5,
    requirements: [
      // Reaching Telos means assembling an ancient sigil, which means killing
      // all four Heart of Gielinor generals at least once — so his gate is
      // exactly the union of the four GWD2 door requirements.
      { kind: "skill", skill: 0, level: 80, boostable: true, note: "Via Vindicta — sigil component." },
      { kind: "skill", skill: 4, level: 80, boostable: true, note: "Via the Twin Furies — sigil component." },
      { kind: "skill", skill: 6, level: 80, boostable: true, note: "Via Helwyr — sigil component." },
      { kind: "skill", skill: 5, level: 80, boostable: true, note: "Via Gregorovic — sigil component." },
    ],
  },
  {
    id: "solak",
    name: "Solak, Guardian of the Grove",
    tier: "end",
    wiki: "Solak, Guardian of the Grove",
    blurb: "Seven players, Merethiel, and the least forgiving mechanics in the game. Blightbound crossbows.",
    group: "group",
    hpTier: 9,
    style: ["ranged", "melee", "necromancy"],
    dropHighlights: ["Blightbound crossbow", "Erethdor's grimoire", "Cinderbane gloves", "Merethiel's stave"],
    killTimeMin: 12,
    requirements: [
      {
        kind: "manual",
        id: "solak-team",
        label: "A Solak team that knows the phases",
        note: "The Lost Grove has no entry requirements whatsoever — this is pure execution.",
      },
    ],
  },
  {
    id: "raksha",
    name: "Raksha, the Shadow Colossus",
    tier: "end",
    wiki: "Raksha, the Shadow Colossus",
    blurb: "Orthen Oubliette, three phases, shadow-realm swaps. Greater Ricochet and Chain.",
    group: "solo",
    hpTier: 8,
    style: ["melee", "necromancy"],
    dropHighlights: ["Fleeting boots", "Shadow spike", "Greater Ricochet ability codex", "Divert ability codex"],
    killTimeMin: 5,
    requirements: [
      { kind: "quest", title: "Desperate Times", note: "Unlocks Anachronia." },
      // Converted from a miniquest to a full quest in Feb 2023, so there is no
      // " (miniquest)" suffix on the RuneMetrics title any more.
      { kind: "quest", title: "Raksha, the Shadow Colossus", note: "The short quest that opens the encounter." },
    ],
  },
  {
    id: "kerapac",
    name: "Kerapac, the Bound",
    tier: "end",
    wiki: "Kerapac, the bound",
    blurb: "Nodon Front. Time bubbles, stuns, and the Fractured Staff of Armadyl in hard mode.",
    group: "solo",
    hpTier: 8,
    style: ["melee", "magic", "necromancy"],
    dropHighlights: ["Scripture of Jas", "Kerapac's wrist wraps", "Staff of Armadyl's fractured shaft"],
    killTimeMin: 5,
    requirements: [
      {
        kind: "manual",
        id: "kerapac-mechanics",
        label: "Learned the time-bubble rotation",
        note: "The Elder God Wars Dungeon has no access requirement and no killcount — the fight is the gate.",
      },
    ],
  },
  {
    id: "arch-glacor",
    name: "Arch-Glacor",
    tier: "end",
    wiki: "Arch-Glacor",
    blurb: "Wen Front. Normal mode lets you toggle mechanics on one at a time — the best learner boss at this tier.",
    group: "solo",
    hpTier: 7,
    style: ["melee", "ranged", "magic", "necromancy"],
    dropHighlights: ["Scripture of Wen", "Leng artefact", "Frozen core of Leng"],
    killTimeMin: 6,
    requirements: [
      {
        kind: "manual",
        id: "arch-glacor-mechanics",
        label: "Handled Frost Cannon and Exposed Core",
        note: "Zero mechanics enabled is a free kill; the gate is how many you switch on.",
      },
    ],
  },
  {
    id: "croesus",
    name: "Croesus",
    tier: "end",
    wiki: "Croesus",
    blurb: "The game's only skilling boss. Your gathering levels are your health bar.",
    group: "group",
    hpTier: 6,
    // No combat style at all — deliberately left undefined.
    dropHighlights: ["Cryptbloom top", "Croesus sporehammer", "Croesus spore sack", "Scripture of Bik"],
    killTimeMin: 15,
    requirements: [
      // The wiki is explicit that there are no hard requirements; 80 is the
      // recommended level and 88/92 gate the growth nodes on the front.
      { kind: "skill", skill: 21, level: 80, note: "Recommended, not required. 88 for Croesus Front nodes." },
      { kind: "skill", skill: 10, level: 80, note: "Recommended, not required." },
      { kind: "skill", skill: 14, level: 80, note: "Recommended, not required." },
      { kind: "skill", skill: 8, level: 80, note: "Recommended, not required." },
    ],
  },
  {
    id: "the-ambassador",
    name: "The Ambassador",
    tier: "end",
    wiki: "The Ambassador",
    blurb: "Final boss of Elite Dungeon 3. Shadow-realm phases and the Eldritch crossbow.",
    group: "duo",
    hpTier: 8,
    style: ["melee", "necromancy"],
    dropHighlights: ["Eldritch crossbow limb", "Eldritch crossbow stock", "Black stone heart", "Umbral urn"],
    killTimeMin: 5,
    requirements: [
      {
        kind: "manual",
        id: "shadow-reef-clear",
        label: "Cleared The Shadow Reef once",
        note: "ED3 has no hard access requirement — but you walk the dungeon until you unlock the chest skip.",
      },
    ],
  },
  {
    id: "zamorak",
    name: "Zamorak, Lord of Chaos",
    tier: "end",
    wiki: "Zamorak, Lord of Chaos",
    blurb: "Seven phases at the end of the Zamorakian Undercity. The Bow of the Last Guardian.",
    group: "group",
    hpTier: 9,
    style: ["melee", "magic", "necromancy"],
    dropHighlights: ["Top of the Last Guardian's bow", "Vestments of havoc robe top", "Codex of lost knowledge", "Chaos Roar ability codex"],
    killTimeMin: 8,
    requirements: [
      {
        kind: "manual",
        id: "conqueror-of-chaos",
        label: "Conqueror of Chaos",
        note: "One full non-story clear of The Zamorakian Undercity unlocks the direct teleport to him.",
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Apex — enrage-scaled and hard-mode variants. Nothing here is a stat check.
  // -------------------------------------------------------------------------
  {
    id: "telos-high-enrage",
    name: "Telos (100%+ enrage)",
    tier: "apex",
    wiki: "Telos, the Warden",
    blurb: "Past 100% he stops being a boss and starts being a skill ceiling. Trimmed comp gate.",
    group: "solo",
    hpTier: 9,
    style: ["melee", "ranged", "magic", "necromancy"],
    dropHighlights: ["Dormant Seren godbow", "Third-age dye", "Blood dye", "Telos' tendril"],
    killTimeMin: 10,
    requirements: [
      // Enrage only builds by killing him, so prior KC is literally the gate.
      { kind: "kc", boss: "Telos", count: 25, note: "Enrage accrues per kill — you cannot start at 100%." },
      {
        kind: "manual",
        id: "telos-p5",
        label: "Consistent phase 5 survival",
        note: "Trimmed completionist wants a 100% kill; the title wants 500%.",
      },
    ],
  },
  {
    id: "nex-angel-of-death",
    name: "Nex, Angel of Death",
    tier: "apex",
    wiki: "Nex, Angel of Death",
    blurb: "The hidden door past the original Nex. Tier 92 dual-wield magic and the praesul codex.",
    group: "group",
    hpTier: 10,
    style: ["ranged", "magic", "necromancy"],
    dropHighlights: ["Wand of the praesul", "Imperium core", "Praesul codex", "Intricate shadow chest"],
    killTimeMin: 6,
    requirements: [
      { kind: "skill", skill: 4, level: 70, note: "Same four key fragments as the original Nex." },
      { kind: "skill", skill: 2, level: 70 },
      { kind: "skill", skill: 16, level: 70 },
      { kind: "skill", skill: 3, level: 70 },
      { kind: "quest", title: "The Dig Site", note: "Required to assemble the frozen key." },
      {
        kind: "kc",
        boss: "Nex",
        count: 50,
        note: "Not enforced by the game — but AoD punishes anyone who has not learned the original first.",
      },
    ],
  },
  {
    id: "arch-glacor-hard",
    name: "Arch-Glacor (hard mode)",
    tier: "apex",
    wiki: "Arch-Glacor",
    blurb: "All mechanics on, permanently, with enrage on top. The Iceborn titles.",
    group: "solo",
    hpTier: 9,
    style: ["melee", "ranged", "magic", "necromancy"],
    dropHighlights: ["Glacor core", "Frozen core of Leng", "Scripture of Wen"],
    killTimeMin: 8,
    requirements: [
      { kind: "kc", boss: "Arch-Glacor", count: 25, note: "Normal mode with every mechanic enabled first." },
    ],
  },
  {
    id: "tzkal-zuk",
    name: "TzKal-Zuk",
    tier: "apex",
    wiki: "TzKal-Zuk",
    blurb: "TzekHaar Front. Waves, then Zuk. Checkpoints exist; a flawless run does not use them.",
    group: "solo",
    hpTier: 9,
    style: ["melee", "ranged", "magic", "necromancy"],
    dropHighlights: ["Scripture of Ful", "Magma Tempest ability codex", "Obsidian blade", "Magma core"],
    killTimeMin: 10,
    requirements: [
      {
        kind: "manual",
        id: "zuk-waves",
        label: "Can clear the TzekHaar waves",
        note: "The Elder God Wars Dungeon is ungated; the wave gauntlet before Zuk is the filter.",
      },
    ],
  },
  {
    id: "tzkal-zuk-hard",
    name: "TzKal-Zuk (hard mode)",
    tier: "apex",
    wiki: "TzKal-Zuk",
    blurb: "Hard mode plus the three challenge waves. The single longest continuous fight in RS3.",
    group: "solo",
    hpTier: 10,
    style: ["melee", "ranged", "magic", "necromancy"],
    dropHighlights: ["TzKal-Zuk's armour piece", "Ancient hilt", "Magma core"],
    killTimeMin: 12,
    requirements: [
      { kind: "kc", boss: "TzKal-Zuk", count: 10, note: "Hard mode has to be unlocked on normal first." },
      {
        kind: "manual",
        id: "zuk-flawless",
        label: "Flawless-run capable",
        note: "No leaving, no checkpoints, and all three challenge waves inside the timer.",
      },
    ],
  },
  {
    id: "rasial",
    name: "Rasial, the First Necromancer",
    tier: "apex",
    wiki: "Rasial, the First Necromancer",
    blurb: "The Necromancy capstone. Tier 95 armour and the Omni guard.",
    group: "solo",
    hpTier: 10,
    style: ["necromancy", "melee"],
    dropHighlights: ["Omni guard", "Soulbound lantern", "Crown of the First Necromancer", "Robe top of the First Necromancer"],
    killTimeMin: 4,
    requirements: [
      { kind: "quest", title: "Alpha vs Omega", note: "He is fought in story mode during the quest; clearing it opens the real encounter." },
      // The five levels below are what the Necromancy quest chain itself demands,
      // so they are a genuine hard gate on ever reaching him.
      { kind: "skill", skill: 28, level: 95, note: "Required to progress the Necromancy quest series." },
      { kind: "skill", skill: 24, level: 77, note: "Required to progress the Necromancy quest series." },
      { kind: "skill", skill: 27, level: 86, note: "Required to progress the Necromancy quest series." },
      { kind: "skill", skill: 6, level: 66, note: "Required to progress the Necromancy quest series." },
      { kind: "skill", skill: 5, level: 40, note: "Required to progress the Necromancy quest series." },
    ],
  },
  {
    id: "zamorak-high-enrage",
    name: "Zamorak (high enrage)",
    tier: "apex",
    wiki: "Zamorak, Lord of Chaos",
    blurb: "Hard mode scales to 60,000%. Selectable up to 4,000%, and the drop rate climbs the whole way.",
    group: "group",
    hpTier: 10,
    style: ["melee", "magic", "necromancy"],
    dropHighlights: ["Divine bowstring", "Bottom of the Last Guardian's bow", "Jewels of Zamorak"],
    killTimeMin: 12,
    requirements: [
      { kind: "kc", boss: "Zamorak", count: 50, note: "Enrage is chosen, but the uniques only pay off once you can hold 500%+." },
      {
        kind: "manual",
        id: "zamorak-p7",
        label: "Consistent phase 7 clears",
        note: "Titles start at 500% enrage and go gold at 4,000%.",
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TIER_ORDER: ContentTier[] = ["early", "mid", "late", "end", "apex"];

/** Bosses in one difficulty band, easiest-feeling first. */
export function bossesByTier(tier: ContentTier): BossEntry[] {
  return BOSSES.filter((b) => b.tier === tier).sort((a, b) => a.hpTier - b.hpTier);
}

/**
 * The bosses this account is closest to unlocking. Ties on gate progress are
 * broken by tier so a nearly-open early boss outranks a nearly-open apex one —
 * `rankByProximity` alone would happily suggest Zuk over the Giant Mole.
 */
export function nextBosses(
  ctx: EvalContext,
  limit = 6,
): { item: BossEntry; gate: GateResult }[] {
  return rankByProximity(BOSSES, ctx)
    .sort(
      (a, b) =>
        b.gate.pct - a.gate.pct ||
        TIER_ORDER.indexOf(a.item.tier) - TIER_ORDER.indexOf(b.item.tier) ||
        a.item.hpTier - b.item.hpTier,
    )
    .slice(0, limit);
}
