// Major goals — the long campaigns a player runs at for weeks.
//
// Ported 1:1 from the legacy vanilla app (goals.js). Every skill level, quest
// title, manual checkbox id and tier assignment is carried over unchanged; the
// only structural change is that the three parallel arrays (skills/quests/
// manual) collapse into a single Requirement[] so goals share the evaluator
// with bosses, capes and gear tiers.
//
// Manual ids are preserved verbatim (`sn_cat`, `pe_crystal_seed`, …) — they are
// the storage keys players already have ticked in localStorage.

import type {
  ContentEntry,
  ContentTier,
  GateResult,
  Requirement,
} from "../types";
import { rankByProximity, type EvalContext } from "../requirements";

export interface MajorGoal extends ContentEntry {
  /** The quest that closes the arc. Completing it implies every prerequisite
   *  was met at some point, so the UI may treat the whole goal as done.
   *  Absent on grind-gated goals (Necromancy 99, Base 50). */
  capstone?: string;
  /** Ordered quest chain, split into readable stages. Only ROTM has one — its
   *  55-quest run is unreadable as a flat list. */
  phases?: { id: string; title: string; quests: string[] }[];
  color: "soul" | "prayer" | "ash";
}

/** Every skill counted by the Base 50 goal.
 *  Invention (26) is deliberately excluded: it is itself gated behind
 *  80 Crafting/Divination/Smithing, so a fresh account cannot train it at all
 *  and would sit at 0% on a goal meant to be an early-game checklist. */
const BASE_50_SKILLS: number[] = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21,
  22, 23, 24, 25, 27, 28,
];

/** ROTM's quest chain. Held separately so the flattened requirement list and
 *  the phase tree can never drift apart. */
const ROTM_PHASES: { id: string; title: string; quests: string[] }[] = [
  {
    id: "p1",
    title: "Senntisten Chain",
    quests: [
      "Death Plateau",
      "Priest in Peril",
      "Stolen Hearts",
      "Diamond in the Rough",
      "Gertrude's Cat",
      "Icthlarin's Little Helper",
      "The Golem",
      "The Dig Site",
      "Troll Stronghold",
      "Temple of Ikov",
      "What Lies Below",
      "Creature of Fenkenstrain",
      "The Restless Ghost",
      "Garden of Tranquillity",
      "Missing My Mummy",
      "Family Crest",
      "The Tale of the Muspah",
      "Defender of Varrock",
      "Desert Treasure",
      "Devious Minds",
      "The Curse of Arrav",
      "The Temple at Senntisten",
    ],
  },
  {
    id: "p2",
    title: "Lunar / WGS Chain",
    quests: [
      "Jungle Potion",
      "Shilo Village",
      "Lost City",
      "The Fremennik Trials",
      "Lunar Diplomacy",
      "Dream Mentor",
      "Dragon Slayer",
      "Heroes' Quest",
      "Legends' Quest",
      "Tree Gnome Village",
      "The Grand Tree",
      "Waterfall Quest",
      "The Eyes of Glouphrie",
      "The Path of Glouphrie",
      "Tears of Guthix",
      "Enter the Abyss (miniquest)",
      "Wanted!",
      "The Hunt for Surok (miniquest)",
      "While Guthix Sleeps",
    ],
  },
  {
    id: "p3",
    title: "Pre-Ritual",
    quests: [
      "Hazeel Cult",
      "Enakhra's Lament",
      "Sea Slug",
      "The Slug Menace",
      "A Fairy Tale I - Growing Pains",
      "A Fairy Tale II - Cure a Queen",
      "Pirate's Treasure",
      "Rum Deal",
      "Cabin Fever",
      "A Tail of Two Cats",
      "Fight Arena",
      "The General's Shadow (miniquest)",
      "The Curse of Zaros (miniquest)",
    ],
  },
  {
    id: "p4",
    title: "The Ritual",
    quests: ["Ritual of the Mahjarrat"],
  },
];

/** Phase quests, deduped, in chain order. Mirrors the legacy IIFE that
 *  flattened `phases` into `quests` for progress counting. */
function flattenPhases(
  phases: { id: string; title: string; quests: string[] }[],
): Requirement[] {
  const seen = new Set<string>();
  const out: Requirement[] = [];
  for (const phase of phases) {
    for (const title of phase.quests) {
      if (seen.has(title)) continue;
      seen.add(title);
      out.push({ kind: "quest", title });
    }
  }
  return out;
}

export const MAJOR_GOALS: MajorGoal[] = [
  {
    id: "senntisten",
    name: "Road to Soul Split",
    tier: "mid",
    wiki: "The Temple at Senntisten",
    blurb: "Temple at Senntisten — Unlock Ancient Curses",
    icon: "Soul_Split.png",
    color: "soul",
    capstone: "The Temple at Senntisten",
    requirements: [
      // Combat & gathering, all inherited from the Curse of Arrav chain.
      { kind: "skill", skill: 16, level: 61, note: "The Curse of Arrav" },
      { kind: "skill", skill: 14, level: 64, note: "The Curse of Arrav" },
      { kind: "skill", skill: 2, level: 64, note: "The Curse of Arrav" },
      { kind: "skill", skill: 4, level: 64, note: "The Curse of Arrav" },
      { kind: "skill", skill: 13, level: 65, note: "Devious Minds" },
      { kind: "skill", skill: 17, level: 66, note: "The Curse of Arrav" },
      { kind: "skill", skill: 23, level: 41, note: "The Curse of Arrav" },
      { kind: "skill", skill: 18, level: 37, note: "The Curse of Arrav" },
      { kind: "skill", skill: 21, level: 51, note: "Defender of Varrock" },
      // Desert Treasure / Devious Minds / Family Crest.
      { kind: "skill", skill: 6, level: 59, note: "Family Crest" },
      { kind: "skill", skill: 11, level: 50, note: "Desert Treasure" },
      { kind: "skill", skill: 9, level: 50, note: "Devious Minds" },
      { kind: "skill", skill: 20, level: 50, note: "Devious Minds" },
      // Missing My Mummy and its 100%-completion bonus.
      { kind: "skill", skill: 22, level: 35, note: "Missing My Mummy" },
      { kind: "skill", skill: 7, level: 35, note: "Missing My Mummy" },
      { kind: "skill", skill: 12, level: 45, note: "Missing My Mummy 100%" },
      { kind: "skill", skill: 5, level: 50, note: "Temple at Senntisten" },
      // Two Prayer gates on purpose: 50 opens the quest, but Soul Split is a
      // Prayer-92 ability — the altar is useless without the level.
      { kind: "skill", skill: 5, level: 92, note: "Soul Split (ability)" },
      { kind: "skill", skill: 19, level: 25, note: "Garden of Tranquillity" },

      { kind: "quest", title: "Priest in Peril" },
      { kind: "quest", title: "Death Plateau" },
      { kind: "quest", title: "Goblin Diplomacy" },
      { kind: "quest", title: "The Lost Tribe" },
      { kind: "quest", title: "Stolen Hearts" },
      { kind: "quest", title: "Diamond in the Rough" },
      { kind: "quest", title: "Gertrude's Cat" },
      { kind: "quest", title: "The Dig Site" },
      { kind: "quest", title: "The Tourist Trap" },
      { kind: "quest", title: "Temple of Ikov" },
      { kind: "quest", title: "The Tale of the Muspah" },
      { kind: "quest", title: "The Golem" },
      { kind: "quest", title: "Nature Spirit" },
      { kind: "quest", title: "Creature of Fenkenstrain" },
      { kind: "quest", title: "Garden of Tranquillity" },
      { kind: "quest", title: "Family Crest" },
      { kind: "quest", title: "What Lies Below" },
      { kind: "quest", title: "Troll Stronghold" },
      { kind: "quest", title: "Icthlarin's Little Helper" },
      { kind: "quest", title: "Missing My Mummy" },
      { kind: "quest", title: "Wanted!" },
      { kind: "quest", title: "Devious Minds" },
      { kind: "quest", title: "Desert Treasure" },
      { kind: "quest", title: "Defender of Varrock" },
      { kind: "quest", title: "The Curse of Arrav" },
      { kind: "quest", title: "Shield of Arrav" },
      { kind: "quest", title: "The Knight's Sword" },
      { kind: "quest", title: "Recruitment Drive" },
      { kind: "quest", title: "What's Mine is Yours" },
      { kind: "quest", title: "The Restless Ghost" },
      { kind: "quest", title: "The Temple at Senntisten" },

      { kind: "manual", id: "sn_cat", label: "Cat grown (Gertrude's Cat)" },
      { kind: "manual", id: "sn_senliten", label: "Senliten restored 100%" },
      { kind: "manual", id: "sn_ice_gloves", label: "Ice Gloves obtained" },
      { kind: "manual", id: "sn_dt_supplies", label: "Desert Treasure supplies" },
      { kind: "manual", id: "sn_kudos", label: "125 Museum Kudos" },
    ],
  },
  {
    id: "prifddinas",
    name: "Road to Prifddinas",
    tier: "mid",
    wiki: "Prifddinas",
    blurb: "Plague's End — Unlock the elf city",
    icon: "Prifddinas_lodestone_icon.png",
    color: "prayer",
    capstone: "Plague's End",
    requirements: [
      { kind: "skill", skill: 16, level: 75, note: "Plague's End" },
      { kind: "skill", skill: 22, level: 75, note: "Plague's End" },
      { kind: "skill", skill: 12, level: 75, note: "Plague's End" },
      { kind: "skill", skill: 24, level: 75, note: "Plague's End" },
      { kind: "skill", skill: 15, level: 75, note: "Plague's End" },
      { kind: "skill", skill: 14, level: 75, note: "Plague's End" },
      { kind: "skill", skill: 5, level: 75, note: "Plague's End" },
      { kind: "skill", skill: 23, level: 75, note: "Plague's End" },
      { kind: "skill", skill: 4, level: 75, note: "Within the Light" },
      { kind: "skill", skill: 8, level: 75, note: "Within the Light" },
      { kind: "skill", skill: 9, level: 70, note: "Within the Light" },
      { kind: "skill", skill: 17, level: 50, note: "Mourning's End Part I" },
      { kind: "skill", skill: 7, level: 30, note: "Big Chompy Bird Hunting" },

      { kind: "quest", title: "Plague City" },
      { kind: "quest", title: "Biohazard" },
      { kind: "quest", title: "Underground Pass" },
      { kind: "quest", title: "Regicide" },
      { kind: "quest", title: "Roving Elves" },
      { kind: "quest", title: "Mourning's End Part I" },
      { kind: "quest", title: "Mourning's End Part II" },
      { kind: "quest", title: "Within the Light" },
      { kind: "quest", title: "Big Chompy Bird Hunting" },
      { kind: "quest", title: "Sheep Herder" },
      { kind: "quest", title: "Catapult Construction" },
      { kind: "quest", title: "Making History" },
      { kind: "quest", title: "Plague's End" },

      { kind: "manual", id: "pe_mourning_gear", label: "Mourning gear ready" },
      { kind: "manual", id: "pe_agility_short", label: "Underground Pass shortcuts" },
      { kind: "manual", id: "pe_crystal_seed", label: "Crystal seed obtained" },
    ],
  },
  {
    id: "worldwakes",
    name: "The World Wakes",
    tier: "mid",
    wiki: "The World Wakes",
    blurb: "Unlock Sunshine & Death's Swiftness",
    icon: "Sunshine.png",
    color: "prayer",
    capstone: "The World Wakes",
    requirements: [
      { kind: "skill", skill: 6, level: 76, note: "Sunshine" },
      { kind: "skill", skill: 4, level: 76, note: "Death's Swiftness" },
      { kind: "skill", skill: 1, level: 85, note: "Natural Instinct" },
      { kind: "skill", skill: 3, level: 85, note: "Guthix's Blessing" },
      // Firemaking/Slayer gate the post-quest rewards, not the quest itself.
      { kind: "skill", skill: 11, level: 74, note: "Full quest rewards" },
      { kind: "skill", skill: 18, level: 70, note: "Full quest rewards" },

      { kind: "quest", title: "The World Wakes" },

      { kind: "manual", id: "ww_combat_100", label: "Combat level 100+ (recommended)" },
      { kind: "manual", id: "ww_food_pots", label: "Food and potions for the boss" },
    ],
  },
  {
    id: "invention",
    name: "Unlock Invention",
    tier: "mid",
    wiki: "Invention",
    blurb: "80 Crafting + 80 Divination + 80 Smithing",
    icon: "Invention-icon.png",
    color: "ash",
    // No capstone — Invention is unlocked by the tutorial, not a quest.
    requirements: [
      { kind: "skill", skill: 12, level: 80, note: "Invention unlock" },
      { kind: "skill", skill: 25, level: 80, note: "Invention unlock" },
      { kind: "skill", skill: 13, level: 80, note: "Invention unlock" },

      { kind: "manual", id: "inv_tutorial", label: "Invention Tutorial complete" },
      { kind: "manual", id: "inv_augmentor", label: "First augmentor crafted" },
      { kind: "manual", id: "inv_gizmo", label: "First gizmo with a perk" },
    ],
  },
  {
    id: "rotm",
    name: "Ritual of the Mahjarrat",
    tier: "end",
    wiki: "Ritual of the Mahjarrat",
    blurb: "Grandmaster — capstone of the Zaros/Mahjarrat arc",
    icon: "Ritual_of_the_Mahjarrat.png",
    color: "soul",
    capstone: "Ritual of the Mahjarrat",
    phases: ROTM_PHASES,
    requirements: [
      // Aggregate: the highest level demanded anywhere in the 55-quest chain,
      // so the gate reflects the whole run rather than the final quest alone.
      { kind: "skill", skill: 16, level: 77, note: "ROTM" },
      { kind: "skill", skill: 12, level: 76, note: "ROTM" },
      { kind: "skill", skill: 14, level: 76, note: "ROTM" },
      { kind: "skill", skill: 6, level: 75, note: "While Guthix Sleeps" },
      { kind: "skill", skill: 19, level: 65, note: "While Guthix Sleeps" },
      { kind: "skill", skill: 15, level: 65, note: "While Guthix Sleeps" },
      { kind: "skill", skill: 17, level: 66, note: "Curse of Arrav" },
      { kind: "skill", skill: 4, level: 64, note: "Curse of Arrav" },
      { kind: "skill", skill: 2, level: 64, note: "Curse of Arrav" },
      { kind: "skill", skill: 21, level: 55, note: "While Guthix Sleeps" },
      { kind: "skill", skill: 13, level: 65, note: "Devious Minds" },
      { kind: "skill", skill: 5, level: 50, note: "Temple at Senntisten" },
      { kind: "skill", skill: 20, level: 50, note: "Devious Minds" },
      { kind: "skill", skill: 9, level: 50, note: "Devious Minds" },
      { kind: "skill", skill: 11, level: 50, note: "Desert Treasure" },
      { kind: "skill", skill: 23, level: 41, note: "Curse of Arrav" },
      { kind: "skill", skill: 1, level: 40, note: "While Guthix Sleeps" },
      { kind: "skill", skill: 22, level: 35, note: "Missing My Mummy" },
      { kind: "skill", skill: 7, level: 35, note: "Missing My Mummy" },

      ...flattenPhases(ROTM_PHASES),

      { kind: "manual", id: "rotm_combat", label: "Combat 100+ recommended" },
      { kind: "manual", id: "rotm_supplies", label: "Loadout: brews, restores, T70+ food" },
      { kind: "manual", id: "rotm_aviantese", label: "Aviantese & Glacors studied" },
    ],
  },
  {
    id: "sliske",
    name: "Sliske's Endgame",
    tier: "end",
    wiki: "Sliske's Endgame",
    blurb: "Sixth Age capstone — Mahjarrat arc",
    color: "ash",
    capstone: "Sliske's Endgame",
    requirements: [
      // Levels come from The Light Within / Children of Mah / Fate of the Gods.
      // Sliske's Endgame itself adds no new skill gate beyond finishing those.
      { kind: "skill", skill: 5, level: 80, note: "The Light Within" },
      { kind: "skill", skill: 16, level: 80, note: "Sliske's Endgame" },
      { kind: "skill", skill: 12, level: 80, note: "Children of Mah" },
      { kind: "skill", skill: 9, level: 80, note: "Children of Mah" },
      { kind: "skill", skill: 13, level: 80, note: "Children of Mah" },
      { kind: "skill", skill: 14, level: 80, note: "Children of Mah" },
      { kind: "skill", skill: 18, level: 80, note: "Children of Mah" },
      { kind: "skill", skill: 25, level: 80, note: "Children of Mah" },
      { kind: "skill", skill: 6, level: 79, note: "Fate of the Gods" },
      { kind: "skill", skill: 17, level: 75, note: "Children of Mah" },
      { kind: "skill", skill: 22, level: 75, note: "Children of Mah" },

      { kind: "quest", title: "Missing, Presumed Death" },
      { kind: "quest", title: "The World Wakes" },
      { kind: "quest", title: "Ritual of the Mahjarrat" },
      { kind: "quest", title: "The Branches of Darkmeyer" },
      { kind: "quest", title: "The Light Within" },
      { kind: "quest", title: "Fate of the Gods" },
      { kind: "quest", title: "Children of Mah" },
      // Direct prerequisites of the Sliske's Endgame quest itself.
      { kind: "quest", title: "The Death of Chivalry" },
      { kind: "quest", title: "One of a Kind" },
      { kind: "quest", title: "A Tail of Two Cats" },
      { kind: "quest", title: "Holy Grail" },
      { kind: "quest", title: "Nomad's Elegy" },
      { kind: "quest", title: "Dishonour among Thieves" },
      { kind: "quest", title: "Nomad's Requiem" },
      { kind: "quest", title: "Heart of Stone" },
      { kind: "quest", title: "The Mighty Fall" },
      { kind: "quest", title: "Throne of Miscellania" },
      { kind: "quest", title: "The Void Stares Back" },
      { kind: "quest", title: "Kindred Spirits" },
      { kind: "quest", title: "Hero's Welcome" },
      { kind: "quest", title: "Sliske's Endgame" },

      { kind: "manual", id: "sl_combat_110", label: "Combat 110+ recommended" },
      { kind: "manual", id: "sl_supplies", label: "T80+ supplies ready" },
    ],
  },
  {
    id: "necromancy_99",
    name: "Necromancy 99",
    tier: "end",
    wiki: "Necromancy",
    blurb: "Mastery of the new combat style",
    icon: "Necromancy-icon.png",
    color: "ash",
    // Deliberately no capstone. The legacy file used "Rune Mythos", which only
    // needs Necromancy 24 — it marked the 99 goal complete at level 24.
    requirements: [
      { kind: "skill", skill: 28, level: 99, note: "Necromancy 99" },

      { kind: "manual", id: "nec_unlocked", label: "Necromancy unlocked" },
      { kind: "manual", id: "nec_t90", label: "T90 weapons crafted" },
    ],
  },
  {
    id: "base_50",
    name: "Base 50 across the board",
    tier: "early",
    wiki: "Skills",
    blurb: "Every skill at level 50+",
    color: "prayer",
    requirements: BASE_50_SKILLS.map(
      (skill): Requirement => ({ kind: "skill", skill, level: 50, note: "Base 50" }),
    ),
  },
];

export function goalsByTier(tier: ContentTier): MajorGoal[] {
  return MAJOR_GOALS.filter((g) => g.tier === tier);
}

/**
 * Goals the player is closest to finishing, most-complete first. Finished
 * goals drop out entirely (rankByProximity filters them), so this is safe to
 * render straight into a "what's next" rail.
 */
export function nextGoals(
  ctx: EvalContext,
  limit = 3,
): { item: MajorGoal; gate: GateResult }[] {
  return rankByProximity(MAJOR_GOALS, ctx).slice(0, limit);
}

export function goalById(id: string): MajorGoal | undefined {
  return MAJOR_GOALS.find((g) => g.id === id);
}
