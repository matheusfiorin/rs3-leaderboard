"use client";

import { useMemo, useState } from "react";
import { clsx } from "clsx";
import { ExternalLink } from "lucide-react";
import { Bar, Card, EmptyState, Pill, SectionHead, Skeleton, Stat } from "@/components/primitives";
import {
  Check,
  Meter,
  PlayerScope,
  ReqList,
  Ring,
  Segmented,
  TierBadge,
} from "@/components/ui";
import { useEval } from "@/components/useEval";
import { usePlayerData } from "@/components/PlayerDataProvider";
import { useProgress } from "@/components/ProgressProvider";
import { scopedKey } from "@/lib/progress";
import { fmtGp } from "@/lib/format";
import { wikiUrl } from "@/lib/paths";
import {
  GEAR_TIERS,
  PERK_TARGETS,
  gearAtTier,
  gearForStyle,
  perksForStyle,
  upgradePath,
} from "@/lib/content/gear";
import type { GearEntry, GearSlot, GearStyle, PerkTarget } from "@/lib/content/gear";
import type { Accent, GateResult } from "@/lib/types";

// Only the four real combat styles are pickable. "any" is not a style you play —
// gearForStyle folds those utility slots into whichever style is selected.
type PickableStyle = Exclude<GearStyle, "any">;

const STYLES: { value: PickableStyle; label: string }[] = [
  { value: "melee", label: "Melee" },
  { value: "ranged", label: "Ranged" },
  { value: "magic", label: "Magic" },
  { value: "necromancy", label: "Necro" },
];

const STYLE_LABEL: Record<PickableStyle, string> = {
  melee: "Melee",
  ranged: "Ranged",
  magic: "Magic",
  necromancy: "Necromancy",
};

// Worn-equipment order, weapons first. `aura` is deliberately absent: the 2026
// Aura Overhaul removed the slot, so no entry can ever land in it.
const SLOT_ORDER: GearSlot[] = [
  "mainhand",
  "offhand",
  "2h",
  "head",
  "body",
  "legs",
  "hands",
  "feet",
  "cape",
  "neck",
  "ring",
  "pocket",
];

const SLOT_LABEL: Record<GearSlot, string> = {
  mainhand: "Main hand",
  offhand: "Off-hand",
  "2h": "Two-handed",
  head: "Head",
  body: "Armour set",
  legs: "Legs",
  hands: "Hands",
  feet: "Feet",
  cape: "Cape",
  neck: "Neck",
  ring: "Ring",
  aura: "Aura",
  pocket: "Pocket",
};

const SOURCE_LABEL: Record<GearEntry["source"], string> = {
  drop: "Boss drop",
  craft: "Crafted",
  shop: "Shop",
  quest: "Quest",
  invention: "Invention",
};

/** Progress-store key for "I own this piece". Stable forever — never rename. */
const ownedKey = (id: string) => `gear:${id}`;

const cost = (e: GearEntry) => (e.approxGp ? fmtGp(e.approxGp) : "Untradeable");

export default function GearClient() {
  const { players, contexts, loading, gate } = useEval();
  // Player choice is app-wide and persisted — never a page-local useState, or
  // picking Soclopata here and navigating away silently resets it.
  const { selected: player, setSelected } = usePlayerData();
  const progress = useProgress();
  const [style, setStyle] = useState<PickableStyle>("necromancy");

  const accent: Accent = player?.accent ?? "prayer";
  // Never hand-build an EvalContext: useEval owns the one that has fresh quests.
  const ctx = player ? contexts[player.slug] : undefined;
  const slug = player?.slug ?? null;

  const styleGear = useMemo(() => gearForStyle(style), [style]);

  // "Owned" is a claim about one player, so it reads from that player's
  // namespace — the same namespace <PlayerScope> makes the checkboxes write to.
  const isOwned = useMemo(() => {
    const values = progress.values;
    return (id: string) => values[scopedKey(slug, ownedKey(id))] === true;
  }, [progress.values, slug]);

  const owned = useMemo(
    () => styleGear.filter((g) => isOwned(g.id)),
    [styleGear, isOwned],
  );

  // upgradePath already drops finished gates and caps at one item per slot, so
  // the only thing left to strip is what the user has ticked as owned.
  const path = useMemo(() => {
    if (!ctx || loading) return [];
    return upgradePath(style, ctx).filter((e) => !isOwned(e.id));
  }, [ctx, loading, style, isOwned]);

  const groups = useMemo(
    () =>
      SLOT_ORDER.map((s) => ({
        slot: s,
        items: styleGear
          .filter((g) => g.slot === s)
          .sort((a, b) => a.itemTier - b.itemTier || a.name.localeCompare(b.name)),
      })).filter((g) => g.items.length > 0),
    [styleGear],
  );

  const perks = useMemo(() => perksForStyle(style), [style]);

  // Which ladder rungs the shortlist above picked, so the two surfaces read as
  // one answer instead of two unrelated lists of the same twenty items.
  const shortlistRank = useMemo(
    () => new Map(path.map((e, i) => [e.id, i + 1])),
    [path],
  );

  if (!player) {
    return (
      <div className="space-y-6">
        <SectionHead as="h1" title="Gear" hint="Endgame sets, weapons and perks" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  const apex = gearAtTier(95).filter((g) => g.style === style || g.style === "any");
  const apexOwned = apex.filter((g) => isOwned(g.id)).length;
  const allOwned = GEAR_TIERS.filter((g) => isOwned(g.id)).length;
  const shortlistGp = path.reduce((sum, e) => sum + (e.approxGp ?? 0), 0);
  const ownedPct = styleGear.length ? (owned.length / styleGear.length) * 100 : 0;

  return (
    <div className="space-y-8">
      <SectionHead
        as="h1"
        title="Gear"
        hint={`${STYLE_LABEL[style]} · tier 70 → 95`}
      />

      {/* Who + which style. One switcher idiom, the same one /pvm and /capes use. */}
      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          ariaLabel="Player"
          options={players.map((p) => ({ value: p.slug, label: p.name }))}
          value={player.slug}
          onChange={setSelected}
        />
        <Segmented
          ariaLabel="Combat style"
          size="sm"
          options={STYLES}
          value={style}
          onChange={setStyle}
        />
      </div>

      {/* Everything below is about one player: ticks land in their namespace. */}
      <PlayerScope slug={player.slug}>
        {/* Headline: how much of this style's ladder is actually in the bank. */}
        <Card accent={accent} className="p-5 lit-edge">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_1.6fr] lg:items-center">
            <div className="flex items-center gap-4">
              <Ring
                pct={ownedPct}
                size={72}
                stroke={5}
                accent={accent}
                label={`${Math.round(ownedPct)}% of ${STYLE_LABEL[style]} gear owned`}
              >
                <span className="font-mono tabular text-sm font-bold text-ink-2">
                  {Math.round(ownedPct)}%
                </span>
              </Ring>
              <div className="min-w-0">
                <Stat
                  label={`${player.name} · ${STYLE_LABEL[style]}`}
                  value={`${owned.length} / ${styleGear.length}`}
                  hint="pieces marked owned"
                  accent={accent}
                  size="lg"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-line lg:pt-0 lg:border-t-0 lg:pl-6 lg:border-l lg:border-line">
              <Stat
                label="Shortlist cost"
                size="sm"
                value={loading ? <Skeleton className="h-5 w-16" /> : fmtGp(shortlistGp)}
                hint="the upgrades below"
              />
              <Stat
                label="Apex T95"
                size="sm"
                accent="ash"
                value={`${apexOwned} / ${apex.length}`}
                hint="best in the game"
              />
              <Stat
                label="All styles"
                size="sm"
                value={`${allOwned} / ${GEAR_TIERS.length}`}
                hint="every tracked piece"
              />
            </div>
          </div>
        </Card>

        {/* ---------------------------------------------------------------- */}
        <section>
          <SectionHead
            title="Your next upgrades"
            hint="Closest gate first · one per slot"
          />
          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
              <Skeleton className="h-44" />
              <Skeleton className="h-44" />
              <Skeleton className="h-44" />
            </div>
          ) : path.length === 0 ? (
            <EmptyState
              title="Nothing left on the shortlist"
              hint={`Every ${STYLE_LABEL[style]} slot is either owned or already unlocked. Untick something below to bring it back.`}
            />
          ) : (
            // Two (three on very wide screens) to a row. One upgrade per full
            // 1150px row left two thirds of every row empty and parked the
            // readiness ring an inch away from the item it describes.
            <ol className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
              {path.map((e, i) => (
                <UpgradeStep
                  key={e.id}
                  step={i + 1}
                  entry={e}
                  gate={gate(player.slug, e.requirements)}
                  accent={accent}
                />
              ))}
            </ol>
          )}
        </section>

        {/* ---------------------------------------------------------------- */}
        <section>
          <SectionHead
            title="Full ladder"
            hint={`${styleGear.length} pieces · grouped by slot`}
          />

          {/* Below md this is one card per slot with hairline rows — the slot is
              the unit of scanning, not twenty identical cards. At md and up the
              same data becomes a real comparison table that scrolls inside its
              own box rather than dragging the page sideways. Both carry the
              actual missing requirements: "3 to go" told nobody anything. */}
          <div className="space-y-4 md:hidden">
            {groups.map((g) => (
              <Card key={g.slot} className="overflow-hidden">
                <h3 className="px-3 py-2 border-b border-line bg-bg-raised/40 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">
                  {SLOT_LABEL[g.slot]} · {g.items.length}
                </h3>
                <ul>
                  {g.items.map((e) => (
                    <GearListRow
                      key={e.id}
                      entry={e}
                      gate={loading ? null : gate(player.slug, e.requirements)}
                      accent={accent}
                      rank={shortlistRank.get(e.id)}
                    />
                  ))}
                </ul>
              </Card>
            ))}
          </div>

          <div className="hidden md:block overflow-x-auto rounded-lg border border-line bg-bg-surface">
            {/* table-fixed + explicit widths: left to itself the browser gave
                ITEM 54% of the table for names that need a third of that, and
                squeezed the gate bars into 144px where a 2% bar is a 2px stub.
                Gate is the unlabelled column here, so it takes the slack. */}
            <table className="w-full table-fixed min-w-[820px] text-sm border-collapse">
              <thead>
                <tr className="text-left font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-3">
                  <th scope="col" className="px-4 py-2 font-normal w-[34%]">Item</th>
                  <th scope="col" className="px-3 py-2 font-normal w-[104px]">Tier</th>
                  <th scope="col" className="px-3 py-2 font-normal w-[104px]">Source</th>
                  <th scope="col" className="px-3 py-2 font-normal w-[104px] text-right">Cost</th>
                  <th scope="col" className="px-3 py-2 font-normal">Gate</th>
                  <th scope="col" className="px-3 py-2 font-normal w-[60px] text-center">Owned</th>
                </tr>
              </thead>
              {groups.map((g) => (
                <tbody key={g.slot} className="border-t border-line">
                  <tr>
                    <th
                      scope="colgroup"
                      colSpan={6}
                      className="px-4 py-1.5 text-left font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-3 bg-bg-raised/40"
                    >
                      {SLOT_LABEL[g.slot]} · {g.items.length}
                    </th>
                  </tr>
                  {g.items.map((e) => (
                    <GearTableRow
                      key={e.id}
                      entry={e}
                      gate={loading ? null : gate(player.slug, e.requirements)}
                      accent={accent}
                      rank={shortlistRank.get(e.id)}
                    />
                  ))}
                </tbody>
              ))}
            </table>
          </div>

          <p className="mt-3 max-w-[72ch] text-xs text-ink-3 leading-relaxed">
            No aura row: the 2026 Aura Overhaul removed the aura slot from worn
            equipment and folded its effects into spells and level unlocks.
            Prices are an August 2026 GE snapshot, used to rank upgrades — not a
            live quote.
          </p>
        </section>
      </PlayerScope>

      {/* ------------------------------------------------------------------ */}
      <section>
        <SectionHead
          title="Invention perks"
          hint={`${perks.length} of ${PERK_TARGETS.length} combos apply to ${STYLE_LABEL[style]}`}
        />
        <Card className="p-4 mb-4 max-w-[72ch] text-xs text-ink-3 leading-relaxed">
          Every combo below is an <strong className="text-ink-2">ancient gizmo</strong>.
          The blueprint is made at 95 Archaeology in Howl&apos;s Floating Workshop and
          studied at 85 Invention (boostable to 68). Build level is a target, not a
          minimum — going in higher can push the roll past the rank you want.
        </Card>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {perks.map((p) => (
            <PerkCard key={p.id} perk={p} />
          ))}
        </div>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------

function ItemLink({ entry, className }: { entry: GearEntry; className?: string }) {
  return (
    <a
      href={wikiUrl(entry.wiki)}
      target="_blank"
      rel="noopener noreferrer"
      title={entry.blurb}
      className={clsx(
        "inline-flex items-center gap-1 text-ink hover:text-prayer-bright transition-colors",
        className,
      )}
    >
      <span className="min-w-0">{entry.name}</span>
      <ExternalLink size={11} className="shrink-0 text-ink-faint" aria-hidden="true" />
    </a>
  );
}

/**
 * Item tier, difficulty band and where it comes from, on one wrapping line.
 * `children` joins the same line, which is how the ladder row gets its gate bar
 * beside the metadata instead of on a line of its own.
 */
function ItemMeta({
  entry,
  children,
}: {
  entry: GearEntry;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="font-mono tabular text-[10.5px] text-ink-2">T{entry.itemTier}</span>
      <TierBadge tier={entry.tier} />
      <span className="font-mono text-[10.5px] uppercase tracking-wider text-ink-3">
        {SOURCE_LABEL[entry.source]}
      </span>
      {children}
    </div>
  );
}

function UpgradeStep({
  step,
  entry,
  gate,
  accent,
}: {
  step: number;
  entry: GearEntry;
  gate: GateResult;
  accent: Accent;
}) {
  return (
    <li className="h-full">
      <Card accent={accent} className="h-full p-3.5 flex flex-col gap-2.5">
        {/* The ring sits against the name it scores. It used to be pinned to the
            far right of a full-width row, ~700px from the nearest content. */}
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="grid place-items-center w-6 h-6 shrink-0 rounded-full bg-bg-raised font-mono text-[11px] font-bold text-ink-2"
          >
            {step}
          </span>
          <div className="min-w-0 flex-1">
            <ItemLink entry={entry} className="text-[15px] font-medium" />
            <p className="mt-1 text-xs text-ink-3 leading-relaxed">{entry.blurb}</p>
          </div>
          <Ring
            pct={gate.pct}
            size={44}
            accent={accent}
            label={`${Math.round(gate.pct)}% of the requirements for ${entry.name} are met`}
          />
        </div>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Pill>{SLOT_LABEL[entry.slot]}</Pill>
          <ItemMeta entry={entry} />
          <span className="font-mono tabular text-[11px] text-warn">{cost(entry)}</span>
        </div>

        <div className="mt-auto space-y-1.5">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-3">
            Still gated on
          </p>
          <ReqList results={gate.missing} limit={4} />
        </div>

        <Check storeKey={ownedKey(entry.id)} label="Owned" />
      </Card>
    </li>
  );
}

/**
 * Gate readout: the bar to compare rows against each other, the percentage to
 * read one row, and the actual blocking requirements — a count of unnamed
 * things ("3 to go") is not something anyone can act on.
 */
function GateCell({
  gate,
  accent,
  limit = 2,
}: {
  gate: GateResult | null;
  accent: Accent;
  limit?: number;
}) {
  if (!gate) return <Skeleton className="h-4 w-24" />;
  if (gate.complete) return <Pill tone="success">Ready</Pill>;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <Bar pct={gate.pct} accent={accent} height={4} />
        </div>
        <span className="shrink-0 font-mono tabular text-[10.5px] text-ink-3">
          {Math.round(gate.pct)}%
        </span>
      </div>
      <ReqList results={gate.missing} limit={limit} />
    </div>
  );
}

function GearTableRow({
  entry,
  gate,
  accent,
  rank,
}: {
  entry: GearEntry;
  gate: GateResult | null;
  accent: Accent;
  /** Position on the shortlist above, when this rung is the one it picked. */
  rank?: number;
}) {
  return (
    <tr className="border-t border-line/60 hover:bg-bg-raised/30 transition-colors">
      <td className="px-4 py-2.5 align-top">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <ItemLink entry={entry} />
          {rank != null && <Pill tone={accent}>Next · {rank}</Pill>}
        </span>
      </td>
      <td className="px-3 py-2.5 align-top">
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="font-mono tabular text-xs text-ink-2">T{entry.itemTier}</span>
          <TierBadge tier={entry.tier} />
        </span>
      </td>
      <td className="px-3 py-2.5 align-top text-xs text-ink-3">{SOURCE_LABEL[entry.source]}</td>
      <td className="px-3 py-2.5 align-top text-right font-mono tabular text-xs text-warn">
        {cost(entry)}
      </td>
      <td className="px-3 py-2.5 align-top">
        <GateCell gate={gate} accent={accent} />
      </td>
      <td className="px-3 py-2.5 align-top">
        <div className="flex justify-center">
          <Check
            storeKey={ownedKey(entry.id)}
            label={<span className="sr-only">Own {entry.name}</span>}
          />
        </div>
      </td>
    </tr>
  );
}

/**
 * Mobile ladder row. Two short lines plus the blocking requirements: name and
 * price, then tier/source and the gate bar on one wrapping line. The old
 * version was a full Card per item carrying the blurb again — twenty of them,
 * and none of them said what was actually missing.
 */
function GearListRow({
  entry,
  gate,
  accent,
  rank,
}: {
  entry: GearEntry;
  gate: GateResult | null;
  accent: Accent;
  /** Position on the shortlist above, when this rung is the one it picked. */
  rank?: number;
}) {
  return (
    <li className="flex items-start gap-2 px-3 py-2 border-t border-line/60 first:border-t-0">
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-baseline gap-2">
          <ItemLink entry={entry} className="text-sm font-medium min-w-0" />
          <span className="ml-auto shrink-0 font-mono tabular text-[11px] text-warn">
            {cost(entry)}
          </span>
        </div>
        <ItemMeta entry={entry}>
          {rank != null && <Pill tone={accent}>Next · {rank}</Pill>}
          {!gate ? (
            <Skeleton className="h-3 w-20" />
          ) : gate.complete ? (
            <Pill tone="success">Ready</Pill>
          ) : (
            <div className="flex flex-1 min-w-[104px] items-center gap-1.5">
              <div className="flex-1">
                <Bar pct={gate.pct} accent={accent} height={4} />
              </div>
              <span className="shrink-0 font-mono tabular text-[10.5px] text-ink-3">
                {Math.round(gate.pct)}%
              </span>
            </div>
          )}
        </ItemMeta>
        {gate && !gate.complete && <ReqList results={gate.missing} limit={2} />}
      </div>
      <div className="shrink-0">
        <Check
          storeKey={ownedKey(entry.id)}
          label={<span className="sr-only">Own {entry.name}</span>}
        />
      </div>
    </li>
  );
}

function PerkCard({ perk }: { perk: PerkTarget }) {
  return (
    <Card className="p-4 space-y-2.5">
      <div className="flex items-start justify-between gap-2">
        <a
          href={wikiUrl(perk.wiki)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[15px] font-medium text-ink hover:text-ash-bright transition-colors"
        >
          <span className="min-w-0">{perk.name}</span>
          <ExternalLink size={11} className="shrink-0 text-ink-faint" aria-hidden="true" />
        </a>
        <Pill tone="ash">{perk.gizmo}</Pill>
      </div>

      <p className="font-mono text-[11px] text-ink-2">
        {perk.components}
        <span className="text-ink-3"> · build at Invention {perk.inventionLevel}</span>
      </p>

      {perk.successPct != null && (
        <Meter
          label="Odds at that level"
          value={`${perk.successPct}%`}
          pct={perk.successPct}
          accent="ash"
        />
      )}

      <p className="text-xs text-ink-3 leading-relaxed">{perk.why}</p>
    </Card>
  );
}
