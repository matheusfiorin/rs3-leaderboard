import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type {
  GePrices,
  Hiscores,
  MetaJson,
  Player,
  QuestEntry,
  QuestsJson,
  RuneMetricsActivity,
  RuneMetricsProfile,
} from "./types";

const DATA_DIR = join(process.cwd(), "public", "data");

async function readJson<T>(name: string): Promise<T> {
  const raw = await readFile(join(DATA_DIR, name), "utf8");
  return JSON.parse(raw) as T;
}

export async function loadMeta(): Promise<MetaJson> {
  return readJson<MetaJson>("meta.json");
}

export async function loadGePrices(): Promise<GePrices> {
  return readJson<GePrices>("ge_prices.json");
}

// Tracked player roster — drives canonical casing + sub-route ids.
export const PLAYERS = [
  { slug: "decxus",    name: "Decxus",    accent: "soul"   as const },
  { slug: "soclopata", name: "Soclopata", accent: "prayer" as const },
];

export const MEMORIAL = { slug: "fiorovizk", name: "Fiorovizk" };

async function loadProfile(slug: string) {
  try {
    return await readJson<RuneMetricsProfile>(`${slug}_profile.json`);
  } catch {
    return null;
  }
}

async function loadHiscores(slug: string) {
  try {
    return await readJson<Hiscores>(`${slug}_hiscores.json`);
  } catch {
    return null;
  }
}

async function loadQuests(slug: string) {
  try {
    return await readJson<QuestsJson>(`${slug}_quests.json`);
  } catch {
    return null;
  }
}

// Mirror of legacy parse() — merges the three sources into Player.
export function mergePlayer(
  slug: string,
  profile: RuneMetricsProfile,
  hiscores: Hiscores | null,
  quests: QuestsJson | null,
  canonicalName: string,
): Player {
  const skills: Player["skills"] = {};
  for (const s of profile.skillvalues || []) {
    skills[s.id] = { level: s.level, xp: Math.floor(s.xp / 10), rank: s.rank };
  }
  let runeScore = 0;
  const clues = { easy: 0, medium: 0, hard: 0, elite: 0, master: 0 };
  if (hiscores?.activities) {
    for (const a of hiscores.activities) {
      if (a.name === "RuneScore") runeScore = a.score;
      const m = a.name.match(/Clue Scrolls \((\w+)\)/);
      if (m) {
        const k = m[1] as keyof typeof clues;
        if (k in clues) clues[k] = a.score;
      }
    }
  }
  const questList = quests?.quests || [];
  return {
    slug,
    name: canonicalName,
    rank: profile.rank,
    totalLevel: profile.totalskill,
    totalXp: Math.floor((profile.totalxp || 0) / 10),
    combatLevel: profile.combatlevel,
    questsDone: profile.questscomplete,
    questsStarted: profile.questsstarted,
    questsNone: profile.questsnotstarted,
    totalQuests:
      profile.questscomplete + profile.questsstarted + profile.questsnotstarted,
    activities: profile.activities || [],
    skills,
    runeScore,
    clues,
    questList,
    questPoints: questList.reduce(
      (sum, q) => sum + (q.status === "COMPLETED" ? q.questPoints || 0 : 0),
      0,
    ),
  };
}

export async function loadPlayer(slug: string, displayName: string): Promise<Player | null> {
  const [profile, hiscores, quests] = await Promise.all([
    loadProfile(slug),
    loadHiscores(slug),
    loadQuests(slug),
  ]);
  if (!profile) return null;
  return mergePlayer(slug, profile, hiscores, quests, displayName);
}

export async function loadTrackedPlayers(): Promise<Player[]> {
  const players = await Promise.all(
    PLAYERS.map((p) => loadPlayer(p.slug, p.name)),
  );
  return players.filter((p): p is Player => p !== null);
}

export async function loadMemorial(): Promise<Player | null> {
  return loadPlayer(MEMORIAL.slug, MEMORIAL.name);
}

// Parse RuneMetrics "DD-MMM-YYYY HH:MM" date into a sortable timestamp.
const MONTH = { Jan:0, Feb:1, Mar:2, Apr:3, May:4, Jun:5, Jul:6, Aug:7, Sep:8, Oct:9, Nov:10, Dec:11 };
export function parseActivityDate(raw: string): Date | null {
  const m = raw.match(/^(\d{2})-([A-Za-z]{3})-(\d{4})\s+(\d{2}):(\d{2})/);
  if (!m) return null;
  const mon = MONTH[m[2] as keyof typeof MONTH];
  if (mon === undefined) return null;
  return new Date(parseInt(m[3], 10), mon, parseInt(m[1], 10), parseInt(m[4], 10), parseInt(m[5], 10));
}

export type CombinedActivity = RuneMetricsActivity & {
  player: string;
  accent: "soul" | "prayer";
  ts: number;
  category: "level" | "quest" | "boss" | "drop" | "other";
};

export function combineActivities(players: Player[]): CombinedActivity[] {
  const out: CombinedActivity[] = [];
  for (const p of players) {
    const accent = PLAYERS.find((x) => x.slug === p.slug)?.accent ?? "prayer";
    for (const a of p.activities) {
      const d = parseActivityDate(a.date);
      const ts = d ? d.getTime() : 0;
      const txt = (a.text || "").toLowerCase();
      const category: CombinedActivity["category"] =
        txt.includes("levelled up") ? "level"
        : txt.includes("quest")        ? "quest"
        : txt.includes("killed") || txt.includes("defeated") ? "boss"
        : txt.includes("loot") || txt.includes("found") || txt.includes("hi") ? "drop"
        : "other";
      out.push({ ...a, player: p.name, accent, ts, category });
    }
  }
  return out.sort((a, b) => b.ts - a.ts);
}

// Stable per-player quest-check lookup. Built once, used by goals + activity.
export function questDoneIndex(p: Player): Set<string> {
  const set = new Set<string>();
  for (const q of p.questList) if (q.status === "COMPLETED") set.add(q.title);
  return set;
}

export type QuestStatusOverview = {
  bothDone: QuestEntry[];
  oneDone: QuestEntry[];
  neither: QuestEntry[];
};

export function compareQuests(p1: Player, p2: Player): QuestStatusOverview {
  const d1 = questDoneIndex(p1);
  const d2 = questDoneIndex(p2);
  const all = new Map<string, QuestEntry>();
  for (const q of p1.questList) all.set(q.title, q);
  for (const q of p2.questList) if (!all.has(q.title)) all.set(q.title, q);
  const both: QuestEntry[] = [], one: QuestEntry[] = [], neither: QuestEntry[] = [];
  for (const q of all.values()) {
    const a = d1.has(q.title), b = d2.has(q.title);
    if (a && b) both.push(q);
    else if (a || b) one.push(q);
    else neither.push(q);
  }
  return { bothDone: both, oneDone: one, neither };
}
