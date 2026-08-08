"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Activity,
  Coins,
  Compass,
  Crown,
  Gem,
  LayoutDashboard,
  Menu,
  Radio,
  RefreshCw,
  Search,
  Shield,
  Skull,
  Sparkles,
  Swords,
  X,
} from "lucide-react";
import { clsx } from "clsx";
import { usePlayerData } from "@/components/PlayerDataProvider";
import { RelativeTime } from "@/components/ui";

const NAV = [
  { href: "/",          label: "Dashboard", icon: LayoutDashboard, group: "Overview" },
  { href: "/live",      label: "Live",      icon: Radio,           group: "Overview" },
  { href: "/activity",  label: "Activity",  icon: Activity,        group: "Overview" },

  { href: "/skills",    label: "Skills",    icon: Swords,          group: "Progress" },
  { href: "/quests",    label: "Quests",    icon: Compass,         group: "Progress" },
  { href: "/goals",     label: "Goals",     icon: Sparkles,        group: "Progress" },

  { href: "/pvm",       label: "PvM",       icon: Skull,           group: "Endgame" },
  { href: "/dungeons",  label: "Dungeons",  icon: Shield,          group: "Endgame" },
  { href: "/gear",      label: "Gear",      icon: Gem,             group: "Endgame" },
  { href: "/capes",     label: "Capes",     icon: Crown,           group: "Endgame" },

  { href: "/money",     label: "GP",        icon: Coins,           group: "Tools" },
  { href: "/lookup",    label: "Lookup",    icon: Search,          group: "Tools" },
  { href: "/settings",  label: "Sync",      icon: RefreshCw,       group: "Tools" },

  { href: "/archive",   label: "In Memoriam", icon: Crown,         group: "Memory" },
] as const;

const GROUPS = Array.from(new Set(NAV.map((n) => n.group)));

/** Five thumb-reachable destinations. Everything else lives behind the menu. */
const BOTTOM = [
  { href: "/",       label: "Home",   icon: LayoutDashboard },
  { href: "/skills", label: "Skills", icon: Swords },
  { href: "/pvm",    label: "PvM",    icon: Skull },
  { href: "/goals",  label: "Goals",  icon: Sparkles },
  { href: "/quests", label: "Quests", icon: Compass },
] as const;

function isActive(path: string | null, href: string): boolean {
  if (!path) return false;
  return href === "/" ? path === "/" : path.startsWith(href);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [seenPath, setSeenPath] = useState(path);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  // Close the drawer on route change so a tap-through — or a browser back —
  // doesn't leave it hanging over the page it just navigated to. Adjusting
  // during render rather than in an effect avoids a second paint with the
  // drawer still open.
  if (seenPath !== path) {
    setSeenPath(path);
    setOpen(false);
  }

  // The drawer is a modal overlay, so Escape must dismiss it and focus must
  // return to the control that opened it. Without this a keyboard user who
  // opens the menu has no way back out.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      menuButtonRef.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Lock body scroll while the mobile drawer is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <div className="min-h-dvh flex flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-2 focus:left-2 focus:px-3 focus:py-2 focus:rounded-md focus:bg-bg-raised focus:text-ink focus:border focus:border-line-strong"
      >
        Skip to content
      </a>

      <TopBar
        onMenu={() => setOpen((v) => !v)}
        menuOpen={open}
        menuButtonRef={menuButtonRef}
      />

      {/* The sidebar is anchored to the viewport edge, not to the centred
          content column. Wrapping both in one max-width container left the nav
          floating 220px off the left edge above 1480px, which read as broken. */}
      <div className="flex flex-1 w-full">
        <Sidebar path={path} mobileOpen={open} onNav={() => setOpen(false)} />
        <main
          id="main"
          tabIndex={-1}
          className="flex-1 min-w-0 px-4 sm:px-6 md:px-8 py-6 md:py-8 pb-24 md:pb-8"
        >
          <div key={path} className="route-enter mx-auto w-full max-w-[1400px]">
            {children}
          </div>
        </main>
      </div>

      <BottomNav path={path} />
    </div>
  );
}

function TopBar({
  onMenu,
  menuOpen,
  menuButtonRef,
}: {
  onMenu: () => void;
  menuOpen: boolean;
  menuButtonRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const { meta, refreshing, refreshedAt, refresh } = usePlayerData();

  return (
    <header className="sticky top-0 z-30 h-14 border-b border-line bg-bg/85 backdrop-blur-md">
      <div className="h-full max-w-[1400px] mx-auto flex items-center justify-between gap-3 px-4 sm:px-6 md:px-8">
        <div className="flex items-center gap-3 min-w-0">
          <button
            ref={menuButtonRef}
            type="button"
            className="md:hidden -ml-1 grid h-11 w-11 place-items-center text-ink-2 hover:text-ink"
            onClick={onMenu}
            aria-label={menuOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>

          <Link href="/" className="flex h-11 items-center gap-1 shrink-0">
            <span className="font-display text-[20px] leading-none text-ink tracking-tight">
              Sexta
            </span>
            <span className="font-display italic text-[20px] leading-none text-soul-bright tracking-tight">
              Era
            </span>
          </Link>

          <span className="hidden lg:block text-[11px] uppercase tracking-[0.18em] font-mono text-ink-3 truncate">
            Sixth Age tracker
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/lookup"
            className="hidden sm:flex items-center gap-2 px-3 h-8 rounded-md border border-line text-xs text-ink-2 hover:text-ink hover:border-line-strong transition-colors"
          >
            <Search size={14} />
            <span>Lookup</span>
          </Link>

          <button
            type="button"
            onClick={() => void refresh()}
            title="Refresh data"
            aria-label="Refresh data"
            className="group flex items-center gap-2 h-11 sm:h-8 px-3 sm:px-2.5 rounded-md border border-line text-ink-3 hover:text-ink hover:border-line-strong transition-colors"
          >
            <RefreshCw
              size={13}
              className={clsx("transition-transform", refreshing && "animate-spin")}
            />
            <span className="hidden sm:inline font-mono text-[10.5px] uppercase tracking-wider">
              <RelativeTime date={refreshedAt ?? meta.lastChange} />
            </span>
          </button>
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
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close menu"
          tabIndex={-1}
          className="md:hidden fixed inset-0 top-14 z-20 bg-bg/70 backdrop-blur-sm"
          onClick={onNav}
        />
      )}
      <aside
        className={clsx(
          "md:sticky md:top-14 md:self-start md:h-[calc(100dvh-3.5rem)]",
          "md:w-56 md:flex-shrink-0 md:border-r md:border-line md:overflow-y-auto",
          mobileOpen
            ? "fixed top-14 left-0 bottom-0 w-64 z-20 bg-bg-surface border-r border-line overflow-y-auto"
            : "hidden md:block",
        )}
      >
        <nav className="px-3 py-5 space-y-5" aria-label="Main">
          {GROUPS.map((g) => (
            <div key={g}>
              <div className="px-2 mb-1 text-[10px] uppercase tracking-[0.18em] text-ink-faint font-mono">
                {g}
              </div>
              <ul className="space-y-px">
                {NAV.filter((n) => n.group === g).map((n) => {
                  const active = isActive(path, n.href);
                  const Icon = n.icon;
                  return (
                    <li key={n.href}>
                      <Link
                        href={n.href}
                        onClick={onNav}
                        prefetch={false}
                        aria-current={active ? "page" : undefined}
                        className={clsx(
                          "group relative flex items-center gap-3 h-9 px-2 rounded-md text-sm transition-colors",
                          active
                            ? "bg-bg-raised text-ink"
                            : "text-ink-2 hover:text-ink hover:bg-bg-raised/60",
                        )}
                      >
                        {active && (
                          <span
                            aria-hidden="true"
                            className="absolute left-0 top-1.5 bottom-1.5 w-[2px] bg-soul rounded-full"
                          />
                        )}
                        <Icon size={16} strokeWidth={1.6} className="shrink-0" />
                        <span className="truncate">{n.label}</span>
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
  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-line bg-bg/95 backdrop-blur grid grid-cols-5 pb-[env(safe-area-inset-bottom)]"
      aria-label="Primary"
    >
      {BOTTOM.map((it) => {
        const active = isActive(path, it.href);
        const Icon = it.icon;
        return (
          <Link
            key={it.href}
            href={it.href}
            prefetch={false}
            aria-current={active ? "page" : undefined}
            className={clsx(
              "flex flex-col items-center justify-center gap-1 h-16 text-[10px] font-mono uppercase tracking-wider transition-colors",
              active ? "text-ink" : "text-ink-3",
            )}
          >
            <span className="relative">
              {active && (
                <span
                  aria-hidden="true"
                  className="absolute -top-2 left-1/2 -translate-x-1/2 w-6 h-[2px] rounded-full bg-soul"
                />
              )}
              <Icon size={18} strokeWidth={1.6} />
            </span>
            <span>{it.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
