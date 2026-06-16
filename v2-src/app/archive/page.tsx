import { Card, EmptyState, Stat } from "@/components/primitives";
import { loadMemorial } from "@/lib/data";
import { fmt, fmtCompact } from "@/lib/format";
import { SKILLS } from "@/lib/skills";

export const dynamic = "force-static";

export default async function ArchivePage() {
  const player = await loadMemorial();
  if (!player) {
    return <EmptyState title="Archive unavailable" hint="Memorial data not found." />;
  }
  const top = SKILLS
    .map((s) => ({ ...s, level: player.skills[s.id]?.level ?? 1, xp: player.skills[s.id]?.xp ?? 0 }))
    .sort((a, b) => b.level - a.level || b.xp - a.xp)
    .slice(0, 6);
  return (
    <div className="max-w-xl mx-auto py-12 space-y-8">
      <header className="text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-3 mb-3">
          In Memoriam
        </p>
        <h1 className="font-display italic text-5xl text-ink tracking-tight">
          {player.name}
        </h1>
      </header>
      <Card accent="ash" className="p-8 space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <Stat label="Combat" value={fmt(player.combatLevel)} accent="ash" />
          <Stat label="Total level" value={fmt(player.totalLevel)} accent="ash" />
          <Stat label="Total XP" value={fmtCompact(player.totalXp)} accent="ash" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          {top.map((sk) => (
            <div key={sk.id} className="bg-bg-raised rounded-md p-3 text-center">
              <div className="font-mono text-[10px] uppercase tracking-wider text-ink-3">
                {sk.key}
              </div>
              <div className="font-mono tabular text-2xl font-bold text-ash-bright mt-1">
                {sk.level}
              </div>
            </div>
          ))}
        </div>
        <p className="text-sm text-ink-2 leading-relaxed text-center max-w-md mx-auto italic">
          Frozen in the Sixth Age. The Well of Souls is wide; the Last Call is open.
        </p>
      </Card>
    </div>
  );
}
