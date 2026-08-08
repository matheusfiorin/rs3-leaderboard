import Link from "next/link";
import {
  Activity,
  Compass,
  LayoutDashboard,
  Radio,
  Search,
  Skull,
  Sparkles,
  Swords,
} from "lucide-react";
import { Card } from "@/components/primitives";

// Next only reads a `metadata` export from layout.js / page.js, so the title
// here stays whatever the root layout set — no inert export pretending otherwise.
const DESTINATIONS = [
  { href: "/", label: "Dashboard", hint: "Both accounts at a glance", icon: LayoutDashboard },
  { href: "/skills", label: "Skills", hint: "All 29, XP to next", icon: Swords },
  { href: "/quests", label: "Quests", hint: "Side-by-side compare", icon: Compass },
  { href: "/goals", label: "Goals", hint: "What unlocks next", icon: Sparkles },
  { href: "/pvm", label: "PvM", hint: "Bosses and gates", icon: Skull },
  { href: "/live", label: "Live", hint: "XP ticker", icon: Radio },
  { href: "/activity", label: "Activity", hint: "Combined feed", icon: Activity },
  { href: "/lookup", label: "Lookup", hint: "Any RSN", icon: Search },
] as const;

export default function NotFound() {
  return (
    <div className="max-w-2xl mx-auto py-8 sm:py-14 space-y-8">
      <header className="text-center">
        <p className="font-mono text-[64px] sm:text-[88px] leading-none font-bold tabular text-soul-dim">
          404
        </p>
        <h1 className="mt-4 font-display italic text-3xl text-ink tracking-tight">
          This page never wrote itself into the Sixth Age
        </h1>
        <p className="mt-3 text-sm text-ink-2 leading-relaxed max-w-md mx-auto">
          The address doesn&apos;t match any route in the tracker. Everything the site
          knows how to show is one tap away.
        </p>
      </header>

      <nav aria-label="Site sections">
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {DESTINATIONS.map((d) => {
            const Icon = d.icon;
            return (
              <li key={d.href}>
                <Link
                  href={d.href}
                  className="flex items-center gap-3 min-h-[56px] px-4 rounded-lg border border-line bg-bg-surface text-ink-2 hover:text-ink hover:border-line-strong hover:bg-bg-raised/60 transition-colors"
                >
                  <Icon size={17} strokeWidth={1.6} className="shrink-0 text-ink-3" />
                  <span className="min-w-0">
                    <span className="block text-sm text-ink">{d.label}</span>
                    <span className="block text-[11px] text-ink-3 truncate">{d.hint}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <Card className="p-4">
        <p className="text-xs text-ink-3 leading-relaxed">
          Landed here from a bookmark? The site moved to its own domain root when v1
          retired, so older <code className="font-mono text-ink-2">/v2/…</code> links no
          longer resolve. Start from the{" "}
          <Link href="/" className="text-prayer-bright hover:underline">
            dashboard
          </Link>{" "}
          instead.
        </p>
      </Card>
    </div>
  );
}
