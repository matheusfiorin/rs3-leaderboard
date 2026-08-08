"use client";

import { useMemo, useState } from "react";
import { clsx } from "clsx";
import { ExternalLink } from "lucide-react";
import { Card, Pill, SectionHead, Skeleton } from "@/components/primitives";
import {
  ACCENT_TEXT,
  Check,
  PlayerScope,
  ReqList,
  Ring,
  Segmented,
  SkillIcon,
  TierBadge,
} from "@/components/ui";
import { usePlayerData } from "@/components/PlayerDataProvider";
import { useEval } from "@/components/useEval";
import { CAPES, capeProgress, skillCapes, type CapeEntry } from "@/lib/content/capes";
import { fmt, fmtCompact } from "@/lib/format";
import { wikiUrl } from "@/lib/paths";
import type { EvalContext } from "@/lib/requirements";
import { SKILLS, xpForLevel } from "@/lib/skills";
import type { Accent, GateResult, PlayerSummary } from "@/lib/types";

// ---------------------------------------------------------------------------
// Static indexes, built once from the content module.
//
// Deriving the master-cape skill set from skillCapes() instead of re-listing
// the seven ids keeps this page correct if a future update mints another
// master cape — capes.ts stays the single source of truth.
// ---------------------------------------------------------------------------

interface SkillCapePair {
  cape?: CapeEntry;
  master?: CapeEntry;
}

const SKILL_CAPE_INDEX: Map<number, SkillCapePair> = (() => {
  const map = new Map<number, SkillCapePair>();
  for (const c of skillCapes()) {
    const r = c.requirements[0];
    if (r?.kind !== "skill") continue;
    const pair = map.get(r.skill) ?? {};
    if (c.category === "master") pair.master = c;
    else pair.cape = c;
    map.set(r.skill, pair);
  }
  return map;
})();

/** Skill id -> master cape level, for the seven skills that have one. */
const MASTER_LEVEL: Map<number, number> = (() => {
  const map = new Map<number, number>();
  for (const c of skillCapes()) {
    const r = c.requirements[0];
    if (c.category === "master" && r?.kind === "skill") map.set(r.skill, r.level);
  }
  return map;
})();

const MASTER_SKILLS = SKILLS.filter((s) => MASTER_LEVEL.has(s.id));

/** Headline order — the capes people actually plan a year around, first. */
const BIG_ORDER = [
  "cape-max",
  "cape-quest-point",
  "cape-master-quest",
  "cape-completionist",
  "cape-trimmed-completionist",
  "milestone-all-master-capes",
  "milestone-total-cap",
  "milestone-200m-first",
  "milestone-200m-all",
];

const BIG_CAPES: CapeEntry[] = CAPES.filter(
  (c) => c.category !== "skill" && c.category !== "master",
).sort((a, b) => (BIG_ORDER.indexOf(a.id) + 1 || 99) - (BIG_ORDER.indexOf(b.id) + 1 || 99));

type Filter = "all" | "skill" | "master" | "quest" | "completionist" | "milestone";

const count = (cat: CapeEntry["category"]) =>
  CAPES.filter((c) => c.category === cat).length;

const FILTERS: { value: Filter; label: string; count: number }[] = [
  { value: "all", label: "All", count: CAPES.length },
  { value: "skill", label: "Skill", count: count("skill") },
  { value: "master", label: "Master", count: count("master") },
  { value: "quest", label: "Quest", count: count("quest") },
  { value: "completionist", label: "Comp", count: count("completionist") },
  { value: "milestone", label: "Milestone", count: count("milestone") },
];

const CATEGORY_LABEL: Record<CapeEntry["category"], string> = {
  skill: "Skill cape",
  master: "Master cape",
  quest: "Quest",
  completionist: "Completionist",
  milestone: "Milestone",
};

// ---------------------------------------------------------------------------
// "Closest capes" — ranked by work left, not by percent done
//
// The old ranking used gate.pct, the mean per-requirement progress. That put
// "Every skill at its cap" — one aggregate requirement, total level 1678/3283,
// 51% — above a Herblore cape sitting at 80/99 (16%), i.e. it presented the
// hardest goal in the game as the nearest one. Percent-done is the wrong axis
// for "what do I do next"; what is still owed is the right one.
//
// Distance is measured in real XP for every requirement that has an XP price
// and in "steps" for the ones that do not (a quest, a self-reported tick).
// Sorting needs one scalar, so a step is priced at STEP_XP — but that exchange
// rate is never rendered: the cards print XP and steps separately, so nothing
// the user reads depends on the fudge.
// ---------------------------------------------------------------------------

/**
 * One outstanding quest or achievement, priced as roughly a late-game level of
 * grind. Zero would float a cape whose gate is a 300-quest catch-all above one
 * you are a single level from; a huge value would bury the quest capes forever.
 */
const STEP_XP = 4_000_000;

interface CapeDistance {
  item: CapeEntry;
  gate: GateResult;
  /** Real XP still owed by the skill / total-level requirements. */
  xp: number;
  /** Quests and self-reported ticks still outstanding. */
  steps: number;
  /** Sort key only — deliberately never displayed. */
  cost: number;
}

const skillXp = (player: PlayerSummary, id: number) => player.skills[id]?.xp ?? 0;

/**
 * XP behind a total-level target: what every skill still owes toward its own
 * cap, pro-rated to the share of those levels the target actually asks for.
 * For "Every skill at its cap" the share is 1, so the answer is exact.
 */
function totalLevelXp(player: PlayerSummary, target: number): number {
  let levelsLeft = 0;
  let xpLeft = 0;
  for (const s of SKILLS) {
    levelsLeft += Math.max(0, s.max - (player.skills[s.id]?.level ?? 1));
    xpLeft += Math.max(0, xpForLevel(s.max) - skillXp(player, s.id));
  }
  if (levelsLeft <= 0) return 0;
  return xpLeft * Math.min(1, Math.max(0, target - player.totalLevel) / levelsLeft);
}

function distanceOf(
  item: CapeEntry,
  gate: GateResult,
  player: PlayerSummary,
): CapeDistance {
  let xp = 0;
  let steps = 0;
  for (const r of gate.missing) {
    switch (r.req.kind) {
      case "skill":
        xp += Math.max(0, xpForLevel(r.req.level) - skillXp(player, r.req.skill));
        break;
      case "stat":
        if (r.req.stat === "totalLevel") xp += totalLevelXp(player, r.req.value);
        else steps += 1;
        break;
      default:
        steps += 1;
    }
  }
  return { item, gate, xp, steps, cost: xp + steps * STEP_XP };
}

/**
 * Unearned capes, least work left first.
 *
 * Capes whose entire remaining gate is self-reported — Max XP, First 200M, the
 * trimmed cape — are dropped rather than ranked: a lone manual tick carries no
 * distance, so on any effort metric they read as one step from done. They are
 * still fully present in "Long goals" below, which is where they belong.
 */
function rankByRemainingWork(ctx: EvalContext, limit: number): CapeDistance[] {
  return CAPES.map((c) => distanceOf(c, capeProgress(c, ctx), ctx.player))
    .filter(
      (d) => !d.gate.complete && d.gate.missing.some((r) => r.req.kind !== "manual"),
    )
    .sort((a, b) => a.cost - b.cost || a.item.name.localeCompare(b.item.name))
    .slice(0, limit);
}

/** Honest, unweighted summary of what is left. Never shows the STEP_XP rate. */
function workLeft(d: CapeDistance): string {
  const bits: string[] = [];
  if (d.xp >= 1) bits.push(`${fmtCompact(Math.round(d.xp))} xp`);
  if (d.steps > 0) bits.push(`${d.steps} step${d.steps === 1 ? "" : "s"}`);
  return bits.length ? `${bits.join(" · ")} to go` : "—";
}

// ---------------------------------------------------------------------------

export default function CapesClient() {
  const { contexts, loading } = useEval();
  // Player selection is shared and persisted across routes, so it lives in the
  // provider rather than in this page's state.
  const { players, selected, setSelected } = usePlayerData();
  const [filter, setFilter] = useState<Filter>("all");

  const active: PlayerSummary | undefined = selected ?? players[0];

  // Both players' headline numbers — the header compares them, so it can't
  // read off the selected player alone.
  const summaries = useMemo(
    () =>
      players.map((p) => {
        const ctx = contexts[p.slug];
        if (!ctx) return { player: p, earned: 0, next: null };
        const earned = CAPES.filter((c) => capeProgress(c, ctx).complete).length;
        return { player: p, earned, next: rankByRemainingWork(ctx, 1)[0] ?? null };
      }),
    [players, contexts],
  );

  const ctx = active ? contexts[active.slug] : undefined;

  const closest = useMemo(() => (ctx ? rankByRemainingWork(ctx, 6) : []), [ctx]);

  const bigCards = useMemo(() => {
    if (!ctx) return [];
    return BIG_CAPES.filter(
      (c) => filter === "all" || c.category === filter,
    ).map((cape) => ({ cape, gate: capeProgress(cape, ctx) }));
  }, [ctx, filter]);

  // Skill-cape tallies come straight off the profile, so they stay honest even
  // while the quest lists are still in flight.
  const skillTally = useMemo(() => {
    let capes = 0;
    let masters = 0;
    for (const s of SKILLS) {
      const lvl = active?.skills[s.id]?.level ?? 1;
      if (lvl >= 99) capes++;
      const m = MASTER_LEVEL.get(s.id);
      if (m && lvl >= m) masters++;
    }
    return { capes, masters };
  }, [active]);

  const showSkillGrid = filter === "all" || filter === "skill" || filter === "master";
  const masterOnly = filter === "master";
  const gridSkills = masterOnly ? MASTER_SKILLS : SKILLS;

  if (!active) {
    return (
      <div className="space-y-6">
        <SectionHead
          as="h1"
          title="Capes"
          hint="Capes of Accomplishment · completionist track"
        />
        <Skeleton className="h-40" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <SectionHead
        as="h1"
        title="Capes"
        hint={`${CAPES.length} capes and milestones`}
        right={
          <Pill tone="ash">
            {skillTally.capes} / {SKILLS.length} skill
          </Pill>
        }
      />

      {/* Headline — where each player stands, and what falls next. The measure
          is capped instead of stretched: two 700px-wide cards holding a ring and
          three short lines is dead space, not layout. */}
      <div className="grid gap-3 sm:grid-cols-2 xl:max-w-[860px]">
        {summaries.map((s) => (
          <PlayerHeader key={s.player.slug} {...s} pending={loading} />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          ariaLabel="Player"
          options={players.map((p) => ({ value: p.slug, label: p.name }))}
          value={active.slug}
          onChange={setSelected}
        />
        <Segmented
          ariaLabel="Cape category"
          size="sm"
          options={FILTERS}
          value={filter}
          onChange={setFilter}
        />
      </div>

      {/* Closest capes */}
      <section>
        <SubHead
          title="Closest capes"
          hint={`${active.name} · ranked by work left, not percent done`}
        />
        {loading ? (
          <div className="grid items-start gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-[132px]" />
            ))}
          </div>
        ) : closest.length === 0 ? (
          <p className="text-sm text-ink-3">Every cape earned. There is nothing left.</p>
        ) : (
          // items-start: one card with ten requirement chips used to set the row
          // height for three cards with two, leaving half of each box empty.
          //
          // Four columns is the ceiling. A sixth column made 223px cards, whose
          // 191px content box cannot hold a "Construction 9969 / 99" chip (189px
          // squeezed, 195px at rest) — one more character and every requirement
          // chip breaks onto two lines. Four columns leaves ~247px of chip room.
          <div className="grid items-start gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {closest.map((d) => (
              <ClosestCard key={d.item.id} distance={d} accent={active.accent} />
            ))}
          </div>
        )}
      </section>

      {/* Skill capes — the dense grid */}
      {showSkillGrid && (
        <section>
          <SubHead
            title={masterOnly ? "Master capes" : "Skill capes"}
            hint={
              masterOnly
                ? `${skillTally.masters} / ${MASTER_SKILLS.length} at 120`
                : `${skillTally.capes} / ${SKILLS.length} at 99 · ${skillTally.masters} / ${MASTER_SKILLS.length} master`
            }
          />
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10">
            {gridSkills.map((s) => (
              <SkillCapeTile
                key={s.id}
                skillId={s.id}
                name={s.key}
                level={active.skills[s.id]?.level ?? 1}
                xp={active.skills[s.id]?.xp ?? 0}
                accent={active.accent}
                forceMaster={masterOnly}
              />
            ))}
          </div>
        </section>
      )}

      {/* Big-ticket capes */}
      {bigCards.length > 0 && (
        <section>
          <SubHead
            title="Long goals"
            hint={`${active.name} · manual ticks are saved per player`}
          />
          {/* Names, blurbs, rewards, the manual checklists and the wiki links
              are all static, so these cards render into the HTML immediately;
              only the ring, the met tally and the "still missing" chips wait on
              the quest lists.

              Every Check below writes into the selected player's namespace,
              which is the same namespace the gates above are evaluated from. */}
          <PlayerScope slug={active.slug}>
            {/* Columns, not a grid. These cards run from 232px (one manual
                tick) to 740px (the trimmed comp checklist), so a 3-track grid
                spent 1100px on empty card bottoms — 1653px tall to hold
                1426px of cards. Stretching only moves that void inside the
                border. Multicol packs them, and because flow order is
                top-to-bottom then across, the BIG_ORDER priority still reads
                in order. break-inside-avoid keeps a card whole. */}
            <div className="columns-1 gap-x-4 lg:columns-2 2xl:columns-3">
              {bigCards.map(({ cape, gate }) => (
                <div key={cape.id} className="mb-4 break-inside-avoid">
                  <BigCapeCard
                    cape={cape}
                    gate={gate}
                    accent={active.accent}
                    pending={loading}
                  />
                </div>
              ))}
            </div>
          </PlayerScope>
        </section>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------

function SubHead({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-3">
      <h3 className="font-display italic text-lg leading-none tracking-tight text-ink">
        {title}
      </h3>
      {hint && (
        <p className="mt-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">
          {hint}
        </p>
      )}
    </div>
  );
}

function PlayerHeader({
  player,
  earned,
  next,
  pending,
}: {
  player: PlayerSummary;
  earned: number;
  next: CapeDistance | null;
  /** Quest lists still loading, so `earned` and `next` are not yet true. */
  pending: boolean;
}) {
  const pct = (earned / CAPES.length) * 100;
  return (
    <Card accent={player.accent} className="p-4">
      <div className="flex items-center gap-4">
        {/* No children — Ring's own centre already prints the % with its unit,
            except while pending, where an unknown tally is not 0%. */}
        <Ring
          pct={pending ? 0 : pct}
          size={60}
          stroke={5}
          accent={player.accent}
          label={
            pending
              ? `${player.name}: counting capes earned`
              : `${player.name}: ${earned} of ${CAPES.length} capes earned`
          }
        >
          {pending ? (
            <span
              className="font-mono text-[11px] font-bold text-ink-3"
              aria-hidden="true"
            >
              …
            </span>
          ) : undefined}
        </Ring>
        <div className="min-w-0">
          <div
            className={clsx(
              "font-mono text-[11px] uppercase tracking-[0.14em]",
              ACCENT_TEXT[player.accent],
            )}
          >
            {player.name}
          </div>
          <div className="font-mono tabular text-xl font-bold text-ink">
            {pending ? <span className="text-ink-3">—</span> : earned}
            <span className="text-ink-3"> / {CAPES.length}</span>
          </div>
          <p className="mt-0.5 truncate text-[11px] text-ink-3">
            {pending
              ? "checking requirements…"
              : next
                ? `Next: ${next.item.name} · ${workLeft(next)}`
                : "Everything earned"}
          </p>
        </div>
      </div>
    </Card>
  );
}

function ClosestCard({
  distance,
  accent,
}: {
  distance: CapeDistance;
  accent: Accent;
}) {
  const { item: cape, gate } = distance;
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <Ring
          pct={gate.pct}
          size={48}
          stroke={4}
          accent={accent}
          label={`${cape.name}: ${Math.round(gate.pct)}% complete, ${workLeft(distance)}`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Wraps rather than truncates — the name is the whole point. */}
            <h4 className="text-sm text-ink">{cape.name}</h4>
            <TierBadge tier={cape.tier} />
          </div>
          {/* The ranked quantity, spelled out. */}
          <p className="mt-1 font-mono tabular text-[11.5px] font-bold text-ink-2">
            {workLeft(distance)}
          </p>
          <p className="mt-0.5 font-mono text-[10.5px] uppercase tracking-wider text-ink-3">
            {gate.met.length} / {gate.results.length} met
          </p>
        </div>
      </div>
      <div className="mt-3">
        <ReqList results={gate.missing} limit={3} />
      </div>
    </Card>
  );
}

/**
 * One skill's cape progress.
 *
 * The target moves to the master cape level only once 99 is banked — showing a
 * level-40 Slayer as "40 / 120" would misrepresent which cape is actually next.
 */
function SkillCapeTile({
  skillId,
  name,
  level,
  xp,
  accent,
  forceMaster,
}: {
  skillId: number;
  name: string;
  level: number;
  xp: number;
  accent: Accent;
  forceMaster: boolean;
}) {
  const pair = SKILL_CAPE_INDEX.get(skillId);
  const masterLevel = MASTER_LEVEL.get(skillId);
  const chasingMaster = Boolean(masterLevel) && (forceMaster || level >= 99);
  const target = chasingMaster && masterLevel ? masterLevel : 99;
  const done = level >= target;

  const targetXp = xpForLevel(target);
  const remaining = Math.max(0, targetXp - xp);
  // The arc used to encode XP-toward-target while the number under it read
  // "61 / 99": at level 61 that is a 2.5% arc, a 3px tick at 12 o'clock that
  // looks like a notification dot rather than two thirds of the way up a level
  // bar. Arc and number now measure the same thing; the XP truth moves to the
  // line below and the tooltip, where it can be read exactly.
  const pct = done ? 100 : Math.min(100, (level / target) * 100);

  const entry = chasingMaster ? pair?.master : pair?.cape;
  const label = `${name} — level ${level} of ${target}${done ? ", earned" : ""}`;

  return (
    <a
      href={wikiUrl(entry?.wiki ?? `${name} cape`)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={done ? label : `${label}, ${fmt(remaining)} XP to go`}
      title={done ? `${label} ✓` : `${label} · ${fmt(remaining)} XP to ${target}`}
      className={clsx(
        "flex min-h-[44px] flex-col items-center gap-1.5 rounded-lg border px-1 py-3 transition-colors",
        done
          ? "border-success/25 bg-success/5 hover:border-success/40"
          : "border-line bg-bg-surface hover:border-line-strong hover:bg-bg-raised/40",
      )}
    >
      <Ring pct={pct} size={44} stroke={3} accent={accent} label={label}>
        <SkillIcon id={skillId} size={18} />
      </Ring>
      <span className="font-mono tabular text-[11px] font-bold leading-none">
        <span className={done ? "text-success" : "text-ink"}>{level}</span>
        {!done && <span className="text-ink-3">/{target}</span>}
      </span>
      <span className="w-full truncate px-1 text-center text-[10px] leading-none text-ink-3">
        {name}
      </span>
      {/* The XP the ring no longer encodes, on screen instead of in a tooltip
          nobody on a phone can open. */}
      <span
        className={clsx(
          "w-full truncate px-1 text-center font-mono text-[10px] leading-none",
          done ? "text-success/80" : "text-ink-3",
        )}
      >
        {done ? "earned" : `${fmtCompact(remaining)} xp`}
      </span>
    </a>
  );
}

function BigCapeCard({
  cape,
  gate,
  accent,
  pending,
}: {
  cape: CapeEntry;
  gate: GateResult;
  accent: Accent;
  /** Quest lists still loading — the gate is not yet a true reading. */
  pending: boolean;
}) {
  const manual = gate.results.filter((r) => r.req.kind === "manual");
  // Only the automatically-evaluated gaps go in the chip list; the manual ones
  // are rendered below as checkboxes so they can actually be ticked off.
  const trackedMissing = gate.results.filter((r) => r.req.kind !== "manual" && !r.met);
  const earned = !pending && gate.complete;

  return (
    <Card
      accent={earned ? undefined : accent}
      className={clsx("p-5", earned && "border-success/25")}
    >
      <div className="flex items-start gap-4">
        <Ring
          pct={pending ? 0 : gate.pct}
          size={60}
          stroke={5}
          accent={accent}
          label={
            pending
              ? `${cape.name}: requirements still loading`
              : `${cape.name}: ${Math.round(gate.pct)}% complete`
          }
        >
          {pending ? (
            <span
              className="font-mono text-[11px] font-bold text-ink-3"
              aria-hidden="true"
            >
              …
            </span>
          ) : undefined}
        </Ring>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-display italic text-lg leading-none tracking-tight text-ink">
              {cape.name}
            </h4>
            <TierBadge tier={cape.tier} />
            {earned && <Pill tone="success">Earned</Pill>}
          </div>
          <p className="mt-1 font-mono text-[10.5px] uppercase tracking-wider text-ink-3">
            {CATEGORY_LABEL[cape.category]} ·{" "}
            {pending
              ? `${gate.results.length} requirements`
              : `${gate.met.length} / ${gate.results.length} met`}
          </p>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-2">{cape.blurb}</p>
        </div>
      </div>

      {cape.reward && (
        <p className="mt-4 rounded-md border border-ash/25 bg-ash/5 px-3 py-2 text-[12px] text-ash-bright">
          {cape.reward}
        </p>
      )}

      {pending ? (
        <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">
          Checking requirements…
        </p>
      ) : (
        trackedMissing.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">
              Still missing
            </p>
            <ReqList results={trackedMissing} limit={8} />
          </div>
        )
      )}

      {manual.length > 0 && (
        <div className="mt-4 border-t border-line pt-3">
          <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">
            Track yourself
          </p>
          <div className="divide-y divide-line">
            {manual.map((r) =>
              r.req.kind === "manual" ? (
                <Check
                  key={r.req.id}
                  storeKey={r.req.id}
                  label={r.req.label}
                  hint={r.req.note}
                />
              ) : null,
            )}
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-ink-3">
            This is a curated subset — the full checklist runs to several hundred
            achievements and changes with every update.{" "}
            <a
              href={wikiUrl(cape.wiki)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-ink-3 underline decoration-line-strong underline-offset-2 hover:text-ink-2"
            >
              Full list on the wiki
              <ExternalLink size={10} aria-hidden="true" />
            </a>
          </p>
        </div>
      )}

      {manual.length === 0 && (
        <a
          href={wikiUrl(cape.wiki)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-ink-3 hover:text-ink-2"
        >
          Wiki
          <ExternalLink size={11} aria-hidden="true" />
        </a>
      )}
    </Card>
  );
}
