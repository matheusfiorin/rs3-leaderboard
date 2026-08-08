"use client";

import Link from "next/link";
import { Fragment, useMemo, useState } from "react";
import { ArrowRight, ChevronRight, Crown } from "lucide-react";
import { clsx } from "clsx";
import {
  Card,
  EmptyState,
  Pill,
  SectionHead,
  Skeleton,
  Stat,
} from "@/components/primitives";
import {
  ACCENT_BG,
  ACCENT_TEXT,
  Meter,
  RelativeTime,
  ReqList,
  Ring,
  Segmented,
  SkillIcon,
  TierBadge,
  skillName,
} from "@/components/ui";
import { usePlayerData } from "@/components/PlayerDataProvider";
import { useEval } from "@/components/useEval";
import { MAJOR_GOALS, nextGoals, type MajorGoal } from "@/lib/content/goals";
import { fmt, fmtCompact } from "@/lib/format";
import {
  combineActivities,
  parseActivityDate,
  type ActivityCategory,
  type CombinedActivity,
} from "@/lib/player";
import { bottleneckSkills } from "@/lib/requirements";
import { SKILLS, xpForLevel } from "@/lib/skills";
import type { Accent, GateResult, PlayerSummary } from "@/lib/types";

/** Highest-levelled skills, ties broken by XP so 99/99/99 still orders. */
export function topSkills(p: PlayerSummary, n = 3) {
  return SKILLS.map((s) => ({
    id: s.id,
    level: p.skills[s.id]?.level ?? 1,
    xp: p.skills[s.id]?.xp ?? 0,
  }))
    .sort((a, b) => b.level - a.level || b.xp - a.xp)
    .slice(0, n);
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

interface Board {
  player: PlayerSummary;
  bottlenecks: ReturnType<typeof bottleneckSkills>;
  goals: { item: MajorGoal; gate: GateResult }[];
}

// ---------------------------------------------------------------------------
// The scoreline
//
// One comparison table, derived once and shared by the hero verdict and the
// full Head-to-head grid. Two copies of this arithmetic is how a page ends up
// claiming one winner up top and a different one further down.
// ---------------------------------------------------------------------------

interface Metric {
  label: string;
  /** Short form for the hero's delta chips. */
  unit: string;
  a: number;
  b: number;
  show: (n: number) => string;
}

interface Scoreline {
  metrics: Metric[];
  leader: PlayerSummary | null;
  trailer: PlayerSummary | null;
  leaderWins: number;
  trailerWins: number;
  /** Metric label -> signed delta, from a's point of view. */
  deltaFor(label: string, side: "a" | "b"): number;
}

function useScoreline(
  a: PlayerSummary | undefined,
  b: PlayerSummary | undefined,
  questPoints: Record<string, number>,
): Scoreline | null {
  return useMemo(() => {
    if (!a || !b) return null;

    const metrics: Metric[] = [
      { label: "Total level", unit: "total level", a: a.totalLevel, b: b.totalLevel, show: fmt },
      { label: "Combat", unit: "combat", a: a.combatLevel, b: b.combatLevel, show: fmt },
      { label: "Total XP", unit: "xp", a: a.totalXp, b: b.totalXp, show: fmtCompact },
      { label: "Quests", unit: "quests", a: a.questsDone, b: b.questsDone, show: fmt },
      { label: "RuneScore", unit: "runescore", a: a.runeScore, b: b.runeScore, show: fmt },
      // Quest points come from the client-fetched quest lists, so both sides
      // read 0 until those land — the zero filter drops the row instead of
      // reporting a tie that does not exist.
      {
        label: "Quest points",
        unit: "quest points",
        a: questPoints[a.slug] ?? 0,
        b: questPoints[b.slug] ?? 0,
        show: fmt,
      },
    ].filter((m) => m.a !== 0 || m.b !== 0);

    let aWins = 0;
    let bWins = 0;
    for (const m of metrics) {
      if (m.a > m.b) aWins++;
      else if (m.b > m.a) bWins++;
    }

    const tied = aWins === bWins;
    return {
      metrics,
      leader: tied ? null : aWins > bWins ? a : b,
      trailer: tied ? null : aWins > bWins ? b : a,
      leaderWins: Math.max(aWins, bWins),
      trailerWins: Math.min(aWins, bWins),
      deltaFor: (label, side) => {
        const m = metrics.find((x) => x.label === label);
        if (!m) return 0;
        return side === "a" ? m.a - m.b : m.b - m.a;
      },
    };
  }, [a, b, questPoints]);
}

export default function DashboardClient() {
  const { meta, setSelected } = usePlayerData();
  const { players, contexts, loading } = useEval();

  // Quest points already ride along on the eval contexts — they are summed from
  // the same quest lists the goal gates need. Re-summing them here meant a
  // second pass over 44 KB of quest JSON per player and, worse, a second place
  // for the number to disagree with the rest of the app.
  const questPoints = useMemo(() => {
    const out: Record<string, number> = {};
    for (const p of players) out[p.slug] = contexts[p.slug]?.questPoints ?? 0;
    return out;
  }, [players, contexts]);

  const scoreline = useScoreline(players[0], players[1], questPoints);
  const combinedXp = useMemo(
    () => players.reduce((s, p) => s + p.totalXp, 0),
    [players],
  );

  // Goal proximity depends on the quest list, so it stays empty until quests
  // land — a half-loaded board would report every quest gate as missing.
  const boards = useMemo<Board[]>(() => {
    if (loading) return [];
    return players.map((p) => {
      const ctx = contexts[p.slug];
      if (!ctx) return { player: p, bottlenecks: [], goals: [] };
      return {
        player: p,
        bottlenecks: bottleneckSkills(MAJOR_GOALS, ctx).slice(0, 3),
        goals: nextGoals(ctx, 2),
      };
    });
  }, [players, contexts, loading]);

  const activity = useMemo(() => combineActivities(players), [players]);
  const lastChange = meta.lastChange || meta.timestamp;

  return (
    <div className="space-y-12">
      <Hero
        players={players}
        scoreline={scoreline}
        combinedXp={combinedXp}
        lastChange={lastChange}
        onFocus={setSelected}
      />

      {/* "What do I do next" outranks the roster snapshot, so the board comes
          first. Head-to-head detail sits below the hero verdict that summarises
          it rather than three screens down with nothing above it. */}
      <section>
        <SectionHead
          title="Tonight's board"
          hint="Cheapest levels, biggest unlocks"
          right={
            <Link
              href="/goals"
              className="inline-flex items-center gap-1 h-9 px-2 -mr-2 font-mono text-[11px] uppercase tracking-wider text-ink-3 hover:text-ink transition-colors"
            >
              Goals <ArrowRight size={12} />
            </Link>
          }
        />
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 items-start">
            {Array.from({ length: Math.max(players.length, 2) }).map((_, i) => (
              <Card key={i} className="p-5 space-y-4">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </Card>
            ))}
          </div>
        ) : (
          // items-start: stretched grid rows made the player with fewer level
          // gates render ~260px of empty bordered card next to a full one.
          <div className="grid gap-4 md:grid-cols-2 items-start">
            {boards.map((b) => (
              <BoardCard key={b.player.slug} board={b} />
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionHead title="War Room" hint="Live snapshot" />
        <div className="grid gap-4 md:grid-cols-2 items-start">
          {players.map((p) => (
            <PlayerCard key={p.slug} player={p} onFocus={setSelected} />
          ))}
        </div>
      </section>

      {scoreline && players.length >= 2 && (
        <section>
          <SectionHead
            title="Head to head"
            hint={`${players[0].name} vs ${players[1].name}`}
          />
          <H2H a={players[0]} b={players[1]} scoreline={scoreline} />
        </section>
      )}

      <Ticker activity={activity} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hero — the five-second sell: who is ahead, by how much, per player
// ---------------------------------------------------------------------------

/** The three numbers a player is actually described by. Never a cross-player sum. */
const HERO_METRICS = ["Total level", "Total XP", "Quests"] as const;

function Hero({
  players,
  scoreline,
  combinedXp,
  lastChange,
  onFocus,
}: {
  players: PlayerSummary[];
  scoreline: Scoreline | null;
  combinedXp: number;
  lastChange: string;
  onFocus(slug: string): void;
}) {
  return (
    <section className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-3 mb-2">
            Sexta Era · Sixth Age
            <span aria-hidden="true" className="mx-1.5 text-ink-faint">
              ·
            </span>
            {/* Moved out of the stat grid: it is metadata about the page, not a
                number to compare, and at 360px it was stealing a third column. */}
            <RelativeTime date={lastChange} prefix="updated" />
          </p>
          {/* Flex + wrap rather than inline spans: at 360px "Decxus / Soclopata"
              has no break opportunity as inline text and pushes the page wide. */}
          <h1 className="font-display text-4xl sm:text-5xl tracking-tight leading-none flex flex-wrap items-baseline gap-x-2 sm:gap-x-3">
            {players.map((p, i) => (
              <Fragment key={p.slug}>
                {i > 0 && (
                  <span className="text-ink-3" aria-hidden="true">
                    /
                  </span>
                )}
                <span className={clsx("italic", ACCENT_TEXT[p.accent])}>
                  {p.name}
                </span>
              </Fragment>
            ))}
          </h1>
        </div>
        {/* Was an unlabelled crowned badge that looked like a third tracked
            player. It is a link to the memorial, so it says so. */}
        <Link
          href="/archive"
          className="inline-flex items-center gap-2 px-3 h-11 sm:h-9 rounded-md border border-line text-[11px] uppercase tracking-[0.14em] font-mono text-ink-3 hover:text-ink hover:border-line-strong transition-colors"
        >
          <Crown size={14} className="text-ash-bright" />
          <span>In Memoriam</span>
          <span className="text-ash-bright">Fiorovizk</span>
          <ArrowRight size={12} aria-hidden="true" />
        </Link>
      </div>

      <div className="rounded-lg border border-line bg-bg-surface lit-edge p-5 sm:p-6 grid gap-6 lg:grid-cols-[minmax(0,19rem)_1fr] lg:gap-10 lg:items-start">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">
            Scoreline
          </p>
          {scoreline?.leader && scoreline.trailer ? (
            <>
              <p
                className={clsx(
                  "mt-1.5 font-display italic leading-none tracking-tight",
                  ACCENT_TEXT[scoreline.leader.accent],
                )}
                style={{ fontSize: "clamp(34px, 8.5vw, 52px)" }}
              >
                {scoreline.leader.name}
              </p>
              <p className="mt-2 font-mono text-[13px] text-ink-2">
                leads{" "}
                <span className="tabular font-bold text-ink">
                  {scoreline.leaderWins}–{scoreline.trailerWins}
                </span>{" "}
                of {scoreline.metrics.length} categories
              </p>
              {/* "By how much", in the leader's own accent. Only the metrics
                  the leader actually leads, so a chip never needs a second name
                  to disambiguate it. */}
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {scoreline.metrics
                  .filter(
                    (m) =>
                      m.a !== m.b &&
                      (m.a > m.b ? players[0] : players[1]) === scoreline.leader,
                  )
                  .slice(0, 3)
                  .map((m) => (
                    <li key={m.label}>
                      <Pill tone={scoreline.leader!.accent}>
                        +{m.show(Math.abs(m.a - m.b))} {m.unit}
                      </Pill>
                    </li>
                  ))}
              </ul>
            </>
          ) : players.length < 2 ? (
            // One tracked account has no scoreline. Saying "Dead even" here
            // would be a verdict on a race that is not being run.
            <p className="mt-1.5 font-display italic text-3xl text-ink leading-none">
              {players[0]?.name ?? "No accounts tracked"}
            </p>
          ) : (
            <p className="mt-1.5 font-display italic text-3xl text-ink leading-none">
              Dead even
            </p>
          )}
          <p className="mt-4 pt-3 border-t border-line font-mono text-[11px] text-ink-3 tabular">
            {fmt(combinedXp)} xp tracked{players.length > 1 ? " between them" : ""}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:gap-x-6">
          {players.map((p, i) => (
            <HeroPlayer
              key={p.slug}
              player={p}
              side={i === 0 ? "a" : "b"}
              scoreline={scoreline}
              onFocus={onFocus}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function HeroPlayer({
  player: p,
  side,
  scoreline,
  onFocus,
}: {
  player: PlayerSummary;
  side: "a" | "b";
  scoreline: Scoreline | null;
  onFocus(slug: string): void;
}) {
  const values: Record<(typeof HERO_METRICS)[number], string> = {
    "Total level": fmt(p.totalLevel),
    "Total XP": fmtCompact(p.totalXp),
    Quests: fmt(p.questsDone),
  };
  const shows: Record<(typeof HERO_METRICS)[number], (n: number) => string> = {
    "Total level": fmt,
    "Total XP": fmtCompact,
    Quests: fmt,
  };

  return (
    <div>
      {/* Selecting here seeds the shared, persisted player choice, so the
          per-player pages open on whoever you just looked at. */}
      <Link
        href="/skills"
        onClick={() => onFocus(p.slug)}
        className={clsx(
          "inline-flex items-baseline gap-1 font-mono text-[11px] uppercase tracking-[0.14em] hover:underline decoration-line-strong underline-offset-4",
          ACCENT_TEXT[p.accent],
        )}
      >
        {p.name}
        <ChevronRight size={12} aria-hidden="true" />
      </Link>
      {/* Stacked while the band is narrow, one stat row per player from xl up:
          at 1280px+ each player's half of the hero is ~400px, so three stats
          side by side fill the band instead of leaving it empty to the right. */}
      <div className="mt-2 grid gap-x-4 gap-y-3 xl:grid-cols-3">
        {HERO_METRICS.map((label) => {
          const delta = scoreline ? scoreline.deltaFor(label, side) : 0;
          const ahead = delta > 0;
          return (
            <Stat
              key={label}
              label={label}
              value={values[label]}
              accent={ahead ? p.accent : undefined}
              hint={
                scoreline && delta !== 0 ? (
                  <span
                    className={clsx(
                      "font-mono tabular",
                      ahead ? ACCENT_TEXT[p.accent] : "text-ink-3",
                    )}
                  >
                    {/* "+1,279" on its own is read out as a gain rather than as
                        a margin over the other account. */}
                    <span className="sr-only">
                      {ahead ? "ahead by " : "behind by "}
                    </span>
                    <span aria-hidden="true">{ahead ? "+" : "−"}</span>
                    {shows[label](Math.abs(delta))}
                  </span>
                ) : undefined
              }
            />
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// War room
// ---------------------------------------------------------------------------

function PlayerCard({
  player: p,
  onFocus,
}: {
  player: PlayerSummary;
  onFocus(slug: string): void;
}) {
  const last = p.activities[0];
  const questPct = p.totalQuests > 0 ? (p.questsDone / p.totalQuests) * 100 : 0;

  return (
    <Card accent={p.accent} className="p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h3
          className={clsx(
            "font-display italic text-3xl tracking-tight truncate",
            ACCENT_TEXT[p.accent],
          )}
        >
          {p.name}
        </h3>
        <span className="font-mono text-[11px] uppercase tracking-wider text-ink-3 shrink-0 tabular">
          Rank {p.rank || "—"}
        </span>
      </div>

      {/* xl:grid-cols-4 — at 1280px+ the card is ~600px wide, so four stats sit
          in one row and the card stops being twice as tall as it needs to be. */}
      <div className="mt-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat label="Total level" value={fmt(p.totalLevel)} accent={p.accent} />
        <Stat label="Combat" value={fmt(p.combatLevel)} accent={p.accent} />
        <Stat label="Total XP" value={fmtCompact(p.totalXp)} />
        <Stat label="RuneScore" value={fmt(p.runeScore)} />
      </div>

      <div className="mt-5">
        <Meter
          label="Quests"
          value={`${p.questsDone} / ${p.totalQuests}`}
          pct={questPct}
          accent={p.accent}
        />
      </div>

      <ul className="mt-5 grid grid-cols-3 gap-2">
        {topSkills(p).map((sk) => (
          <li
            key={sk.id}
            className="bg-bg-raised rounded-md py-2 px-1 flex flex-col items-center gap-1"
          >
            <SkillIcon id={sk.id} size={18} />
            {/* Wraps rather than truncates — "Constitutio…" names nothing. The
                level is pushed to the bottom so a two-line name in one cell
                does not drop that cell's number below its neighbours. */}
            <span className="font-mono text-[9.5px] uppercase tracking-wider text-ink-3 text-center leading-tight break-words">
              {skillName(sk.id)}
            </span>
            <span
              className={clsx(
                "mt-auto font-mono tabular text-lg font-bold leading-none",
                ACCENT_TEXT[p.accent],
              )}
            >
              {sk.level}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-5 pt-4 border-t border-line flex items-end justify-between gap-3">
        <div className="min-w-0">
          {last ? (
            <>
              <p className="text-sm text-ink-2">{last.text}</p>
              <RelativeTime
                date={parseActivityDate(last.date)}
                prefix="Last seen"
                className="mt-1 block font-mono text-[11px] uppercase tracking-wider text-ink-3"
              />
            </>
          ) : (
            <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">
              No recent adventures
            </p>
          )}
        </div>
        <Link
          href="/skills"
          onClick={() => onFocus(p.slug)}
          className="shrink-0 inline-flex items-center gap-1 h-9 px-2 -mr-2 font-mono text-[11px] uppercase tracking-wider text-ink-3 hover:text-ink transition-colors"
        >
          Skills <ArrowRight size={12} />
        </Link>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Tonight's board
// ---------------------------------------------------------------------------

function BoardCard({ board }: { board: Board }) {
  const p = board.player;
  return (
    <Card accent={p.accent} className="p-5">
      <h3
        className={clsx(
          "font-mono text-[11px] uppercase tracking-[0.14em]",
          ACCENT_TEXT[p.accent],
        )}
      >
        {p.name}
      </h3>

      {board.goals.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {/* The row is not one big anchor any more: ReqList's "+N more" is a
              real button, and a button inside an <a> is invalid markup that
              navigates to /goals the moment you try to expand the list. Only
              the goal name links out. */}
          {board.goals.map((g) => (
            <li
              key={g.item.id}
              className="flex items-start gap-3 p-3 rounded-md border border-line"
            >
              <Ring
                pct={g.gate.pct}
                size={44}
                accent={p.accent}
                label={`${g.item.name}: ${Math.round(g.gate.pct)}% complete`}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link
                    href="/goals"
                    className="inline-flex items-center gap-0.5 text-sm text-ink hover:underline decoration-line-strong underline-offset-4"
                  >
                    {g.item.name}
                    <ChevronRight
                      size={14}
                      className="text-ink-3"
                      aria-hidden="true"
                    />
                  </Link>
                  <TierBadge tier={g.item.tier} />
                </div>
                <p className="mt-0.5 text-[11px] text-ink-3">{g.item.blurb}</p>
                <div className="mt-2">
                  <ReqList results={g.gate.missing} limit={4} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-success">Every major goal is complete.</p>
      )}

      <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-3">
        Cheapest unlocks
      </p>
      {board.bottlenecks.length > 0 ? (
        <ul className="mt-1 divide-y divide-line">
          {board.bottlenecks.map((b) => (
            <Bottleneck key={`${b.skill}:${b.level}`} b={b} player={p} />
          ))}
        </ul>
      ) : (
        // An empty region used to render as blank bordered space, which read as
        // a rendering bug rather than as "there is nothing here".
        <p className="mt-1 text-[12px] text-ink-3">
          No skill level unlocks a goal for {p.name} right now — what is left is
          quests, items and bosses.{" "}
          <Link href="/quests" className="text-ink-2 underline decoration-line-strong underline-offset-2 hover:text-ink">
            Quest log
          </Link>
        </p>
      )}
    </Card>
  );
}

function Bottleneck({
  b,
  player,
}: {
  b: { skill: number; level: number; unlocks: number; gap: number };
  player: PlayerSummary;
}) {
  const xp = player.skills[b.skill]?.xp ?? 0;
  const target = xpForLevel(b.level);
  const remaining = Math.max(0, target - xp);
  const pct = target > 0 ? Math.min(100, (xp / target) * 100) : 0;

  return (
    <li className="py-3">
      <div className="flex items-center gap-2.5">
        <SkillIcon id={b.skill} size={18} />
        <span className="text-sm text-ink truncate">
          {skillName(b.skill)} {b.level}
        </span>
        <span className="ml-auto shrink-0">
          <Pill tone={player.accent}>
            {plural(b.unlocks, "goal")}
          </Pill>
        </span>
      </div>
      <div className="mt-2">
        <Meter
          label={`+${plural(b.gap, "level")}`}
          value={`${fmtCompact(remaining)} xp`}
          pct={pct}
          accent={player.accent}
          tone="muted"
        />
      </div>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Head to head
//
// One card per metric rather than one full-width row per metric: at 1152px the
// old rows threw a label and two values to opposite edges with 900px of nothing
// between them. Cards keep the measure short and use the width.
// ---------------------------------------------------------------------------

function H2H({
  a,
  b,
  scoreline,
}: {
  a: PlayerSummary;
  b: PlayerSummary;
  scoreline: Scoreline;
}) {
  if (!scoreline.metrics.length) return <Skeleton className="h-64 w-full" />;

  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 items-start">
      {scoreline.metrics.map((m) => {
        const total = m.a + m.b;
        const shareA = total > 0 ? (m.a / total) * 100 : 50;
        const leader = m.a === m.b ? null : m.a > m.b ? a : b;
        const delta = Math.abs(m.a - m.b);

        return (
          <li key={m.label}>
            <Card className="p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">
                {m.label}
              </p>
              <div className="mt-2 flex items-baseline justify-between gap-3">
                <Side player={a} value={m.show(m.a)} leading={leader === a} />
                <Side player={b} value={m.show(m.b)} leading={leader === b} align="right" />
              </div>

              <div className="mt-2.5 flex h-1.5 w-full rounded-full overflow-hidden bg-bg-raised">
                <div
                  className={clsx("h-full", ACCENT_BG[a.accent])}
                  style={{ width: `${shareA}%` }}
                />
                <div className={clsx("h-full flex-1", ACCENT_BG[b.accent])} />
              </div>

              <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-ink-3">
                {leader ? `${leader.name} +${m.show(delta)}` : "Dead even"}
              </p>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}

function Side({
  player,
  value,
  leading,
  align = "left",
}: {
  player: PlayerSummary;
  value: string;
  leading: boolean;
  align?: "left" | "right";
}) {
  return (
    <div className={clsx("min-w-0", align === "right" && "text-right")}>
      <p
        className={clsx(
          "font-mono text-[10px] uppercase tracking-wider truncate",
          leading ? ACCENT_TEXT[player.accent] : "text-ink-3",
        )}
      >
        {player.name}
      </p>
      <p
        className={clsx(
          "font-mono tabular text-lg font-bold leading-tight",
          leading ? ACCENT_TEXT[player.accent] : "text-ink-2",
        )}
      >
        {value}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Activity ticker
//
// RuneMetrics sends every level-up twice: a title ("Levelled up Necromancy.")
// and a description that repeats it and adds the one new fact (the level). The
// ticker used to print both, so seven rows said four things. Level-ups collapse
// to "Necromancy 67", consecutive ones on the same skill merge into a range,
// and rows are grouped under one day header instead of stamping "1d ago" on
// every line.
// ---------------------------------------------------------------------------

const LEVEL_DETAIL = /I levelled my (.+?) skill, I am now level (\d+)/i;
const CLOCK = /(\d{2}:\d{2})/;

const CATEGORY_LABEL: Record<ActivityCategory, string> = {
  level: "Levels",
  quest: "Quests",
  boss: "Kills",
  drop: "Finds",
  other: "Milestones",
};

const CATEGORY_ORDER: ActivityCategory[] = ["level", "quest", "boss", "drop", "other"];

interface Row {
  key: string;
  player: string;
  accent: Accent;
  time: string;
  skill?: number;
  skillLabel?: string;
  /** Lowest level of a merged run, when more than one level-up collapsed. */
  from?: number;
  level?: number;
  /** Non-level events keep RuneMetrics' own title. */
  text?: string;
  detail?: string;
}

/** One line, built from the fields rather than by rewriting a string in place —
 *  a run of three level-ups has to keep collapsing correctly. */
function headlineOf(r: Row): string {
  if (r.level != null && r.skillLabel) {
    return r.from != null
      ? `${r.skillLabel} ${r.from} → ${r.level}`
      : `${r.skillLabel} ${r.level}`;
  }
  return r.text ?? "";
}

interface DayGroup {
  day: string;
  date: Date | null;
  rows: Row[];
}

function skillIdByName(name: string): number | undefined {
  const key = name.trim().toLowerCase();
  return SKILLS.find((s) => s.key.toLowerCase() === key)?.id;
}

function toRow(a: CombinedActivity, i: number): Row {
  const time = a.date?.match(CLOCK)?.[1] ?? "";
  const base = {
    key: `${a.player}-${a.date}-${i}`,
    player: a.player,
    accent: a.accent,
    time,
  };

  const m = (a.details ?? "").match(LEVEL_DETAIL);
  if (a.category === "level" && m) {
    return {
      ...base,
      skill: skillIdByName(m[1]),
      skillLabel: m[1],
      level: Number(m[2]),
      // The description is the title restated, so it is dropped entirely.
    };
  }

  return {
    ...base,
    text: a.text,
    detail: a.details && a.details !== a.text ? a.details : undefined,
  };
}

/** Group by calendar day, then merge adjacent same-skill level-ups per player. */
function groupActivity(list: CombinedActivity[]): DayGroup[] {
  const groups: DayGroup[] = [];
  list.forEach((a, i) => {
    const day = (a.date ?? "").slice(0, 11);
    let g = groups[groups.length - 1];
    if (!g || g.day !== day) {
      g = { day, date: parseActivityDate(a.date), rows: [] };
      groups.push(g);
    }
    const row = toRow(a, i);
    const prev = g.rows[g.rows.length - 1];
    if (
      prev &&
      prev.level != null &&
      row.level != null &&
      // Compare the parsed name, not the resolved icon id: two unrecognised
      // skills both resolve to `undefined` and would merge into each other.
      prev.skillLabel === row.skillLabel &&
      prev.player === row.player &&
      row.level < prev.level
    ) {
      // Newest first, so `prev` holds the higher level: widen its range.
      prev.from = row.level;
      return;
    }
    g.rows.push(row);
  });
  return groups;
}

function Ticker({ activity }: { activity: CombinedActivity[] }) {
  const [cat, setCat] = useState<ActivityCategory | "all">("all");

  const counts = useMemo(() => {
    const out: Record<string, number> = {};
    for (const a of activity) out[a.category] = (out[a.category] ?? 0) + 1;
    return out;
  }, [activity]);

  const options = useMemo(
    () => [
      { value: "all" as const, label: "All", count: activity.length },
      ...CATEGORY_ORDER.filter((c) => (counts[c] ?? 0) > 0).map((c) => ({
        value: c,
        label: CATEGORY_LABEL[c],
        count: counts[c],
      })),
    ],
    [activity.length, counts],
  );

  const groups = useMemo(() => {
    const filtered = cat === "all" ? activity : activity.filter((a) => a.category === cat);
    return groupActivity(filtered.slice(0, 14));
  }, [activity, cat]);

  return (
    <section>
      <SectionHead
        title="Activity ticker"
        hint="Newest first"
        right={
          <Link
            href="/activity"
            className="inline-flex items-center gap-1 h-9 px-2 -mr-2 font-mono text-[11px] uppercase tracking-wider text-ink-3 hover:text-ink transition-colors"
          >
            All <ArrowRight size={12} />
          </Link>
        }
      />

      {activity.length === 0 ? (
        <EmptyState
          title="Nothing logged yet"
          hint="RuneMetrics has no recent adventures for either account."
        />
      ) : (
        <>
          <div className="mb-4 -mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto">
            <Segmented
              options={options}
              value={cat}
              onChange={setCat}
              size="sm"
              ariaLabel="Filter activity by kind"
            />
          </div>

          {groups.length === 0 ? (
            <EmptyState title="Nothing of that kind yet" />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 items-start">
              {/* Index in the key: activities with an unparseable date all sort
                  to the end with ts 0, where two day labels can interleave and
                  repeat. Duplicate keys there would drop rows. */}
              {groups.map((g, gi) => (
                <Card key={`${g.day}-${gi}`} className="p-4">
                  <div className="flex items-baseline justify-between gap-3 pb-2 border-b border-line">
                    <h3 className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-2">
                      {g.day.replace(/-/g, " ").replace(/\s\d{4}$/, "")}
                    </h3>
                    <RelativeTime
                      date={g.date}
                      className="font-mono text-[10px] uppercase tracking-wider text-ink-3 shrink-0"
                    />
                  </div>
                  <ul className="divide-y divide-line">
                    {g.rows.map((r) => (
                      <li key={r.key} className="py-2.5 flex gap-2.5">
                        <span className="font-mono text-[10px] tabular text-ink-3 shrink-0 pt-0.5 w-9">
                          {r.time}
                        </span>
                        {r.skill != null ? (
                          <SkillIcon id={r.skill} size={16} className="shrink-0 mt-0.5" />
                        ) : (
                          <span
                            aria-hidden="true"
                            className={clsx(
                              "mt-1.5 w-1.5 h-1.5 rounded-full shrink-0",
                              ACCENT_BG[r.accent],
                            )}
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-ink">
                            {headlineOf(r)}
                            <span
                              className={clsx(
                                "ml-2 font-mono text-[10px] uppercase tracking-wider",
                                ACCENT_TEXT[r.accent],
                              )}
                            >
                              {r.player}
                            </span>
                          </p>
                          {r.detail && (
                            <p className="text-[11px] text-ink-3 mt-0.5 line-clamp-2">
                              {r.detail}
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
