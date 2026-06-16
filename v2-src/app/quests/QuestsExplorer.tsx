"use client";

import { useMemo, useState } from "react";
import { Search, Check, X } from "lucide-react";
import { Pill } from "@/components/primitives";
import { clsx } from "clsx";

type Row = {
  title: string;
  difficulty: number;
  members: boolean;
  questPoints: number;
  a: boolean;
  b: boolean;
};

type Filter = "all" | "both" | "one" | "do-next" | "neither";

const DIFF_LABEL: Record<number, string> = {
  0: "Novice",
  1: "Intermediate",
  2: "Experienced",
  3: "Master",
  4: "Grandmaster",
  250: "Special",
};

export default function QuestsExplorer({
  rows,
  p1Name,
  p2Name,
}: {
  rows: Row[];
  p1Name: string;
  p2Name: string;
}) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (needle && !r.title.toLowerCase().includes(needle)) return false;
      switch (filter) {
        case "both":     return r.a && r.b;
        case "one":      return r.a !== r.b;
        case "neither":  return !r.a && !r.b;
        case "do-next":  return r.a !== r.b || (!r.a && !r.b);
        default:         return true;
      }
    });
  }, [rows, q, filter]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3"
          />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search quests…"
            className="w-full h-10 pl-9 pr-3 rounded-md bg-bg-surface border border-line text-sm text-ink placeholder:text-ink-3 focus:border-line-strong outline-none"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1">
          {([
            ["all",     "All"],
            ["do-next", "Do next"],
            ["one",     "One done"],
            ["both",    "Both done"],
            ["neither", "Neither"],
          ] as const).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setFilter(k)}
              className={clsx(
                "h-10 px-3 rounded-md border text-xs font-mono uppercase tracking-wider transition-colors whitespace-nowrap",
                filter === k
                  ? "border-prayer/40 text-prayer-bright bg-prayer/10"
                  : "border-line text-ink-3 hover:text-ink-2",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="text-xs text-ink-3 font-mono">
        {filtered.length} matches
      </div>

      <div className="bg-bg-surface border border-line rounded-lg overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 px-4 py-2 text-[10.5px] uppercase tracking-[0.14em] font-mono text-ink-3 border-b border-line">
          <span>Quest</span>
          <span className="text-right">QP</span>
          <span className="text-soul-bright text-right w-16">{p1Name}</span>
          <span className="text-prayer-bright text-right w-16">{p2Name}</span>
        </div>
        <ul style={{ contentVisibility: "auto", containIntrinsicSize: "0 38px" }}>
          {filtered.length === 0 && (
            <li className="px-4 py-6 text-sm text-ink-3 text-center">
              Nothing matches.
            </li>
          )}
          {filtered.map((r) => (
            <li
              key={r.title}
              className={clsx(
                "grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 px-4 py-2.5 border-b border-line/60 last:border-b-0 hover:bg-bg-raised/40 transition-colors",
                r.a && r.b && "opacity-60",
              )}
            >
              <div className="min-w-0">
                <a
                  href={`https://runescape.wiki/w/${encodeURIComponent(r.title)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-ink hover:text-prayer truncate inline-block max-w-full"
                >
                  {r.title}
                </a>
                <div className="flex items-center gap-2 mt-0.5">
                  <Pill>{DIFF_LABEL[r.difficulty] ?? `T${r.difficulty}`}</Pill>
                  {!r.members && <Pill tone="success">F2P</Pill>}
                </div>
              </div>
              <span className="font-mono tabular text-xs text-ink-3 w-8 text-right">
                {r.questPoints}
              </span>
              <StatusCell done={r.a} accent="soul" />
              <StatusCell done={r.b} accent="prayer" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function StatusCell({
  done,
  accent,
}: {
  done: boolean;
  accent: "soul" | "prayer";
}) {
  if (done) {
    return (
      <span
        className={clsx(
          "inline-flex items-center justify-center w-7 h-7 rounded-full",
          accent === "soul" ? "bg-soul/15 text-soul-bright" : "bg-prayer/15 text-prayer-bright",
        )}
        aria-label="completed"
      >
        <Check size={14} />
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center justify-center w-7 h-7 rounded-full border border-line text-ink-faint"
      aria-label="not completed"
    >
      <X size={12} />
    </span>
  );
}
