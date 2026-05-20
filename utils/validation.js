/**
 * Data Validation Utilities
 * Provides validation functions for player data, goals, and inputs
 */

/**
 * Validate player name format
 * RuneScape names: 1-12 characters, letters/numbers/spaces/hyphens/apostrophes
 * @param {string} name
 * @returns {Object} {valid, errors}
 */
function validatePlayerName(name) {
  const errors = [];
  
  if (typeof name !== 'string') {
    errors.push('Name must be a string');
    return { valid: false, errors };
  }
  
  const trimmed = name.trim();
  
  if (trimmed.length === 0) {
    errors.push('Name cannot be empty');
  } else if (trimmed.length > 12) {
    errors.push('Name cannot exceed 12 characters');
  }
  
  // Only allow letters, numbers, spaces, hyphens, apostrophes
  if (!/^[a-zA-Z0-9\s\-']+$/.test(trimmed)) {
    errors.push('Name contains invalid characters');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    sanitized: trimmed
  };
}

/**
 * Validate experience points
 * @param {number} xp
 * @returns {boolean}
 */
function validateXp(xp) {
  return Number.isInteger(xp) && xp >= 0 && xp <= Number.MAX_SAFE_INTEGER;
}

/**
 * Validate skill level (1-120)
 * @param {number} level
 * @returns {boolean}
 */
function validateLevel(level) {
  return Number.isInteger(level) && level >= 1 && level <= 120;
}

/**
 * Validate rank (should be positive integer)
 * @param {number} rank
 * @returns {boolean}
 */
function validateRank(rank) {
  return Number.isInteger(rank) && rank > 0;
}

/**
 * Validate player profile data
 * @param {Object} profile
 * @returns {Object} {valid, errors}
 */
function validatePlayerProfile(profile) {
  const errors = [];
  
  if (!profile || typeof profile !== 'object') {
    return { valid: false, errors: ['Profile must be an object'] };
  }
  
  if (typeof profile.name !== 'string') {
    errors.push('Profile name must be a string');
  }
  
  if (!validateLevel(profile.level)) {
    errors.push('Profile level must be integer between 1-120');
  }
  
  if (!validateXp(profile.xp)) {
    errors.push('Profile xp must be non-negative integer');
  }
  
  if (profile.rank !== undefined && !validateRank(profile.rank)) {
    errors.push('Profile rank must be positive integer');
  }
  
  if (profile.questsCompleted !== undefined) {
    if (!Number.isInteger(profile.questsCompleted) || profile.questsCompleted < 0) {
      errors.push('questsCompleted must be non-negative integer');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate hiscores skill data
 * @param {Array} skills
 * @returns {Object} {valid, errors, invalidSkills}
 */
function validateHiscoresData(skills) {
  const errors = [];
  const invalidSkills = [];
  
  if (!Array.isArray(skills)) {
    return { valid: false, errors: ['Skills must be an array'] };
  }
  
  skills.forEach((skill, idx) => {
    if (typeof skill !== 'object') {
      invalidSkills.push({ index: idx, reason: 'Skill must be object' });
      return;
    }
    
    if (!Number.isInteger(skill.skillId) || skill.skillId < 0 || skill.skillId > 28) {
      invalidSkills.push({ index: idx, reason: 'Invalid skillId' });
    }
    
    if (!validateLevel(skill.level)) {
      invalidSkills.push({ index: idx, reason: `Invalid level: ${skill.level}` });
    }
    
    if (!validateXp(skill.xp)) {
      invalidSkills.push({ index: idx, reason: `Invalid xp: ${skill.xp}` });
    }
    
    if (!validateRank(skill.rank)) {
      invalidSkills.push({ index: idx, reason: `Invalid rank: ${skill.rank}` });
    }
  });
  
  if (invalidSkills.length > 0) {
    errors.push(`${invalidSkills.length} invalid skills found`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
    invalidSkills
  };
}

/**
 * Validate goal parameters
 * @param {Object} goal
 * @returns {Object} {valid, errors}
 */
function validateGoal(goal) {
  const errors = [];
  
  if (!goal || typeof goal !== 'object') {
    return { valid: false, errors: ['Goal must be an object'] };
  }
  
  if (!Number.isInteger(goal.skillId) || goal.skillId < 0 || goal.skillId > 28) {
    errors.push('Goal skillId must be 0-28');
  }
  
  if (!validateLevel(goal.targetLevel)) {
    errors.push('Goal targetLevel must be 1-120');
  }
  
  if (!validateXp(goal.targetXp)) {
    errors.push('Goal targetXp must be non-negative integer');
  }
  
  if (goal.priority && !['low', 'medium', 'high'].includes(goal.priority)) {
    errors.push('Goal priority must be low/medium/high');
  }
  
  if (goal.createdDate && isNaN(Date.parse(goal.createdDate))) {
    errors.push('Goal createdDate must be valid date');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate GE price data
 * @param {number} price
 * @returns {Object} {valid, errors}
 */
function validateGePrice(price) {
  const errors = [];
  
  if (!Number.isInteger(price)) {
    errors.push('Price must be integer');
  } else if (price < 0) {
    errors.push('Price cannot be negative');
  } else if (price > 2147483647) { // RS3 limit
    errors.push('Price exceeds maximum value');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    price
  };
}

/**
 * Validate JSON data structure
 * @param {string} jsonString
 * @returns {Object} {valid, errors, data}
 */
function validateJsonStructure(jsonString) {
  const errors = [];
  let data = null;
  
  if (typeof jsonString !== 'string') {
    errors.push('Input must be string');
    return { valid: false, errors };
  }
  
  try {
    data = JSON.parse(jsonString);
  } catch (e) {
    errors.push(`JSON parse error: ${e.message}`);
    return { valid: false, errors };
  }
  
  return {
    valid: true,
    errors: [],
    data
  };
}

/**
 * Sanitize player name for display/API
 * @param {string} name
 * @returns {string}
 */
function sanitizePlayerName(name) {
  if (typeof name !== 'string') return '';
  return name
    .trim()
    .replace(/[^a-zA-Z0-9\s\-']/g, '') // Remove invalid chars
    .slice(0, 12); // Cap at 12 chars
}

/**
 * Check if two player names match (case-insensitive)
 * @param {string} name1
 * @param {string} name2
 * @returns {boolean}
 */
function playerNamesMatch(name1, name2) {
  if (typeof name1 !== 'string' || typeof name2 !== 'string') {
    return false;
  }
  return name1.toLowerCase().trim() === name2.toLowerCase().trim();
}

/**
 * Validate number is within range
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {boolean}
 */
function isNumberInRange(value, min, max) {
  return Number.isFinite(value) && value >= min && value <= max;
}

/**
 * Safe division with default value
 * @param {number} numerator
 * @param {number} denominator
 * @param {number} defaultValue
 * @returns {number}
 */
function safeDivide(numerator, denominator, defaultValue = 0) {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
    return defaultValue;
  }
  return numerator / denominator;
}

/**
 * Calculate percentage safely
 * @param {number} current
 * @param {number} total
 * @returns {number}
 */
function safePercentage(current, total) {
  if (!Number.isFinite(current) || !Number.isFinite(total) || total === 0) {
    return 0;
  }
  return Math.round((current / total) * 100);
}

// Export as module
export {
  validatePlayerName,
  validateXp,
  validateLevel,
  validateRank,
  validatePlayerProfile,
  validateHiscoresData,
  validateGoal,
  validateGePrice,
  validateJsonStructure,
  sanitizePlayerName,
  playerNamesMatch,
  isNumberInRange,
  safeDivide,
  safePercentage
};
