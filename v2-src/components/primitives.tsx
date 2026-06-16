import { clsx } from "clsx";

export function Card({
  className,
  accent,
  children,
}: {
  className?: string;
  accent?: "soul" | "prayer" | "ash";
  children: React.ReactNode;
}) {
  const accentClass =
    accent === "soul"
      ? "border-l-[3px] border-l-soul"
      : accent === "prayer"
        ? "border-l-[3px] border-l-prayer"
        : accent === "ash"
          ? "border-l-[3px] border-l-ash"
          : "";
  return (
    <div
      className={clsx(
        "bg-bg-surface border border-line rounded-lg",
        accentClass,
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
  accent,
  size = "md",
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  accent?: "soul" | "prayer" | "ash";
  size?: "sm" | "md" | "lg";
}) {
  const valueClass =
    size === "lg" ? "text-4xl" : size === "sm" ? "text-base" : "text-2xl";
  const tone =
    accent === "soul" ? "text-soul-bright"
    : accent === "prayer" ? "text-prayer-bright"
    : accent === "ash" ? "text-ash-bright"
    : "text-ink";
  return (
    <div className="space-y-1">
      <div className="text-[11px] uppercase tracking-[0.14em] font-mono text-ink-3">
        {label}
      </div>
      <div className={clsx("tabular font-mono font-bold", valueClass, tone)}>
        {value}
      </div>
      {hint && <div className="text-xs text-ink-3">{hint}</div>}
    </div>
  );
}

export function Bar({
  pct,
  accent = "prayer",
  height = 6,
}: {
  pct: number;
  accent?: "soul" | "prayer" | "ash" | "success";
  height?: number;
}) {
  const fill =
    accent === "soul" ? "bg-soul"
    : accent === "ash" ? "bg-ash"
    : accent === "success" ? "bg-success"
    : "bg-prayer";
  const safePct = Math.max(0, Math.min(100, pct));
  return (
    <div
      className="w-full rounded-full bg-bg-raised overflow-hidden"
      style={{ height }}
      role="progressbar"
      aria-valuenow={Math.round(safePct)}
      aria-valuemax={100}
    >
      <div
        className={clsx("h-full transition-all duration-500", fill)}
        style={{ width: `${safePct}%` }}
      />
    </div>
  );
}

export function Pill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "soul" | "prayer" | "ash" | "success" | "warn" | "danger";
}) {
  const map = {
    neutral: "border-line text-ink-2",
    soul:    "border-soul/40 text-soul-bright",
    prayer:  "border-prayer/40 text-prayer-bright",
    ash:     "border-ash/40 text-ash-bright",
    success: "border-success/40 text-success",
    warn:    "border-warn/40 text-warn",
    danger:  "border-danger/40 text-danger",
  };
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 h-5 px-2 rounded-full border text-[10.5px] font-mono uppercase tracking-wider",
        map[tone],
      )}
    >
      {children}
    </span>
  );
}

export function SectionHead({
  title,
  hint,
  right,
}: {
  title: string;
  hint?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <header className="flex items-end justify-between gap-4 pb-3 mb-4 border-b border-line">
      <div>
        <h2 className="font-display italic text-[22px] leading-none text-ink tracking-tight">
          {title}
        </h2>
        {hint && (
          <p className="mt-1 text-[12px] text-ink-3 font-mono uppercase tracking-[0.14em]">
            {hint}
          </p>
        )}
      </div>
      {right && <div className="flex items-center gap-2">{right}</div>}
    </header>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={clsx(
        "bg-bg-raised animate-pulse rounded-md",
        className,
      )}
    />
  );
}

export function EmptyState({
  title,
  hint,
}: {
  title: string;
  hint?: string;
}) {
  return (
    <div className="text-center py-12 px-6 border border-dashed border-line rounded-lg">
      <p className="font-display italic text-lg text-ink-2">{title}</p>
      {hint && <p className="mt-2 text-sm text-ink-3">{hint}</p>}
    </div>
  );
}
