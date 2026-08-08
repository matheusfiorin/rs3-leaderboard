"use client";

import { useMemo, useState } from "react";
import { clsx } from "clsx";
import { ExternalLink } from "lucide-react";
import { Bar, Card, EmptyState, Pill, SectionHead, Skeleton, Stat } from "@/components/primitives";
import {
  ACCENT_TEXT,
  Check,
  Meter,
  ReqList,
  Ring,
  Segmented,
  TierBadge,
} from "@/components/ui";
import { useEval } from "@/components/useEval";
import { useProgress } from "@/components/ProgressProvider";
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

// Full literal class strings — Tailwind cannot see a name built at runtime.
const ACCENT_SOFT: Record<Accent, string> = {
  soul: "bg-soul/10 border-soul/40",
  prayer: "bg-prayer/10 border-prayer/40",
  ash: "bg-ash/10 border-ash/40",
};

/** Progress-store key for "I own this piece". Stable forever — never rename. */
const ownedKey = (id: string) => `gear:${id}`;

const cost = (e: GearEntry) => (e.approxGp ? fmtGp(e.approxGp) : "Untradeable");

export default function GearClient() {
  const { players, contexts, loading, gate } = useEval();
  const progress = useProgress();
  const [playerIdx, setPlayerIdx] = useState(0);
  const [style, setStyle] = useState<PickableStyle>("necromancy");

  const player = players[playerIdx];
  const accent: Accent = player?.accent ?? "prayer";
  // Never hand-build an EvalContext: useEval owns the one that has fresh quests.
  const ctx = player ? contexts[player.slug] : undefined;

  const styleGear = useMemo(() => gearForStyle(style), [style]);

  const owned = useMemo(
    () => styleGear.filter((g) => progress.isDone(ownedKey(g.id))),
    [styleGear, progress],
  );

  // upgradePath already drops finished gates and caps at one item per slot, so
  // the only thing left to strip is what the user has ticked as owned.
  const path = useMemo(() => {
    if (!ctx || loading) return [];
    return upgradePath(style, ctx).filter((e) => !progress.isDone(ownedKey(e.id)));
  }, [ctx, loading, style, progress]);

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

  if (!player) {
    return (
      <div className="space-y-6">
        <SectionHead title="Gear" hint="Endgame sets, weapons and perks" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  const apex = gearAtTier(95).filter((g) => g.style === style || g.style === "any");
  const apexOwned = apex.filter((g) => progress.isDone(ownedKey(g.id))).length;
  const allOwned = GEAR_TIERS.filter((g) => progress.isDone(ownedKey(g.id))).length;
  const shortlistGp = path.reduce((sum, e) => sum + (e.approxGp ?? 0), 0);
  const ownedPct = styleGear.length ? (owned.length / styleGear.length) * 100 : 0;

  return (
    <div className="space-y-8">
      <SectionHead
        title="Gear"
        hint={`${STYLE_LABEL[style]} · tier 70 → 95`}
      />

      {/* Who + which style. Both switchers stay above the fold on mobile. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          {players.map((p, i) => (
            <button
              key={p.slug}
              type="button"
              onClick={() => setPlayerIdx(i)}
              aria-current={i === playerIdx}
              className={clsx(
                "h-11 px-4 rounded-md border text-sm transition-colors",
                i === playerIdx
                  ? clsx(ACCENT_SOFT[p.accent], ACCENT_TEXT[p.accent])
                  : "border-line text-ink-3 hover:text-ink-2",
              )}
            >
              {p.name}
            </button>
          ))}
        </div>
        <Segmented
          ariaLabel="Combat style"
          options={STYLES}
          value={style}
          onChange={setStyle}
        />
      </div>

      {/* Headline: how much of this style's ladder is actually in the bank. */}
      <Card accent={accent} className="p-5 lit-edge">
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
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-5 pt-4 border-t border-line">
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
      </Card>

      {/* ------------------------------------------------------------------ */}
      <section>
        <SectionHead
          title="Your next upgrades"
          hint="Closest gate first · one per slot"
        />
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </div>
        ) : path.length === 0 ? (
          <EmptyState
            title="Nothing left on the shortlist"
            hint={`Every ${STYLE_LABEL[style]} slot is either owned or already unlocked. Untick something below to bring it back.`}
          />
        ) : (
          <ol className="space-y-3">
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

      {/* ------------------------------------------------------------------ */}
      <section>
        <SectionHead
          title="Full ladder"
          hint={`${styleGear.length} pieces · grouped by slot`}
        />

        {/* Below sm this is a card list; at sm and up a real table that scrolls
            inside its own box rather than dragging the page sideways. */}
        <div className="space-y-6 sm:hidden">
          {groups.map((g) => (
            <div key={g.slot} className="space-y-2">
              <h3 className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">
                {SLOT_LABEL[g.slot]}
              </h3>
              {g.items.map((e) => (
                <GearCardRow
                  key={e.id}
                  entry={e}
                  gate={loading ? null : gate(player.slug, e.requirements)}
                  accent={accent}
                />
              ))}
            </div>
          ))}
        </div>

        <div className="hidden sm:block overflow-x-auto rounded-lg border border-line bg-bg-surface">
          <table className="w-full min-w-[720px] text-sm border-collapse">
            <thead>
              <tr className="text-left font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-3">
                <th scope="col" className="px-4 py-2 font-normal">Item</th>
                <th scope="col" className="px-3 py-2 font-normal w-28">Tier</th>
                <th scope="col" className="px-3 py-2 font-normal w-28">Source</th>
                <th scope="col" className="px-3 py-2 font-normal w-24 text-right">Cost</th>
                <th scope="col" className="px-3 py-2 font-normal w-36">Gate</th>
                <th scope="col" className="px-3 py-2 font-normal w-16 text-center">Owned</th>
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
                    {SLOT_LABEL[g.slot]}
                  </th>
                </tr>
                {g.items.map((e) => (
                  <GearTableRow
                    key={e.id}
                    entry={e}
                    gate={loading ? null : gate(player.slug, e.requirements)}
                    accent={accent}
                  />
                ))}
              </tbody>
            ))}
          </table>
        </div>

        <p className="mt-3 text-xs text-ink-3 leading-relaxed">
          No aura row: the 2026 Aura Overhaul removed the aura slot from worn
          equipment and folded its effects into spells and level unlocks.
          Prices are an August 2026 GE snapshot, used to rank upgrades — not a
          live quote.
        </p>
      </section>

      {/* ------------------------------------------------------------------ */}
      <section>
        <SectionHead
          title="Invention perks"
          hint={`${perks.length} of ${PERK_TARGETS.length} combos apply to ${STYLE_LABEL[style]}`}
        />
        <Card className="p-4 mb-4 text-xs text-ink-3 leading-relaxed">
          Every combo below is an <strong className="text-ink-2">ancient gizmo</strong>.
          The blueprint is made at 95 Archaeology in Howl&apos;s Floating Workshop and
          studied at 85 Invention (boostable to 68). Build level is a target, not a
          minimum — going in higher can push the roll past the rank you want.
        </Card>
        <div className="grid gap-3 sm:grid-cols-2">
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
    <li>
      <Card accent={accent} className="p-4">
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="grid place-items-center w-7 h-7 shrink-0 rounded-full bg-bg-raised font-mono text-xs font-bold text-ink-2"
          >
            {step}
          </span>

          <div className="min-w-0 flex-1 space-y-2.5">
            <div>
              <ItemLink entry={entry} className="text-[15px] font-medium" />
              <p className="mt-1 text-xs text-ink-3 leading-relaxed">{entry.blurb}</p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <Pill>{SLOT_LABEL[entry.slot]}</Pill>
              <Pill tone="neutral">T{entry.itemTier}</Pill>
              <TierBadge tier={entry.tier} />
              <Pill>{SOURCE_LABEL[entry.source]}</Pill>
              <span className="font-mono tabular text-[11px] text-warn">
                {cost(entry)}
              </span>
            </div>

            <div>
              <p className="mb-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-3">
                Still gated on
              </p>
              <ReqList results={gate.missing} limit={6} />
            </div>

            <Check storeKey={ownedKey(entry.id)} label="Owned" />
          </div>

          <Ring
            pct={gate.pct}
            size={44}
            accent={accent}
            label={`${Math.round(gate.pct)}% toward ${entry.name}`}
          />
        </div>
      </Card>
    </li>
  );
}

function GateCell({ gate, accent }: { gate: GateResult | null; accent: Accent }) {
  if (!gate) return <Skeleton className="h-4 w-20" />;
  if (gate.complete) return <Pill tone="success">Ready</Pill>;
  return (
    <div className="space-y-1 w-28">
      <Bar pct={gate.pct} accent={accent} height={4} />
      <span className="font-mono tabular text-[10.5px] text-ink-3">
        {Math.round(gate.pct)}% · {gate.missing.length} to go
      </span>
    </div>
  );
}

function GearTableRow({
  entry,
  gate,
  accent,
}: {
  entry: GearEntry;
  gate: GateResult | null;
  accent: Accent;
}) {
  return (
    <tr className="border-t border-line/60 hover:bg-bg-raised/30 transition-colors">
      <td className="px-4 py-2.5">
        <ItemLink entry={entry} />
      </td>
      <td className="px-3 py-2.5">
        <span className="flex items-center gap-1.5">
          <span className="font-mono tabular text-xs text-ink-2">T{entry.itemTier}</span>
          <TierBadge tier={entry.tier} />
        </span>
      </td>
      <td className="px-3 py-2.5 text-xs text-ink-3">{SOURCE_LABEL[entry.source]}</td>
      <td className="px-3 py-2.5 text-right font-mono tabular text-xs text-warn">
        {cost(entry)}
      </td>
      <td className="px-3 py-2.5">
        <GateCell gate={gate} accent={accent} />
      </td>
      <td className="px-3 py-2.5">
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

function GearCardRow({
  entry,
  gate,
  accent,
}: {
  entry: GearEntry;
  gate: GateResult | null;
  accent: Accent;
}) {
  return (
    <Card className="p-3 space-y-2">
      <ItemLink entry={entry} className="text-sm font-medium" />
      <p className="text-xs text-ink-3 leading-relaxed">{entry.blurb}</p>
      <div className="flex flex-wrap items-center gap-1.5">
        <Pill>T{entry.itemTier}</Pill>
        <TierBadge tier={entry.tier} />
        <Pill>{SOURCE_LABEL[entry.source]}</Pill>
        <span className="font-mono tabular text-[11px] text-warn">{cost(entry)}</span>
      </div>
      <GateCell gate={gate} accent={accent} />
      <Check storeKey={ownedKey(entry.id)} label="Owned" />
    </Card>
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
        <span className="text-ink-faint"> · build at Invention {perk.inventionLevel}</span>
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
