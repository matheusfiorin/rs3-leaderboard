import type { Metadata } from "next";
import { Card, EmptyState, Stat } from "@/components/primitives";
import { SkillIcon } from "@/components/ui";
import { loadMemorial, parseActivityDate } from "@/lib/data";
import { fmt, fmtCompact } from "@/lib/format";
import { SKILLS } from "@/lib/skills";

export const metadata: Metadata = { title: "In Memoriam — Sexta Era" };

// Fiorovizk's files are frozen: the cron stopped writing them when the account
// was retired. Nothing here can change, so this page is rendered once on the
// server and never revalidated on the client.
const RETIRED = new Date(2026, 4, 21);

// Constructed from local date parts, so these format identically on the build
// machine and anywhere else — no timeZone override needed or wanted.
const DATE_FMT = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
});
const STAMP_FMT = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function ArchivePage() {
  const player = await loadMemorial();
  if (!player) {
    return (
      <EmptyState
        title="Archive unavailable"
        hint="The memorial snapshot could not be read."
      />
    );
  }

  const skills = SKILLS.map((s) => ({
    ...s,
    level: player.skills[s.id]?.level ?? 1,
    xp: player.skills[s.id]?.xp ?? 0,
  }));
  const maxed = skills.filter((s) => s.level >= 99);
  const deepest = [...skills].sort((a, b) => b.xp - a.xp)[0];
  const questsDone = player.questList.filter((q) => q.status === "COMPLETED").length;
  const clues = Object.values(player.clues).reduce((a, b) => a + b, 0);

  const lastSeen = player.activities
    .map((a) => parseActivityDate(a.date))
    .filter((d): d is Date => d !== null)
    .sort((a, b) => b.getTime() - a.getTime())[0];

  const notable: { label: string; value: string }[] = [
    {
      label: maxed.length === 1 ? "The only 99" : "Skills at 99",
      value: maxed.length
        ? maxed.map((s) => s.key).join(", ")
        : "None reached",
    },
    { label: "Deepest skill", value: `${deepest.key} · ${fmt(deepest.xp)} XP` },
    { label: "Quests completed", value: `${fmt(questsDone)} · ${fmt(player.questPoints)} quest points` },
    { label: "RuneScore", value: fmt(player.runeScore) },
    { label: "Clue scrolls", value: clues ? fmt(clues) : "None recorded" },
    { label: "Final hiscore rank", value: player.rank || "Unranked" },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-10 py-4 sm:py-10">
      <header className="text-center">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-3">
          In Memoriam
        </p>
        <h1 className="mt-3 font-display italic text-4xl sm:text-5xl text-ink tracking-tight break-words">
          {player.name}
        </h1>
        <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">
          Retired {DATE_FMT.format(RETIRED)}
        </p>
      </header>

      <Card accent="ash" className="p-6 sm:p-8">
        <div className="grid grid-cols-3 gap-4">
          <Stat label="Combat" value={fmt(player.combatLevel)} accent="ash" />
          <Stat label="Total level" value={fmt(player.totalLevel)} accent="ash" />
          <Stat label="Total XP" value={fmtCompact(player.totalXp)} accent="ash" hint={`${fmt(player.totalXp)} XP`} />
        </div>
      </Card>

      <section className="space-y-3">
        <h2 className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink-3">
          Final skill levels
        </h2>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
          {skills.map((s) => (
            <div
              key={s.id}
              title={`${s.key} — ${fmt(s.xp)} XP`}
              className="rounded-md bg-bg-surface border border-line px-1.5 py-2 text-center"
            >
              <SkillIcon id={s.id} size={15} />
              <div className="mt-0.5 font-mono text-[8.5px] uppercase tracking-wider text-ink-faint truncate">
                {s.abbr}
              </div>
              <div
                className={
                  s.level >= 99
                    ? "font-mono tabular text-base font-bold text-ash-bright"
                    : "font-mono tabular text-base text-ink-2"
                }
              >
                {s.level}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink-3">
          What was left behind
        </h2>
        <Card className="divide-y divide-line">
          {notable.map((n) => (
            <div
              key={n.label}
              className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3"
            >
              <span className="text-sm text-ink-3">{n.label}</span>
              <span className="text-sm text-ink text-right min-w-0 break-words">
                {n.value}
              </span>
            </div>
          ))}
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink-3">
          Last recorded
        </h2>
        {player.activities.length === 0 ? (
          <p className="text-sm text-ink-3">Nothing was logged before the account went quiet.</p>
        ) : (
          <Card className="divide-y divide-line">
            {player.activities.slice(0, 6).map((a, i) => {
              const d = parseActivityDate(a.date);
              return (
                <div key={`${a.date}-${i}`} className="px-4 py-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <p className="text-sm text-ink-2 min-w-0 break-words">{a.text}</p>
                    <span className="font-mono text-[10px] tabular text-ink-faint shrink-0">
                      {d ? STAMP_FMT.format(d) : a.date}
                    </span>
                  </div>
                </div>
              );
            })}
          </Card>
        )}
        {lastSeen && (
          <p className="text-xs text-ink-faint">
            Final entry {STAMP_FMT.format(lastSeen)}. The account was retired{" "}
            {DATE_FMT.format(RETIRED)}; these numbers have not moved since.
          </p>
        )}
      </section>

      <p className="text-center text-sm text-ink-3 italic leading-relaxed max-w-md mx-auto">
        Frozen in the Sixth Age. The Well of Souls is wide; the Last Call is open.
      </p>
    </div>
  );
}
