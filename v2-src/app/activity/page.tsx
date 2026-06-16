import { Card, SectionHead, EmptyState } from "@/components/primitives";
import { combineActivities, loadTrackedPlayers, parseActivityDate } from "@/lib/data";
import { fmtRelative } from "@/lib/format";

export const dynamic = "force-static";

export default async function ActivityPage() {
  const players = await loadTrackedPlayers();
  const items = combineActivities(players).slice(0, 80);

  // Bucket by day for sticky day-headers.
  const groups = new Map<string, typeof items>();
  for (const it of items) {
    const d = parseActivityDate(it.date);
    const k = d ? d.toDateString() : "—";
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(it);
  }

  return (
    <div className="space-y-6">
      <SectionHead title="Activity" hint="Combined timeline · newest first" />
      {items.length === 0 ? (
        <EmptyState title="No recent activity" hint="The cron hasn't reported anything yet." />
      ) : (
        <div className="space-y-8">
          {Array.from(groups.entries()).map(([day, list]) => (
            <section key={day}>
              <h3 className="text-[10.5px] uppercase tracking-[0.18em] font-mono text-ink-3 mb-3 sticky top-14 bg-bg/95 py-2 -mx-2 px-2 backdrop-blur z-10">
                {day === "—" ? "Undated" : day}
              </h3>
              <Card className="divide-y divide-line">
                {list.map((a, i) => (
                  <article key={`${day}-${i}`} className="px-4 py-3 flex items-start gap-3">
                    <span
                      className={
                        a.accent === "soul"
                          ? "mt-1.5 w-1.5 h-1.5 rounded-full bg-soul flex-shrink-0"
                          : "mt-1.5 w-1.5 h-1.5 rounded-full bg-prayer flex-shrink-0"
                      }
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="font-mono text-[11px] uppercase tracking-wider text-ink-2">
                          {a.player}
                        </span>
                        <span className="font-mono text-[10.5px] text-ink-faint tabular">
                          {a.date.split(" ")[1] ?? a.date}
                        </span>
                      </div>
                      <div className="text-sm text-ink mt-0.5">{a.text}</div>
                      {a.details && a.details !== a.text && (
                        <div className="text-xs text-ink-3 mt-1">{a.details}</div>
                      )}
                    </div>
                  </article>
                ))}
              </Card>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
