import type {
  GateResult,
  PlayerSummary,
  Requirement,
  RequirementResult,
} from "./types";
import { SKILLS, xpForLevel } from "./skills";

/**
 * Everything a requirement might need to answer "is this met?".
 *
 * `questsDone` and `manual` are passed in rather than read off the player so
 * this module stays pure and usable from both server components (quests loaded
 * from disk) and client components (quests fetched, manual from the store).
 */
export interface EvalContext {
  player: PlayerSummary;
  /** Completed quest titles, exact RuneMetrics casing incl. " (miniquest)". */
  questsDone: Set<string>;
  /** Manual checkboxes and user-entered kill counts, keyed by id. */
  manual: Record<string, boolean | number>;
}

const clampPct = (n: number) => Math.max(0, Math.min(100, n));

function skillName(id: number): string {
  return SKILLS.find((s) => s.id === id)?.key ?? `Skill ${id}`;
}

/** Key under which a boss's user-entered kill count is stored. */
export function kcKey(boss: string): string {
  return `kc:${boss.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

export function evaluateOne(req: Requirement, ctx: EvalContext): RequirementResult {
  switch (req.kind) {
    case "skill": {
      const have = ctx.player.skills[req.skill]?.level ?? 1;
      const met = have >= req.level;
      // Progress by XP, not by level — level 82→90 is far more than 8/90 of
      // the work, and an XP-weighted bar tells the truth about the grind.
      const haveXp = ctx.player.skills[req.skill]?.xp ?? 0;
      const targetXp = xpForLevel(req.level);
      const pct = met ? 100 : targetXp > 0 ? clampPct((haveXp / targetXp) * 100) : 0;
      return {
        req,
        met,
        current: `${have} / ${req.level}`,
        gap: met ? 0 : req.level - have,
        pct,
      };
    }

    case "quest": {
      const met = ctx.questsDone.has(req.title);
      return { req, met, current: met ? "Complete" : "Incomplete", gap: met ? 0 : 1, pct: met ? 100 : 0 };
    }

    case "stat": {
      const have =
        req.stat === "totalLevel" ? ctx.player.totalLevel
        : req.stat === "combatLevel" ? ctx.player.combatLevel
        : req.stat === "runeScore" ? ctx.player.runeScore
        : 0; // questPoints is supplied by the caller via a manual override
      const met = have >= req.value;
      return {
        req,
        met,
        current: `${have} / ${req.value}`,
        gap: met ? 0 : req.value - have,
        pct: met ? 100 : clampPct((have / req.value) * 100),
      };
    }

    case "kc": {
      const raw = ctx.manual[kcKey(req.boss)];
      const have = typeof raw === "number" ? raw : 0;
      const met = have >= req.count;
      return {
        req,
        met,
        current: `${have} / ${req.count}`,
        gap: met ? 0 : req.count - have,
        pct: met ? 100 : clampPct((have / req.count) * 100),
      };
    }

    case "manual": {
      const met = ctx.manual[req.id] === true;
      return { req, met, current: met ? "Done" : "Pending", gap: met ? 0 : 1, pct: met ? 100 : 0 };
    }
  }
}

export function evaluate(reqs: Requirement[], ctx: EvalContext): GateResult {
  const results = reqs.map((r) => evaluateOne(r, ctx));
  const met = results.filter((r) => r.met);
  const missing = results.filter((r) => !r.met);
  // Average of per-requirement progress, so a gate that's 3/4 done with the
  // last skill halfway there reads ~87%, not 75%.
  const pct = results.length
    ? clampPct(results.reduce((s, r) => s + r.pct, 0) / results.length)
    : 100;
  return { results, met, missing, pct, complete: missing.length === 0 };
}

/** Short label for a requirement, used in gap chips and tooltips. */
export function describe(req: Requirement): string {
  switch (req.kind) {
    case "skill": return `${skillName(req.skill)} ${req.level}`;
    case "quest": return req.title;
    case "stat": return `${req.stat === "totalLevel" ? "Total level" : req.stat === "combatLevel" ? "Combat" : req.stat === "runeScore" ? "RuneScore" : "Quest points"} ${req.value}`;
    case "kc": return `${req.boss} ×${req.count}`;
    case "manual": return req.label;
  }
}

/**
 * Rank gates by how close they are to completion, skipping finished ones.
 * Powers every "what should I do next" rail in the app.
 */
export function rankByProximity<T extends { requirements: Requirement[] }>(
  items: T[],
  ctx: EvalContext,
): { item: T; gate: GateResult }[] {
  return items
    .map((item) => ({ item, gate: evaluate(item.requirements, ctx) }))
    .filter((x) => !x.gate.complete)
    .sort((a, b) => b.gate.pct - a.gate.pct);
}

/**
 * The single cheapest missing requirement across a set of gates — "one more
 * level and three things unlock at once".
 */
export function bottleneckSkills(
  items: { requirements: Requirement[] }[],
  ctx: EvalContext,
): { skill: number; level: number; unlocks: number; gap: number }[] {
  const byKey = new Map<string, { skill: number; level: number; unlocks: number; gap: number }>();
  for (const item of items) {
    for (const r of evaluate(item.requirements, ctx).missing) {
      if (r.req.kind !== "skill") continue;
      const key = `${r.req.skill}:${r.req.level}`;
      const prev = byKey.get(key);
      if (prev) prev.unlocks++;
      else byKey.set(key, { skill: r.req.skill, level: r.req.level, unlocks: 1, gap: r.gap });
    }
  }
  return [...byKey.values()].sort(
    (a, b) => b.unlocks - a.unlocks || a.gap - b.gap,
  );
}
