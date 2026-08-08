"use client";

import { useMemo, useState } from "react";
import { clsx } from "clsx";
import {
  CircleCheck,
  CloudCheck,
  ExternalLink,
  Lock,
  Timer,
  Users,
} from "lucide-react";
import {
  Card,
  EmptyState,
  Pill,
  SectionHead,
  Skeleton,
} from "@/components/primitives";
import {
  ACCENT_TEXT,
  CountInput,
  ReqList,
  Ring,
  Segmented,
  SkillIcon,
  TierBadge,
} from "@/components/ui";
import { useEval } from "@/components/useEval";
import { useProgress } from "@/components/ProgressProvider";
import {
  BOSSES,
  bossesByTier,
  nextBosses,
  type BossEntry,
} from "@/lib/content/bosses";
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

export default function PvmClient() {
  const { players, contexts, loading, gate } = useEval();
  const progress = useProgress();

  const [pick, setPick] = useState<string | null>(null);
  const [tier, setTier] = useState<TierFilter>("all");
  const [group, setGroup] = useState<GroupFilter>("all");
  const [readyOnly, setReadyOnly] = useState(false);

  // Fall back to the first player rather than trusting the stored slug — the
  // roster is re-fetched on the client and a slug can go missing mid-session.
  const player = players.find((p) => p.slug === pick) ?? players[0];
  const slug = player?.slug ?? "";
  const accent: Accent = player?.accent ?? "prayer";

  const gates = useMemo(() => {
    const out: Record<string, GateResult> = {};
    for (const b of BOSSES) out[b.id] = gate(slug, b.requirements);
    return out;
  }, [gate, slug]);

  const ctx = contexts[slug];
  const nextUp = useMemo(() => (ctx ? nextBosses(ctx, 3) : []), [ctx]);

  // Kill counts live in the shared progress store, so they are account-wide
  // rather than per-player — one ledger, synced across every device.
  const kills = useMemo(() => {
    let total = 0;
    let tracked = 0;
    for (const b of BOSSES) {
      const n = progress.count(kcKey(b.name));
      if (n > 0) {
        total += n;
        tracked += 1;
      }
    }
    return { total, tracked };
  }, [progress]);

  const unlocked = useMemo(
    () => BOSSES.filter((b) => gates[b.id]?.complete).length,
    [gates],
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
        .map((t) => ({
          tier: t,
          // bossesByTier already sorts by hpTier, so a tier reads as a ramp.
          bosses: bossesByTier(t).filter(
            (b) =>
              (group === "all" || b.group === group) &&
              (!readyOnly || gates[b.id]?.complete),
          ),
        }))
        .filter((g) => g.bosses.length > 0),
    [tier, group, readyOnly, gates],
  );

  const closest = nextUp[0];

  return (
    <div className="space-y-6">
      <SectionHead
        title="PvM"
        hint={`${BOSSES.length} bosses · giant mole to Zuk`}
      />

      {players.length > 1 && (
        <Segmented
          ariaLabel="Player"
          value={slug}
          onChange={setPick}
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

      {loading || !player ? (
        <LadderSkeleton />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Card accent={accent} className="p-5 flex items-center gap-4">
              <Ring
                pct={(unlocked / BOSSES.length) * 100}
                size={68}
                stroke={5}
                accent={accent}
                label={`${unlocked} of ${BOSSES.length} bosses unlocked`}
              >
                <span className="font-mono tabular text-lg font-bold text-ink leading-none">
                  {unlocked}
                </span>
              </Ring>
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-[0.14em] font-mono text-ink-3">
                  Unlocked
                </div>
                <div className="font-mono tabular text-2xl font-bold text-ink leading-tight">
                  {unlocked}
                  <span className="text-ink-faint"> / {BOSSES.length}</span>
                </div>
                <div className={clsx("text-xs truncate", ACCENT_TEXT[accent])}>
                  {player.name}
                </div>
              </div>
            </Card>

            <Card className="p-5">
              <div className="text-[11px] uppercase tracking-[0.14em] font-mono text-ink-3">
                Kills logged
              </div>
              <div className="mt-1 font-mono tabular text-3xl font-bold text-ink leading-none">
                {fmt(kills.total)}
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-ink-3">
                <CloudCheck size={13} className="shrink-0 text-success" aria-hidden="true" />
                <span className="truncate">
                  {kills.tracked} boss{kills.tracked === 1 ? "" : "es"} on the board · synced
                </span>
              </div>
            </Card>

            <Card className="p-5 sm:col-span-2 lg:col-span-1">
              <div className="text-[11px] uppercase tracking-[0.14em] font-mono text-ink-3">
                Next boss in reach
              </div>
              {closest ? (
                <div className="mt-2 flex items-center gap-3">
                  <Ring
                    pct={closest.gate.pct}
                    size={44}
                    stroke={4}
                    accent="ash"
                    label={`${Math.round(closest.gate.pct)}% of the gate met`}
                  />
                  <div className="min-w-0">
                    <div className="text-sm text-ink truncate">
                      {closest.item.name}
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <TierBadge tier={closest.item.tier} />
                      <span className="font-mono tabular text-[11px] text-ink-3">
                        {Math.round(closest.gate.pct)}%
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-sm text-success">
                  Every gate on the ladder is open.
                </p>
              )}
            </Card>
          </div>

          {nextUp.length > 0 && (
            <section aria-labelledby="next-up">
              <div className="flex items-baseline justify-between gap-3 mb-3">
                <h3
                  id="next-up"
                  className="font-display italic text-lg text-ink tracking-tight"
                >
                  What now
                </h3>
                <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-3">
                  closest locked gates
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {nextUp.map(({ item, gate: g }, i) => (
                  <NextUpCard key={item.id} boss={item} gate={g} rank={i + 1} />
                ))}
              </div>
            </section>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Segmented
              ariaLabel="Difficulty tier"
              value={tier}
              onChange={setTier}
              options={[
                { value: "all" as const, label: "All", count: tierCounts.all },
                ...TIERS.map((t) => ({
                  value: t,
                  label: t,
                  count: tierCounts[t] ?? 0,
                })),
              ]}
            />
            <Segmented
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
              className={clsx(
                "inline-flex items-center gap-2 h-11 px-3.5 rounded-lg border transition-colors",
                "font-mono text-[11px] uppercase tracking-wider",
                readyOnly
                  ? "border-success/40 text-success bg-success/10"
                  : "border-line text-ink-3 hover:text-ink-2 hover:border-line-strong",
              )}
            >
              <CircleCheck size={14} aria-hidden="true" />
              Ready only
            </button>
          </div>

          {ladder.length === 0 ? (
            <EmptyState
              title="Nothing matches those filters"
              hint={
                readyOnly
                  ? "No boss in this slice has all its requirements met yet."
                  : "Try widening the tier or group filter."
              }
            />
          ) : (
            <div className="space-y-8">
              {ladder.map((g) => (
                <section key={g.tier} aria-labelledby={`tier-${g.tier}`}>
                  <div className="flex items-center gap-3 mb-3 pb-2 border-b border-line">
                    <h3 id={`tier-${g.tier}`} className="flex items-center gap-2">
                      <TierBadge tier={g.tier} />
                      <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-3">
                        {g.bosses.filter((b) => gates[b.id]?.complete).length} of{" "}
                        {g.bosses.length} open
                      </span>
                    </h3>
                  </div>
                  <div className="grid gap-3 lg:grid-cols-2">
                    {g.bosses.map((b) => (
                      <BossCard
                        key={b.id}
                        boss={b}
                        gate={gates[b.id]}
                        accent={accent}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function BossCard({
  boss,
  gate,
  accent,
}: {
  boss: BossEntry;
  gate: GateResult;
  accent: Accent;
}) {
  const progress = useProgress();
  const kc = progress.count(kcKey(boss.name));
  const locked = !gate.complete;

  return (
    <Card
      accent={locked ? undefined : accent}
      className={clsx("p-4 flex flex-col gap-3", locked && "bg-bg-surface/50")}
    >
      <div className="flex items-start gap-3">
        <Ring
          pct={gate.pct}
          size={44}
          stroke={4}
          accent={locked ? "ash" : accent}
          label={`${Math.round(gate.pct)}% of ${boss.name}'s requirements met`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {locked && (
              <Lock size={12} className="shrink-0 text-ink-faint" aria-hidden="true" />
            )}
            <a
              href={wikiUrl(boss.wiki)}
              target="_blank"
              rel="noopener noreferrer"
              className={clsx(
                "text-sm font-medium hover:text-prayer-bright transition-colors",
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

      <div className="flex flex-wrap gap-1.5">
        {boss.dropHighlights.slice(0, 4).map((d) => (
          <Pill key={d}>{d}</Pill>
        ))}
      </div>

      <div>
        {locked && (
          <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
            Still needs
          </p>
        )}
        <ReqList results={gate.missing} limit={6} />
      </div>

      {/* Kill counts are the one thing the RS3 API cannot see, so the log gets
          its own lit panel rather than trailing the card as an afterthought. */}
      <div className="mt-auto rounded-md border border-line bg-bg-raised/40 px-3 py-1 lit-edge">
        <CountInput storeKey={kcKey(boss.name)} label="Kills" />
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
            <span className="font-mono text-[10px] text-ink-faint tabular">#{rank}</span>
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
      <span className="font-mono text-[10.5px] uppercase tracking-wider text-ink-faint">
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
          <Skeleton key={i} className="h-[104px]" />
        ))}
      </div>
      <Skeleton className="h-6 w-32" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <Skeleton className="h-11 w-full max-w-md" />
      <div className="grid gap-3 lg:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-64" />
        ))}
      </div>
    </div>
  );
}
