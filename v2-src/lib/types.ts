// Shared types for the v2 app. Names mirror the legacy parse() output so
// the UI can use the same vocabulary as the cron + jq validators.

export interface MetaJson {
  timestamp: string;
  lastRun: string;
  lastChange: string;
}

export interface ProfileSkill {
  id: number;
  level: number;
  xp: number; // raw XP * 10 from RuneMetrics
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

// Merged player object — single source of truth for every page.
export interface Player {
  slug: string; // "soclopata" / "decxus" / "fiorovizk"
  name: string; // canonical casing
  rank: string;
  totalLevel: number;
  totalXp: number; // real XP, NOT *10
  combatLevel: number;
  questsDone: number;
  questsStarted: number;
  questsNone: number;
  totalQuests: number;
  activities: RuneMetricsActivity[];
  skills: Record<number, { level: number; xp: number; rank: number }>;
  runeScore: number;
  clues: { easy: number; medium: number; hard: number; elite: number; master: number };
  questList: QuestEntry[];
  questPoints: number;
}
