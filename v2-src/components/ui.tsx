"use client";

import { clsx } from "clsx";
import { createContext, useContext, useEffect, useState } from "react";
import { Check as CheckIcon, Minus, Plus } from "lucide-react";
import { iconUrl } from "@/lib/paths";
import { SKILLS } from "@/lib/skills";
import { describe } from "@/lib/requirements";
import { scopedKey } from "@/lib/progress";
import { useProgress } from "@/components/ProgressProvider";
import type { Accent, RequirementResult } from "@/lib/types";

// ---------------------------------------------------------------------------
// Player scope
//
// Manual ticks and kill counts belong to a player, not to the browser. Wrapping
// a per-player region in <PlayerScope slug={p.slug}> makes every <Check> and
// <CountInput> inside it write to that player's namespace automatically, so
// pages keep using short, readable storeKeys.
//
// Outside a scope, keys stay account-wide — correct for the handful of things
// that genuinely are shared.
// ---------------------------------------------------------------------------

const ScopeCtx = createContext<string | null>(null);

export function PlayerScope({
  slug,
  children,
}: {
  slug: string | null;
  children: React.ReactNode;
}) {
  return <ScopeCtx.Provider value={slug}>{children}</ScopeCtx.Provider>;
}

export function usePlayerScope(): string | null {
  return useContext(ScopeCtx);
}

// ---------------------------------------------------------------------------
// Accent plumbing
//
// Tailwind can't see class names built by string concatenation, so every accent
// variant is written out in full and picked from a map. Adding an accent means
// adding a row here, not editing call sites.
// ---------------------------------------------------------------------------

export const ACCENT_TEXT: Record<Accent, string> = {
  soul: "text-soul-bright",
  prayer: "text-prayer-bright",
  ash: "text-ash-bright",
};

export const ACCENT_BG: Record<Accent, string> = {
  soul: "bg-soul",
  prayer: "bg-prayer",
  ash: "bg-ash",
};

export const ACCENT_BORDER: Record<Accent, string> = {
  soul: "border-soul/40",
  prayer: "border-prayer/40",
  ash: "border-ash/40",
};

export const ACCENT_STROKE: Record<Accent, string> = {
  soul: "stroke-soul",
  prayer: "stroke-prayer",
  ash: "stroke-ash",
};

// ---------------------------------------------------------------------------
// Hydration-safe time
//
// A relative timestamp computed during static export freezes at build time and
// then disagrees with the client's clock on first paint. Rendering a stable
// placeholder until after mount keeps the server and client HTML identical.
// ---------------------------------------------------------------------------

export function RelativeTime({
  date,
  className,
  prefix,
}: {
  date: Date | string | number | null;
  className?: string;
  prefix?: string;
}) {
  const [text, setText] = useState<string>("—");

  useEffect(() => {
    if (date == null) return;
    const d = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(d.getTime())) return;

    const tick = () => setText(relative(d));
    tick();
    // Re-render on a cadence proportional to age: seconds matter for a minute,
    // then nobody notices below a minute of drift.
    const age = Date.now() - d.getTime();
    const period = age < 60_000 ? 5_000 : age < 3_600_000 ? 60_000 : 600_000;
    const id = setInterval(tick, period);
    return () => clearInterval(id);
  }, [date]);

  return (
    <span className={className} suppressHydrationWarning>
      {prefix ? `${prefix} ` : ""}
      {text}
    </span>
  );
}

function relative(d: Date, now = new Date()): string {
  const ms = now.getTime() - d.getTime();
  if (ms < 0) return "just now";
  const s = Math.floor(ms / 1000);
  // Cutoff at a full minute, not 45s — between the two you get "0m ago".
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days}d ago`;
  const mo = Math.floor(days / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(mo / 12)}y ago`;
}

// ---------------------------------------------------------------------------
// Progress ring
// ---------------------------------------------------------------------------

export function Ring({
  pct,
  size = 56,
  stroke = 4,
  accent = "prayer",
  children,
  label,
}: {
  pct: number;
  size?: number;
  stroke?: number;
  accent?: Accent;
  children?: React.ReactNode;
  label?: string;
}) {
  const safe = Math.max(0, Math.min(100, pct));
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - safe / 100);

  return (
    <div
      className="relative inline-grid place-items-center shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={label ?? `${Math.round(safe)}% complete`}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-bg-raised"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={clsx(
            ACCENT_STROKE[accent],
            "transition-[stroke-dashoffset] duration-700 ease-snappy",
          )}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        {/* Default centre is always a percentage, and always carries the unit.
            A bare number inside a ring is ambiguous — the same glyph was being
            read as a count on one card and a percentage on the next. Callers
            showing something other than a percentage must pass `children` AND
            label the unit themselves. */}
        {children ?? (
          <span className="font-mono tabular text-[11px] font-bold text-ink-2">
            {Math.round(safe)}
            <span className="text-[8px] text-ink-3 align-super ml-px">%</span>
          </span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Meter — labelled horizontal bar with a value on the right
// ---------------------------------------------------------------------------

export function Meter({
  label,
  value,
  pct,
  accent = "prayer",
  tone,
}: {
  label: React.ReactNode;
  value?: React.ReactNode;
  pct: number;
  accent?: Accent;
  tone?: "muted";
}) {
  const safe = Math.max(0, Math.min(100, pct));
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <span
          className={clsx(
            "text-xs truncate",
            tone === "muted" ? "text-ink-3" : "text-ink-2",
          )}
        >
          {label}
        </span>
        {value != null && (
          <span className="font-mono tabular text-[11px] text-ink-3 shrink-0">
            {value}
          </span>
        )}
      </div>
      <div
        className="h-1.5 w-full rounded-full bg-bg-raised overflow-hidden"
        role="progressbar"
        aria-valuenow={Math.round(safe)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={clsx(
            "h-full rounded-full transition-[width] duration-700 ease-snappy",
            ACCENT_BG[accent],
          )}
          style={{ width: `${safe}%` }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skill icon — real RS3 art, shipped locally under /data/icons
// ---------------------------------------------------------------------------

export function SkillIcon({
  id,
  size = 18,
  className,
}: {
  id: number;
  size?: number;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  const name = SKILLS.find((s) => s.id === id)?.key;
  if (!name || broken) {
    return (
      <span
        className={clsx(
          "inline-grid place-items-center rounded-sm bg-bg-raised text-[9px] font-mono text-ink-3",
          className,
        )}
        style={{ width: size, height: size }}
        aria-hidden="true"
      >
        {SKILLS.find((s) => s.id === id)?.abbr.slice(0, 2) ?? "?"}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static export, no loader
    <img
      src={iconUrl(`${name}-icon.png`)}
      width={size}
      height={size}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => setBroken(true)}
      className={clsx("inline-block align-middle", className)}
    />
  );
}

export function skillName(id: number): string {
  return SKILLS.find((s) => s.id === id)?.key ?? `Skill ${id}`;
}

// ---------------------------------------------------------------------------
// Requirement rendering
// ---------------------------------------------------------------------------

export function ReqChip({ result }: { result: RequirementResult }) {
  const { req, met, current } = result;
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 h-6 pl-1.5 pr-2 rounded-md border text-[11px] font-mono",
        met
          ? "border-success/25 text-success/90 bg-success/5"
          : "border-line text-ink-2 bg-bg-raised/50",
      )}
      title={req.note ?? undefined}
    >
      {req.kind === "skill" ? (
        <SkillIcon id={req.skill} size={13} />
      ) : met ? (
        <CheckIcon size={11} className="shrink-0" />
      ) : (
        <span className="w-[11px] text-center shrink-0 text-ink-faint">·</span>
      )}
      {/* The label is the entire point of the chip: it names what is blocking
          you. It wraps rather than truncating — a chip clipped to "Reaper
          necklace (…" tells the reader nothing, and these live in a wrapping
          row where a second line is free. */}
      <span className="whitespace-normal text-left leading-tight py-0.5">
        {describe(req)}
      </span>
      {!met && req.kind !== "quest" && req.kind !== "manual" && (
        <span className="text-ink-3 tabular shrink-0 whitespace-nowrap">
          {current}
        </span>
      )}
    </span>
  );
}

export function ReqList({
  results,
  limit,
  showMet = false,
}: {
  results: RequirementResult[];
  limit?: number;
  showMet?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const shown = showMet ? results : results.filter((r) => !r.met);
  const visible = limit && !expanded ? shown.slice(0, limit) : shown;
  const hidden = shown.length - visible.length;

  if (!shown.length) {
    return (
      <p className="text-[11px] font-mono uppercase tracking-wider text-success/80">
        All requirements met
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {visible.map((r, i) => (
        <ReqChip key={i} result={r} />
      ))}
      {/* A count of things you cannot see is not information. Make it open. */}
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="inline-flex items-center h-11 sm:h-6 px-3 sm:px-2 rounded-md border border-dashed border-line text-[11px] font-mono text-ink-2 hover:text-ink hover:border-line-strong transition-colors"
        >
          +{hidden} more
        </button>
      )}
      {expanded && limit && shown.length > limit && (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="inline-flex items-center h-11 sm:h-6 px-3 sm:px-2 rounded-md text-[11px] font-mono text-ink-3 hover:text-ink-2 transition-colors"
        >
          Show less
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Manual tracking controls — these write to the cross-device progress store
// ---------------------------------------------------------------------------

export function Check({
  storeKey,
  label,
  hint,
}: {
  storeKey: string;
  label: React.ReactNode;
  hint?: string;
}) {
  const progress = useProgress();
  const key = scopedKey(usePlayerScope(), storeKey);
  const checked = progress.isDone(key);
  return (
    <label
      className={clsx(
        "group flex items-start gap-2.5 py-1.5 cursor-pointer select-none",
        "min-h-[44px] sm:min-h-0 items-center",
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={() => progress.toggle(key)}
        className="sr-only peer"
      />
      <span
        aria-hidden="true"
        className={clsx(
          "mt-0 grid place-items-center w-[18px] h-[18px] shrink-0 rounded border transition-colors",
          "peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-prayer-bright peer-focus-visible:outline-offset-2",
          checked
            ? "bg-success/15 border-success/50 text-success"
            : "border-line-strong text-transparent group-hover:border-ink-3",
        )}
      >
        <CheckIcon size={12} strokeWidth={3} />
      </span>
      <span className="min-w-0">
        <span
          className={clsx(
            "text-sm transition-colors",
            checked ? "text-ink-3 line-through decoration-ink-faint" : "text-ink-2",
          )}
        >
          {label}
        </span>
        {hint && <span className="block text-[11px] text-ink-faint">{hint}</span>}
      </span>
    </label>
  );
}

export function CountInput({
  storeKey,
  label,
  step = 1,
  target,
}: {
  storeKey: string;
  label: React.ReactNode;
  step?: number;
  target?: number;
}) {
  const progress = useProgress();
  const key = scopedKey(usePlayerScope(), storeKey);
  const value = progress.count(key);
  const set = (n: number) => progress.set(key, Math.max(0, n));

  // While the field has focus, hold the raw text. Coercing "" to 0 on every
  // keystroke made the normal select-all → delete → type flow impossible: the
  // field snapped back to "0" the moment it was cleared.
  const [draft, setDraft] = useState<string | null>(null);

  // Every counter on a page announces itself identically to a screen reader
  // unless the owning entity's name is threaded into the control labels —
  // 39 buttons all called "Increase" is unusable.
  const name = typeof label === "string" ? label : "count";

  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="text-sm text-ink-2 min-w-0 flex-1 truncate">{label}</span>
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={() => set(value - step)}
          disabled={value === 0}
          aria-label={`Decrease ${name}`}
          className="grid place-items-center w-11 h-11 sm:w-8 sm:h-8 rounded-md border border-line text-ink-3 hover:text-ink hover:border-line-strong disabled:opacity-30 disabled:hover:text-ink-3 disabled:hover:border-line transition-colors"
        >
          <Minus size={14} />
        </button>
        <input
          type="number"
          inputMode="numeric"
          value={draft ?? value}
          min={0}
          onFocus={() => setDraft(String(value))}
          onChange={(e) => {
            const raw = e.target.value;
            setDraft(raw);
            if (raw !== "") set(parseInt(raw, 10) || 0);
          }}
          onBlur={() => {
            if (draft === "") set(0);
            setDraft(null);
          }}
          aria-label={name}
          className="w-16 h-11 sm:h-8 text-center rounded-md bg-bg-raised border border-line font-mono tabular text-sm text-ink focus:border-prayer/50 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <button
          type="button"
          onClick={() => set(value + step)}
          aria-label={`Increase ${name}`}
          className="grid place-items-center w-11 h-11 sm:w-8 sm:h-8 rounded-md border border-line text-ink-3 hover:text-ink hover:border-line-strong transition-colors"
        >
          <Plus size={14} />
        </button>
        {target != null && (
          <span className="ml-1 font-mono text-[11px] text-ink-3 tabular w-12">
            / {target}
          </span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Segmented control — the app's one filter idiom
// ---------------------------------------------------------------------------

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = "md",
  ariaLabel,
}: {
  options: { value: T; label: React.ReactNode; count?: number }[];
  value: T;
  onChange: (v: T) => void;
  size?: "sm" | "md";
  ariaLabel?: string;
}) {
  // Not a tablist. It was announcing role="tab" while implementing none of the
  // tab keyboard contract (roving tabindex, arrow keys, aria-controls), which
  // is worse for a screen-reader user than plain buttons. These are filter
  // toggles, so they are buttons with aria-pressed.
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      // On a narrow screen the chips used to wrap inside the pill, leaving
      // most of a second row as dead space inside a bordered container. A
      // single scrolling row reads correctly at any width.
      className="flex sm:inline-flex flex-nowrap sm:flex-wrap items-center gap-1 p-1 rounded-lg bg-bg-surface border border-line max-w-full overflow-x-auto sm:overflow-visible scroll-fade-x sm:[mask-image:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={clsx(
              "rounded-md font-mono uppercase tracking-wider transition-colors whitespace-nowrap",
              // 44px on touch, compact for a mouse. These were 28px tall,
              // below every touch-target guideline, and they are the primary
              // way to navigate the dense pages.
              size === "sm"
                ? "h-11 px-3 text-[10.5px] sm:h-7 sm:px-2.5"
                : "h-11 px-3.5 text-[11px] sm:h-8 sm:px-3",
              active
                ? "bg-bg-raised text-ink"
                : "text-ink-3 hover:text-ink-2 hover:bg-bg-raised/50",
            )}
          >
            {o.label}
            {o.count != null && (
              <span className="ml-1.5 text-ink-3 tabular">{o.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tier badge — shared visual language across bosses / dungeons / goals
// ---------------------------------------------------------------------------

const TIER_STYLE: Record<string, string> = {
  early: "border-success/30 text-success/90",
  mid: "border-prayer/30 text-prayer-bright",
  late: "border-warn/30 text-warn",
  end: "border-soul/30 text-soul-bright",
  apex: "border-ash/40 text-ash-bright",
};

export function TierBadge({ tier }: { tier: string }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center h-5 px-2 rounded-full border text-[10px] font-mono uppercase tracking-[0.14em]",
        TIER_STYLE[tier] ?? "border-line text-ink-3",
      )}
    >
      {tier}
    </span>
  );
}
