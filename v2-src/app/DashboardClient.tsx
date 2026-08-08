"use client";

import Link from "next/link";
import { Fragment, useMemo } from "react";
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
  SkillIcon,
  TierBadge,
  skillName,
} from "@/components/ui";
import { usePlayerData, useQuests } from "@/components/PlayerDataProvider";
import { useEval } from "@/components/useEval";
import { MAJOR_GOALS, nextGoals, type MajorGoal } from "@/lib/content/goals";
import { fmt, fmtCompact } from "@/lib/format";
import { combineActivities, parseActivityDate } from "@/lib/player";
import { bottleneckSkills } from "@/lib/requirements";
import { SKILLS, xpForLevel } from "@/lib/skills";
import type { GateResult, PlayerSummary } from "@/lib/types";

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
  goal?: { item: MajorGoal; gate: GateResult };
}

export default function DashboardClient() {
  const { meta } = usePlayerData();
  const { players, contexts, loading } = useEval();

  const slugs = useMemo(() => players.map((p) => p.slug), [players]);
  const { quests } = useQuests(slugs);

  const questPoints = useMemo(() => {
    const out: Record<string, number> = {};
    for (const s of slugs) {
      out[s] = (quests[s] ?? []).reduce(
        (sum, q) => sum + (q.status === "COMPLETED" ? q.questPoints || 0 : 0),
        0,
      );
    }
    return out;
  }, [slugs, quests]);

  const combined = useMemo(
    () => ({
      xp: players.reduce((s, p) => s + p.totalXp, 0),
      quests: players.reduce((s, p) => s + p.questsDone, 0),
      level: players.reduce((s, p) => s + p.totalLevel, 0),
    }),
    [players],
  );

  // Goal proximity depends on the quest list, so it stays empty until quests
  // land — a half-loaded board would report every quest gate as missing.
  const boards = useMemo<Board[]>(() => {
    if (loading) return [];
    return players.map((p) => {
      const ctx = contexts[p.slug];
      if (!ctx) return { player: p, bottlenecks: [] };
      return {
        player: p,
        bottlenecks: bottleneckSkills(MAJOR_GOALS, ctx).slice(0, 3),
        goal: nextGoals(ctx, 1)[0],
      };
    });
  }, [players, contexts, loading]);

  const activity = useMemo(() => combineActivities(players).slice(0, 8), [players]);
  const lastChange = meta.lastChange || meta.timestamp;

  return (
    <div className="space-y-12">
      <Hero
        players={players}
        combined={combined}
        lastChange={lastChange}
      />

      <section>
        <SectionHead title="War Room" hint="Live snapshot" />
        <div className="grid gap-4 md:grid-cols-2">
          {players.map((p) => (
            <PlayerCard key={p.slug} player={p} />
          ))}
        </div>
      </section>

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
          <div className="grid gap-4 md:grid-cols-2">
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
          <div className="grid gap-4 md:grid-cols-2">
            {boards.map((b) => (
              <BoardCard key={b.player.slug} board={b} />
            ))}
          </div>
        )}
      </section>

      {players.length >= 2 && (
        <section>
          <SectionHead
            title="Head to head"
            hint={`${players[0].name} vs ${players[1].name}`}
          />
          <H2H a={players[0]} b={players[1]} questPoints={questPoints} />
        </section>
      )}

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
          <Card className="divide-y divide-line">
            {activity.map((a, i) => (
              <div key={`${a.player}-${a.date}-${i}`} className="px-4 py-3 flex gap-3">
                <span
                  aria-hidden="true"
                  className={clsx(
                    "mt-1.5 w-1.5 h-1.5 rounded-full shrink-0",
                    ACCENT_BG[a.accent],
                  )}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-3">
                    <span
                      className={clsx(
                        "font-mono text-[11px] uppercase tracking-wider",
                        ACCENT_TEXT[a.accent],
                      )}
                    >
                      {a.player}
                    </span>
                    <RelativeTime
                      date={parseActivityDate(a.date)}
                      className="font-mono text-[11px] text-ink-faint shrink-0"
                    />
                  </div>
                  <p className="text-sm text-ink mt-0.5">{a.text}</p>
                  {a.details && a.details !== a.text && (
                    <p className="text-[11px] text-ink-3 mt-0.5 line-clamp-2">
                      {a.details}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </Card>
        )}
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------

function Hero({
  players,
  combined,
  lastChange,
}: {
  players: PlayerSummary[];
  combined: { xp: number; quests: number; level: number };
  lastChange: string;
}) {
  return (
    <section className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-3 mb-2">
            Sexta Era · Sixth Age
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
        <Link
          href="/archive"
          className="inline-flex items-center gap-2 px-3 h-11 sm:h-9 rounded-md border border-line text-[11px] uppercase tracking-[0.14em] font-mono text-ink-3 hover:text-ink hover:border-line-strong transition-colors"
        >
          <Crown size={14} /> Fiorovizk
        </Link>
      </div>

      <div className="rounded-lg border border-line bg-bg-surface lit-edge p-5 sm:p-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">
          Combined total XP
        </p>
        <p
          className="font-mono tabular font-bold text-ink leading-none mt-2"
          style={{ fontSize: "clamp(40px, 11vw, 76px)" }}
        >
          {fmtCompact(combined.xp)}
        </p>
        <p className="mt-2 font-mono text-xs text-ink-3 tabular">
          {fmt(combined.xp)} xp
        </p>

        <div className="mt-6 pt-5 border-t border-line grid grid-cols-3 gap-3">
          <Stat label="Quests done" value={fmt(combined.quests)} />
          <Stat label="Total level" value={fmt(combined.level)} />
          <Stat
            label="Updated"
            value={<RelativeTime date={lastChange} />}
            accent="ash"
          />
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// War room
// ---------------------------------------------------------------------------

function PlayerCard({ player: p }: { player: PlayerSummary }) {
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

      <div className="mt-5 grid grid-cols-2 gap-4">
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
            <span className="font-mono text-[9.5px] uppercase tracking-wider text-ink-3 truncate max-w-full">
              {skillName(sk.id)}
            </span>
            <span
              className={clsx(
                "font-mono tabular text-lg font-bold leading-none",
                ACCENT_TEXT[p.accent],
              )}
            >
              {sk.level}
            </span>
          </li>
        ))}
      </ul>

      {last && (
        <div className="mt-5 pt-4 border-t border-line">
          <p className="text-sm text-ink-2">{last.text}</p>
          <RelativeTime
            date={parseActivityDate(last.date)}
            prefix="Last seen"
            className="mt-1 block font-mono text-[11px] uppercase tracking-wider text-ink-faint"
          />
        </div>
      )}
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

      {board.goal ? (
        <Link
          href="/goals"
          className="mt-3 flex items-start gap-3 p-3 rounded-md border border-line hover:border-line-strong hover:bg-bg-raised/40 transition-colors"
        >
          <Ring
            pct={board.goal.gate.pct}
            size={44}
            accent={p.accent}
            label={`${board.goal.item.name}: ${Math.round(board.goal.gate.pct)}% complete`}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-ink">{board.goal.item.name}</span>
              <TierBadge tier={board.goal.item.tier} />
            </div>
            <p className="mt-0.5 text-[11px] text-ink-3">{board.goal.item.blurb}</p>
            <div className="mt-2">
              <ReqList results={board.goal.gate.missing} limit={4} />
            </div>
          </div>
          <ChevronRight size={16} className="shrink-0 text-ink-faint mt-3" />
        </Link>
      ) : (
        <p className="mt-3 text-sm text-success">Every major goal is complete.</p>
      )}

      {board.bottlenecks.length > 0 && (
        <>
          <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
            Cheapest unlocks
          </p>
          <ul className="mt-1 divide-y divide-line">
            {board.bottlenecks.map((b) => (
              <Bottleneck key={`${b.skill}:${b.level}`} b={b} player={p} />
            ))}
          </ul>
        </>
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
// ---------------------------------------------------------------------------

function H2H({
  a,
  b,
  questPoints,
}: {
  a: PlayerSummary;
  b: PlayerSummary;
  questPoints: Record<string, number>;
}) {
  const rows: { label: string; a: number; b: number; fmtVal?: (n: number) => string }[] = [
    { label: "Total level", a: a.totalLevel, b: b.totalLevel },
    { label: "Combat", a: a.combatLevel, b: b.combatLevel },
    { label: "Total XP", a: a.totalXp, b: b.totalXp, fmtVal: fmtCompact },
    { label: "Quests", a: a.questsDone, b: b.questsDone },
    { label: "RuneScore", a: a.runeScore, b: b.runeScore },
    // Quest points come from the client-fetched quest lists, so both sides read
    // 0 until those land — the zero filter hides the row instead of lying.
    { label: "Quest points", a: questPoints[a.slug] ?? 0, b: questPoints[b.slug] ?? 0 },
  ].filter((r) => r.a !== 0 || r.b !== 0);

  if (!rows.length) return <Skeleton className="h-64 w-full" />;

  return (
    <Card>
      <ul className="divide-y divide-line">
        {rows.map((r) => {
          const show = r.fmtVal ?? fmt;
          const total = r.a + r.b;
          const shareA = total > 0 ? (r.a / total) * 100 : 50;
          const leader = r.a === r.b ? null : r.a > r.b ? a : b;
          const delta = Math.abs(r.a - r.b);

          return (
            <li key={r.label} className="px-4 py-3">
              <div className="flex items-baseline justify-between gap-2">
                <span
                  className={clsx(
                    "font-mono tabular text-sm",
                    leader === a ? ACCENT_TEXT[a.accent] : "text-ink-2",
                  )}
                >
                  {show(r.a)}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint text-center">
                  {r.label}
                </span>
                <span
                  className={clsx(
                    "font-mono tabular text-sm",
                    leader === b ? ACCENT_TEXT[b.accent] : "text-ink-2",
                  )}
                >
                  {show(r.b)}
                </span>
              </div>

              <div className="mt-2 flex h-1.5 w-full rounded-full overflow-hidden bg-bg-raised">
                <div
                  className={clsx("h-full", ACCENT_BG[a.accent])}
                  style={{ width: `${shareA}%` }}
                />
                <div
                  className={clsx("h-full flex-1", ACCENT_BG[b.accent])}
                />
              </div>

              <p className="mt-1.5 text-center font-mono text-[10px] uppercase tracking-wider text-ink-3">
                {leader ? `${leader.name} +${show(delta)}` : "Dead even"}
              </p>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
