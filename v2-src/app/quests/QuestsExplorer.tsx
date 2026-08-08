"use client";

import {
  memo,
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ArrowRight, ArrowUp, Crown, ExternalLink, Search, X } from "lucide-react";
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

// Shared column template so the header row and every body row can never drift
// apart. `display` is deliberately NOT baked in: the second header copy needs
// `hidden xl:grid`, and a `grid` in this string would fight it.
//
// Below sm the fixed columns are display:none, so the status cell falls into
// column 2 and each quest reads as a two-line card. Type (F2P/P2P) only earns a
// column from lg up — narrower than that, the members toggle covers the same
// ground and the space belongs to the quest name.
const ROW_COLS = clsx(
  "grid-cols-[minmax(0,1fr)_auto]",
  "sm:grid-cols-[minmax(0,1fr)_2.75rem_2rem_3rem_auto]",
  "lg:grid-cols-[minmax(0,1fr)_2.75rem_2rem_2rem_3rem_auto]",
  "items-center gap-x-2.5",
);

// 363 rows at ~81px was a 30,000px document and a second-long commit on every
// filter change. Render a couple of screenfuls and let the reader ask for more.
const PAGE_SIZE = 60;

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

  // Who could start each quest right now. buildQuestTable keeps one canonical
  // QuestEntry per title while `userEligible` is per player, so it has to come
  // from the raw lists. Values are joined slugs — a string, not an array — so
  // handing one to a memoized row can never break the memo.
  const readyByTitle = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of players) {
      for (const q of quests[p.slug] ?? []) {
        if (q.status === "COMPLETED" || !q.userEligible) continue;
        const prev = m.get(q.title);
        m.set(q.title, prev ? `${prev},${p.slug}` : p.slug);
      }
    }
    return m;
  }, [players, quests]);

  const [bucket, setBucket] = useState<Bucket>("all");
  const [membersOnly, setMembersOnly] = useState(false);
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE_SIZE);
  // Bumping this remounts the search box, which is how "All 106" clears text
  // the user can still see sitting in it.
  const [searchKey, setSearchKey] = useState(0);
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

  const visible = useMemo(() => filtered.slice(0, limit), [filtered, limit]);
  const remaining = filtered.length - visible.length;

  // Every filter change re-slices from the top, and runs inside a transition so
  // mounting the new rows can't block the click that asked for them.
  const chooseBucket = useCallback((b: Bucket) => {
    startTransition(() => {
      setBucket(b);
      setLimit(PAGE_SIZE);
    });
  }, []);

  const toggleMembers = useCallback(() => {
    startTransition(() => {
      setMembersOnly((v) => !v);
      setLimit(PAGE_SIZE);
    });
  }, []);

  const applyQuery = useCallback((v: string) => {
    startTransition(() => {
      setQuery(v);
      setLimit(PAGE_SIZE);
    });
  }, []);

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
        <SectionHead as="h1" title="Quests" />
        <EmptyState title="No players loaded" hint="Data will appear after the next refresh." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHead
        as="h1"
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
                {/* No children: Ring's own centre renders the value with its
                    unit, so passing a duplicate is one more place to drift. */}
                <Ring
                  pct={pct}
                  accent={p.accent}
                  size={54}
                  label={`${p.name}: ${Math.round(pct)} percent of quests complete`}
                />
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
          <div className="mb-3">
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-display italic text-[19px] leading-none text-ink">
                Do next
              </h2>
              {!loading && doNext.length > 6 && (
                <button
                  type="button"
                  onClick={() => {
                    chooseBucket("one-done");
                    applyQuery("");
                    setSearchKey((k) => k + 1);
                    tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className="shrink-0 inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-line text-[11px] font-mono uppercase tracking-wider text-ink-2 hover:text-ink hover:border-line-strong transition-colors"
                >
                  All {doNext.length}
                  <ArrowRight size={13} aria-hidden="true" />
                </button>
              )}
            </div>
            {/* Its own line: as a third item in an items-end row it read as
                "106 one of you has cleared" wrapped against the button. */}
            <p className="mt-1.5 text-[11px] font-mono uppercase tracking-[0.14em] text-ink-3">
              {loading ? "Loading" : `${fmt(doNext.length)} cleared by one of you`}
            </p>
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
            /* Two columns above xl: six rows of name-left / name-right across
               1150px put the label and its value at opposite screen edges. */
            <ul className="xl:grid xl:grid-cols-2 xl:gap-x-8">
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
                        className="inline-flex max-w-full items-center gap-1 text-sm text-ink hover:text-ash-bright transition-colors"
                      >
                        <span className="truncate">{r.quest.title}</span>
                        <ExternalLink
                          size={11}
                          aria-hidden="true"
                          className="shrink-0 text-ink-3"
                        />
                      </a>
                      <div className="mt-1 flex items-center gap-2">
                        <Stars difficulty={r.quest.difficulty} />
                        <span className="font-mono tabular text-[10px] text-ink-3">
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
                      <span className="block text-[10px] text-ink-3">
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

      {/* ------------------------------------------------------------------ */}
      {/* The table. Search, filters and the column header are ONE sticky
          block: stacking two stickies would need the controls' height as a
          magic number, and that block wraps differently at every width. */}
      {/* ------------------------------------------------------------------ */}
      <div ref={tableRef} className="scroll-mt-16">
        <p className="mb-2 text-[11px] text-ink-3">
          Tap a row to open that quest on the RuneScape Wiki in a new tab.
        </p>

        <div
          id="quest-filters"
          className="sticky top-14 z-10 -mt-1 pt-1 bg-bg scroll-mt-16"
        >
          <div className="pb-2 space-y-2 border-b border-line sm:border-b-0">
            <div className="flex items-center gap-2.5">
              <SearchBox key={searchKey} onQuery={applyQuery} />
              <p
                className="shrink-0 font-mono tabular text-[11px] text-ink-3"
                aria-live="polite"
              >
                {loading
                  ? "Loading…"
                  : filterActive
                    ? `${fmt(filtered.length)} / ${fmt(rows.length)}`
                    : `${fmt(rows.length)} quests`}
              </p>
            </div>

            {/* One scrollable line on a phone. Left to wrap, these five chips
                plus the members toggle stacked 150px of controls between the
                app header and the first quest.

                THIS element is that scroller — `min-w-max` below runs the row
                261px past a 360px viewport, putting "None" and "Members only"
                entirely off-screen — so it is the one that has to carry the
                fade. Segmented's own fade sits on its inner row, which never
                overflows here, so all it did was dim 24px of the "None" chip
                while signalling nothing. */}
            {/* scroll-fade-x is a real Tailwind `@utility`, so it composes with
                variants: applying it only below lg is exact, and needs no
                reset to undo it above. */}
            <div className="overflow-x-auto lg:overflow-visible max-lg:scroll-fade-x">
              <div
                className={clsx(
                  "flex items-center gap-2 min-w-max lg:min-w-0 lg:flex-wrap",
                  // Segmented wraps, self-limits and fades by default, which
                  // all fight a horizontal scroller. Its inner row is what
                  // actually carries those, so target that — the earlier
                  // `[&>[role=group]]` overrides landed on the outer group and
                  // did nothing. Kept out here so the shared component keeps
                  // its own sensible defaults everywhere else.
                  "[&>[role=group]]:max-w-none",
                  "[&>[role=group]>div]:flex-nowrap [&>[role=group]>div]:overflow-visible",
                  "[&>[role=group]>div]:[mask-image:none]",
                  "lg:[&>[role=group]>div]:flex-wrap",
                )}
              >
                <Segmented<Bucket>
                  ariaLabel="Filter quests by completion"
                  value={bucket}
                  onChange={chooseBucket}
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
                  onClick={toggleMembers}
                  className={clsx(
                    "shrink-0 inline-flex items-center gap-1.5 h-11 sm:h-10 px-3 rounded-lg border text-[11px] font-mono uppercase tracking-wider transition-colors",
                    membersOnly
                      ? "border-warn/40 text-warn bg-warn/10"
                      : "border-line text-ink-3 hover:text-ink-2 hover:border-line-strong",
                  )}
                >
                  <Crown size={13} aria-hidden="true" />
                  Members only
                </button>
              </div>
            </div>

            {/* Column key. sm+ gets the real header row below instead. */}
            <p className="sm:hidden flex items-center gap-3">
              {cols.map((c) => (
                <span key={c.slug} className="inline-flex items-center gap-1.5">
                  <span
                    aria-hidden="true"
                    className={clsx(
                      "grid place-items-center w-5 h-5 rounded-full border font-mono text-[10px] font-bold",
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

          {!loading && filtered.length > 0 && (
            <div className="hidden sm:grid xl:grid-cols-2 bg-bg-surface border border-line rounded-t-lg text-[10px] uppercase tracking-[0.14em] font-mono text-ink-3">
              <div className={clsx("grid", ROW_COLS, "px-4 py-2")}>
                <HeaderCells cols={cols} />
              </div>
              <div
                className={clsx(
                  "hidden xl:grid",
                  ROW_COLS,
                  "px-4 py-2 border-l border-line",
                )}
              >
                <HeaderCells cols={cols} />
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="space-y-1.5">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-[81px] sm:h-11 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No quests match"
            hint="Try a different filter or clear the search."
          />
        ) : (
          <div className="bg-bg-surface border border-line rounded-lg sm:border-t-0 sm:rounded-t-none overflow-hidden">
            {/* Two columns above xl. One column left ~770px of void per row and
                a 30,000px page; the eye had nothing to follow across it. */}
            <ul className="xl:grid xl:grid-cols-2">
              {visible.map((r) => (
                <QuestRowItem
                  key={r.quest.title}
                  row={r}
                  cols={cols}
                  ready={readyByTitle.get(r.quest.title) ?? ""}
                />
              ))}
            </ul>

            {/* No border-t: every row keeps its own bottom hairline, so at xl
                the two columns end on the same line instead of one of them
                dropping its border and leaving a half-width rule. */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-3 sm:px-4 py-3">
              <p className="font-mono tabular text-[11px] text-ink-3">
                Showing {fmt(visible.length)} of {fmt(filtered.length)}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {remaining > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        startTransition(() => setLimit((n) => n + PAGE_SIZE))
                      }
                      className="inline-flex items-center h-10 px-3.5 rounded-lg border border-line-strong text-[11px] font-mono uppercase tracking-wider text-ink-2 hover:text-ink hover:bg-bg-raised transition-colors"
                    >
                      Show {fmt(Math.min(PAGE_SIZE, remaining))} more
                    </button>
                    <button
                      type="button"
                      onClick={() => startTransition(() => setLimit(filtered.length))}
                      className="inline-flex items-center h-10 px-3.5 rounded-lg border border-line text-[11px] font-mono uppercase tracking-wider text-ink-3 hover:text-ink-2 hover:border-line-strong transition-colors"
                    >
                      All {fmt(filtered.length)}
                    </button>
                  </>
                )}
                <a
                  href="#quest-filters"
                  className="inline-flex items-center gap-1.5 h-10 px-3 rounded-lg text-[11px] font-mono uppercase tracking-wider text-ink-3 hover:text-ink-2 transition-colors"
                >
                  <ArrowUp size={13} aria-hidden="true" />
                  Filters
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Search — owns its own text state so a keystroke re-renders one input, not
// the whole table. The parent only hears about it once the debounce settles.
// ---------------------------------------------------------------------------

function SearchBox({ onQuery }: { onQuery: (v: string) => void }) {
  const [text, setText] = useState("");

  useEffect(() => {
    const id = setTimeout(() => onQuery(text.trim().toLowerCase()), 140);
    return () => clearTimeout(id);
  }, [text, onQuery]);

  return (
    <div className="relative flex-1 min-w-0">
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
// Table header — rendered once per list column, so it is still overhead when
// the list splits in two above xl.
// ---------------------------------------------------------------------------

function HeaderCells({ cols }: { cols: Col[] }) {
  return (
    <>
      <span>Quest</span>
      <span>Diff</span>
      <span className="hidden lg:block">Type</span>
      <span className="text-right">QP</span>
      <span>Start</span>
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
    </>
  );
}

// ---------------------------------------------------------------------------
// Row
// ---------------------------------------------------------------------------

const QuestRowItem = memo(function QuestRowItem({
  row,
  cols,
  ready,
}: {
  row: QuestRow;
  cols: Col[];
  /** Comma-joined slugs of the players who can start this quest right now. */
  ready: string;
}) {
  const q = row.quest;
  const done = row.bucket === "both-done";
  const behind = cols.filter((c) => row.statuses[c.slug] !== "COMPLETED");
  return (
    <li
      className={clsx(
        "group relative grid",
        ROW_COLS,
        "px-3 sm:px-4 py-2.5 border-b border-line/60",
        "hover:bg-bg-raised/40 transition-colors",
        // The divider between the two xl columns sits on the same edge as the
        // header's, so the two can never land a pixel apart.
        "xl:[&:nth-child(even)]:border-l xl:[&:nth-child(even)]:border-line",
      )}
    >
      {/* The link IS the row: absolute inset-0 makes its own box the full 81px
          hit target (a 266x20 text run was the whole of the reported "380
          undersized tap targets"), and gives keyboard users a focus ring around
          the row instead of around a word. The title lives outside it so the
          accessible name stays one line. */}
      <a
        href={wikiUrl(q.title)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${q.title} — RuneScape Wiki`}
        title={`${q.title} — RuneScape Wiki`}
        className="absolute inset-0 rounded-md"
      />

      <div className="min-w-0">
        {/* The title wraps instead of truncating. Above xl the list splits in
            two, which leaves the name ~268px of a 575px row — enough to clip
            the whole "Recipe for Disaster: Freeing …" family mid-phrase, with
            no visible tooltip on a row whose hit target is a link overlay.
            A block (not flex) so the icon rides the last word inline rather
            than floating in the vertical middle of a two-line name; no
            whitespace before it in the JSX, so it can never orphan. */}
        <div
          className={clsx(
            "text-sm transition-colors",
            done
              ? "text-ink-3 group-hover:text-ink-2"
              : "text-ink group-hover:text-prayer-bright",
          )}
        >
          {q.title}
          <ExternalLink
            size={11}
            aria-hidden="true"
            className="ml-1 inline-block align-middle text-ink-3"
          />
        </div>
        <div className="sm:hidden mt-1 flex items-center gap-2.5">
          <Stars difficulty={q.difficulty} />
          <span className="font-mono tabular text-[10px] text-ink-3">
            {q.questPoints} QP
          </span>
          <MembersFlag members={q.members} />
          <Readiness behind={behind} ready={ready} />
        </div>
      </div>

      {/* These cells sit UNDER the row-wide link overlay on purpose — a
          `relative` cell here punched a dead zone in the middle of the row.
          Everything they said in a title is also on an aria-label. */}
      <span className="hidden sm:block">
        <Stars difficulty={q.difficulty} />
      </span>
      <span className="hidden lg:block">
        <MembersFlag members={q.members} />
      </span>
      <span className="hidden sm:block text-right font-mono tabular text-xs text-ink-3">
        {q.questPoints}
      </span>
      <span className="hidden sm:block">
        <Readiness behind={behind} ready={ready} />
      </span>

      {/* The one cell kept above the overlay: the D/S marks are the most
          cryptic thing in the row, so their tooltips have to work. */}
      <span className="relative flex items-center justify-end gap-1.5">
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

/**
 * Can anyone start this right now? RuneMetrics ships `userEligible` per quest
 * per player — the closest thing in the data to "what can I do next" — and it
 * was being thrown away, leaving a name column 864px wide to hold a 90px title.
 */
function Readiness({ behind, ready }: { behind: Col[]; ready: string }) {
  if (!behind.length) return null;
  const slugs = ready ? ready.split(",") : [];
  const can = behind.filter((c) => slugs.includes(c.slug));
  const names = (list: Col[]) => list.map((c) => c.name).join(" and ");

  if (!can.length) {
    const label = `${names(behind)} cannot start this yet`;
    return (
      <span
        role="img"
        aria-label={label}
        title={label}
        className="font-mono text-[10px] uppercase tracking-wider text-ink-3"
      >
        Locked
      </span>
    );
  }
  const label = `${names(can)} can start this now`;
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className="font-mono text-[10px] uppercase tracking-wider text-success"
    >
      Ready
    </span>
  );
}

/**
 * A status mark, not a control. It used to be a bordered rounded-rect the exact
 * shape of the filter chips above it, so people tapped it expecting to tick a
 * quest off. Circular and filled reads as a state badge instead.
 */
function StatusMark({ col, status }: { col: Col; status: QuestStatus }) {
  const label = `${col.name}: ${STATUS_LABEL[status]}`;
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={clsx(
        "grid place-items-center w-6 h-6 rounded-full font-mono text-[10.5px] font-bold",
        status === "COMPLETED"
          ? clsx(ACCENT_TEXT[col.accent], "bg-bg-raised")
          : status === "STARTED"
            ? "text-warn bg-warn/10"
            : "text-ink-3",
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
        members ? "text-ink-3" : "text-success/90",
      )}
    >
      {members ? "P2P" : "F2P"}
    </span>
  );
}
