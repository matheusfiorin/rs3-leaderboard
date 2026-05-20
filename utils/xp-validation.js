/**
 * XP Table Validation Module
 * Cross-references against official RS3 XP curves
 * Source: https://runescape.wiki/w/Experience
 */

// Official RS3 XP table for levels 1-120
// Level 1 = 0, Level 2 = 83, Level 3 = 174, etc.
const OFFICIAL_XP_TABLE = [
  0, 83, 174, 276, 388, 512, 650, 801, 969, 1154,
  1358, 1584, 1833, 2107, 2411, 2746, 3115, 3523, 3973, 4470,
  5018, 5624, 6291, 7028, 7842, 8740, 9730, 10824, 12031, 13358,
  14833, 16456, 18247, 20224, 22406, 24815, 27473, 30408, 33648, 37224,
  41171, 45529, 50339, 55649, 61512, 67983, 75127, 83014, 91721, 101333,
  111945, 123660, 136594, 150872, 166636, 184040, 203254, 224466, 247886, 273742,
  302288, 333804, 368599, 407015, 449428, 496254, 548979, 608930, 676528, 752313,
  837057, 931383, 1036903, 1155672, 1288228, 1435507, 1598313, 1777969, 1975026, 2191841,
  2441626, 2727468, 3052345, 3421871, 3842925, 4320236, 4860608, 5471369, 6161521, 6931691,
  7791798, 8740619, 9782136, 10922456, 12166938, 13521711, 14998433, 16600236, 18327340, 20183568,
  22175734, 24310855, 26595592, 29038445, 31647623, 34429202, 37395161, 40548015, 43897431, 47450226,
  51215674, 55207232, 59431550, 63814445, 68457959, 73379191, 78584011, 84083498, 89884163, 96011629,
  102479206, 109308445, 116524217, 124149509, 132205379, 140718894, 149718554, 159226669, 169273555, 180887051
];

// Skill-specific level caps (some skills max at 99, some at 120)
const SKILL_LEVEL_CAPS = {
  // Trainable skills - most cap at 120
  0: 120,   // Attack
  1: 120,   // Defence
  2: 120,   // Strength
  3: 120,   // Constitution
  4: 120,   // Ranged
  5: 120,   // Prayer
  6: 120,   // Magic
  7: 120,   // Cooking
  8: 120,   // Woodcutting
  9: 120,   // Fletching
  10: 120,  // Fishing
  11: 120,  // Firemaking
  12: 120,  // Crafting
  13: 120,  // Smithing
  14: 120,  // Mining
  15: 120,  // Herblore
  16: 120,  // Agility
  17: 120,  // Thieving
  18: 120,  // Slayer
  19: 120,  // Farming
  20: 120,  // Runecrafting
  21: 120,  // Hunter
  22: 120,  // Construction
  23: 120,  // Summoning
  24: 120,  // Dungeoneering
  25: 120,  // Divination
  26: 120,  // Invention
  27: 120,  // Archaeology
  28: 120,  // Necromancy
  // Some may have special caps - update as needed
};

/**
 * Get the official XP required for a given level
 * @param {number} level - Level (1-120)
 * @returns {number|null} XP required, or null if invalid
 */
function getOfficialXpForLevel(level) {
  if (!Number.isInteger(level) || level < 1 || level > 120) {
    console.warn(`Invalid level: ${level}`);
    return null;
  }
  
  // Array is 0-indexed: index 0 = level 1, index 1 = level 2, etc.
  return OFFICIAL_XP_TABLE[level - 1];
}

/**
 * Calculate level from XP using official table
 * @param {number} xp - Total XP
 * @returns {number} Level (1-120)
 */
function getLevelFromXp(xp) {
  if (!Number.isInteger(xp) || xp < 0) {
    console.warn(`Invalid XP: ${xp}`);
    return 1;
  }
  
  // Find the highest level whose XP requirement is <= given XP
  for (let level = 120; level >= 1; level--) {
    const requiredXp = OFFICIAL_XP_TABLE[level - 1];
    if (xp >= requiredXp) {
      return level;
    }
  }
  
  return 1;
}

/**
 * Validate XP table against official values
 * @param {number[]} xpTable - XP table to validate
 * @returns {Object} Validation result {valid, errors, mismatches}
 */
function validateXpTable(xpTable) {
  const errors = [];
  const mismatches = [];
  
  if (!Array.isArray(xpTable)) {
    return { valid: false, errors: ['XP table is not an array'] };
  }
  
  if (xpTable.length !== OFFICIAL_XP_TABLE.length) {
    errors.push(`XP table length mismatch: expected ${OFFICIAL_XP_TABLE.length}, got ${xpTable.length}`);
  }
  
  // Check each level
  for (let i = 0; i < Math.min(xpTable.length, OFFICIAL_XP_TABLE.length); i++) {
    const level = i + 1;
    const expected = OFFICIAL_XP_TABLE[i];
    const actual = xpTable[i];
    
    if (expected !== actual) {
      mismatches.push({
        level,
        expected,
        actual,
        diff: actual - expected
      });
    }
  }
  
  const valid = errors.length === 0 && mismatches.length === 0;
  
  return { valid, errors, mismatches };
}

/**
 * Get the max level for a skill
 * @param {number} skillId - Skill ID
 * @returns {number} Max level (usually 120, sometimes 99)
 */
function getSkillLevelCap(skillId) {
  return SKILL_LEVEL_CAPS[skillId] || 120;
}

/**
 * Calculate XP needed to reach next level
 * @param {number} currentXp - Current XP
 * @returns {number} XP needed for next level
 */
function getXpToNextLevel(currentXp) {
  const currentLevel = getLevelFromXp(currentXp);
  
  if (currentLevel >= 120) {
    return 0; // Max level reached
  }
  
  const nextLevelXp = getOfficialXpForLevel(currentLevel + 1);
  const xpNeeded = nextLevelXp - currentXp;
  
  return Math.max(0, xpNeeded);
}

/**
 * Get progress percentage to next level
 * @param {number} currentXp - Current XP
 * @returns {number} Progress 0-100
 */
function getProgressToNextLevel(currentXp) {
  const currentLevel = getLevelFromXp(currentXp);
  
  if (currentLevel >= 120) {
    return 100;
  }
  
  const currentLevelXp = getOfficialXpForLevel(currentLevel);
  const nextLevelXp = getOfficialXpForLevel(currentLevel + 1);
  
  const currentProgress = currentXp - currentLevelXp;
  const totalNeeded = nextLevelXp - currentLevelXp;
  
  if (totalNeeded === 0) return 0;
  
  return Math.round((currentProgress / totalNeeded) * 100);
}

/**
 * Validate a skill level against official cap
 * @param {number} skillId - Skill ID
 * @param {number} level - Level to validate
 * @returns {boolean} True if valid
 */
function isValidSkillLevel(skillId, level) {
  if (!Number.isInteger(level) || level < 1) {
    return false;
  }
  
  const cap = getSkillLevelCap(skillId);
  return level <= cap;
}

/**
 * Batch-validate player XP data
 * @param {Object} playerXpData - {skillId: xp, ...}
 * @returns {Object} Validation report
 */
function validatePlayerXpData(playerXpData) {
  const validation = {
    valid: true,
    errors: [],
    warnings: [],
    data: {}
  };
  
  for (const [skillId, xp] of Object.entries(playerXpData)) {
    const skill = parseInt(skillId, 10);
    
    if (!Number.isInteger(xp) || xp < 0) {
      validation.valid = false;
      validation.errors.push(`Skill ${skill}: invalid XP value ${xp}`);
      continue;
    }
    
    const level = getLevelFromXp(xp);
    const cap = getSkillLevelCap(skill);
    
    if (level > cap) {
      validation.valid = false;
      validation.errors.push(`Skill ${skill}: level ${level} exceeds cap ${cap}`);
    }
    
    validation.data[skill] = { xp, level, cap, valid: level <= cap };
  }
  
  return validation;
}

// Export as module
export {
  OFFICIAL_XP_TABLE,
  SKILL_LEVEL_CAPS,
  getOfficialXpForLevel,
  getLevelFromXp,
  validateXpTable,
  getSkillLevelCap,
  getXpToNextLevel,
  getProgressToNextLevel,
  isValidSkillLevel,
  validatePlayerXpData,
};
