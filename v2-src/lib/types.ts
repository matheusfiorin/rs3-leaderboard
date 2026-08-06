// Shared types for the app. Names mirror the legacy parse() output so the UI
// keeps the same vocabulary as the cron + jq validators.

export interface MetaJson {
  timestamp: string;
  lastRun: string;
  lastChange: string;
}

export interface ProfileSkill {
  id: number;
  level: number;
  xp: number; // RuneMetrics reports per-skill XP in tenths
  rank: number;
}

export interface RuneMetricsActivity {
  date: string; // "13-Jun-2026 13:07"
  text: string;
  details: string;
}

export interface RuneMetricsProfile {
  name: string;
  rank: string;
  combatlevel: number;
  totalskill: number;
  // NOTE: unlike skillvalues[].xp, this field is already whole XP — do NOT
  // divide by 10. Verified against sum(skillvalues.xp)/10 on live data.
  totalxp: number;
  magic: number;
  ranged: number;
  melee: number;
  questscomplete: number;
  questsstarted: number;
  questsnotstarted: number;
  loggedIn: "true" | "false";
  activities: RuneMetricsActivity[];
  skillvalues: ProfileSkill[];
  error?: string;
}

export interface HiscoreSkill {
  id: number;
  name: string;
  rank: number;
  level: number;
  xp: number;
}

export interface HiscoreActivity {
  id: number;
  name: string;
  rank: number;
  score: number;
}

export interface Hiscores {
  name: string;
  skills: HiscoreSkill[];
  activities: HiscoreActivity[];
}

export type QuestStatus = "COMPLETED" | "STARTED" | "NOT_STARTED";

export interface QuestEntry {
  title: string;
  status: QuestStatus;
  difficulty: number;
  members: boolean;
  questPoints: number;
  userEligible: boolean;
}

export interface QuestsJson {
  loggedIn?: "true" | "false";
  quests: QuestEntry[];
}

export type GePrices = Record<string, { name: string; price: number }>;

export type Accent = "soul" | "prayer" | "ash";

/**
 * Light player record — everything except the 44 KB quest list.
 *
 * This is what lives in client context and gets revalidated every few minutes.
 * Pages that need quest data pull it separately via `useQuests()` so the RSC
 * payload for e.g. /money doesn't carry 363 quest entries per player.
 */
export interface PlayerSummary {
  slug: string;
  name: string;
  accent: Accent;
  rank: string;
  totalLevel: number;
  /** Real XP. RuneMetrics `totalxp` is already whole — never divided. */
  totalXp: number;
  combatLevel: number;
  melee: number;
  magic: number;
  ranged: number;
  questsDone: number;
  questsStarted: number;
  questsNone: number;
  totalQuests: number;
  activities: RuneMetricsActivity[];
  skills: Record<number, { level: number; xp: number; rank: number }>;
  runeScore: number;
  clues: { easy: number; medium: number; hard: number; elite: number; master: number };
  /** Minigame/activity scores keyed by hiscore activity name. Note this does
   *  NOT include boss kill counts — RS3's index_lite endpoint only exposes
   *  minigames, so boss KC is user-entered via the progress store. */
  activityScores: Record<string, number>;
}

/** Full player record — summary plus the quest list. */
export interface Player extends PlayerSummary {
  questList: QuestEntry[];
  questPoints: number;
}

// ---------------------------------------------------------------------------
// Unified requirement model
//
// Every gated thing in the app — a boss, a cape, a gear tier, an elite dungeon,
// a major goal — expresses its entry conditions as Requirement[]. One evaluator
// (lib/requirements.ts) scores them all, so a new content module gets progress
// rings, gap lists and "closest unlock" ranking for free.
// ---------------------------------------------------------------------------

export type Requirement =
  /** Skill at or above `level`. `boostable` marks levels a potion can cover. */
  | { kind: "skill"; skill: number; level: number; boostable?: boolean; note?: string }
  /** Named quest completed. Title must match RuneMetrics exactly, including
   *  any " (miniquest)" suffix. */
  | { kind: "quest"; title: string; note?: string }
  /** Total level / combat level / quest points threshold. */
  | { kind: "stat"; stat: "totalLevel" | "combatLevel" | "questPoints" | "runeScore"; value: number; note?: string }
  /** Boss kill count. RS3 exposes no public per-player boss KC, so this reads
   *  from the user-entered progress store rather than the API. */
  | { kind: "kc"; boss: string; count: number; note?: string }
  /** Anything the API can't see — owning an item, unlocking a teleport, having
   *  learned a rotation. Tracked by a manual checkbox, synced across devices. */
  | { kind: "manual"; id: string; label: string; note?: string };

export interface RequirementResult {
  req: Requirement;
  met: boolean;
  /** Human-readable current-vs-target, e.g. "82 / 90". */
  current: string;
  /** Distance to completion in the requirement's own unit. 0 when met. */
  gap: number;
  /** 0-100 progress toward this single requirement. */
  pct: number;
}

export interface GateResult {
  results: RequirementResult[];
  met: RequirementResult[];
  missing: RequirementResult[];
  /** 0-100, evenly weighted across requirements. */
  pct: number;
  complete: boolean;
}

/** Difficulty banding shared by bosses, elite dungeons and raids. */
export type ContentTier = "early" | "mid" | "late" | "end" | "apex";

export interface ContentEntry {
  id: string;
  name: string;
  tier: ContentTier;
  /** runescape.wiki page slug. */
  wiki: string;
  /** Short one-line hook shown on the card. */
  blurb: string;
  requirements: Requirement[];
  /** Optional icon filename under /data/icons/. */
  icon?: string;
}
