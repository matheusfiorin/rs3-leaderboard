"use client";

import { Fragment, useMemo, useState } from "react";
import { clsx } from "clsx";
import { ArrowUpRight, DoorOpen, Lock } from "lucide-react";
import { Card, EmptyState, Pill, SectionHead, Skeleton, Stat } from "@/components/primitives";
import {
  ACCENT_BORDER,
  ACCENT_TEXT,
  Check,
  CountInput,
  ReqList,
  Ring,
  Segmented,
  SkillIcon,
  TierBadge,
} from "@/components/ui";
import { useEval } from "@/components/useEval";
import {
  ELITE_DUNGEONS,
  NECRO_LADDER,
  RAIDS,
  allDungeonContent,
  type DungeonEntry,
  type RaidEntry,
} from "@/lib/content/dungeons";
import { kcKey } from "@/lib/requirements";
import { xpToNext } from "@/lib/skills";
import { wikiUrl } from "@/lib/paths";
import { fmt } from "@/lib/format";
import type {
  Accent,
  ContentEntry,
  GateResult,
  PlayerSummary,
  Requirement,
  RequirementResult,
} from "@/lib/types";

const NECROMANCY = 28;
const NECRO_MAX = 120;
const ALL_CONTENT = allDungeonContent();

type Gate = (slug: string, reqs: Requirement[]) => GateResult;

/**
 * The content module tags community-consensus floors with a note saying the
 * game does not enforce them. Those must never render as a lock — half the
 * entries on this page have no door check at all, and telling someone ED3 is
 * "locked" when they can walk straight in is worse than saying nothing.
 */
export function isRecommended(req: Requirement): boolean {
  return Boolean(req.note && /not enforced/i.test(req.note));
}

export interface SplitReqs {
  /** Gates the game actually checks. */
  required: RequirementResult[];
  /** Player-side things no API can see — a team, bane ammo, a learned rotation. */
  prep: RequirementResult[];
  /** Community floors, explicitly not enforced. */
  recommended: RequirementResult[];
}

export function splitReqs(results: RequirementResult[]): SplitReqs {
  const out: SplitReqs = { required: [], prep: [], recommended: [] };
  for (const r of results) {
    if (isRecommended(r.req)) out.recommended.push(r);
    else if (r.req.kind === "manual") out.prep.push(r);
    else out.required.push(r);
  }
  return out;
}

/** The Necromancy level a ladder rung sits at. Rungs without one start the skill. */
export function necroLevelOf(entry: ContentEntry): number {
  for (const r of entry.requirements) {
    if (r.kind === "skill" && r.skill === NECROMANCY) return r.level;
  }
  return 1;
}

/** Quest lists arrive on the client, so quest-gated cards must wait for them. */
function needsQuests(entry: { requirements: Requirement[] }): boolean {
  return entry.requirements.some((r) => r.kind === "quest");
}

type Section = "all" | "elite" | "raids" | "necro";

export default function DungeonsClient() {
  const { players, loading, gate } = useEval();
  const [slug, setSlug] = useState<string | null>(null);
  const [section, setSection] = useState<Section>("all");

  const ladder = useMemo(
    () =>
      NECRO_LADDER.map((entry) => ({ entry, level: necroLevelOf(entry) })).sort(
        (a, b) => a.level - b.level,
      ),
    [],
  );

  const player = players.find((p) => p.slug === slug) ?? players[0];

  if (!player) {
    return (
      <div className="space-y-6">
        <SectionHead title="Dungeons" hint="Elite dungeons · raids · necromancy" />
        <Skeleton className="h-44 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const necroLevel = player.skills[NECROMANCY]?.level ?? 1;
  const necroXp = player.skills[NECROMANCY]?.xp ?? 0;
  const toNext = xpToNext(necroXp, necroLevel, NECRO_MAX);
  const instances = [...ELITE_DUNGEONS, ...RAIDS];

  // "Open" counts only gates the game checks — recommendations and prep are
  // deliberately excluded, because neither stops you at the door.
  const open = instances.filter((e) =>
    splitReqs(gate(player.slug, e.requirements).results).required.every((r) => r.met),
  ).length;

  const reached = ladder.filter((r) => r.level <= necroLevel).length;
  const next = ladder.find((r) => r.level > necroLevel);
  const cleared = ALL_CONTENT.filter((e) => gate(player.slug, e.requirements).complete).length;

  return (
    <div className="space-y-6">
      <SectionHead title="Dungeons" hint="Elite dungeons · raids · necromancy" />

      <div className="flex gap-2" role="group" aria-label="Select player">
        {players.map((p) => {
          const active = p.slug === player.slug;
          return (
            <button
              key={p.slug}
              type="button"
              onClick={() => setSlug(p.slug)}
              aria-current={active ? "true" : undefined}
              className={clsx(
                "h-11 flex-1 rounded-md border px-3 font-mono text-[11px] uppercase tracking-wider transition-colors sm:flex-none",
                active
                  ? clsx(ACCENT_BORDER[p.accent], ACCENT_TEXT[p.accent], "bg-bg-raised")
                  : "border-line text-ink-3 hover:bg-bg-raised/50 hover:text-ink-2",
              )}
            >
              {p.name}
            </button>
          );
        })}
      </div>

      <Hero
        player={player}
        necroLevel={necroLevel}
        reached={reached}
        total={ladder.length}
        next={next}
        xpNeeded={toNext.needed}
        open={open}
        instanceCount={instances.length}
        cleared={cleared}
        loading={loading}
      />

      <Segmented<Section>
        ariaLabel="Jump to section"
        value={section}
        onChange={setSection}
        options={[
          { value: "all", label: "All" },
          { value: "elite", label: "Elite", count: ELITE_DUNGEONS.length },
          { value: "raids", label: "Raids", count: RAIDS.length },
          { value: "necro", label: "Necro", count: ladder.length },
        ]}
      />

      {(section === "all" || section === "elite") && (
        <section className="space-y-4">
          <SubHead
            title="Elite Dungeons"
            note="Instanced three-boss runs. Only ED1 and ED4 have a door check — the other two you can simply walk into."
          />
          <div className="grid gap-4 lg:grid-cols-2">
            {ELITE_DUNGEONS.map((d) => (
              <InstanceCard
                key={d.id}
                entry={d}
                accent={player.accent}
                gate={gate(player.slug, d.requirements)}
                pending={loading && needsQuests(d)}
                meta={<DungeonMeta entry={d} />}
                list={{ label: "Bosses", items: d.bosses }}
              />
            ))}
          </div>
        </section>
      )}

      {(section === "all" || section === "raids") && (
        <section className="space-y-4">
          <SubHead
            title="Raids"
            note="Group content with HP that scales to team size. Sanctum sits here rather than with the Elite Dungeons — the wiki is explicit that it is not one."
          />
          <div className="grid gap-4 lg:grid-cols-2">
            {RAIDS.map((r) => (
              <InstanceCard
                key={r.id}
                entry={r}
                accent={player.accent}
                gate={gate(player.slug, r.requirements)}
                pending={loading && needsQuests(r)}
                meta={<RaidMeta entry={r} />}
                list={{ label: "Full clear", items: r.phases, ordered: true }}
              />
            ))}
          </div>
        </section>
      )}

      {(section === "all" || section === "necro") && (
        <section className="space-y-4">
          <SubHead
            title="Necromancy ladder"
            note="Every unlock from the Underworld portal to Rasial, in the order the levels arrive."
          />
          <NecroLadder
            rungs={ladder}
            player={player}
            necroLevel={necroLevel}
            xpPct={toNext.pct}
            xpNeeded={toNext.needed}
            gate={gate}
            loading={loading}
          />
        </section>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Headline
// ---------------------------------------------------------------------------

function Hero({
  player,
  necroLevel,
  reached,
  total,
  next,
  xpNeeded,
  open,
  instanceCount,
  cleared,
  loading,
}: {
  player: PlayerSummary;
  necroLevel: number;
  reached: number;
  total: number;
  next?: { entry: ContentEntry; level: number };
  xpNeeded: number;
  open: number;
  instanceCount: number;
  cleared: number;
  loading: boolean;
}) {
  const away = next ? next.level - necroLevel : 0;

  return (
    <Card accent={player.accent} className="lit-edge p-4 sm:p-5">
      <div className="flex items-center gap-4">
        <Ring
          pct={total ? (reached / total) * 100 : 0}
          size={84}
          stroke={5}
          accent={player.accent}
          label={`Necromancy level ${necroLevel}, ${reached} of ${total} unlocks reached`}
        >
          <span className="text-center leading-none">
            <span className="block font-mono tabular text-[22px] font-bold text-ink">
              {necroLevel}
            </span>
            <span className="mt-1 block font-mono text-[9px] uppercase tracking-[0.14em] text-ink-3">
              Necro
            </span>
          </span>
        </Ring>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-3">
            Next on the ladder
          </p>
          <p className="mt-1 font-display italic text-xl leading-tight text-ink">
            {next ? next.entry.name : "Ladder complete"}
          </p>
          {next && (
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-3">
              <span className="inline-flex items-center gap-1.5">
                <SkillIcon id={NECROMANCY} size={14} />
                <span className="font-mono tabular">Necromancy {next.level}</span>
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular">
                {away} level{away === 1 ? "" : "s"} away
              </span>
              {necroLevel < NECRO_MAX && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular">{fmt(xpNeeded)} xp to next</span>
                </>
              )}
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 border-t border-line pt-4">
        <Stat
          label="Open now"
          size="sm"
          accent={player.accent}
          value={loading ? <Skeleton className="h-5 w-12" /> : `${open} / ${instanceCount}`}
          hint="Door checks passed"
        />
        <Stat label="Ladder" size="sm" value={`${reached} / ${total}`} hint="Levels reached" />
        <Stat
          label="Cleared"
          size="sm"
          value={loading ? <Skeleton className="h-5 w-12" /> : `${cleared} / ${ALL_CONTENT.length}`}
          hint="Every requirement met"
        />
      </div>
    </Card>
  );
}

function SubHead({ title, note }: { title: string; note: string }) {
  return (
    <div className="pt-2">
      <h3 className="font-display italic text-lg leading-none tracking-tight text-ink">{title}</h3>
      <p className="mt-1.5 max-w-prose text-xs leading-relaxed text-ink-3">{note}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Elite dungeons & raids
// ---------------------------------------------------------------------------

function DungeonMeta({ entry }: { entry: DungeonEntry }) {
  return (
    <div className="space-y-2">
      <dl className="grid grid-cols-2 gap-3">
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
            Gear floor
          </dt>
          <dd className="mt-1 font-mono tabular text-sm text-ink-2">
            Tier {entry.recommendedTier}
            <span className="ml-1.5 text-[11px] text-ink-faint">equipment</span>
          </dd>
        </div>
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
            Story mode
          </dt>
          <dd className="mt-1 text-sm text-ink-2">
            {entry.storyMode ? "Available" : "Not available"}
          </dd>
        </div>
      </dl>
      <p className="text-[11px] leading-relaxed text-ink-faint">
        Gear floor is an RS3 <em>equipment</em> tier, not a difficulty band.
        {entry.storyMode && " Story mode halves enemy HP but strips most loot and achievements."}
      </p>
    </div>
  );
}

function RaidMeta({ entry }: { entry: RaidEntry }) {
  return (
    <dl>
      <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">Scale</dt>
      <dd className="mt-1 text-sm text-ink-2">{entry.scale}</dd>
    </dl>
  );
}

function InstanceCard({
  entry,
  accent,
  gate,
  pending,
  meta,
  list,
}: {
  entry: ContentEntry;
  accent: Accent;
  gate: GateResult;
  pending: boolean;
  meta: React.ReactNode;
  list: { label: string; items: string[]; ordered?: boolean };
}) {
  const { required, prep, recommended } = splitReqs(gate.results);
  const blocking = required.filter((r) => !r.met);
  const ungated = required.length === 0;

  return (
    <Card
      accent={!pending && blocking.length === 0 ? accent : undefined}
      className="space-y-4 p-4 sm:p-5"
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <a
              href={wikiUrl(entry.wiki)}
              target="_blank"
              rel="noreferrer"
              className="group inline-flex min-h-[44px] items-center gap-1 font-display italic text-lg leading-tight tracking-tight text-ink hover:text-ink-2 sm:min-h-0"
            >
              {entry.name}
              <ArrowUpRight
                size={14}
                className="shrink-0 text-ink-faint transition-colors group-hover:text-ink-3"
                aria-hidden="true"
              />
            </a>
            <TierBadge tier={entry.tier} />
          </div>
          <p className="mt-1 text-xs leading-relaxed text-ink-3">{entry.blurb}</p>
        </div>
        {pending ? (
          // Not <Skeleton/> — its rounded-md would fight a rounded-full override.
          <div className="h-14 w-14 shrink-0 animate-pulse rounded-full bg-bg-raised" />
        ) : (
          <Ring
            pct={gate.pct}
            size={56}
            stroke={4}
            accent={accent}
            label={`${Math.round(gate.pct)}% ready`}
          />
        )}
      </div>

      <div>
        {pending ? (
          <Skeleton className="h-5 w-32" />
        ) : ungated ? (
          <Pill tone="success">
            <DoorOpen size={11} aria-hidden="true" /> No entry requirement
          </Pill>
        ) : blocking.length === 0 ? (
          <Pill tone="success">
            <DoorOpen size={11} aria-hidden="true" /> Open
          </Pill>
        ) : (
          <Pill tone="warn">
            <Lock size={11} aria-hidden="true" /> {blocking.length} gate
            {blocking.length === 1 ? "" : "s"} left
          </Pill>
        )}
      </div>

      {meta}

      <Group label={list.label}>
        {list.ordered ? (
          <ol className="space-y-1">
            {list.items.map((item, i) => (
              <li key={item} className="flex gap-2 text-sm text-ink-2">
                <span className="font-mono tabular text-[11px] text-ink-faint">{i + 1}</span>
                <span className="min-w-0">{item}</span>
              </li>
            ))}
          </ol>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {list.items.map((item) => (
              <span
                key={item}
                className="inline-flex h-6 items-center rounded-md border border-line bg-bg-raised/50 px-2 text-[11px] text-ink-2"
              >
                {item}
              </span>
            ))}
          </div>
        )}
      </Group>

      {pending ? (
        <div className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-6 w-full" />
        </div>
      ) : (
        <>
          {required.length > 0 && (
            <Group label={blocking.length === 0 ? "Door checks — passed" : "Required to enter"}>
              <ReqList results={required} showMet limit={6} />
            </Group>
          )}
          {prep.length > 0 && (
            <Group label="Prep" hint="tracked by hand, shared across players">
              <div className="divide-y divide-line">
                {prep.map((r) =>
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
            </Group>
          )}
          {recommended.length > 0 && (
            <Group label="Recommended" hint="the game does not check these">
              <ReqList results={recommended} showMet limit={6} />
            </Group>
          )}
        </>
      )}
    </Card>
  );
}

function Group({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
        {label}
        {hint && <span className="ml-2 normal-case tracking-normal text-ink-faint">{hint}</span>}
      </p>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Necromancy ladder
// ---------------------------------------------------------------------------

function NecroLadder({
  rungs,
  player,
  necroLevel,
  xpPct,
  xpNeeded,
  gate,
  loading,
}: {
  rungs: { entry: ContentEntry; level: number }[];
  player: PlayerSummary;
  necroLevel: number;
  xpPct: number;
  xpNeeded: number;
  gate: Gate;
  loading: boolean;
}) {
  if (!rungs.length) return <EmptyState title="No Necromancy unlocks tracked" />;

  // The marker sits immediately before the first rung still out of reach, so
  // "where I stand" and "what is next" read as one continuous step.
  const found = rungs.findIndex((r) => r.level > necroLevel);
  const markerIndex = found === -1 ? rungs.length : found;
  const marker = (
    <YouAreHere player={player} necroLevel={necroLevel} xpPct={xpPct} xpNeeded={xpNeeded} />
  );

  return (
    <div className="relative">
      {/* The rail lives outside the <ol> — only <li> may be its direct child. */}
      <span
        className="pointer-events-none absolute bottom-4 left-[18px] top-4 w-px -translate-x-1/2 bg-line"
        aria-hidden="true"
      />
      <ol>
        {rungs.map((rung, i) => (
          <Fragment key={rung.entry.id}>
            {i === markerIndex && marker}
            <Rung
              entry={rung.entry}
              level={rung.level}
              necroLevel={necroLevel}
              accent={player.accent}
              gate={gate(player.slug, rung.entry.requirements)}
              pending={loading && needsQuests(rung.entry)}
            />
          </Fragment>
        ))}
        {markerIndex === rungs.length && marker}
      </ol>
    </div>
  );
}

function YouAreHere({
  player,
  necroLevel,
  xpPct,
  xpNeeded,
}: {
  player: PlayerSummary;
  necroLevel: number;
  xpPct: number;
  xpNeeded: number;
}) {
  return (
    <li className="relative py-2 pl-12" aria-current="step">
      <span
        className={clsx(
          "absolute left-0 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border-2 bg-bg",
          ACCENT_BORDER[player.accent],
        )}
      >
        <SkillIcon id={NECROMANCY} size={16} />
      </span>
      <div
        className={clsx(
          "flex flex-wrap items-baseline gap-x-2 gap-y-1 rounded-md border bg-bg-raised/40 px-3 py-2",
          ACCENT_BORDER[player.accent],
        )}
      >
        <span
          className={clsx(
            "font-mono text-[10.5px] uppercase tracking-[0.14em]",
            ACCENT_TEXT[player.accent],
          )}
        >
          {player.name} is here
        </span>
        <span className="font-mono tabular text-[11px] text-ink-2">Necromancy {necroLevel}</span>
        {necroLevel < NECRO_MAX && (
          <span className="font-mono tabular text-[11px] text-ink-faint">
            {Math.round(xpPct)}% to {necroLevel + 1} · {fmt(xpNeeded)} xp
          </span>
        )}
      </div>
    </li>
  );
}

function Rung({
  entry,
  level,
  necroLevel,
  accent,
  gate,
  pending,
}: {
  entry: ContentEntry;
  level: number;
  necroLevel: number;
  accent: Accent;
  gate: GateResult;
  pending: boolean;
}) {
  const reached = level <= necroLevel;

  // Anything the player could action right now gets a live control instead of a
  // read-only chip — but only once the level is in hand, or it is just clutter.
  const actionable = reached
    ? gate.missing.filter((r) => r.req.kind === "manual" || r.req.kind === "kc")
    : [];
  // The level lives in the rail node, so repeating it as a chip is noise.
  const chips = gate.missing.filter(
    (r) =>
      !(r.req.kind === "skill" && r.req.skill === NECROMANCY) && !actionable.includes(r),
  );

  return (
    <li className="relative pb-3 pl-12">
      <span
        className={clsx(
          "absolute left-0 top-0 grid h-9 w-9 place-items-center rounded-full border bg-bg font-mono tabular text-[12px]",
          reached
            ? clsx(ACCENT_BORDER[accent], ACCENT_TEXT[accent])
            : "border-line text-ink-faint",
        )}
      >
        {level}
      </span>

      <div
        className={clsx(
          "rounded-lg border p-3",
          reached ? "border-line bg-bg-surface" : "border-line/60 bg-bg-surface/40",
        )}
      >
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <a
            href={wikiUrl(entry.wiki)}
            target="_blank"
            rel="noreferrer"
            className={clsx(
              "group inline-flex min-h-[44px] items-center gap-1 text-sm font-medium leading-tight sm:min-h-0",
              reached ? "text-ink hover:text-ink-2" : "text-ink-2 hover:text-ink",
            )}
          >
            {entry.name}
            <ArrowUpRight size={13} className="shrink-0 text-ink-faint" aria-hidden="true" />
          </a>
          <TierBadge tier={entry.tier} />
          <span className="ml-auto inline-flex shrink-0 items-center gap-1.5">
            <SkillIcon id={NECROMANCY} size={13} />
            <span
              className={clsx(
                "font-mono tabular text-[11px]",
                reached ? "text-ink-3" : "text-ink-faint",
              )}
            >
              {level}
            </span>
          </span>
        </div>

        <p
          className={clsx(
            "mt-1 text-xs leading-relaxed",
            reached ? "text-ink-3" : "text-ink-faint",
          )}
        >
          {entry.blurb}
        </p>

        <div className="mt-2 space-y-2">
          {pending ? (
            <Skeleton className="h-5 w-36" />
          ) : gate.complete ? (
            <Pill tone="success">Unlocked</Pill>
          ) : !reached ? (
            <Pill tone="neutral">
              {level - necroLevel} level{level - necroLevel === 1 ? "" : "s"} away
            </Pill>
          ) : (
            <Pill tone="warn">
              Level reached — {gate.missing.length} requirement
              {gate.missing.length === 1 ? "" : "s"} left
            </Pill>
          )}
          {!pending && chips.length > 0 && <ReqList results={chips} limit={4} />}
        </div>

        {!pending && actionable.length > 0 && (
          <div className="mt-2 divide-y divide-line border-t border-line pt-1">
            {actionable.map((r) =>
              r.req.kind === "manual" ? (
                <Check key={r.req.id} storeKey={r.req.id} label={r.req.label} hint={r.req.note} />
              ) : r.req.kind === "kc" ? (
                <CountInput
                  key={r.req.boss}
                  storeKey={kcKey(r.req.boss)}
                  label={r.req.boss}
                  target={r.req.count}
                />
              ) : null,
            )}
          </div>
        )}
      </div>
    </li>
  );
}
