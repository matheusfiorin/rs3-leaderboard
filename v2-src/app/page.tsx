import Link from "next/link";
import { ArrowRight, Crown } from "lucide-react";
import {
  Bar,
  Card,
  Pill,
  SectionHead,
  Stat,
} from "@/components/primitives";
import {
  combineActivities,
  loadMeta,
  loadTrackedPlayers,
  PLAYERS,
  parseActivityDate,
} from "@/lib/data";
import { fmt, fmtCompact, fmtRelative } from "@/lib/format";
import { SKILLS, xpToNext } from "@/lib/skills";
import type { Player } from "@/lib/types";

export default async function DashboardPage() {
  const [players, meta] = await Promise.all([
    loadTrackedPlayers(),
    loadMeta(),
  ]);
  const activity = combineActivities(players).slice(0, 8);
  const lastChange = new Date(meta.lastChange || meta.timestamp);

  return (
    <div className="space-y-10">
      <Hero meta={meta} lastChange={lastChange} players={players} />

      <section>
        <SectionHead
          title="War Room"
          hint="Live snapshot"
          right={
            <Pill tone="neutral">
              Updated {fmtRelative(lastChange)}
            </Pill>
          }
        />
        <div className="grid gap-4 md:grid-cols-2">
          {players.map((p) => (
            <PlayerCard key={p.slug} player={p} />
          ))}
        </div>
      </section>

      <section>
        <SectionHead
          title="Head to head"
          hint={`${PLAYERS[0].name} vs ${PLAYERS[1].name}`}
        />
        <H2H players={players} />
      </section>

      <section>
        <SectionHead
          title="Activity ticker"
          hint="Newest first"
          right={
            <Link
              href="/activity"
              className="text-xs text-ink-3 hover:text-ink inline-flex items-center gap-1 font-mono uppercase tracking-wider"
            >
              All <ArrowRight size={12} />
            </Link>
          }
        />
        <Card className="divide-y divide-line">
          {activity.length === 0 ? (
            <div className="p-6 text-center text-ink-3 text-sm">
              No recent activity recorded.
            </div>
          ) : (
            activity.map((a, i) => (
              <div key={i} className="px-4 py-3 flex items-start gap-3">
                <span
                  className={
                    a.accent === "soul"
                      ? "mt-1.5 w-1.5 h-1.5 rounded-full bg-soul"
                      : "mt-1.5 w-1.5 h-1.5 rounded-full bg-prayer"
                  }
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-mono text-[11px] text-ink-3 uppercase tracking-wider">
                      {a.player}
                    </span>
                    <span className="font-mono text-[11px] text-ink-faint">
                      {a.date}
                    </span>
                  </div>
                  <div className="text-sm text-ink mt-0.5 truncate">{a.text}</div>
                </div>
              </div>
            ))
          )}
        </Card>
      </section>
    </div>
  );
}

function Hero({
  meta,
  lastChange,
  players,
}: {
  meta: { timestamp: string };
  lastChange: Date;
  players: Player[];
}) {
  const combinedXp = players.reduce((s, p) => s + p.totalXp, 0);
  const combinedQuests = players.reduce((s, p) => s + p.questsDone, 0);
  return (
    <section className="relative">
      <div className="space-y-6">
        <div className="flex items-baseline justify-between flex-wrap gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-3 mb-2">
              Sexta Era · Sixth Age
            </p>
            <h1 className="font-display text-4xl md:text-5xl tracking-tight leading-none">
              <span className="italic text-soul-bright">Decxus</span>
              <span className="text-ink-3 mx-3">/</span>
              <span className="italic text-prayer-bright">Soclopata</span>
            </h1>
          </div>
          <Link
            href="/archive"
            className="hidden sm:inline-flex items-center gap-2 px-3 h-9 rounded-md border border-line text-[11px] uppercase tracking-[0.14em] font-mono text-ink-3 hover:text-ink hover:border-line-strong transition-colors"
          >
            <Crown size={14} /> In Memoriam — Fiorovizk
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Stat label="Total XP combined" value={fmtCompact(combinedXp)} size="lg" />
          <Stat label="Quests completed" value={fmt(combinedQuests)} size="lg" />
          <Stat
            label="Newest activity"
            value={fmtRelative(lastChange)}
            size="lg"
            accent="ash"
          />
          <Stat
            label="Snapshot"
            value={new Date(meta.timestamp).toLocaleString(undefined, {
              month: "short",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })}
            size="lg"
          />
        </div>
      </div>
    </section>
  );
}

function PlayerCard({ player }: { player: Player }) {
  const accent: "soul" | "prayer" = PLAYERS.find((p) => p.slug === player.slug)?.accent ?? "prayer";
  const lastActivity = player.activities[0];
  const lastDate = lastActivity ? parseActivityDate(lastActivity.date) : null;
  return (
    <Card accent={accent} className="p-5">
      <div className="flex items-baseline justify-between gap-4">
        <h3 className={`font-display italic text-3xl tracking-tight ${accent === "soul" ? "text-soul-bright" : "text-prayer-bright"}`}>
          {player.name}
        </h3>
        <span className="font-mono text-[11px] uppercase tracking-wider text-ink-3">
          Rank {player.rank}
        </span>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-4">
        <Stat label="Total level" value={fmt(player.totalLevel)} accent={accent} />
        <Stat label="Combat" value={fmt(player.combatLevel)} accent={accent} />
        <Stat label="Quests" value={`${player.questsDone}`} accent={accent} hint={`${player.totalQuests} total`} />
      </div>
      <div className="mt-5">
        <div className="flex items-baseline justify-between mb-1.5">
          <span className="font-mono text-[10.5px] uppercase tracking-wider text-ink-3">
            Total XP
          </span>
          <span className="font-mono text-sm tabular text-ink-2">
            {fmtCompact(player.totalXp)}
          </span>
        </div>
        <Bar pct={Math.min(100, (player.totalXp / 5_400_000_000) * 100)} accent={accent} />
      </div>
      <div className="mt-5 grid grid-cols-3 gap-3 text-center">
        {topSkills(player).map((sk) => (
          <div key={sk.id} className="bg-bg-raised rounded-md py-2">
            <div className="font-mono text-[10px] uppercase tracking-wider text-ink-3">
              {sk.name}
            </div>
            <div className={`font-mono tabular text-lg font-bold ${accent === "soul" ? "text-soul-bright" : "text-prayer-bright"}`}>
              {sk.level}
            </div>
          </div>
        ))}
      </div>
      {lastDate && (
        <div className="mt-5 text-xs text-ink-3">
          Last seen <span className="text-ink-2">{fmtRelative(lastDate)}</span>
        </div>
      )}
    </Card>
  );
}

function topSkills(p: Player) {
  return SKILLS
    .map((s) => ({ id: s.id, name: s.key, level: p.skills[s.id]?.level ?? 1 }))
    .sort((a, b) => b.level - a.level)
    .slice(0, 3);
}

function H2H({ players }: { players: Player[] }) {
  if (players.length < 2) return null;
  const [p1, p2] = players;
  const rows = [
    { label: "Total level", a: p1.totalLevel, b: p2.totalLevel },
    { label: "Combat",      a: p1.combatLevel, b: p2.combatLevel },
    { label: "Total XP",    a: p1.totalXp,     b: p2.totalXp,     format: (n: number) => fmtCompact(n) },
    { label: "Quests",      a: p1.questsDone,  b: p2.questsDone },
    { label: "RuneScore",   a: p1.runeScore,   b: p2.runeScore },
  ];
  return (
    <Card>
      <ul className="divide-y divide-line">
        {rows.map((r) => {
          const max = Math.max(r.a, r.b, 1);
          const pa = (r.a / max) * 100;
          const pb = (r.b / max) * 100;
          const aWin = r.a >= r.b;
          const fmtVal = r.format ?? fmt;
          return (
            <li key={r.label} className="px-4 py-3 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
              <div className="text-right">
                <div className={`tabular font-mono text-sm ${aWin ? "text-soul-bright" : "text-ink-2"}`}>
                  {fmtVal(r.a)}
                </div>
                <div className="ml-auto mt-1.5 h-1 max-w-[140px] bg-bg-raised rounded-full overflow-hidden">
                  <div className="h-full bg-soul-dim float-right" style={{ width: `${pa}%` }} />
                </div>
              </div>
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint text-center">
                {r.label}
              </div>
              <div>
                <div className={`tabular font-mono text-sm ${!aWin ? "text-prayer-bright" : "text-ink-2"}`}>
                  {fmtVal(r.b)}
                </div>
                <div className="mr-auto mt-1.5 h-1 max-w-[140px] bg-bg-raised rounded-full overflow-hidden">
                  <div className="h-full bg-prayer-dim" style={{ width: `${pb}%` }} />
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
