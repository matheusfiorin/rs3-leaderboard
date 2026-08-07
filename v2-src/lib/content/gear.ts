// Endgame gear and upgrade paths — T70 to T95, per combat style.
//
// Prices are a Grand Exchange snapshot taken while authoring (August 2026) and
// are only ever used to *rank* upgrades by affordability, never displayed as a
// live quote. Armour sets are one entry keyed to the body slot rather than five
// entries per set: nobody buys a Torva helm in isolation, and a five-way split
// would swamp every "what's next" rail in the app. `approxGp` on a set is the
// helm + body + legs total, which is what the set actually costs to enter.
//
// Dual-wield weapons are likewise one entry on the mainhand slot with the pair
// price, because the off-hand is never a separate decision.

import type { ContentEntry, ContentTier, GateResult, Requirement } from "../types";
import type { EvalContext } from "../requirements";
import { rankByProximity } from "../requirements";
import { fmtGp } from "../format";

export type GearSlot =
  | "mainhand"
  | "offhand"
  | "2h"
  | "head"
  | "body"
  | "legs"
  | "hands"
  | "feet"
  | "cape"
  | "neck"
  | "ring"
  | "aura"
  | "pocket";

export type GearStyle = "melee" | "ranged" | "magic" | "necromancy" | "any";

export type GearSource = "drop" | "craft" | "shop" | "quest" | "invention";

export interface GearEntry extends ContentEntry {
  slot: GearSlot;
  style: GearStyle;
  tier: ContentTier;
  /** RS3 item tier: 70, 80, 85, 90, 92, 95. */
  itemTier: number;
  source: GearSource;
  /** Rough GE cost. Omitted for untradeables. */
  approxGp?: number;
}

// ---------------------------------------------------------------------------
// Requirement helpers
// ---------------------------------------------------------------------------

const ATTACK = 0;
const DEFENCE = 1;
const STRENGTH = 2;
const RANGED = 4;
const MAGIC = 6;
const FLETCHING = 9;
const CRAFTING = 12;
const SMITHING = 13;
const AGILITY = 16;
const RUNECRAFTING = 20;
const DUNGEONEERING = 24;
const INVENTION = 26;
const NECROMANCY = 28;

const skill = (id: number, level: number, note?: string): Requirement =>
  note ? { kind: "skill", skill: id, level, note } : { kind: "skill", skill: id, level };

/** GP is invisible to every RuneScape API, so cost is always a manual tick. */
const gp = (id: string, amount: number): Requirement => ({
  kind: "manual",
  id: `gp:${id}`,
  label: `Afford ${fmtGp(amount)}`,
});

// Augmentation gates are per equipment *kind*, not per item, and the numbers
// surprise people: an augmentor works on a weapon from Invention 2 but won't
// touch platelegs until 45. Anyone who skipped Invention hits the leg wall
// with a full set of augmented everything-else.
const AUG_WEAPON = skill(INVENTION, 2, "Augmentor works on weapons from Invention 2");
const AUG_BODY = skill(INVENTION, 16, "Body armour and shields augment at Invention 16");
const AUG_LEGS = skill(INVENTION, 45, "Leg armour augments at Invention 45");

// ---------------------------------------------------------------------------
// Tier banding
//
// itemTier -> ContentTier, so gear sorts alongside bosses and dungeons in the
// shared rails:
//   70 early | 80 mid | 85 mid | 90 late | 92 end | 95 apex
// ---------------------------------------------------------------------------

export const GEAR_TIERS: GearEntry[] = [
  // =========================================================================
  // MELEE — armour
  // =========================================================================
  {
    id: "melee-necronium",
    name: "Necronium equipment",
    tier: "early",
    itemTier: 70,
    slot: "body",
    style: "melee",
    source: "craft",
    wiki: "Necronium equipment",
    blurb: "Smithable T70 plate. Costs pocket change — the only reason to stop here is Defence.",
    approxGp: 48_000,
    requirements: [
      skill(DEFENCE, 70),
      skill(SMITHING, 70, "To smith it yourself; buying it off the GE skips this"),
      gp("melee-necronium", 48_000),
    ],
  },
  {
    id: "melee-torva",
    name: "Torva armour",
    tier: "mid",
    itemTier: 80,
    slot: "body",
    style: "melee",
    source: "drop",
    wiki: "Torva armour",
    blurb: "Nex's T80 power set. Does not degrade, which is why it holds value a decade on.",
    approxGp: 117_000_000,
    requirements: [skill(DEFENCE, 80), AUG_BODY, AUG_LEGS, gp("melee-torva", 117_000_000)],
  },
  {
    id: "melee-anima-core-zaros",
    name: "Anima core of Zaros armour",
    tier: "mid",
    itemTier: 80,
    slot: "body",
    style: "melee",
    source: "drop",
    wiki: "Anima core of Zaros armour",
    blurb: "Same tier as Torva for a third of the price. The sane T80 entry point.",
    approxGp: 37_000_000,
    requirements: [skill(DEFENCE, 80), AUG_BODY, AUG_LEGS, gp("melee-anima-core-zaros", 37_000_000)],
  },
  {
    id: "melee-malevolent",
    name: "Malevolent armour",
    tier: "late",
    itemTier: 90,
    slot: "body",
    style: "melee",
    source: "craft",
    wiki: "Malevolent armour",
    blurb: "T90 power. Degrades to dust at 100k charges — you rebuy the set, you never repair it.",
    approxGp: 101_000_000,
    requirements: [skill(DEFENCE, 90), AUG_BODY, AUG_LEGS, gp("melee-malevolent", 101_000_000)],
  },
  {
    id: "melee-masterwork",
    name: "Masterwork armour",
    tier: "late",
    itemTier: 90,
    slot: "body",
    style: "melee",
    source: "craft",
    wiki: "Masterwork equipment",
    blurb: "T90 that repairs instead of dusting, and custom-fits to double its charges. Cheaper per hour than Malevolent.",
    approxGp: 82_000_000,
    requirements: [skill(DEFENCE, 90), AUG_BODY, AUG_LEGS, gp("melee-masterwork", 82_000_000)],
  },
  {
    id: "melee-trimmed-masterwork",
    name: "Trimmed masterwork melee armour",
    tier: "end",
    itemTier: 92,
    slot: "body",
    style: "melee",
    source: "craft",
    wiki: "Trimmed masterwork melee armour",
    blurb: "Strongest smithable melee armour. 100k charges, repairable, custom-fit doubles that.",
    approxGp: 320_000_000,
    requirements: [
      skill(DEFENCE, 92),
      // 99 Smithing + the achievement gate only bind if you forge it yourself;
      // the finished pieces are tradeable.
      skill(SMITHING, 99, "Only to craft it — trimmed masterwork is tradeable"),
      AUG_BODY,
      AUG_LEGS,
      gp("melee-trimmed-masterwork", 320_000_000),
    ],
  },
  {
    id: "melee-vestments-of-havoc",
    name: "Vestments of havoc",
    tier: "apex",
    itemTier: 95,
    slot: "body",
    style: "melee",
    source: "drop",
    wiki: "Vestments of havoc armour",
    blurb: "First T95 set in the game. Tier 110 damage on a tier 75 armour value, and it never degrades.",
    approxGp: 875_000_000,
    requirements: [
      skill(DEFENCE, 95),
      AUG_BODY,
      AUG_LEGS,
      gp("melee-vestments-of-havoc", 875_000_000),
    ],
  },

  // =========================================================================
  // MELEE — weapons
  // =========================================================================
  {
    id: "melee-chaotic-rapier",
    name: "Chaotic rapier",
    tier: "mid",
    itemTier: 80,
    slot: "mainhand",
    style: "melee",
    source: "shop",
    wiki: "Chaotic rapier",
    blurb: "200k Dungeoneering tokens, no gold. The classic bridge from tier 70 to real weapons.",
    requirements: [
      skill(ATTACK, 80),
      skill(DUNGEONEERING, 80),
      AUG_WEAPON,
      { kind: "manual", id: "dg-tokens-chaotic", label: "200,000 Dungeoneering tokens" },
    ],
  },
  {
    id: "melee-attuned-crystal-halberd",
    name: "Attuned crystal halberd",
    tier: "mid",
    itemTier: 80,
    slot: "2h",
    style: "melee",
    source: "craft",
    wiki: "Attuned crystal halberd",
    blurb: "Untradeable T80 two-hander with reach, made from crystal in Prifddinas.",
    requirements: [
      skill(ATTACK, 80),
      skill(AGILITY, 50),
      { kind: "quest", title: "Plague's End", note: "Unlocks Prifddinas and crystal weapon singing" },
      AUG_WEAPON,
    ],
  },
  {
    id: "melee-dragon-rider-lance",
    name: "Dragon Rider lance",
    tier: "mid",
    itemTier: 85,
    slot: "2h",
    style: "melee",
    source: "drop",
    wiki: "Dragon Rider lance",
    blurb: "Queen Black Dragon's T85 halberd. Cheap for its tier and it never degrades.",
    approxGp: 13_000_000,
    requirements: [skill(ATTACK, 85), AUG_WEAPON, gp("melee-dragon-rider-lance", 13_000_000)],
  },
  {
    id: "melee-drygore",
    name: "Drygore rapier + off-hand",
    tier: "late",
    itemTier: 90,
    slot: "mainhand",
    style: "melee",
    source: "drop",
    wiki: "Drygore rapier",
    blurb: "Kalphite King's T90 dual-wield. The stab set is the default; mace and longsword swap the style.",
    approxGp: 53_000_000,
    requirements: [skill(ATTACK, 90), AUG_WEAPON, gp("melee-drygore", 53_000_000)],
  },
  {
    id: "melee-noxious-scythe",
    name: "Noxious scythe",
    tier: "late",
    itemTier: 90,
    slot: "2h",
    style: "melee",
    source: "craft",
    wiki: "Noxious scythe",
    blurb: "Araxxor's T90 two-hander. Still the AoE workhorse until Tumeken's Light.",
    approxGp: 292_000_000,
    requirements: [skill(ATTACK, 90), AUG_WEAPON, gp("melee-noxious-scythe", 292_000_000)],
  },
  {
    id: "melee-khopeshes",
    name: "Khopesh of Tumeken + Elidinis",
    tier: "end",
    itemTier: 92,
    slot: "mainhand",
    style: "melee",
    source: "craft",
    wiki: "Khopesh of Tumeken",
    blurb: "T92 dual-wield blessed from Sophanem Slayer Dungeon drops. Degrades to broken, repairable.",
    approxGp: 280_000_000,
    requirements: [
      skill(ATTACK, 92),
      skill(CRAFTING, 92, "Only to bless the khopeshes yourself — the finished pair is tradeable"),
      AUG_WEAPON,
      gp("melee-khopeshes", 280_000_000),
    ],
  },
  {
    id: "melee-zaros-godsword",
    name: "Zaros godsword",
    tier: "end",
    itemTier: 92,
    slot: "2h",
    style: "melee",
    source: "craft",
    wiki: "Zaros godsword",
    blurb: "Telos anima orbs on a dormant blade. 60k charges, then 4.8M to repair.",
    approxGp: 185_000_000,
    requirements: [
      skill(ATTACK, 92),
      skill(CRAFTING, 92, "Only to assemble it from the dormant sword"),
      AUG_WEAPON,
      gp("melee-zaros-godsword", 185_000_000),
    ],
  },
  {
    id: "melee-leng",
    name: "Dark Shard + Dark Sliver of Leng",
    tier: "apex",
    itemTier: 95,
    slot: "mainhand",
    style: "melee",
    source: "craft",
    wiki: "Dark Shard of Leng",
    blurb: "Strongest one-handed melee in the game. Built from Arch-Glacor drops, 60k charges.",
    approxGp: 1_010_000_000,
    requirements: [skill(ATTACK, 95), AUG_WEAPON, gp("melee-leng", 1_010_000_000)],
  },
  {
    id: "melee-ek-zekkil",
    name: "Ek-ZekKil",
    tier: "apex",
    itemTier: 95,
    slot: "2h",
    style: "melee",
    source: "craft",
    wiki: "Ek-ZekKil",
    // Note the requirement is Strength, not Attack — the only high-tier melee
    // weapon in the game gated on Strength, and it catches people out.
    blurb: "The Zuk sword. Gated on 95 Strength, not Attack, and assembled from hard mode TzKal-Zuk drops.",
    approxGp: 2_130_000_000,
    requirements: [
      skill(STRENGTH, 95),
      skill(SMITHING, 95, "Only to forge it from the obsidian blade, magma core and ancient hilt"),
      AUG_WEAPON,
      gp("melee-ek-zekkil", 2_130_000_000),
    ],
  },
  {
    id: "melee-tumekens-light",
    name: "Tumeken's Light",
    tier: "apex",
    itemTier: 95,
    slot: "2h",
    style: "melee",
    source: "drop",
    wiki: "Tumeken's Light",
    blurb: "Amascut's T95 halberd. Range 2, does not degrade, and enchants to tier 100.",
    approxGp: 2_450_000_000,
    requirements: [
      skill(ATTACK, 95),
      { kind: "quest", title: "Eclipse of the Heart", note: "Required to access the Amascut encounter" },
      AUG_WEAPON,
      gp("melee-tumekens-light", 2_450_000_000),
    ],
  },

  // =========================================================================
  // RANGED — armour
  // =========================================================================
  {
    id: "ranged-armadyl",
    name: "Armadyl equipment",
    tier: "early",
    itemTier: 70,
    slot: "body",
    style: "ranged",
    source: "drop",
    wiki: "Armadyl equipment",
    blurb: "GWD1 T70 power set. Non-degrading and cheap enough to be nobody's bottleneck.",
    approxGp: 6_100_000,
    requirements: [skill(DEFENCE, 70), AUG_BODY, AUG_LEGS, gp("ranged-armadyl", 6_100_000)],
  },
  {
    id: "ranged-pernix",
    name: "Pernix armour",
    tier: "mid",
    itemTier: 80,
    slot: "body",
    style: "ranged",
    source: "drop",
    wiki: "Pernix armour",
    blurb: "Nex's T80 ranged set. Also the praesulic essence feedstock for elite sirenic.",
    approxGp: 112_000_000,
    requirements: [skill(DEFENCE, 80), AUG_BODY, AUG_LEGS, gp("ranged-pernix", 112_000_000)],
  },
  {
    id: "ranged-anima-core-zamorak",
    name: "Anima core of Zamorak armour",
    tier: "mid",
    itemTier: 80,
    slot: "body",
    style: "ranged",
    source: "drop",
    wiki: "Anima core of Zamorak armour",
    blurb: "The affordable T80. Buy this instead of Pernix unless you plan to shred it for essence.",
    approxGp: 40_000_000,
    requirements: [
      skill(DEFENCE, 80),
      AUG_BODY,
      AUG_LEGS,
      gp("ranged-anima-core-zamorak", 40_000_000),
    ],
  },
  {
    id: "ranged-sirenic",
    name: "Sirenic armour",
    tier: "late",
    itemTier: 90,
    slot: "body",
    style: "ranged",
    source: "craft",
    wiki: "Sirenic armour",
    // Undyed sirenic degrades to dust, so its GE price collapsed to consumable
    // levels — it is by a wide margin the cheapest way into tier 90 anything.
    blurb: "Degrades to dust unless dyed, which is exactly why a full T90 set costs single-digit millions.",
    approxGp: 7_200_000,
    requirements: [skill(DEFENCE, 90), AUG_BODY, AUG_LEGS, gp("ranged-sirenic", 7_200_000)],
  },
  {
    id: "ranged-dracolich",
    name: "Dracolich armour",
    tier: "late",
    itemTier: 90,
    slot: "body",
    style: "ranged",
    source: "craft",
    wiki: "Dracolich armour",
    blurb: "Undead dragonhide upgraded with Vorkath's spikes. Its set effect is bow-only.",
    approxGp: 221_000_000,
    requirements: [
      skill(DEFENCE, 90),
      skill(CRAFTING, 90, "Only to upgrade the hide yourself — the finished pieces are tradeable"),
      AUG_BODY,
      AUG_LEGS,
      gp("ranged-dracolich", 221_000_000),
    ],
  },
  {
    id: "ranged-elite-sirenic",
    name: "Elite sirenic armour",
    tier: "end",
    itemTier: 92,
    slot: "body",
    style: "ranged",
    source: "craft",
    wiki: "Elite sirenic armour",
    blurb: "T92 power. Unlike plain sirenic it repairs with patches instead of dusting.",
    approxGp: 774_000_000,
    requirements: [
      skill(DEFENCE, 92),
      skill(CRAFTING, 99, "Only if you break down Pernix into praesulic essence yourself"),
      AUG_BODY,
      AUG_LEGS,
      gp("ranged-elite-sirenic", 774_000_000),
    ],
  },
  {
    id: "ranged-apex-hide",
    name: "Apex hide armour",
    tier: "late",
    itemTier: 90,
    slot: "body",
    style: "ranged",
    source: "craft",
    // T85 at base, upgraded to T90 across five +1 steps; 384 apex leather for
    // a full set. Tank armour, so it competes with Dracolich only on survival.
    wiki: "Apex hide armour",
    blurb: "Havenhythe tank hide, T85 upgrading to T90. Never degrades, but cannot be augmented at all.",
    requirements: [
      skill(DEFENCE, 90),
      skill(CRAFTING, 100, "Tailoring apex leather is the only source"),
      { kind: "manual", id: "apex-leather-384", label: "384 apex leather for a full set" },
    ],
  },

  // =========================================================================
  // RANGED — weapons
  //
  // There is no tier 95 ranged armour set as of mid-2026 — elite sirenic and
  // elite Dracolich are the ceiling. Ranged's apex spend is all in the bow.
  // =========================================================================
  {
    id: "ranged-zaryte-bow",
    name: "Zaryte bow",
    tier: "mid",
    itemTier: 80,
    slot: "2h",
    style: "ranged",
    source: "drop",
    wiki: "Zaryte bow",
    blurb: "Nex's T80 chargebow. Supplies its own ammo, so no arrow budget.",
    approxGp: 11_000_000,
    requirements: [skill(RANGED, 80), AUG_WEAPON, gp("ranged-zaryte-bow", 11_000_000)],
  },
  {
    id: "ranged-ascension",
    name: "Ascension crossbow + off-hand",
    tier: "late",
    itemTier: 90,
    slot: "mainhand",
    style: "ranged",
    source: "craft",
    wiki: "Ascension crossbow",
    blurb: "T90 dual-wield from Monastery of Ascension sigils. The standard bolt-based DPS pair.",
    approxGp: 59_000_000,
    requirements: [skill(RANGED, 90), AUG_WEAPON, gp("ranged-ascension", 59_000_000)],
  },
  {
    id: "ranged-noxious-longbow",
    name: "Noxious longbow",
    tier: "late",
    itemTier: 90,
    slot: "2h",
    style: "ranged",
    source: "craft",
    wiki: "Noxious longbow",
    blurb: "Araxxor's T90 bow. With araxyte arrows it runs close to a Seren godbow for a fraction of the price.",
    approxGp: 235_000_000,
    requirements: [skill(RANGED, 90), AUG_WEAPON, gp("ranged-noxious-longbow", 235_000_000)],
  },
  {
    id: "ranged-blightbound",
    name: "Blightbound crossbow + off-hand",
    tier: "end",
    itemTier: 92,
    slot: "mainhand",
    style: "ranged",
    source: "drop",
    wiki: "Blightbound crossbow",
    blurb: "Solak's T92 dual-wield. The cheapest way into tier 92 ranged by a wide margin.",
    approxGp: 120_000_000,
    requirements: [skill(RANGED, 92), AUG_WEAPON, gp("ranged-blightbound", 120_000_000)],
  },
  {
    id: "ranged-eldritch-crossbow",
    name: "Eldritch crossbow",
    tier: "end",
    itemTier: 92,
    slot: "2h",
    style: "ranged",
    source: "craft",
    wiki: "Eldritch crossbow",
    blurb: "Assembled from three Ambassador drops in The Shadow Reef. Bought for the special attack, not the stats.",
    approxGp: 813_000_000,
    requirements: [
      skill(RANGED, 92),
      skill(FLETCHING, 96, "Only to assemble the stock, limbs and mechanism — the finished bow is tradeable"),
      AUG_WEAPON,
      gp("ranged-eldritch-crossbow", 813_000_000),
    ],
  },
  {
    id: "ranged-seren-godbow",
    name: "Seren godbow",
    tier: "end",
    itemTier: 92,
    slot: "2h",
    style: "ranged",
    source: "craft",
    wiki: "Seren godbow",
    blurb: "Telos anima orbs on a dormant bow. Chargebow, so it feeds itself and still takes bane arrows.",
    approxGp: 664_000_000,
    requirements: [
      skill(RANGED, 92),
      skill(CRAFTING, 92, "Only to assemble it from the dormant bow"),
      AUG_WEAPON,
      gp("ranged-seren-godbow", 664_000_000),
    ],
  },
  {
    id: "ranged-bow-of-the-last-guardian",
    name: "Bow of the Last Guardian",
    tier: "apex",
    itemTier: 95,
    slot: "2h",
    style: "ranged",
    source: "craft",
    wiki: "Bow of the Last Guardian",
    blurb: "Three Zamorak, Lord of Chaos exclusives fletched together. 60k charges, 4.8M to repair.",
    approxGp: 1_460_000_000,
    requirements: [
      skill(RANGED, 95),
      skill(FLETCHING, 95, "Assembly is irreversible and cannot be done for you"),
      AUG_WEAPON,
      gp("ranged-bow-of-the-last-guardian", 1_460_000_000),
    ],
  },

  // =========================================================================
  // MAGIC — armour
  // =========================================================================
  {
    id: "magic-subjugation",
    name: "Subjugation robe armour",
    tier: "early",
    itemTier: 70,
    slot: "body",
    style: "magic",
    source: "drop",
    wiki: "Subjugation robe armour",
    blurb: "Nex's T70 robes. Non-degrading and priced like a consumable.",
    approxGp: 5_600_000,
    requirements: [skill(DEFENCE, 70), AUG_BODY, AUG_LEGS, gp("magic-subjugation", 5_600_000)],
  },
  {
    id: "magic-virtus",
    name: "Virtus equipment",
    tier: "mid",
    itemTier: 80,
    slot: "body",
    style: "magic",
    source: "drop",
    wiki: "Virtus equipment",
    blurb: "Nex's T80 robes, and the praesulic essence feedstock for elite tectonic.",
    approxGp: 97_000_000,
    requirements: [skill(DEFENCE, 80), AUG_BODY, AUG_LEGS, gp("magic-virtus", 97_000_000)],
  },
  {
    id: "magic-anima-core-seren",
    name: "Anima core of Seren armour",
    tier: "mid",
    itemTier: 80,
    slot: "body",
    style: "magic",
    source: "drop",
    wiki: "Anima core of Seren armour",
    blurb: "Half the price of Virtus at the same tier. Take this unless you need the essence.",
    approxGp: 53_000_000,
    requirements: [skill(DEFENCE, 80), AUG_BODY, AUG_LEGS, gp("magic-anima-core-seren", 53_000_000)],
  },
  {
    id: "magic-tectonic",
    name: "Tectonic robe armour",
    tier: "late",
    itemTier: 90,
    slot: "body",
    style: "magic",
    source: "craft",
    wiki: "Tectonic robe armour",
    blurb: "T90 power robes. Degrades to dust undyed — budget for a rebuy every 100k charges.",
    approxGp: 96_000_000,
    requirements: [skill(DEFENCE, 90), AUG_BODY, AUG_LEGS, gp("magic-tectonic", 96_000_000)],
  },
  {
    id: "magic-cryptbloom",
    name: "Cryptbloom armour",
    tier: "late",
    itemTier: 90,
    slot: "body",
    style: "magic",
    source: "drop",
    wiki: "Cryptbloom armour",
    // Tank, not power — no damage bonus. Bought for the Nature's Envoy damage
    // reduction, which stacks with Animate Dead, not for DPS.
    blurb: "T90 magic tank from Croesus. Its damage reduction stacks with Animate Dead, so it is a survival buy.",
    approxGp: 382_000_000,
    requirements: [skill(DEFENCE, 90), AUG_BODY, AUG_LEGS, gp("magic-cryptbloom", 382_000_000)],
  },
  {
    id: "magic-elite-tectonic",
    name: "Elite tectonic robe armour",
    tier: "end",
    itemTier: 92,
    slot: "body",
    style: "magic",
    source: "craft",
    wiki: "Elite tectonic robe armour",
    blurb: "T92 power robes that repair with patches rather than dusting.",
    approxGp: 357_000_000,
    requirements: [
      skill(DEFENCE, 92),
      skill(RUNECRAFTING, 99, "Only if you break down Virtus into praesulic essence yourself"),
      AUG_BODY,
      AUG_LEGS,
      gp("magic-elite-tectonic", 357_000_000),
    ],
  },
  {
    id: "magic-tumekens-resplendence",
    name: "Tumeken's resplendence equipment",
    tier: "apex",
    itemTier: 95,
    slot: "body",
    style: "magic",
    source: "drop",
    wiki: "Tumeken's resplendence equipment",
    blurb: "T95 magic power robes from Amascut. Needs 95 Magic as well as 95 Defence.",
    approxGp: 1_380_000_000,
    requirements: [
      skill(MAGIC, 95),
      skill(DEFENCE, 95),
      { kind: "quest", title: "Eclipse of the Heart", note: "Required to access the Amascut encounter" },
      AUG_BODY,
      AUG_LEGS,
      gp("magic-tumekens-resplendence", 1_380_000_000),
    ],
  },

  // =========================================================================
  // MAGIC — weapons
  // =========================================================================
  {
    id: "magic-cywir-wand",
    name: "Wand of the Cywir elders",
    tier: "mid",
    itemTier: 85,
    slot: "mainhand",
    style: "magic",
    source: "drop",
    wiki: "Wand of the Cywir elders",
    // Price is the wand alone; pair it with the Orb of the Cywir elders.
    blurb: "Helwyr's T85 wand, paired with the matching orb. Cheap, non-degrading, and the usual home for a Planted Feet switch.",
    approxGp: 9_200_000,
    requirements: [skill(MAGIC, 85), AUG_WEAPON, gp("magic-cywir-wand", 9_200_000)],
  },
  {
    id: "magic-seismic",
    name: "Seismic wand + singularity",
    tier: "late",
    itemTier: 90,
    slot: "mainhand",
    style: "magic",
    source: "drop",
    wiki: "Seismic wand",
    blurb: "Vorago's T90 dual-wield. Non-degrading, so no repair line in the budget.",
    approxGp: 126_000_000,
    requirements: [skill(MAGIC, 90), AUG_WEAPON, gp("magic-seismic", 126_000_000)],
  },
  {
    id: "magic-noxious-staff",
    name: "Noxious staff",
    tier: "late",
    itemTier: 90,
    slot: "2h",
    style: "magic",
    source: "craft",
    wiki: "Noxious staff",
    blurb: "Araxxor's T90 two-hander, built from the same spider parts as the scythe and longbow.",
    approxGp: 231_000_000,
    requirements: [skill(MAGIC, 90), AUG_WEAPON, gp("magic-noxious-staff", 231_000_000)],
  },
  {
    id: "magic-praesul",
    name: "Wand of the praesul + Imperium core",
    tier: "end",
    itemTier: 92,
    slot: "mainhand",
    style: "magic",
    source: "drop",
    wiki: "Wand of the praesul",
    blurb: "Nex: Angel of Death's T92 dual-wield. The cheapest tier 92 magic setup in the game.",
    approxGp: 102_000_000,
    requirements: [skill(MAGIC, 92), AUG_WEAPON, gp("magic-praesul", 102_000_000)],
  },
  {
    id: "magic-staff-of-sliske",
    name: "Staff of Sliske",
    tier: "end",
    itemTier: 92,
    slot: "2h",
    style: "magic",
    source: "craft",
    wiki: "Staff of Sliske",
    blurb: "Telos anima orbs on a dormant staff. 60k charges before it breaks.",
    approxGp: 98_000_000,
    requirements: [
      skill(MAGIC, 92),
      skill(CRAFTING, 92, "Only to assemble it from the dormant staff"),
      AUG_WEAPON,
      gp("magic-staff-of-sliske", 98_000_000),
    ],
  },
  {
    id: "magic-fsoa",
    name: "Fractured Staff of Armadyl",
    tier: "apex",
    itemTier: 95,
    slot: "2h",
    style: "magic",
    source: "drop",
    wiki: "Fractured Staff of Armadyl",
    blurb: "Kerapac's T95 staff. Bought for its special attack, which reshapes the whole magic rotation.",
    approxGp: 1_140_000_000,
    requirements: [skill(MAGIC, 95), AUG_WEAPON, gp("magic-fsoa", 1_140_000_000)],
  },

  // =========================================================================
  // NECROMANCY
  //
  // Every upgradeable Necromancy piece has a rule no other style has: you may
  // only equip a tier you have crafted yourself at least once, even if you buy
  // the item off the GE. That makes Kili Row a hard gate on the whole ladder,
  // and the smithing level is always the tier minus five.
  // The First Necromancer's T95 set is the sole exception — no craft-first rule.
  // =========================================================================
  {
    id: "necro-death-skulls-70",
    name: "Death guard + skull lantern (tier 70)",
    tier: "early",
    itemTier: 70,
    slot: "mainhand",
    style: "necromancy",
    source: "craft",
    wiki: "Death Skull equipment",
    blurb: "First real Necromancy dual-wield. Forged at the soul forge from ensouled bars.",
    approxGp: 2_500_000,
    requirements: [
      skill(NECROMANCY, 70),
      skill(SMITHING, 65, "Upgrades need Smithing equal to the tier minus 5"),
      { kind: "quest", title: "Kili Row", note: "Unlocks the soul forge upgrade path" },
      AUG_WEAPON,
      gp("necro-death-skulls-70", 2_500_000),
    ],
  },
  {
    id: "necro-death-skulls-80",
    name: "Death guard + skull lantern (tier 80)",
    tier: "mid",
    itemTier: 80,
    slot: "mainhand",
    style: "necromancy",
    source: "craft",
    wiki: "Death Skull equipment",
    blurb: "Greater ensouled bars start here. Barely more expensive than tier 70.",
    approxGp: 2_700_000,
    requirements: [
      skill(NECROMANCY, 80),
      skill(SMITHING, 75),
      { kind: "quest", title: "Kili Row" },
      AUG_WEAPON,
      gp("necro-death-skulls-80", 2_700_000),
    ],
  },
  {
    id: "necro-death-skulls-90",
    name: "Death guard + skull lantern (tier 90)",
    tier: "late",
    itemTier: 90,
    slot: "mainhand",
    style: "necromancy",
    source: "craft",
    wiki: "Death Skull equipment",
    // Under 4M for a tier 90 dual-wield: nothing else in the game is close, and
    // it is why Necromancy is the cheapest style to gear from scratch.
    blurb: "Tier 90 dual-wield for under 4M. The single best gold-to-damage step in the game.",
    approxGp: 3_900_000,
    requirements: [
      skill(NECROMANCY, 90),
      skill(SMITHING, 85),
      { kind: "quest", title: "Kili Row" },
      AUG_WEAPON,
      gp("necro-death-skulls-90", 3_900_000),
    ],
  },
  {
    id: "necro-deathwarden-70",
    name: "Deathwarden robe armour (tier 70)",
    tier: "early",
    itemTier: 70,
    slot: "body",
    style: "necromancy",
    source: "craft",
    wiki: "Deathwarden robe armour",
    blurb: "Tank robes. The tier 70 rung is where the power-armour branch opens up.",
    approxGp: 3_200_000,
    requirements: [
      skill(DEFENCE, 70),
      { kind: "quest", title: "Kili Row" },
      AUG_BODY,
      AUG_LEGS,
      gp("necro-deathwarden-70", 3_200_000),
    ],
  },
  {
    id: "necro-deathdealer-70",
    name: "Deathdealer robe armour (tier 70)",
    tier: "early",
    itemTier: 70,
    slot: "body",
    style: "necromancy",
    source: "craft",
    wiki: "Deathdealer robe armour",
    blurb: "Power branch of the same ladder. Converting from Deathwarden costs a Hermodic plate per piece.",
    approxGp: 3_200_000,
    requirements: [
      skill(DEFENCE, 70),
      { kind: "quest", title: "Kili Row" },
      {
        kind: "manual",
        id: "hermodic-plates",
        label: "Hermodic plates (Hermod, the Spirit of War)",
        note: "One plate per piece on top of the standard Deathwarden materials",
      },
      AUG_BODY,
      AUG_LEGS,
      gp("necro-deathdealer-70", 3_200_000),
    ],
  },
  {
    id: "necro-deathdealer-90",
    name: "Deathdealer robe armour (tier 90)",
    tier: "late",
    itemTier: 90,
    slot: "body",
    style: "necromancy",
    source: "craft",
    wiki: "Deathdealer robe armour",
    blurb: "Tier 90 Necromancy power armour for the price of a tier 80 anything else.",
    approxGp: 23_000_000,
    requirements: [
      skill(DEFENCE, 90),
      { kind: "quest", title: "Kili Row" },
      AUG_BODY,
      AUG_LEGS,
      gp("necro-deathdealer-90", 23_000_000),
    ],
  },
  {
    id: "necro-omni-guard",
    name: "Omni guard + soulbound lantern",
    tier: "apex",
    itemTier: 95,
    slot: "mainhand",
    style: "necromancy",
    source: "drop",
    wiki: "Omni guard",
    blurb: "Rasial's T95 dual-wield. Does not degrade, and a Shard of Genesis Essence enchants both to tier 100.",
    approxGp: 680_000_000,
    requirements: [
      skill(NECROMANCY, 95),
      {
        kind: "quest",
        title: "Alpha vs Omega",
        note: "Final First Necromancer quest — unlocks the Rasial encounter",
      },
      AUG_WEAPON,
      gp("necro-omni-guard", 680_000_000),
    ],
  },
  {
    id: "necro-devourers-guard",
    name: "Devourer's Guard",
    tier: "apex",
    itemTier: 95,
    slot: "mainhand",
    style: "necromancy",
    source: "drop",
    wiki: "Devourer's Guard",
    // Tied with the omni guard on stats, but has no off-hand of its own, so you
    // still need a soulbound lantern — and a second Genesis shard to match it.
    blurb: "Amascut's T95 main-hand. Ties the omni guard, but has no off-hand — pair it with a soulbound lantern.",
    approxGp: 280_000_000,
    requirements: [
      skill(NECROMANCY, 95),
      { kind: "quest", title: "Eclipse of the Heart", note: "Required to access the Amascut encounter" },
      AUG_WEAPON,
      gp("necro-devourers-guard", 280_000_000),
    ],
  },
  {
    id: "necro-first-necromancer-robes",
    name: "Robes of the First Necromancer",
    tier: "apex",
    itemTier: 95,
    slot: "body",
    style: "necromancy",
    source: "drop",
    wiki: "First Necromancer's equipment",
    blurb: "T95 Necromancy power robes from Rasial. The one Necromancy set with no craft-it-first rule.",
    approxGp: 377_000_000,
    requirements: [
      skill(NECROMANCY, 95),
      skill(DEFENCE, 95),
      { kind: "quest", title: "Alpha vs Omega" },
      AUG_BODY,
      AUG_LEGS,
      gp("necro-first-necromancer-robes", 377_000_000),
    ],
  },

  // =========================================================================
  // UTILITY — style-agnostic slots
  //
  // These have no printed item tier, so `itemTier` here is the progression band
  // they belong to rather than a game stat: it exists so utility upgrades sort
  // sensibly against weapons and armour in the same rail.
  //
  // There are deliberately no `aura` entries. The 2026 Aura Overhaul (13 April
  // 2026) removed the aura slot from the worn-equipment interface entirely and
  // folded the surviving effects into spells and level-based unlocks. The slot
  // is kept in the union so old saved loadouts still type-check.
  // =========================================================================
  {
    id: "util-cinderbane-gloves",
    name: "Cinderbane gloves",
    tier: "mid",
    itemTier: 85,
    slot: "hands",
    style: "any",
    source: "drop",
    wiki: "Cinderbane gloves",
    blurb: "Hybrid gloves that apply weapon poison on hit. Best-in-slot for every style against anything poisonable.",
    approxGp: 44_000_000,
    requirements: [skill(DEFENCE, 85), gp("util-cinderbane-gloves", 44_000_000)],
  },
  {
    id: "util-amulet-of-souls",
    name: "Amulet of souls",
    tier: "late",
    itemTier: 90,
    slot: "neck",
    style: "any",
    source: "drop",
    wiki: "Amulet of souls",
    blurb: "Araxxi's amulet. Boosts Soul Split healing — the sustain neck slot before Essence of Finality.",
    approxGp: 36_000_000,
    requirements: [gp("util-amulet-of-souls", 36_000_000)],
  },
  {
    id: "util-ring-of-death",
    name: "Ring of death",
    tier: "late",
    itemTier: 90,
    slot: "ring",
    style: "any",
    source: "drop",
    wiki: "Ring of death",
    blurb: "Adrenaline on kill, and a death-save charge. Standard PvM ring at every tier above it.",
    approxGp: 38_000_000,
    requirements: [gp("util-ring-of-death", 38_000_000)],
  },
  {
    id: "util-essence-of-finality",
    name: "Essence of Finality amulet",
    tier: "apex",
    itemTier: 95,
    slot: "neck",
    style: "any",
    source: "craft",
    wiki: "Essence of Finality amulet",
    // Untradeable once assembled, so no approxGp — the cost lives in the three
    // tradeable inputs, which is what the manual requirement points at.
    blurb: "Amulet of souls + Reaper necklace + alchemical hydrix. Keeps Soul Split healing and stores a weapon special.",
    requirements: [
      skill(CRAFTING, 99, "Boostable"),
      { kind: "manual", id: "eof-amulet-of-souls", label: "Amulet of souls in hand" },
      { kind: "manual", id: "eof-reaper-necklace", label: "Reaper necklace (Soul Reaper points)" },
      gp("util-essence-of-finality", 119_000_000),
    ],
  },
  {
    id: "util-erethdors-grimoire",
    name: "Erethdor's grimoire",
    tier: "end",
    itemTier: 92,
    slot: "pocket",
    style: "any",
    source: "drop",
    wiki: "Erethdor's grimoire",
    blurb: "Solak's pocket book. Illuminated god book stats without owning a god book, plus an off-hand override.",
    approxGp: 103_000_000,
    requirements: [gp("util-erethdors-grimoire", 103_000_000)],
  },
  {
    id: "util-scripture-of-jas",
    name: "Scripture of Jas",
    tier: "end",
    itemTier: 92,
    slot: "pocket",
    style: "any",
    source: "drop",
    wiki: "Scripture of Jas",
    // Cheapest of the four scriptures by an order of magnitude, so it is the
    // one people actually start with even though it is not the strongest.
    blurb: "Kerapac's god book. The entry scripture — under 2M and it stacks damage the longer you stand and fight.",
    approxGp: 1_900_000,
    requirements: [gp("util-scripture-of-jas", 1_900_000)],
  },
  {
    id: "util-scripture-of-wen",
    name: "Scripture of Wen",
    tier: "end",
    itemTier: 92,
    slot: "pocket",
    style: "any",
    source: "drop",
    wiki: "Scripture of Wen",
    blurb: "Arch-Glacor's god book. Recharged with manuscripts, so it costs upkeep as well as purchase.",
    approxGp: 7_000_000,
    requirements: [gp("util-scripture-of-wen", 7_000_000)],
  },
  {
    id: "util-scripture-of-ful",
    name: "Scripture of Ful",
    tier: "apex",
    itemTier: 95,
    slot: "pocket",
    style: "any",
    source: "drop",
    wiki: "Scripture of Ful",
    blurb: "TzKal-Zuk's god book. The damage scripture, and priced accordingly.",
    approxGp: 93_000_000,
    requirements: [gp("util-scripture-of-ful", 93_000_000)],
  },
  {
    id: "util-scripture-of-bik",
    name: "Scripture of Bik",
    tier: "apex",
    itemTier: 95,
    slot: "pocket",
    style: "any",
    source: "drop",
    wiki: "Scripture of Bik",
    blurb: "Croesus's god book. Activates like a scrimshaw for skilling rather than combat.",
    approxGp: 89_000_000,
    requirements: [gp("util-scripture-of-bik", 89_000_000)],
  },
  {
    id: "util-max-cape",
    name: "Max cape",
    tier: "late",
    itemTier: 85,
    slot: "cape",
    style: "any",
    source: "shop",
    wiki: "Max cape",
    // 2,871 is 99 in all 29 skills — the requirement is per-skill, but total
    // level is the only form the API exposes, so that is what we test.
    blurb: "Level 99 in every skill. Total level 2,871 exactly, and 2.87M from Max in Varrock.",
    approxGp: 2_871_000,
    requirements: [
      { kind: "stat", stat: "totalLevel", value: 2871, note: "99 in all 29 skills" },
      gp("util-max-cape", 2_871_000),
    ],
  },
  {
    id: "util-igneous-kal-zuk",
    name: "Igneous Kal-Zuk",
    tier: "apex",
    itemTier: 95,
    slot: "cape",
    style: "any",
    source: "craft",
    wiki: "Igneous Kal-Zuk",
    blurb: "All four igneous capes fused. Strongest combat cape in the game and untradeable end to end.",
    requirements: [
      skill(CRAFTING, 90, "Boostable, but the cape itself cannot be assisted"),
      {
        kind: "manual",
        id: "achievement-excuse-me-thats-my-seat",
        label: "Excuse Me, That's My Seat (flawless hard mode TzKal-Zuk)",
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

/**
 * Everything relevant to one style, including the style-agnostic utility slots.
 * Called with "any" it returns just the utility entries.
 */
export function gearForStyle(style: GearStyle): GearEntry[] {
  if (style === "any") return GEAR_TIERS.filter((g) => g.style === "any");
  return GEAR_TIERS.filter((g) => g.style === style || g.style === "any");
}

/**
 * The next 3-5 things worth buying for a style, closest gap first.
 *
 * Deliberately caps at one suggestion per slot: telling somebody to buy both
 * T92 and T95 boots in the same breath is noise, because they only ever wear
 * the next rung up. Ties break toward the lower item tier so the list reads as
 * a ladder rather than a shopping spree.
 */
export function upgradePath(style: GearStyle, ctx: EvalContext): GearEntry[] {
  const ranked: { item: GearEntry; gate: GateResult }[] = rankByProximity(gearForStyle(style), ctx);

  const bySlot = new Map<GearSlot, { item: GearEntry; gate: GateResult }>();
  for (const row of ranked) {
    const held = bySlot.get(row.item.slot);
    if (!held) {
      bySlot.set(row.item.slot, row);
      continue;
    }
    // rankByProximity is already closest-first, so only equal-proximity entries
    // can displace an incumbent, and then only by being a cheaper rung.
    if (row.gate.pct === held.gate.pct && row.item.itemTier < held.item.itemTier) {
      bySlot.set(row.item.slot, row);
    }
  }

  return [...bySlot.values()]
    .sort((a, b) => b.gate.pct - a.gate.pct || a.item.itemTier - b.item.itemTier)
    .slice(0, 5)
    .map((r) => r.item);
}

/** Every entry at a given RS3 item tier, across all styles. */
export function gearAtTier(itemTier: number): GearEntry[] {
  return GEAR_TIERS.filter((g) => g.itemTier === itemTier);
}

// ---------------------------------------------------------------------------
// Invention perks
// ---------------------------------------------------------------------------

export type GizmoType = "weapon" | "armour" | "ancient weapon" | "ancient armour";

export interface PerkTarget {
  id: string;
  name: string;
  gizmo: GizmoType;
  /** Styles that want this. ["any"] means all four converge on it. */
  styles: GearStyle[];
  /** Material loadout, in gizmo slot order. */
  components: string;
  /**
   * Invention level to be AT when you build it — not a minimum. Perk rolls are
   * weighted by level, so a *higher* level can push you past the rank you want.
   */
  inventionLevel: number;
  /**
   * Rough odds of hitting the named rank with this loadout. Omitted where the
   * exact material split varies by what you have banked and no single figure
   * would be honest.
   */
  successPct?: number;
  why: string;
  wiki: string;
}

/** Perk combos relevant to one combat style, including the universal ones. */
export function perksForStyle(style: GearStyle): PerkTarget[] {
  return PERK_TARGETS.filter((p) => p.styles.includes(style) || p.styles.includes("any"));
}

/**
 * Every combo below is an ancient gizmo, which needs the 'Ancient gizmos'
 * blueprint: made at 95 Archaeology in Howl's Floating Workshop, then studied
 * at 85 Invention (boostable down to 68). Until that is unlocked, none of this
 * is reachable and the regular-gizmo equivalents sit one or two ranks lower.
 *
 * The 2026 mid-game rebalance removed negative perks, so the old "eat a bad
 * second perk to guarantee the good one" loadouts no longer apply.
 */
export const PERK_TARGETS: PerkTarget[] = [
  {
    id: "perk-precise-6",
    name: "Precise 6",
    gizmo: "ancient weapon",
    styles: ["any"],
    components: "9x Historic components",
    inventionLevel: 120,
    successPct: 33.3,
    why: "Raises the minimum hit of almost every ability by 9% of its maximum. The single largest flat DPS perk, and rank 6 only exists in an ancient gizmo.",
    wiki: "Precise",
  },
  {
    id: "perk-eruptive-4",
    name: "Eruptive 4",
    gizmo: "ancient weapon",
    styles: ["any"],
    components: "8x Timeworn components",
    inventionLevel: 120,
    successPct: 98.2,
    why: "The standard partner to Precise 6, and near-guaranteed with this loadout. Goes on the off-hand so the main hand can carry Precise.",
    wiki: "Eruptive",
  },
  {
    id: "perk-flanking-4",
    name: "Flanking 4",
    gizmo: "ancient weapon",
    styles: ["any"],
    components: "9x Clockwork components",
    // Clockwork is a common material and the roll is best well below 120, so
    // this is the one high-value perk a mid-game account can actually land.
    inventionLevel: 52,
    successPct: 81.6,
    why: "Cheap components and best odds at Invention 52, not 120. Lives on a dedicated switch weapon used only for flanking abilities.",
    wiki: "Flanking",
  },
  {
    id: "perk-aftershock-4",
    name: "Aftershock 4",
    gizmo: "ancient weapon",
    styles: ["any"],
    components: "Ilujankan components",
    inventionLevel: 120,
    why: "Explodes for area damage after 50,000 accumulated damage. Ilujankan components are the bottleneck, so this is an advanced-setup target you save for after Precise and Eruptive.",
    wiki: "Aftershock",
  },
  {
    id: "perk-planted-feet",
    name: "Planted Feet",
    gizmo: "ancient weapon",
    styles: ["ranged", "magic"],
    components: "Cywir components",
    inventionLevel: 120,
    why: "Extends Death's Swiftness and Sunshine by 25%. Goes on a switch weapon you equip only to cast the ultimate, then swap off. Ranged and Magic only — melee has no equivalent ultimate.",
    wiki: "Planted Feet",
  },
  {
    id: "perk-relentless-5",
    name: "Relentless 5",
    gizmo: "ancient weapon",
    styles: ["ranged", "magic"],
    components: "8x Vintage components",
    inventionLevel: 120,
    why: "Adrenaline refund on ultimates. Paired with Planted Feet on the same Sunshine / Death's Swiftness switch so the ultimate costs less to re-enter.",
    wiki: "Relentless",
  },
  {
    id: "perk-crackling-4-relentless-3",
    name: "Crackling 4 + Relentless 3",
    gizmo: "ancient armour",
    styles: ["any"],
    components: "4x Vintage + 3x Explosive components",
    inventionLevel: 120,
    successPct: 32.0,
    why: "The default body-slot gizmo. Crackling ticks free damage every 60 seconds in the style you are using, so it works on all four.",
    wiki: "Crackling",
  },
  {
    id: "perk-biting-3",
    name: "Biting 3",
    gizmo: "ancient armour",
    styles: ["any"],
    components: "9x Direct components",
    // Counter-intuitive: rolling this at 120 pushes toward ranks you cannot
    // reach and wastes the materials. Drop to 68 with a Gorak or the GWD ice.
    inventionLevel: 68,
    successPct: 4.9,
    why: "+6% critical strike chance. Best odds at Invention 68 — going in at 120 makes it *less* likely, so drain your level first.",
    wiki: "Biting",
  },
  {
    id: "perk-impatient-4",
    name: "Impatient 4",
    gizmo: "ancient armour",
    styles: ["any"],
    components: "7x Zaros components",
    inventionLevel: 58,
    successPct: 89.9,
    why: "Adrenaline on basic-ability hits. Cheap, near-certain at Invention 58, and it goes on the legs where Enhanced Devoted joins it.",
    wiki: "Impatient",
  },
  {
    id: "perk-enhanced-devoted-4",
    name: "Enhanced Devoted 4",
    gizmo: "ancient armour",
    styles: ["any"],
    components: "7x Faceted + 1x Strong components",
    inventionLevel: 120,
    successPct: 71.3,
    why: "Chance to negate incoming damage while a defensive is active. The survivability perk that lets you stay in melee range of anything.",
    wiki: "Enhanced devoted",
  },
];
