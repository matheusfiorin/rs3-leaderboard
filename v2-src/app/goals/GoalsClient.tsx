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
  PlayerScope,
  ReqList,
  Ring,
  Segmented,
  SkillIcon,
  TierBadge,
  skillName,
} from "@/components/ui";
import { usePlayerData } from "@/components/PlayerDataProvider";
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

/** "1 goal" / "2 goals". A ribbon tile reading "1 GOALS" undermines the rest. */
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

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

/**
 * A solitary card — or the odd last card — spans the full row instead of
 * leaving a card-shaped hole beside it. The Early tier has exactly one goal,
 * and a lone 568px card next to 568px of nothing reads as a failed render.
 */
const SPAN_ODD = "lg:last:odd:col-span-2";

export default function GoalsClient() {
  const { players, contexts, loading, gate } = useEval();
  // Selection is app-wide and persisted, not page-local: picking a player on
  // /pvm and navigating here used to silently snap back to the first player.
  const { selected, setSelected } = usePlayerData();
  const [tier, setTier] = useState<TierFilter>("all");

  const player = selected ?? players[0];
  const slug = player?.slug ?? "";

  /**
   * Tier + overall rollups for the SELECTED player only.
   *
   * These were averaged across every player while every card underneath was
   * for one player, so a section headed "MID GAME — 51%" sat above cards
   * reading 93% and 90%, and nothing moved when you switched player. One
   * number, one owner.
   */
  const progress = useMemo(() => {
    const roll = (goals: MajorGoal[]) => {
      let sum = 0;
      let done = 0;
      for (const g of goals) {
        const res = gate(slug, g.requirements);
        sum += res.pct;
        if (res.complete) done++;
      }
      return { pct: goals.length ? sum / goals.length : 0, done, total: goals.length };
    };
    const out: Record<string, { pct: number; done: number; total: number }> = {
      all: roll(MAJOR_GOALS),
    };
    for (const t of TIERS) out[t] = roll(goalsByTier(t));
    return out;
  }, [slug, gate]);

  const ctx = player ? contexts[player.slug] : undefined;
  const closest = ctx ? nextGoals(ctx, 1)[0] : undefined;

  if (!player) {
    return (
      <div className="space-y-6">
        <SectionHead as="h1" title="Goals" hint="Major campaigns" />
        <EmptyState title="No players loaded" hint="Player data has not arrived yet." />
      </div>
    );
  }

  const shownTiers = TIERS.filter((t) => tier === "all" || t === tier);

  // The hero repeats a campaign that also has a full card in the tier list. When
  // that card is the very next thing on screen, the two render back to back and
  // read as a double paint — so the hero stands down and the card below carries
  // the "closest" pill instead. Filtered to another tier, they are far apart and
  // the hero still earns its place.
  const firstBelow = shownTiers.length ? goalsByTier(shownTiers[0])[0] : undefined;
  const heroDuplicatesFirstCard =
    closest !== undefined && firstBelow !== undefined && closest.item.id === firstBelow.id;

  return (
    <div className="space-y-6">
      <SectionHead
        as="h1"
        title="Goals"
        hint={plural(MAJOR_GOALS.length, "major campaign")}
        right={
          loading ? (
            <Skeleton className="h-5 w-24" />
          ) : (
            <Pill tone={progress.all.done ? "success" : "neutral"}>
              {progress.all.done} / {MAJOR_GOALS.length} done
            </Pill>
          )
        }
      />

      {/* Switcher first, then the ribbon it governs — the tiles used to sit
          above the switcher, which read as "these are not affected by it". */}
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <Segmented
            ariaLabel="Player"
            options={players.map((p) => ({ value: p.slug, label: p.name }))}
            value={player.slug}
            onChange={setSelected}
          />
          {/* No second "% overall" figure here: it was the same number as the
              "All" tile's ring, and two identical percentages 200px apart read
              as two different measurements. */}
          <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink-3">
            Tier progress · {player.name}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <TierTile
            label="All"
            hint={plural(MAJOR_GOALS.length, "goal")}
            pct={progress.all.pct}
            accent={player.accent}
            who={player.name}
            active={tier === "all"}
            loading={loading}
            onClick={() => setTier("all")}
          />
          {TIERS.map((t) => (
            <TierTile
              key={t}
              label={TIER_LABEL[t]}
              hint={plural(goalsByTier(t).length, "goal")}
              pct={progress[t].pct}
              accent={player.accent}
              who={player.name}
              active={tier === t}
              loading={loading}
              onClick={() => setTier(tier === t ? "all" : t)}
            />
          ))}
        </div>
      </div>

      {loading ? (
        <GoalsSkeleton />
      ) : (
        // Everything below belongs to one player, so every <Check> inside it
        // writes to that player's namespace. Without this, ticking "Ice Gloves
        // obtained" for Soclopata also ticked it for Decxus.
        <PlayerScope slug={player.slug}>
          {!closest ? (
            <Card accent={player.accent} className="p-5">
              <p className="font-display italic text-lg text-ink">
                Every campaign complete.
              </p>
              <p className="mt-1 text-sm text-ink-3">
                {player.name} has cleared all {MAJOR_GOALS.length} goals.
              </p>
            </Card>
          ) : heroDuplicatesFirstCard ? null : (
            <Card accent={player.accent} className="p-4 sm:p-5">
              <div className="flex items-center gap-4">
                <Ring
                  pct={closest.gate.pct}
                  size={64}
                  stroke={5}
                  accent={player.accent}
                  label={`${closest.item.name}: ${Math.round(closest.gate.pct)}% complete for ${player.name}`}
                />
                <div className="min-w-0">
                  <p className="text-[10px] font-mono uppercase tracking-[0.16em] text-ink-3">
                    Closest campaign · {player.name}
                  </p>
                  <h2 className="font-display italic text-xl leading-tight text-ink truncate">
                    {closest.item.name}
                  </h2>
                  <p className="mt-0.5 text-xs text-ink-3">
                    {plural(closest.gate.missing.length, "requirement")} left
                  </p>
                </div>
              </div>
              <div className="mt-3">
                <ReqList results={closest.gate.missing} limit={6} />
              </div>
            </Card>
          )}

          {shownTiers.map((t) => (
            <section key={t} className="space-y-3">
              <h2 className="flex items-center gap-2.5">
                <TierBadge tier={t} />
                <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">
                  {TIER_LABEL[t]} game
                </span>
                {/* Kept next to its own label rather than flung to the far
                    right of an empty grid row. */}
                <span className="font-mono tabular text-[11px] text-ink-3">
                  {Math.round(progress[t].pct)}%
                  <span className="sr-only"> complete for {player.name}</span>
                </span>
                <span className="flex-1 h-px bg-line" aria-hidden="true" />
              </h2>
              {/* items-start: an expanded card must not stretch its collapsed
                  neighbour into 300px of empty surface. */}
              <div className="grid gap-3 items-start lg:grid-cols-2">
                {goalsByTier(t).map((g) => (
                  <GoalCard
                    key={g.id}
                    className={SPAN_ODD}
                    goal={g}
                    closest={g.id === closest?.item.id}
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
        </PlayerScope>
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
  accent,
  who,
  active,
  loading,
  onClick,
}: {
  label: string;
  hint: string;
  pct: number;
  accent: Accent;
  /** Whose progress this is — the tiles are player-scoped, so say so. */
  who: string;
  active: boolean;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={clsx(
        "flex items-center gap-3 min-h-[64px] px-3 py-2.5 rounded-lg border text-left transition-colors",
        active
          ? clsx(ACCENT_BORDER[accent], "bg-bg-raised")
          : "border-line bg-bg-surface hover:border-line-strong",
      )}
    >
      {loading ? (
        <Skeleton className="w-10 h-10 rounded-full shrink-0" />
      ) : (
        // The selected player's accent: this is their progress, not a
        // household average wearing a neutral colour.
        <Ring
          pct={pct}
          size={40}
          stroke={3}
          accent={accent}
          label={`${label}: ${Math.round(pct)}% complete for ${who}`}
        />
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
  closest,
  className,
}: {
  goal: MajorGoal;
  player: PlayerSummary;
  ctx: EvalContext | undefined;
  gate: GateResult;
  /** Earlier campaigns this one contains, with the same player's progress. */
  prereqs: { name: string; pct: number }[];
  /** This is the campaign the hero calls out — marked so the label survives
   *  even when the hero stands down to avoid rendering it twice. */
  closest?: boolean;
  className?: string;
}) {
  const b = bucket(gate);
  const capstoneDone = goal.capstone ? (ctx?.questsDone.has(goal.capstone) ?? false) : false;
  const missingQuests = b.quests.filter((r) => !r.met);
  const missingSkills = b.skills.filter((r) => !r.met);
  const missingOther = b.other.filter((r) => !r.met);

  // Deliberately NOT goal.color. soul/prayer/ash are the player-identity
  // palette everywhere else in the app, so a blue-striped card on a red
  // player's page read as "this belongs to the other account". Goals are
  // separated by tier badge and icon; colour here means "whose page is this".
  const accent = player.accent;

  const parts: { key: string; label: string; rs: RequirementResult[] }[] = [
    { key: "skills", label: "Skills", rs: b.skills },
    { key: "quests", label: "Quests", rs: b.quests },
    { key: "manual", label: "Manual", rs: b.manual },
    { key: "other", label: "Other", rs: b.other },
  ].filter((p) => p.rs.length > 0);

  return (
    <Card
      accent={accent}
      className={clsx("overflow-hidden", gate.complete && "opacity-80", className)}
    >
      <div className="flex items-start gap-3 p-4">
        <GoalIcon goal={goal} accent={accent} />
        <div className="min-w-0 flex-1">
          <h3 className="font-display italic text-lg leading-tight text-ink">
            {goal.name}
          </h3>
          <p className="mt-0.5 text-[11px] font-mono uppercase tracking-[0.1em] text-ink-3">
            {goal.blurb}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <TierBadge tier={goal.tier} />
            {closest && !gate.complete && (
              <Pill tone={accent}>closest · {player.name}</Pill>
            )}
            {gate.complete && <Pill tone="success">complete</Pill>}
            {!gate.complete && capstoneDone && <Pill tone="warn">capstone done</Pill>}
            <a
              href={wikiUrl(goal.wiki)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${goal.name} on the RuneScape wiki`}
              className="inline-grid place-items-center w-6 h-6 rounded text-ink-3 hover:text-prayer-bright transition-colors"
            >
              <ExternalLink size={12} />
            </a>
          </div>
        </div>
        <Ring
          pct={gate.pct}
          size={52}
          accent={accent}
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
              accent={accent}
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

        {/* A container, not a viewport, drives the inner column counts: this
            card is ~340px wide in a two-up grid at 1024 and ~1120px wide when
            it spans the row at 1440, so `xl:` would be measuring the wrong
            box. */}
        <div className="px-4 pb-4 pt-1 space-y-5 @container">
          {goal.capstone && (
            <div
              className={clsx(
                "flex items-center gap-3 rounded-md border p-3",
                capstoneDone
                  ? "border-success/30 bg-success/5"
                  : clsx(ACCENT_BORDER[accent], "bg-bg-raised/40"),
              )}
            >
              <Trophy
                size={16}
                className={clsx("shrink-0", capstoneDone ? "text-success" : ACCENT_TEXT[accent])}
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
                  className="inline-flex items-center gap-1.5 min-h-6 px-2 py-0.5 rounded-md border border-line bg-bg-raised/50 text-[11px] text-ink-2"
                >
                  {pre.name}
                  <span className="font-mono tabular text-ink-3">
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
              {/* Columns rather than one 1100px-wide row per skill: a full-span
                  card would otherwise stretch "Attack" and "63 → 76" to
                  opposite edges of the card. */}
              <ul className="grid gap-x-6 @md:grid-cols-2 @2xl:grid-cols-3">
                {missingSkills.map((r) => {
                  if (r.req.kind !== "skill") return null;
                  const have = player.skills[r.req.skill]?.level ?? 1;
                  const haveXp = player.skills[r.req.skill]?.xp ?? 0;
                  const gapXp = Math.max(0, xpForLevel(r.req.level) - haveXp);
                  return (
                    <li
                      key={`${r.req.skill}:${r.req.level}`}
                      className="flex items-center gap-2.5 py-1.5 min-h-[44px] sm:min-h-0 border-b border-line/60"
                    >
                      <SkillIcon id={r.req.skill} size={18} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm text-ink-2 truncate">
                          {skillName(r.req.skill)}
                        </span>
                        {r.req.note && (
                          <span className="block text-[10.5px] text-ink-3 truncate">
                            {r.req.note}
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block font-mono tabular text-xs text-ink-2">
                          {have} → {r.req.level}
                        </span>
                        <span className="block font-mono tabular text-[10.5px] text-ink-3">
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
                      accent={accent}
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
                  <ul className="grid gap-x-6 @md:grid-cols-2 @2xl:grid-cols-3">
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
              <div className="grid gap-x-6 @md:grid-cols-2">
                {b.manual.map((r) =>
                  r.req.kind === "manual" ? (
                    // storeKey is the bare requirement id; the surrounding
                    // <PlayerScope> namespaces the write to this player and
                    // useEval's scopeManual un-prefixes it again for the
                    // evaluator, so ctx.manual[req.id] still resolves.
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
    <div className="flex items-baseline gap-2 mb-1.5">
      <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-ink-3">
        {title}
      </span>
      {count && (
        <span className="font-mono tabular text-[10px] text-ink-3">{count}</span>
      )}
    </div>
  );
}

function GoalIcon({ goal, accent }: { goal: MajorGoal; accent: Accent }) {
  const [broken, setBroken] = useState(false);
  if (!goal.icon || broken) {
    return (
      <span
        className={clsx(
          "grid place-items-center w-9 h-9 shrink-0 rounded-md border bg-bg-raised",
          ACCENT_BORDER[accent],
          ACCENT_TEXT[accent],
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
    // A rule per row: the lists these sit in are column grids now, where
    // `divide-y` would draw borders in DOM order instead of visual order.
    <li className="flex items-center gap-2 py-1 min-h-[44px] sm:min-h-0 border-b border-line/50">
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
            ? "text-ink-3 line-through decoration-ink-faint"
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
            className="shrink-0 text-ink-3 transition-transform group-open/phase:rotate-180"
          />
        </summary>
        <ul className="px-2.5 pb-2 grid gap-x-6 @md:grid-cols-2 @2xl:grid-cols-3">
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
      <div className="grid gap-3 items-start lg:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-48 w-full" />
        ))}
      </div>
    </div>
  );
}
