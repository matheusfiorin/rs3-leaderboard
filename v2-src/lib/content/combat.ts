// Combat / Revolution module — ported from the legacy combat.js.
//
// Game state: RS3 after the March 2026 Combat Style Modernisation, which is what
// the legacy module encoded. Reconciliation policy for this port, since the
// legacy file and pre-modernisation wiki knowledge disagree in places:
//
//   1. Ability ids, levels, damage bands and mechanics are kept from the legacy
//      module — that is the app's declared game state and the rest of the UI was
//      built against it.
//   2. `type: "enhanced"` is renamed to `"threshold"` (RS3's actual ability tier
//      names are basic / threshold / ultimate).
//   3. Ultimate level gates are corrected to their canonical RS3 requirements.
//      The legacy data and the legacy bar builders disagreed with each other —
//      e.g. Deadshot was recorded at level 21 but gated at 69, Sunshine recorded
//      at 50 but gated at 92, Omnipower recorded at 12 but gated at 101 (and then
//      truncated out of the melee/magic single-target bar by a slice(0, 9)).
//      One level per ultimate now, used by both the record and the bars.
//   4. Death Skulls is an ultimate, not a threshold.
//   5. "Runic Charge" is dropped: it is a no-GCD empowerment ability that
//      Revolution cannot meaningfully queue, and it has no wiki page that can be
//      cited with confidence.
//
// Every `wiki` value is a long-standing runescape.wiki ability/item page. Where
// the modernisation renamed an ability, the entry keeps the canonical page name
// (Smash, Sever, Dazing Shot) rather than an unverifiable new title.

export type CombatStyle = "melee" | "ranged" | "magic" | "necromancy";
export type AbilityType = "basic" | "threshold" | "ultimate";

/** Damage as a percentage of ability damage. Multi-hit abilities record the
 *  PER-HIT band, not the total — that is what the legacy estimator averaged, and
 *  changing it would silently rescale every DPS figure in the UI. */
export interface DamageRange {
  min: number;
  max: number;
}

export interface Ability {
  id: string;
  name: string;
  style: CombatStyle;
  type: AbilityType;
  /** Level in the style's gating skill. Melee gates on max(Attack, Strength). */
  level: number;
  damage: DamageRange;
  /** Seconds. Cooldowns sit on RS3's 0.6s tick lattice. */
  cooldown: number;
  /** runescape.wiki page slug. */
  wiki: string;
  /** Filename under /data/icons/ — pass through paths.iconUrl(). */
  icon?: string;
}

export interface RevolutionBar {
  id: string;
  style: CombatStyle;
  /** Level at which every ability in the bar is unlocked. */
  minLevel: number;
  label: string;
  /** Ability ids, in bar order. Revolution fires left to right. */
  abilities: string[];
  note: string;
}

export interface GearPiece {
  name: string;
  icon?: string;
}

export interface GearTier {
  /** Item tier, matching the `tier` argument of estimateDps. */
  tier: number;
  minLevel: number;
  /** Weapon damage contribution used by the estimator. */
  damage: number;
  armour: number;
  /** Bonus lifepoints from the armour set. */
  lifePoints: number;
  weapon: GearPiece;
  armourSet: GearPiece;
  /** runescape.wiki page for the weapon. */
  wiki: string;
}

// Damage bands the source module never recorded. Named constants so the
// estimator's inputs stay auditable — these are placeholders, not wiki figures.
// The legacy estimator silently substituted a flat 110 for all of them.
const DEFAULT_BASIC: DamageRange = { min: 90, max: 110 };
const DEFAULT_MELEE_BASIC: DamageRange = { min: 110, max: 130 };
const DEFAULT_BLEED: DamageRange = { min: 30, max: 40 };
/** Buffs and summons do no direct damage; excluded from the DPS average. */
const NO_DAMAGE: DamageRange = { min: 0, max: 0 };

// ---------------------------------------------------------------------------
// Abilities
// ---------------------------------------------------------------------------

export const ABILITIES: Record<string, Ability> = {
  // ---- Melee -------------------------------------------------------------
  slice: {
    id: "slice",
    name: "Slice",
    style: "melee",
    type: "basic",
    level: 1,
    damage: { min: 110, max: 130 },
    cooldown: 3,
    wiki: "Slice",
    icon: "Slice.png",
  },
  assault: {
    id: "assault",
    name: "Assault",
    style: "melee",
    type: "threshold",
    level: 3,
    // Four hits; the band is per-hit. Consumes Bloodlust stacks to heal.
    damage: { min: 130, max: 150 },
    cooldown: 30,
    wiki: "Assault",
    icon: "Assault.png",
  },
  smash: {
    id: "smash",
    name: "Smash",
    style: "melee",
    type: "basic",
    level: 7,
    damage: DEFAULT_MELEE_BASIC,
    cooldown: 5.4,
    wiki: "Smash",
    icon: "Smash.png",
  },
  sever: {
    id: "sever",
    name: "Sever",
    style: "melee",
    type: "basic",
    level: 18,
    damage: { min: 135, max: 165 },
    cooldown: 15,
    wiki: "Sever",
    icon: "Sever.png",
  },
  fury: {
    id: "fury",
    name: "Fury",
    style: "melee",
    type: "basic",
    level: 21,
    damage: { min: 110, max: 130 },
    cooldown: 4.8,
    wiki: "Fury",
    icon: "Fury.png",
  },
  hurricane: {
    id: "hurricane",
    name: "Hurricane",
    style: "melee",
    type: "threshold",
    level: 37,
    damage: { min: 220, max: 260 },
    cooldown: 20.4,
    wiki: "Hurricane",
    icon: "Hurricane.png",
  },
  berserk: {
    id: "berserk",
    name: "Berserk",
    style: "melee",
    type: "ultimate",
    // Canonical requirement: Strength 42. Legacy data and bar agreed here.
    level: 42,
    damage: NO_DAMAGE,
    cooldown: 60,
    wiki: "Berserk",
    icon: "Berserk.png",
  },
  dismember: {
    id: "dismember",
    name: "Dismember",
    style: "melee",
    type: "threshold",
    level: 50,
    // Bleed, eight ticks. Per-tick band, so it does not dominate the average.
    damage: DEFAULT_BLEED,
    cooldown: 15.6,
    wiki: "Dismember",
    icon: "Dismember.png",
  },
  punish: {
    id: "punish",
    name: "Punish",
    style: "melee",
    type: "basic",
    level: 60,
    // 2.5x on targets under 50% lifepoints — the band is the non-execute case.
    damage: { min: 110, max: 130 },
    cooldown: 3,
    wiki: "Punish",
    icon: "Punish.png",
  },

  // ---- Ranged ------------------------------------------------------------
  "piercing-shot": {
    id: "piercing-shot",
    name: "Piercing Shot",
    style: "ranged",
    type: "basic",
    level: 1,
    damage: { min: 90, max: 110 },
    cooldown: 3,
    wiki: "Piercing Shot",
    icon: "Piercing_Shot.png",
  },
  "snap-shot": {
    id: "snap-shot",
    name: "Snap Shot",
    style: "ranged",
    type: "threshold",
    level: 3,
    damage: { min: 145, max: 175 },
    cooldown: 30,
    wiki: "Snap Shot",
    icon: "Snap_Shot.png",
  },
  snipe: {
    id: "snipe",
    name: "Snipe",
    style: "ranged",
    type: "threshold",
    level: 5,
    damage: { min: 300, max: 360 },
    // Long cooldown; Needle Strike is what brings it back on line.
    cooldown: 60,
    wiki: "Snipe",
    icon: "Snipe.png",
  },
  "needle-strike": {
    id: "needle-strike",
    name: "Needle Strike",
    style: "ranged",
    type: "basic",
    level: 13,
    damage: { min: 45, max: 55 },
    cooldown: 5.4,
    wiki: "Needle Strike",
    icon: "Needle_Strike.png",
  },
  "binding-shot": {
    id: "binding-shot",
    name: "Binding Shot",
    style: "ranged",
    type: "basic",
    level: 31,
    damage: { min: 65, max: 75 },
    cooldown: 15,
    wiki: "Binding Shot",
    icon: "Binding_Shot.png",
  },
  bombardment: {
    id: "bombardment",
    name: "Bombardment",
    style: "ranged",
    type: "threshold",
    level: 36,
    damage: { min: 220, max: 260 },
    cooldown: 20.4,
    wiki: "Bombardment",
    icon: "Bombardment.png",
  },
  "dazing-shot": {
    id: "dazing-shot",
    name: "Dazing Shot",
    style: "ranged",
    type: "basic",
    level: 58,
    damage: DEFAULT_BASIC,
    cooldown: 5.4,
    wiki: "Dazing Shot",
    icon: "Dazing_Shot.png",
  },
  "rapid-fire": {
    id: "rapid-fire",
    name: "Rapid Fire",
    style: "ranged",
    type: "threshold",
    level: 62,
    // Channelled, eight hits. Per-hit band.
    damage: { min: 75, max: 85 },
    cooldown: 30,
    wiki: "Rapid Fire",
    icon: "Rapid_Fire.png",
  },
  ricochet: {
    id: "ricochet",
    name: "Ricochet",
    style: "ranged",
    type: "basic",
    level: 67,
    damage: DEFAULT_BASIC,
    cooldown: 10.8,
    wiki: "Ricochet",
    icon: "Ricochet.png",
  },
  deadshot: {
    id: "deadshot",
    name: "Deadshot",
    style: "ranged",
    type: "ultimate",
    // Canonical requirement: Ranged 81. Legacy recorded 21 but gated the bar at
    // 69 — neither matched the game.
    level: 81,
    damage: { min: 125, max: 145 },
    cooldown: 60,
    wiki: "Deadshot",
    icon: "Deadshot.png",
  },

  // ---- Magic -------------------------------------------------------------
  wrack: {
    id: "wrack",
    name: "Wrack",
    style: "magic",
    type: "basic",
    level: 1,
    damage: { min: 90, max: 110 },
    cooldown: 3,
    wiki: "Wrack",
    icon: "Wrack.png",
  },
  "sonic-wave": {
    id: "sonic-wave",
    name: "Sonic Wave",
    style: "magic",
    type: "basic",
    level: 6,
    damage: { min: 90, max: 110 },
    cooldown: 5.4,
    wiki: "Sonic Wave",
    icon: "Sonic_Wave.png",
  },
  combust: {
    id: "combust",
    name: "Combust",
    style: "magic",
    type: "basic",
    level: 10,
    // Burn over ten ticks. Per-tick band (~300% total if it runs out).
    damage: { min: 28, max: 32 },
    cooldown: 15,
    wiki: "Combust",
    icon: "Combust.png",
  },
  "dragon-breath": {
    id: "dragon-breath",
    name: "Dragon Breath",
    style: "magic",
    type: "basic",
    level: 19,
    damage: { min: 110, max: 130 },
    cooldown: 10.8,
    wiki: "Dragon Breath",
    icon: "Dragon_Breath.png",
  },
  impact: {
    id: "impact",
    name: "Impact",
    style: "magic",
    type: "basic",
    level: 40,
    damage: { min: 65, max: 75 },
    cooldown: 15,
    wiki: "Impact",
    icon: "Impact.png",
  },
  chain: {
    id: "chain",
    name: "Chain",
    style: "magic",
    type: "basic",
    level: 45,
    damage: { min: 70, max: 90 },
    cooldown: 10.8,
    wiki: "Chain",
    icon: "Chain.png",
  },
  "wild-magic": {
    id: "wild-magic",
    name: "Wild Magic",
    style: "magic",
    type: "threshold",
    level: 55,
    damage: { min: 125, max: 155 },
    cooldown: 30,
    wiki: "Wild Magic",
    icon: "Wild_Magic.png",
  },
  sunshine: {
    id: "sunshine",
    name: "Sunshine",
    style: "magic",
    type: "ultimate",
    // Canonical requirement: Magic 65. Legacy recorded 50, gated the bar at 92.
    level: 65,
    damage: NO_DAMAGE,
    cooldown: 60,
    wiki: "Sunshine",
    icon: "Sunshine.png",
  },
  "concentrated-blast": {
    id: "concentrated-blast",
    name: "Concentrated Blast",
    style: "magic",
    type: "basic",
    level: 66,
    // Three channelled hits with stacking crit chance. Per-hit band.
    damage: { min: 30, max: 40 },
    cooldown: 10.8,
    wiki: "Concentrated Blast",
    icon: "Concentrated_Blast.png",
  },
  omnipower: {
    id: "omnipower",
    name: "Omnipower",
    style: "magic",
    type: "ultimate",
    // Canonical requirement: Magic 81. Legacy recorded 12, gated the bar at 101,
    // then dropped it entirely via the nine-slot truncation.
    level: 81,
    damage: { min: 420, max: 500 },
    cooldown: 30,
    wiki: "Omnipower",
    icon: "Omnipower.png",
  },

  // ---- Necromancy --------------------------------------------------------
  "touch-of-death": {
    id: "touch-of-death",
    name: "Touch of Death",
    style: "necromancy",
    type: "basic",
    level: 1,
    // Necromancy bands are deliberately wide — low floor, high ceiling.
    damage: { min: 30, max: 120 },
    cooldown: 3.6,
    wiki: "Touch of Death",
    icon: "Touch_of_Death.png",
  },
  "soul-sap": {
    id: "soul-sap",
    name: "Soul Sap",
    style: "necromancy",
    type: "basic",
    level: 5,
    damage: { min: 23, max: 57 },
    cooldown: 4.8,
    wiki: "Soul Sap",
    icon: "Soul_Sap.png",
  },
  "spectral-scythe": {
    id: "spectral-scythe",
    name: "Spectral Scythe",
    style: "necromancy",
    type: "basic",
    level: 10,
    damage: DEFAULT_BASIC,
    cooldown: 10.8,
    wiki: "Spectral Scythe",
    icon: "Spectral_Scythe.png",
  },
  "finger-of-death": {
    id: "finger-of-death",
    name: "Finger of Death",
    style: "necromancy",
    type: "threshold",
    level: 12,
    damage: { min: 50, max: 250 },
    cooldown: 5.4,
    wiki: "Finger of Death",
    icon: "Finger_of_Death.png",
  },
  "blood-siphon": {
    id: "blood-siphon",
    name: "Blood Siphon",
    style: "necromancy",
    type: "basic",
    level: 20,
    damage: { min: 36, max: 180 },
    cooldown: 15,
    wiki: "Blood Siphon",
    icon: "Blood_Siphon.png",
  },
  bloat: {
    id: "bloat",
    name: "Bloat",
    style: "necromancy",
    type: "basic",
    level: 24,
    // Bleed, four ticks over six seconds. Per-tick band.
    damage: DEFAULT_BLEED,
    cooldown: 15,
    wiki: "Bloat",
    icon: "Bloat.png",
  },
  "volley-of-souls": {
    id: "volley-of-souls",
    name: "Volley of Souls",
    style: "necromancy",
    type: "threshold",
    level: 30,
    // Scales with residual souls consumed; band is the four-hit average case.
    damage: { min: 45, max: 135 },
    cooldown: 3.6,
    wiki: "Volley of Souls",
    icon: "Volley_of_Souls.png",
  },
  "command-skeleton": {
    id: "command-skeleton",
    name: "Command Skeleton Warrior",
    style: "necromancy",
    type: "basic",
    level: 32,
    // The conjure itself deals no damage — the skeleton attacks on its own.
    damage: NO_DAMAGE,
    cooldown: 15,
    wiki: "Command Skeleton Warrior",
    icon: "Command_Skeleton_Warrior.png",
  },
  "death-skulls": {
    id: "death-skulls",
    name: "Death Skulls",
    style: "necromancy",
    // Ultimate, not a threshold — the legacy module had this mistyped.
    type: "ultimate",
    level: 40,
    damage: { min: 45, max: 135 },
    cooldown: 30,
    wiki: "Death Skulls",
    icon: "Death_Skulls.png",
  },
  "living-death": {
    id: "living-death",
    name: "Living Death",
    style: "necromancy",
    type: "ultimate",
    level: 50,
    damage: NO_DAMAGE,
    cooldown: 60,
    wiki: "Living Death",
    icon: "Living_Death.png",
  },
};

// ---------------------------------------------------------------------------
// Revolution bars
//
// Revolution reads the bar left to right and fires the first ability that is off
// cooldown and affordable, so bar ORDER is the rotation. Two conventions used
// throughout:
//   - the plain spammable basic goes last, as the filler;
//   - damage-amplifying ultimates go FIRST in the full bars, so Revolution++
//     triggers them the instant adrenaline caps rather than burning it on a
//     threshold. Players who press their ultimates manually should delete that
//     first slot.
// ---------------------------------------------------------------------------

export const REVOLUTION_BARS: RevolutionBar[] = [
  // ---- Melee -------------------------------------------------------------
  {
    id: "melee-entry",
    style: "melee",
    minLevel: 3,
    label: "Melee — entry",
    abilities: ["assault", "slice"],
    note: "Everything you have before Smash. Assault carries the bar; Slice fills.",
  },
  {
    id: "melee-mid",
    style: "melee",
    minLevel: 37,
    label: "Melee — mid",
    abilities: ["hurricane", "assault", "fury", "sever", "smash", "slice"],
    note: "Hurricane is two-handed only. On dual wield, drop it and lead with Assault.",
  },
  {
    id: "melee-full",
    style: "melee",
    minLevel: 60,
    label: "Melee — full",
    abilities: [
      "berserk",
      "dismember",
      "hurricane",
      "assault",
      "sever",
      "fury",
      "punish",
      "smash",
      "slice",
    ],
    note: "Berserk leads so Revolution++ fires it at 100% adrenaline. Punish sits above the fillers to catch sub-50% targets.",
  },
  {
    id: "melee-aoe",
    style: "melee",
    minLevel: 50,
    label: "Melee — AoE",
    abilities: ["berserk", "hurricane", "dismember", "smash", "assault", "fury", "slice"],
    note: "Multi-target. Hurricane resets its own cooldown when it hits several targets, so it stays at the front.",
  },

  // ---- Ranged ------------------------------------------------------------
  {
    id: "ranged-entry",
    style: "ranged",
    minLevel: 13,
    label: "Ranged — entry",
    abilities: ["snipe", "snap-shot", "needle-strike", "piercing-shot"],
    note: "Needle Strike sits above the filler because it cuts Snipe's cooldown.",
  },
  {
    id: "ranged-mid",
    style: "ranged",
    minLevel: 62,
    label: "Ranged — mid",
    abilities: [
      "rapid-fire",
      "snap-shot",
      "snipe",
      "dazing-shot",
      "needle-strike",
      "binding-shot",
      "piercing-shot",
    ],
    note: "Dazing Shot keeps Searing Winds up. Binding Shot is here for the stun, not the damage — cut it on bosses immune to binds.",
  },
  {
    id: "ranged-full",
    style: "ranged",
    minLevel: 81,
    label: "Ranged — full",
    abilities: [
      "deadshot",
      "rapid-fire",
      "snap-shot",
      "snipe",
      "dazing-shot",
      "needle-strike",
      "binding-shot",
      "piercing-shot",
    ],
    note: "Deadshot leads at Ranged 81 — the ultimate the legacy bar builder gated behind an unreachable level.",
  },
  {
    id: "ranged-aoe",
    style: "ranged",
    minLevel: 67,
    label: "Ranged — AoE",
    abilities: [
      "bombardment",
      "ricochet",
      "rapid-fire",
      "snap-shot",
      "needle-strike",
      "piercing-shot",
    ],
    note: "Bombardment first for the 5x5, Ricochet to bounce between stragglers.",
  },

  // ---- Magic -------------------------------------------------------------
  {
    id: "magic-entry",
    style: "magic",
    minLevel: 19,
    label: "Magic — entry",
    abilities: ["combust", "dragon-breath", "sonic-wave", "wrack"],
    note: "Combust first so the burn is always ticking; Dragon Breath gains 25% against burning targets.",
  },
  {
    id: "magic-mid",
    style: "magic",
    minLevel: 66,
    label: "Magic — mid",
    abilities: [
      "wild-magic",
      "concentrated-blast",
      "combust",
      "dragon-breath",
      "sonic-wave",
      "impact",
      "wrack",
    ],
    note: "Concentrated Blast above the basics so its crit stacks keep building.",
  },
  {
    id: "magic-full",
    style: "magic",
    minLevel: 81,
    label: "Magic — full",
    abilities: [
      "omnipower",
      "sunshine",
      "wild-magic",
      "concentrated-blast",
      "combust",
      "dragon-breath",
      "sonic-wave",
      "wrack",
    ],
    note: "Sunshine's +50% window is worth more than a banked Omnipower, but Revolution cannot judge that — press Sunshine manually if you can.",
  },
  {
    id: "magic-aoe",
    style: "magic",
    minLevel: 65,
    label: "Magic — AoE",
    abilities: [
      "sunshine",
      "chain",
      "dragon-breath",
      "combust",
      "wild-magic",
      "sonic-wave",
      "wrack",
    ],
    note: "Chain early — it splashes 30% of the NEXT ability onto nearby targets, so what follows it matters.",
  },

  // ---- Necromancy --------------------------------------------------------
  {
    id: "necro-entry",
    style: "necromancy",
    minLevel: 12,
    label: "Necromancy — entry",
    abilities: ["finger-of-death", "soul-sap", "spectral-scythe", "touch-of-death"],
    note: "Touch of Death builds necrosis stacks that make Finger of Death cheap — it stays as the filler for that reason, not for its damage.",
  },
  {
    id: "necro-mid",
    style: "necromancy",
    minLevel: 32,
    label: "Necromancy — mid",
    abilities: [
      "volley-of-souls",
      "finger-of-death",
      "bloat",
      "blood-siphon",
      "command-skeleton",
      "soul-sap",
      "touch-of-death",
    ],
    note: "Soul Sap feeds Volley of Souls; keep both. Command Skeleton is a conjure, so it costs a global but adds no hit of its own.",
  },
  {
    id: "necro-full",
    style: "necromancy",
    minLevel: 50,
    label: "Necromancy — full",
    abilities: [
      "living-death",
      "death-skulls",
      "volley-of-souls",
      "finger-of-death",
      "bloat",
      "blood-siphon",
      "command-skeleton",
      "soul-sap",
      "touch-of-death",
    ],
    note: "Living Death then Death Skulls — during the Living Death window Finger of Death is free, which is where the burst comes from.",
  },
  {
    id: "necro-aoe",
    style: "necromancy",
    minLevel: 40,
    label: "Necromancy — AoE",
    abilities: [
      "death-skulls",
      "spectral-scythe",
      "volley-of-souls",
      "blood-siphon",
      "bloat",
      "soul-sap",
      "touch-of-death",
    ],
    note: "Spectral Scythe's frontal cone recasts three times; Blood Siphon heals per target hit, which is what makes necro AoE sustainable.",
  },
];

// ---------------------------------------------------------------------------
// Gear
// ---------------------------------------------------------------------------

/** Skill ids that gate each style. Melee takes the higher of Attack/Strength. */
export const STYLE_SKILLS: Record<CombatStyle, number[]> = {
  melee: [0, 2],
  ranged: [4],
  magic: [6],
  necromancy: [28],
};

export const GEAR: Record<CombatStyle, GearTier[]> = {
  melee: [
    { tier: 1, minLevel: 1, damage: 48, armour: 33, lifePoints: 300, weapon: { name: "Bronze sword", icon: "Bronze_sword.png" }, armourSet: { name: "Bronze armour", icon: "Bronze_platebody.png" }, wiki: "Bronze sword" },
    { tier: 10, minLevel: 10, damage: 96, armour: 108, lifePoints: 500, weapon: { name: "Black longsword", icon: "Black_longsword.png" }, armourSet: { name: "Black armour", icon: "Black_platebody.png" }, wiki: "Black longsword" },
    { tier: 20, minLevel: 20, damage: 192, armour: 226, lifePoints: 700, weapon: { name: "Mithril 2h sword", icon: "Mithril_2h_sword.png" }, armourSet: { name: "Mithril armour", icon: "Mithril_platebody.png" }, wiki: "Mithril 2h sword" },
    { tier: 30, minLevel: 30, damage: 288, armour: 338, lifePoints: 900, weapon: { name: "Adamant 2h sword", icon: "Adamant_2h_sword.png" }, armourSet: { name: "Adamant armour", icon: "Adamant_platebody.png" }, wiki: "Adamant 2h sword" },
    { tier: 40, minLevel: 40, damage: 384, armour: 451, lifePoints: 1100, weapon: { name: "Rune 2h sword", icon: "Rune_2h_sword.png" }, armourSet: { name: "Rune armour", icon: "Rune_platebody.png" }, wiki: "Rune 2h sword" },
    { tier: 50, minLevel: 50, damage: 480, armour: 563, lifePoints: 1300, weapon: { name: "Granite maul", icon: "Granite_maul.png" }, armourSet: { name: "Rock-shell armour", icon: "Rock-shell_plate.png" }, wiki: "Granite maul" },
    // The jump from 480 to 768 is real: tier 60+ rows are two-handed weapons,
    // which carry roughly 60% more damage than the one-handed rows above.
    { tier: 60, minLevel: 60, damage: 768, armour: 675, lifePoints: 1500, weapon: { name: "Dragon Rider lance", icon: "Dragon_Rider_lance.png" }, armourSet: { name: "Dragon armour", icon: "Dragon_platebody.png" }, wiki: "Dragon Rider lance" },
    { tier: 70, minLevel: 70, damage: 864, armour: 788, lifePoints: 1700, weapon: { name: "Abyssal whip", icon: "Abyssal_whip.png" }, armourSet: { name: "Bandos armour", icon: "Bandos_chestplate.png" }, wiki: "Abyssal whip" },
  ],
  ranged: [
    { tier: 1, minLevel: 1, damage: 48, armour: 27, lifePoints: 300, weapon: { name: "Chargebow", icon: "Chargebow.png" }, armourSet: { name: "Leather armour", icon: "Leather_body.png" }, wiki: "Chargebow" },
    { tier: 20, minLevel: 20, damage: 192, armour: 170, lifePoints: 600, weapon: { name: "Willow shortbow", icon: "Willow_shortbow.png" }, armourSet: { name: "Studded leather", icon: "Studded_body.png" }, wiki: "Willow shortbow" },
    { tier: 30, minLevel: 30, damage: 288, armour: 260, lifePoints: 800, weapon: { name: "Maple shortbow", icon: "Maple_shortbow.png" }, armourSet: { name: "Snakeskin armour", icon: "Snakeskin_body.png" }, wiki: "Maple shortbow" },
    { tier: 40, minLevel: 40, damage: 384, armour: 338, lifePoints: 1000, weapon: { name: "Magic shortbow", icon: "Magic_shortbow.png" }, armourSet: { name: "Green dragonhide", icon: "Green_dragonhide_body.png" }, wiki: "Magic shortbow" },
    { tier: 50, minLevel: 50, damage: 480, armour: 451, lifePoints: 1200, weapon: { name: "Rune crossbow", icon: "Rune_crossbow.png" }, armourSet: { name: "Blue dragonhide", icon: "Blue_dragonhide_body.png" }, wiki: "Rune crossbow" },
    { tier: 60, minLevel: 60, damage: 768, armour: 563, lifePoints: 1400, weapon: { name: "Dragon crossbow", icon: "Dragon_crossbow.png" }, armourSet: { name: "Black dragonhide", icon: "Black_dragonhide_body.png" }, wiki: "Dragon crossbow" },
    { tier: 70, minLevel: 70, damage: 864, armour: 675, lifePoints: 1600, weapon: { name: "Crystal bow", icon: "Crystal_bow.png" }, armourSet: { name: "Armadyl armour", icon: "Armadyl_chestplate.png" }, wiki: "Crystal bow" },
  ],
  magic: [
    // No icon shipped for the tier 1 robes; the field is optional so the UI can
    // fall back rather than request a 404.
    { tier: 1, minLevel: 1, damage: 48, armour: 27, lifePoints: 300, weapon: { name: "Staff of air", icon: "Staff_of_air.png" }, armourSet: { name: "Wizard robes" }, wiki: "Staff of air" },
    { tier: 30, minLevel: 30, damage: 288, armour: 260, lifePoints: 800, weapon: { name: "Mystic wand", icon: "Mystic_wand.png" }, armourSet: { name: "Mystic robes", icon: "Mystic_robe_top.png" }, wiki: "Mystic wand" },
    { tier: 40, minLevel: 40, damage: 384, armour: 338, lifePoints: 1000, weapon: { name: "Mystic staff" }, armourSet: { name: "Splitbark armour", icon: "Splitbark_body.png" }, wiki: "Mystic staff" },
    { tier: 50, minLevel: 50, damage: 480, armour: 451, lifePoints: 1200, weapon: { name: "Grifolic wand", icon: "Grifolic_wand.png" }, armourSet: { name: "Grifolic armour", icon: "Grifolic_poncho.png" }, wiki: "Grifolic wand" },
    { tier: 60, minLevel: 60, damage: 768, armour: 563, lifePoints: 1400, weapon: { name: "Staff of light", icon: "Staff_of_light.png" }, armourSet: { name: "Ganodermic armour", icon: "Ganodermic_poncho.png" }, wiki: "Staff of light" },
    { tier: 70, minLevel: 70, damage: 864, armour: 675, lifePoints: 1600, weapon: { name: "Wand of the Cywir elders", icon: "Wand_of_the_Cywir_elders.png" }, armourSet: { name: "Subjugation armour", icon: "Garb_of_subjugation.png" }, wiki: "Wand of the Cywir elders" },
  ],
  necromancy: [
    // The legacy table listed the Deathwarden hood as the "weapon" for every
    // necro tier — it is a helmet. The necro weapon is the Death guard.
    { tier: 1, minLevel: 1, damage: 48, armour: 27, lifePoints: 300, weapon: { name: "Death guard (tier 1)" }, armourSet: { name: "Deathwarden robes (tier 1)" }, wiki: "Death guard" },
    { tier: 20, minLevel: 20, damage: 192, armour: 170, lifePoints: 600, weapon: { name: "Death guard (tier 20)" }, armourSet: { name: "Deathwarden robes (tier 20)", icon: "Deathwarden_robe_top_(tier_20).png" }, wiki: "Death guard" },
    { tier: 40, minLevel: 40, damage: 384, armour: 338, lifePoints: 1000, weapon: { name: "Death guard (tier 40)" }, armourSet: { name: "Deathwarden robes (tier 40)", icon: "Deathwarden_robe_top_(tier_40).png" }, wiki: "Death guard" },
    { tier: 60, minLevel: 60, damage: 768, armour: 563, lifePoints: 1400, weapon: { name: "Death guard (tier 60)" }, armourSet: { name: "Deathwarden robes (tier 60)", icon: "Deathwarden_robe_top_(tier_60).png" }, wiki: "Death guard" },
    { tier: 70, minLevel: 70, damage: 864, armour: 675, lifePoints: 1600, weapon: { name: "Death guard (tier 70)", icon: "Death_guard_(tier_70).png" }, armourSet: { name: "Deathwarden robes (tier 70)", icon: "Deathwarden_robe_top_(tier_70).png" }, wiki: "Death guard" },
  ],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Global cooldown in seconds — the divisor the legacy estimator used. */
const GCD_SECONDS = 1.8;

/** The level a style is judged at. Melee takes the higher of Attack/Strength. */
export function styleLevel(
  skills: Record<number, { level: number }>,
  style: CombatStyle,
): number {
  let best = 1;
  for (const id of STYLE_SKILLS[style]) {
    const lvl = skills[id]?.level ?? 1;
    if (lvl > best) best = lvl;
  }
  return best;
}

/** Every bar of a style the player has unlocked, easiest first. */
export function barsForStyle(style: CombatStyle, level: number): RevolutionBar[] {
  return REVOLUTION_BARS.filter((b) => b.style === style && b.minLevel <= level).sort(
    (a, b) => a.minLevel - b.minLevel,
  );
}

/** Resolve ability ids to records, dropping any that no longer exist. */
export function abilitiesOf(bar: RevolutionBar): Ability[] {
  return bar.abilities
    .map((id) => ABILITIES[id])
    .filter((a): a is Ability => a !== undefined);
}

/** Best gear tier at or below `level`. Falls back to the first tier. */
export function gearForLevel(style: CombatStyle, level: number): GearTier {
  const tiers = GEAR[style];
  let best = tiers[0];
  for (const g of tiers) {
    if (g.minLevel <= level) best = g;
  }
  return best;
}

/** Best gear tier at or below `tier`. Falls back to the first tier. */
export function gearForTier(style: CombatStyle, tier: number): GearTier {
  const tiers = GEAR[style];
  let best = tiers[0];
  for (const g of tiers) {
    if (g.tier <= tier) best = g;
  }
  return best;
}

/**
 * Comparative DPS index — NOT a simulator.
 *
 * Ported from the legacy estimateDPS(): ability damage scales as
 * `level * 4 + weapon damage`, multiplied by the average ability percentage of
 * the best bar at that level, over one global cooldown. It ignores accuracy,
 * armour, prayers, auras, crit and adrenaline economy, so treat the number as a
 * way to rank styles and gear tiers against each other, nothing more.
 *
 * One deliberate change from the legacy version: buffs and conjures (Berserk,
 * Sunshine, Living Death, Command Skeleton) are excluded from the average
 * instead of being counted as a flat 110%. The legacy code scraped percentages
 * out of English description strings with a regex and fell back to 110 whenever
 * it found none, which credited every ultimate with damage it does not deal.
 */
export function estimateDps(style: CombatStyle, level: number, tier: number): number {
  const gear = gearForTier(style, tier);
  const abilityDamage = level * 4 + gear.damage;

  const unlocked = barsForStyle(style, level);
  const bar = unlocked[unlocked.length - 1];
  const damaging = bar ? abilitiesOf(bar).filter((a) => a.damage.max > 0) : [];

  const avgPct = damaging.length
    ? damaging.reduce((sum, a) => sum + (a.damage.min + a.damage.max) / 2, 0) /
      damaging.length
    : 110; // no bar unlocked yet: assume a bare auto-attack basic

  return Math.round((abilityDamage * avgPct) / 100 / GCD_SECONDS);
}
