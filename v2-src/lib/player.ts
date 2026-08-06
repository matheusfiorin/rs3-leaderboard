// Pure player-shaping logic. No `server-only`, no fs — imported by both the
// server data loader and the client revalidator so a summary built at build
// time and one built from a live fetch are byte-identical in shape.

import type {
  Accent,
  Hiscores,
  PlayerSummary,
  QuestEntry,
  RuneMetricsActivity,
  RuneMetricsProfile,
} from "./types";

export const PLAYERS: { slug: string; name: string; accent: Accent }[] = [
  { slug: "decxus", name: "Decxus", accent: "soul" },
  { slug: "soclopata", name: "Soclopata", accent: "prayer" },
];

export const MEMORIAL = { slug: "fiorovizk", name: "Fiorovizk", accent: "ash" as Accent };

export function accentFor(slug: string): Accent {
  if (slug === MEMORIAL.slug) return MEMORIAL.accent;
  return PLAYERS.find((p) => p.slug === slug)?.accent ?? "prayer";
}

/**
 * Merge RuneMetrics profile + hiscores into a PlayerSummary.
 *
 * XP unit trap: `skillvalues[].xp` arrives in tenths and must be divided by 10,
 * but `totalxp` is already whole XP. Dividing both — as the first v2 cut did —
 * under-reported every player by 10x.
 */
export function mergeSummary(
  slug: string,
  profile: RuneMetricsProfile,
  hiscores: Hiscores | null,
  canonicalName: string,
): PlayerSummary {
  const skills: PlayerSummary["skills"] = {};
  for (const s of profile.skillvalues || []) {
    skills[s.id] = { level: s.level, xp: Math.floor(s.xp / 10), rank: s.rank };
  }

  let runeScore = 0;
  const clues = { easy: 0, medium: 0, hard: 0, elite: 0, master: 0 };
  const activityScores: Record<string, number> = {};
  for (const a of hiscores?.activities ?? []) {
    activityScores[a.name] = a.score;
    if (a.name === "RuneScore") runeScore = a.score;
    const m = a.name.match(/Clue Scrolls \((\w+)\)/);
    if (m) {
      const k = m[1] as keyof typeof clues;
      if (k in clues) clues[k] = a.score;
    }
  }

  return {
    slug,
    name: canonicalName,
    accent: accentFor(slug),
    rank: profile.rank,
    totalLevel: profile.totalskill,
    totalXp: profile.totalxp ?? 0,
    combatLevel: profile.combatlevel,
    melee: profile.melee ?? 0,
    magic: profile.magic ?? 0,
    ranged: profile.ranged ?? 0,
    questsDone: profile.questscomplete,
    questsStarted: profile.questsstarted,
    questsNone: profile.questsnotstarted,
    totalQuests:
      profile.questscomplete + profile.questsstarted + profile.questsnotstarted,
    activities: profile.activities || [],
    skills,
    runeScore,
    clues,
    activityScores,
  };
}

// ---------------------------------------------------------------------------
// Activity
// ---------------------------------------------------------------------------

const MONTH: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

/** Parse RuneMetrics "DD-MMM-YYYY HH:MM" into a Date. */
export function parseActivityDate(raw: string): Date | null {
  const m = raw?.match(/^(\d{2})-([A-Za-z]{3})-(\d{4})\s+(\d{2}):(\d{2})/);
  if (!m) return null;
  const mon = MONTH[m[2]];
  if (mon === undefined) return null;
  return new Date(+m[3], mon, +m[1], +m[4], +m[5]);
}

export type ActivityCategory = "level" | "quest" | "boss" | "drop" | "other";

export function classifyActivity(text: string): ActivityCategory {
  const t = (text || "").toLowerCase();
  if (/levelled up|i levelled/.test(t)) return "level";
  if (/quest complete/.test(t)) return "quest";
  if (/i killed|i defeated|boss/.test(t)) return "boss";
  if (/i found|it dropped|loot/.test(t)) return "drop";
  return "other";
}

export type CombinedActivity = RuneMetricsActivity & {
  player: string;
  accent: Accent;
  ts: number;
  category: ActivityCategory;
};

export function combineActivities(players: PlayerSummary[]): CombinedActivity[] {
  const out: CombinedActivity[] = [];
  for (const p of players) {
    for (const a of p.activities) {
      const d = parseActivityDate(a.date);
      out.push({
        ...a,
        player: p.name,
        accent: p.accent,
        ts: d ? d.getTime() : 0,
        category: classifyActivity(a.text),
      });
    }
  }
  return out.sort((a, b) => b.ts - a.ts);
}

// ---------------------------------------------------------------------------
// Quests
// ---------------------------------------------------------------------------

export function questDoneIndex(questList: QuestEntry[]): Set<string> {
  const set = new Set<string>();
  for (const q of questList) if (q.status === "COMPLETED") set.add(q.title);
  return set;
}

export function questPointsOf(questList: QuestEntry[]): number {
  return questList.reduce(
    (sum, q) => sum + (q.status === "COMPLETED" ? q.questPoints || 0 : 0),
    0,
  );
}

export type QuestBucket = "both-done" | "one-done" | "in-progress" | "none";

export interface QuestRow {
  quest: QuestEntry;
  statuses: Record<string, QuestEntry["status"]>;
  bucket: QuestBucket;
}

/** Merge every player's quest list into one comparable table. */
export function buildQuestTable(
  players: { slug: string; questList: QuestEntry[] }[],
): QuestRow[] {
  const byTitle = new Map<string, QuestEntry>();
  const lookup = new Map<string, Map<string, QuestEntry["status"]>>();

  for (const p of players) {
    for (const q of p.questList) {
      if (!byTitle.has(q.title)) byTitle.set(q.title, q);
      if (!lookup.has(q.title)) lookup.set(q.title, new Map());
      lookup.get(q.title)!.set(p.slug, q.status);
    }
  }

  const rows: QuestRow[] = [];
  for (const [title, quest] of byTitle) {
    const statuses: Record<string, QuestEntry["status"]> = {};
    let done = 0;
    let started = 0;
    for (const p of players) {
      const s = lookup.get(title)?.get(p.slug) ?? "NOT_STARTED";
      statuses[p.slug] = s;
      if (s === "COMPLETED") done++;
      else if (s === "STARTED") started++;
    }
    rows.push({
      quest,
      statuses,
      bucket:
        done === players.length ? "both-done"
        : done > 0 ? "one-done"
        : started > 0 ? "in-progress"
        : "none",
    });
  }
  return rows.sort((a, b) => a.quest.title.localeCompare(b.quest.title));
}
