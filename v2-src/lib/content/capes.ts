import type { ContentEntry, GateResult, Requirement } from "../types";
import type { EvalContext } from "../requirements";
import { evaluate, rankByProximity } from "../requirements";
import { SKILLS } from "../skills";

/**
 * Capes and completionist goals.
 *
 * Capes are the cleanest expression of the requirement model: every one of them
 * is a pure gate with no drop table, no rotation and no gear check. The 99/120
 * capes are generated from SKILLS rather than hand-written so a cap change in
 * skills.ts propagates here for free.
 */

export interface CapeEntry extends ContentEntry {
  category: "skill" | "quest" | "master" | "completionist" | "milestone";
  /** The cape perk, one line. */
  reward?: string;
}

// ---------------------------------------------------------------------------
// Shared constants
// ---------------------------------------------------------------------------

/**
 * Skills with a real master cape *item*. This is deliberately narrower than
 * "every skill whose cap is 120" — several skills reached 120 in later cap
 * raises without a master cape being minted, and inventing a wiki slug for a
 * cape that has no page is worse than omitting it. Those skills are still
 * covered by the "Every skill at its cap" milestone below.
 *
 * Herblore, Slayer, Farming, Dungeoneering, Invention, Archaeology, Necromancy.
 */
const MASTER_CAPE_SKILLS: readonly number[] = [15, 18, 19, 24, 26, 27, 28];

/**
 * 99 costs 13,034,431 XP; 120 on the standard curve costs 104,273,167 — eight
 * times the whole 1-99 grind for 21 levels. Elite skills (Invention) run a
 * different curve and are cheaper, which is why no per-skill XP figure is
 * baked into the generated blurbs.
 */
const MASTER_LEVEL = 120;

const ALL_SKILLS_99: Requirement[] = SKILLS.map((s): Requirement => ({
  kind: "skill",
  skill: s.id,
  level: 99,
}));

const ALL_MASTER_CAPES_120: Requirement[] = MASTER_CAPE_SKILLS.map((id): Requirement => ({
  kind: "skill",
  skill: id,
  level: MASTER_LEVEL,
}));

/** Derived so it tracks skills.ts instead of drifting when a cap moves. */
const MAX_TOTAL_LEVEL = SKILLS.reduce((n, s) => n + s.max, 0);

/**
 * Cape perks, by skill id.
 *
 * Only perks that have been stable for years are listed. A wrong perk line is
 * worse than a blank one, so skills whose cape perk has been reworked or that
 * I cannot state exactly are left undefined rather than guessed.
 */
const CAPE_PERKS: Record<number, string> = {
  5: "Operate to restore Prayer points, once per day.",
  6: "Operate to switch spellbook anywhere, unlimited uses.",
  22: "Unlimited teleports to your player-owned house.",
  23: "Operate to restore Summoning points, once per day.",
  24: "Unlimited teleports to Daemonheim.",
};

// ---------------------------------------------------------------------------
// Generated skill capes
// ---------------------------------------------------------------------------

/**
 * All 29 level-99 Capes of Accomplishment, plus the seven master capes.
 * Wiki slugs follow the "<Skill> cape" / "<Skill> master cape" convention,
 * which holds for every skill — no exceptions to special-case.
 */
export function skillCapes(): CapeEntry[] {
  const out: CapeEntry[] = [];

  for (const s of SKILLS) {
    const slug = s.key.toLowerCase();

    out.push({
      id: `cape-${slug}`,
      name: `${s.key} cape`,
      tier: "late",
      wiki: `${s.key} cape`,
      category: "skill",
      blurb: `Level 99 ${s.key}. Sold by the skill's cape master for 99,000 coins; trims itself the moment a second 99 lands.`,
      reward: CAPE_PERKS[s.id],
      requirements: [{ kind: "skill", skill: s.id, level: 99 }],
    });

    if (MASTER_CAPE_SKILLS.includes(s.id)) {
      out.push({
        id: `cape-${slug}-master`,
        name: `${s.key} master cape`,
        tier: "end",
        wiki: `${s.key} master cape`,
        category: "master",
        blurb: `Level ${MASTER_LEVEL} ${s.key}. Only seven skills have a true master cape; this is one of them.`,
        requirements: [{ kind: "skill", skill: s.id, level: MASTER_LEVEL }],
      });
    }
  }

  return out;
}

// ---------------------------------------------------------------------------
// Quest capes
// ---------------------------------------------------------------------------

/**
 * The quest capes gate on "every quest" / "every miniquest", which the
 * Requirement model has no primitive for. The pattern used here and in the
 * completionist entries below: a `manual` catch-all carries the real gate, and
 * a curated handful of the genuinely last-to-fall entries are listed as real
 * `quest` requirements so the progress bar and bottleneck analysis have
 * something concrete to chew on. Every listed quest is a *necessary* condition,
 * so the gate is sound — just deliberately incomplete.
 */
const QUEST_CAPES: CapeEntry[] = [
  {
    id: "cape-quest-point",
    name: "Quest point cape",
    tier: "late",
    wiki: "Quest point cape",
    category: "quest",
    blurb: "Every quest in the game complete. Claimed from the Wise Old Man in Draynor Village.",
    requirements: [
      {
        kind: "manual",
        id: "quest:all-complete",
        label: "Every quest complete",
        note: "Cross-check against the quest list on your profile — RuneMetrics reports the exact remaining count.",
      },
      // The six below are the usual last blockers: each needs either a hard
      // solo boss fight or a deep skill requirement that outlives the rest of
      // the quest list.
      { kind: "quest", title: "The World Wakes", note: "Solo fight against a full-power god." },
      { kind: "quest", title: "Fate of the Gods", note: "Divination-gated and combat heavy." },
      { kind: "quest", title: "The Light Within", note: "The broadest skill requirement spread of any quest." },
      { kind: "quest", title: "Nomad's Elegy", note: "Multi-phase solo boss, no safespot." },
      { kind: "quest", title: "Sliske's Endgame", note: "Boss gauntlet; the classic quest-cape wall." },
      { kind: "quest", title: "Extinction", note: "Late Elder God storyline, Archaeology gated." },
    ],
  },
  {
    id: "cape-master-quest",
    name: "Master quest cape",
    tier: "end",
    wiki: "Master quest cape",
    category: "quest",
    blurb: "Quest cape, plus every miniquest and the full MQC achievement checklist.",
    requirements: [
      { kind: "manual", id: "cape:quest-point", label: "Quest point cape earned" },
      {
        kind: "manual",
        id: "quest:all-miniquests",
        label: "Every miniquest complete",
        note: "Covers the miniquests not listed individually below.",
      },
      // Miniquest titles carry a literal " (miniquest)" suffix in RuneMetrics.
      // Dropping it makes the requirement permanently unsatisfiable.
      { kind: "quest", title: "Enter the Abyss (miniquest)" },
      { kind: "quest", title: "The Curse of Zaros (miniquest)" },
      { kind: "quest", title: "Bar Crawl (miniquest)" },
      { kind: "quest", title: "The General's Shadow (miniquest)" },
      { kind: "quest", title: "Mahjarrat Memories (miniquest)" },
      { kind: "quest", title: "Hopespear's Will (miniquest)" },
      { kind: "quest", title: "Rune Mechanics" },
      {
        kind: "quest",
        title: "Curse of the Black Stone",
        note: "Requires all six Elite Dungeon storylines — the hardest miniquest by a distance.",
      },
      {
        kind: "manual",
        id: "mqc:achievements",
        label: "All quest-related achievements on the MQC checklist",
        note: "The authoritative list lives on the Master quest cape wiki page and changes with every quest release.",
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Completionist capes
// ---------------------------------------------------------------------------

/**
 * CURATED SUBSET — NOT THE OFFICIAL LIST.
 *
 * The completionist cape gates on several hundred individual achievements and
 * the trimmed cape adds several hundred more; both lists change with every
 * major update. What follows models the major, stable gates as real
 * requirements (all 99s, all quests) and folds the long tail into a small
 * number of clearly-labelled `manual` entries. Treat the wiki pages
 * "Completionist cape" and "Trimmed completionist cape" as authoritative.
 */
const COMPLETIONIST_CAPES: CapeEntry[] = [
  {
    id: "cape-completionist",
    name: "Completionist cape",
    tier: "apex",
    wiki: "Completionist cape",
    category: "completionist",
    blurb: "Every skill at 99, every quest done, and the standing achievement checklist cleared.",
    reward: "Every skillcape perk at once, on a fully recolourable cape.",
    requirements: [
      ...ALL_SKILLS_99,
      { kind: "manual", id: "quest:all-complete", label: "Every quest complete" },
      {
        kind: "manual",
        id: "comp:task-sets",
        label: "All area task sets complete",
        note: "Every region's easy through elite tasks.",
      },
      { kind: "manual", id: "comp:music", label: "All music tracks unlocked" },
      {
        kind: "manual",
        id: "comp:fight-kiln",
        label: "Fight Kiln complete (TokHaar-Kal)",
      },
      {
        kind: "manual",
        id: "comp:barbarian-assault",
        label: "Barbarian Assault: level 5 in all four roles",
      },
      {
        kind: "manual",
        id: "comp:elite-dungeons",
        label: "All Elite Dungeon story modes complete",
      },
      {
        kind: "manual",
        id: "comp:remaining",
        label: "Remaining completionist requirements",
        note: "The long tail of individual achievements — see the Completionist cape wiki page for the current list.",
      },
    ],
  },
  {
    id: "cape-trimmed-completionist",
    name: "Trimmed completionist cape",
    tier: "apex",
    wiki: "Trimmed completionist cape",
    category: "completionist",
    blurb: "The completionist cape plus the optional grind pile — the longest goal in the game.",
    reward: "Identical perks to the completionist cape; the trim is pure status.",
    requirements: [
      { kind: "manual", id: "cape:completionist", label: "Completionist cape earned" },
      {
        kind: "manual",
        id: "trim:reaper-crew",
        label: "Reaper Crew",
        note: "Kill every boss on Death's reaper task list at least once.",
      },
      {
        kind: "manual",
        id: "trim:champions",
        label: "Champion's Challenge complete",
        note: "All champion scrolls, including the Champion of Champions.",
      },
      {
        kind: "manual",
        id: "trim:remaining",
        label: "Remaining trimmed requirements",
        note: "Several hundred further achievements — see the Trimmed completionist cape wiki page.",
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Milestones
// ---------------------------------------------------------------------------

/**
 * 200M XP markers are `manual`, not `skill`, on purpose. 200,000,000 XP sits
 * past level 120 in virtual-level territory, and RuneMetrics only ever reports
 * the capped level — a `skill` requirement above the cap could never be met,
 * which is exactly the class of permanently-unsatisfiable gate to avoid.
 */
const MILESTONES: CapeEntry[] = [
  {
    id: "cape-max",
    name: "Max cape",
    tier: "end",
    wiki: "Max cape",
    category: "milestone",
    blurb: "Level 99 in all 29 skills. Bought from the Max Guild for 2,277,000 coins.",
    reward: "Combines the perk of every level 99 skillcape into one slot.",
    requirements: ALL_SKILLS_99,
  },
  {
    id: "milestone-all-master-capes",
    name: "Every master cape",
    tier: "apex",
    wiki: "Master skillcape",
    category: "milestone",
    blurb: "Level 120 in all seven skills that have a master cape.",
    requirements: ALL_MASTER_CAPES_120,
  },
  {
    id: "milestone-total-cap",
    name: "Every skill at its cap",
    tier: "apex",
    wiki: "Total level",
    category: "milestone",
    // Derived from SKILLS so the target follows any future cap raise.
    blurb: `Total level ${MAX_TOTAL_LEVEL} — every skill sitting on its hard cap, not just 99.`,
    requirements: [{ kind: "stat", stat: "totalLevel", value: MAX_TOTAL_LEVEL }],
  },
  {
    id: "milestone-200m-first",
    name: "First 200M",
    tier: "apex",
    wiki: "Experience",
    category: "milestone",
    blurb: "200,000,000 XP in any single skill — the per-skill experience ceiling.",
    requirements: [
      {
        kind: "manual",
        id: "200m:any",
        label: "200,000,000 XP in any skill",
        note: "Roughly twice the XP of level 120 on the standard curve.",
      },
    ],
  },
  {
    id: "milestone-200m-all",
    name: "Max XP",
    tier: "apex",
    wiki: "Experience",
    category: "milestone",
    blurb: "200,000,000 XP in all 29 skills — 5.8 billion total, the end of the XP track.",
    requirements: [
      { kind: "manual", id: "200m:all", label: "200,000,000 XP in every skill (5.8B total)" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Public surface
// ---------------------------------------------------------------------------

export const CAPES: CapeEntry[] = [
  ...skillCapes(),
  ...QUEST_CAPES,
  ...COMPLETIONIST_CAPES,
  ...MILESTONES,
];

export function capeProgress(cape: CapeEntry, ctx: EvalContext): GateResult {
  return evaluate(cape.requirements, ctx);
}

/** Closest unearned capes first. */
export function nextCapes(
  ctx: EvalContext,
  limit = 6,
): { item: CapeEntry; gate: GateResult }[] {
  return rankByProximity(CAPES, ctx).slice(0, limit);
}
