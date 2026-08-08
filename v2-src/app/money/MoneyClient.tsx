"use client";

import { useEffect, useMemo, useState } from "react";
import { clsx } from "clsx";
import { ChevronDown } from "lucide-react";
import {
  Card,
  EmptyState,
  Pill,
  SectionHead,
  Skeleton,
  Stat,
} from "@/components/primitives";
import {
  ACCENT_BORDER,
  ACCENT_TEXT,
  RelativeTime,
  ReqList,
  Segmented,
  TierBadge,
} from "@/components/ui";
import { useEval } from "@/components/useEval";
import { usePlayerData } from "@/components/PlayerDataProvider";
import {
  MONEY_METHODS,
  methodProfit,
  type MoneyCategory,
  type MoneyIntensity,
  type MoneyMethod,
  type MoneyRecipe,
} from "@/lib/content/money";
import { fmt, fmtGp } from "@/lib/format";
import { dataUrl, iconUrl, wikiUrl } from "@/lib/paths";
import type { Accent, GePrices, GateResult } from "@/lib/types";

// ---------------------------------------------------------------------------
// Pricing helpers
// ---------------------------------------------------------------------------

/**
 * Can this method's gp/hr be trusted?
 *
 * methodProfit() returns 0 both for "every price is missing" and for "this
 * genuinely breaks even", so the UI has to ask separately — printing
 * "0 gp/hr" for an unpriced method reads as a worthless method, which is a
 * different and wrong claim.
 *
 * This only asks "is the number usable", not "is the number computed": a
 * recipe-less method answers yes off its hardcoded `baseGpPerHour`. Which of
 * the two it is has to be visible on the card — see `RateValue`.
 */
function isPriced(m: MoneyMethod, prices: GePrices): boolean {
  if (!m.recipe) return typeof m.baseGpPerHour === "number" && m.baseGpPerHour > 0;
  return [...m.recipe.inputs, ...m.recipe.outputs].every(
    (r) => (prices[String(r.id)]?.price ?? 0) > 0,
  );
}

function unitPrice(id: number, prices: GePrices): number | null {
  const p = prices[String(id)]?.price;
  return typeof p === "number" && p > 0 ? p : null;
}

function itemName(id: number, prices: GePrices): string {
  return prices[String(id)]?.name ?? `Item ${id}`;
}

type RateTone = "good" | "bad" | "none";

/** fmtGp renders negatives raw and 0 as an em dash, neither of which suits a rate. */
function rateLabel(gp: number, priced: boolean): { text: string; tone: RateTone } {
  if (!priced) return { text: "price unavailable", tone: "none" };
  if (gp > 0) return { text: `${fmtGp(gp)} / h`, tone: "good" };
  if (gp < 0) return { text: `-${fmtGp(-gp)} / h`, tone: "bad" };
  return { text: "break-even", tone: "none" };
}

const RATE_CLASS: Record<RateTone, string> = {
  good: "text-ink",
  bad: "text-danger",
  // Never ink-faint — these are words, and words have to clear AA.
  none: "text-ink-3",
};

const EST_TITLE =
  "Stated estimate: this method has no GE-priced recipe, so the rate is a fixed figure from the method database rather than a calculation.";
const COMPUTED_TITLE =
  "Computed from the GE price cache: output value minus input cost, per hour.";

/**
 * The rate, with the guesses marked as guesses.
 *
 * Most of the 68 methods print a hardcoded `baseGpPerHour` in exactly the type
 * a computed rate uses, so "Smelt mithril bars" and "Kill Bork" both read
 * "500.0k / h" with nothing separating a receipt from a rumour — and the
 * mithril card's own note admits its item id is absent from the cache. The `~`
 * and the EST tag are that separation.
 */
function RateValue({ row, className }: { row: Row; className?: string }) {
  const rate = rateLabel(row.gp, row.priced);
  const approx = row.priced && row.estimated;
  return (
    <span
      title={row.estimated ? EST_TITLE : COMPUTED_TITLE}
      className={clsx(
        "font-mono tabular whitespace-nowrap",
        RATE_CLASS[rate.tone],
        className,
      )}
    >
      {approx ? "~" : ""}
      {rate.text}
      {approx && (
        <span className="ml-1.5 text-[9.5px] font-normal uppercase tracking-[0.12em] text-ink-3">
          est
        </span>
      )}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

type CatFilter = "all" | MoneyCategory;
type IntFilter = "all" | MoneyIntensity;
type MemberFilter = "all" | "members" | "f2p";
type SortKey = "gp" | "closest";

const CATEGORIES: { value: CatFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "processing", label: "Proc" },
  { value: "gathering", label: "Gather" },
  { value: "combat", label: "Combat" },
  { value: "afk", label: "AFK" },
  { value: "daily", label: "Daily" },
];

const INTENSITIES: { value: IntFilter; label: string }[] = [
  { value: "all", label: "Any" },
  { value: "low", label: "Low" },
  { value: "moderate", label: "Mod" },
  { value: "high", label: "High" },
];

const MEMBERSHIP: { value: MemberFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "members", label: "P2P" },
  { value: "f2p", label: "F2P" },
];

const INTENSITY_TONE: Record<MoneyIntensity, "success" | "warn" | "soul"> = {
  low: "success",
  moderate: "warn",
  high: "soul",
};

/**
 * A filter group with its subject stated.
 *
 * Four unlabelled chip rows produced a mobile viewport reading
 * "ANY LOW MOD HIGH" with nothing saying those words describe effort — the
 * ariaLabel existed for screen readers only. The caption also gives every group
 * a shared top edge, so the block reads as a control bar instead of flex-wrap
 * output.
 */
function FilterGroup({
  caption,
  children,
}: {
  caption: string;
  children: React.ReactNode;
}) {
  return (
    <div className="w-full min-w-0 sm:w-auto">
      <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">
        {caption}
      </div>
      {children}
    </div>
  );
}

interface Row {
  method: MoneyMethod;
  gp: number;
  gate: GateResult;
  priced: boolean;
  /** The rate is a stated figure, not one derived from cached prices. */
  estimated: boolean;
}

/** Unpriced methods sort below every priced one instead of below zero-profit ones. */
const UNPRICED_SCORE = -1e15;
const scoreOf = (r: Row) => (r.priced ? r.gp : UNPRICED_SCORE);

/**
 * Stand-in used until the quest lists land.
 *
 * A gate evaluated without quests reports every quest requirement as missing,
 * so until they arrive the page must not claim to know anything: no Locked
 * pill, no missing-requirement chips, no "available to me" filtering.
 */
const UNKNOWN_GATE: GateResult = {
  results: [],
  met: [],
  missing: [],
  pct: 0,
  complete: false,
};

const DAY_MS = 24 * 60 * 60 * 1000;

type Roster = { slug: string; name: string; accent: Accent }[];
type GateFn = (slug: string, reqs: MoneyMethod["requirements"]) => GateResult;

// ---------------------------------------------------------------------------

export default function MoneyClient({
  initialPrices,
  initialPricedAt,
}: {
  initialPrices: GePrices;
  initialPricedAt: string | null;
}) {
  const { players, contexts, loading, gate } = useEval();
  const { meta, selected, setSelected } = usePlayerData();

  // Seeded from the prerender so the first paint already has every rate. The
  // fetch below is the refresh path: prices ride the same 30-minute cron as the
  // player JSON, which does not rebuild the site.
  const [prices, setPrices] = useState<GePrices>(initialPrices);
  const [pricedAt, setPricedAt] = useState<string | null>(initialPricedAt);
  const [priceError, setPriceError] = useState(false);

  const [cat, setCat] = useState<CatFilter>("all");
  const [intensity, setIntensity] = useState<IntFilter>("all");
  const [member, setMember] = useState<MemberFilter>("all");
  const [availableOnly, setAvailableOnly] = useState(true);
  const [sort, setSort] = useState<SortKey>("gp");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const r = await fetch(dataUrl("ge_prices.json"), { cache: "no-cache" });
        if (!r.ok) throw new Error(`http ${r.status}`);
        const json = (await r.json()) as GePrices;
        if (cancelled) return;
        const lastMod = r.headers.get("last-modified");
        setPrices(json);
        if (lastMod) {
          const d = new Date(lastMod);
          if (!Number.isNaN(d.getTime())) setPricedAt(d.toISOString());
        }
      } catch {
        if (!cancelled) setPriceError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Player choice is shared and persisted, so picking Soclopata on /pvm and
  // clicking through to GP keeps you on Soclopata.
  const active = selected;
  const accent: Accent = active?.accent ?? "prayer";
  const ctx = active ? contexts[active.slug] : undefined;

  const pricesReady = useMemo(() => Object.keys(prices).length > 0, [prices]);
  // Quests arrive on the client. Everything gate-derived waits for them; the
  // method list, its rates and its receipts do not — which is the whole reason
  // this route can prerender at all.
  const gatesReady = !loading && ctx !== undefined && active !== undefined;

  const rows = useMemo<Row[]>(() => {
    if (!pricesReady) return [];
    return MONEY_METHODS.map((method) => ({
      method,
      gp: methodProfit(method, prices),
      gate:
        gatesReady && active ? gate(active.slug, method.requirements) : UNKNOWN_GATE,
      priced: isPriced(method, prices),
      estimated: !method.recipe,
    })).sort((a, b) => scoreOf(b) - scoreOf(a));
  }, [prices, pricesReady, gatesReady, active, gate]);

  /** How many rates are receipts and how many are assertions. */
  const priceMix = useMemo(() => {
    let computed = 0;
    let estimated = 0;
    for (const m of MONEY_METHODS) {
      if (!isPriced(m, prices)) continue;
      if (m.recipe) computed += 1;
      else estimated += 1;
    }
    return { computed, estimated, items: Object.keys(prices).length };
  }, [prices]);

  const bestF2p = useMemo(
    () => rows.find((r) => !r.method.members && r.priced),
    [rows],
  );

  const unlocked = useMemo(
    () => (gatesReady ? rows.filter((r) => r.gate.complete) : []),
    [rows, gatesReady],
  );
  const podium = useMemo(
    () =>
      unlocked
        .filter((r) => r.priced && r.gp > 0)
        .sort((a, b) => b.gp - a.gp)
        .slice(0, 3),
    [unlocked],
  );
  const podiumIds = useMemo(() => new Set(podium.map((r) => r.method.id)), [podium]);

  const shown = useMemo(() => {
    const filtered = rows.filter(({ method: m, gate: g }) => {
      if (cat !== "all" && m.category !== cat) return false;
      if (intensity !== "all" && m.intensity !== intensity) return false;
      if (member === "members" && !m.members) return false;
      if (member === "f2p" && m.members) return false;
      if (gatesReady && availableOnly && !g.complete) return false;
      // The top three already have full cards directly above, blurbs and all.
      // Repeating them here duplicated the entire first screen at 1920.
      if (podiumIds.has(m.id)) return false;
      return true;
    });
    return filtered.sort((a, b) => {
      if (sort === "closest") {
        if (a.gate.complete !== b.gate.complete) return a.gate.complete ? 1 : -1;
        if (!a.gate.complete) return b.gate.pct - a.gate.pct;
      }
      return scoreOf(b) - scoreOf(a);
    });
  }, [rows, cat, intensity, member, availableOnly, sort, gatesReady, podiumIds]);

  // "Closest to unlock" has nothing to rank while locked methods are hidden, so
  // the two controls flip each other rather than producing an empty answer.
  function changeSort(v: SortKey) {
    setSort(v);
    if (v === "closest") setAvailableOnly(false);
  }
  function toggleAvailable() {
    const next = !availableOnly;
    setAvailableOnly(next);
    if (next && sort === "closest") setSort("gp");
  }

  const best = podium[0];

  /**
   * The reason to keep reading: priced methods that beat the current best hour
   * and are still gated, nearest-to-unlock first. This used to be reachable
   * only by switching the sort to "Closest" and turning off a filter.
   */
  const upgrades = useMemo(() => {
    if (!best) return [];
    return rows
      .filter((r) => !r.gate.complete && r.priced && r.gp > best.gp)
      .sort((a, b) => b.gate.pct - a.gate.pct)
      .slice(0, 3);
  }, [rows, best]);

  // Age is measured after mount only. Comparing against Date.now() during the
  // prerender bakes build-day staleness into the HTML and then disagrees with
  // the reader's clock.
  const priceStamp = pricedAt ?? meta.timestamp;
  const [nowMs, setNowMs] = useState<number | null>(null);
  useEffect(() => {
    // Deferred rather than set synchronously in the effect body: the initial
    // null render is what keeps the server and client HTML identical, so the
    // clock must land on a later tick.
    const tick = () => setNowMs(Date.now());
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 10 * 60 * 1000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);
  const stampMs = new Date(priceStamp).getTime();
  const pricesStale =
    nowMs !== null && Number.isFinite(stampMs) && nowMs - stampMs > DAY_MS;

  return (
    <div className="space-y-6">
      <SectionHead
        as="h1"
        title="GP"
        // Was "live GE prices", printed above a stat saying the cache was a day
        // old and above a list where most rates are not priced at all.
        hint={`${MONEY_METHODS.length} methods · ${priceMix.computed} GE-priced · ${priceMix.estimated} estimated`}
      />

      {/* Headline: what is the best hour this account can spend right now.
          Four cells, so the mobile 2-column grid comes out square instead of
          orphaning a third stat beside 164px of nothing. */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {gatesReady ? (
          <>
            <Stat
              label="Your best rate"
              value={best ? `${best.estimated ? "~" : ""}${fmtGp(best.gp)} / h` : "—"}
              hint={best ? best.method.name : "No priced method unlocked"}
              accent={accent}
            />
            <Stat
              label="Unlocked for you"
              value={`${unlocked.length} / ${rows.length}`}
              hint={`${rows.length - unlocked.length} still gated`}
            />
          </>
        ) : (
          <>
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
          </>
        )}
        <Stat
          label="Top rate on record"
          value={rows[0] ? `${rows[0].estimated ? "~" : ""}${fmtGp(rows[0].gp)} / h` : "—"}
          hint={rows[0]?.method.name ?? "No prices loaded"}
        />
        <Stat
          label="Best without membership"
          value={
            bestF2p ? `${bestF2p.estimated ? "~" : ""}${fmtGp(bestF2p.gp)} / h` : "—"
          }
          hint={bestF2p?.method.name ?? "No F2P method priced"}
        />
      </div>

      {/* Provenance, at the size of a footnote rather than a headline. The cache
          age used to be typeset at ~30px bold next to the gp/hr figure, so a
          staleness number read as an achievement. */}
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-lg border border-line bg-bg-surface px-3 py-2.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">
          GE cache
        </span>
        <span
          className={clsx(
            "font-mono tabular text-xs",
            pricesStale ? "text-warn" : "text-ink-2",
          )}
        >
          <RelativeTime date={priceStamp} />
        </span>
        <span className="text-xs text-ink-3">
          {fmt(priceMix.items)} items · {priceMix.computed} rates computed from it
          {priceMix.estimated > 0 && (
            <> · {priceMix.estimated} stated estimates, marked ~</>
          )}
          {pricesStale && <span className="text-warn"> · over a day old</span>}
          {/* The prerendered table still works, so this is a note, not a wall. */}
          {priceError && pricesReady && (
            <span className="text-warn"> · refresh failed, showing the built-in copy</span>
          )}
        </span>
      </div>

      {/* Player switcher — reads and writes the shared, persisted selection. */}
      <div className="flex flex-wrap items-center gap-2">
        {players.map((p) => {
          const on = p.slug === active?.slug;
          return (
            <button
              key={p.slug}
              type="button"
              aria-pressed={on}
              onClick={() => setSelected(p.slug)}
              className={clsx(
                "h-11 px-4 rounded-md border text-sm transition-colors",
                on
                  ? clsx(ACCENT_TEXT[p.accent], ACCENT_BORDER[p.accent], "bg-bg-raised")
                  : "border-line text-ink-3 hover:text-ink-2 hover:bg-bg-raised/50",
              )}
            >
              {p.name}
            </button>
          );
        })}
      </div>

      {priceError && !pricesReady && (
        <EmptyState
          title="GE prices unavailable"
          hint="data/ge_prices.json could not be read, so no rate can be calculated."
        />
      )}

      {pricesReady && (
        <>
          {/* Podium */}
          <section aria-labelledby="podium-head" className="space-y-3">
            <h2
              id="podium-head"
              className="text-[11px] font-mono uppercase tracking-[0.14em] text-ink-3"
            >
              Best three for {active?.name ?? "you"} right now
            </h2>
            {!gatesReady ? (
              <div className="space-y-3">
                <Skeleton className="h-40" />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Skeleton className="h-24" />
                  <Skeleton className="h-24" />
                </div>
              </div>
            ) : podium.length === 0 ? (
              <EmptyState
                title="Nothing unlocked yet"
                hint="Every priced method is still behind a requirement."
              />
            ) : (
              <div className="space-y-3">
                <PodiumHero
                  row={podium[0]}
                  accent={accent}
                  prices={prices}
                  players={players}
                  gate={gate}
                  upgrades={upgrades}
                />
                {podium.length > 1 && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {podium.slice(1).map((r, i) => (
                      <PodiumMinor key={r.method.id} row={r} rank={i + 2} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Filters */}
          <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
            <FilterGroup caption="Category">
              <Segmented
                ariaLabel="Category"
                size="sm"
                options={CATEGORIES}
                value={cat}
                onChange={setCat}
              />
            </FilterGroup>
            <FilterGroup caption="Effort">
              <Segmented
                ariaLabel="Effort"
                size="sm"
                options={INTENSITIES}
                value={intensity}
                onChange={setIntensity}
              />
            </FilterGroup>
            <FilterGroup caption="Access">
              <Segmented
                ariaLabel="Access"
                size="sm"
                options={MEMBERSHIP}
                value={member}
                onChange={setMember}
              />
            </FilterGroup>
            <FilterGroup caption="Sort">
              <Segmented
                ariaLabel="Sort"
                size="sm"
                options={[
                  { value: "gp", label: "gp/hr" },
                  { value: "closest", label: "Closest" },
                ]}
                value={sort}
                onChange={changeSort}
              />
            </FilterGroup>
            <FilterGroup caption="Availability">
              <button
                type="button"
                aria-pressed={availableOnly}
                disabled={!gatesReady}
                onClick={toggleAvailable}
                title={
                  gatesReady
                    ? undefined
                    : "Waiting on the quest list before it can tell what you have unlocked"
                }
                // sm:h-[38px] is the segmented control's exact outer height
                // (28px chip + 8px padding + 2px border). At h-11 it terminated
                // the row at a different height from every control beside it.
                className={clsx(
                  "h-11 w-full rounded-lg border px-3 font-mono text-[10.5px] uppercase tracking-wider transition-colors sm:h-[38px] sm:w-auto",
                  !gatesReady
                    ? "border-line text-ink-3 cursor-not-allowed"
                    : availableOnly
                      ? "border-success/40 bg-success/5 text-success"
                      : "border-line text-ink-3 hover:text-ink-2",
                )}
              >
                Available to me
              </button>
            </FilterGroup>
          </div>

          <p className="text-xs text-ink-3">
            {gatesReady ? (
              <>
                Showing {shown.length} of {rows.length} methods
                {availableOnly ? " · locked hidden" : ""}
                {podiumIds.size > 0 ? ` · top ${podiumIds.size} shown above` : ""}
              </>
            ) : (
              <>
                Showing all {rows.length} methods — checking{" "}
                {active?.name ?? "your"} requirements…
              </>
            )}
          </p>

          {shown.length === 0 ? (
            <EmptyState
              title="No method matches"
              hint="Loosen a filter, or turn off “available to me” to see what is still gated."
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {shown.map((r) => (
                <MethodCard
                  key={r.method.id}
                  row={r}
                  prices={prices}
                  players={players}
                  gate={gate}
                  gatesReady={gatesReady}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Podium
// ---------------------------------------------------------------------------

/**
 * The #1 recommendation.
 *
 * At 1920 this card is ~1350px wide and it used to stop putting ink down around
 * x=750 — the first object on the page was two thirds empty bordered card. The
 * second column now answers the two questions the headline provokes (where does
 * the number come from, and what would beat it), so the width carries work
 * instead of padding.
 */
function PodiumHero({
  row,
  accent,
  prices,
  players,
  gate,
  upgrades,
}: {
  row: Row;
  accent: Accent;
  prices: GePrices;
  players: Roster;
  gate: GateFn;
  upgrades: Row[];
}) {
  const { method: m, gp } = row;
  return (
    <Card accent={accent} className="p-5 lit-edge">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-8">
        <div className="min-w-0">
          <div className="flex items-start gap-3">
            <span className="grid place-items-center w-7 h-7 shrink-0 rounded-full border border-ash/40 font-mono text-xs text-ash-bright">
              1
            </span>
            <div className="min-w-0 flex-1">
              <a
                href={wikiUrl(m.wiki)}
                target="_blank"
                rel="noopener noreferrer"
                className="font-display italic text-xl text-ink hover:text-ash-bright break-words"
              >
                {m.name}
              </a>
              <p className="mt-1 text-sm text-ink-3">{m.blurb}</p>
            </div>
          </div>
          <div
            className={clsx(
              "mt-4 font-mono tabular font-bold leading-none",
              ACCENT_TEXT[accent],
            )}
            style={{ fontSize: "clamp(34px, 9vw, 52px)" }}
            title={row.estimated ? EST_TITLE : COMPUTED_TITLE}
          >
            {row.estimated ? "~" : ""}
            {fmtGp(gp)}
            <span className="ml-2 text-base font-normal text-ink-3">/ hour</span>
          </div>
          {row.estimated && (
            <p className="mt-1.5 text-[11px] text-ink-3">
              Stated estimate — this one has no GE-priced recipe.
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-1.5">
            <Pill tone="ash">{m.category}</Pill>
            <Pill tone={INTENSITY_TONE[m.intensity]}>{m.intensity} effort</Pill>
            {!m.members && <Pill tone="success">F2P</Pill>}
            <TierBadge tier={m.tier} />
          </div>
        </div>

        <div className="min-w-0 space-y-4 border-t border-line pt-4 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8">
          {m.recipe ? (
            <div className="min-w-0">
              <h3 className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">
                Where the number comes from · per hour
              </h3>
              <RecipeTable method={m} recipe={m.recipe} prices={prices} />
            </div>
          ) : (
            <div className="min-w-0">
              <h3 className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">
                What it takes
              </h3>
              {m.requirements.length === 0 ? (
                <p className="font-mono text-[11px] uppercase tracking-wider text-success/80">
                  Nothing — you can start this now
                </p>
              ) : (
                <ReqList results={row.gate.results} showMet />
              )}
            </div>
          )}
          {m.notes && (
            <p className="text-[11px] leading-relaxed text-ink-3">{m.notes}</p>
          )}

          {upgrades.length > 0 && (
            <div className="min-w-0 border-t border-line pt-3">
              <h3 className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">
                Better hours still locked · nearest first
              </h3>
              <ul className="space-y-2.5">
                {upgrades.map((u) => (
                  <li key={u.method.id} className="min-w-0">
                    <div className="flex items-baseline justify-between gap-3">
                      <a
                        href={wikiUrl(u.method.wiki)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-w-0 break-words text-xs text-ink-2 hover:text-ash-bright"
                      >
                        {u.method.name}
                      </a>
                      <span className="flex shrink-0 items-baseline gap-2">
                        <span className="font-mono tabular text-[11px] text-ink-3">
                          {Math.round(u.gate.pct)}%
                        </span>
                        <RateValue row={u} className="text-xs" />
                      </span>
                    </div>
                    <div className="mt-1">
                      <ReqList results={u.gate.missing} limit={2} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <ReadyFor players={players} gate={gate} reqs={m.requirements} title="Ready for" />
        </div>
      </div>
    </Card>
  );
}

function PodiumMinor({ row, rank }: { row: Row; rank: number }) {
  const { method: m } = row;
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <span className="grid place-items-center w-6 h-6 shrink-0 rounded-full border border-line-strong font-mono text-[11px] text-ink-3">
            {rank}
          </span>
          <a
            href={wikiUrl(m.wiki)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-ink hover:text-ash-bright break-words"
          >
            {m.name}
          </a>
        </div>
        <RateValue row={row} className="text-base shrink-0" />
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Pill>{m.category}</Pill>
        {/* Bare "HIGH" next to a bare tier badge is two adjectives with no
            subjects. Say which one is effort. */}
        <Pill tone={INTENSITY_TONE[m.intensity]}>{m.intensity} effort</Pill>
        {!m.members && <Pill tone="success">F2P</Pill>}
        <TierBadge tier={m.tier} />
      </div>
    </Card>
  );
}

/** Who on the roster can run this right now. */
function ReadyFor({
  players,
  gate,
  reqs,
  title,
}: {
  players: Roster;
  gate: GateFn;
  reqs: MoneyMethod["requirements"];
  title?: string;
}) {
  return (
    <div className="space-y-1 border-t border-line pt-3">
      {title && (
        <h3 className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">
          {title}
        </h3>
      )}
      {players.map((p) => {
        const pg = gate(p.slug, reqs);
        return (
          <div
            key={p.slug}
            // Cap the measure instead of throwing a name and a value at
            // opposite ends of a 1300px card.
            className="flex max-w-[26rem] items-center justify-between gap-3 text-xs"
          >
            <span className={clsx("font-mono", ACCENT_TEXT[p.accent])}>{p.name}</span>
            {pg.complete ? (
              <span className="text-success">Ready</span>
            ) : (
              <span className="font-mono tabular text-ink-3">
                {Math.round(pg.pct)}% · {pg.missing.length} to go
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Method card
// ---------------------------------------------------------------------------

function MethodCard({
  row,
  prices,
  players,
  gate,
  gatesReady,
}: {
  row: Row;
  prices: GePrices;
  players: Roster;
  gate: GateFn;
  gatesReady: boolean;
}) {
  const { method: m, gate: g } = row;

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <MethodIcon file={m.icon} />
          <div className="min-w-0">
            <a
              href={wikiUrl(m.wiki)}
              target="_blank"
              rel="noopener noreferrer"
              className="font-display italic text-lg text-ink hover:text-ash-bright break-words"
            >
              {m.name}
            </a>
            <p className="mt-0.5 text-xs text-ink-3">{m.blurb}</p>
          </div>
        </div>
        <RateValue row={row} className="text-sm shrink-0" />
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {gatesReady && !g.complete && <Pill tone="warn">Locked</Pill>}
        <Pill>{m.category}</Pill>
        <Pill tone={INTENSITY_TONE[m.intensity]}>{m.intensity} effort</Pill>
        {!m.members && <Pill tone="success">F2P</Pill>}
        <TierBadge tier={m.tier} />
      </div>

      <div className="mt-3">
        {m.requirements.length === 0 ? (
          <p className="text-[11px] font-mono uppercase tracking-wider text-success/80">
            No requirements
          </p>
        ) : gatesReady ? (
          <ReqList results={g.results} limit={6} />
        ) : (
          // Counting them is honest; listing them as "missing" before the quest
          // list lands is not.
          <p className="text-[11px] font-mono uppercase tracking-wider text-ink-3">
            {m.requirements.length} requirement{m.requirements.length === 1 ? "" : "s"}
          </p>
        )}
      </div>

      {m.notes && (
        <p className="mt-3 text-[11px] leading-relaxed text-ink-3">{m.notes}</p>
      )}

      {m.recipe && <RecipeDetails method={m} recipe={m.recipe} prices={prices} />}

      {gatesReady && (
        <div className="mt-3">
          <ReadyFor players={players} gate={gate} reqs={m.requirements} />
        </div>
      )}
    </Card>
  );
}

/**
 * Item icon, or the space one would have taken.
 *
 * Returning null let the title column jump 32px left whenever a method had no
 * icon or the file 404'd, so a grid of 68 cards never settled its titles onto a
 * line. The slot is now unconditional.
 */
function MethodIcon({ file }: { file?: string }) {
  const [broken, setBroken] = useState(false);
  if (!file || broken) {
    return <span aria-hidden="true" className="mt-1 block w-[22px] h-[22px] shrink-0" />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static export, no loader
    <img
      src={iconUrl(file)}
      width={22}
      height={22}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => setBroken(true)}
      className="mt-1 shrink-0"
    />
  );
}

// ---------------------------------------------------------------------------
// Recipe — the receipt behind the gp/hr number
// ---------------------------------------------------------------------------

function RecipeDetails({
  method,
  recipe,
  prices,
}: {
  method: MoneyMethod;
  recipe: MoneyRecipe;
  prices: GePrices;
}) {
  return (
    <details className="group mt-3 pt-3 border-t border-line">
      <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-3 text-[11px] font-mono uppercase tracking-wider text-ink-3 hover:text-ink-2 [&::-webkit-details-marker]:hidden">
        <span>Recipe · per hour</span>
        {/* Was an 11px "show" in ink-faint at about 2.2:1 — indistinguishable
            from disabled static text. A rotating chevron is the affordance. */}
        <ChevronDown
          size={16}
          aria-hidden="true"
          className="shrink-0 text-ink-3 transition-transform duration-200 group-open:rotate-180"
        />
      </summary>
      <RecipeTable method={method} recipe={recipe} prices={prices} />
    </details>
  );
}

function RecipeTable({
  method,
  recipe,
  prices,
}: {
  method: MoneyMethod;
  recipe: MoneyRecipe;
  prices: GePrices;
}) {
  // The receipt states its own total from the same function the card headline
  // uses, so a future prop rename cannot leave the two disagreeing.
  const net = methodProfit(method, prices);
  const priced = isPriced(method, prices);
  const lines = [
    ...recipe.outputs.map((r) => ({ ...r, dir: 1 as const })),
    ...recipe.inputs.map((r) => ({ ...r, dir: -1 as const })),
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[11px] font-mono tabular">
        {/* No min-width floor: a 300px floor inside the 294px wrapper at 360px
            overflowed by 6px, which is too little to read as a scroller and cut
            the Value column mid-glyph ("VALU", "2.5M /"). At w-full the numeric
            columns fit their own tokens down to 320px, and if a wide unit price
            ever forces the table past the wrapper it scrolls by a visible
            amount instead of silently shaving the rightmost digits.

            The item name is the only cell that may wrap, so it takes the slack
            and the three numeric columns keep their tokens whole. */}
        <colgroup>
          <col />
          <col className="w-[13%]" />
          <col className="w-[18%]" />
          <col className="w-[26%]" />
        </colgroup>
        <thead>
          <tr className="text-ink-3 uppercase tracking-wider">
            <th scope="col" className="py-1 pr-2 text-left font-normal">Item</th>
            <th scope="col" className="py-1 px-2 text-right font-normal">Qty</th>
            <th scope="col" className="py-1 px-2 text-right font-normal">Unit</th>
            <th scope="col" className="py-1 pl-2 text-right font-normal">Value</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l) => {
            const unit = unitPrice(l.id, prices);
            return (
              <tr key={`${l.dir}-${l.id}`} className="border-t border-line">
                <td className="py-1.5 pr-2 text-ink-2">
                  <span className={l.dir > 0 ? "text-success/80" : "text-ink-3"}>
                    {l.dir > 0 ? "+" : "-"}
                  </span>{" "}
                  {itemName(l.id, prices)}
                </td>
                <td className="py-1.5 px-2 text-right text-ink-3 whitespace-nowrap">
                  {fmt(l.qty)}
                </td>
                <td className="py-1.5 px-2 text-right text-ink-3 whitespace-nowrap">
                  {unit === null ? <span className="text-warn">no price</span> : fmt(unit)}
                </td>
                <td
                  className={clsx(
                    "py-1.5 pl-2 text-right whitespace-nowrap",
                    unit === null
                      ? "text-warn"
                      : l.dir > 0
                        ? "text-success"
                        : "text-danger",
                  )}
                >
                  {unit === null ? "—" : `${l.dir > 0 ? "" : "-"}${fmtGp(unit * l.qty)}`}
                </td>
              </tr>
            );
          })}
          <tr className="border-t border-line-strong">
            <td className="py-1.5 pr-2 text-ink-3 uppercase tracking-wider">Net</td>
            <td />
            <td />
            <td
              // Without nowrap the rate broke mid-token at 360px: "4.8M /" on
              // one line and "h" on the next.
              className={clsx(
                "py-1.5 pl-2 text-right whitespace-nowrap",
                !priced ? "text-warn" : net >= 0 ? "text-ink" : "text-danger",
              )}
            >
              {rateLabel(net, priced).text}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
