"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { dataUrl } from "@/lib/paths";
import { MEMORIAL, PLAYERS, mergeSummary } from "@/lib/player";
import type {
  Hiscores,
  MetaJson,
  PlayerSummary,
  QuestEntry,
  QuestsJson,
  RuneMetricsProfile,
} from "@/lib/types";

/**
 * The site is a static export, so the HTML carries whatever data existed at
 * build time. The cron refreshes `data/*.json` every 30 minutes without
 * rebuilding, so the page must re-read those files on the client or it shows
 * build-day numbers forever — exactly how the first v2 cut drifted 52 days
 * out of date.
 *
 * Server-rendered summaries are the instant first paint; this provider then
 * re-fetches the same JSON and swaps in anything newer.
 */

const REVALIDATE_MS = 5 * 60 * 1000;

interface PlayerDataApi {
  players: PlayerSummary[];
  meta: MetaJson;
  /** True while a background revalidation is in flight. */
  refreshing: boolean;
  /** Wall-clock of the last successful client refresh. */
  refreshedAt: Date | null;
  /** Data is from the build, not yet revalidated. */
  stale: boolean;
  refresh(): Promise<void>;
  byslug(slug: string): PlayerSummary | undefined;
}

const Ctx = createContext<PlayerDataApi | null>(null);

async function fetchJson<T>(file: string): Promise<T | null> {
  try {
    // `no-cache` forces a conditional GET: 304 when unchanged (cheap), 200
    // with fresh bytes otherwise. Without it Pages' max-age would serve a
    // stale body for the full TTL after each cron push.
    const r = await fetch(dataUrl(file), { cache: "no-cache" });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

export function PlayerDataProvider({
  initialPlayers,
  initialMeta,
  children,
}: {
  initialPlayers: PlayerSummary[];
  initialMeta: MetaJson;
  children: React.ReactNode;
}) {
  const [players, setPlayers] = useState(initialPlayers);
  const [meta, setMeta] = useState(initialMeta);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);
  const inflight = useRef(false);

  const refresh = useCallback(async () => {
    if (inflight.current) return;
    inflight.current = true;
    setRefreshing(true);
    try {
      const [nextMeta, ...loaded] = await Promise.all([
        fetchJson<MetaJson>("meta.json"),
        ...PLAYERS.map(async (p) => {
          const [profile, hiscores] = await Promise.all([
            fetchJson<RuneMetricsProfile>(`${p.slug}_profile.json`),
            fetchJson<Hiscores>(`${p.slug}_hiscores.json`),
          ]);
          if (!profile || profile.error) return null;
          return mergeSummary(p.slug, profile, hiscores, p.name);
        }),
      ]);

      // Keep the build-time record for any player whose fetch failed rather
      // than dropping them out of the roster mid-session.
      setPlayers((prev) =>
        PLAYERS.map((p, i) => loaded[i] ?? prev.find((x) => x.slug === p.slug))
          .filter((p): p is PlayerSummary => Boolean(p)),
      );
      if (nextMeta) setMeta(nextMeta);
      setRefreshedAt(new Date());
    } finally {
      inflight.current = false;
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = setInterval(() => {
      if (!document.hidden) void refresh();
    }, REVALIDATE_MS);
    const onVisible = () => {
      if (!document.hidden) void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  const api = useMemo<PlayerDataApi>(
    () => ({
      players,
      meta,
      refreshing,
      refreshedAt,
      stale: refreshedAt === null,
      refresh,
      byslug: (slug) => players.find((p) => p.slug === slug),
    }),
    [players, meta, refreshing, refreshedAt, refresh],
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function usePlayerData(): PlayerDataApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePlayerData must be used inside <PlayerDataProvider>");
  return ctx;
}

// ---------------------------------------------------------------------------
// Quests — 44 KB per player, so loaded on demand instead of riding in context.
// ---------------------------------------------------------------------------

const questCache = new Map<string, QuestEntry[]>();

export function useQuests(slugs: string[]): {
  quests: Record<string, QuestEntry[]>;
  loading: boolean;
} {
  const key = slugs.join(",");
  // The module-level cache is the source of truth; `version` exists only to
  // re-derive after an async fill. Deriving instead of mirroring means the
  // already-cached case needs no state write at all.
  const [version, setVersion] = useState(0);

  const { quests, loading } = useMemo(() => {
    const wanted = key.split(",").filter(Boolean);
    const out: Record<string, QuestEntry[]> = {};
    let pending = false;
    for (const s of wanted) {
      const hit = questCache.get(s);
      if (hit) out[s] = hit;
      else pending = true;
    }
    return { quests: out, loading: pending };
    // `version` is a deliberate cache-invalidation dependency.
  }, [key, version]);

  useEffect(() => {
    let cancelled = false;
    const missing = key.split(",").filter(Boolean).filter((s) => !questCache.has(s));
    if (!missing.length) return;

    void (async () => {
      await Promise.all(
        missing.map(async (slug) => {
          const j = await fetchJson<QuestsJson>(`${slug}_quests.json`);
          questCache.set(slug, j?.quests ?? []);
        }),
      );
      if (!cancelled) setVersion((v) => v + 1);
    })();

    return () => {
      cancelled = true;
    };
  }, [key]);

  return { quests, loading };
}

export const ROSTER = PLAYERS;
export const MEMORIAL_PLAYER = MEMORIAL;
