// RS3 skills catalogue. Profile-ordering (RuneMetrics ids).
export type SkillCategory = "combat" | "artisan" | "gathering" | "support";

/**
 * Two XP curves exist in RS3. Every skill uses the standard curve except the
 * elite skill Invention, which is materially more expensive early and cheaper
 * late — level 120 costs 80,618,654 elite XP against 104,273,167 standard.
 * Reading Invention off the standard table is one half of why a 161M-XP
 * Invention rendered as a flat 100%.
 */
export type XpCurve = "standard" | "elite";

export interface SkillDef {
  id: number;
  key: string; // canonical English name
  abbr: string;
  cat: SkillCategory;
  /** Highest level obtainable in game. Not a virtual level. */
  max: number;
  /** Omitted means "standard". */
  curve?: XpCurve;
}

/**
 * `max` is the live in-game cap, verified against the cap-raise log on
 * https://runescape.wiki/w/Experience/Table (checked 2026-08-07):
 *   110 — Mining, Smithing (2024-08-12), Woodcutting, Fletching, Firemaking
 *         (2024-12-09), Runecrafting (2025-03-03), Crafting (2025-06-16),
 *         Hunter (2026-03-23)
 *   120 — Dungeoneering, Slayer, Farming, Herblore, Archaeology, Necromancy,
 *         Thieving (2025-11-24), Attack/Strength/Ranged/Magic (2026-03-02),
 *         Construction (2026-07-13), and elite Invention
 *   99  — everything else: Defence, Constitution, Prayer, Cooking, Fishing,
 *         Agility, Summoning, Divination
 * These are not cosmetic. A capped skill has no next level, so a wrong cap
 * turns "maxed" into "0 xp away from a level that does not exist".
 */
export const SKILLS: SkillDef[] = [
  { id: 0,  key: "Attack",        abbr: "ATK", cat: "combat",     max: 120 },
  { id: 1,  key: "Defence",       abbr: "DEF", cat: "combat",     max: 99  },
  { id: 2,  key: "Strength",      abbr: "STR", cat: "combat",     max: 120 },
  { id: 3,  key: "Constitution",  abbr: "HP",  cat: "combat",     max: 99  },
  { id: 4,  key: "Ranged",        abbr: "RNG", cat: "combat",     max: 120 },
  { id: 5,  key: "Prayer",        abbr: "PRA", cat: "combat",     max: 99  },
  { id: 6,  key: "Magic",         abbr: "MAG", cat: "combat",     max: 120 },
  { id: 7,  key: "Cooking",       abbr: "COK", cat: "artisan",    max: 99  },
  { id: 8,  key: "Woodcutting",   abbr: "WC",  cat: "gathering",  max: 110 },
  { id: 9,  key: "Fletching",     abbr: "FLE", cat: "artisan",    max: 110 },
  { id: 10, key: "Fishing",       abbr: "FSH", cat: "gathering",  max: 99  },
  { id: 11, key: "Firemaking",    abbr: "FM",  cat: "artisan",    max: 110 },
  { id: 12, key: "Crafting",      abbr: "CRA", cat: "artisan",    max: 110 },
  { id: 13, key: "Smithing",      abbr: "SMI", cat: "artisan",    max: 110 },
  { id: 14, key: "Mining",        abbr: "MIN", cat: "gathering",  max: 110 },
  { id: 15, key: "Herblore",      abbr: "HER", cat: "artisan",    max: 120 },
  { id: 16, key: "Agility",       abbr: "AGI", cat: "support",    max: 99  },
  { id: 17, key: "Thieving",      abbr: "THI", cat: "support",    max: 120 },
  { id: 18, key: "Slayer",        abbr: "SLA", cat: "support",    max: 120 },
  { id: 19, key: "Farming",       abbr: "FAR", cat: "gathering",  max: 120 },
  { id: 20, key: "Runecrafting",  abbr: "RC",  cat: "artisan",    max: 110 },
  { id: 21, key: "Hunter",        abbr: "HUN", cat: "gathering",  max: 110 },
  { id: 22, key: "Construction",  abbr: "CON", cat: "artisan",    max: 120 },
  { id: 23, key: "Summoning",     abbr: "SUM", cat: "support",    max: 99  },
  { id: 24, key: "Dungeoneering", abbr: "DG",  cat: "support",    max: 120 },
  { id: 25, key: "Divination",    abbr: "DIV", cat: "gathering",  max: 99  },
  { id: 26, key: "Invention",     abbr: "INV", cat: "support",    max: 120, curve: "elite" },
  { id: 27, key: "Archaeology",   abbr: "ARC", cat: "gathering",  max: 120 },
  { id: 28, key: "Necromancy",    abbr: "NEC", cat: "combat",     max: 120 },
];

const SKILL_BY_ID = new Map(SKILLS.map((s) => [s.id, s]));

export function skillById(id: number): SkillDef | undefined {
  return SKILL_BY_ID.get(id);
}

/** Hard XP ceiling. Above this the game stops recording, in every skill. */
export const XP_CAP = 200_000_000;

// ---------------------------------------------------------------------------
// XP tables
// ---------------------------------------------------------------------------

/**
 * Standard curve: xp(L) = floor( 1/4 * sum_{n=1}^{L-1} floor(n + 300 * 2^(n/7)) ).
 * Checked value-for-value against the published table for levels 1-126.
 * Virtual levels stop at 126; 200M XP falls between 126 and 127.
 */
const STANDARD_TABLE: number[] = (() => {
  const table = [0, 0]; // index 0 unused; level 1 costs 0
  let total = 0;
  for (let n = 1; n <= 126; n++) {
    total += Math.floor(n + 300 * Math.pow(2, n / 7)) / 4;
    table[n + 1] = Math.floor(total);
  }
  return table;
})();

/**
 * Elite curve (Invention). Transcribed from
 * https://runescape.wiki/w/Experience/Table because the elite curve steps every
 * ten levels and has no published closed form. Anchors: 99 = 36,073,511 ·
 * 120 = 80,618,654 · 150 = 194,927,409. Elite virtual levels run to 150 and,
 * unlike standard ones, are visible in game.
 */
const ELITE_TABLE: number[] = [
  0, // index 0 unused
  /*   1 */ 0, 830, 1861, 2902, 3980, 5126, 6380, 7787, 9400, 11275,
  /*  11 */ 13605, 16372, 19656, 23546, 28134, 33520, 39809, 47109, 55535, 65209,
  /*  21 */ 77190, 90811, 106221, 123573, 143025, 164742, 188893, 215651, 245196, 277713,
  /*  31 */ 316311, 358547, 404634, 454796, 509259, 568254, 632019, 700797, 774834, 854383,
  /*  41 */ 946227, 1044569, 1149696, 1261903, 1381488, 1508756, 1644015, 1787581, 1939773, 2100917,
  /*  51 */ 2283490, 2476369, 2679917, 2894505, 3120508, 3358307, 3608290, 3870846, 4146374, 4435275,
  /*  61 */ 4758122, 5096111, 5449685, 5819299, 6205407, 6608473, 7028964, 7467354, 7924122, 8399751,
  /*  71 */ 8925664, 9472665, 10041285, 10632061, 11245538, 11882262, 12542789, 13227679, 13937496, 14672812,
  /*  81 */ 15478994, 16313404, 17176661, 18069395, 18992239, 19945833, 20930821, 21947856, 22997593, 24080695,
  /*  91 */ 25259906, 26475754, 27728955, 29020233, 30350318, 31719944, 33129852, 34580790, 36073511, 37608773,
  /* 101 */ 39270442, 40978509, 42733789, 44537107, 46389292, 48291180, 50243611, 52247435, 54303504, 56412678,
  /* 111 */ 58575824, 60793812, 63067521, 65397835, 67785643, 70231841, 72737330, 75303019, 77929820, 80618654,
  /* 121 */ 83370445, 86186124, 89066630, 92012904, 95025896, 98106559, 101255855, 104474750, 107764216, 111125230,
  /* 131 */ 114558777, 118065845, 121647430, 125304532, 129038159, 132849323, 136739041, 140708338, 144758242, 148889790,
  /* 141 */ 153104021, 157401983, 161784728, 166253312, 170808801, 175452262, 180184770, 185007406, 189921255, 194927409,
];

/** Highest level each curve can express, virtual levels included. */
const VIRTUAL_MAX: Record<XpCurve, number> = { standard: 126, elite: 150 };

function tableFor(curve: XpCurve): number[] {
  return curve === "elite" ? ELITE_TABLE : STANDARD_TABLE;
}

export function curveForSkill(skillId: number): XpCurve {
  return SKILL_BY_ID.get(skillId)?.curve ?? "standard";
}

/** Total XP needed to reach `level` on the given curve. */
export function xpForLevel(level: number, curve: XpCurve = "standard"): number {
  const table = tableFor(curve);
  const top = VIRTUAL_MAX[curve];
  if (level <= 1) return 0;
  return table[Math.min(level, top)] ?? table[top];
}

/** Same, but reads the curve off the skill id. */
export function xpForSkillLevel(skillId: number, level: number): number {
  return xpForLevel(level, curveForSkill(skillId));
}

/**
 * The level an XP total actually buys, ignoring the in-game cap. This is how a
 * level/XP pair that disagrees gets caught: a 200M-XP account sits far above
 * the cap in most skills, and pretending otherwise is what produced 29
 * identical full bars.
 */
export function levelFromXp(xp: number, curve: XpCurve = "standard"): number {
  const table = tableFor(curve);
  const top = VIRTUAL_MAX[curve];
  let level = 1;
  // 150 entries at most, monotonic, and this runs ~58 times per render — a
  // linear scan is not the thing worth optimising here.
  for (let L = 2; L <= top; L++) {
    if (xp >= table[L]) level = L;
    else break;
  }
  return level;
}

// ---------------------------------------------------------------------------
// Progress
// ---------------------------------------------------------------------------

/**
 * `levelling`    — a next level exists and `pct` measures the way to it.
 * `level-capped` — at the in-game cap, so there is no next level and `pct`
 *                  measures XP against the 200M ceiling instead.
 * `xp-capped`    — 200M banked. Nothing left to measure.
 */
export type SkillState = "levelling" | "level-capped" | "xp-capped";

export interface SkillProgress {
  state: SkillState;
  /** In-game level: reported level reconciled with the XP total and the cap. */
  level: number;
  /** Level the XP total would buy with virtual levels enabled. */
  virtualLevel: number;
  cap: number;
  xp: number;
  /** Null when no further level exists. */
  nextLevel: number | null;
  /** XP to `nextLevel`, or to the 200M ceiling when level-capped, else 0. */
  needed: number;
  /** Width of the band `pct` is measured across. */
  span: number;
  /** 0-100 across whatever band `state` names. */
  pct: number;
}

/**
 * Reconcile a reported level with an XP total so the result means exactly one
 * thing.
 *
 * RuneMetrics reports the in-game level, which stops dead at the cap while XP
 * keeps climbing to 200M. The previous implementation always divided by the
 * standard curve's level+1 threshold and clamped to [0,100], so every skill
 * past its cap — all six of Soclopata's 200M skills, Agility at 149M, plus
 * Invention read off the wrong curve entirely — reported exactly 100%.
 */
export function skillProgress(
  skill: Pick<SkillDef, "id" | "max"> & { curve?: XpCurve },
  reportedLevel: number,
  xp: number,
): SkillProgress {
  const curve = skill.curve ?? curveForSkill(skill.id);
  const cap = skill.max;
  const safeXp = Math.max(0, xp);
  const virtualLevel = levelFromXp(safeXp, curve);
  // Trust whichever source is further along: a stale hiscores row can lag the
  // XP total, and a level above what the XP supports is still the game's word.
  const level = Math.min(cap, Math.max(1, reportedLevel, Math.min(virtualLevel, cap)));

  if (safeXp >= XP_CAP) {
    return {
      state: "xp-capped",
      level, virtualLevel, cap, xp: safeXp,
      nextLevel: null, needed: 0, span: 0, pct: 100,
    };
  }

  if (level >= cap) {
    // No next level to chase, so the only axis left is the XP ceiling.
    return {
      state: "level-capped",
      level, virtualLevel, cap, xp: safeXp,
      nextLevel: null,
      needed: XP_CAP - safeXp,
      span: XP_CAP,
      pct: (safeXp / XP_CAP) * 100,
    };
  }

  const floorXp = xpForLevel(level, curve);
  const nextXp = xpForLevel(level + 1, curve);
  const span = nextXp - floorXp;
  return {
    state: "levelling",
    level, virtualLevel, cap, xp: safeXp,
    nextLevel: level + 1,
    needed: Math.max(0, nextXp - safeXp),
    span,
    pct: span > 0 ? Math.max(0, Math.min(100, ((safeXp - floorXp) / span) * 100)) : 0,
  };
}

/** Convenience wrapper for callers that only hold a skill id. */
export function skillProgressById(
  skillId: number,
  reportedLevel: number,
  xp: number,
): SkillProgress {
  const def = SKILL_BY_ID.get(skillId);
  return skillProgress(def ?? { id: skillId, max: 99 }, reportedLevel, xp);
}

/**
 * Legacy shape for callers that only want "how far to the next level". Now
 * curve-aware, and it no longer reports progress toward a level the skill
 * cannot reach.
 */
export function xpToNext(
  xp: number,
  level: number,
  max: number,
  curve: XpCurve = "standard",
): { needed: number; total: number; pct: number } {
  const p = skillProgress({ id: -1, max, curve }, level, xp);
  if (p.state !== "levelling") return { needed: 0, total: 0, pct: 100 };
  return { needed: p.needed, total: p.span, pct: p.pct };
}
