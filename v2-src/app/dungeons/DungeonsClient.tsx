"use client";

import { Fragment, useMemo, useState } from "react";
import { clsx } from "clsx";
import { ArrowUpRight, ChevronDown, DoorOpen, Lock } from "lucide-react";
import { Card, EmptyState, Pill, SectionHead, Skeleton, Stat } from "@/components/primitives";
import {
  ACCENT_BORDER,
  ACCENT_TEXT,
  Check,
  CountInput,
  PlayerScope,
  ReqList,
  Ring,
  Segmented,
  SkillIcon,
  TierBadge,
} from "@/components/ui";
import { usePlayerData } from "@/components/PlayerDataProvider";
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

/** The three top-level sections, in reading order. */
type Fold = Exclude<Section, "all">;
const FOLDS: Fold[] = ["elite", "raids", "necro"];

/**
 * Defaults, not preferences. Unfolded, this page was 11,200px at 360px — about
 * fifteen viewports, with the Necromancy ladder alone accounting for 6,300px of
 * it. Elite Dungeons is the shortest section and the one most accounts can walk
 * straight into, so it opens; Raids is group content you cannot act on while
 * reading, and the ladder is 29 rungs of a single skill's roadmap, most of it
 * out of reach. Both start folded, with their counts still on the header so a
 * folded section is a summary rather than a blank.
 */
const FOLD_DEFAULT: Record<Fold, boolean> = {
  elite: true,
  raids: false,
  necro: false,
};

/**
 * Every recurring label on this page used to carry its own explanation inside
 * every card — the same four sentences reprinted nineteen times, outweighing
 * the boss lists they sat above. They are said once here instead, and each
 * in-card label points back at its entry with aria-describedby.
 */
type LegendKey = "gear" | "story" | "prep" | "recommended";

/** `plain` is the same sentence for the native tooltip, which cannot take JSX. */
const LEGEND: Record<LegendKey, { term: string; plain: string; body?: React.ReactNode }> = {
  gear: {
    term: "Gear floor",
    plain: "An RS3 equipment tier, not a difficulty band.",
    body: (
      <>
        An RS3 <em>equipment</em> tier, not a difficulty band.
      </>
    ),
  },
  story: {
    term: "Story mode",
    plain: "Halves enemy HP, but strips most loot and achievements.",
  },
  prep: {
    term: "Prep",
    plain:
      "Things no API can see — a team, bane ammo, a learned rotation. Ticked by hand, saved per player.",
  },
  recommended: {
    term: "Recommended",
    plain: "Community floors. The game does not check these, so they never lock a door.",
  },
};

const legendId = (k: LegendKey) => `dungeon-legend-${k}`;

function Legend({ keys }: { keys: LegendKey[] }) {
  return (
    <div className="rounded-lg border border-line bg-bg-surface p-3 sm:p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
        What the labels mean
      </p>
      <dl
        className={clsx(
          "mt-2 grid gap-x-8 gap-y-3 sm:grid-cols-2",
          // Full literals, never a built class name.
          keys.length > 2 ? "xl:grid-cols-4" : "xl:grid-cols-2",
        )}
      >
        {keys.map((k) => (
          <div key={k} id={legendId(k)} className="max-w-prose">
            <dt className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-2">
              {LEGEND[k].term}
            </dt>
            <dd className="mt-1 text-xs leading-relaxed text-ink-3">
              {LEGEND[k].body ?? LEGEND[k].plain}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default function DungeonsClient() {
  const { players, loading, gate } = useEval();
  const { selected, setSelected } = usePlayerData();
  const [section, setSection] = useState<Section>("all");
  /** Explicit user collapse/expand, keyed by section. Absent = use the default. */
  const [fold, setFold] = useState<Partial<Record<Fold, boolean>>>({});

  const ladder = useMemo(
    () =>
      NECRO_LADDER.map((entry) => ({ entry, level: necroLevelOf(entry) })).sort(
        (a, b) => a.level - b.level,
      ),
    [],
  );

  const player = selected ?? players[0];

  if (!player) {
    return (
      <div className="space-y-6">
        <SectionHead as="h1" title="Dungeons" hint="Elite dungeons · raids · necromancy" />
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
  const doorsOpen = (entries: ContentEntry[]) =>
    entries.filter((e) =>
      splitReqs(gate(player.slug, e.requirements).results).required.every((r) => r.met),
    ).length;
  const eliteOpen = doorsOpen(ELITE_DUNGEONS);
  const raidsOpen = doorsOpen(RAIDS);
  const open = eliteOpen + raidsOpen;

  const reached = ladder.filter((r) => r.level <= necroLevel).length;
  const next = ladder.find((r) => r.level > necroLevel);
  const cleared = ALL_CONTENT.filter((e) => gate(player.slug, e.requirements).complete).length;

  // Narrowing the Segmented to one section is an explicit request to read it,
  // so that section is forced open and its header stops offering to fold.
  const isOpen = (k: Fold) => (section === "all" ? (fold[k] ?? FOLD_DEFAULT[k]) : true);
  const allOpen = FOLDS.every(isOpen);
  const toggleAll = () =>
    setFold(
      Object.fromEntries(FOLDS.map((k) => [k, !allOpen] as const)) as Record<Fold, boolean>,
    );

  const showInstances = section !== "necro" && (isOpen("elite") || isOpen("raids"));
  const legendKeys: LegendKey[] =
    section === "raids" || !isOpen("elite")
      ? ["prep", "recommended"]
      : ["gear", "story", "prep", "recommended"];

  return (
    <div className="space-y-6">
      <SectionHead as="h1" title="Dungeons" hint="Elite dungeons · raids · necromancy" />

      <div className="flex gap-2" role="group" aria-label="Select player">
        {players.map((p) => {
          const active = p.slug === player.slug;
          return (
            <button
              key={p.slug}
              type="button"
              onClick={() => setSelected(p.slug)}
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

      {/* Manual ticks and kill counts below belong to the selected player, not
          to the browser, so everything player-specific sits inside one scope. */}
      <PlayerScope slug={player.slug}>
        <div className="space-y-6">
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

          <div className="flex flex-wrap items-center gap-2">
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
            {section === "all" && (
              <button
                type="button"
                onClick={toggleAll}
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-line px-3 font-mono text-[11px] uppercase tracking-wider text-ink-3 transition-colors hover:border-line-strong hover:text-ink-2 sm:h-8"
              >
                <ChevronDown
                  size={14}
                  aria-hidden="true"
                  className={clsx("transition-transform", allOpen && "rotate-180")}
                />
                {allOpen ? "Fold all" : "Open all"}
              </button>
            )}
          </div>

          {showInstances && <Legend keys={legendKeys} />}

          {(section === "all" || section === "elite") && (
            <section className="space-y-4" aria-labelledby="dungeons-elite">
              <FoldHead
                id="dungeons-elite"
                panelId="dungeons-elite-panel"
                title="Elite Dungeons"
                meta={`${eliteOpen} of ${ELITE_DUNGEONS.length} open`}
                folded={`${ELITE_DUNGEONS.length} folded`}
                note="Instanced three-boss runs. Only ED1 and ED4 have a door check — the other two you can simply walk into."
                open={isOpen("elite")}
                locked={section !== "all"}
                onToggle={() => setFold((p) => ({ ...p, elite: !isOpen("elite") }))}
              />
              {isOpen("elite") && (
                <div
                  id="dungeons-elite-panel"
                  className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3"
                >
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
              )}
            </section>
          )}

          {(section === "all" || section === "raids") && (
            <section className="space-y-4" aria-labelledby="dungeons-raids">
              <FoldHead
                id="dungeons-raids"
                panelId="dungeons-raids-panel"
                title="Raids"
                meta={`${raidsOpen} of ${RAIDS.length} open`}
                folded={`${RAIDS.length} folded`}
                note="Group content with HP that scales to team size. Sanctum sits here rather than with the Elite Dungeons — the wiki is explicit that it is not one."
                open={isOpen("raids")}
                locked={section !== "all"}
                onToggle={() => setFold((p) => ({ ...p, raids: !isOpen("raids") }))}
              />
              {isOpen("raids") && (
                <div
                  id="dungeons-raids-panel"
                  className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3"
                >
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
              )}
            </section>
          )}

          {(section === "all" || section === "necro") && (
            <section className="space-y-4" aria-labelledby="dungeons-necro">
              <FoldHead
                id="dungeons-necro"
                panelId="dungeons-necro-panel"
                title="Necromancy ladder"
                meta={`${reached} of ${ladder.length} reached`}
                folded={`${ladder.length} rungs folded`}
                note="Every unlock from the Underworld portal to Rasial, in the order the levels arrive. The number on each rung is the Necromancy level it unlocks at."
                open={isOpen("necro")}
                locked={section !== "all"}
                onToggle={() => setFold((p) => ({ ...p, necro: !isOpen("necro") }))}
              />
              {isOpen("necro") && (
                <div id="dungeons-necro-panel">
                  <NecroLadder
                    rungs={ladder}
                    player={player}
                    necroLevel={necroLevel}
                    xpPct={toNext.pct}
                    xpNeeded={toNext.needed}
                    gate={gate}
                    loading={loading}
                  />
                </div>
              )}
            </section>
          )}
        </div>
      </PlayerScope>
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

/**
 * h2, because the page title is now the h1 — nothing may skip a level. The
 * heading is also the section's disclosure, matching /pvm: chevron, coloured
 * rule, live counts, and a "N folded" tail so a closed section still says how
 * much is behind it. The note is part of the panel — a folded section is a
 * one-line summary, and three paragraphs of preamble is what made scrolling
 * past this page expensive in the first place.
 */
function FoldHead({
  id,
  panelId,
  title,
  meta,
  folded,
  note,
  open,
  locked,
  onToggle,
}: {
  id: string;
  panelId: string;
  title: string;
  meta: string;
  folded: string;
  note: React.ReactNode;
  open: boolean;
  locked: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="pt-2">
      <h2 id={id}>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={open ? panelId : undefined}
          disabled={locked}
          className={clsx(
            "flex min-h-[44px] w-full flex-wrap items-center gap-x-3 gap-y-1 border-b-2 border-line-strong py-2 text-left transition-colors",
            !locked && "cursor-pointer rounded-t hover:bg-bg-surface/60",
          )}
        >
          {!locked && (
            <ChevronDown
              size={18}
              aria-hidden="true"
              className={clsx(
                "shrink-0 text-ink-3 transition-transform",
                !open && "-rotate-90",
              )}
            />
          )}
          <span className="font-display italic text-lg leading-none tracking-tight text-ink sm:text-xl">
            {title}
          </span>
          <span className="font-mono tabular text-[10.5px] uppercase tracking-[0.14em] text-ink-2">
            {meta}
          </span>
          {!open && (
            <span className="ml-auto font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-3">
              {folded}
            </span>
          )}
        </button>
      </h2>
      {open && <p className="mt-2 max-w-prose text-xs leading-relaxed text-ink-3">{note}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Elite dungeons & raids
// ---------------------------------------------------------------------------

/**
 * Data only. Both labels are defined once in the page legend — reprinting the
 * definitions here cost two grey lines per card and said nothing new.
 */
function DungeonMeta({ entry }: { entry: DungeonEntry }) {
  return (
    <dl className="grid grid-cols-2 gap-3">
      <div>
        <dt
          className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3"
          aria-describedby={legendId("gear")}
          title={LEGEND.gear.plain}
        >
          Gear floor
        </dt>
        <dd className="mt-1 font-mono tabular text-sm text-ink-2">
          Tier {entry.recommendedTier}
          <span className="ml-1.5 text-[11px] text-ink-3">equipment</span>
        </dd>
      </div>
      <div>
        <dt
          className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3"
          aria-describedby={legendId("story")}
          title={LEGEND.story.plain}
        >
          Story mode
        </dt>
        <dd className="mt-1 text-sm text-ink-2">
          {entry.storyMode ? "Available" : "Not available"}
        </dd>
      </div>
    </dl>
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
                <span className="font-mono tabular text-[11px] text-ink-3">{i + 1}</span>
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
            <Group label="Prep" legend="prep">
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
            <Group label="Recommended" legend="recommended">
              <ReqList results={recommended} showMet limit={6} />
            </Group>
          )}
        </>
      )}
    </Card>
  );
}

/**
 * `legend` points the label at its one definition at the top of the page
 * instead of restating it under every card.
 */
function Group({
  label,
  legend,
  children,
}: {
  label: string;
  legend?: LegendKey;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <p
        className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3"
        aria-describedby={legend ? legendId(legend) : undefined}
        title={legend ? LEGEND[legend].plain : undefined}
      >
        {label}
      </p>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Necromancy ladder
// ---------------------------------------------------------------------------

/**
 * How much of a 29-rung ladder opens by default: the rung just cleared, the
 * marker, and the next three. All 29 rendered at once was 6,300px at 360px, and
 * 25 of them are levels away — the rest stay one tap behind a rail stub so the
 * ladder is still a ladder, top to bottom, rather than a paginated grid.
 */
const RUNGS_BEFORE = 1;
const RUNGS_AFTER = 3;

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
  const [showEarlier, setShowEarlier] = useState(false);
  const [showLater, setShowLater] = useState(false);

  if (!rungs.length) return <EmptyState title="No Necromancy unlocks tracked" />;

  // The marker sits immediately before the first rung still out of reach, so
  // "where I stand" and "what is next" read as one continuous step — and the
  // window is measured from it, so the page always opens on the reader's rung.
  const found = rungs.findIndex((r) => r.level > necroLevel);
  const markerIndex = found === -1 ? rungs.length : found;
  const windowStart = Math.max(0, markerIndex - RUNGS_BEFORE);
  const windowEnd = Math.min(rungs.length, markerIndex + RUNGS_AFTER);
  /** Rungs outside the default window — the counts the two stubs report. */
  const earlier = windowStart;
  const later = rungs.length - windowEnd;
  const start = showEarlier ? 0 : windowStart;
  const end = showLater ? rungs.length : windowEnd;
  const marker = (
    <YouAreHere player={player} necroLevel={necroLevel} xpPct={xpPct} xpNeeded={xpNeeded} />
  );

  return (
    // Capped at xl. The rung is a prose lane plus a chips-and-controls lane, and
    // neither grows past what it needs — left to the full 1400px measure the
    // second lane inflated to ~750px of empty card. 62rem is the widest the two
    // lanes can actually fill (34rem prose + gap + a ~23rem control column).
    <div className="relative xl:max-w-[62rem]">
      {/* The rail lives outside the <ol> — only <li> may be its direct child. */}
      <span
        className="pointer-events-none absolute bottom-4 left-[18px] top-4 w-px -translate-x-1/2 bg-line"
        aria-hidden="true"
      />
      <ol>
        {earlier > 0 && (
          <RailStub
            count={earlier}
            direction="earlier"
            expanded={showEarlier}
            onClick={() => setShowEarlier((v) => !v)}
          />
        )}
        {rungs.slice(start, end).map((rung, i) => (
          <Fragment key={rung.entry.id}>
            {start + i === markerIndex && marker}
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
        {later > 0 && (
          <RailStub
            count={later}
            direction="later"
            expanded={showLater}
            onClick={() => setShowLater((v) => !v)}
          />
        )}
      </ol>
    </div>
  );
}

/**
 * A folded stretch of ladder, rendered as one more rung on the same rail: the
 * node carries the count, the row is the control. Dashed so it never reads as a
 * real unlock you have missed.
 */
function RailStub({
  count,
  direction,
  expanded,
  onClick,
}: {
  count: number;
  direction: "earlier" | "later";
  expanded: boolean;
  onClick: () => void;
}) {
  const plural = count === 1 ? "rung" : "rungs";
  return (
    <li className="relative pb-3 pl-12">
      <span
        className="absolute left-0 top-0 grid h-9 w-9 place-items-center rounded-full border border-dashed border-line bg-bg font-mono tabular text-[11px] text-ink-3"
        aria-hidden="true"
      >
        {expanded ? (
          <ChevronDown
            size={14}
            className={direction === "earlier" ? "rotate-180" : undefined}
          />
        ) : (
          `+${count}`
        )}
      </span>
      <button
        type="button"
        onClick={onClick}
        aria-expanded={expanded}
        className="flex min-h-[44px] w-full items-center rounded-lg border border-dashed border-line/70 px-3 text-left font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-3 transition-colors hover:border-line-strong hover:text-ink-2"
      >
        {expanded ? "Fold" : "Show"} {count} {direction} {plural}
      </button>
    </li>
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
          <span className="font-mono tabular text-[11px] text-ink-3">
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
      {/* The rail node carries the Necromancy level. It used to be repeated as a
          token pinned to the far right of the row, which both duplicated the
          number and left ~390px of dead space between the two. */}
      <span
        className={clsx(
          "absolute left-0 top-0 grid h-9 w-9 place-items-center rounded-full border bg-bg font-mono tabular text-[12px]",
          reached ? clsx(ACCENT_BORDER[accent], ACCENT_TEXT[accent]) : "border-line text-ink-3",
        )}
      >
        <span className="sr-only">Necromancy level </span>
        {level}
      </span>

      <div
        className={clsx(
          "rounded-lg border p-3",
          // Two columns from lg up: the row's own width now carries the state
          // and the outstanding requirements instead of stacking them, which
          // both fills the desktop measure and shortens a 29-rung ladder.
          // At xl the prose lane is capped at a comfortable measure and the
          // remaining width goes to the chips and controls — the old layout
          // stretched a sentence and pinned a token to the far edge instead.
          "lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] lg:items-start lg:gap-4",
          "xl:grid-cols-[minmax(0,34rem)_minmax(0,1fr)] xl:gap-6",
          reached ? "border-line bg-bg-surface" : "border-line/60 bg-bg-surface/40",
        )}
      >
        <div className="min-w-0">
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
          </div>

          <p className="mt-1 max-w-prose text-xs leading-relaxed text-ink-3">{entry.blurb}</p>
        </div>

        <div className="mt-2 space-y-2 lg:mt-0">
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

          {!pending && actionable.length > 0 && (
            <div className="divide-y divide-line border-t border-line pt-1">
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
      </div>
    </li>
  );
}
