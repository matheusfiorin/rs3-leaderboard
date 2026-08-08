"use client";

import { useMemo, useState } from "react";
import { clsx } from "clsx";
import { Check as CheckIcon, ChevronDown, ExternalLink, Flag, Trophy } from "lucide-react";
import { Card, EmptyState, Pill, SectionHead, Skeleton } from "@/components/primitives";
import {
  ACCENT_BG,
  ACCENT_BORDER,
  ACCENT_TEXT,
  Check,
  Meter,
  ReqList,
  Ring,
  SkillIcon,
  TierBadge,
  skillName,
} from "@/components/ui";
import { useEval } from "@/components/useEval";
import {
  MAJOR_GOALS,
  goalById,
  goalsByTier,
  nextGoals,
  type MajorGoal,
} from "@/lib/content/goals";
import { fmtCompact } from "@/lib/format";
import { iconUrl, wikiUrl } from "@/lib/paths";
import type { EvalContext } from "@/lib/requirements";
import { xpForLevel } from "@/lib/skills";
import type {
  Accent,
  ContentTier,
  GateResult,
  PlayerSummary,
  RequirementResult,
} from "@/lib/types";

// Tiers in escalation order, narrowed to the ones goals actually use. Derived
// rather than hardcoded so adding an "apex" goal lights up a ribbon slot.
const TIER_ORDER: ContentTier[] = ["early", "mid", "late", "end", "apex"];
const TIERS = TIER_ORDER.filter((t) => MAJOR_GOALS.some((g) => g.tier === t));

const TIER_LABEL: Record<ContentTier, string> = {
  early: "Early",
  mid: "Mid",
  late: "Late",
  end: "End",
  apex: "Apex",
};

/**
 * Campaigns whose quest chain is literally contained in a later campaign.
 * Shown as a "builds on" chip so the end-tier goals read as a sequence rather
 * than three unrelated 60-quest walls.
 */
const BUILDS_ON: Record<string, string[]> = {
  rotm: ["senntisten"],
  sliske: ["rotm", "worldwakes"],
};

type TierFilter = ContentTier | "all";

interface Buckets {
  skills: RequirementResult[];
  quests: RequirementResult[];
  manual: RequirementResult[];
  other: RequirementResult[];
}

function bucket(gate: GateResult): Buckets {
  return {
    skills: gate.results.filter((r) => r.req.kind === "skill"),
    quests: gate.results.filter((r) => r.req.kind === "quest"),
    manual: gate.results.filter((r) => r.req.kind === "manual"),
    other: gate.results.filter((r) => r.req.kind === "kc" || r.req.kind === "stat"),
  };
}

const doneCount = (rs: RequirementResult[]) => rs.filter((r) => r.met).length;

export default function GoalsClient() {
  const { players, contexts, loading, gate } = useEval();
  const [slug, setSlug] = useState<string>("");
  const [tier, setTier] = useState<TierFilter>("all");

  // Derive rather than sync: the roster can swap under us on a revalidate and
  // an effect-synced selection would flash the wrong player for a frame.
  const player = players.find((p) => p.slug === slug) ?? players[0];

  const tierPct = useMemo(() => {
    const out: Record<string, number> = {};
    const avg = (goals: MajorGoal[]) => {
      let sum = 0;
      let n = 0;
      for (const g of goals) {
        for (const p of players) {
          sum += gate(p.slug, g.requirements).pct;
          n++;
        }
      }
      return n ? sum / n : 0;
    };
    out.all = avg(MAJOR_GOALS);
    for (const t of TIERS) out[t] = avg(goalsByTier(t));
    return out;
  }, [players, gate]);

  const mine = useMemo(() => {
    if (!player) return { pct: 0, complete: 0 };
    let sum = 0;
    let complete = 0;
    for (const g of MAJOR_GOALS) {
      const res = gate(player.slug, g.requirements);
      sum += res.pct;
      if (res.complete) complete++;
    }
    return { pct: sum / MAJOR_GOALS.length, complete };
  }, [player, gate]);

  const ctx = player ? contexts[player.slug] : undefined;
  const closest = ctx ? nextGoals(ctx, 1)[0] : undefined;

  if (!player) {
    return (
      <div className="space-y-6">
        <SectionHead title="Goals" hint="Major campaigns" />
        <EmptyState title="No players loaded" hint="Player data has not arrived yet." />
      </div>
    );
  }

  const shownTiers = TIERS.filter((t) => tier === "all" || t === tier);

  return (
    <div className="space-y-6">
      <SectionHead
        title="Goals"
        hint={`${MAJOR_GOALS.length} major campaigns`}
        right={
          loading ? (
            <Skeleton className="h-5 w-24" />
          ) : (
            <Pill tone={mine.complete ? "success" : "neutral"}>
              {mine.complete} / {MAJOR_GOALS.length} done
            </Pill>
          )
        }
      />

      {/* Ribbon — averaged across both players, so it reads as "where the
          household is", not "where the selected player is". */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <TierTile
          label="All"
          hint={`${MAJOR_GOALS.length} goals`}
          pct={tierPct.all}
          active={tier === "all"}
          loading={loading}
          onClick={() => setTier("all")}
        />
        {TIERS.map((t) => (
          <TierTile
            key={t}
            label={TIER_LABEL[t]}
            hint={`${goalsByTier(t).length} goals`}
            pct={tierPct[t]}
            active={tier === t}
            loading={loading}
            onClick={() => setTier(tier === t ? "all" : t)}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Player" className="flex gap-1.5">
          {players.map((p) => {
            const active = p.slug === player.slug;
            return (
              <button
                key={p.slug}
                type="button"
                aria-current={active ? "true" : undefined}
                onClick={() => setSlug(p.slug)}
                className={clsx(
                  "h-11 px-4 rounded-lg border text-sm transition-colors",
                  active
                    ? clsx(ACCENT_BORDER[p.accent], ACCENT_TEXT[p.accent], "bg-bg-raised")
                    : "border-line text-ink-3 hover:text-ink-2 hover:border-line-strong",
                )}
              >
                {p.name}
              </button>
            );
          })}
        </div>
        <div className="flex-1" />
        {!loading && (
          <span className="font-mono tabular text-xs text-ink-3">
            {Math.round(mine.pct)}% overall
          </span>
        )}
      </div>

      {loading ? (
        <GoalsSkeleton />
      ) : (
        <>
          {closest ? (
            <Card accent={player.accent} className="p-4 sm:p-5">
              <div className="flex items-center gap-4">
                <Ring
                  pct={closest.gate.pct}
                  size={64}
                  stroke={5}
                  accent={player.accent}
                  label={`${closest.item.name}: ${Math.round(closest.gate.pct)}% complete`}
                />
                <div className="min-w-0">
                  <p className="text-[10px] font-mono uppercase tracking-[0.16em] text-ink-3">
                    Closest campaign · {player.name}
                  </p>
                  <h3 className="font-display italic text-xl leading-tight text-ink truncate">
                    {closest.item.name}
                  </h3>
                  <p className="mt-0.5 text-xs text-ink-3">
                    {closest.gate.missing.length} requirements left
                  </p>
                </div>
              </div>
              <div className="mt-3">
                <ReqList results={closest.gate.missing} limit={6} />
              </div>
            </Card>
          ) : (
            <Card accent={player.accent} className="p-5">
              <p className="font-display italic text-lg text-ink">
                Every campaign complete.
              </p>
              <p className="mt-1 text-sm text-ink-3">
                {player.name} has cleared all {MAJOR_GOALS.length} goals.
              </p>
            </Card>
          )}

          {shownTiers.map((t) => (
            <section key={t} className="space-y-3">
              <h3 className="flex items-center gap-2.5">
                <TierBadge tier={t} />
                <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">
                  {TIER_LABEL[t]} game
                </span>
                <span className="flex-1 h-px bg-line" />
                <span className="font-mono tabular text-[11px] text-ink-faint">
                  {Math.round(tierPct[t])}%
                </span>
              </h3>
              <div className="grid gap-3 lg:grid-cols-2">
                {goalsByTier(t).map((g) => (
                  <GoalCard
                    key={g.id}
                    goal={g}
                    player={player}
                    ctx={contexts[player.slug]}
                    gate={gate(player.slug, g.requirements)}
                    prereqs={(BUILDS_ON[g.id] ?? [])
                      .map((id) => goalById(id))
                      .filter((o): o is MajorGoal => Boolean(o))
                      .map((o) => ({
                        name: o.name,
                        pct: gate(player.slug, o.requirements).pct,
                      }))}
                  />
                ))}
              </div>
            </section>
          ))}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tier ribbon
// ---------------------------------------------------------------------------

function TierTile({
  label,
  hint,
  pct,
  active,
  loading,
  onClick,
}: {
  label: string;
  hint: string;
  pct: number;
  active: boolean;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "true" : undefined}
      className={clsx(
        "flex items-center gap-3 min-h-[64px] px-3 py-2.5 rounded-lg border text-left transition-colors",
        active
          ? "border-ash/40 bg-bg-raised"
          : "border-line bg-bg-surface hover:border-line-strong",
      )}
    >
      {loading ? (
        <Skeleton className="w-10 h-10 rounded-full shrink-0" />
      ) : (
        // Aggregate across both players — ash is the app's milestone accent, so
        // it never reads as belonging to one player.
        <Ring pct={pct} size={40} stroke={3} accent="ash" label={`${label}: ${Math.round(pct)}%`} />
      )}
      <span className="min-w-0">
        <span className="block text-sm text-ink truncate">{label}</span>
        <span className="block text-[10.5px] font-mono uppercase tracking-wider text-ink-3">
          {hint}
        </span>
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Goal card
// ---------------------------------------------------------------------------

function GoalCard({
  goal,
  player,
  ctx,
  gate,
  prereqs,
}: {
  goal: MajorGoal;
  player: PlayerSummary;
  ctx: EvalContext | undefined;
  gate: GateResult;
  /** Earlier campaigns this one contains, with the same player's progress. */
  prereqs: { name: string; pct: number }[];
}) {
  const b = bucket(gate);
  const capstoneDone = goal.capstone ? (ctx?.questsDone.has(goal.capstone) ?? false) : false;
  const missingQuests = b.quests.filter((r) => !r.met);
  const missingSkills = b.skills.filter((r) => !r.met);
  const missingOther = b.other.filter((r) => !r.met);

  const parts: { key: string; label: string; rs: RequirementResult[] }[] = [
    { key: "skills", label: "Skills", rs: b.skills },
    { key: "quests", label: "Quests", rs: b.quests },
    { key: "manual", label: "Manual", rs: b.manual },
    { key: "other", label: "Other", rs: b.other },
  ].filter((p) => p.rs.length > 0);

  return (
    <Card
      accent={goal.color}
      className={clsx("overflow-hidden", gate.complete && "opacity-80")}
    >
      <div className="flex items-start gap-3 p-4">
        <GoalIcon goal={goal} />
        <div className="min-w-0 flex-1">
          <h4 className="font-display italic text-lg leading-tight text-ink">
            {goal.name}
          </h4>
          <p className="mt-0.5 text-[11px] font-mono uppercase tracking-[0.1em] text-ink-3">
            {goal.blurb}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <TierBadge tier={goal.tier} />
            {gate.complete && <Pill tone="success">complete</Pill>}
            {!gate.complete && capstoneDone && <Pill tone="warn">capstone done</Pill>}
            <a
              href={wikiUrl(goal.wiki)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${goal.name} on the RuneScape wiki`}
              className="inline-grid place-items-center w-6 h-6 rounded text-ink-faint hover:text-prayer-bright transition-colors"
            >
              <ExternalLink size={12} />
            </a>
          </div>
        </div>
        <Ring
          pct={gate.pct}
          size={52}
          accent={player.accent}
          label={`${goal.name}: ${Math.round(gate.pct)}% complete for ${player.name}`}
        />
      </div>

      {/* One bar per kind of work. A merged bar would say "68%" without ever
          saying whether what's left is 40 levels or three checkboxes. */}
      {/* Flex, not a fixed grid: a goal with one bucket (Base 50 is all skills)
          gets a full-width bar instead of a lonely third. */}
      <div className="px-4 pb-4 flex flex-col gap-2.5 sm:flex-row sm:gap-4">
        {parts.map((p) => (
          <div key={p.key} className="flex-1 min-w-0">
            <Meter
              label={p.label}
              value={`${doneCount(p.rs)}/${p.rs.length}`}
              pct={(doneCount(p.rs) / p.rs.length) * 100}
              accent={player.accent}
            />
          </div>
        ))}
      </div>

      <details className="group border-t border-line">
        <summary className="flex items-center justify-between gap-3 px-4 min-h-[44px] text-[11px] font-mono uppercase tracking-[0.14em] text-ink-3 hover:text-ink-2 transition-colors">
          <span>
            {gate.complete ? "All requirements met" : `${gate.missing.length} remaining`}
          </span>
          <ChevronDown
            size={14}
            className="shrink-0 transition-transform group-open:rotate-180"
          />
        </summary>

        <div className="px-4 pb-4 pt-1 space-y-5">
          {goal.capstone && (
            <div
              className={clsx(
                "flex items-center gap-3 rounded-md border p-3",
                capstoneDone
                  ? "border-success/30 bg-success/5"
                  : clsx(ACCENT_BORDER[goal.color], "bg-bg-raised/40"),
              )}
            >
              <Trophy
                size={16}
                className={clsx("shrink-0", capstoneDone ? "text-success" : ACCENT_TEXT[goal.color])}
              />
              <span className="min-w-0 flex-1">
                <span className="block text-[10px] font-mono uppercase tracking-[0.16em] text-ink-3">
                  Capstone · final step
                </span>
                <a
                  href={wikiUrl(goal.capstone)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-sm text-ink hover:text-prayer-bright truncate"
                >
                  {goal.capstone}
                </a>
              </span>
              <Pill tone={capstoneDone ? "success" : "neutral"}>
                {capstoneDone ? "done" : "pending"}
              </Pill>
            </div>
          )}

          {prereqs.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-ink-3">
                Builds on
              </span>
              {prereqs.map((pre) => (
                <span
                  key={pre.name}
                  className="inline-flex items-center gap-1.5 h-6 px-2 rounded-md border border-line bg-bg-raised/50 text-[11px] text-ink-2"
                >
                  {pre.name}
                  <span className="font-mono tabular text-ink-faint">
                    {Math.round(pre.pct)}%
                  </span>
                </span>
              ))}
            </div>
          )}

          {missingSkills.length > 0 && (
            <div>
              <BlockLabel
                title="Skills to train"
                count={`${doneCount(b.skills)}/${b.skills.length}`}
              />
              <ul className="divide-y divide-line/60">
                {missingSkills.map((r) => {
                  if (r.req.kind !== "skill") return null;
                  const have = player.skills[r.req.skill]?.level ?? 1;
                  const haveXp = player.skills[r.req.skill]?.xp ?? 0;
                  const gapXp = Math.max(0, xpForLevel(r.req.level) - haveXp);
                  return (
                    <li
                      key={`${r.req.skill}:${r.req.level}`}
                      className="flex items-center gap-2.5 py-1.5 min-h-[44px] sm:min-h-0"
                    >
                      <SkillIcon id={r.req.skill} size={18} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm text-ink-2 truncate">
                          {skillName(r.req.skill)}
                        </span>
                        {r.req.note && (
                          <span className="block text-[10.5px] text-ink-faint truncate">
                            {r.req.note}
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block font-mono tabular text-xs text-ink-3">
                          {have} → {r.req.level}
                        </span>
                        <span className="block font-mono tabular text-[10.5px] text-ink-faint">
                          {fmtCompact(gapXp)} xp
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {b.quests.length > 0 &&
            (goal.phases ? (
              <div>
                <BlockLabel
                  title="Quest chain"
                  count={`${doneCount(b.quests)}/${b.quests.length}`}
                />
                <ol className="space-y-1">
                  {goal.phases.map((phase, i) => (
                    <PhaseRow
                      key={phase.id}
                      index={i + 1}
                      phase={phase}
                      ctx={ctx}
                      accent={player.accent}
                    />
                  ))}
                </ol>
              </div>
            ) : (
              missingQuests.length > 0 && (
                <div>
                  <BlockLabel
                    title="Quests to finish"
                    count={`${doneCount(b.quests)}/${b.quests.length}`}
                  />
                  <ul className="divide-y divide-line/60">
                    {missingQuests.map((r) =>
                      r.req.kind === "quest" ? (
                        <QuestRow key={r.req.title} title={r.req.title} done={false} />
                      ) : null,
                    )}
                  </ul>
                </div>
              )
            ))}

          {missingOther.length > 0 && (
            <div>
              <BlockLabel title="Other" />
              <ReqList results={missingOther} />
            </div>
          )}

          {b.manual.length > 0 && (
            <div>
              <BlockLabel
                title="Track yourself"
                count={`${doneCount(b.manual)}/${b.manual.length}`}
              />
              <div className="divide-y divide-line/60">
                {b.manual.map((r) =>
                  r.req.kind === "manual" ? (
                    // storeKey is the raw requirement id, not a namespaced one:
                    // the evaluator reads ctx.manual[req.id], and these ids are
                    // the keys players already have ticked from the legacy app.
                    <Check
                      key={r.req.id}
                      storeKey={r.req.id}
                      label={r.req.label}
                      hint={r.req.note}
                    />
                  ) : null,
                )}
              </div>
            </div>
          )}
        </div>
      </details>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------

function BlockLabel({ title, count }: { title: string; count?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 mb-1.5">
      <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-ink-3">
        {title}
      </span>
      {count && (
        <span className="font-mono tabular text-[10px] text-ink-faint">{count}</span>
      )}
    </div>
  );
}

function GoalIcon({ goal }: { goal: MajorGoal }) {
  const [broken, setBroken] = useState(false);
  if (!goal.icon || broken) {
    return (
      <span
        className={clsx(
          "grid place-items-center w-9 h-9 shrink-0 rounded-md border bg-bg-raised",
          ACCENT_BORDER[goal.color],
          ACCENT_TEXT[goal.color],
        )}
        aria-hidden="true"
      >
        <Flag size={15} />
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static export, no loader
    <img
      src={iconUrl(goal.icon)}
      width={36}
      height={36}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => setBroken(true)}
      className="w-9 h-9 shrink-0 object-contain"
    />
  );
}

function QuestRow({ title, done }: { title: string; done: boolean }) {
  return (
    <li className="flex items-center gap-2 py-1 min-h-[44px] sm:min-h-0">
      {done ? (
        <CheckIcon size={12} className="shrink-0 text-success" />
      ) : (
        <span className="w-3 text-center shrink-0 text-ink-faint" aria-hidden="true">
          ·
        </span>
      )}
      <a
        href={wikiUrl(title)}
        target="_blank"
        rel="noopener noreferrer"
        className={clsx(
          "text-[13px] truncate transition-colors",
          done
            ? "text-ink-faint line-through decoration-ink-faint"
            : "text-ink-2 hover:text-prayer-bright",
        )}
      >
        {title}
      </a>
    </li>
  );
}

function PhaseRow({
  index,
  phase,
  ctx,
  accent,
}: {
  index: number;
  phase: { id: string; title: string; quests: string[] };
  ctx: EvalContext | undefined;
  accent: Accent;
}) {
  const done = ctx ? phase.quests.filter((q) => ctx.questsDone.has(q)).length : 0;
  const total = phase.quests.length;
  const pct = total ? (done / total) * 100 : 100;
  const complete = done === total;

  return (
    <li>
      <details className="group/phase rounded-md border border-line bg-bg-raised/30">
        <summary className="flex items-center gap-2.5 px-2.5 min-h-[44px] hover:bg-bg-hover/40 rounded-md transition-colors">
          <span
            className={clsx(
              "grid place-items-center w-6 h-6 shrink-0 rounded-full border font-mono text-[10px] tabular",
              complete ? "border-success/40 text-success" : "border-line-strong text-ink-3",
            )}
            aria-hidden="true"
          >
            {index}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] text-ink-2 truncate">{phase.title}</span>
            <span className="block mt-1 h-1 w-full rounded-full bg-bg-raised overflow-hidden">
              <span
                className={clsx("block h-full rounded-full", ACCENT_BG[accent])}
                style={{ width: `${pct}%` }}
              />
            </span>
          </span>
          <span className="shrink-0 font-mono tabular text-[11px] text-ink-3">
            {done}/{total}
          </span>
          <ChevronDown
            size={13}
            className="shrink-0 text-ink-faint transition-transform group-open/phase:rotate-180"
          />
        </summary>
        <ul className="px-2.5 pb-2 divide-y divide-line/50">
          {phase.quests.map((q) => (
            <QuestRow key={q} title={q} done={ctx?.questsDone.has(q) ?? false} />
          ))}
        </ul>
      </details>
    </li>
  );
}

function GoalsSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true">
      <Skeleton className="h-32 w-full" />
      <div className="grid gap-3 lg:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-48 w-full" />
        ))}
      </div>
    </div>
  );
}
