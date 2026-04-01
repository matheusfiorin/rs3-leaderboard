/* =============================================
   RS3 Leaderboard — Combat Section
   Revolution bars, gear recommendations
   Post-Combat Style Modernisation (March 2026)
   ============================================= */

// Wiki ability icon URL pattern
const WIKI_IMG = (name) => `https://runescape.wiki/images/${name.replace(/ /g, '_')}.png`;
const WIKI_LINK = (name) => `https://runescape.wiki/w/${name.replace(/ /g, '_')}`;

// ---- Ability Database (post-March 2026 Combat Modernisation) ----
// Abilities listed with unlock level, whether they're basics/enhanced/ultimates
const ABILITIES = {
  // MELEE (all now require Attack level only)
  melee: {
    slice:          { name:'Slice',           lvl:1,  type:'basic',    desc:'Deal 30-120% damage', icon:'Slice' },
    punish:         { name:'Punish',          lvl:5,  type:'basic',    desc:'Deal 31.2-156% damage. Reduced cooldown on kill.', icon:'Punish' },
    dismember:      { name:'Dismember',       lvl:14, type:'basic',    desc:'Bleed: 5 hits of 20-100% over 6s', icon:'Dismember' },
    backhand:       { name:'Backhand',        lvl:15, type:'basic',    desc:'Deal 30-120% damage. Stuns for 1.2s.', icon:'Backhand' },
    adaptive_str:   { name:'Adaptive Strike',  lvl:20, type:'basic',   desc:'2H: 45-135%. DW: 30-120% + bleed', icon:'Smash' },
    fury:           { name:'Fury',            lvl:24, type:'basic',    desc:'3 hits, generates Bloodlust', icon:'Fury' },
    sever:          { name:'Sever',           lvl:30, type:'basic',    desc:'Deal 37.6-188% damage', icon:'Sever' },
    flurry:         { name:'Flurry',          lvl:37, type:'enhanced', desc:'4 hits, heals per hit. Costs 20% adren.', icon:'Flurry' },
    assault:        { name:'Assault',         lvl:55, type:'enhanced', desc:'4 hits of 43.8-175%. Consumes Bloodlust.', icon:'Assault' },
    hurricane:      { name:'Hurricane',       lvl:45, type:'enhanced', desc:'AoE 66-219%. Resets CD on multi-hit.', icon:'Hurricane' },
    berserk:        { name:'Berserk',         lvl:42, type:'ultimate', desc:'Double damage for 20s. Costs 100%.', icon:'Berserk' },
    cleave:         { name:'Cleave',          lvl:10, type:'basic',    desc:'AoE 37.6-188% (2H only)', icon:'Cleave' },
  },
  // RANGED
  ranged: {
    piercing:       { name:'Piercing Shot',   lvl:1,  type:'basic',    desc:'Deal 30-120% damage', icon:'Piercing_Shot' },
    needle:         { name:'Needle Strike',   lvl:5,  type:'basic',    desc:'Deal 31.2-156% damage', icon:'Needle_Strike' },
    binding:        { name:'Binding Shot',    lvl:15, type:'basic',    desc:'Deal 30-120%, binds for 3.6s', icon:'Binding_Shot' },
    snipe:          { name:'Snipe',           lvl:20, type:'basic',    desc:'Charge 1.8s, deal 39-195% damage', icon:'Snipe' },
    ricochet:       { name:'Ricochet',        lvl:10, type:'basic',    desc:'AoE: hits up to 3 targets', icon:'Ricochet' },
    dazing:         { name:'Dazing Shot',     lvl:8,  type:'basic',    desc:'Deal 31.4-157%', icon:'Dazing_Shot' },
    frag:           { name:'Fragmentation Shot', lvl:14, type:'basic', desc:'Bleed: 5 hits over 6s', icon:'Fragmentation_Shot' },
    snap:           { name:'Snap Shot',       lvl:40, type:'enhanced', desc:'2 hits of 50-140%', icon:'Snap_Shot' },
    rapid:          { name:'Rapid Fire',      lvl:37, type:'enhanced', desc:'8 hits in 5.4s', icon:'Rapid_Fire' },
    bombardment:    { name:'Bombardment',     lvl:30, type:'enhanced', desc:'AoE 43.8-219%', icon:'Bombardment' },
    deadshot:       { name:'Deadshot',        lvl:55, type:'ultimate', desc:'Big hit + bleed', icon:'Deadshot' },
    death_swiftness:{ name:'Death\'s Swiftness', lvl:50, type:'ultimate', desc:'+50% damage for 30s', icon:'Death%27s_Swiftness' },
  },
  // MAGIC
  magic: {
    wrack:          { name:'Wrack',           lvl:1,  type:'basic',    desc:'Deal 30-120% damage', icon:'Wrack' },
    sonic:          { name:'Sonic Wave',      lvl:5,  type:'basic',    desc:'Deal 31.2-156%, reduces next ability cost', icon:'Sonic_Wave' },
    impact:         { name:'Impact',          lvl:15, type:'basic',    desc:'Deal 30-120%, stuns 1.2s', icon:'Impact' },
    dragon_breath:  { name:'Dragon Breath',   lvl:20, type:'basic',    desc:'AoE 37.6-188% in a line', icon:'Dragon_Breath' },
    combust:        { name:'Combust',         lvl:14, type:'basic',    desc:'Bleed: 5 hits over 6s', icon:'Combust' },
    chain:          { name:'Chain',           lvl:10, type:'basic',    desc:'AoE: hits up to 3 targets', icon:'Chain' },
    wild_magic:     { name:'Wild Magic',      lvl:40, type:'enhanced', desc:'2 hits of 50-140%', icon:'Wild_Magic' },
    asphyxiate:     { name:'Asphyxiate',      lvl:37, type:'enhanced', desc:'4 hits, stuns', icon:'Asphyxiate' },
    detonate:       { name:'Detonate',        lvl:45, type:'enhanced', desc:'Charge AoE, up to 219%', icon:'Detonate' },
    sunshine:       { name:'Sunshine',        lvl:50, type:'ultimate', desc:'+50% damage for 30s', icon:'Sunshine' },
    omnipower:      { name:'Omnipower',       lvl:55, type:'ultimate', desc:'3 hits of 60-300%', icon:'Omnipower' },
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

  // Single target priority
  if (lvl >= 55) single.push(a.assault);
  if (lvl >= 37) single.push(a.flurry);
  if (lvl >= 30) single.push(a.sever);
  if (lvl >= 24) single.push(a.fury);
  if (lvl >= 14) single.push(a.dismember);
  if (lvl >= 5)  single.push(a.punish);
  single.push(a.slice);
  if (lvl >= 15) single.push(a.backhand);
  if (lvl >= 20) single.push(a.adaptive_str);

  // AoE priority
  if (lvl >= 45) aoe.push(a.hurricane);
  if (lvl >= 55) aoe.push(a.assault);
  if (lvl >= 10) aoe.push(a.cleave);
  if (lvl >= 37) aoe.push(a.flurry);
  if (lvl >= 14) aoe.push(a.dismember);
  if (lvl >= 30) aoe.push(a.sever);
  if (lvl >= 24) aoe.push(a.fury);
  if (lvl >= 5)  aoe.push(a.punish);
  aoe.push(a.slice);

  return { single: single.slice(0, 9), aoe: aoe.slice(0, 9) };
}

function getRangedBars(a, lvl) {
  const single = [];
  const aoe = [];

  if (lvl >= 40) single.push(a.snap);
  if (lvl >= 37) single.push(a.rapid);
  if (lvl >= 20) single.push(a.snipe);
  if (lvl >= 14) single.push(a.frag);
  if (lvl >= 5)  single.push(a.needle);
  single.push(a.piercing);
  if (lvl >= 8)  single.push(a.dazing);
  if (lvl >= 15) single.push(a.binding);

  if (lvl >= 30) aoe.push(a.bombardment);
  if (lvl >= 40) aoe.push(a.snap);
  if (lvl >= 10) aoe.push(a.ricochet);
  if (lvl >= 37) aoe.push(a.rapid);
  if (lvl >= 14) aoe.push(a.frag);
  if (lvl >= 20) aoe.push(a.snipe);
  if (lvl >= 5)  aoe.push(a.needle);
  aoe.push(a.piercing);

  return { single: single.slice(0, 9), aoe: aoe.slice(0, 9) };
}

function getMagicBars(a, lvl) {
  const single = [];
  const aoe = [];

  if (lvl >= 40) single.push(a.wild_magic);
  if (lvl >= 37) single.push(a.asphyxiate);
  if (lvl >= 20) single.push(a.dragon_breath);
  if (lvl >= 14) single.push(a.combust);
  if (lvl >= 5)  single.push(a.sonic);
  single.push(a.wrack);
  if (lvl >= 15) single.push(a.impact);
  if (lvl >= 10) single.push(a.chain);

  if (lvl >= 45) aoe.push(a.detonate);
  if (lvl >= 40) aoe.push(a.wild_magic);
  if (lvl >= 20) aoe.push(a.dragon_breath);
  if (lvl >= 10) aoe.push(a.chain);
  if (lvl >= 37) aoe.push(a.asphyxiate);
  if (lvl >= 14) aoe.push(a.combust);
  if (lvl >= 5)  aoe.push(a.sonic);
  aoe.push(a.wrack);

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
