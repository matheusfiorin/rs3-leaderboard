import { Skeleton } from "@/components/primitives";

/**
 * Mirrors the shape every route settles into — a section head, a stat strip,
 * then content cards — so the swap to real data doesn't shift the layout.
 */
export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>

      <div className="pb-3 mb-4 border-b border-line space-y-2">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-3 w-56" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-7 w-24" />
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-line bg-bg-surface p-4 space-y-3"
          >
            <Skeleton className="h-4 w-32" />
            {Array.from({ length: 4 }).map((__, j) => (
              <Skeleton key={j} className="h-10" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
