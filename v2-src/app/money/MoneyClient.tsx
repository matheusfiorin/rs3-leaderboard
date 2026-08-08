"use client";

import { useEffect, useMemo, useState } from "react";
import { clsx } from "clsx";
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
  rankMethods,
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
  none: "text-ink-faint",
};

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

interface Row {
  method: MoneyMethod;
  gp: number;
  gate: GateResult;
  priced: boolean;
}

/** Unpriced methods sort below every priced one instead of below zero-profit ones. */
const UNPRICED_SCORE = -1e15;
const scoreOf = (r: Row) => (r.priced ? r.gp : UNPRICED_SCORE);

// ---------------------------------------------------------------------------

export default function MoneyClient() {
  const { players, contexts, loading, gate } = useEval();
  const { meta } = usePlayerData();

  const [prices, setPrices] = useState<GePrices | null>(null);
  const [pricedAt, setPricedAt] = useState<Date | null>(null);
  const [priceError, setPriceError] = useState(false);

  const [slug, setSlug] = useState<string | null>(null);
  const [cat, setCat] = useState<CatFilter>("all");
  const [intensity, setIntensity] = useState<IntFilter>("all");
  const [member, setMember] = useState<MemberFilter>("all");
  const [availableOnly, setAvailableOnly] = useState(true);
  const [sort, setSort] = useState<SortKey>("gp");

  // Prices ride the same 30-minute cron as the player JSON, so they are fetched
  // at runtime rather than baked into the export.
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
        setPricedAt(lastMod ? new Date(lastMod) : null);
      } catch {
        if (!cancelled) setPriceError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const active = players.find((p) => p.slug === slug) ?? players[0];
  const accent: Accent = active?.accent ?? "prayer";
  const ctx = active ? contexts[active.slug] : undefined;

  const rows = useMemo<Row[]>(() => {
    if (!prices || !ctx) return [];
    return rankMethods(MONEY_METHODS, prices, ctx).map((r) => ({
      method: r.method,
      gp: r.gp,
      gate: r.gate,
      priced: isPriced(r.method, prices),
    }));
  }, [prices, ctx]);

  // Quests arrive on the client, so a gate evaluated before they land reports
  // every quest requirement as missing. Nothing gated renders until both halves
  // are in.
  const ready = prices !== null && ctx !== undefined && !loading;

  const unlocked = useMemo(() => rows.filter((r) => r.gate.complete), [rows]);
  const podium = useMemo(
    () =>
      unlocked
        .filter((r) => r.priced && r.gp > 0)
        .sort((a, b) => b.gp - a.gp)
        .slice(0, 3),
    [unlocked],
  );

  const shown = useMemo(() => {
    const filtered = rows.filter(({ method: m, gate: g }) => {
      if (cat !== "all" && m.category !== cat) return false;
      if (intensity !== "all" && m.intensity !== intensity) return false;
      if (member === "members" && !m.members) return false;
      if (member === "f2p" && m.members) return false;
      if (availableOnly && !g.complete) return false;
      return true;
    });
    return filtered.sort((a, b) => {
      if (sort === "closest") {
        if (a.gate.complete !== b.gate.complete) return a.gate.complete ? 1 : -1;
        if (!a.gate.complete) return b.gate.pct - a.gate.pct;
      }
      return scoreOf(b) - scoreOf(a);
    });
  }, [rows, cat, intensity, member, availableOnly, sort]);

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

  return (
    <div className="space-y-6">
      <SectionHead
        title="GP"
        hint={`${MONEY_METHODS.length} methods · live GE prices`}
      />

      {/* Headline: what is the best hour this account can spend right now. */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {ready ? (
          <>
            <Stat
              label="Your best rate"
              value={best ? `${fmtGp(best.gp)} / h` : "—"}
              hint={best ? best.method.name : "No priced method unlocked"}
              accent={accent}
            />
            <Stat
              label="Unlocked"
              value={`${unlocked.length} / ${rows.length}`}
              hint={`${rows.length - unlocked.length} still gated`}
            />
            <Stat
              label="Prices"
              value={
                <RelativeTime date={pricedAt ?? meta.timestamp} />
              }
              hint={`${fmt(Object.keys(prices ?? {}).length)} items cached`}
            />
          </>
        ) : (
          <>
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
          </>
        )}
      </div>

      {/* Player switcher */}
      <div className="flex flex-wrap items-center gap-2">
        {players.map((p) => {
          const on = p.slug === active?.slug;
          return (
            <button
              key={p.slug}
              type="button"
              aria-pressed={on}
              onClick={() => setSlug(p.slug)}
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

      {priceError && (
        <EmptyState
          title="GE prices unavailable"
          hint="data/ge_prices.json could not be fetched, so no rate can be calculated."
        />
      )}

      {!priceError && !ready && (
        <div className="space-y-3">
          <Skeleton className="h-32" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        </div>
      )}

      {ready && prices && (
        <>
          {/* Podium */}
          <section aria-labelledby="podium-head" className="space-y-3">
            <h3
              id="podium-head"
              className="text-[11px] font-mono uppercase tracking-[0.14em] text-ink-3"
            >
              Best three for {active?.name ?? "you"} right now
            </h3>
            {podium.length === 0 ? (
              <EmptyState
                title="Nothing unlocked yet"
                hint="Every priced method is still behind a requirement."
              />
            ) : (
              <div className="space-y-3">
                <PodiumHero row={podium[0]} accent={accent} />
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
          <div className="flex flex-wrap items-center gap-2">
            <Segmented
              ariaLabel="Category"
              size="sm"
              options={CATEGORIES}
              value={cat}
              onChange={setCat}
            />
            <Segmented
              ariaLabel="Intensity"
              size="sm"
              options={INTENSITIES}
              value={intensity}
              onChange={setIntensity}
            />
            <Segmented
              ariaLabel="Membership"
              size="sm"
              options={MEMBERSHIP}
              value={member}
              onChange={setMember}
            />
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
            <button
              type="button"
              aria-pressed={availableOnly}
              onClick={toggleAvailable}
              className={clsx(
                "h-11 px-3 rounded-lg border text-[11px] font-mono uppercase tracking-wider transition-colors",
                availableOnly
                  ? "border-success/40 text-success bg-success/5"
                  : "border-line text-ink-3 hover:text-ink-2",
              )}
            >
              Available to me
            </button>
          </div>

          <p className="text-xs text-ink-3">
            Showing {shown.length} of {rows.length} methods
            {availableOnly ? " · locked methods hidden" : ""}
          </p>

          {shown.length === 0 ? (
            <EmptyState
              title="No method matches"
              hint="Loosen a filter, or turn off “available to me” to see what is still gated."
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {shown.map((r) => (
                <MethodCard
                  key={r.method.id}
                  row={r}
                  prices={prices}
                  players={players}
                  gate={gate}
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

function PodiumHero({ row, accent }: { row: Row; accent: Accent }) {
  const { method: m, gp } = row;
  return (
    <Card accent={accent} className="p-5 lit-edge">
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
        style={{ fontSize: "clamp(34px, 9vw, 56px)" }}
      >
        {fmtGp(gp)}
        <span className="ml-2 text-base font-normal text-ink-3">/ hour</span>
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5">
        <Pill tone="ash">{m.category}</Pill>
        <Pill tone={INTENSITY_TONE[m.intensity]}>{m.intensity} effort</Pill>
        {!m.members && <Pill tone="success">F2P</Pill>}
        <TierBadge tier={m.tier} />
      </div>
    </Card>
  );
}

function PodiumMinor({ row, rank }: { row: Row; rank: number }) {
  const { method: m, gp } = row;
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
        <span className="font-mono tabular text-base text-ink whitespace-nowrap">
          {fmtGp(gp)}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Pill>{m.category}</Pill>
        <Pill tone={INTENSITY_TONE[m.intensity]}>{m.intensity}</Pill>
        {!m.members && <Pill tone="success">F2P</Pill>}
      </div>
    </Card>
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
}: {
  row: Row;
  prices: GePrices;
  players: { slug: string; name: string; accent: Accent }[];
  gate: (slug: string, reqs: MoneyMethod["requirements"]) => GateResult;
}) {
  const { method: m, gp, gate: g, priced } = row;
  const rate = rateLabel(gp, priced);

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
        <span
          className={clsx(
            "font-mono tabular text-sm whitespace-nowrap shrink-0",
            RATE_CLASS[rate.tone],
          )}
        >
          {rate.text}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {!g.complete && <Pill tone="warn">Locked</Pill>}
        <Pill>{m.category}</Pill>
        <Pill tone={INTENSITY_TONE[m.intensity]}>{m.intensity}</Pill>
        {!m.members && <Pill tone="success">F2P</Pill>}
        <TierBadge tier={m.tier} />
      </div>

      <div className="mt-3">
        {m.requirements.length === 0 ? (
          <p className="text-[11px] font-mono uppercase tracking-wider text-success/80">
            No requirements
          </p>
        ) : (
          <ReqList results={g.results} limit={6} />
        )}
      </div>

      {m.notes && (
        <p className="mt-3 text-[11px] leading-relaxed text-ink-faint">{m.notes}</p>
      )}

      {m.recipe && <RecipeDetails method={m} recipe={m.recipe} prices={prices} />}

      <div className="mt-3 pt-3 border-t border-line space-y-1">
        {players.map((p) => {
          const pg = gate(p.slug, m.requirements);
          return (
            <div key={p.slug} className="flex items-center justify-between gap-3 text-xs">
              <span className={clsx("font-mono", ACCENT_TEXT[p.accent])}>{p.name}</span>
              {pg.complete ? (
                <span className="text-success">Ready</span>
              ) : (
                <span className="font-mono tabular text-ink-faint">
                  {Math.round(pg.pct)}% · {pg.missing.length} to go
                </span>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function MethodIcon({ file }: { file?: string }) {
  const [broken, setBroken] = useState(false);
  if (!file || broken) return null;
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
  // The receipt states its own total from the same function the card headline
  // uses, so a future prop rename cannot leave the two disagreeing.
  const net = methodProfit(method, prices);
  const priced = isPriced(method, prices);
  const lines = [
    ...recipe.outputs.map((r) => ({ ...r, dir: 1 as const })),
    ...recipe.inputs.map((r) => ({ ...r, dir: -1 as const })),
  ];

  return (
    <details className="group mt-3 pt-3 border-t border-line">
      <summary className="flex min-h-[44px] items-center justify-between gap-3 text-[11px] font-mono uppercase tracking-wider text-ink-3 hover:text-ink-2">
        <span>Recipe · per hour</span>
        <span className="text-ink-faint">
          <span className="group-open:hidden">show</span>
          <span className="hidden group-open:inline">hide</span>
        </span>
      </summary>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[300px] border-collapse text-[11px] font-mono tabular">
          <thead>
            <tr className="text-ink-faint uppercase tracking-wider">
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
                  <td className="py-1.5 px-2 text-right text-ink-3">{fmt(l.qty)}</td>
                  <td className="py-1.5 px-2 text-right text-ink-3">
                    {unit === null ? (
                      <span className="text-warn">no price</span>
                    ) : (
                      fmt(unit)
                    )}
                  </td>
                  <td
                    className={clsx(
                      "py-1.5 pl-2 text-right",
                      unit === null ? "text-warn" : l.dir > 0 ? "text-success" : "text-danger",
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
                className={clsx(
                  "py-1.5 pl-2 text-right",
                  !priced ? "text-warn" : net >= 0 ? "text-ink" : "text-danger",
                )}
              >
                {rateLabel(net, priced).text}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </details>
  );
}
