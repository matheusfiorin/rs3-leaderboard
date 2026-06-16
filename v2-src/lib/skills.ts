// RS3 skills catalogue. Profile-ordering (RuneMetrics ids).
export type SkillCategory = "combat" | "artisan" | "gathering" | "support";

export interface SkillDef {
  id: number;
  key: string; // canonical English name
  abbr: string;
  cat: SkillCategory;
  max: number;
}

export const SKILLS: SkillDef[] = [
  { id: 0,  key: "Attack",        abbr: "ATK", cat: "combat",     max: 120 },
  { id: 1,  key: "Defence",       abbr: "DEF", cat: "combat",     max: 120 },
  { id: 2,  key: "Strength",      abbr: "STR", cat: "combat",     max: 120 },
  { id: 3,  key: "Constitution",  abbr: "HP",  cat: "combat",     max: 120 },
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
  { id: 22, key: "Construction",  abbr: "CON", cat: "artisan",    max: 99  },
  { id: 23, key: "Summoning",     abbr: "SUM", cat: "support",    max: 99  },
  { id: 24, key: "Dungeoneering", abbr: "DG",  cat: "support",    max: 120 },
  { id: 25, key: "Divination",    abbr: "DIV", cat: "gathering",  max: 99  },
  { id: 26, key: "Invention",     abbr: "INV", cat: "support",    max: 150 },
  { id: 27, key: "Archaeology",   abbr: "ARC", cat: "gathering",  max: 120 },
  { id: 28, key: "Necromancy",    abbr: "NEC", cat: "combat",     max: 120 },
];

// XP table — RS3 standard formula. xpForLevel[L] = total XP needed to reach L.
const XP_TABLE: number[] = [0];
{
  let total = 0;
  for (let L = 1; L < 150; L++) {
    total += Math.floor(L + 300 * Math.pow(2, L / 7)) / 4;
    XP_TABLE.push(Math.floor(total));
  }
}

export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  if (level > 150) return XP_TABLE[149];
  return XP_TABLE[level - 1] || 0;
}

export function xpToNext(xp: number, level: number, max: number): {
  needed: number;
  total: number;
  pct: number;
} {
  if (level >= max) return { needed: 0, total: 0, pct: 100 };
  const nextLvlXp = xpForLevel(level + 1);
  const curLvlXp = xpForLevel(level);
  const total = nextLvlXp - curLvlXp;
  const have = xp - curLvlXp;
  const needed = Math.max(0, nextLvlXp - xp);
  const pct = total > 0 ? Math.max(0, Math.min(100, (have / total) * 100)) : 0;
  return { needed, total, pct };
}
