/**
 * Storage Utilities
 * Consolidates localStorage access patterns, adds error handling and fallback to memory
 */

class StorageManager {
  constructor(options = {}) {
    this.prefix = options.prefix || 'rs3lb-';
    this.useMemoryFallback = options.useMemoryFallback !== false;
    this.memoryStore = new Map();
    this.storageAvailable = this.checkStorageAvailable();
    this.listeners = new Set();
  }

  /**
   * Check if localStorage is available
   */
  checkStorageAvailable() {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      console.warn('localStorage not available, using memory fallback');
      return false;
    }
  }

  /**
   * Generate prefixed key
   */
  _key(key) {
    return this.prefix + key;
  }

  /**
   * Set value (with type detection)
   * @param {string} key
   * @param {*} value
   * @returns {boolean} Success
   */
  set(key, value) {
    const prefixedKey = this._key(key);
    const jsonValue = JSON.stringify(value);

    try {
      if (this.storageAvailable) {
        localStorage.setItem(prefixedKey, jsonValue);
      } else if (this.useMemoryFallback) {
        this.memoryStore.set(prefixedKey, value);
      }
      
      this.emit('change', { key, value, action: 'set' });
      return true;
    } catch (error) {
      console.error(`Storage.set failed for ${key}:`, error);
      
      // Fallback to memory
      if (!this.storageAvailable && this.useMemoryFallback) {
        this.memoryStore.set(prefixedKey, value);
        return true;
      }
      
      return false;
    }
  }

  /**
   * Get value (with JSON parsing)
   * @param {string} key
   * @param {*} defaultValue
   * @returns {*}
   */
  get(key, defaultValue = null) {
    const prefixedKey = this._key(key);

    try {
      let stored;
      
      if (this.storageAvailable) {
        stored = localStorage.getItem(prefixedKey);
      } else {
        stored = this.memoryStore.get(prefixedKey);
        if (stored !== undefined) {
          return stored;
        }
      }
      
      if (stored === null || stored === undefined) {
        return defaultValue;
      }
      
      return JSON.parse(stored);
    } catch (error) {
      console.error(`Storage.get failed for ${key}:`, error);
      return defaultValue;
    }
  }

  /**
   * Remove value
   * @param {string} key
   * @returns {boolean}
   */
  remove(key) {
    const prefixedKey = this._key(key);

    try {
      if (this.storageAvailable) {
        localStorage.removeItem(prefixedKey);
      } else {
        this.memoryStore.delete(prefixedKey);
      }
      
      this.emit('change', { key, action: 'remove' });
      return true;
    } catch (error) {
      console.error(`Storage.remove failed for ${key}:`, error);
      return false;
    }
  }

  /**
   * Check if key exists
   * @param {string} key
   * @returns {boolean}
   */
  has(key) {
    const prefixedKey = this._key(key);
    
    if (this.storageAvailable) {
      return localStorage.getItem(prefixedKey) !== null;
    } else {
      return this.memoryStore.has(prefixedKey);
    }
  }

  /**
   * Clear all prefixed keys
   */
  clear() {
    try {
      if (this.storageAvailable) {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key.startsWith(this.prefix)) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
      } else {
        // Clear only our prefixed entries
        for (const key of this.memoryStore.keys()) {
          if (key.startsWith(this.prefix)) {
            this.memoryStore.delete(key);
          }
        }
      }
      
      this.emit('change', { action: 'clear' });
      return true;
    } catch (error) {
      console.error('Storage.clear failed:', error);
      return false;
    }
  }

  /**
   * Get all values as object
   * @returns {Object}
   */
  getAll() {
    const result = {};

    try {
      if (this.storageAvailable) {
        for (let i = 0; i < localStorage.length; i++) {
          const fullKey = localStorage.key(i);
          if (fullKey.startsWith(this.prefix)) {
            const key = fullKey.slice(this.prefix.length);
            const value = localStorage.getItem(fullKey);
            try {
              result[key] = JSON.parse(value);
            } catch {
              result[key] = value;
            }
          }
        }
      } else {
        for (const [fullKey, value] of this.memoryStore.entries()) {
          if (fullKey.startsWith(this.prefix)) {
            const key = fullKey.slice(this.prefix.length);
            result[key] = value;
          }
        }
      }
    } catch (error) {
      console.error('Storage.getAll failed:', error);
    }

    return result;
  }

  /**
   * Get storage size estimate
   * @returns {Object|null}
   */
  async getStorageInfo() {
    try {
      if (navigator.storage && navigator.storage.estimate) {
        return await navigator.storage.estimate();
      }
      return null;
    } catch (error) {
      console.error('Failed to estimate storage:', error);
      return null;
    }
  }

  /**
   * Register change listener
   * @param {Function} handler
   * @returns {Function} Unsubscribe
   */
  onChange(handler) {
    this.listeners.add(handler);
    return () => this.listeners.delete(handler);
  }

  /**
   * Emit change event
   */
  emit(event, details) {
    this.listeners.forEach(handler => {
      try {
        handler(event, details);
      } catch (e) {
        console.error('Storage listener error:', e);
      }
    });
  }

  /**
   * Clean up old entries based on timestamp
   * @param {string} prefix - Prefix to clean (e.g. 'cache-')
   * @param {number} maxAgeMs - Max age in milliseconds
   * @returns {number} Entries removed
   */
  cleanupOldEntries(prefix, maxAgeMs = 86400000) {
    let removed = 0;
    const now = Date.now();
    const fullPrefix = this._key(prefix);
    const keysToRemove = [];

    try {
      if (this.storageAvailable) {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key.startsWith(fullPrefix)) {
            try {
              const value = JSON.parse(localStorage.getItem(key));
              if (value.timestamp && now - value.timestamp > maxAgeMs) {
                keysToRemove.push(key);
              }
            } catch {
              // Skip malformed entries
            }
          }
        }
        
        keysToRemove.forEach(key => {
          localStorage.removeItem(key);
          removed++;
        });
      }
    } catch (error) {
      console.error('Cleanup failed:', error);
    }

    return removed;
  }
}

// Global storage instance with 'rs3lb-' prefix
const storage = new StorageManager();

// Convenience functions
function setStorageItem(key, value) {
  return storage.set(key, value);
}

function getStorageItem(key, defaultValue = null) {
  return storage.get(key, defaultValue);
}

function removeStorageItem(key) {
  return storage.remove(key);
}

function hasStorageItem(key) {
  return storage.has(key);
}

function clearAllStorage() {
  return storage.clear();
}

export {
  StorageManager,
  storage,
  setStorageItem,
  getStorageItem,
  removeStorageItem,
  hasStorageItem,
  clearAllStorage
};
