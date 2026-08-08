"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
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

const SELECTED_KEY = "sexta-era:selected-player";

// Selected player is persisted in localStorage, which is an external system —
// so React subscribes to it rather than mirroring it into component state.
// The server snapshot is always the first roster entry, keeping SSR and the
// first client render identical.
const selectionListeners = new Set<() => void>();
let selectionCache: string | null = null;

function getSelectedSnapshot(): string {
  if (selectionCache === null) {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(SELECTED_KEY);
    } catch {
      /* private mode */
    }
    selectionCache =
      saved && PLAYERS.some((p) => p.slug === saved) ? saved : PLAYERS[0]?.slug ?? "";
  }
  return selectionCache;
}

function getSelectedServerSnapshot(): string {
  return PLAYERS[0]?.slug ?? "";
}

function subscribeSelected(fn: () => void): () => void {
  selectionListeners.add(fn);
  return () => {
    selectionListeners.delete(fn);
  };
}

function writeSelected(slug: string): void {
  selectionCache = slug;
  try {
    localStorage.setItem(SELECTED_KEY, slug);
  } catch {
    /* ignore */
  }
  for (const l of selectionListeners) l();
}

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

  /**
   * Which player the per-player pages are showing.
   *
   * Lifted out of the individual pages: it used to be four separate useStates
   * that each reset on navigation, so choosing a player on /pvm and clicking
   * through to /gear silently put you back on the other one.
   */
  selected: PlayerSummary | undefined;
  selectedSlug: string;
  setSelected(slug: string): void;
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
      // The fetches usually resolve in well under 100ms from cache, so the
      // spinner would flash for a frame and the button looked inert. Hold the
      // spinning state long enough to read as "something happened".
      await new Promise((r) => setTimeout(r, 450));
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

  const selectedSlug = useSyncExternalStore(
    subscribeSelected,
    getSelectedSnapshot,
    getSelectedServerSnapshot,
  );
  const setSelected = useCallback((slug: string) => writeSelected(slug), []);

  const api = useMemo<PlayerDataApi>(
    () => ({
      players,
      meta,
      refreshing,
      refreshedAt,
      stale: refreshedAt === null,
      refresh,
      byslug: (slug) => players.find((p) => p.slug === slug),
      selected:
        players.find((p) => p.slug === selectedSlug) ?? players[0],
      selectedSlug,
      setSelected,
    }),
    [players, meta, refreshing, refreshedAt, refresh, selectedSlug, setSelected],
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
// In-flight requests are cached too. Without this, two components mounting in
// the same tick both miss the cache and fire their own fetch — the dashboard
// was pulling 172KB of quest JSON instead of 86KB.
const questInflight = new Map<string, Promise<QuestEntry[]>>();

function fetchQuests(slug: string): Promise<QuestEntry[]> {
  const cached = questCache.get(slug);
  if (cached) return Promise.resolve(cached);

  const pending = questInflight.get(slug);
  if (pending) return pending;

  const p = fetchJson<QuestsJson>(`${slug}_quests.json`)
    .then((j) => {
      const quests = j?.quests ?? [];
      questCache.set(slug, quests);
      return quests;
    })
    .finally(() => questInflight.delete(slug));

  questInflight.set(slug, p);
  return p;
}

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
      await Promise.all(missing.map((slug) => fetchQuests(slug)));
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
