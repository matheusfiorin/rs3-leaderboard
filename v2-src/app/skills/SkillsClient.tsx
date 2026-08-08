"use client";

import { useMemo, useState } from "react";
import { clsx } from "clsx";
import { ChevronDown, ExternalLink, Lock } from "lucide-react";
import { Card, Pill, SectionHead, Skeleton, Stat } from "@/components/primitives";
import {
  ACCENT_BG,
  ACCENT_BORDER,
  ACCENT_TEXT,
  Meter,
  Segmented,
  SkillIcon,
} from "@/components/ui";
import { usePlayerData } from "@/components/PlayerDataProvider";
import { fmt, fmtCompact, fmtGp } from "@/lib/format";
import { wikiUrl } from "@/lib/paths";
import { SKILLS, xpForLevel, xpToNext } from "@/lib/skills";
import type { SkillCategory, SkillDef } from "@/lib/skills";
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

const CATEGORY_OPTIONS: { value: CatFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "combat", label: "Combat" },
  { value: "gathering", label: "Gather" },
  { value: "artisan", label: "Artisan" },
  { value: "support", label: "Support" },
];

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

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SkillsClient() {
  const { players } = usePlayerData();

  const [cat, setCat] = useState<CatFilter>("all");
  const [sort, setSort] = useState<SortKey>("default");
  const [openSkill, setOpenSkill] = useState<number | null>(null);
  const [focus, setFocus] = useState(0);
  const [style, setStyle] = useState<CombatStyle>("necromancy");

  const rows = useMemo(() => {
    const [a, b] = players;
    const list = SKILLS.filter((s) => cat === "all" || s.cat === cat).map((s) => ({
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

  // Lead counts are always over all 29 skills — a category filter narrows the
  // list you are reading, not the scoreboard it sits under.
  const summary = useMemo(() => {
    const [a, b] = players;
    let aLead = 0;
    let bLead = 0;
    let tied = 0;
    let widest: SkillDef = SKILLS[0];
    let widestGap = 0;
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
    return { aLead, bLead, tied, widest, widestGap };
  }, [players]);

  if (players.length === 0) {
    return (
      <div className="space-y-6">
        <SectionHead title="Skills" hint="29 disciplines" />
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-[420px] w-full" />
      </div>
    );
  }

  const pair = players.slice(0, 2);
  const focused = players[focus] ?? players[0];

  return (
    <div className="space-y-6">
      <SectionHead
        title="Skills"
        hint="Levels · methods · rotations"
        right={
          <span className="hidden sm:inline font-mono text-[11px] text-ink-faint tabular">
            {SKILLS.length} skills
          </span>
        }
      />

      {/* --- Headline: who is ahead, and by how much --------------------- */}
      <Card className="p-5 sm:p-6">
        <div className="grid grid-cols-2 gap-4">
          {pair.map((p, i) => (
            <div key={p.slug} className={i === 1 ? "text-right" : ""}>
              <div className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink-3 truncate">
                {p.name}
              </div>
              <div
                className={clsx(
                  "font-mono tabular font-bold leading-none mt-1.5 text-3xl sm:text-4xl",
                  ACCENT_TEXT[p.accent],
                )}
              >
                {fmt(p.totalLevel)}
              </div>
              <div className="mt-1.5 font-mono tabular text-[11px] text-ink-3">
                {fmtCompact(p.totalXp)} xp
              </div>
              <div className="mt-0.5 font-mono tabular text-[11px] text-ink-2">
                {i === 0 ? summary.aLead : summary.bLead} ahead
              </div>
            </div>
          ))}
        </div>

        {pair.length === 2 && (
          <>
            <div
              className="mt-5 flex h-2 w-full overflow-hidden rounded-full bg-bg-raised"
              role="img"
              aria-label={`${pair[0].name} leads ${summary.aLead} skills, ${pair[1].name} leads ${summary.bLead}, ${summary.tied} tied`}
            >
              <div
                className={clsx("h-full", ACCENT_BG[pair[0].accent])}
                style={{ width: `${(summary.aLead / SKILLS.length) * 100}%` }}
              />
              <div
                className="h-full bg-bg-hover"
                style={{ width: `${(summary.tied / SKILLS.length) * 100}%` }}
              />
              <div
                className={clsx("h-full", ACCENT_BG[pair[1].accent])}
                style={{ width: `${(summary.bLead / SKILLS.length) * 100}%` }}
              />
            </div>
            <p className="mt-3 text-xs text-ink-3">
              Widest gap:{" "}
              <span className="text-ink-2">{summary.widest.key}</span>
              {summary.widestGap === 0 ? (
                " — dead level across the board"
              ) : (
                <>
                  {" — "}
                  <span
                    className={
                      ACCENT_TEXT[
                        (summary.widestGap > 0 ? pair[0] : pair[1]).accent
                      ]
                    }
                  >
                    {(summary.widestGap > 0 ? pair[0] : pair[1]).name}
                  </span>{" "}
                  by {Math.abs(summary.widestGap)} levels · {summary.tied} skills tied
                </>
              )}
            </p>
          </>
        )}
      </Card>

      {/* --- Whose plan are we reading ----------------------------------- */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink-3">
          Plan for
        </span>
        {players.map((p, i) => (
          <button
            key={p.slug}
            type="button"
            onClick={() => setFocus(i)}
            aria-current={i === focus ? "true" : undefined}
            className={clsx(
              "min-h-[44px] px-4 rounded-md border text-sm transition-colors",
              i === focus
                ? clsx(ACCENT_TEXT[p.accent], ACCENT_BORDER[p.accent], "bg-bg-raised")
                : "border-line text-ink-3 hover:text-ink-2 hover:border-line-strong",
            )}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* --- Comparison --------------------------------------------------- */}
      <section aria-label="Skill comparison" className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Segmented
            options={CATEGORY_OPTIONS}
            value={cat}
            onChange={setCat}
            size="sm"
            ariaLabel="Filter by skill category"
          />
          <Segmented
            options={SORT_OPTIONS}
            value={sort}
            onChange={setSort}
            size="sm"
            ariaLabel="Sort skills"
          />
        </div>

        <Card className="overflow-hidden">
          <ul>
            {rows.map(({ skill, aLvl, bLvl }) => {
              const open = openSkill === skill.id;
              const gap = aLvl - bLvl;
              const leader = gap === 0 ? null : gap > 0 ? pair[0] : pair[1];
              return (
                <li key={skill.id} className="border-t border-line first:border-t-0">
                  <button
                    type="button"
                    onClick={() => setOpenSkill(open ? null : skill.id)}
                    aria-expanded={open}
                    aria-controls={`skill-detail-${skill.id}`}
                    className={clsx(
                      "w-full flex items-center gap-2.5 min-h-[44px] px-3 py-2 text-left transition-colors",
                      open ? "bg-bg-raised/60" : "hover:bg-bg-raised/40",
                    )}
                  >
                    <SkillIcon id={skill.id} size={20} className="shrink-0" />
                    <span className="text-sm text-ink truncate">{skill.key}</span>
                    <span className="font-mono text-[10px] text-ink-faint tabular shrink-0">
                      /{skill.max}
                    </span>
                    <span className="flex-1" />
                    <span
                      className={clsx(
                        "font-mono tabular text-[11px] shrink-0",
                        leader ? ACCENT_TEXT[leader.accent] : "text-ink-faint",
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
                  </button>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 px-3 pb-3">
                    {pair.map((p) => {
                      const lvl = levelOf(p, skill.id);
                      const xp = xpOf(p, skill.id);
                      const { pct } = xpToNext(xp, lvl, skill.max);
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
                            <span className="font-mono tabular text-sm text-ink shrink-0">
                              {lvl}
                            </span>
                          </div>
                          <div className="mt-1">
                            <Meter
                              label={`${fmtCompact(xp)} xp`}
                              value={lvl >= skill.max ? "max" : `${Math.round(pct)}%`}
                              pct={pct}
                              accent={p.accent}
                              tone="muted"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {open && (
                    <div id={`skill-detail-${skill.id}`} className="px-3 pb-4">
                      <SkillDetail player={focused} skill={skill} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          {rows.length === 0 && (
            <p className="p-6 text-center text-sm text-ink-3">
              No skills in this category.
            </p>
          )}
        </Card>
      </section>

      {/* --- Combat ------------------------------------------------------- */}
      <Collapsible
        id="combat-section"
        title="Combat"
        hint={`Revolution bars for ${focused.name}`}
      >
        <div className="space-y-4 pt-4">
          <Segmented
            options={STYLE_OPTIONS}
            value={style}
            onChange={setStyle}
            size="sm"
            ariaLabel="Combat style"
          />
          <CombatPanel player={focused} style={style} />
        </div>
      </Collapsible>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skill detail — the actionable half of the page
// ---------------------------------------------------------------------------

function SkillDetail({ player, skill }: { player: PlayerSummary; skill: SkillDef }) {
  const lvl = levelOf(player, skill.id);
  const xp = xpOf(player, skill.id);
  const maxed = lvl >= skill.max;
  const { needed, pct } = xpToNext(xp, lvl, skill.max);
  const targetXp = xpForLevel(lvl + 1);

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
          <span className="text-ink-faint text-sm"> / {skill.max}</span>
        </span>
        <span className="font-mono tabular text-[11px] text-ink-3">{fmt(xp)} xp</span>
        <span className="flex-1" />
        <span className="font-mono tabular text-[11px] text-ink-2">
          {maxed ? "capped" : `${fmt(needed)} xp to ${lvl + 1}`}
        </span>
      </div>

      {!maxed && (
        <Meter
          label={`Level ${lvl} → ${lvl + 1}`}
          value={`${Math.round(pct)}%`}
          pct={pct}
          accent={player.accent}
        />
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
            <ExternalLink size={11} className="ml-auto shrink-0 text-ink-faint" />
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
                      <ExternalLink size={11} className="shrink-0 text-ink-faint" />
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
                    <div className="font-mono text-[9.5px] uppercase tracking-wider text-ink-faint">
                      xp / h
                    </div>
                    {!maxed && (
                      <div
                        className="mt-1.5 font-mono tabular text-[11px] text-ink-2"
                        title={`Hours at this rate to reach level ${lvl + 1}`}
                      >
                        {fmtHours(timeToLevel(xp, targetXp, m.xpPerHour))}
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
                  <span className="tabular text-ink-faint">{u.level}</span>
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
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Level" value={level} accent={player.accent} size="sm" />
        <Stat label="DPS index" value={fmt(dps)} accent="ash" size="sm" />
        <Stat label="Bars" value={`${unlocked.length} / ${total}`} size="sm" />
      </div>
      <p className="text-[11px] leading-snug text-ink-faint">
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
        <div className="space-y-3">
          {[...unlocked].reverse().map((bar, i) => (
            <BarCard key={bar.id} bar={bar} best={i === 0} accent={player.accent} />
          ))}
        </div>
      )}

      {locked.length > 0 && (
        <ul className="space-y-1.5">
          {locked.map((bar) => (
            <li
              key={bar.id}
              className="flex items-center gap-2 rounded-md border border-line px-3 py-2.5 text-ink-3"
            >
              <Lock size={12} aria-hidden="true" className="shrink-0 text-ink-faint" />
              <span className="text-[12.5px] truncate">{bar.label}</span>
              <span className="ml-auto shrink-0 font-mono tabular text-[11px] text-ink-faint">
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
        <span className="ml-auto font-mono tabular text-[10.5px] text-ink-faint">
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
              <span className="mt-0.5 w-4 shrink-0 font-mono tabular text-[11px] text-ink-faint">
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
                <div className="mt-0.5 font-mono tabular text-[10.5px] text-ink-faint">
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
