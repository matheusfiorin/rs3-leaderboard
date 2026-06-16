import { Bar, Card, SectionHead, Pill } from "@/components/primitives";
import { loadTrackedPlayers, PLAYERS } from "@/lib/data";
import { fmt, fmtCompact } from "@/lib/format";
import { SKILLS, type SkillCategory, xpToNext } from "@/lib/skills";

export const dynamic = "force-static";

export default async function SkillsPage() {
  const players = await loadTrackedPlayers();
  return (
    <div className="space-y-6">
      <SectionHead
        title="Skills"
        hint="29 disciplines · two prayers compared"
      />
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="text-left text-[10.5px] uppercase tracking-[0.16em] font-mono text-ink-3">
              <th className="py-2 pr-3 sticky left-0 bg-bg">Skill</th>
              <th className="py-2 px-2 text-right">Cap</th>
              {players.map((p) => {
                const accent = PLAYERS.find((x) => x.slug === p.slug)?.accent ?? "prayer";
                return (
                  <th
                    key={p.slug}
                    className={`py-2 px-2 text-right ${accent === "soul" ? "text-soul-bright" : "text-prayer-bright"}`}
                  >
                    {p.name}
                  </th>
                );
              })}
              <th className="py-2 pl-2 text-right">Gap</th>
            </tr>
          </thead>
          <tbody>
            {SKILLS.map((sk) => {
              const a = players[0]?.skills[sk.id];
              const b = players[1]?.skills[sk.id];
              const aLvl = a?.level ?? 1;
              const bLvl = b?.level ?? 1;
              const aXp = a?.xp ?? 0;
              const bXp = b?.xp ?? 0;
              const gap = aLvl - bLvl;
              return (
                <tr
                  key={sk.id}
                  className="border-t border-line hover:bg-bg-raised/40 transition-colors"
                >
                  <td className="py-2.5 pr-3 sticky left-0 bg-bg">
                    <div className="flex items-center gap-2">
                      <CatDot cat={sk.cat} />
                      <span className="text-ink">{sk.key}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono text-ink-3 tabular">
                    {sk.max}
                  </td>
                  <td className="py-2.5 px-2 text-right">
                    <div className="font-mono tabular text-soul-bright text-sm">
                      {aLvl}
                    </div>
                    <div className="text-[10px] text-ink-faint tabular">
                      {fmtCompact(aXp)}
                    </div>
                  </td>
                  <td className="py-2.5 px-2 text-right">
                    <div className="font-mono tabular text-prayer-bright text-sm">
                      {bLvl}
                    </div>
                    <div className="text-[10px] text-ink-faint tabular">
                      {fmtCompact(bXp)}
                    </div>
                  </td>
                  <td className="py-2.5 pl-2 text-right">
                    <span
                      className={
                        gap === 0
                          ? "font-mono tabular text-ink-faint"
                          : gap > 0
                            ? "font-mono tabular text-soul"
                            : "font-mono tabular text-prayer"
                      }
                    >
                      {gap > 0 ? `+${gap}` : gap === 0 ? "—" : gap}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <SectionHead title="Closest level-ups" hint="Where the next nudge lives" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {players.flatMap((p) =>
          SKILLS.map((sk) => {
            const s = p.skills[sk.id];
            if (!s || s.level >= sk.max) return null;
            const { needed, pct } = xpToNext(s.xp, s.level, sk.max);
            return { p, sk, s, needed, pct };
          }).filter(Boolean) as { p: typeof players[number]; sk: typeof SKILLS[number]; s: { level: number; xp: number }; needed: number; pct: number }[]
        )
          .sort((a, b) => a.needed - b.needed)
          .slice(0, 6)
          .map(({ p, sk, s, needed, pct }) => {
            const accent = PLAYERS.find((x) => x.slug === p.slug)?.accent ?? "prayer";
            return (
              <Card key={`${p.slug}-${sk.id}`} accent={accent} className="p-4">
                <div className="flex items-baseline justify-between mb-3">
                  <span className="font-mono text-[10.5px] uppercase tracking-wider text-ink-3">
                    {p.name}
                  </span>
                  <Pill tone={accent}>{sk.key}</Pill>
                </div>
                <div className="flex items-end justify-between gap-2 mb-2">
                  <span className="font-display italic text-3xl text-ink">
                    {s.level}
                  </span>
                  <span className="text-[11px] text-ink-3 font-mono">
                    → {s.level + 1}
                  </span>
                </div>
                <Bar pct={pct} accent={accent} />
                <div className="mt-2 text-xs text-ink-3">
                  <span className="text-ink-2 tabular font-mono">{fmt(needed)}</span> XP to next
                </div>
              </Card>
            );
          })}
      </div>
    </div>
  );
}

function CatDot({ cat }: { cat: SkillCategory }) {
  const map: Record<SkillCategory, string> = {
    combat:    "bg-soul",
    artisan:   "bg-warn",
    gathering: "bg-success",
    support:   "bg-prayer",
  };
  return <span className={`w-1.5 h-1.5 rounded-full ${map[cat]}`} aria-hidden />;
}
