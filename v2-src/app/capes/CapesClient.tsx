"use client";

import { useMemo, useState } from "react";
import { clsx } from "clsx";
import { ExternalLink } from "lucide-react";
import { Card, Pill, SectionHead, Skeleton } from "@/components/primitives";
import {
  ACCENT_TEXT,
  Check,
  ReqList,
  Ring,
  Segmented,
  SkillIcon,
  TierBadge,
} from "@/components/ui";
import { useEval } from "@/components/useEval";
import {
  CAPES,
  capeProgress,
  nextCapes,
  skillCapes,
  type CapeEntry,
} from "@/lib/content/capes";
import { fmt } from "@/lib/format";
import { wikiUrl } from "@/lib/paths";
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

export default function CapesClient() {
  const { players, contexts, loading } = useEval();
  const [slug, setSlug] = useState<string>("");
  const [filter, setFilter] = useState<Filter>("all");

  const active: PlayerSummary | undefined =
    players.find((p) => p.slug === slug) ?? players[0];

  // Both players' headline numbers — the header compares them, so it can't
  // read off the selected player alone.
  const summaries = useMemo(
    () =>
      players.map((p) => {
        const ctx = contexts[p.slug];
        if (!ctx) return { player: p, earned: 0, next: null };
        const earned = CAPES.filter((c) => capeProgress(c, ctx).complete).length;
        return { player: p, earned, next: nextCapes(ctx, 1)[0] ?? null };
      }),
    [players, contexts],
  );

  const ctx = active ? contexts[active.slug] : undefined;

  const closest = useMemo(() => (ctx ? nextCapes(ctx, 4) : []), [ctx]);

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
        <SectionHead title="Capes" hint="Capes of Accomplishment · completionist track" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <SectionHead
        title="Capes"
        hint={`${CAPES.length} capes and milestones`}
        right={
          <Pill tone="ash">
            {skillTally.capes} / {SKILLS.length} skill
          </Pill>
        }
      />

      {/* Headline — where each player stands, and what falls next. */}
      <div className="grid gap-3 sm:grid-cols-2">
        {loading
          ? players.map((p) => <Skeleton key={p.slug} className="h-[92px]" />)
          : summaries.map((s) => <PlayerHeader key={s.player.slug} {...s} />)}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          ariaLabel="Player"
          options={players.map((p) => ({ value: p.slug, label: p.name }))}
          value={active.slug}
          onChange={setSlug}
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
          hint={`${active.name} · ranked by how much is already done`}
        />
        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[132px]" />
            ))}
          </div>
        ) : closest.length === 0 ? (
          <p className="text-sm text-ink-3">Every cape earned. There is nothing left.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {closest.map(({ item, gate }) => (
              <ClosestCard
                key={item.id}
                cape={item}
                gate={gate}
                accent={active.accent}
              />
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
            hint="Manual ticks are shared across both players"
          />
          {loading ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <Skeleton className="h-64" />
              <Skeleton className="h-64" />
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {bigCards.map(({ cape, gate }) => (
                <BigCapeCard
                  key={cape.id}
                  cape={cape}
                  gate={gate}
                  accent={active.accent}
                />
              ))}
            </div>
          )}
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
}: {
  player: PlayerSummary;
  earned: number;
  next: { item: CapeEntry; gate: GateResult } | null;
}) {
  const pct = (earned / CAPES.length) * 100;
  return (
    <Card accent={player.accent} className="p-4">
      <div className="flex items-center gap-4">
        <Ring
          pct={pct}
          size={60}
          stroke={5}
          accent={player.accent}
          label={`${player.name}: ${earned} of ${CAPES.length} capes earned`}
        >
          <span className="font-mono tabular text-[11px] font-bold text-ink-2">
            {Math.round(pct)}%
          </span>
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
            {earned}
            <span className="text-ink-faint"> / {CAPES.length}</span>
          </div>
          <p className="mt-0.5 truncate text-[11px] text-ink-3">
            {next
              ? `Next: ${next.item.name} · ${Math.round(next.gate.pct)}%`
              : "Everything earned"}
          </p>
        </div>
      </div>
    </Card>
  );
}

function ClosestCard({
  cape,
  gate,
  accent,
}: {
  cape: CapeEntry;
  gate: GateResult;
  accent: Accent;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <Ring
          pct={gate.pct}
          size={48}
          stroke={4}
          accent={accent}
          label={`${cape.name}: ${Math.round(gate.pct)}% complete`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h4 className="truncate text-sm text-ink">{cape.name}</h4>
            <TierBadge tier={cape.tier} />
          </div>
          <p className="mt-1 font-mono text-[10.5px] uppercase tracking-wider text-ink-3">
            {gate.met.length} / {gate.results.length} met
          </p>
        </div>
      </div>
      <div className="mt-3">
        <ReqList results={gate.missing} limit={4} />
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
  const pct = done ? 100 : targetXp > 0 ? Math.min(100, (xp / targetXp) * 100) : 0;
  const remaining = Math.max(0, targetXp - xp);

  const entry = chasingMaster ? pair?.master : pair?.cape;
  const label = `${name} — level ${level} of ${target}${done ? ", earned" : ""}`;

  return (
    <a
      href={wikiUrl(entry?.wiki ?? `${name} cape`)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={done ? `${label} ✓` : `${fmt(remaining)} XP to ${target}`}
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
        {!done && <span className="text-ink-faint">/{target}</span>}
      </span>
      <span className="w-full truncate px-1 text-center text-[10px] leading-none text-ink-3">
        {name}
      </span>
    </a>
  );
}

function BigCapeCard({
  cape,
  gate,
  accent,
}: {
  cape: CapeEntry;
  gate: GateResult;
  accent: Accent;
}) {
  const manual = gate.results.filter((r) => r.req.kind === "manual");
  // Only the automatically-evaluated gaps go in the chip list; the manual ones
  // are rendered below as checkboxes so they can actually be ticked off.
  const trackedMissing = gate.results.filter((r) => r.req.kind !== "manual" && !r.met);

  return (
    <Card
      accent={gate.complete ? undefined : accent}
      className={clsx("p-5", gate.complete && "border-success/25")}
    >
      <div className="flex items-start gap-4">
        <Ring
          pct={gate.pct}
          size={60}
          stroke={5}
          accent={accent}
          label={`${cape.name}: ${Math.round(gate.pct)}% complete`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-display italic text-lg leading-none tracking-tight text-ink">
              {cape.name}
            </h4>
            <TierBadge tier={cape.tier} />
            {gate.complete && <Pill tone="success">Earned</Pill>}
          </div>
          <p className="mt-1 font-mono text-[10.5px] uppercase tracking-wider text-ink-3">
            {CATEGORY_LABEL[cape.category]} · {gate.met.length} / {gate.results.length} met
          </p>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-2">{cape.blurb}</p>
        </div>
      </div>

      {cape.reward && (
        <p className="mt-4 rounded-md border border-ash/25 bg-ash/5 px-3 py-2 text-[12px] text-ash-bright">
          {cape.reward}
        </p>
      )}

      {trackedMissing.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
            Still missing
          </p>
          <ReqList results={trackedMissing} limit={8} />
        </div>
      )}

      {manual.length > 0 && (
        <div className="mt-4 border-t border-line pt-3">
          <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
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
          <p className="mt-2 text-[11px] leading-relaxed text-ink-faint">
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
