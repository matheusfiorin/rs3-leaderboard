import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  MEMORIAL,
  PLAYERS,
  mergeSummary,
  questPointsOf,
} from "./player";
import type {
  GePrices,
  Hiscores,
  MetaJson,
  Player,
  PlayerSummary,
  QuestEntry,
  QuestsJson,
  RuneMetricsProfile,
} from "./types";

export { PLAYERS, MEMORIAL };
export * from "./player";

const DATA_DIR = join(process.cwd(), "public", "data");

async function readJson<T>(name: string): Promise<T | null> {
  try {
    const raw = await readFile(join(DATA_DIR, name), "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function loadMeta(): Promise<MetaJson> {
  const epoch = new Date(0).toISOString();
  return (
    (await readJson<MetaJson>("meta.json")) ?? {
      timestamp: epoch,
      lastRun: epoch,
      lastChange: epoch,
    }
  );
}

export async function loadGePrices(): Promise<GePrices> {
  return (await readJson<GePrices>("ge_prices.json")) ?? {};
}

export async function loadSummary(
  slug: string,
  displayName: string,
): Promise<PlayerSummary | null> {
  const [profile, hiscores] = await Promise.all([
    readJson<RuneMetricsProfile>(`${slug}_profile.json`),
    readJson<Hiscores>(`${slug}_hiscores.json`),
  ]);
  if (!profile || profile.error) return null;
  return mergeSummary(slug, profile, hiscores, displayName);
}

export async function loadTrackedSummaries(): Promise<PlayerSummary[]> {
  const out = await Promise.all(PLAYERS.map((p) => loadSummary(p.slug, p.name)));
  return out.filter((p): p is PlayerSummary => p !== null);
}

export async function loadQuestList(slug: string): Promise<QuestEntry[]> {
  const q = await readJson<QuestsJson>(`${slug}_quests.json`);
  return q?.quests ?? [];
}

/** Full record including the quest list. Only for pages that need quests. */
export async function loadPlayer(
  slug: string,
  displayName: string,
): Promise<Player | null> {
  const summary = await loadSummary(slug, displayName);
  if (!summary) return null;
  const questList = await loadQuestList(slug);
  return { ...summary, questList, questPoints: questPointsOf(questList) };
}

export async function loadTrackedPlayers(): Promise<Player[]> {
  const out = await Promise.all(PLAYERS.map((p) => loadPlayer(p.slug, p.name)));
  return out.filter((p): p is Player => p !== null);
}

export async function loadMemorial(): Promise<Player | null> {
  return loadPlayer(MEMORIAL.slug, MEMORIAL.name);
}
