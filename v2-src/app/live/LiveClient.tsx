"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Radio, RefreshCw } from "lucide-react";
import { clsx } from "clsx";
import { Card, EmptyState, Pill, SectionHead, Stat } from "@/components/primitives";
import { ACCENT_TEXT, RelativeTime, Segmented } from "@/components/ui";
import { usePlayerData } from "@/components/PlayerDataProvider";
import { fmt, fmtCompact } from "@/lib/format";
import type { RuneMetricsProfile } from "@/lib/types";

const POLL_MS = 30_000;
/** Keep enough ticks for a readable session log without unbounded growth. */
const MAX_SNAPS = 60;

// RuneMetrics sends no CORS headers, so every request is laundered through a
// public proxy. They fail independently and often, hence the ordered fallback
// and the visible error state rather than a silently frozen number.
const PROXIES: ((url: string) => string)[] = [
  (u) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
  (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
];

function profileUrl(rsn: string): string {
  return `https://apps.runescape.com/runemetrics/profile/profile?user=${encodeURIComponent(rsn)}&activities=1`;
}

async function fetchProfile(
  rsn: string,
  signal: AbortSignal,
): Promise<RuneMetricsProfile> {
  const failures: string[] = [];
  for (const make of PROXIES) {
    try {
      const res = await fetch(make(profileUrl(rsn)), {
        signal,
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      try {
        return JSON.parse(text) as RuneMetricsProfile;
      } catch {
        // A proxy that is rate-limiting returns an HTML notice with a 200.
        throw new Error("proxy returned non-JSON");
      }
    } catch (err) {
      if (signal.aborted) throw err;
      failures.push(err instanceof Error ? err.message : String(err));
    }
  }
  throw new Error(`every proxy failed — ${failures.join("; ")}`);
}

interface Snap {
  ts: number;
  xp: number;
}

interface Track {
  /** Wall-clock of the first successful poll for this player this session. */
  start: number;
  baseXp: number;
  polls: number;
  snaps: Snap[];
}

type Status = "idle" | "polling" | "live" | "error";

export default function LiveClient() {
  // Player choice is shared and persisted across routes — a page-local
  // useState here silently reset it every time you navigated away.
  const { players, selected, setSelected } = usePlayerData();
  const [tracks, setTracks] = useState<Record<string, Track>>({});
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [failures, setFailures] = useState(0);
  const [lastPollAt, setLastPollAt] = useState<Date | null>(null);
  const [online, setOnline] = useState<boolean | null>(null);
  // Bumping this restarts the polling effect — the "retry now" button.
  const [nonce, setNonce] = useState(0);

  const active = selected;
  const name = active?.name;
  const activeSlug = active?.slug;

  useEffect(() => {
    if (!name || !activeSlug) return;
    const controller = new AbortController();
    let cancelled = false;

    const poll = async () => {
      if (cancelled || document.hidden) return;
      setStatus("polling");
      try {
        const data = await fetchProfile(name, controller.signal);
        if (cancelled) return;
        if (data.error) throw new Error(errorLabel(data.error));
        if (typeof data.totalxp !== "number") {
          throw new Error("profile returned no total XP");
        }
        // `totalxp` is ALREADY whole XP. Only skillvalues[].xp arrives in
        // tenths — dividing here under-reported every player by 10x.
        const xp = data.totalxp;
        const now = Date.now();
        setTracks((prev) => {
          const cur = prev[activeSlug];
          if (!cur) {
            return {
              ...prev,
              [activeSlug]: { start: now, baseXp: xp, polls: 1, snaps: [{ ts: now, xp }] },
            };
          }
          const last = cur.snaps[cur.snaps.length - 1];
          const snaps =
            last && last.xp === xp
              ? cur.snaps
              : [...cur.snaps, { ts: now, xp }].slice(-MAX_SNAPS);
          return { ...prev, [activeSlug]: { ...cur, polls: cur.polls + 1, snaps } };
        });
        setOnline(data.loggedIn === "true");
        setLastPollAt(new Date());
        setFailures(0);
        setError(null);
        setStatus("live");
      } catch (err) {
        if (cancelled || controller.signal.aborted) return;
        setFailures((n) => n + 1);
        setError(err instanceof Error ? err.message : String(err));
        setStatus("error");
      }
    };

    // Deferring the first poll by a tick keeps the effect body free of
    // synchronous state writes, which React flags as a render-phase hazard.
    const kickoff = setTimeout(() => void poll(), 0);
    const timer = setInterval(() => void poll(), POLL_MS);
    const onVisible = () => {
      if (!document.hidden) void poll();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(kickoff);
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [name, activeSlug, nonce]);

  const track = activeSlug ? tracks[activeSlug] : undefined;
  const newest = track?.snaps[track.snaps.length - 1];
  const displayXp = newest?.xp ?? active?.totalXp ?? 0;
  // Is the big number on screen the result of a poll that actually succeeded,
  // and did the most recent poll also succeed? Anything else is a snapshot and
  // has to be labelled as one. The old condition (`!track && !error`) hid the
  // badge the instant a poll failed — i.e. exactly when it was needed.
  const fromLivePoll = Boolean(newest) && !error;
  const sessionDelta = track && newest ? newest.xp - track.baseXp : 0;
  const spanMs = track && newest ? newest.ts - track.start : 0;
  const xph = spanMs >= 60_000 && sessionDelta > 0
    ? Math.round((sessionDelta / spanMs) * 3_600_000)
    : null;

  const gains = useMemo(() => {
    if (!track) return [];
    const out: { ts: number; delta: number }[] = [];
    for (let i = 1; i < track.snaps.length; i++) {
      out.push({ ts: track.snaps[i].ts, delta: track.snaps[i].xp - track.snaps[i - 1].xp });
    }
    return out.reverse();
  }, [track]);

  if (!active) {
    return (
      <div className="space-y-6">
        <SectionHead as="h1" title="Live" hint="XP ticker · polled every 30 s" />
        <EmptyState title="No tracked accounts" hint="The roster snapshot is empty." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHead
        as="h1"
        title="Live"
        hint="RuneMetrics ticker · polled every 30 s"
        right={<StatusPill status={status} />}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          ariaLabel="Choose player to track"
          value={active.slug}
          onChange={setSelected}
          options={players.map((p) => ({ value: p.slug, label: p.name }))}
        />
        <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">
          {lastPollAt ? (
            <RelativeTime prefix="polled" date={lastPollAt} />
          ) : (
            "awaiting first poll"
          )}
        </p>
      </div>

      {error && (
        <Card className="p-4 border-danger/40">
          <div className="flex items-start gap-3">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-danger" />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-danger">
                Poll failed{failures > 1 ? ` (${failures} in a row)` : ""}
              </p>
              <p className="mt-1 text-xs text-ink-3 break-words">{error}</p>
              <p className="mt-1 text-xs text-ink-3">
                The number below is the last value we managed to read, not a live one.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setNonce((n) => n + 1)}
              className="shrink-0 inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-line text-xs text-ink-2 hover:text-ink hover:border-line-strong transition-colors"
            >
              <RefreshCw size={13} />
              Retry
            </button>
          </div>
        </Card>
      )}

      {/* At 1440px+ the hero and the four stats do not need 1400px, and the
          log's two-item rows were being stretched to opposite edges. The log
          becomes a rail beside them instead. */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
        <div className="min-w-0 space-y-6">
          <Card accent={active.accent} className="p-6 sm:p-8 text-center lit-edge">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink-3">
              {active.name} · total XP
            </p>
            <div
              className={clsx(
                "mt-3 font-mono tabular font-bold leading-none break-all",
                // The largest element on the page must not sit there in full
                // live crimson while the poller is stalled.
                fromLivePoll ? ACCENT_TEXT[active.accent] : "text-ink-2",
              )}
              style={{ fontSize: "clamp(38px, 9vw, 96px)" }}
            >
              {fmt(displayXp)}
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <Pill tone="neutral">{fmtCompact(displayXp)}</Pill>
              {online != null && (
                // Green "in game" is a live claim; drop it to neutral once the
                // reading it came from is no longer current.
                <Pill tone={online && fromLivePoll ? "success" : "neutral"}>
                  {online ? "in game" : "logged out"}
                </Pill>
              )}
              {!fromLivePoll && (
                <Pill tone={error ? "warn" : "neutral"}>
                  {error ? "stale snapshot" : "last snapshot"}
                </Pill>
              )}
            </div>
          </Card>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat
              label="Session gain"
              value={sessionDelta > 0 ? `+${fmt(sessionDelta)}` : "—"}
              accent={active.accent}
              hint={
                track ? <RelativeTime prefix="since" date={track.start} /> : "since page open"
              }
            />
            <Stat
              label="XP / hour"
              value={xph != null ? fmtCompact(xph) : "—"}
              accent="ash"
              hint={xph == null ? "needs a minute of data" : undefined}
            />
            <Stat label="Polls" value={fmt(track?.polls ?? 0)} hint="successful" />
            <Stat label="Ticks" value={fmt(gains.length)} hint="XP changes seen" />
          </div>
        </div>

        <section className="min-w-0 space-y-3">
          <h2 className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink-3">
            Session log
          </h2>
          {gains.length === 0 ? (
            <EmptyState
              title="No XP change yet"
              hint={`Every 30 s we re-read ${active.name}'s total. Gains appear here the moment one lands.`}
            />
          ) : (
            <Card className="divide-y divide-line">
              {gains.map((g) => (
                <div
                  key={g.ts}
                  className="flex items-center justify-between gap-3 px-4 py-2.5"
                >
                  <span
                    className={clsx(
                      "font-mono tabular text-sm font-bold",
                      g.delta > 0 ? ACCENT_TEXT[active.accent] : "text-ink-3",
                    )}
                  >
                    {g.delta > 0 ? "+" : ""}
                    {fmt(g.delta)}
                  </span>
                  <RelativeTime
                    className="font-mono text-[10.5px] tabular text-ink-3"
                    date={g.ts}
                  />
                </div>
              ))}
            </Card>
          )}
        </section>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: Status }) {
  const tone =
    status === "live" ? "success" : status === "error" ? "danger" : "neutral";
  const label =
    status === "live" ? "live" : status === "error" ? "stalled" : status;
  return (
    <Pill tone={tone}>
      <Radio size={11} className={status === "polling" ? "animate-pulse" : undefined} />
      {label}
    </Pill>
  );
}

/** RuneMetrics returns machine codes; say what they actually mean. */
function errorLabel(code: string): string {
  switch (code) {
    case "PROFILE_PRIVATE":
      return "this profile is set to private in RuneMetrics";
    case "NO_PROFILE":
      return "RuneMetrics has no profile under that name";
    case "NOT_A_MEMBER":
      return "RuneMetrics only publishes members' profiles";
    default:
      return `RuneMetrics said: ${code}`;
  }
}
