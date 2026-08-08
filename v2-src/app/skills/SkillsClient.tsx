"use client";

import { useMemo, useState } from "react";
import { clsx } from "clsx";
import { ChevronDown, ExternalLink, Lock } from "lucide-react";
import { Card, Pill, SectionHead, Skeleton, Stat } from "@/components/primitives";
import { ACCENT_BG, ACCENT_TEXT, Meter, Segmented, SkillIcon } from "@/components/ui";
import { usePlayerData } from "@/components/PlayerDataProvider";
import { fmt, fmtCompact, fmtGp } from "@/lib/format";
import { wikiUrl } from "@/lib/paths";
import { SKILLS, XP_CAP, skillProgress } from "@/lib/skills";
import type { SkillCategory, SkillDef, SkillProgress } from "@/lib/skills";
import {
  TRAINING,
  UNLOCKS,
  methodsFor,
  nextUnlock,
  timeToLevel,
} from "@/lib/content/training";
import type { Intensity } from "@/lib/content/training";
import {
  ABILITIES,
  REVOLUTION_BARS,
  barsForStyle,
  estimateDps,
  styleLevel,
} from "@/lib/content/combat";
import type { AbilityType, CombatStyle } from "@/lib/content/combat";
import type { PlayerSummary } from "@/lib/types";

// ---------------------------------------------------------------------------
// Small shared vocabulary
// ---------------------------------------------------------------------------

type CatFilter = SkillCategory | "all";
type SortKey = "default" | "gap" | "xp" | "alpha";

type RowData = {
  skill: SkillDef;
  aLvl: number;
  bLvl: number;
  aXp: number;
  bXp: number;
};

/** A run of rows under one optional heading. */
type RowGroup = { key: string; label: string | null; rows: RowData[] };

const CATEGORY_OPTIONS: { value: CatFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "combat", label: "Combat" },
  { value: "gathering", label: "Gather" },
  { value: "artisan", label: "Artisan" },
  { value: "support", label: "Support" },
];

const CATEGORY_LABEL: Record<SkillCategory, string> = {
  combat: "Combat",
  gathering: "Gathering",
  artisan: "Artisan",
  support: "Support",
};

/** Grouping order for the ungrouped default view. */
const CATEGORY_ORDER: SkillCategory[] = ["combat", "gathering", "artisan", "support"];

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "default", label: "Order" },
  { value: "gap", label: "Gap" },
  { value: "xp", label: "XP" },
  { value: "alpha", label: "A-Z" },
];

const STYLE_OPTIONS: { value: CombatStyle; label: string }[] = [
  { value: "necromancy", label: "Necro" },
  { value: "melee", label: "Melee" },
  { value: "ranged", label: "Ranged" },
  { value: "magic", label: "Magic" },
];

const INTENSITY: Record<Intensity, { label: string; tone: "success" | "neutral" | "warn" }> = {
  afk: { label: "AFK", tone: "success" },
  moderate: { label: "Moderate", tone: "neutral" },
  "click-intensive": { label: "Intensive", tone: "warn" },
};

const ABILITY_TONE: Record<AbilityType, "neutral" | "warn" | "ash"> = {
  basic: "neutral",
  threshold: "warn",
  ultimate: "ash",
};

/** Hours as something a person can plan an evening around. */
function fmtHours(h: number): string {
  if (!Number.isFinite(h)) return "—";
  if (h <= 0) return "done";
  if (h < 1) return `${Math.round(h * 60)} min`;
  if (h < 48) return `${h.toFixed(1)} h`;
  return `${Math.round(h / 24)} d`;
}

function levelOf(p: PlayerSummary | undefined, id: number): number {
  return p?.skills[id]?.level ?? 1;
}

function xpOf(p: PlayerSummary | undefined, id: number): number {
  return p?.skills[id]?.xp ?? 0;
}

function progressOf(p: PlayerSummary | undefined, skill: SkillDef): SkillProgress {
  return skillProgress(skill, levelOf(p, skill.id), xpOf(p, skill.id));
}

/**
 * One terminal vocabulary for a skill that has nowhere left to go, and one
 * unit-labelled number for one that does. The old page alternated between "max"
 * and "100%" for the same state and printed a bare percentage of a level the
 * account had already blown past.
 */
function meterValue(p: SkillProgress): string {
  if (p.state === "xp-capped") return `${fmtCompact(XP_CAP)} xp`;
  // A percentage of the 200M ceiling is a different quantity from a percentage
  // of a level, so it says which one it is.
  if (p.state === "level-capped") return `${Math.round(p.pct)}% of 200M`;
  return `${Math.round(p.pct)}%`;
}

function meterLabel(p: SkillProgress): string {
  if (p.state === "xp-capped") return `${p.cap} max · xp capped`;
  if (p.state === "level-capped") return `${fmtCompact(p.xp)} xp · ${p.cap} max`;
  return `${fmtCompact(p.xp)} xp → ${p.nextLevel}`;
}

/** The single line that makes a collapsed row worth reading. */
function rowTeaser(p: SkillProgress, unlockLabel: string | null, unlockLevel: number): string {
  if (p.state === "xp-capped") return `${p.cap} max · 200M banked`;
  if (p.state === "level-capped")
    return `${p.cap} max · ${fmtCompact(XP_CAP - p.xp)} xp to 200M`;
  const head = `${fmt(p.needed)} xp to ${p.nextLevel}`;
  return unlockLabel ? `${head} · ${unlockLabel} at ${unlockLevel}` : head;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SkillsClient() {
  const { players, selected, setSelected } = usePlayerData();

  const [cat, setCat] = useState<CatFilter>("all");
  const [sort, setSort] = useState<SortKey>("default");
  // undefined = the user has not touched a row yet, so the spotlight row below
  // decides. null = they closed it deliberately.
  const [openSkill, setOpenSkill] = useState<number | null | undefined>(undefined);
  const [style, setStyle] = useState<CombatStyle>("necromancy");

  const rows = useMemo<RowData[]>(() => {
    const [a, b] = players;
    const list: RowData[] = SKILLS.filter((s) => cat === "all" || s.cat === cat).map((s) => ({
      skill: s,
      aLvl: levelOf(a, s.id),
      bLvl: levelOf(b, s.id),
      aXp: xpOf(a, s.id),
      bXp: xpOf(b, s.id),
    }));
    switch (sort) {
      case "gap":
        list.sort(
          (x, y) =>
            Math.abs(y.aLvl - y.bLvl) - Math.abs(x.aLvl - x.bLvl) ||
            Math.abs(y.aXp - y.bXp) - Math.abs(x.aXp - x.bXp),
        );
        break;
      case "xp":
        list.sort((x, y) => y.aXp + y.bXp - (x.aXp + x.bXp));
        break;
      case "alpha":
        list.sort((x, y) => x.skill.key.localeCompare(y.skill.key));
        break;
      default:
        break;
    }
    return list;
  }, [players, cat, sort]);

  /**
   * The filters prove the data is grouped, so the default listing shows the
   * grouping. Any explicit filter or sort means the user asked for one flat
   * ordering and headings would fight it.
   */
  const groups = useMemo<RowGroup[]>(() => {
    if (cat !== "all" || sort !== "default") {
      return [{ key: "all", label: null, rows }];
    }
    return CATEGORY_ORDER.map((c) => ({
      key: c,
      label: CATEGORY_LABEL[c],
      rows: rows.filter((r) => r.skill.cat === c),
    })).filter((g) => g.rows.length > 0);
  }, [rows, cat, sort]);

  // Lead counts are always over all 29 skills — a category filter narrows the
  // list you are reading, not the scoreboard it sits under.
  const summary = useMemo(() => {
    const [a, b] = players;
    let aLead = 0;
    let bLead = 0;
    let tied = 0;
    let widest: SkillDef = SKILLS[0];
    let widestGap = 0;
    const maxed: Record<string, number> = {};
    for (const p of players) {
      maxed[p.slug] = SKILLS.filter((s) => progressOf(p, s).state !== "levelling").length;
    }
    for (const s of SKILLS) {
      const gap = levelOf(a, s.id) - levelOf(b, s.id);
      if (gap > 0) aLead++;
      else if (gap < 0) bLead++;
      else tied++;
      if (Math.abs(gap) > Math.abs(widestGap)) {
        widest = s;
        widestGap = gap;
      }
    }
    return { aLead, bLead, tied, widest, widestGap, maxed };
  }, [players]);

  /**
   * Which row opens on arrival. The detail panel — next unlock, best methods,
   * hours to the level — is the only part of this page that answers "what do I
   * do next", and it used to start hidden behind a 14px chevron on all 29 rows.
   *
   * The rule is the top of the list the user is already looking at, skipping
   * rows there is nothing to say about: capped skills, and skills with no
   * documented method at that level. So it follows the sort — pick Gap and the
   * biggest gap opens — and it never opens an empty panel.
   */
  const spotlight = useMemo(() => {
    if (!selected) return null;
    for (const { skill } of rows) {
      const p = progressOf(selected, skill);
      if (p.state !== "levelling") continue;
      if (methodsFor(skill.id, p.level).length === 0) continue;
      return skill.id;
    }
    return null;
  }, [rows, selected]);

  if (players.length === 0 || !selected) {
    return (
      <div className="space-y-6">
        <SectionHead as="h1" title="Skills" hint="29 disciplines" />
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-[420px] w-full" />
      </div>
    );
  }

  const pair = players.slice(0, 2);
  const openId = openSkill === undefined ? spotlight : openSkill;

  return (
    <div className="space-y-6">
      <SectionHead
        as="h1"
        title="Skills"
        hint="Levels · methods · rotations"
        right={
          <span className="hidden sm:inline font-mono text-[11px] text-ink-3 tabular">
            {SKILLS.length} skills
          </span>
        }
      />

      <Headline pair={pair} summary={summary} />

      {/* --- Controls: one language, one height, one label idiom ---------- */}
      <div className="space-y-2.5">
        <ControlRow label="Plan for">
          <Segmented
            options={players.map((p) => ({
              value: p.slug,
              label: (
                <span className="inline-flex items-center gap-1.5">
                  <span
                    aria-hidden="true"
                    className={clsx("h-1.5 w-1.5 rounded-full", ACCENT_BG[p.accent])}
                  />
                  {p.name}
                </span>
              ),
            }))}
            value={selected.slug}
            onChange={setSelected}
            size="sm"
            ariaLabel="Whose plan to show"
          />
        </ControlRow>
        <ControlRow label="Show">
          <Segmented
            options={CATEGORY_OPTIONS}
            value={cat}
            onChange={setCat}
            size="sm"
            ariaLabel="Filter by skill category"
          />
        </ControlRow>
        <ControlRow label="Sort">
          <Segmented
            options={SORT_OPTIONS}
            value={sort}
            onChange={setSort}
            size="sm"
            ariaLabel="Sort skills"
          />
        </ControlRow>
      </div>

      {/* --- Comparison --------------------------------------------------- */}
      <section aria-label="Skill comparison" className="space-y-5">
        {groups.map((g) => (
          <div key={g.key} className="space-y-2">
            {g.label && (
              <h2 className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink-3">
                {g.label}
                <span className="tabular text-ink-3">{g.rows.length}</span>
                <span aria-hidden="true" className="flex-1 border-t border-line" />
              </h2>
            )}
            {/* Two columns from xl: 29 single-file rows made a 3,800px page and
                left ~500px of dead width beside every one of them. */}
            <ul className="grid grid-cols-1 xl:grid-cols-2 gap-2 items-start">
              {g.rows.map(({ skill }) => (
                <SkillRow
                  key={skill.id}
                  skill={skill}
                  pair={pair}
                  focused={selected}
                  open={openId === skill.id}
                  onToggle={() =>
                    setOpenSkill(openId === skill.id ? null : skill.id)
                  }
                />
              ))}
            </ul>
          </div>
        ))}
        {rows.length === 0 && (
          <p className="p-6 text-center text-sm text-ink-3">
            No skills in this category.
          </p>
        )}
      </section>

      {/* --- Combat ------------------------------------------------------- */}
      <Collapsible
        id="combat-section"
        title="Combat"
        hint={`Revolution bars for ${selected.name}`}
      >
        <div className="space-y-4 pt-4">
          <Segmented
            options={STYLE_OPTIONS}
            value={style}
            onChange={setStyle}
            size="sm"
            ariaLabel="Combat style"
          />
          <CombatPanel player={selected} style={style} />
        </div>
      </Collapsible>
    </div>
  );
}

function ControlRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
      <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink-3 sm:w-[6.5rem] sm:shrink-0">
        {label}
      </span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Headline — a comparison, so the two figures sit next to each other
// ---------------------------------------------------------------------------

type Summary = {
  aLead: number;
  bLead: number;
  tied: number;
  widest: SkillDef;
  widestGap: number;
  maxed: Record<string, number>;
};

function Headline({ pair, summary }: { pair: PlayerSummary[]; summary: Summary }) {
  const [a, b] = pair;
  if (!b) {
    return (
      <Card className="p-5 sm:p-6">
        <div className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink-3">
          {a.name}
        </div>
        <div
          className={clsx(
            "mt-1.5 font-mono tabular font-bold leading-none text-3xl sm:text-4xl",
            ACCENT_TEXT[a.accent],
          )}
        >
          {fmt(a.totalLevel)}
        </div>
        <div className="mt-1.5 font-mono tabular text-[11px] text-ink-3">
          {fmtCompact(a.totalXp)} xp · {summary.maxed[a.slug] ?? 0} of {SKILLS.length} capped
        </div>
      </Card>
    );
  }

  const totalLevels = a.totalLevel + b.totalLevel;
  const shareA = totalLevels > 0 ? (a.totalLevel / totalLevels) * 100 : 50;
  const levelLeader = a.totalLevel === b.totalLevel ? null : a.totalLevel > b.totalLevel ? a : b;
  const gapOwner = summary.widestGap > 0 ? a : b;

  return (
    <Card className="p-5 sm:p-6">
      {/* At 1440 the old layout pinned the two numbers being compared to
          opposite edges of an 1152px card. The pair is now a fixed-measure
          head-to-head block and the width it used to waste carries the detail. */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,24rem)_1fr] lg:gap-12">
        <div className="w-full max-w-sm mx-auto lg:mx-0">
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink-3 truncate">
              {a.name}
            </span>
            <span className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-ink-3">
              Total level
            </span>
            <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink-3 truncate text-right">
              {b.name}
            </span>
          </div>

          <div className="mt-1 flex items-baseline justify-between gap-3">
            <span
              className={clsx(
                "font-mono tabular font-bold leading-none text-3xl sm:text-4xl",
                ACCENT_TEXT[a.accent],
              )}
            >
              {fmt(a.totalLevel)}
            </span>
            <span
              className={clsx(
                "font-mono tabular font-bold leading-none text-3xl sm:text-4xl",
                ACCENT_TEXT[b.accent],
              )}
            >
              {fmt(b.totalLevel)}
            </span>
          </div>

          <div
            className="mt-3 flex h-2 w-full overflow-hidden rounded-full bg-bg-raised"
            role="img"
            aria-label={`${a.name} total level ${a.totalLevel}, ${b.name} total level ${b.totalLevel}`}
          >
            <div
              className={clsx("h-full", ACCENT_BG[a.accent])}
              style={{ width: `${shareA}%` }}
            />
            <div className={clsx("h-full flex-1", ACCENT_BG[b.accent])} />
          </div>

          <p className="mt-2 text-center font-mono text-[10px] uppercase tracking-wider text-ink-3">
            {levelLeader
              ? `${levelLeader.name} +${fmt(Math.abs(a.totalLevel - b.totalLevel))} levels`
              : "Dead even"}
          </p>

          <div className="mt-3 flex items-baseline justify-between gap-3 font-mono tabular text-[11px] text-ink-2">
            <span>{fmtCompact(a.totalXp)}</span>
            <span className="text-[9.5px] uppercase tracking-[0.16em] text-ink-3">
              Total xp
            </span>
            <span>{fmtCompact(b.totalXp)}</span>
          </div>
        </div>

        <div className="space-y-4 lg:max-w-lg">
          <div>
            <div className="flex items-baseline justify-between gap-3 font-mono text-[10px] uppercase tracking-[0.16em]">
              <span className="text-ink-3">Skills led</span>
              {/* The bar used to be a legend-free blue pill that looked exactly
                  like the XP meters below it. Now it says what it counts. */}
              <span className="tabular text-ink-2">
                <span className={ACCENT_TEXT[a.accent]}>{summary.aLead}</span>
                {" · "}
                {summary.tied} tied ·{" "}
                <span className={ACCENT_TEXT[b.accent]}>{summary.bLead}</span>
                {" of "}
                {SKILLS.length}
              </span>
            </div>
            <div
              className="mt-2 flex h-2 w-full overflow-hidden rounded-full bg-bg-raised"
              role="img"
              aria-label={`${a.name} leads ${summary.aLead} skills, ${b.name} leads ${summary.bLead}, ${summary.tied} tied`}
            >
              <div
                className={clsx("h-full", ACCENT_BG[a.accent])}
                style={{ width: `${(summary.aLead / SKILLS.length) * 100}%` }}
              />
              <div
                className="h-full bg-bg-hover"
                style={{ width: `${(summary.tied / SKILLS.length) * 100}%` }}
              />
              <div
                className={clsx("h-full", ACCENT_BG[b.accent])}
                style={{ width: `${(summary.bLead / SKILLS.length) * 100}%` }}
              />
            </div>
          </div>

          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">
                Widest gap
              </dt>
              <dd className="mt-1 text-[13px] text-ink">
                {summary.widestGap === 0 ? (
                  "Dead level across the board"
                ) : (
                  <>
                    {summary.widest.key} —{" "}
                    <span className={ACCENT_TEXT[gapOwner.accent]}>{gapOwner.name}</span>{" "}
                    by {Math.abs(summary.widestGap)} levels
                  </>
                )}
              </dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">
                Capped skills
              </dt>
              <dd className="mt-1 font-mono tabular text-[13px] text-ink">
                <span className={ACCENT_TEXT[a.accent]}>{summary.maxed[a.slug] ?? 0}</span>
                {" · "}
                <span className={ACCENT_TEXT[b.accent]}>{summary.maxed[b.slug] ?? 0}</span>
                <span className="text-ink-3"> of {SKILLS.length}</span>
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// One skill
// ---------------------------------------------------------------------------

function SkillRow({
  skill,
  pair,
  focused,
  open,
  onToggle,
}: {
  skill: SkillDef;
  pair: PlayerSummary[];
  focused: PlayerSummary;
  open: boolean;
  onToggle: () => void;
}) {
  const [a, b] = pair;
  const aLvl = levelOf(a, skill.id);
  const bLvl = levelOf(b, skill.id);
  const gap = b ? aLvl - bLvl : 0;
  const leader = !b || gap === 0 ? null : gap > 0 ? a : b;

  const mine = progressOf(focused, skill);
  const unlock = nextUnlock(skill.id, mine.level);
  const teaser = rowTeaser(mine, unlock?.label ?? null, unlock?.level ?? 0);

  return (
    <li className="rounded-lg border border-line bg-bg-surface">
      {/* The whole header is the control. A 14px chevron was the only
          affordance on 29 rows of otherwise inert-looking text. */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={`skill-detail-${skill.id}`}
        className={clsx(
          "w-full flex items-start gap-2.5 min-h-[56px] px-3 py-2.5 text-left rounded-lg transition-colors",
          open ? "bg-bg-raised/60" : "hover:bg-bg-raised/40",
        )}
      >
        <SkillIcon id={skill.id} size={20} className="mt-0.5 shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2">
            <span className="text-sm text-ink truncate">{skill.key}</span>
            <span className="font-mono text-[10px] text-ink-3 tabular shrink-0">
              /{skill.max}
            </span>
          </span>
          <span className="mt-0.5 font-mono text-[10.5px] leading-snug text-ink-3 tabular line-clamp-2">
            <span className={ACCENT_TEXT[focused.accent]}>{mine.level}</span> {teaser}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2 pt-0.5">
          <span
            className={clsx(
              "font-mono tabular text-[11px]",
              leader ? ACCENT_TEXT[leader.accent] : "text-ink-3",
            )}
          >
            {leader ? `+${Math.abs(gap)}` : "tied"}
          </span>
          <ChevronDown
            size={14}
            aria-hidden="true"
            className={clsx(
              "shrink-0 text-ink-3 transition-transform duration-200",
              open && "rotate-180",
            )}
          />
        </span>
      </button>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 px-3 pb-3">
        {pair.map((p) => {
          const prog = progressOf(p, skill);
          const leads = leader?.slug === p.slug;
          return (
            <div key={p.slug} className="min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <span
                  className={clsx(
                    "font-mono text-[10px] uppercase tracking-[0.14em] truncate",
                    leads ? ACCENT_TEXT[p.accent] : "text-ink-3",
                  )}
                >
                  {p.name}
                </span>
                <span className="flex items-baseline gap-1.5 shrink-0">
                  <span className="font-mono tabular text-sm text-ink">{prog.level}</span>
                  {prog.state !== "levelling" && <Pill tone={p.accent}>max</Pill>}
                </span>
              </div>
              <div className="mt-1">
                <Meter
                  label={meterLabel(prog)}
                  value={meterValue(prog)}
                  pct={prog.pct}
                  accent={p.accent}
                  tone="muted"
                />
              </div>
            </div>
          );
        })}
      </div>

      {open && (
        <div id={`skill-detail-${skill.id}`} className="px-3 pb-3">
          <SkillDetail player={focused} skill={skill} />
        </div>
      )}
    </li>
  );
}

// ---------------------------------------------------------------------------
// Skill detail — the actionable half of the page
// ---------------------------------------------------------------------------

function SkillDetail({ player, skill }: { player: PlayerSummary; skill: SkillDef }) {
  const prog = progressOf(player, skill);
  const lvl = prog.level;
  const levelling = prog.state === "levelling";
  // Level-capped skills still have the 200M ceiling to grind, so the hour
  // estimates keep meaning something instead of vanishing.
  const targetXp = levelling ? prog.xp + prog.needed : XP_CAP;

  const methods = methodsFor(skill.id, lvl).slice(0, 4);
  const unlock = nextUnlock(skill.id, lvl);
  // The ladder above the current level: what changes if you keep going.
  const nextMethod = (TRAINING[skill.id] ?? [])
    .filter((m) => m.minLevel > lvl)
    .sort((a, b) => a.minLevel - b.minLevel)[0];
  const laterUnlocks = UNLOCKS.filter(
    (u) => u.skill === skill.id && u.level > lvl && (!unlock || u.level > unlock.level),
  )
    .sort((a, b) => a.level - b.level)
    .slice(0, 3);

  return (
    <div className="rounded-lg border border-line bg-bg-raised/40 p-4 space-y-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className={clsx("font-mono text-[11px] uppercase tracking-[0.16em]", ACCENT_TEXT[player.accent])}>
          {player.name}
        </span>
        <span className="font-mono tabular text-lg text-ink">
          {lvl}
          <span className="text-ink-3 text-sm"> / {skill.max}</span>
        </span>
        <span className="font-mono tabular text-[11px] text-ink-3">{fmt(prog.xp)} xp</span>
        <span className="flex-1" />
        <span className="font-mono tabular text-[11px] text-ink-2">
          {prog.state === "xp-capped"
            ? "200M cap reached"
            : prog.state === "level-capped"
              ? `${fmt(prog.needed)} xp off the 200M cap`
              : `${fmt(prog.needed)} xp to ${prog.nextLevel}`}
        </span>
      </div>

      <Meter
        label={
          levelling
            ? `Level ${lvl} → ${prog.nextLevel}`
            : `Level ${skill.max} is the cap — banking XP to 200M`
        }
        value={meterValue(prog)}
        pct={prog.pct}
        accent={player.accent}
      />

      {prog.state !== "levelling" && prog.virtualLevel > skill.max && (
        <p className="text-[11.5px] text-ink-3">
          {fmt(prog.xp)} XP is virtual level {prog.virtualLevel} on the{" "}
          {skill.curve === "elite" ? "elite" : "standard"} curve — {skill.max} is
          simply where the game stops counting levels.
        </p>
      )}

      {unlock ? (
        <a
          href={wikiUrl(unlock.wiki)}
          target="_blank"
          rel="noreferrer"
          className="block rounded-md border border-ash/30 bg-ash/5 p-3 transition-colors hover:border-ash/50"
        >
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ash-bright">
              Next unlock
            </span>
            <span className="font-mono tabular text-[10.5px] text-ink-3">
              level {unlock.level} · {unlock.level - lvl} to go
            </span>
            <ExternalLink size={11} className="ml-auto shrink-0 text-ink-3" />
          </div>
          <p className="mt-1.5 text-sm text-ink">{unlock.label}</p>
          <p className="mt-0.5 text-[11.5px] leading-snug text-ink-3">{unlock.blurb}</p>
        </a>
      ) : (
        <p className="text-[11.5px] text-ink-3">
          No thresholds left above this level — everything in {skill.key} is already open.
        </p>
      )}

      <div>
        <h4 className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3 mb-1">
          Best methods now
        </h4>
        {methods.length === 0 ? (
          <p className="text-[11.5px] text-ink-3 py-2">
            Nothing documented at level {lvl} — the ladder above picks back up at{" "}
            {nextMethod ? nextMethod.minLevel : skill.max}.
          </p>
        ) : (
          <ul>
            {methods.map((m) => (
              <li key={m.id} className="border-t border-line py-2.5 first:border-t-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <a
                      href={wikiUrl(m.wiki)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-ink hover:text-prayer-bright transition-colors"
                    >
                      <span className="truncate">{m.name}</span>
                      <ExternalLink size={11} className="shrink-0 text-ink-3" />
                    </a>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <Pill tone={INTENSITY[m.intensity].tone}>
                        {INTENSITY[m.intensity].label}
                      </Pill>
                      {m.gpPerHour != null && (
                        <Pill tone="success">{fmtGp(m.gpPerHour)}/h</Pill>
                      )}
                      {!m.members && <Pill tone="neutral">f2p</Pill>}
                    </div>
                    {m.note && (
                      <p className="mt-1.5 text-[11.5px] leading-snug text-ink-3">
                        {m.note}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-mono tabular text-sm text-ink">
                      {fmtCompact(m.xpPerHour)}
                    </div>
                    <div className="font-mono text-[9.5px] uppercase tracking-wider text-ink-3">
                      xp / h
                    </div>
                    {prog.state !== "xp-capped" && (
                      <div
                        className="mt-1.5 font-mono tabular text-[11px] text-ink-2"
                        title={
                          levelling
                            ? `Hours at this rate to reach level ${prog.nextLevel}`
                            : "Hours at this rate to reach the 200M XP cap"
                        }
                      >
                        {fmtHours(timeToLevel(prog.xp, targetXp, m.xpPerHour))}
                      </div>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {(nextMethod || laterUnlocks.length > 0) && (
        <div className="border-t border-line pt-3 space-y-2">
          {nextMethod && (
            <p className="text-[11.5px] text-ink-3">
              Next method:{" "}
              <span className="text-ink-2">{nextMethod.name}</span> at level{" "}
              <span className="font-mono tabular text-ink-2">{nextMethod.minLevel}</span>{" "}
              ({fmtCompact(nextMethod.xpPerHour)} xp/h)
            </p>
          )}
          {laterUnlocks.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {laterUnlocks.map((u) => (
                <span
                  key={`${u.skill}-${u.level}-${u.label}`}
                  className="inline-flex items-center gap-1.5 h-6 px-2 rounded-md border border-line text-[11px] font-mono text-ink-3"
                >
                  <span className="tabular text-ink-3">{u.level}</span>
                  <span className="truncate max-w-[20ch]">{u.label}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Combat
// ---------------------------------------------------------------------------

function CombatPanel({ player, style }: { player: PlayerSummary; style: CombatStyle }) {
  const level = styleLevel(player.skills, style);
  // Gear tiers in the combat module are level-indexed (tier === minLevel for
  // every row), so the style level doubles as the tier the player can wield.
  const dps = estimateDps(style, level, level);
  const unlocked = barsForStyle(style, level);
  const locked = REVOLUTION_BARS.filter((b) => b.style === style && b.minLevel > level).sort(
    (a, b) => a.minLevel - b.minLevel,
  );
  const total = unlocked.length + locked.length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3 max-w-md">
        <Stat label="Level" value={level} accent={player.accent} size="sm" />
        <Stat label="DPS index" value={fmt(dps)} accent="ash" size="sm" />
        <Stat label="Bars" value={`${unlocked.length} / ${total}`} size="sm" />
      </div>
      <p className="max-w-prose text-[11px] leading-snug text-ink-3">
        The DPS index is a comparative figure — ability damage over one global
        cooldown at your best bar and gear tier. It ignores accuracy, prayers and
        adrenaline, so use it to rank styles against each other, not to predict a kill.
      </p>

      {unlocked.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line p-6 text-center text-sm text-ink-3">
          No {style} bar unlocked yet
          {locked[0] ? ` — the first opens at level ${locked[0].minLevel}.` : "."}
        </p>
      ) : (
        <div className="grid gap-3 xl:grid-cols-2 items-start">
          {[...unlocked].reverse().map((bar, i) => (
            <BarCard key={bar.id} bar={bar} best={i === 0} accent={player.accent} />
          ))}
        </div>
      )}

      {locked.length > 0 && (
        <ul className="grid gap-1.5 xl:grid-cols-2">
          {locked.map((bar) => (
            <li
              key={bar.id}
              className="flex items-center gap-2 rounded-md border border-line px-3 py-2.5 text-ink-3"
            >
              <Lock size={12} aria-hidden="true" className="shrink-0 text-ink-3" />
              <span className="text-[12.5px] truncate">{bar.label}</span>
              <span className="ml-auto shrink-0 font-mono tabular text-[11px] text-ink-3">
                level {bar.minLevel}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function BarCard({
  bar,
  best,
  accent,
}: {
  bar: (typeof REVOLUTION_BARS)[number];
  best: boolean;
  accent: PlayerSummary["accent"];
}) {
  const abilities = bar.abilities
    .map((id) => ABILITIES[id])
    .filter((a): a is (typeof ABILITIES)[string] => a !== undefined);

  return (
    <Card accent={best ? accent : undefined} className="p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="font-display italic text-[17px] leading-none text-ink">
          {bar.label}
        </h4>
        {best && <Pill tone={accent}>best</Pill>}
        <span className="ml-auto font-mono tabular text-[10.5px] text-ink-3">
          level {bar.minLevel}
        </span>
      </div>
      <p className="mt-2 text-[11.5px] leading-snug text-ink-3">{bar.note}</p>

      <ol className="mt-3">
        {abilities.map((ab, i) => {
          const ultimate = ab.type === "ultimate";
          return (
            <li
              key={ab.id}
              className={clsx(
                "flex items-start gap-2.5 border-t border-line py-2 first:border-t-0",
                ultimate && "border-l-2 border-l-ash bg-ash/5 pl-2 -ml-2",
              )}
            >
              <span className="mt-0.5 w-4 shrink-0 font-mono tabular text-[11px] text-ink-3">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <a
                    href={wikiUrl(ab.wiki)}
                    target="_blank"
                    rel="noreferrer"
                    className={clsx(
                      "text-sm transition-colors hover:text-prayer-bright",
                      ultimate ? "text-ash-bright" : "text-ink",
                    )}
                  >
                    {ab.name}
                  </a>
                  <Pill tone={ABILITY_TONE[ab.type]}>{ab.type}</Pill>
                </div>
                <div className="mt-0.5 font-mono tabular text-[10.5px] text-ink-3">
                  lvl {ab.level} ·{" "}
                  {ab.damage.max > 0
                    ? `${ab.damage.min}-${ab.damage.max}%`
                    : "no direct damage"}{" "}
                  · {ab.cooldown}s cd
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Collapsible section — keeps the page from being one long scroll on a phone
// ---------------------------------------------------------------------------

function Collapsible({
  id,
  title,
  hint,
  children,
}: {
  id: string;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <section className="border-t border-line pt-3">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={id}
        className="w-full flex items-center gap-3 min-h-[44px] text-left"
      >
        <span className="font-display italic text-[20px] leading-none text-ink">
          {title}
        </span>
        {hint && (
          <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-3 truncate">
            {hint}
          </span>
        )}
        <ChevronDown
          size={16}
          aria-hidden="true"
          className={clsx(
            "ml-auto shrink-0 text-ink-3 transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>
      {open && <div id={id}>{children}</div>}
    </section>
  );
}
