// Single Intl.NumberFormat instance, cached. fmt() called everywhere.
const NF = new Intl.NumberFormat("en-US");
const NF_COMPACT = new Intl.NumberFormat("en-US", {
  notation: "compact",
  compactDisplay: "short",
  maximumFractionDigits: 2,
});

export function fmt(n: number | null | undefined): string {
  if (n == null) return "—";
  return NF.format(n);
}

export function fmtCompact(n: number | null | undefined): string {
  if (n == null) return "—";
  if (Math.abs(n) < 1000) return String(n);
  return NF_COMPACT.format(n);
}

export function fmtGp(n: number | null | undefined): string {
  if (n == null || n === 0) return "—";
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + "B";
  if (n >= 1_000_000)     return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)         return (n / 1_000).toFixed(1) + "k";
  return String(n);
}

export function fmtRelative(d: Date | null, now = new Date()): string {
  if (!d) return "—";
  const ms = now.getTime() - d.getTime();
  if (ms < 0) return "now";
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
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
