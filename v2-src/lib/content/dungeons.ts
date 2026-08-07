import type { ContentEntry, Requirement } from "../types";

// ---------------------------------------------------------------------------
// Elite Dungeons, raids, and the Necromancy endgame ladder.
//
// A note on how gates are modelled here. RS3 enforces very little at the door
// of its instanced PvE — ED2 and ED3 have literally no entry requirement, and
// Mazcab only asks that you can form a group. Encoding "nothing" would make
// these entries rank as instantly-complete and useless in the "what next" rail,
// so each entry carries:
//   - the real hard gates (quests), unannotated;
//   - recommended combat levels, every one of them tagged with a `note` saying
//     the game does not enforce it — these are community-consensus floors, not
//     door checks;
//   - `manual` entries for the things no API can see (a team, a learned
//     rotation, a gear tier).
// Anything without a note is a gate the game actually checks.
// ---------------------------------------------------------------------------

/** Skill ids used below, spelled out so the numbers aren't magic. */
const ATTACK = 0;
const DEFENCE = 1;
const CONSTITUTION = 3;
const RANGED = 4;
const PRAYER = 5;
const MAGIC = 6;
const SLAYER = 18;
const DUNGEONEERING = 24;
const ARCHAEOLOGY = 27;
const NECROMANCY = 28;

/** Shorthand for the "recommended, not enforced" case, which dominates here. */
function soft(skill: number, level: number, why: string): Requirement {
  return { kind: "skill", skill, level, note: `Recommended, not enforced — ${why}` };
}

export interface DungeonEntry extends ContentEntry {
  bosses: string[];
  /** Story mode halves enemy HP and cuts their damage ~90%, at the cost of
   *  most loot and achievements. All four Elite Dungeons offer it. */
  storyMode: boolean;
  /** Recommended *equipment* tier (RS3 gear tiers: 70/80/90/92…), not a
   *  difficulty band — `tier` already carries difficulty. */
  recommendedTier: number;
}

export interface RaidEntry extends ContentEntry {
  /** Party size the encounter is built and HP-scaled for. */
  scale: string;
  /** Ordered stages of a full clear, including non-boss gates. */
  phases: string[];
}

// ---------------------------------------------------------------------------
// Elite Dungeons
// ---------------------------------------------------------------------------

export const ELITE_DUNGEONS: DungeonEntry[] = [
  {
    id: "ed1-temple-of-aminishi",
    name: "Temple of Aminishi (ED1)",
    tier: "mid",
    wiki: "Temple of Aminishi",
    blurb: "Five floors under the Arc to free Seiryu — the gentlest introduction to elite dungeoneering.",
    bosses: ["Sanctum Guardian", "Masuta the Ascended", "Seiryu the Azure Serpent"],
    storyMode: true,
    recommendedTier: 70,
    requirements: [
      // The only thing the game checks: ED1 sits on Aminishi, which is Arc
      // territory, and the Arc is gated behind this quest.
      { kind: "quest", title: "Impressing the Locals" },
      soft(CONSTITUTION, 80, "Masuta's spear phase punishes low HP pools"),
      soft(ATTACK, 75, "tier 75 weapons are the practical floor for a clean run"),
    ],
  },
  {
    id: "ed2-dragonkin-laboratory",
    name: "Dragonkin Laboratory (ED2)",
    tier: "mid",
    wiki: "Dragonkin Laboratory",
    blurb: "One open map of Dactyl experiments in the deep Wilderness, and the only ED whose trash counts for Slayer.",
    bosses: ["Astellarn", "Verak Lith", "Black Stone Dragon"],
    storyMode: true,
    recommendedTier: 80,
    requirements: [
      // No quest, no level check — the entrance is simply inside the Wilderness.
      soft(CONSTITUTION, 85, "Black Stone Dragon's fire wall chunks unprepared players"),
      soft(SLAYER, 90, "not required to enter, but unlocks the dragons as assignable tasks"),
      {
        kind: "manual",
        id: "ed2-dragonbane",
        label: "Dragonbane ammo / Dragon Slayer perk",
        // All three bosses are dragons, so bane gear is a straight ~40% damage
        // swing rather than a nice-to-have.
        note: "Every boss here is a dragon — bane gear roughly halves kill times",
      },
    ],
  },
  {
    id: "ed3-the-shadow-reef",
    name: "The Shadow Reef (ED3)",
    tier: "late",
    wiki: "The Shadow Reef",
    blurb: "Ulthven Kreath, drowned and Xau-Tak-touched — sixteen minibosses and the hardest ED of the black stone trilogy.",
    bosses: ["The Crassian Leviathan", "Taraket the Necromancer", "The Ambassador"],
    storyMode: true,
    recommendedTier: 85,
    requirements: [
      // The wiki is explicit: no hard requirements to access the dungeon.
      soft(CONSTITUTION, 90, "The Ambassador's shadow phases are a sustained DPS check"),
      soft(PRAYER, 95, "Soul Split carries the Ambassador fight"),
      {
        kind: "manual",
        id: "ed3-ambassador-rotation",
        label: "Learned The Ambassador's rotation",
        note: "Reef is a knowledge check more than a stat check",
      },
    ],
  },
  {
    id: "ed4-zamorakian-undercity",
    name: "The Zamorakian Undercity (ED4)",
    tier: "apex",
    wiki: "The Zamorakian Undercity",
    blurb: "Senntisten's occupied undercity into Infernus and out to the Wilderness Crater, ending on Zamorak himself at up to 60,000% enrage.",
    bosses: ["Mefis, the Jailer", "Eterna, Ritual Leader", "Zamorak, Lord of Chaos"],
    storyMode: true,
    recommendedTier: 92,
    requirements: [
      // The overworld entrance is the ancient door north of the Archaeology
      // Guild, which stays shut until City of Senntisten is done. Note that
      // Aftermath is NOT a prerequisite — it's the reverse, that quest requires
      // clearing this dungeon.
      { kind: "quest", title: "City of Senntisten", note: "Opens the ancient door that leads into Senntisten" },
      soft(CONSTITUTION, 99, "enemy HP scales with party size and enrage"),
      soft(DEFENCE, 92, "tier 92 tank gear is the practical floor above 1,000% enrage"),
      {
        kind: "manual",
        id: "ed4-enrage-plan",
        label: "Chosen an enrage floor (0-4,000%)",
        note: "Enrage is player-selected up to 4,000%, then climbs in 100% steps to a 60,000% cap",
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Raids
//
// Sanctum of Rebirth is grouped here rather than with the Elite Dungeons on
// purpose: the wiki states outright that despite the similarities it is not
// considered an Elite Dungeon.
// ---------------------------------------------------------------------------

export const RAIDS: RaidEntry[] = [
  {
    id: "liberation-of-mazcab",
    name: "Liberation of Mazcab",
    tier: "end",
    wiki: "Liberation of Mazcab",
    blurb: "RuneScape's first raid — free the goebies from Beastmaster Durzag, then drown Yakamaru in the canals.",
    scale: "1-10 players (designed for 10)",
    phases: [
      "Goebie prisoners — 39 kills",
      "Beastmaster Durzag (with Tuz and Krar)",
      "Canal puzzle",
      "Yakamaru",
    ],
    requirements: [
      // No quest and no level check; the raid is entered purely through the
      // Grouping System, which is why the only hard-ish gates here are manual.
      {
        kind: "manual",
        id: "mazcab-team",
        label: "Raid team via the Grouping System",
        note: "Mazcab cannot be entered solo in practice — the encounter needs a full group",
      },
      soft(CONSTITUTION, 95, "Durzag's bombs and Yakamaru's sharks hit hard on a 10-man"),
      soft(RANGED, 90, "tier 90 weapons are the community floor for Yakamaru"),
      {
        kind: "manual",
        id: "mazcab-yakamaru-roles",
        label: "Learned a Yakamaru role",
        note: "Yakamaru is role-assigned (north/south/cache) — turning up without one wipes the team",
      },
    ],
  },
  {
    id: "sanctum-of-rebirth",
    name: "Sanctum of Rebirth",
    tier: "end",
    wiki: "Sanctum of Rebirth",
    blurb: "Jalamenti, Amascut's drowned temple beneath Um — three telegraphed bosses and the only source of tier 95 dual-wield magic.",
    scale: "1-4 players (enemy HP scales to team size)",
    phases: [
      "Vermyx, Brood Mother",
      "Kezalam, the Wanderer",
      "Nakatra, Devourer Eternal",
    ],
    requirements: [
      // Both quests are genuine door checks per the dungeon infobox.
      { kind: "quest", title: "Necromancy!" },
      { kind: "quest", title: "Soul Searching" },
      soft(CONSTITUTION, 95, "hard mode drops the Divine Protection safety net entirely"),
      {
        kind: "manual",
        id: "sanctum-hard-mode",
        label: "Cleared normal mode (unlocks hard mode)",
        note: "Hard mode is gated behind a normal-mode clear and follows normal death rules",
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// The Necromancy ladder, 1 → 120.
//
// Two systems interleave here and it's easy to conflate them:
//   - the level-up table, which is a plain skill gate; and
//   - the talents tree, where each tier needs a Necromancy level AND a soul
//     count in the Well of Souls AND (from tier 3) a quest. Souls are invisible
//     to the API, so they ride as `manual` requirements.
// Where an unlock sits at a higher level than its talent tier (e.g. Darkness is
// tier 6, which opens at 80, but needs 86 to cast) the higher number is the one
// encoded — that's the level that actually lets you press the button.
// ---------------------------------------------------------------------------

export const NECRO_LADDER: ContentEntry[] = [
  {
    id: "necro-quest-necromancy",
    name: "Necromancy!",
    tier: "early",
    wiki: "Necromancy!",
    blurb: "Death drags you through the Underworld portal to the City of Um. Starts the skill, the ritual site and the whole story.",
    requirements: [],
  },
  {
    id: "necro-conjure-skeleton-warrior",
    name: "Conjure Skeleton Warrior",
    tier: "early",
    wiki: "Conjure Skeleton Warrior",
    blurb: "First conjure and first talent — a halberd-range melee skeleton that fights whatever you last hit.",
    requirements: [
      // Talent tier 1 opens at Necromancy 1 with a single soul, but the ability
      // itself needs level 2.
      { kind: "skill", skill: NECROMANCY, level: 2 },
      { kind: "manual", id: "necro-souls-1", label: "1 soul in the Well of Souls" },
    ],
  },
  {
    id: "necro-quest-kili-row",
    name: "Kili Row",
    tier: "early",
    wiki: "Kili Row",
    blurb: "Kili the Imcando dwarf ensouls her tools and opens the soul forge — every Death Skull / deathwarden tier upgrade runs through her.",
    requirements: [{ kind: "skill", skill: NECROMANCY, level: 20 }],
  },
  {
    id: "necro-command-skeleton-warrior",
    name: "Command Skeleton Warrior",
    tier: "early",
    wiki: "Command Skeleton Warrior",
    blurb: "Whip the skeleton into ten attacks over six seconds instead of two.",
    requirements: [
      { kind: "skill", skill: NECROMANCY, level: 20 },
      { kind: "manual", id: "necro-souls-50", label: "50 souls in the Well of Souls" },
    ],
  },
  {
    id: "necro-quest-rune-mythos",
    name: "Rune Mythos",
    tier: "early",
    wiki: "Rune Mythos",
    blurb: "Impure essence, spirit runes and incantations. Also the hard prerequisite for talent tier 3.",
    requirements: [{ kind: "skill", skill: NECROMANCY, level: 24 }],
  },
  {
    id: "necro-city-of-um-teleport",
    name: "City of Um Teleport",
    tier: "early",
    wiki: "City of Um Teleport",
    blurb: "Incantation home to Um, plus the lesser essence ritual for making your own impure essence.",
    requirements: [
      { kind: "skill", skill: NECROMANCY, level: 24 },
      { kind: "quest", title: "Rune Mythos" },
    ],
  },
  {
    id: "necro-death-skulls",
    name: "Death Skulls",
    tier: "early",
    wiki: "Death Skulls",
    blurb: "The ultimate that carries Necromancy from 28 to 120 — skulls that bounce up to five times.",
    // Genuinely level 28. It reads like a late unlock but arrives astonishingly
    // early, which is most of why Necromancy levels so fast.
    requirements: [{ kind: "skill", skill: NECROMANCY, level: 28 }],
  },
  {
    id: "necro-conjures-tier3",
    name: "Vengeful Ghost & Putrid Zombie",
    tier: "mid",
    wiki: "Conjure Vengeful Ghost",
    blurb: "Talent tier 3 doubles your undead roster: a healing/debuff ghost and a zombie you eventually detonate.",
    requirements: [
      { kind: "skill", skill: NECROMANCY, level: 40 },
      { kind: "quest", title: "Rune Mythos" },
      { kind: "manual", id: "necro-souls-400", label: "400 souls in the Well of Souls" },
    ],
  },
  {
    id: "necro-threads-of-fate",
    name: "Threads of Fate",
    tier: "mid",
    wiki: "Threads of Fate",
    blurb: "Incantation that splits single-target basics across nearby enemies — the whole Necromancy AoE game.",
    requirements: [
      { kind: "skill", skill: NECROMANCY, level: 44 },
      { kind: "quest", title: "Rune Mythos" },
    ],
  },
  {
    id: "necro-quest-vessel-of-the-harbinger",
    name: "Vessel of the Harbinger",
    tier: "mid",
    wiki: "Vessel of the Harbinger",
    blurb: "Third First Necromancer quest — the Well of Souls' origin, and the first entry needing Prayer alongside Necromancy.",
    requirements: [
      { kind: "skill", skill: NECROMANCY, level: 46 },
      { kind: "skill", skill: PRAYER, level: 40 },
    ],
  },
  {
    id: "necro-soul-sap",
    name: "Soul Sap & Soul Strike",
    tier: "mid",
    wiki: "Soul Sap",
    blurb: "The Residual Soul generator/spender pair that feeds Volley of Souls later on.",
    requirements: [{ kind: "skill", skill: NECROMANCY, level: 54 }],
  },
  {
    id: "necro-greater-rituals",
    name: "Greater rituals & tier 2 ritual site",
    tier: "mid",
    wiki: "Rituals",
    blurb: "Greater necroplasm, communion and ensoul material, tier II glyphs, greater ghostly ink — the ritual XP engine opens up.",
    requirements: [
      { kind: "skill", skill: NECROMANCY, level: 60 },
      { kind: "quest", title: "Kili Row", note: "Gates the ensoul material rituals specifically" },
    ],
  },
  {
    id: "necro-quest-spirit-of-war",
    name: "The Spirit of War",
    tier: "mid",
    wiki: "The Spirit of War",
    blurb: "Beat Hermod to reach Rasial's citadel — and unlock him as a repeatable boss at roughly GWD1 difficulty.",
    requirements: [{ kind: "skill", skill: NECROMANCY, level: 65 }],
  },
  {
    id: "necro-hermod",
    name: "Hermod, the Spirit of War",
    tier: "late",
    wiki: "Hermod, the Spirit of War",
    blurb: "The approachable half of the Necromancy endgame. Phantom, so salve and Undead Slayer both apply.",
    requirements: [
      { kind: "quest", title: "The Spirit of War" },
      soft(NECROMANCY, 70, "the quest fight is tuned lower than the repeatable encounter"),
    ],
  },
  {
    id: "necro-volley-of-souls",
    name: "Volley of Souls",
    tier: "mid",
    wiki: "Volley of Souls",
    blurb: "Dump Residual Soul stacks for 135-165% damage each — five stacks with a soulbound lantern.",
    requirements: [{ kind: "skill", skill: NECROMANCY, level: 66 }],
  },
  {
    id: "necro-conjure-phantom-guardian",
    name: "Conjure Phantom Guardian",
    tier: "late",
    wiki: "Conjure Phantom Guardian",
    blurb: "Fourth conjure. No auto-attack — it exists to absorb damage for you.",
    requirements: [
      // Pure talent-tier unlock: the Phantom never appears in the level-up
      // table, so tier 5's own level is the gate.
      { kind: "skill", skill: NECROMANCY, level: 70 },
      { kind: "manual", id: "necro-souls-4500", label: "4,500 souls in the Well of Souls" },
    ],
  },
  {
    id: "necro-quest-tomes-of-the-warlock",
    name: "Tomes of the Warlock",
    tier: "late",
    wiki: "Tomes of the Warlock",
    blurb: "The incantation gate. Every talent-tree incantation from Greater Bone Shield up needs this done.",
    // The Archaeology 86 here is the real spike in the whole Necromancy chain —
    // most players hit this wall long before the Necromancy requirement.
    requirements: [
      { kind: "skill", skill: NECROMANCY, level: 75 },
      { kind: "skill", skill: ARCHAEOLOGY, level: 86 },
      { kind: "skill", skill: MAGIC, level: 66 },
    ],
  },
  {
    id: "necro-living-death",
    name: "Living Death & Life Transfer",
    tier: "late",
    wiki: "Living Death",
    blurb: "Become Death for 30 seconds; Life Transfer trades half your health to keep conjures alive through it.",
    requirements: [
      { kind: "skill", skill: NECROMANCY, level: 76 },
      // Living Death alone is a plain level unlock; Life Transfer is the half
      // that needs the quest.
      { kind: "quest", title: "Tomes of the Warlock", note: "Required for Life Transfer, not for Living Death" },
    ],
  },
  {
    id: "necro-invoke-death",
    name: "Invoke Death",
    tier: "late",
    wiki: "Invoke Death",
    blurb: "Death Mark execution — drop a marked target below 30k or 20% HP and it simply dies.",
    requirements: [
      { kind: "skill", skill: NECROMANCY, level: 80 },
      { kind: "quest", title: "Tomes of the Warlock" },
      { kind: "manual", id: "necro-souls-8500", label: "8,500 souls in the Well of Souls" },
    ],
  },
  {
    id: "necro-quest-remains-of-the-necrolord",
    name: "Remains of the Necrolord",
    tier: "late",
    wiki: "Remains of the Necrolord",
    blurb: "Sixth First Necromancer quest, and the only one that asks for Dungeoneering.",
    requirements: [
      { kind: "skill", skill: NECROMANCY, level: 85 },
      { kind: "skill", skill: DUNGEONEERING, level: 77 },
    ],
  },
  {
    id: "necro-darkness",
    name: "Darkness",
    tier: "late",
    wiki: "Darkness",
    blurb: "Damage-reduction incantation — the defensive backbone of high-enrage necromancy.",
    requirements: [
      { kind: "skill", skill: NECROMANCY, level: 86 },
      { kind: "quest", title: "Tomes of the Warlock" },
    ],
  },
  {
    id: "necro-powerful-rituals",
    name: "Powerful rituals & tier 3 ritual site",
    tier: "late",
    wiki: "Rituals",
    blurb: "Powerful necroplasm and communion, tier III glyphs, powerful ghostly ink — top-end ritual throughput.",
    requirements: [{ kind: "skill", skill: NECROMANCY, level: 90 }],
  },
  {
    id: "necro-split-soul",
    name: "Split Soul",
    tier: "end",
    wiki: "Split Soul",
    blurb: "Soul Split stops healing and starts dealing 4x that damage instead. The single biggest necromancy DPS lever.",
    requirements: [
      { kind: "skill", skill: NECROMANCY, level: 92 },
      // Easy to miss — Split Soul is the one talent gated behind a Zarosian
      // quest rather than the Necromancy chain.
      { kind: "quest", title: "The Temple at Senntisten" },
      { kind: "manual", id: "necro-souls-35000", label: "35,000 souls in the Well of Souls" },
    ],
  },
  {
    id: "necro-quest-alpha-vs-omega",
    name: "Alpha vs Omega",
    tier: "end",
    wiki: "Alpha vs Omega",
    blurb: "Seventh and final First Necromancer quest — beat Rasial in story mode to unlock the real encounter.",
    requirements: [
      { kind: "skill", skill: NECROMANCY, level: 95 },
      { kind: "quest", title: "Remains of the Necrolord" },
    ],
  },
  {
    id: "necro-tier-95-gear",
    name: "Omni guard, soulbound lantern & First Necromancer robes",
    tier: "end",
    wiki: "Omni guard",
    blurb: "Rasial's drops: the tier 95 conduit, the lantern that raises Residual Soul cap to five, and tier 95 power robes.",
    requirements: [
      { kind: "skill", skill: NECROMANCY, level: 95 },
      // The robes are the only piece with a Defence gate.
      { kind: "skill", skill: DEFENCE, level: 95, note: "Robes of the First Necromancer only" },
      { kind: "kc", boss: "Rasial, the First Necromancer", count: 1 },
    ],
  },
  {
    id: "necro-ruination",
    name: "Ruination",
    tier: "end",
    wiki: "Ruination",
    blurb: "Necromancy's damage curse: +12 effective levels and +12% damage. Learned from Selene with a praesul codex.",
    requirements: [
      { kind: "skill", skill: NECROMANCY, level: 95 },
      { kind: "skill", skill: PRAYER, level: 99 },
      {
        kind: "manual",
        id: "necro-praesul-codex",
        label: "Praesul codex handed to Selene",
        note: "Hand it over unread — reading it yourself wastes the codex",
      },
    ],
  },
  {
    id: "necro-rasial",
    name: "Rasial, the First Necromancer",
    tier: "apex",
    wiki: "Rasial, the First Necromancer",
    blurb: "Solo-only, necromancy-only, level 8,462. The skill's final exam and the source of its best-in-slot gear.",
    // These five levels aren't checked at his door — they're the union of the
    // quest chain's requirements, which you must clear to reach him at all.
    requirements: [
      { kind: "quest", title: "Alpha vs Omega" },
      { kind: "skill", skill: NECROMANCY, level: 95 },
      { kind: "skill", skill: DUNGEONEERING, level: 77 },
      { kind: "skill", skill: ARCHAEOLOGY, level: 86 },
      { kind: "skill", skill: MAGIC, level: 66 },
      { kind: "skill", skill: PRAYER, level: 40 },
    ],
  },
  {
    id: "necro-conjure-undead-army",
    name: "Conjure Undead Army",
    tier: "end",
    wiki: "Conjure Undead Army",
    blurb: "All four conjures in one keypress, for double the ectoplasm. The last talent on the tree.",
    requirements: [
      { kind: "skill", skill: NECROMANCY, level: 99 },
      { kind: "manual", id: "necro-souls-35000", label: "35,000 souls in the Well of Souls" },
    ],
  },
  {
    id: "necro-120",
    name: "Necromancy 120",
    tier: "apex",
    wiki: "Necromancy",
    blurb: "True mastery. Four simultaneous conjures at 106, then 104 million XP of nothing but the number going up.",
    // 99 is "skill mastery"; 120 is "true skill mastery" and unlocks nothing
    // mechanical beyond the 106 conjure cap along the way.
    requirements: [{ kind: "skill", skill: NECROMANCY, level: 120 }],
  },
];

/**
 * Every dungeon, raid and Necromancy unlock in one list, for the unified
 * "what can I do next" ranking. Widened to ContentEntry because the extra
 * DungeonEntry / RaidEntry fields aren't meaningful across the mixed set.
 */
export function allDungeonContent(): ContentEntry[] {
  return [...ELITE_DUNGEONS, ...RAIDS, ...NECRO_LADDER];
}
