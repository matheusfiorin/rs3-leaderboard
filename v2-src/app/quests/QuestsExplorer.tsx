"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Crown, Search, X } from "lucide-react";
import { clsx } from "clsx";
import {
  Card,
  EmptyState,
  SectionHead,
  Skeleton,
  Stat,
} from "@/components/primitives";
import { ACCENT_BORDER, ACCENT_TEXT, Ring, Segmented } from "@/components/ui";
import { usePlayerData, useQuests } from "@/components/PlayerDataProvider";
import { buildQuestTable, questPointsOf } from "@/lib/player";
import type { QuestBucket, QuestRow } from "@/lib/player";
import { fmt } from "@/lib/format";
import { wikiUrl } from "@/lib/paths";
import type { Accent, QuestStatus } from "@/lib/types";

type Bucket = "all" | QuestBucket;

/** One player's column in the comparison table. */
interface Col {
  slug: string;
  name: string;
  initial: string;
  accent: Accent;
}

const DIFF_LABEL: Record<number, string> = {
  0: "Novice",
  1: "Intermediate",
  2: "Experienced",
  3: "Master",
  4: "Grandmaster",
  250: "Special",
};

const STATUS_LABEL: Record<QuestStatus, string> = {
  COMPLETED: "completed",
  STARTED: "in progress",
  NOT_STARTED: "not started",
};

// Shared column template so the header row and the 363 body rows can never
// drift apart. Below sm the two middle columns are display:none, so the status
// cell falls into column 2 and each quest reads as a card.
const ROW_COLS =
  "grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[minmax(0,1fr)_4.5rem_2.5rem_2.5rem_auto] items-center gap-x-3";

export default function QuestsExplorer() {
  const { players } = usePlayerData();
  const slugs = useMemo(() => players.map((p) => p.slug), [players]);
  const { quests, loading } = useQuests(slugs);

  const cols = useMemo<Col[]>(
    () =>
      players.map((p) => ({
        slug: p.slug,
        name: p.name,
        initial: p.name.slice(0, 1).toUpperCase(),
        accent: p.accent,
      })),
    [players],
  );

  const rows = useMemo<QuestRow[]>(() => {
    if (loading) return [];
    return buildQuestTable(
      players.map((p) => ({ slug: p.slug, questList: quests[p.slug] ?? [] })),
    );
  }, [players, quests, loading]);

  const [bucket, setBucket] = useState<Bucket>("all");
  const [membersOnly, setMembersOnly] = useState(false);
  const [query, setQuery] = useState("");
  const tableRef = useRef<HTMLDivElement>(null);

  // Members toggle applies first so the bucket counts describe what the user
  // would actually see if they picked that bucket.
  const scoped = useMemo(
    () => (membersOnly ? rows.filter((r) => r.quest.members) : rows),
    [rows, membersOnly],
  );

  const counts = useMemo(() => {
    const c: Record<QuestBucket, number> = {
      "both-done": 0,
      "one-done": 0,
      "in-progress": 0,
      none: 0,
    };
    for (const r of scoped) c[r.bucket]++;
    return c;
  }, [scoped]);

  const filtered = useMemo(() => {
    let out = scoped;
    if (bucket !== "all") out = out.filter((r) => r.bucket === bucket);
    if (query) {
      out = out.filter((r) => r.quest.title.toLowerCase().includes(query));
    }
    return out;
  }, [scoped, bucket, query]);

  // The co-op insight: exactly one of them has cleared it, easiest first.
  const doNext = useMemo(
    () =>
      rows
        .filter((r) => r.bucket === "one-done")
        .sort(
          (a, b) =>
            a.quest.difficulty - b.quest.difficulty ||
            a.quest.title.localeCompare(b.quest.title),
        ),
    [rows],
  );

  const questPoints = useMemo(() => {
    const out: Record<string, number> = {};
    for (const p of players) out[p.slug] = questPointsOf(quests[p.slug] ?? []);
    return out;
  }, [players, quests]);

  const filterActive = bucket !== "all" || membersOnly || query.length > 0;
  const total = rows.length || players[0]?.totalQuests || 0;

  if (!players.length) {
    return (
      <div className="space-y-6">
        <SectionHead title="Quests" />
        <EmptyState title="No players loaded" hint="Data will appear after the next refresh." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHead
        title="Quests"
        hint={`${fmt(total)} in the log · Sixth Age compared`}
      />

      {/* Headline: where each of them stands. questsDone/questsStarted come
          from the profile, which is already in context — showing them now
          avoids a "0 / 363" flash while the 44 KB quest lists load. */}
      <div className="grid gap-3 sm:grid-cols-2">
        {players.map((p) => {
          const pct = p.totalQuests ? (p.questsDone / p.totalQuests) * 100 : 0;
          return (
            <Card key={p.slug} accent={p.accent} className="p-4">
              <div className="flex items-center gap-4">
                <Ring
                  pct={pct}
                  accent={p.accent}
                  size={54}
                  label={`${p.name}: ${Math.round(pct)} percent of quests complete`}
                >
                  <span className="font-mono tabular text-[11px] font-bold text-ink-2">
                    {Math.round(pct)}%
                  </span>
                </Ring>
                <div className="min-w-0">
                  <div
                    className={clsx(
                      "font-display italic text-[17px] leading-none truncate",
                      ACCENT_TEXT[p.accent],
                    )}
                  >
                    {p.name}
                  </div>
                  <div className="mt-1.5 font-mono tabular font-bold text-2xl text-ink">
                    {fmt(p.questsDone)}
                    <span className="text-base text-ink-3"> / {fmt(p.totalQuests)}</span>
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-line grid grid-cols-2 gap-3">
                <Stat
                  size="sm"
                  label="Quest points"
                  value={
                    loading ? <Skeleton className="h-5 w-14" /> : fmt(questPoints[p.slug] ?? 0)
                  }
                />
                <Stat size="sm" label="Started" value={fmt(p.questsStarted)} />
              </div>
            </Card>
          );
        })}
      </div>

      {/* Catch-up list */}
      {cols.length > 1 && (
        <Card accent="ash" className="p-4">
          <div className="flex items-end justify-between gap-3 mb-3">
            <div>
              <h2 className="font-display italic text-[19px] leading-none text-ink">
                Do next
              </h2>
              <p className="mt-1.5 text-[11px] font-mono uppercase tracking-[0.14em] text-ink-3">
                {loading ? "Loading" : `${fmt(doNext.length)} one of you has cleared`}
              </p>
            </div>
            {!loading && doNext.length > 6 && (
              <button
                type="button"
                onClick={() => {
                  setBucket("one-done");
                  setQuery("");
                  tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className="shrink-0 inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-line text-[11px] font-mono uppercase tracking-wider text-ink-2 hover:text-ink hover:border-line-strong transition-colors"
              >
                All {doNext.length}
                <ArrowRight size={13} />
              </button>
            )}
          </div>

          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-11 w-full" />
              ))}
            </div>
          ) : doNext.length === 0 ? (
            <p className="text-sm text-ink-3">
              Nothing to catch up on — every cleared quest is cleared by both.
            </p>
          ) : (
            <ul>
              {doNext.slice(0, 6).map((r) => {
                const behind = cols.filter(
                  (c) => r.statuses[c.slug] !== "COMPLETED",
                );
                return (
                  <li
                    key={r.quest.title}
                    className="flex items-center justify-between gap-3 py-2 border-b border-line/50 last:border-b-0"
                  >
                    <div className="min-w-0">
                      <a
                        href={wikiUrl(r.quest.title)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block truncate text-sm text-ink hover:text-ash-bright transition-colors"
                      >
                        {r.quest.title}
                      </a>
                      <div className="mt-1 flex items-center gap-2">
                        <Stars difficulty={r.quest.difficulty} />
                        <span className="font-mono tabular text-[10px] text-ink-faint">
                          {r.quest.questPoints} QP
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <span
                        className={clsx(
                          "block font-mono text-[11px] uppercase tracking-wider",
                          behind.length === 1
                            ? ACCENT_TEXT[behind[0].accent]
                            : "text-ink-2",
                        )}
                      >
                        {behind.map((c) => c.name).join(" + ")}
                      </span>
                      <span className="block text-[10px] text-ink-faint">
                        to catch up
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      )}

      {/* Controls */}
      <div ref={tableRef} className="space-y-3 scroll-mt-16">
        <SearchBox onQuery={setQuery} />

        <div className="flex flex-wrap items-center gap-2">
          <Segmented<Bucket>
            ariaLabel="Filter quests by completion"
            value={bucket}
            onChange={setBucket}
            options={[
              { value: "all", label: "All", count: scoped.length },
              { value: "one-done", label: "One", count: counts["one-done"] },
              { value: "both-done", label: "Both", count: counts["both-done"] },
              { value: "in-progress", label: "Started", count: counts["in-progress"] },
              { value: "none", label: "None", count: counts.none },
            ]}
          />
          <button
            type="button"
            aria-pressed={membersOnly}
            onClick={() => setMembersOnly((v) => !v)}
            className={clsx(
              "inline-flex items-center gap-1.5 h-10 px-3 rounded-lg border text-[11px] font-mono uppercase tracking-wider transition-colors",
              membersOnly
                ? "border-warn/40 text-warn bg-warn/10"
                : "border-line text-ink-3 hover:text-ink-2 hover:border-line-strong",
            )}
          >
            <Crown size={13} />
            Members only
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <p className="font-mono tabular text-[11px] text-ink-3" aria-live="polite">
            {loading
              ? "Loading quest lists…"
              : filterActive
                ? `${fmt(filtered.length)} of ${fmt(rows.length)}`
                : `${fmt(rows.length)} quests`}
          </p>
          {/* Column key — the sm+ table has a header row, mobile does not. */}
          <p className="sm:hidden flex items-center gap-3">
            {cols.map((c) => (
              <span key={c.slug} className="inline-flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className={clsx(
                    "grid place-items-center w-5 h-5 rounded border font-mono text-[10px] font-bold",
                    ACCENT_TEXT[c.accent],
                    ACCENT_BORDER[c.accent],
                  )}
                >
                  {c.initial}
                </span>
                <span className="text-[11px] text-ink-3">{c.name}</span>
              </span>
            ))}
          </p>
        </div>

        {/* Table */}
        {loading ? (
          <div className="space-y-1.5">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-14 sm:h-11 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No quests match"
            hint="Try a different filter or clear the search."
          />
        ) : (
          <div className="bg-bg-surface border border-line rounded-lg overflow-hidden">
            <div
              className={clsx(
                "hidden sm:grid sm:grid-cols-[minmax(0,1fr)_4.5rem_2.5rem_2.5rem_auto] items-center gap-x-3",
                "px-4 py-2 border-b border-line text-[10px] uppercase tracking-[0.14em] font-mono text-ink-3",
              )}
            >
              <span>Quest</span>
              <span>Diff</span>
              <span>Type</span>
              <span className="text-right">QP</span>
              <span className="flex items-center justify-end gap-1.5">
                {cols.map((c) => (
                  <span
                    key={c.slug}
                    title={c.name}
                    className={clsx("w-6 text-center", ACCENT_TEXT[c.accent])}
                  >
                    {c.initial}
                  </span>
                ))}
              </span>
            </div>
            <ul>
              {filtered.map((r) => (
                <QuestRowItem key={r.quest.title} row={r} cols={cols} />
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Search — owns its own text state so a keystroke re-renders one input, not
// 363 rows. The parent only hears about it once the debounce settles.
// ---------------------------------------------------------------------------

function SearchBox({ onQuery }: { onQuery: (v: string) => void }) {
  const [text, setText] = useState("");

  useEffect(() => {
    const id = setTimeout(() => onQuery(text.trim().toLowerCase()), 140);
    return () => clearTimeout(id);
  }, [text, onQuery]);

  return (
    <div className="relative">
      <Search
        size={16}
        aria-hidden="true"
        className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none"
      />
      <input
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Search quests…"
        aria-label="Search quests by name"
        className="w-full h-11 pl-9 pr-11 rounded-lg bg-bg-surface border border-line text-sm text-ink placeholder:text-ink-3 focus:border-line-strong outline-none [&::-webkit-search-cancel-button]:appearance-none"
      />
      {text && (
        <button
          type="button"
          onClick={() => setText("")}
          aria-label="Clear search"
          className="absolute right-1 top-1/2 -translate-y-1/2 grid place-items-center w-11 h-11 text-ink-3 hover:text-ink"
        >
          <X size={15} />
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Row
// ---------------------------------------------------------------------------

const QuestRowItem = memo(function QuestRowItem({
  row,
  cols,
}: {
  row: QuestRow;
  cols: Col[];
}) {
  const q = row.quest;
  const done = row.bucket === "both-done";
  return (
    <li
      className={clsx(
        ROW_COLS,
        "px-3 sm:px-4 py-2.5 border-b border-line/60 last:border-b-0",
        "hover:bg-bg-raised/40 transition-colors",
        // 363 rows is enough that laying out the offscreen ones costs a visible
        // beat on mobile; the intrinsic size keeps the scrollbar honest.
        "[content-visibility:auto] [contain-intrinsic-size:auto_60px]",
      )}
    >
      <div className="min-w-0">
        <a
          href={wikiUrl(q.title)}
          target="_blank"
          rel="noopener noreferrer"
          className={clsx(
            "block truncate text-sm transition-colors",
            done ? "text-ink-3 hover:text-ink-2" : "text-ink hover:text-prayer-bright",
          )}
        >
          {q.title}
        </a>
        <div className="sm:hidden mt-1 flex items-center gap-2.5">
          <Stars difficulty={q.difficulty} />
          <span className="font-mono tabular text-[10px] text-ink-faint">
            {q.questPoints} QP
          </span>
          <MembersFlag members={q.members} />
        </div>
      </div>

      <span className="hidden sm:block">
        <Stars difficulty={q.difficulty} />
      </span>
      <span className="hidden sm:block">
        <MembersFlag members={q.members} />
      </span>
      <span className="hidden sm:block text-right font-mono tabular text-xs text-ink-3">
        {q.questPoints}
      </span>

      <span className="flex items-center justify-end gap-1.5">
        {cols.map((c) => (
          <StatusMark
            key={c.slug}
            col={c}
            status={row.statuses[c.slug] ?? "NOT_STARTED"}
          />
        ))}
      </span>
    </li>
  );
});

function StatusMark({ col, status }: { col: Col; status: QuestStatus }) {
  const label = `${col.name}: ${STATUS_LABEL[status]}`;
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={clsx(
        "grid place-items-center w-6 h-6 rounded-md border font-mono text-[10.5px] font-bold",
        status === "COMPLETED"
          ? clsx(ACCENT_TEXT[col.accent], ACCENT_BORDER[col.accent], "bg-bg-raised")
          : status === "STARTED"
            ? "border-warn/40 text-warn"
            : "border-line text-ink-faint",
      )}
    >
      {col.initial}
    </span>
  );
}

function Stars({ difficulty }: { difficulty: number }) {
  const label = DIFF_LABEL[difficulty] ?? `Tier ${difficulty}`;
  // 250 is RuneMetrics' sentinel for the handful of special/miniquest entries.
  if (difficulty > 4) {
    return (
      <span
        role="img"
        aria-label={label}
        title={label}
        className="font-mono text-[10px] uppercase tracking-wider text-ash-bright"
      >
        Spec
      </span>
    );
  }
  const filled = Math.max(1, Math.min(5, difficulty + 1));
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className="font-mono text-[11px] leading-none whitespace-nowrap"
    >
      <span className="text-warn">{"★".repeat(filled)}</span>
      <span className="text-ink-faint">{"☆".repeat(5 - filled)}</span>
    </span>
  );
}

function MembersFlag({ members }: { members: boolean }) {
  const label = members ? "Members" : "Free to play";
  return (
    <span
      title={label}
      aria-label={label}
      role="img"
      className={clsx(
        "font-mono text-[10px] tracking-wider",
        members ? "text-ink-faint" : "text-success/80",
      )}
    >
      {members ? "P2P" : "F2P"}
    </span>
  );
}
