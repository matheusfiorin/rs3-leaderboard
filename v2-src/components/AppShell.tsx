"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  Coins,
  Compass,
  Crown,
  LayoutDashboard,
  Radio,
  Search,
  Sparkles,
  Swords,
  Wallet,
  Menu,
  X,
} from "lucide-react";
import { clsx } from "clsx";

const NAV = [
  { href: "/",         label: "Dashboard", icon: LayoutDashboard, group: "Overview" },
  { href: "/live",     label: "Live",      icon: Radio,           group: "Overview" },
  { href: "/activity", label: "Activity",  icon: Activity,        group: "Overview" },
  { href: "/skills",   label: "Skills",    icon: Swords,          group: "Progress" },
  { href: "/quests",   label: "Quests",    icon: Compass,         group: "Progress" },
  { href: "/goals",    label: "Goals",     icon: Sparkles,        group: "Progress" },
  { href: "/money",    label: "GP",        icon: Coins,           group: "Tools" },
  { href: "/lookup",   label: "Lookup",    icon: Search,          group: "Tools" },
  { href: "/archive",  label: "Archive",   icon: Crown,           group: "Memory" },
] as const;

const GROUPS = Array.from(new Set(NAV.map((n) => n.group)));

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-dvh flex flex-col">
      <TopBar onMenu={() => setOpen((v) => !v)} menuOpen={open} />
      <div className="flex flex-1 w-full max-w-[1480px] mx-auto">
        <Sidebar path={path} mobileOpen={open} onNav={() => setOpen(false)} />
        <main className="flex-1 min-w-0 px-4 sm:px-6 md:px-8 py-6 md:py-8">
          <motion.div
            key={path}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
          >
            {children}
          </motion.div>
        </main>
      </div>
      <BottomNav path={path} />
    </div>
  );
}

function TopBar({ onMenu, menuOpen }: { onMenu: () => void; menuOpen: boolean }) {
  return (
    <header className="sticky top-0 z-30 h-14 border-b border-line bg-bg/85 backdrop-blur md:backdrop-blur-md">
      <div className="h-full max-w-[1480px] mx-auto flex items-center justify-between px-4 sm:px-6 md:px-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="md:hidden -ml-1 p-2 text-ink-2 hover:text-ink"
            onClick={onMenu}
            aria-label="Toggle navigation"
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <Link href="/" className="flex items-baseline gap-1">
            <span className="font-display text-[20px] leading-none text-ink tracking-tight">
              Sexta
            </span>
            <span className="font-display italic text-[20px] leading-none text-soul-bright tracking-tight">
              Era
            </span>
          </Link>
          <span className="hidden sm:block text-[11px] uppercase tracking-[0.18em] font-mono text-ink-3">
            Sixth Age tracker
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/lookup"
            className="hidden sm:flex items-center gap-2 px-3 h-8 rounded-md border border-line text-xs text-ink-2 hover:text-ink hover:border-line-strong transition-colors"
          >
            <Search size={14} />
            <span>Lookup RSN</span>
            <kbd className="font-mono text-[10px] text-ink-3 border border-line rounded px-1">⌘K</kbd>
          </Link>
          <a
            href="/rs3-leaderboard/"
            className="text-[11px] uppercase tracking-[0.14em] font-mono text-ink-3 hover:text-ink-2 transition-colors"
            title="Back to v1"
          >
            v1 ↗
          </a>
        </div>
      </div>
    </header>
  );
}

function Sidebar({
  path,
  mobileOpen,
  onNav,
}: {
  path: string | null;
  mobileOpen: boolean;
  onNav: () => void;
}) {
  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="md:hidden fixed inset-0 top-14 z-20 bg-bg/70 backdrop-blur-sm"
          onClick={onNav}
        />
      )}
      <aside
        className={clsx(
          "md:sticky md:top-14 md:self-start md:h-[calc(100dvh-3.5rem)]",
          "md:w-56 md:flex-shrink-0 md:border-r md:border-line",
          "md:overflow-y-auto",
          mobileOpen
            ? "fixed top-14 left-0 bottom-0 w-64 z-20 bg-bg-surface border-r border-line overflow-y-auto"
            : "hidden md:block",
        )}
      >
        <nav className="px-3 py-5 space-y-6">
          {GROUPS.map((g) => (
            <div key={g}>
              <div className="px-2 mb-1 text-[10px] uppercase tracking-[0.18em] text-ink-faint font-mono">
                {g}
              </div>
              <ul className="space-y-px">
                {NAV.filter((n) => n.group === g).map((n) => {
                  const active = n.href === "/" ? path === "/" : path?.startsWith(n.href);
                  const Icon = n.icon;
                  return (
                    <li key={n.href}>
                      <Link
                        href={n.href}
                        onClick={onNav}
                        className={clsx(
                          "group relative flex items-center gap-3 h-9 px-2 rounded-md text-sm transition-colors",
                          active
                            ? "bg-bg-raised text-ink"
                            : "text-ink-2 hover:text-ink hover:bg-bg-raised/60",
                        )}
                      >
                        {active && (
                          <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] bg-soul rounded-full" />
                        )}
                        <Icon size={16} strokeWidth={1.6} />
                        <span>{n.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}

function BottomNav({ path }: { path: string | null }) {
  const items = [
    { href: "/",        label: "Home",   icon: LayoutDashboard },
    { href: "/skills",  label: "Skills", icon: Swords },
    { href: "/quests",  label: "Quests", icon: Compass },
    { href: "/money",   label: "GP",     icon: Wallet },
    { href: "/live",    label: "Live",   icon: Radio },
  ];
  return (
    <nav className="md:hidden sticky bottom-0 z-30 h-16 border-t border-line bg-bg/95 backdrop-blur grid grid-cols-5 pb-[env(safe-area-inset-bottom)]">
      {items.map((it) => {
        const active = it.href === "/" ? path === "/" : path?.startsWith(it.href);
        const Icon = it.icon;
        return (
          <Link
            key={it.href}
            href={it.href}
            className={clsx(
              "flex flex-col items-center justify-center gap-1 text-[10px] font-mono uppercase tracking-wider transition-colors",
              active ? "text-ink" : "text-ink-3",
            )}
          >
            <Icon size={18} strokeWidth={1.6} />
            <span>{it.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
