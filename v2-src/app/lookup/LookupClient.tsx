"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Card, Pill } from "@/components/primitives";
import { fmt, fmtCompact } from "@/lib/format";
import { SKILLS } from "@/lib/skills";

const HISTORY_KEY = "sexta-era-lookup-history";
const PROXIES = [
  (u: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
  (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
];

type Result = {
  rsn: string;
  combatlevel?: number;
  totalskill?: number;
  totalxp?: number;
  questscomplete?: number;
  rank?: string;
  skillvalues?: { id: number; level: number; xp: number; rank: number }[];
};

async function raceProxies(url: string): Promise<unknown> {
  let lastErr: unknown;
  for (const make of PROXIES) {
    try {
      const r = await fetch(make(url), { headers: { Accept: "application/json" } });
      if (!r.ok) throw new Error(`http ${r.status}`);
      return r.json();
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

export default function LookupClient() {
  const [rsn, setRsn] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) setHistory(JSON.parse(raw));
    } catch {}
  }, []);

  function pushHistory(name: string) {
    const next = [name, ...history.filter((h) => h.toLowerCase() !== name.toLowerCase())].slice(0, 6);
    setHistory(next);
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch {}
  }

  async function go(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const url = `https://apps.runescape.com/runemetrics/profile/profile?user=${encodeURIComponent(trimmed)}&activities=20`;
      const data = (await raceProxies(url)) as Result & { error?: string };
      if (data?.error) throw new Error(data.error);
      if (!data?.skillvalues) throw new Error("private profile");
      setResult({ ...data, rsn: trimmed });
      pushHistory(trimmed);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => { e.preventDefault(); go(rsn); }}
        className="relative"
      >
        <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-3" />
        <input
          type="search"
          value={rsn}
          onChange={(e) => setRsn(e.target.value)}
          placeholder="Enter any RSN…"
          className="w-full h-14 pl-12 pr-32 rounded-lg bg-bg-surface border border-line text-base text-ink placeholder:text-ink-3 focus:border-prayer/40 outline-none"
        />
        <button
          type="submit"
          disabled={loading}
          className="absolute right-2 top-1/2 -translate-y-1/2 h-10 px-4 rounded-md bg-prayer text-bg font-medium hover:bg-prayer-bright transition-colors disabled:opacity-50"
        >
          {loading ? "Searching…" : "Lookup"}
        </button>
      </form>

      {history.length > 0 && !result && !loading && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-mono uppercase tracking-wider text-ink-3">Recent</span>
          {history.map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => { setRsn(h); go(h); }}
              className="h-7 px-3 rounded-full border border-line text-ink-2 hover:text-ink hover:border-line-strong"
            >
              {h}
            </button>
          ))}
        </div>
      )}

      {error && (
        <Card className="p-4 border-danger/40 text-danger text-sm">
          Couldn&apos;t fetch profile: {error}
        </Card>
      )}

      {result?.skillvalues && (
        <Card className="p-5">
          <div className="flex items-baseline justify-between gap-3 mb-4">
            <h3 className="font-display italic text-3xl text-ink">{result.rsn}</h3>
            <Pill tone="prayer">Live</Pill>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            <Mini label="Combat" value={result.combatlevel} />
            <Mini label="Total level" value={result.totalskill} />
            <Mini label="Total XP" value={result.totalxp ? Math.floor(result.totalxp / 10) : null} compact />
            <Mini label="Quests" value={result.questscomplete} />
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-7 gap-2">
            {SKILLS.map((sk) => {
              const s = result.skillvalues!.find((x) => x.id === sk.id);
              return (
                <div key={sk.id} className="bg-bg-raised rounded-md p-2 text-center">
                  <div className="font-mono text-[9.5px] uppercase tracking-wider text-ink-3 truncate">
                    {sk.abbr}
                  </div>
                  <div className="font-mono tabular text-base font-bold text-prayer-bright">
                    {s?.level ?? 1}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

function Mini({ label, value, compact }: { label: string; value: number | null | undefined; compact?: boolean }) {
  return (
    <div>
      <div className="text-[10.5px] uppercase tracking-[0.14em] font-mono text-ink-3">{label}</div>
      <div className="font-mono tabular text-2xl text-ink mt-1">
        {value == null ? "—" : compact ? fmtCompact(value) : fmt(value)}
      </div>
    </div>
  );
}
