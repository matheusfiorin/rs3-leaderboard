"use client";

import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import { EyeOff, Search, ServerCrash, UserX, X } from "lucide-react";
import { clsx } from "clsx";
import { Card, EmptyState, Pill, SectionHead, Skeleton, Stat } from "@/components/primitives";
import { RelativeTime, SkillIcon } from "@/components/ui";
import { fmt, fmtCompact } from "@/lib/format";
import { parseActivityDate } from "@/lib/player";
import { SKILLS } from "@/lib/skills";
import type { RuneMetricsProfile } from "@/lib/types";

// Jagex allows 1-12 characters: letters, digits, and space / underscore /
// hyphen as word separators. Rejecting locally saves a doomed proxy round-trip
// and gives a precise message instead of a generic failure.
const RSN_RE = /^[A-Za-z0-9][A-Za-z0-9 _-]{0,11}$/;

const HISTORY_KEY = "sexta-era-lookup-history";
const HISTORY_MAX = 6;

const PROXIES: ((url: string) => string)[] = [
  (u) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
  (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
];

// ---------------------------------------------------------------------------
// Recent searches — localStorage is an external store, so it is read through
// useSyncExternalStore rather than mirrored into state from an effect. That
// keeps the prerendered HTML (always empty) and the hydrated HTML consistent,
// and picks up writes from another tab for free.
// ---------------------------------------------------------------------------

const EMPTY: string[] = [];
const listeners = new Set<() => void>();
let cachedRaw: string | null = null;
let cached: string[] = EMPTY;
let bridged = false;

function readHistory(): string[] {
  if (typeof window === "undefined") return EMPTY;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(HISTORY_KEY);
  } catch {
    raw = null;
  }
  // Cache by raw string so the snapshot is referentially stable between reads.
  if (raw === cachedRaw) return cached;
  cachedRaw = raw;
  cached = EMPTY;
  if (raw) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const list = parsed.filter((v): v is string => typeof v === "string");
        if (list.length) cached = list.slice(0, HISTORY_MAX);
      }
    } catch {
      cached = EMPTY;
    }
  }
  return cached;
}

function serverHistory(): string[] {
  return EMPTY;
}

function subscribeHistory(fn: () => void): () => void {
  listeners.add(fn);
  if (!bridged && typeof window !== "undefined") {
    bridged = true;
    window.addEventListener("storage", (e) => {
      if (e.key !== HISTORY_KEY) return;
      cachedRaw = null;
      for (const l of listeners) l();
    });
  }
  return () => {
    listeners.delete(fn);
  };
}

function writeHistory(next: string[]) {
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch {
    // Private-mode quota failures shouldn't break the lookup itself.
  }
  cachedRaw = null;
  for (const l of listeners) l();
}

// ---------------------------------------------------------------------------

type Outcome =
  | { kind: "idle" }
  | { kind: "loading"; rsn: string }
  | { kind: "ok"; rsn: string; profile: RuneMetricsProfile }
  | { kind: "invalid"; message: string }
  | { kind: "private"; rsn: string }
  | { kind: "missing"; rsn: string }
  | { kind: "members"; rsn: string }
  | { kind: "unavailable"; rsn: string; detail: string };

async function fetchProfile(rsn: string, signal: AbortSignal): Promise<RuneMetricsProfile> {
  const target = `https://apps.runescape.com/runemetrics/profile/profile?user=${encodeURIComponent(rsn)}&activities=20`;
  const failures: string[] = [];
  for (const make of PROXIES) {
    try {
      const res = await fetch(make(target), {
        signal,
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      try {
        return JSON.parse(text) as RuneMetricsProfile;
      } catch {
        throw new Error("proxy returned non-JSON");
      }
    } catch (err) {
      if (signal.aborted) throw err;
      failures.push(err instanceof Error ? err.message : String(err));
    }
  }
  throw new Error(failures.join("; "));
}

export default function LookupClient() {
  const [rsn, setRsn] = useState("");
  const [outcome, setOutcome] = useState<Outcome>({ kind: "idle" });
  const history = useSyncExternalStore(subscribeHistory, readHistory, serverHistory);
  const inflight = useRef<AbortController | null>(null);

  const search = useCallback(async (raw: string) => {
    const name = raw.trim().replace(/\s+/g, " ");
    if (!name) {
      setOutcome({ kind: "idle" });
      return;
    }
    if (!RSN_RE.test(name)) {
      setOutcome({
        kind: "invalid",
        message:
          "A RuneScape name is 1-12 characters — letters, digits, spaces, underscores or hyphens.",
      });
      return;
    }

    inflight.current?.abort();
    const controller = new AbortController();
    inflight.current = controller;
    setOutcome({ kind: "loading", rsn: name });

    try {
      const data = await fetchProfile(name, controller.signal);
      if (controller.signal.aborted) return;

      if (data.error === "PROFILE_PRIVATE") {
        setOutcome({ kind: "private", rsn: name });
        return;
      }
      if (data.error === "NO_PROFILE") {
        setOutcome({ kind: "missing", rsn: name });
        return;
      }
      if (data.error === "NOT_A_MEMBER") {
        setOutcome({ kind: "members", rsn: name });
        return;
      }
      if (data.error) {
        setOutcome({ kind: "unavailable", rsn: name, detail: `RuneMetrics said: ${data.error}` });
        return;
      }
      // A profile with no skill block is a private one that answered 200.
      if (!Array.isArray(data.skillvalues) || !data.skillvalues.length) {
        setOutcome({ kind: "private", rsn: name });
        return;
      }

      setOutcome({ kind: "ok", rsn: data.name || name, profile: data });
      writeHistory(
        [data.name || name, ...history.filter((h) => h.toLowerCase() !== name.toLowerCase())].slice(
          0,
          HISTORY_MAX,
        ),
      );
    } catch (err) {
      if (controller.signal.aborted) return;
      setOutcome({
        kind: "unavailable",
        rsn: name,
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  }, [history]);

  return (
    <div className="space-y-6">
      <SectionHead title="Lookup" hint="Any RuneScape 3 account by name" />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void search(rsn);
        }}
        className="relative"
        role="search"
      >
        <Search
          size={18}
          aria-hidden="true"
          className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none"
        />
        <input
          type="search"
          value={rsn}
          onChange={(e) => setRsn(e.target.value)}
          maxLength={12}
          autoComplete="off"
          spellCheck={false}
          aria-label="RuneScape name"
          placeholder="Enter any RSN…"
          className="w-full h-14 pl-11 pr-28 rounded-lg bg-bg-surface border border-line text-base text-ink placeholder:text-ink-3 focus:border-prayer/40 outline-none"
        />
        <button
          type="submit"
          disabled={outcome.kind === "loading"}
          className="absolute right-2 top-1/2 -translate-y-1/2 h-10 px-4 rounded-md bg-prayer text-bg text-sm font-semibold hover:bg-prayer-bright transition-colors disabled:opacity-50"
        >
          {outcome.kind === "loading" ? "Looking…" : "Look up"}
        </button>
      </form>

      {history.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-3">
            Recent
          </span>
          {history.map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => {
                setRsn(h);
                void search(h);
              }}
              className="h-8 px-3 rounded-full border border-line text-xs text-ink-2 hover:text-ink hover:border-line-strong transition-colors"
            >
              {h}
            </button>
          ))}
          <button
            type="button"
            onClick={() => writeHistory([])}
            aria-label="Clear recent searches"
            className="grid place-items-center w-8 h-8 rounded-full border border-line text-ink-3 hover:text-ink hover:border-line-strong transition-colors"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {outcome.kind === "loading" && (
        <div className="space-y-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-48" />
        </div>
      )}

      {outcome.kind === "invalid" && (
        <Message
          icon={<UserX size={18} className="text-warn" />}
          title="That name can't exist"
          body={outcome.message}
          tone="warn"
        />
      )}

      {outcome.kind === "private" && (
        <Message
          icon={<EyeOff size={18} className="text-ink-2" />}
          title={`${outcome.rsn} keeps their profile private`}
          body="RuneMetrics only publishes stats for accounts that have set their profile to public. Nothing is wrong with the name — the owner has simply opted out."
        />
      )}

      {outcome.kind === "missing" && (
        <Message
          icon={<UserX size={18} className="text-ink-2" />}
          title={`No account called “${outcome.rsn}”`}
          body="RuneMetrics has never seen that name. Check the spelling, and remember that spaces, hyphens and underscores are interchangeable in-game but not here."
        />
      )}

      {outcome.kind === "members" && (
        <Message
          icon={<EyeOff size={18} className="text-ink-2" />}
          title={`${outcome.rsn} is a free-to-play account`}
          body="RuneMetrics only publishes profiles for members. Free accounts still appear on the Hiscores, but not here."
        />
      )}

      {outcome.kind === "unavailable" && (
        <Message
          icon={<ServerCrash size={18} className="text-danger" />}
          title="Couldn't reach RuneMetrics"
          body={`The lookup goes through public CORS proxies, and every one of them refused this request. This is usually temporary — try again in a moment. (${outcome.detail})`}
          tone="danger"
        />
      )}

      {outcome.kind === "idle" && (
        <EmptyState
          title="Look up any player"
          hint="Live from RuneMetrics: levels, XP and the last 20 things they did."
        />
      )}

      {outcome.kind === "ok" && <Profile rsn={outcome.rsn} profile={outcome.profile} />}
    </div>
  );
}

function Message({
  icon,
  title,
  body,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  tone?: "warn" | "danger";
}) {
  return (
    <Card
      className={clsx(
        "p-5",
        tone === "danger" && "border-danger/40",
        tone === "warn" && "border-warn/40",
      )}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0">{icon}</span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">{title}</p>
          <p className="mt-1.5 text-sm text-ink-2 leading-relaxed break-words">{body}</p>
        </div>
      </div>
    </Card>
  );
}

function Profile({ rsn, profile }: { rsn: string; profile: RuneMetricsProfile }) {
  const levels = new Map(profile.skillvalues.map((s) => [s.id, s]));
  const activities = profile.activities ?? [];

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
          <h3 className="font-display italic text-3xl text-ink tracking-tight break-words min-w-0">
            {rsn}
          </h3>
          <div className="flex items-center gap-2">
            <Pill tone={profile.loggedIn === "true" ? "success" : "neutral"}>
              {profile.loggedIn === "true" ? "in game" : "logged out"}
            </Pill>
            {profile.rank && <Pill tone="prayer">rank {profile.rank}</Pill>}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Stat label="Combat" value={fmt(profile.combatlevel)} accent="prayer" />
          <Stat label="Total level" value={fmt(profile.totalskill)} accent="prayer" />
          {/* totalxp is already whole XP — the per-skill values are the ones in tenths. */}
          <Stat label="Total XP" value={fmtCompact(profile.totalxp)} accent="ash" />
          <Stat label="Quests" value={fmt(profile.questscomplete)} />
        </div>
      </Card>

      <section className="space-y-3">
        <h4 className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink-3">
          Skills
        </h4>
        <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-7 gap-2">
          {SKILLS.map((sk) => {
            const s = levels.get(sk.id);
            const level = s?.level ?? 1;
            const xp = s ? Math.floor(s.xp / 10) : 0;
            return (
              <div
                key={sk.id}
                className="rounded-md bg-bg-surface border border-line px-2 py-2.5 text-center"
                title={`${sk.key} — ${fmt(xp)} XP`}
              >
                <SkillIcon id={sk.id} size={16} />
                <div className="mt-1 font-mono text-[9px] uppercase tracking-wider text-ink-3 truncate">
                  {sk.abbr}
                </div>
                <div
                  className={clsx(
                    "font-mono tabular text-lg font-bold leading-tight",
                    level >= 99 ? "text-ash-bright" : "text-ink",
                  )}
                >
                  {level}
                </div>
                <div className="font-mono text-[9.5px] tabular text-ink-faint">
                  {fmtCompact(xp)}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <h4 className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink-3">
          Recent activity
        </h4>
        {activities.length === 0 ? (
          <EmptyState title="No recent activity" hint="RuneMetrics reports nothing for this account." />
        ) : (
          <Card className="divide-y divide-line">
            {activities.map((a, i) => {
              const d = parseActivityDate(a.date);
              return (
                <div key={`${a.date}-${i}`} className="px-4 py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-sm text-ink min-w-0 break-words">{a.text}</p>
                    <RelativeTime
                      className="font-mono text-[10.5px] tabular text-ink-faint shrink-0"
                      date={d}
                    />
                  </div>
                  {a.details && a.details !== a.text && (
                    <p className="mt-1 text-xs text-ink-3 break-words">{a.details}</p>
                  )}
                </div>
              );
            })}
          </Card>
        )}
      </section>

      <p className="text-xs text-ink-faint leading-relaxed">
        Read live from RuneMetrics through a public CORS proxy. Private profiles and
        free-to-play accounts publish nothing, so a blank result is usually a setting
        rather than a missing player.
      </p>
    </div>
  );
}
