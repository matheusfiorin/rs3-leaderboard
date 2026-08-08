"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { clsx } from "clsx";
import {
  ChevronDown,
  CircleCheck,
  Cloud,
  CloudCheck,
  CloudOff,
  ExternalLink,
  HardDrive,
  Lock,
  RefreshCw,
  SlidersHorizontal,
  Timer,
  Users,
} from "lucide-react";
import {
  Bar,
  Card,
  EmptyState,
  Pill,
  SectionHead,
  Skeleton,
} from "@/components/primitives";
import {
  ACCENT_TEXT,
  CountInput,
  PlayerScope,
  ReqList,
  Ring,
  Segmented,
  SkillIcon,
  TierBadge,
  usePlayerScope,
} from "@/components/ui";
import { useEval } from "@/components/useEval";
import { usePlayerData } from "@/components/PlayerDataProvider";
import { useProgress } from "@/components/ProgressProvider";
import {
  BOSSES,
  bossesByTier,
  nextBosses,
  type BossEntry,
} from "@/lib/content/bosses";
import { scopedKey } from "@/lib/progress";
import { kcKey } from "@/lib/requirements";
import { fmt } from "@/lib/format";
import { wikiUrl } from "@/lib/paths";
import type { Accent, ContentTier, GateResult } from "@/lib/types";

const TIERS: ContentTier[] = ["early", "mid", "late", "end", "apex"];

type TierFilter = ContentTier | "all";
type GroupFilter = "all" | "solo" | "duo" | "group";

type BossStyle = NonNullable<BossEntry["style"]>[number];

/** Combat styles map onto the skill icons we already ship — no new art. */
const STYLE_SKILL: Record<BossStyle, number> = {
  melee: 0,
  ranged: 4,
  magic: 6,
  necromancy: 28,
};

/**
 * The tier heading is the only structural break in a page that is otherwise
 * 39 near-identical cards, so it carries the tier's colour at display weight
 * rather than reading as a 16px grey line. Written out per tier because
 * Tailwind cannot see class names built by concatenation.
 */
const TIER_HEAD: Record<ContentTier, string> = {
  early: "text-success",
  mid: "text-prayer-bright",
  late: "text-warn",
  end: "text-soul-bright",
  apex: "text-ash-bright",
};

const TIER_RULE: Record<ContentTier, string> = {
  early: "border-success/40",
  mid: "border-prayer/40",
  late: "border-warn/40",
  end: "border-soul/40",
  apex: "border-ash/40",
};

const TIER_LABEL: Record<ContentTier, string> = {
  early: "Early",
  mid: "Mid",
  late: "Late",
  end: "End",
  apex: "Apex",
};

export default function PvmClient() {
  const { players, contexts, loading, gate } = useEval();
  const { selectedSlug, setSelected } = usePlayerData();
  const progress = useProgress();

  const [tier, setTier] = useState<TierFilter>("all");
  const [group, setGroup] = useState<GroupFilter>("all");
  const [readyOnly, setReadyOnly] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  /** Explicit user collapse/expand, keyed by tier. Absent = use the default. */
  const [override, setOverride] = useState<Partial<Record<ContentTier, boolean>>>({});
  /** Which tier the reader is currently inside, for the sticky bar. */
  const [current, setCurrent] = useState<ContentTier | null>(null);

  // Selection is shared and persisted, so picking a player here survives a
  // click through to /goals. Fall back to the first player rather than trusting
  // the stored slug — the roster is re-fetched and a slug can go missing.
  const player = players.find((p) => p.slug === selectedSlug) ?? players[0];
  const slug = player?.slug ?? "";
  const accent: Accent = player?.accent ?? "prayer";

  const gates = useMemo(() => {
    const out: Record<string, GateResult> = {};
    for (const b of BOSSES) out[b.id] = gate(slug, b.requirements);
    return out;
  }, [gate, slug]);

  const ctx = contexts[slug];
  const nextUp = useMemo(() => (ctx ? nextBosses(ctx, 3) : []), [ctx]);

  // Kill counts are per player: "Decxus has 42 Vorago kills" is not a claim
  // about Soclopata, and boss gates read these counts back (Nex ×50 gates
  // Angel of Death), so an account-wide ledger silently moved the other
  // player's gate percentage.
  const kills = useMemo(() => {
    let total = 0;
    let tracked = 0;
    let top: { name: string; n: number } | null = null;
    for (const b of BOSSES) {
      const n = progress.count(scopedKey(slug, kcKey(b.name)));
      if (n > 0) {
        total += n;
        tracked += 1;
        if (!top || n > top.n) top = { name: b.name, n };
      }
    }
    return { total, tracked, top };
  }, [progress, slug]);

  const unlocked = useMemo(
    () => BOSSES.filter((b) => gates[b.id]?.complete).length,
    [gates],
  );

  /** Open gates with nothing logged yet — the actual "go do this" list. */
  const untried = useMemo(
    () =>
      BOSSES.filter(
        (b) =>
          gates[b.id]?.complete &&
          progress.count(scopedKey(slug, kcKey(b.name))) === 0,
      ).sort((a, b) => a.hpTier - b.hpTier),
    [gates, progress, slug],
  );

  const tierCounts = useMemo(() => {
    const out: Record<string, number> = { all: 0 };
    for (const b of BOSSES) {
      if (group !== "all" && b.group !== group) continue;
      if (readyOnly && !gates[b.id]?.complete) continue;
      out.all += 1;
      out[b.tier] = (out[b.tier] ?? 0) + 1;
    }
    return out;
  }, [group, readyOnly, gates]);

  const ladder = useMemo(
    () =>
      TIERS.filter((t) => tier === "all" || t === tier)
        .map((t) => {
          // bossesByTier already sorts by hpTier, so a tier reads as a ramp.
          const bosses = bossesByTier(t).filter(
            (b) =>
              (group === "all" || b.group === group) &&
              (!readyOnly || gates[b.id]?.complete),
          );
          return {
            tier: t,
            bosses,
            open: bosses.filter((b) => gates[b.id]?.complete).length,
          };
        })
        .filter((g) => g.bosses.length > 0),
    [tier, group, readyOnly, gates],
  );

  const shown = ladder.reduce((n, g) => n + g.bosses.length, 0);

  // A tier with nothing open yet is 1,400px of cards you cannot use, so it
  // starts folded. Filtering to one tier is an explicit request to see it.
  //
  // While the quest lists are still in flight every quest-gated boss reads as
  // locked, so `open` is only a lower bound — folding on it would hide the
  // whole ladder from the static HTML. Start expanded and let the fold apply
  // once the gates actually resolve.
  const isOpen = (g: { tier: ContentTier; open: number }) =>
    tier !== "all" ? true : (override[g.tier] ?? (loading || g.open > 0));

  const allExpanded = ladder.length > 0 && ladder.every(isOpen);

  const toggleAll = () =>
    setOverride(
      Object.fromEntries(
        ladder.map((g) => [g.tier, !allExpanded] as const),
      ) as Partial<Record<ContentTier, boolean>>,
    );

  const activeFilters = [
    tier !== "all" ? tier : null,
    group !== "all" ? group : null,
    readyOnly ? "ready" : null,
  ].filter(Boolean) as string[];

  // Which tier am I in? At 7,000px the tier headings scroll away and nothing
  // on screen answers that, so the sticky bar carries the answer instead of
  // fighting the filter row for the same sticky offset.
  const ladderRef = useRef<HTMLDivElement>(null);
  const tiersKey = ladder.map((g) => g.tier).join(",");

  useEffect(() => {
    const root = ladderRef.current;
    if (!root) return;
    const nodes = Array.from(root.querySelectorAll<HTMLElement>("[data-tier]"));
    if (!nodes.length) {
      setCurrent(null);
      return;
    }
    const seen = new Set<string>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const t = e.target.getAttribute("data-tier");
          if (!t) continue;
          if (e.isIntersecting) seen.add(t);
          else seen.delete(t);
        }
        setCurrent(TIERS.find((t) => seen.has(t)) ?? null);
      },
      // A band just below the sticky chrome down to mid-viewport: whatever
      // crosses it is what the reader is looking at.
      { rootMargin: "-150px 0px -55% 0px" },
    );
    for (const n of nodes) io.observe(n);
    return () => io.disconnect();
  }, [tiersKey]);

  const currentGroup = ladder.find((g) => g.tier === current);

  return (
    <div className="space-y-6">
      <SectionHead
        as="h1"
        title="PvM"
        hint={`${BOSSES.length} bosses · giant mole to Zuk`}
      />

      {players.length > 1 && (
        <Segmented
          ariaLabel="Player"
          value={slug}
          onChange={setSelected}
          options={players.map((p) => ({
            value: p.slug,
            label: (
              <span className={clsx(p.slug === slug && ACCENT_TEXT[p.accent])}>
                {p.name}
              </span>
            ),
          }))}
        />
      )}

      {/* The ladder is static content: names, tiers, blurbs, drop highlights
          and wiki links are all known at build time, so they render into the
          HTML immediately. Only the gate-derived parts — rings, "still needs",
          locked styling, ready-only, "what now" — wait on the quest lists,
          which stay a client fetch because they are 44 KB per player. */}
      {!player ? (
        <LadderSkeleton />
      ) : (
        // Every tick and counter below belongs to this player, not to the
        // browser: PlayerScope namespaces the store keys for the whole region.
        <PlayerScope slug={slug}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Card accent={accent} className="p-5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[11px] uppercase tracking-[0.14em] font-mono text-ink-3">
                  Gates open
                </span>
                <span
                  className={clsx(
                    "font-mono text-[11px] uppercase tracking-[0.14em] truncate",
                    ACCENT_TEXT[accent],
                  )}
                >
                  {player.name}
                </span>
              </div>
              {/* A count inside a percentage dial was being read as a percent.
                  A number plus a bar says the same thing without the pun. */}
              <div className="mt-1.5 font-mono tabular text-3xl font-bold text-ink leading-none">
                {loading ? <span className="text-ink-3">—</span> : unlocked}
                <span className="text-ink-3 text-xl font-normal">
                  {" "}
                  / {BOSSES.length}
                </span>
              </div>
              <div className="mt-3">
                <Bar
                  pct={loading ? 0 : (unlocked / BOSSES.length) * 100}
                  accent={accent}
                />
              </div>
              <div className="mt-1.5 font-mono tabular text-[11px] text-ink-3">
                {loading
                  ? "checking requirements…"
                  : `${Math.round((unlocked / BOSSES.length) * 100)}% of the ladder requirements met`}
              </div>
            </Card>

            <Card className="p-5">
              <div className="text-[11px] uppercase tracking-[0.14em] font-mono text-ink-3">
                Kills logged
              </div>
              <div className="mt-1.5 flex items-baseline justify-between gap-3">
                <span className="font-mono tabular text-3xl font-bold text-ink leading-none">
                  {fmt(kills.total)}
                </span>
                <span className="font-mono text-[11px] text-ink-3 tabular">
                  {kills.tracked} of {BOSSES.length} bosses
                </span>
              </div>
              <StorageNote />
              {kills.top && (
                <div className="mt-1.5 flex items-baseline justify-between gap-3 text-xs">
                  <span className="text-ink-3">Most logged</span>
                  <span className="text-ink-2 truncate">
                    {kills.top.name}{" "}
                    <span className="font-mono tabular text-ink">
                      ×{fmt(kills.top.n)}
                    </span>
                  </span>
                </div>
              )}
            </Card>

            <Card className="p-5 sm:col-span-2 lg:col-span-1">
              <div className="text-[11px] uppercase tracking-[0.14em] font-mono text-ink-3">
                Open and never fought
              </div>
              <div className="mt-1.5 font-mono tabular text-3xl font-bold text-ink leading-none">
                {loading ? <span className="text-ink-3">—</span> : untried.length}
              </div>
              {loading ? (
                <p className="mt-2 text-[11px] text-ink-3">
                  checking requirements…
                </p>
              ) : untried.length > 0 ? (
                <>
                  <p className="mt-2 text-[11px] text-ink-3">
                    gates already met with no kills on the board
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-ink-3">Easiest first</span>
                    {untried.slice(0, 3).map((b) => (
                      <Pill key={b.id} tone="success">
                        {b.name}
                      </Pill>
                    ))}
                  </div>
                </>
              ) : unlocked > 0 ? (
                <p className="mt-2 text-sm text-success">
                  Every open boss has kills logged.
                </p>
              ) : (
                <p className="mt-2 text-sm text-ink-2">
                  No gate is fully met yet — see what now, below.
                </p>
              )}
            </Card>
          </div>

          {/* Ranking the closest locked gates is the one thing on this page
              that is meaningless without quests, so it keeps a real pending
              state — and reserves its own height rather than shoving the
              ladder down when it lands. */}
          {(loading || nextUp.length > 0) && (
            <section aria-labelledby="next-up">
              <div className="flex items-baseline justify-between gap-3 mb-3">
                <h2
                  id="next-up"
                  className="font-display italic text-lg text-ink tracking-tight"
                >
                  What now
                </h2>
                <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-3">
                  closest locked gates
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {loading
                  ? [0, 1, 2].map((i) => (
                      <Skeleton key={i} className="h-[132px]" />
                    ))
                  : nextUp.map(({ item, gate: g }, i) => (
                      <NextUpCard
                        key={item.id}
                        boss={item}
                        gate={g}
                        rank={i + 1}
                      />
                    ))}
              </div>
            </section>
          )}

          {/* Sticky, and bled out to the gutters so cards scroll under it
              rather than beside it. Losing the filters 1,700px up the page was
              the single most expensive thing about this route. */}
          <div className="sticky top-14 z-20 -mx-4 px-4 sm:-mx-6 sm:px-6 md:-mx-8 md:px-8 bg-bg/95 backdrop-blur-md border-b border-line">
            <div className="flex flex-wrap items-center gap-2 py-2 min-h-[3.25rem]">
              <div className="flex items-center gap-2 min-w-0">
                {currentGroup ? (
                  <>
                    <TierBadge tier={currentGroup.tier} />
                    <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-3 whitespace-nowrap">
                      {loading
                        ? `${currentGroup.bosses.length} bosses`
                        : `${currentGroup.open} of ${currentGroup.bosses.length} open`}
                    </span>
                  </>
                ) : (
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-3 whitespace-nowrap">
                    {shown} of {BOSSES.length} shown
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => setFiltersOpen((v) => !v)}
                aria-expanded={filtersOpen}
                aria-controls="pvm-filters"
                className="lg:hidden ml-auto inline-flex items-center gap-2 h-11 px-3 rounded-lg border border-line text-ink-2 hover:text-ink hover:border-line-strong transition-colors font-mono text-[11px] uppercase tracking-wider max-w-[60%]"
              >
                <SlidersHorizontal size={14} aria-hidden="true" />
                <span className="truncate">
                  {activeFilters.length ? activeFilters.join(" · ") : "Filters"}
                </span>
                <ChevronDown
                  size={14}
                  aria-hidden="true"
                  className={clsx(
                    "shrink-0 transition-transform",
                    filtersOpen && "rotate-180",
                  )}
                />
              </button>

              {/* One filter row, hidden behind the disclosure on small screens
                  and always open from lg up. */}
              <div
                id="pvm-filters"
                className={clsx(
                  "w-full lg:w-auto lg:ml-auto flex-wrap items-center gap-2 pb-2 lg:pb-0",
                  filtersOpen ? "flex" : "hidden lg:flex",
                )}
              >
                <Segmented
                  size="sm"
                  ariaLabel="Difficulty tier"
                  value={tier}
                  onChange={setTier}
                  options={[
                    { value: "all" as const, label: "All", count: tierCounts.all },
                    ...TIERS.map((t) => ({
                      value: t,
                      label: TIER_LABEL[t],
                      count: tierCounts[t] ?? 0,
                    })),
                  ]}
                />
                <Segmented
                  size="sm"
                  ariaLabel="Group size"
                  value={group}
                  onChange={setGroup}
                  options={[
                    { value: "all", label: "Any" },
                    { value: "solo", label: "Solo" },
                    { value: "duo", label: "Duo" },
                    { value: "group", label: "Group" },
                  ]}
                />
                <button
                  type="button"
                  onClick={() => setReadyOnly((v) => !v)}
                  aria-pressed={readyOnly}
                  // "Ready" is the one filter that cannot answer honestly until
                  // the quest lists land — every gate reads locked until then.
                  disabled={loading}
                  title={loading ? "Waiting on quest data" : undefined}
                  className={clsx(
                    "inline-flex items-center gap-2 h-11 sm:h-8 px-3 rounded-lg border transition-colors",
                    "font-mono text-[11px] uppercase tracking-wider",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    readyOnly
                      ? "border-success/40 text-success bg-success/10"
                      : "border-line text-ink-3 hover:text-ink-2 hover:border-line-strong",
                  )}
                >
                  <CircleCheck size={14} aria-hidden="true" />
                  Ready only
                </button>
                {ladder.length > 1 && (
                  <button
                    type="button"
                    onClick={toggleAll}
                    className="inline-flex items-center gap-2 h-11 sm:h-8 px-3 rounded-lg border border-line text-ink-3 hover:text-ink-2 hover:border-line-strong transition-colors font-mono text-[11px] uppercase tracking-wider"
                  >
                    <ChevronDown
                      size={14}
                      aria-hidden="true"
                      className={clsx(
                        "transition-transform",
                        allExpanded && "rotate-180",
                      )}
                    />
                    {allExpanded ? "Fold all" : "Open all"}
                  </button>
                )}
              </div>
            </div>
          </div>

          {ladder.length === 0 ? (
            <div>
              <EmptyState
                title="Nothing matches those filters"
                hint={
                  readyOnly
                    ? "No boss in this slice has all its requirements met yet."
                    : "Try widening the tier or group filter."
                }
              />
            </div>
          ) : (
            <div ref={ladderRef} className="space-y-6">
              {ladder.map((g) => {
                const open = isOpen(g);
                const panelId = `tier-panel-${g.tier}`;
                return (
                  <section
                    key={g.tier}
                    data-tier={g.tier}
                    aria-labelledby={`tier-${g.tier}`}
                    className="scroll-mt-32"
                  >
                    <h2 id={`tier-${g.tier}`}>
                      <button
                        type="button"
                        onClick={() =>
                          setOverride((prev) => ({ ...prev, [g.tier]: !open }))
                        }
                        aria-expanded={open}
                        aria-controls={open ? panelId : undefined}
                        disabled={tier !== "all"}
                        className={clsx(
                          "w-full flex flex-wrap items-center gap-x-3 gap-y-1 text-left",
                          // These five toggles are the page's primary
                          // structural control and measured 38px on a phone.
                          // min-h rather than h so a wrapped heading still
                          // grows the target instead of spilling out of it.
                          "min-h-11 py-2 mb-3 border-b-2 transition-colors",
                          TIER_RULE[g.tier],
                          tier === "all" &&
                            "cursor-pointer hover:bg-bg-surface/60 rounded-t",
                        )}
                      >
                        {tier === "all" && (
                          <ChevronDown
                            size={18}
                            aria-hidden="true"
                            className={clsx(
                              "shrink-0 text-ink-3 transition-transform",
                              !open && "-rotate-90",
                            )}
                          />
                        )}
                        <span
                          className={clsx(
                            "font-display italic text-xl sm:text-2xl tracking-tight leading-none",
                            TIER_HEAD[g.tier],
                          )}
                        >
                          {TIER_LABEL[g.tier]}
                        </span>
                        <span className="font-mono tabular text-[11px] uppercase tracking-[0.14em] text-ink-2">
                          {loading
                            ? `${g.bosses.length} bosses`
                            : `${g.open} of ${g.bosses.length} open`}
                        </span>
                        {!open && (
                          <span className="ml-auto font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-3">
                            {g.bosses.length} folded
                          </span>
                        )}
                      </button>
                    </h2>
                    {open && (
                      <div
                        id={panelId}
                        className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3"
                      >
                        {g.bosses.map((b) => (
                          <BossCard
                            key={b.id}
                            boss={b}
                            gate={gates[b.id]}
                            accent={accent}
                            pending={loading}
                          />
                        ))}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          )}
        </PlayerScope>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

/**
 * Where the kill log actually lives. This used to read "· synced" with a green
 * check on every build, including the ones where no sync backend is configured
 * at all — telling the reader their hand-entered log was backed up when it was
 * one cache-clear from gone.
 */
function StorageNote() {
  const { remoteAvailable, syncState, syncCode } = useProgress();

  const state = !remoteAvailable
    ? { Icon: HardDrive, tone: "text-ink-3", text: "saved on this device" }
    : syncState === "synced"
      ? { Icon: CloudCheck, tone: "text-success", text: "synced across your devices" }
      : syncState === "syncing"
        ? { Icon: RefreshCw, tone: "text-prayer-bright", text: "syncing…" }
        : syncState === "error"
          ? { Icon: CloudOff, tone: "text-danger", text: "sync failed — saved on this device" }
          : syncCode
            ? { Icon: Cloud, tone: "text-ink-3", text: "saved on this device · sync pending" }
            : { Icon: Cloud, tone: "text-ink-3", text: "saved on this device · not linked" };

  const { Icon } = state;
  return (
    <div className="mt-2 flex items-start gap-1.5 text-[11px] text-ink-3">
      <Icon
        size={13}
        className={clsx("shrink-0 mt-px", state.tone)}
        aria-hidden="true"
      />
      <span>{state.text}</span>
    </div>
  );
}

function BossCard({
  boss,
  gate,
  accent,
  pending,
}: {
  boss: BossEntry;
  gate: GateResult;
  accent: Accent;
  /** Quest lists still loading — every gate below reads as locked, so don't. */
  pending: boolean;
}) {
  const progress = useProgress();
  const scope = usePlayerScope();
  // Read through the same scope CountInput writes to, or the pill would show
  // the account-wide number while the input edited the player's.
  const kc = progress.count(scopedKey(scope, kcKey(boss.name)));
  const locked = !pending && !gate.complete;

  return (
    <Card
      accent={locked ? undefined : accent}
      className={clsx(
        "p-4 flex flex-col gap-3",
        locked && "bg-bg-surface/50 gap-2.5",
      )}
    >
      <div className="flex items-start gap-3">
        {/* An unresolved gate is not 0% — it is unknown — so the pending ring
            is an empty track with a placeholder glyph rather than an arc. */}
        <Ring
          pct={pending ? 0 : gate.pct}
          size={44}
          stroke={4}
          accent={pending || locked ? "ash" : accent}
          label={
            pending
              ? `${boss.name}: requirements still loading`
              : `${Math.round(gate.pct)}% of ${boss.name}'s requirements met`
          }
        >
          {pending ? (
            <span
              className="font-mono text-[11px] font-bold text-ink-3"
              aria-hidden="true"
            >
              …
            </span>
          ) : undefined}
        </Ring>
        <div className="min-w-0 flex-1">
          {/* min-w-0 on the row and break-words on the name: without them a
              long boss name ("Raksha, the Shadow Colossus") establishes a
              minimum width that pushes the whole card past the viewport. */}
          <div className="flex min-w-0 items-center gap-1.5">
            {locked && (
              <Lock size={12} className="shrink-0 text-ink-faint" aria-hidden="true" />
            )}
            <a
              href={wikiUrl(boss.wiki)}
              target="_blank"
              rel="noopener noreferrer"
              className={clsx(
                "min-w-0 break-words text-sm font-medium hover:text-prayer-bright transition-colors",
                locked ? "text-ink-2" : "text-ink",
              )}
            >
              {boss.name}
            </a>
            <ExternalLink size={10} className="shrink-0 text-ink-faint" aria-hidden="true" />
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
            <TierBadge tier={boss.tier} />
            <span className="inline-flex items-center gap-1 font-mono text-[10.5px] uppercase tracking-wider text-ink-3">
              <Users size={11} aria-hidden="true" />
              {boss.group}
            </span>
            {boss.killTimeMin != null && (
              <span className="inline-flex items-center gap-1 font-mono tabular text-[10.5px] text-ink-3">
                <Timer size={11} aria-hidden="true" />
                {boss.killTimeMin}m
              </span>
            )}
            <StyleIcons styles={boss.style} />
          </div>
        </div>
        {kc > 0 && (
          <span className="shrink-0">
            <Pill tone="success">×{fmt(kc)}</Pill>
          </span>
        )}
      </div>

      <p className={clsx("text-xs leading-relaxed", locked ? "text-ink-3" : "text-ink-2")}>
        {boss.blurb}
      </p>

      {/* A locked boss's drop table is aspirational, so it gets two names
          instead of four — the card is 39 rows of the same shape and the
          requirement list is what you actually read on a locked one. */}
      <div className="flex flex-wrap gap-1.5">
        {boss.dropHighlights.slice(0, locked ? 2 : 4).map((d) => (
          <Pill key={d}>{d}</Pill>
        ))}
      </div>

      <div>
        {pending ? (
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
            Checking requirements…
          </p>
        ) : (
          <>
            {locked && (
              <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                Still needs
              </p>
            )}
            <ReqList results={gate.missing} limit={6} />
          </>
        )}
      </div>

      {/* Kill counts are the one thing the RS3 API cannot see, so the log gets
          its own lit panel rather than trailing the card as an afterthought.
          Locked bosses keep it: kc gates (Nex ×50 before Angel of Death) are
          fed by exactly this input. */}
      <div className="mt-auto rounded-md border border-line bg-bg-raised/40 px-3 py-1 lit-edge">
        <CountInput storeKey={kcKey(boss.name)} label={`${boss.name} kills`} />
      </div>
    </Card>
  );
}

function NextUpCard({
  boss,
  gate,
  rank,
}: {
  boss: BossEntry;
  gate: GateResult;
  rank: number;
}) {
  return (
    <Card accent="ash" className="p-4 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Ring
          pct={gate.pct}
          size={44}
          stroke={4}
          accent="ash"
          label={`${Math.round(gate.pct)}% of ${boss.name}'s gate met`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono text-[10px] text-ink-3 tabular">#{rank}</span>
            <a
              href={wikiUrl(boss.wiki)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-ink hover:text-ash-bright transition-colors min-w-0 truncate"
            >
              {boss.name}
            </a>
          </div>
          <div className="mt-1.5">
            <TierBadge tier={boss.tier} />
          </div>
        </div>
      </div>
      <ReqList results={gate.missing} limit={3} />
    </Card>
  );
}

function StyleIcons({ styles }: { styles?: BossEntry["style"] }) {
  if (!styles?.length) {
    return (
      <span className="font-mono text-[10.5px] uppercase tracking-wider text-ink-3">
        skilling
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1"
      role="img"
      aria-label={`Viable styles: ${styles.join(", ")}`}
    >
      {styles.map((s) => (
        <SkillIcon key={s} id={STYLE_SKILL[s]} size={14} />
      ))}
    </span>
  );
}

function LadderSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-[132px]" />
        ))}
      </div>
      <Skeleton className="h-6 w-32" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <Skeleton className="h-11 w-full max-w-md" />
      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-64" />
        ))}
      </div>
    </div>
  );
}
