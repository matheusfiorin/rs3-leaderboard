/**
 * Player Data Service
 * Consolidates all player lookup and data fetching patterns
 * Eliminates 7+ duplicate fetch implementations across codebase
 */

import { globalFetchCache } from './fetch-dedup.js';
import { sanitizePlayerName, playerNamesMatch, validatePlayerName } from './validation.js';

/**
 * Core API endpoints
 */
const API_ENDPOINTS = {
  profile: (name) => `https://apps.runescape.com/runemetrics/profile/profile?user=${encodeURIComponent(name)}&activities=20`,
  hiscores: (name) => `https://secure.runescape.com/m=hiscore/index_lite.json?player=${encodeURIComponent(name)}`,
  quests: (name) => `https://apps.runescape.com/runemetrics/quests?user=${encodeURIComponent(name)}`,
};

/**
 * Fetch player profile with caching and error handling
 * @param {string} playerName
 * @param {Object} options - {ttl, forceRefresh}
 * @returns {Promise<Object>}
 */
async function fetchPlayerProfile(playerName, options = {}) {
  const validation = validatePlayerName(playerName);
  if (!validation.valid) {
    throw new Error(`Invalid player name: ${validation.errors[0]}`);
  }

  const sanitized = validation.sanitized;
  const url = API_ENDPOINTS.profile(sanitized);
  
  if (options.forceRefresh) {
    globalFetchCache.invalidate(url, { params: { name: sanitized } });
  }

  try {
    const response = await globalFetchCache.fetch(
      url,
      async (url) => {
        const resp = await fetch(url, { signal: options.signal });
        if (!resp.ok) {
          throw new Error(`HTTP ${resp.status}`);
        }
        return resp.json();
      },
      { ttl: options.ttl || 300000, params: { name: sanitized } }
    );

    return {
      success: true,
      data: response,
      playerName: sanitized
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      playerName: sanitized
    };
  }
}

/**
 * Fetch player hiscores with caching
 * @param {string} playerName
 * @param {Object} options
 * @returns {Promise<Object>}
 */
async function fetchPlayerHiscores(playerName, options = {}) {
  const validation = validatePlayerName(playerName);
  if (!validation.valid) {
    throw new Error(`Invalid player name: ${validation.errors[0]}`);
  }

  const sanitized = validation.sanitized;
  const url = API_ENDPOINTS.hiscores(sanitized);
  
  if (options.forceRefresh) {
    globalFetchCache.invalidate(url, { params: { name: sanitized } });
  }

  try {
    const response = await globalFetchCache.fetch(
      url,
      async (url) => {
        const resp = await fetch(url, { signal: options.signal });
        if (!resp.ok) {
          throw new Error(`HTTP ${resp.status}`);
        }
        return resp.json();
      },
      { ttl: options.ttl || 300000, params: { name: sanitized } }
    );

    return {
      success: true,
      data: response,
      playerName: sanitized
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      playerName: sanitized
    };
  }
}

/**
 * Fetch player quests with caching
 * @param {string} playerName
 * @param {Object} options
 * @returns {Promise<Object>}
 */
async function fetchPlayerQuests(playerName, options = {}) {
  const validation = validatePlayerName(playerName);
  if (!validation.valid) {
    throw new Error(`Invalid player name: ${validation.errors[0]}`);
  }

  const sanitized = validation.sanitized;
  const url = API_ENDPOINTS.quests(sanitized);
  
  if (options.forceRefresh) {
    globalFetchCache.invalidate(url, { params: { name: sanitized } });
  }

  try {
    const response = await globalFetchCache.fetch(
      url,
      async (url) => {
        const resp = await fetch(url, { signal: options.signal });
        if (!resp.ok) {
          throw new Error(`HTTP ${resp.status}`);
        }
        return resp.json();
      },
      { ttl: options.ttl || 600000, params: { name: sanitized } }
    );

    return {
      success: true,
      data: response,
      playerName: sanitized
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      playerName: sanitized
    };
  }
}

/**
 * Fetch all player data in parallel (profile + hiscores + quests)
 * @param {string} playerName
 * @param {Object} options
 * @returns {Promise<Object>}
 */
async function fetchCompletePlayerData(playerName, options = {}) {
  const validation = validatePlayerName(playerName);
  if (!validation.valid) {
    throw new Error(`Invalid player name: ${validation.errors[0]}`);
  }

  const sanitized = validation.sanitized;

  try {
    const [profileResult, hiscoresResult, questsResult] = await Promise.all([
      fetchPlayerProfile(sanitized, options),
      fetchPlayerHiscores(sanitized, options),
      fetchPlayerQuests(sanitized, options)
    ]);

    const allSuccess = profileResult.success && hiscoresResult.success;

    return {
      success: allSuccess,
      playerName: sanitized,
      profile: profileResult.success ? profileResult.data : null,
      hiscores: hiscoresResult.success ? hiscoresResult.data : null,
      quests: questsResult.success ? questsResult.data : null,
      errors: [
        profileResult.success ? null : profileResult.error,
        hiscoresResult.success ? null : hiscoresResult.error,
        questsResult.success ? null : questsResult.error
      ].filter(Boolean)
    };
  } catch (error) {
    return {
      success: false,
      playerName: sanitized,
      profile: null,
      hiscores: null,
      quests: null,
      errors: [error.message]
    };
  }
}

/**
 * Batch fetch multiple players' data
 * @param {Array<string>} playerNames
 * @param {Object} options
 * @returns {Promise<Array>}
 */
async function batchFetchPlayers(playerNames, options = {}) {
  if (!Array.isArray(playerNames)) {
    throw new Error('playerNames must be array');
  }

  return Promise.all(
    playerNames.map(name => fetchCompletePlayerData(name, options))
  );
}

/**
 * Deduplicate players by name (case-insensitive)
 * @param {Array<string>} playerNames
 * @returns {Array<string>}
 */
function deduplicatePlayerNames(playerNames) {
  const seen = new Set();
  const result = [];

  playerNames.forEach(name => {
    const sanitized = sanitizePlayerName(name).toLowerCase();
    if (sanitized && !seen.has(sanitized)) {
      seen.add(sanitized);
      result.push(sanitizePlayerName(name));
    }
  });

  return result;
}

/**
 * Find player in array by name (case-insensitive)
 * @param {Array} players
 * @param {string} name
 * @returns {Object|null}
 */
function findPlayerByName(players, name) {
  if (!Array.isArray(players)) return null;
  
  return players.find(p => 
    p && p.name && playerNamesMatch(p.name, name)
  ) || null;
}

/**
 * Calculate combined skill level from hiscores
 * @param {Array} hiscores - Skill data array
 * @returns {number}
 */
function calculateCombinedLevel(hiscores) {
  if (!Array.isArray(hiscores)) return 0;
  
  return hiscores.reduce((total, skill) => {
    return total + (Number.isInteger(skill.level) ? skill.level : 0);
  }, 0);
}

/**
 * Calculate combined XP from hiscores
 * @param {Array} hiscores
 * @returns {number}
 */
function calculateCombinedXp(hiscores) {
  if (!Array.isArray(hiscores)) return 0;
  
  return hiscores.reduce((total, skill) => {
    return total + (Number.isInteger(skill.xp) ? skill.xp : 0);
  }, 0);
}

/**
 * Sort players by combined level (descending)
 * @param {Array} players
 * @param {string} orderBy - 'level', 'xp', 'name'
 * @returns {Array}
 */
function sortPlayers(players, orderBy = 'level') {
  if (!Array.isArray(players)) return [];
  
  const sorted = [...players];
  
  switch (orderBy) {
    case 'xp':
      sorted.sort((a, b) => {
        const xpA = a.hiscores ? calculateCombinedXp(a.hiscores) : 0;
        const xpB = b.hiscores ? calculateCombinedXp(b.hiscores) : 0;
        return xpB - xpA;
      });
      break;
    
    case 'name':
      sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      break;
    
    case 'level':
    default:
      sorted.sort((a, b) => {
        const levelA = a.hiscores ? calculateCombinedLevel(a.hiscores) : 0;
        const levelB = b.hiscores ? calculateCombinedLevel(b.hiscores) : 0;
        return levelB - levelA;
      });
  }
  
  return sorted;
}

/**
 * Get cache stats
 */
function getCacheStats() {
  return globalFetchCache.getStats();
}

/**
 * Clear all player data cache
 */
function clearCache() {
  globalFetchCache.clear();
}

export {
  API_ENDPOINTS,
  fetchPlayerProfile,
  fetchPlayerHiscores,
  fetchPlayerQuests,
  fetchCompletePlayerData,
  batchFetchPlayers,
  deduplicatePlayerNames,
  findPlayerByName,
  calculateCombinedLevel,
  calculateCombinedXp,
  sortPlayers,
  getCacheStats,
  clearCache
};
