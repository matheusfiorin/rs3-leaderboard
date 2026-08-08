"use client";

import { useMemo, useState } from "react";
import { Compass, Gem, Skull, Sparkles, TrendingUp } from "lucide-react";
import { clsx } from "clsx";
import { Card, EmptyState, SectionHead, Skeleton } from "@/components/primitives";
import { ACCENT_BG, ACCENT_TEXT, RelativeTime, Segmented } from "@/components/ui";
import { usePlayerData } from "@/components/PlayerDataProvider";
import {
  combineActivities,
  parseActivityDate,
  type ActivityCategory,
  type CombinedActivity,
} from "@/lib/player";
import { fmt } from "@/lib/format";

type IconType = React.ComponentType<{ size?: number; className?: string }>;

const CATEGORY: Record<ActivityCategory, { label: string; icon: IconType; tone: string }> = {
  level: { label: "Levels", icon: TrendingUp, tone: "text-success" },
  quest: { label: "Quests", icon: Compass, tone: "text-prayer-bright" },
  boss: { label: "Bosses", icon: Skull, tone: "text-soul-bright" },
  drop: { label: "Drops", icon: Gem, tone: "text-ash-bright" },
  other: { label: "Other", icon: Sparkles, tone: "text-ink-3" },
};

const CATEGORY_ORDER: ActivityCategory[] = ["level", "quest", "boss", "drop", "other"];

const PAGE = 20;

// Day headers are formatted from the components RuneMetrics gave us
// ("13-Jun-2026 13:07"), which parseActivityDate rebuilds as local time. That
// makes getDate()/getMonth() identical on the build machine and in the browser,
// so the prerendered HTML and the hydrated HTML agree. Anything derived from
// Date.now() would not — which is why there is no "Today" label here and why
// every clock-relative string goes through <RelativeTime>.
const DAY_FMT = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** TZ-stable grouping key: the date half of the raw RuneMetrics stamp. */
function dayKey(raw: string): string {
  return raw?.slice(0, 11) || "undated";
}

export default function ActivityClient() {
  const { players, stale } = usePlayerData();
  const [who, setWho] = useState<string>("all");
  const [cat, setCat] = useState<ActivityCategory | "all">("all");
  const [limit, setLimit] = useState(PAGE);

  const all = useMemo(() => combineActivities(players), [players]);

  const byPlayer = useMemo(
    () => (who === "all" ? all : all.filter((a) => a.player === who)),
    [all, who],
  );

  const filtered = useMemo(
    () => (cat === "all" ? byPlayer : byPlayer.filter((a) => a.category === cat)),
    [byPlayer, cat],
  );

  // Reset the page size whenever the filter changes. Adjusting during render
  // (rather than in an effect) avoids a paint of the old page size.
  const filterKey = `${who}|${cat}`;
  const [seenKey, setSeenKey] = useState(filterKey);
  if (seenKey !== filterKey) {
    setSeenKey(filterKey);
    setLimit(PAGE);
  }

  const visible = filtered.slice(0, limit);

  const catCounts = useMemo(() => {
    const t: Record<ActivityCategory, number> = { level: 0, quest: 0, boss: 0, drop: 0, other: 0 };
    for (const a of byPlayer) t[a.category]++;
    return t;
  }, [byPlayer]);

  // Group the visible slice into days, preserving newest-first order.
  const days = useMemo(() => {
    const out: { key: string; label: string; items: CombinedActivity[] }[] = [];
    for (const a of visible) {
      const key = dayKey(a.date);
      let bucket = out[out.length - 1];
      if (!bucket || bucket.key !== key) {
        const d = parseActivityDate(a.date);
        bucket = { key, label: d ? DAY_FMT.format(d) : "Undated", items: [] };
        out.push(bucket);
      }
      bucket.items.push(a);
    }
    return out;
  }, [visible]);

  if (!all.length) {
    return (
      <div className="space-y-6">
        <SectionHead as="h1" title="Activity" hint="Combined feed · newest first" />
        {stale ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Nothing logged yet"
            hint="RuneMetrics has not reported an event for either account."
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHead
        as="h1"
        title="Activity"
        hint="Combined feed · newest first"
        right={
          <span className="font-mono text-[11px] tabular text-ink-3">
            {fmt(all.length)} events
          </span>
        }
      />

      {/* There used to be a "Latest" hero card and a 2x2 stat quad above this
          point. The hero repeated the first feed row verbatim; the quad
          restated counts the chips below already carried — under a different
          name ("Kills" vs "Bosses") and missing "Other", so its four numbers
          did not sum to the header's total. Both are gone: the feed leads and
          the chips are the single source of the counts.

          From xl the chips become a rail. Left as a full-width strip, the feed
          below it stretched its player/timestamp rows across 1400px. */}
      <div className="grid gap-x-8 gap-y-6 xl:grid-cols-[minmax(0,1fr)_264px] xl:items-start">
        <div
          className="order-1 min-w-0 flex flex-wrap items-start gap-2
                     xl:order-none xl:col-start-2 xl:flex-col xl:sticky xl:top-16"
        >
          <Segmented
            ariaLabel="Filter by player"
            size="sm"
            value={who}
            onChange={setWho}
            options={[
              { value: "all", label: "Both", count: all.length },
              ...players.map((p) => ({
                value: p.name,
                label: p.name,
                count: all.filter((a) => a.player === p.name).length,
              })),
            ]}
          />
          <Segmented
            ariaLabel="Filter by kind"
            size="sm"
            value={cat}
            onChange={setCat}
            options={[
              { value: "all" as const, label: "All", count: byPlayer.length },
              ...CATEGORY_ORDER.filter((c) => catCounts[c] > 0).map((c) => ({
                value: c,
                label: CATEGORY[c].label,
                count: catCounts[c],
              })),
            ]}
          />
        </div>

        <div className="order-2 min-w-0 xl:order-none xl:col-start-1 xl:row-start-1">
          {!filtered.length ? (
            <EmptyState
              title="No events match"
              hint="Try a different player or category."
            />
          ) : (
            <div className="space-y-6">
              {days.map((day) => (
                <section key={day.key}>
                  <h2 className="sticky top-14 z-10 -mx-1 px-1 py-2 bg-bg/95 backdrop-blur font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink-3">
                    {day.label}
                  </h2>
                  <Card className="divide-y divide-line">
                    {day.items.map((a, i) => (
                      <Row key={`${day.key}-${i}-${a.player}`} activity={a} />
                    ))}
                  </Card>
                </section>
              ))}

              {filtered.length > visible.length && (
                <button
                  type="button"
                  onClick={() => setLimit((n) => n + PAGE)}
                  className="w-full min-h-[44px] rounded-lg border border-line text-sm text-ink-2 hover:text-ink hover:border-line-strong hover:bg-bg-raised/50 transition-colors"
                >
                  Show {Math.min(PAGE, filtered.length - visible.length)} more
                  <span className="ml-2 font-mono text-[11px] tabular text-ink-3">
                    {visible.length} / {filtered.length}
                  </span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ activity }: { activity: CombinedActivity }) {
  const meta = CATEGORY[activity.category];
  const Icon = meta.icon;
  return (
    <article className="flex items-start gap-3 px-3 sm:px-4 py-3">
      <span className="relative mt-0.5 grid place-items-center w-7 h-7 shrink-0 rounded-md bg-bg-raised">
        <Icon size={14} className={meta.tone} />
        <span
          aria-hidden="true"
          className={clsx(
            "absolute -left-px top-1 bottom-1 w-[2px] rounded-full",
            ACCENT_BG[activity.accent],
          )}
        />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span
            className={clsx(
              "font-mono text-[10.5px] uppercase tracking-wider truncate",
              ACCENT_TEXT[activity.accent],
            )}
          >
            {activity.player}
          </span>
          <RelativeTime
            className="font-mono text-[10.5px] tabular text-ink-3 shrink-0"
            date={activity.ts || null}
          />
        </div>
        <p className="mt-0.5 text-sm text-ink break-words">{activity.text}</p>
        {activity.details && activity.details !== activity.text && (
          <p className="mt-1 text-xs text-ink-3 break-words">{activity.details}</p>
        )}
      </div>
    </article>
  );
}
