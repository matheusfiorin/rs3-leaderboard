/* =============================================
   RS3 Leaderboard — Combat Section
   Revolution bars, gear recommendations
   Post-Combat Style Modernisation (March 2026)
   ============================================= */

// Wiki ability icon URL pattern
const WIKI_IMG = (name) => `https://runescape.wiki/w/Special:FilePath/${name.replace(/ /g, '_')}.png`;
const WIKI_LINK = (name) => `https://runescape.wiki/w/${name.replace(/ /g, '_')}`;

// ---- Ability Database (post-March 2026 Combat Modernisation) ----
// Abilities listed with unlock level, whether they're basics/enhanced/ultimates
const ABILITIES = {
  // MELEE (post-March 2026: all require Attack level only, Strength book removed)
  melee: {
    attack_basic:   { name:'Attack',          lvl:1,  type:'basic',    desc:'110-130% damage. Basic melee attack.', icon:'Slice' },
    assault:        { name:'Assault',         lvl:3,  type:'enhanced', desc:'4 hits of 130-150%. Consumes Bloodlust for healing.', icon:'Assault' },
    adaptive_str:   { name:'Adaptive Strike', lvl:7,  type:'basic',    desc:'2H: AoE up to 9 targets. DW: single + bleed.', icon:'Smash' },
    rend:           { name:'Rend',            lvl:18, type:'basic',    desc:'135-165% damage. Generates 2 Bloodlust stacks.', icon:'Sever' },
    fury:           { name:'Fury',            lvl:21, type:'basic',    desc:'110-130% + 25% crit chance on next attack.', icon:'Fury' },
    hurricane:      { name:'Hurricane',       lvl:37, type:'enhanced', desc:'AoE 220-260%. Resets CD on multi-hit. 2H only.', icon:'Hurricane' },
    dismember:      { name:'Dismember',       lvl:50, type:'enhanced', desc:'Bleed: 8 hits. Replaces Slaughter/Massacre.', icon:'Dismember' },
    punish:         { name:'Punish',          lvl:60, type:'basic',    desc:'110-130%. 2.5x damage on targets below 50% HP.', icon:'Punish' },
    berserk:        { name:'Berserk',         lvl:42, type:'ultimate', desc:'Double damage for 20s. Costs 100%.', icon:'Berserk' },
  },
  // RANGED (post-March 2026: fixed impact timings, new Galeshot/Imbue)
  ranged: {
    ranged_basic:   { name:'Ranged',          lvl:1,  type:'basic',    desc:'90-110% damage. Basic ranged attack.', icon:'Piercing_Shot' },
    snap:           { name:'Snap Shot',       lvl:3,  type:'enhanced', desc:'145-175% x2 hits. 25% adrenaline.', icon:'Snap_Shot' },
    snipe:          { name:'Snipe',           lvl:5,  type:'enhanced', desc:'300-360% single hit. 1min CD.', icon:'Snipe' },
    piercing:       { name:'Piercing Shot',   lvl:13, type:'basic',    desc:'45-55% x2 hits. Reduces Snipe CD.', icon:'Needle_Strike' },
    deadshot:       { name:'Deadshot',        lvl:21, type:'ultimate', desc:'125-145% x5 hits.', icon:'Deadshot' },
    binding:        { name:'Binding Shot',    lvl:31, type:'basic',    desc:'65-75% + stun/bind for 3.6s.', icon:'Binding_Shot' },
    bombardment:    { name:'Bombardment',     lvl:36, type:'enhanced', desc:'AoE 220-260% in 5x5 area.', icon:'Bombardment' },
    galeshot:       { name:'Galeshot',        lvl:58, type:'basic',    desc:'Applies Searing Winds buff.', icon:'Dazing_Shot' },
    rapid:          { name:'Rapid Fire',      lvl:62, type:'enhanced', desc:'Channel: 8 hits of 75-85%.', icon:'Rapid_Fire' },
    ricochet:       { name:'Ricochet',        lvl:67, type:'basic',    desc:'AoE: bounces to nearby targets. Includes Greater effect.', icon:'Ricochet' },
  },
  // MAGIC (post-March 2026: Runic Charge mechanic, rune consumption chance)
  magic: {
    magic_basic:    { name:'Magic',           lvl:1,  type:'basic',    desc:'90-110% damage. Basic magic attack.', icon:'Wrack' },
    sonic:          { name:'Sonic Wave',      lvl:6,  type:'basic',    desc:'90-110%. Grants Flow (reduces next ability cost).', icon:'Sonic_Wave' },
    combust:        { name:'Combust',         lvl:10, type:'basic',    desc:'Burn DoT: 10 hits of ~30% = 300% total.', icon:'Combust' },
    omnipower:      { name:'Omnipower',       lvl:12, type:'ultimate', desc:'420-500% damage.', icon:'Omnipower' },
    dragon_breath:  { name:'Dragon Breath',   lvl:19, type:'basic',    desc:'AoE 110-130% line. +25% vs burning targets.', icon:'Dragon_Breath' },
    runic_charge:   { name:'Runic Charge',    lvl:26, type:'basic',    desc:'Empowers next Sonic/Dragon Breath. No GCD.', icon:'Surge' },
    impact:         { name:'Impact',          lvl:40, type:'basic',    desc:'65-75% + stun 1.2s.', icon:'Impact' },
    chain:          { name:'Chain',           lvl:45, type:'basic',    desc:'AoE: 70-90% + 2 nearby. Shares 30% of next ability.', icon:'Chain' },
    wild_magic:     { name:'Wild Magic',      lvl:55, type:'enhanced', desc:'125-155% x2 hits. 25% adrenaline.', icon:'Wild_Magic' },
    conc_blast:     { name:'Concentrated Blast', lvl:66, type:'basic', desc:'35% x3 channel. Stacking crit chance.', icon:'Concentrated_Blast' },
    sunshine:       { name:'Sunshine',        lvl:50, type:'ultimate', desc:'+50% damage for 30s.', icon:'Sunshine' },
  },
  // NECROMANCY
  necro: {
    touch_of_death: { name:'Touch of Death',  lvl:1,  type:'basic',    desc:'Deal 30-120%, generates necrosis stacks', icon:'Touch_of_Death' },
    soul_sap:       { name:'Soul Sap',        lvl:5,  type:'basic',    desc:'Deal 22.8-57%, generates residual souls', icon:'Soul_Sap' },
    finger_of_death:{ name:'Finger of Death', lvl:12, type:'enhanced', desc:'Deal 50-250%, consumes necrosis', icon:'Finger_of_Death' },
    blood_siphon:   { name:'Blood Siphon',    lvl:20, type:'basic',    desc:'Deal 36-180%, heal per hit on AoE', icon:'Blood_Siphon' },
    spectral_scythe:{ name:'Spectral Scythe', lvl:10, type:'basic',    desc:'AoE in frontal cone, 3 recasts', icon:'Spectral_Scythe' },
    volley_of_souls:{ name:'Volley of Souls', lvl:30, type:'enhanced', desc:'4 hits, consumes residual souls', icon:'Volley_of_Souls' },
    death_skulls:   { name:'Death Skulls',    lvl:40, type:'enhanced', desc:'Bouncing 4 hits of 45-135%', icon:'Death_Skulls' },
    bloat:          { name:'Bloat',           lvl:24, type:'basic',    desc:'Bleed: 4 hits over 6s', icon:'Bloat' },
    command_skel:   { name:'Command Skeleton', lvl:32, type:'basic',   desc:'Summon skeleton for extra hits', icon:'Command_Skeleton_Warrior' },
    living_death:   { name:'Living Death',    lvl:50, type:'ultimate', desc:'Free Finger of Death for 30s', icon:'Living_Death' },
  },
};

// ---- Revolution Bar Templates per level range ----
function getBarsForStyle(style, level) {
  const abs = ABILITIES[style];
  if (!abs) return { single: [], aoe: [] };

  // Get all abilities the player has unlocked
  const unlocked = Object.values(abs).filter(a => a.lvl <= level);

  // Build recommended bars based on style and level
  switch (style) {
    case 'melee': return getMeleeBars(abs, level);
    case 'ranged': return getRangedBars(abs, level);
    case 'magic': return getMagicBars(abs, level);
    case 'necro': return getNecroBars(abs, level);
    default: return { single: [], aoe: [] };
  }
}

function getMeleeBars(a, lvl) {
  const single = [];
  const aoe = [];

  // Single target: enhanced spenders first, then strong basics
  if (lvl >= 50) single.push(a.dismember);
  if (lvl >= 3)  single.push(a.assault);
  if (lvl >= 21) single.push(a.fury);
  if (lvl >= 18) single.push(a.rend);
  if (lvl >= 7)  single.push(a.adaptive_str);
  single.push(a.attack_basic);
  if (lvl >= 60) single.push(a.punish);

  // AoE: Hurricane + Adaptive Strike (2H hits 9 targets)
  if (lvl >= 37) aoe.push(a.hurricane);
  if (lvl >= 3)  aoe.push(a.assault);
  if (lvl >= 7)  aoe.push(a.adaptive_str);
  if (lvl >= 50) aoe.push(a.dismember);
  if (lvl >= 21) aoe.push(a.fury);
  if (lvl >= 18) aoe.push(a.rend);
  aoe.push(a.attack_basic);

  return { single: single.slice(0, 9), aoe: aoe.slice(0, 9) };
}

function getRangedBars(a, lvl) {
  const single = [];
  const aoe = [];

  // Single: spenders, then Piercing (reduces Snipe CD), then basics
  if (lvl >= 62) single.push(a.rapid);
  if (lvl >= 3)  single.push(a.snap);
  if (lvl >= 5)  single.push(a.snipe);
  if (lvl >= 13) single.push(a.piercing);
  if (lvl >= 58) single.push(a.galeshot);
  if (lvl >= 31) single.push(a.binding);
  single.push(a.ranged_basic);

  // AoE: Bombardment first
  if (lvl >= 36) aoe.push(a.bombardment);
  if (lvl >= 67) aoe.push(a.ricochet);
  if (lvl >= 3)  aoe.push(a.snap);
  if (lvl >= 62) aoe.push(a.rapid);
  if (lvl >= 13) aoe.push(a.piercing);
  if (lvl >= 5)  aoe.push(a.snipe);
  aoe.push(a.ranged_basic);

  return { single: single.slice(0, 9), aoe: aoe.slice(0, 9) };
}

function getMagicBars(a, lvl) {
  const single = [];
  const aoe = [];

  // Single: spenders, Dragon Breath (boosted by Combust), Sonic Wave (Flow)
  if (lvl >= 55) single.push(a.wild_magic);
  if (lvl >= 66) single.push(a.conc_blast);
  if (lvl >= 19) single.push(a.dragon_breath);
  if (lvl >= 6)  single.push(a.sonic);
  if (lvl >= 10) single.push(a.combust);
  single.push(a.magic_basic);
  if (lvl >= 40) single.push(a.impact);
  if (lvl >= 26) single.push(a.runic_charge);

  // AoE: Dragon Breath (line) + Chain (bounces + shares next ability)
  if (lvl >= 19) aoe.push(a.dragon_breath);
  if (lvl >= 45) aoe.push(a.chain);
  if (lvl >= 55) aoe.push(a.wild_magic);
  if (lvl >= 10) aoe.push(a.combust);
  if (lvl >= 6)  aoe.push(a.sonic);
  aoe.push(a.magic_basic);
  if (lvl >= 26) aoe.push(a.runic_charge);

  return { single: single.slice(0, 9), aoe: aoe.slice(0, 9) };
}

function getNecroBars(a, lvl) {
  const single = [];
  const aoe = [];

  if (lvl >= 40) single.push(a.death_skulls);
  if (lvl >= 30) single.push(a.volley_of_souls);
  if (lvl >= 12) single.push(a.finger_of_death);
  if (lvl >= 24) single.push(a.bloat);
  if (lvl >= 20) single.push(a.blood_siphon);
  if (lvl >= 5)  single.push(a.soul_sap);
  single.push(a.touch_of_death);
  if (lvl >= 32) single.push(a.command_skel);

  if (lvl >= 10) aoe.push(a.spectral_scythe);
  if (lvl >= 40) aoe.push(a.death_skulls);
  if (lvl >= 30) aoe.push(a.volley_of_souls);
  if (lvl >= 20) aoe.push(a.blood_siphon);
  if (lvl >= 12) aoe.push(a.finger_of_death);
  if (lvl >= 24) aoe.push(a.bloat);
  if (lvl >= 5)  aoe.push(a.soul_sap);
  aoe.push(a.touch_of_death);

  return { single: single.slice(0, 9), aoe: aoe.slice(0, 9) };
}

// ---- Gear Recommendations ----
const GEAR = {
  melee: [
    { minLvl:1,  weapon:'Bronze sword + shield',    armor:'Bronze armour set',    tier:'T1' },
    { minLvl:10, weapon:'Black sword + shield',      armor:'Black armour set',     tier:'T10' },
    { minLvl:20, weapon:'Mithril 2h sword',          armor:'Mithril armour set',   tier:'T20' },
    { minLvl:30, weapon:'Adamant 2h sword',           armor:'Adamant armour set',   tier:'T30' },
    { minLvl:40, weapon:'Rune 2h sword',              armor:'Rune armour set',      tier:'T40' },
    { minLvl:50, weapon:'Granite maul / Dragon longsword', armor:'Dragon armour / Rockshell', tier:'T50' },
    { minLvl:60, weapon:'Dragon 2h sword',            armor:'Dragon armour set',    tier:'T60' },
    { minLvl:70, weapon:'Abyssal whip + off-hand',   armor:'Bandos armour',        tier:'T70' },
  ],
  ranged: [
    { minLvl:1,  weapon:'Chargebow',                  armor:'Leather armour',       tier:'T1' },
    { minLvl:10, weapon:'Oak shortbow',                armor:'Hard leather',         tier:'T10' },
    { minLvl:20, weapon:'Willow shortbow + steel arrows', armor:'Studded leather',  tier:'T20' },
    { minLvl:30, weapon:'Maple shortbow + mithril arrows', armor:'Snakeskin set', tier:'T30' },
    { minLvl:40, weapon:'Magic shortbow + adamant arrows', armor:'Green d\'hide set', tier:'T40' },
    { minLvl:50, weapon:'Rune crossbow + broad bolts',  armor:'Blue d\'hide set',   tier:'T50' },
    { minLvl:60, weapon:'Elder shortbow / Dragon crossbow', armor:'Black d\'hide / Royal d\'hide', tier:'T60' },
    { minLvl:70, weapon:'Crystal bow / Armadyl crossbow', armor:'Armadyl armour',   tier:'T70' },
  ],
  magic: [
    { minLvl:1,  weapon:'Air staff',                   armor:'Wizard robes',        tier:'T1' },
    { minLvl:10, weapon:'Staff of air',                 armor:'Wizard robes (blue)', tier:'T10' },
    { minLvl:20, weapon:'Bat wand + book',              armor:'Xerician robes',      tier:'T20' },
    { minLvl:30, weapon:'Mystic wand + orb',            armor:'Mystic robes',        tier:'T30' },
    { minLvl:40, weapon:'Mystic staff',                 armor:'Splitbark armour',    tier:'T40' },
    { minLvl:50, weapon:'Grifolic wand + orb',          armor:'Grifolic armour',     tier:'T50' },
    { minLvl:60, weapon:'Staff of light',               armor:'Ganodermic armour',   tier:'T60' },
    { minLvl:70, weapon:'Wand of the Cywir elders',    armor:'Subjugation armour',  tier:'T70' },
  ],
  necro: [
    { minLvl:1,  weapon:'Deathwarden T1 weapons',      armor:'Deathwarden robe set T1', tier:'T1' },
    { minLvl:20, weapon:'Deathwarden T20 weapons',     armor:'Deathwarden robe set T20', tier:'T20' },
    { minLvl:40, weapon:'Deathwarden T40 weapons',     armor:'Deathwarden robe set T40', tier:'T40' },
    { minLvl:60, weapon:'Deathwarden T60 weapons',     armor:'Deathwarden robe set T60', tier:'T60' },
    { minLvl:70, weapon:'Death guard (T70) + Skull lantern (T70)', armor:'Deathwarden robe set T70', tier:'T70' },
  ],
};

function getGearForLevel(style, level) {
  const tiers = GEAR[style] || [];
  let best = tiers[0];
  for (const g of tiers) {
    if (g.minLvl <= level) best = g;
  }
  return best;
}

// ---- Style labels ----
const STYLE_INFO = {
  melee:  { icon:'\u2694\uFE0F', skillIds:[0,2],  color:'#dc2626', label:{pt:'Corpo a Corpo', en:'Melee'} },
  ranged: { icon:'\uD83C\uDFF9', skillIds:[4],    color:'#16a34a', label:{pt:'Combate \u00e0 Dist\u00e2ncia', en:'Ranged'} },
  magic:  { icon:'\u2728',       skillIds:[6],    color:'#2563eb', label:{pt:'Magia', en:'Magic'} },
  necro:  { icon:'\uD83D\uDC80', skillIds:[28],   color:'#a78bfa', label:{pt:'Necromancia', en:'Necromancy'} },
};

// ---- Render Combat Section ----
function renderCombat(players) {
  const el = document.getElementById('combat-grid');
  if (!el) return;

  const lang = currentLang;
  const styles = ['melee', 'ranged', 'magic', 'necro'];

  el.innerHTML = players.map((p, pi) => {
    const cls = pi === 0 ? 'p1' : 'p2';

    return `
      <div class="combat-player-col ${cls}">
        <div class="combat-player-name ${cls}">${esc(p.name)}</div>
        ${styles.map(style => {
          const info = STYLE_INFO[style];
          // Get player's level for this style
          let level = 1;
          for (const sid of info.skillIds) {
            const sk = p.skills[sid];
            if (sk && sk.level > level) level = sk.level;
          }

          const bars = getBarsForStyle(style, level);
          const gear = getGearForLevel(style, level);
          const styleName = info.label[lang] || info.label.en;

          return `
            <div class="combat-style-card" style="--style-color:${info.color}">
              <div class="combat-style-header">
                <span class="combat-style-icon">${info.icon}</span>
                <span class="combat-style-name">${styleName}</span>
                <span class="combat-style-level">Lv. ${level}</span>
              </div>

              <div class="combat-subsection">
                <div class="combat-sub-label">${lang === 'pt' ? 'Single Target' : 'Single Target'}</div>
                <div class="revo-bar">${renderBar(bars.single)}</div>
              </div>

              <div class="combat-subsection">
                <div class="combat-sub-label">AoE</div>
                <div class="revo-bar">${renderBar(bars.aoe)}</div>
              </div>

              <div class="combat-subsection">
                <div class="combat-sub-label">${lang === 'pt' ? 'Equipamento' : 'Gear'} (${gear.tier})</div>
                <div class="combat-gear">
                  <div class="gear-item">
                    <span class="gear-icon">\u2694\uFE0F</span>
                    <span class="gear-text">${gear.weapon}</span>
                  </div>
                  <div class="gear-item">
                    <span class="gear-icon">\uD83D\uDEE1\uFE0F</span>
                    <span class="gear-text">${gear.armor}</span>
                  </div>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }).join('');
}

function renderBar(abilities) {
  return abilities.map((ab, i) => {
    const typeClass = ab.type === 'enhanced' ? 'enhanced' : ab.type === 'ultimate' ? 'ultimate' : 'basic';
    return `
      <div class="revo-slot ${typeClass}" title="${ab.name}\n${ab.desc}">
        <img src="${WIKI_IMG(ab.icon)}" alt="${ab.name}" class="revo-icon" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='grid'">
        <div class="revo-fallback">${ab.name.slice(0, 3)}</div>
        <div class="revo-num">${i + 1}</div>
      </div>
    `;
  }).join('');
}
