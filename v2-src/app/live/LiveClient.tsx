"use client";

import { useEffect, useRef, useState } from "react";
import { Radio } from "lucide-react";
import { Card, Pill, Stat } from "@/components/primitives";
import { fmt, fmtCompact, fmtRelative } from "@/lib/format";
import { clsx } from "clsx";

type PlayerLite = {
  slug: string;
  name: string;
  accent: "soul" | "prayer";
  totalXp: number;
};

const PROXIES = [
  (u: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
  (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
];

async function raceProxies(url: string): Promise<unknown> {
  let lastErr: unknown;
  for (const make of PROXIES) {
    try {
      const r = await fetch(make(url), { headers: { Accept: "application/json" } });
      if (!r.ok) throw new Error(`http ${r.status}`);
      return r.json();
    } catch (e) { lastErr = e; }
  }
  throw lastErr;
}

type Snap = { ts: number; totalXp: number };

export default function LiveClient({ players }: { players: PlayerLite[] }) {
  const [active, setActive] = useState(0);
  const [snaps, setSnaps] = useState<Record<string, Snap[]>>({});
  const [lastPoll, setLastPoll] = useState<Date | null>(null);
  const [status, setStatus] = useState<"idle" | "polling" | "ok" | "error">("idle");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cur = players[active];

  useEffect(() => {
    if (!cur) return;
    let cancelled = false;
    async function poll() {
      if (cancelled || !cur) return;
      setStatus("polling");
      try {
        const url = `https://apps.runescape.com/runemetrics/profile/profile?user=${encodeURIComponent(cur.name)}&activities=20`;
        const data = (await raceProxies(url)) as { totalxp?: number };
        if (cancelled) return;
        if (typeof data?.totalxp === "number") {
          const realXp = Math.floor(data.totalxp / 10);
          setSnaps((prev) => {
            const next = { ...prev };
            const arr = next[cur.slug] ?? [];
            const last = arr[arr.length - 1];
            if (!last || last.totalXp !== realXp) {
              next[cur.slug] = [...arr, { ts: Date.now(), totalXp: realXp }].slice(-30);
            }
            return next;
          });
          setLastPoll(new Date());
          setStatus("ok");
        }
      } catch {
        if (!cancelled) setStatus("error");
      }
    }
    poll();
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(poll, 30_000);
    return () => {
      cancelled = true;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [active, cur]);

  if (!cur) return null;

  const arr = snaps[cur.slug] ?? [];
  const newest = arr[arr.length - 1];
  const baseline = arr[0];
  const sessionDelta = newest && baseline ? newest.totalXp - baseline.totalXp : 0;
  const sessionMs = newest && baseline ? newest.ts - baseline.ts : 0;
  const xph = sessionMs > 0 ? Math.round((sessionDelta / sessionMs) * 3_600_000) : 0;
  const displayXp = newest?.totalXp ?? cur.totalXp;

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        {players.map((p, i) => (
          <button
            key={p.slug}
            type="button"
            onClick={() => setActive(i)}
            className={clsx(
              "h-10 px-4 rounded-md border text-sm transition-colors",
              i === active
                ? p.accent === "soul"
                  ? "border-soul/40 text-soul-bright bg-soul/10"
                  : "border-prayer/40 text-prayer-bright bg-prayer/10"
                : "border-line text-ink-3 hover:text-ink-2",
            )}
          >
            {p.name}
          </button>
        ))}
        <div className="flex-1" />
        <Pill tone={status === "ok" ? "success" : status === "error" ? "danger" : "neutral"}>
          <Radio
            size={12}
            className={status === "polling" ? "animate-pulse" : ""}
          />
          <span>{status === "ok" ? "fresh" : status === "polling" ? "polling" : status === "error" ? "error" : "idle"}</span>
        </Pill>
      </div>

      <Card accent={cur.accent} className="p-8 text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-3 mb-3">
          {cur.name} · Total XP
        </p>
        <div
          className={clsx(
            "font-mono tabular font-bold leading-none",
            cur.accent === "soul" ? "text-soul-bright" : "text-prayer-bright",
          )}
          style={{ fontSize: "clamp(48px, 12vw, 120px)" }}
        >
          {fmt(displayXp)}
        </div>
        <p className="mt-4 text-sm text-ink-3 font-mono">
          {fmtCompact(displayXp)} ·{" "}
          {lastPoll ? `Updated ${fmtRelative(lastPoll)}` : "Awaiting first poll"}
        </p>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Session delta" value={fmt(sessionDelta)} accent={cur.accent} />
        <Stat label="Rate" value={xph > 0 ? `${fmtCompact(xph)} / h` : "—"} accent="ash" />
        <Stat label="Samples" value={`${arr.length}`} />
        <Stat label="Cadence" value="30 s" />
      </div>
    </div>
  );
}
