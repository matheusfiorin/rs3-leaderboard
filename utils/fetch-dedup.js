/**
 * Request Deduplication & Caching
 * Prevents duplicate simultaneous API calls, implements simple TTL cache
 */

class FetchCache {
  constructor(options = {}) {
    this.cache = new Map(); // key -> { data, timestamp, ttl }
    this.pending = new Map(); // key -> Promise
    this.defaultTtl = options.defaultTtl || 60000; // 1 minute
    this.maxEntries = options.maxEntries || 100;
  }

  /**
   * Generate cache key from URL and options
   */
  generateKey(url, options = {}) {
    const sortedParams = options.params 
      ? Object.keys(options.params)
          .sort()
          .map(k => `${k}=${options.params[k]}`)
          .join('&')
      : '';
    return `${url}?${sortedParams}`;
  }

  /**
   * Check if cache entry is still valid
   */
  isValid(entry) {
    if (!entry) return false;
    const age = Date.now() - entry.timestamp;
    return age < entry.ttl;
  }

  /**
   * Deduplicated fetch wrapper
   * @param {string} url
   * @param {Function} fetchFn - Function that performs actual fetch
   * @param {Object} options
   * @returns {Promise}
   */
  async fetch(url, fetchFn, options = {}) {
    const key = this.generateKey(url, options);
    const ttl = options.ttl || this.defaultTtl;

    // Return cached data if valid
    const cached = this.cache.get(key);
    if (cached && this.isValid(cached)) {
      return cached.data;
    }

    // Return pending promise if request in flight
    if (this.pending.has(key)) {
      return this.pending.get(key);
    }

    // Start new fetch
    const promise = (async () => {
      try {
        const data = await fetchFn(url);
        
        // Store in cache
        this.cache.set(key, {
          data,
          timestamp: Date.now(),
          ttl
        });

        // Cleanup old entries if cache too large
        if (this.cache.size > this.maxEntries) {
          const entries = Array.from(this.cache.entries());
          entries
            .sort((a, b) => a[1].timestamp - b[1].timestamp)
            .slice(0, Math.ceil(this.maxEntries * 0.2)) // Remove oldest 20%
            .forEach(([k]) => this.cache.delete(k));
        }

        return data;
      } finally {
        this.pending.delete(key);
      }
    })();

    this.pending.set(key, promise);
    return promise;
  }

  /**
   * Invalidate cache entry
   */
  invalidate(url, options = {}) {
    const key = this.generateKey(url, options);
    this.cache.delete(key);
    return true;
  }

  /**
   * Clear all cache
   */
  clear() {
    this.cache.clear();
    this.pending.clear();
  }

  /**
   * Get cache stats
   */
  getStats() {
    return {
      cacheSize: this.cache.size,
      pendingRequests: this.pending.size,
      totalSize: this.cache.size + this.pending.size
    };
  }
}

// Global instance for common API calls
const globalFetchCache = new FetchCache({
  defaultTtl: 30000, // 30 seconds
  maxEntries: 50
});

/**
 * Batch multiple API calls, deduplicating identical requests
 * @param {Array} requests - Array of { url, params, ttl } objects
 * @param {Function} fetchFn - Async function(url, options)
 * @returns {Promise<Array>} Results in same order as input
 */
async function batchFetch(requests, fetchFn) {
  if (!Array.isArray(requests)) {
    throw new Error('requests must be array');
  }

  // Deduplicate identical requests
  const keyMap = new Map(); // key -> indices
  const uniqueRequests = [];

  requests.forEach((req, idx) => {
    const key = globalFetchCache.generateKey(req.url, { params: req.params });
    if (!keyMap.has(key)) {
      keyMap.set(key, []);
      uniqueRequests.push(req);
    }
    keyMap.get(key).push(idx);
  });

  // Fetch unique requests
  const results = await Promise.all(
    uniqueRequests.map(req =>
      globalFetchCache.fetch(req.url, fetchFn, { 
        params: req.params, 
        ttl: req.ttl 
      })
    )
  );

  // Map results back to original request order
  const finalResults = new Array(requests.length);
  uniqueRequests.forEach((req, resultIdx) => {
    const indices = keyMap.get(
      globalFetchCache.generateKey(req.url, { params: req.params })
    );
    indices.forEach(origIdx => {
      finalResults[origIdx] = results[resultIdx];
    });
  });

  return finalResults;
}

/**
 * Create isolated fetch cache instance
 */
function createFetchCache(options) {
  return new FetchCache(options);
}

export { FetchCache, globalFetchCache, batchFetch, createFetchCache };
