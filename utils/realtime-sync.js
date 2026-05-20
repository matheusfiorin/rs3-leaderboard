/**
 * Real-Time Sync Module
 * Provides polling-based real-time data synchronization with exponential backoff
 */

class RealtimeSync {
  constructor(options = {}) {
    this.pollingInterval = options.pollingInterval || 30000; // 30 seconds default
    this.maxRetries = options.maxRetries || 5;
    this.exponentialBackoff = options.exponentialBackoff !== false;
    this.timeout = options.timeout || 10000;
    
    this.pollTimerId = null;
    this.retryCount = 0;
    this.lastUpdateTime = null;
    this.isOnline = navigator.onLine;
    this.syncHandlers = [];
    this.errorHandlers = [];
    this.statusHandlers = [];
  }

  /**
   * Register handler for data sync events
   * @param {Function} handler - Called with (data, timestamp)
   */
  onSync(handler) {
    this.syncHandlers.push(handler);
    return () => {
      this.syncHandlers = this.syncHandlers.filter(h => h !== handler);
    };
  }

  /**
   * Register handler for sync errors
   * @param {Function} handler - Called with (error, retryCount)
   */
  onError(handler) {
    this.errorHandlers.push(handler);
    return () => {
      this.errorHandlers = this.errorHandlers.filter(h => h !== handler);
    };
  }

  /**
   * Register handler for status changes
   * @param {Function} handler - Called with (status, details)
   */
  onStatusChange(handler) {
    this.statusHandlers.push(handler);
    return () => {
      this.statusHandlers = this.statusHandlers.filter(h => h !== handler);
    };
  }

  /**
   * Start real-time polling
   * @param {Function} fetchFn - Function that returns Promise<data>
   */
  start(fetchFn) {
    if (!fetchFn || typeof fetchFn !== 'function') {
      throw new Error('fetchFn must be a function');
    }

    this.fetchFn = fetchFn;
    this.retryCount = 0;
    this.emitStatus('starting', { timestamp: Date.now() });

    // Setup online/offline listeners
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());

    // Perform initial sync immediately
    this.poll();
  }

  /**
   * Stop polling
   */
  stop() {
    if (this.pollTimerId) {
      clearTimeout(this.pollTimerId);
      this.pollTimerId = null;
    }
    this.emitStatus('stopped', { timestamp: Date.now() });
  }

  /**
   * Force immediate sync
   */
  async syncNow() {
    if (this.pollTimerId) {
      clearTimeout(this.pollTimerId);
      this.pollTimerId = null;
    }
    return this.poll();
  }

  /**
   * Internal polling method
   */
  async poll() {
    if (!this.isOnline) {
      this.emitStatus('offline', { retryCount: this.retryCount });
      this.schedulePoll();
      return;
    }

    try {
      this.emitStatus('syncing', { retryCount: this.retryCount });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const data = await Promise.race([
        this.fetchFn({ signal: controller.signal }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), this.timeout)
        )
      ]);

      clearTimeout(timeoutId);

      // Success - reset retry count
      this.retryCount = 0;
      this.lastUpdateTime = Date.now();
      this.emitSync(data);
      this.emitStatus('synced', { 
        timestamp: this.lastUpdateTime,
        cacheAge: Math.round((Date.now() - this.lastUpdateTime) / 1000)
      });

    } catch (error) {
      this.handleSyncError(error);
    }

    this.schedulePoll();
  }

  /**
   * Handle sync errors with exponential backoff
   */
  handleSyncError(error) {
    console.error('Sync error:', error);

    this.retryCount++;
    const shouldRetry = this.retryCount < this.maxRetries;

    this.emitError(error, this.retryCount);
    this.emitStatus('error', { 
      error: error.message,
      retryCount: this.retryCount,
      willRetry: shouldRetry
    });

    if (!shouldRetry) {
      this.emitStatus('failed', { 
        error: error.message,
        totalRetries: this.retryCount
      });
    }
  }

  /**
   * Schedule next poll with exponential backoff
   */
  schedulePoll() {
    if (this.pollTimerId) {
      clearTimeout(this.pollTimerId);
    }

    let interval = this.pollingInterval;

    if (this.exponentialBackoff && this.retryCount > 0) {
      // Exponential backoff: 1s, 2s, 4s, 8s, 16s, etc. (capped at pollingInterval)
      interval = Math.min(
        1000 * Math.pow(2, this.retryCount - 1),
        this.pollingInterval
      );
    }

    this.pollTimerId = setTimeout(() => this.poll(), interval);
  }

  /**
   * Handle coming back online
   */
  handleOnline() {
    console.log('Going online');
    this.isOnline = true;
    this.retryCount = 0;
    this.emitStatus('online', { timestamp: Date.now() });
    this.syncNow();
  }

  /**
   * Handle going offline
   */
  handleOffline() {
    console.log('Going offline');
    this.isOnline = false;
    this.emitStatus('offline', { timestamp: Date.now() });
  }

  /**
   * Emit sync event to handlers
   */
  emitSync(data) {
    this.syncHandlers.forEach(handler => {
      try {
        handler(data, this.lastUpdateTime);
      } catch (e) {
        console.error('Sync handler error:', e);
      }
    });
  }

  /**
   * Emit error event to handlers
   */
  emitError(error, retryCount) {
    this.errorHandlers.forEach(handler => {
      try {
        handler(error, retryCount);
      } catch (e) {
        console.error('Error handler error:', e);
      }
    });
  }

  /**
   * Emit status change event
   */
  emitStatus(status, details = {}) {
    this.statusHandlers.forEach(handler => {
      try {
        handler(status, details);
      } catch (e) {
        console.error('Status handler error:', e);
      }
    });
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      isOnline: this.isOnline,
      isPolling: this.pollTimerId !== null,
      lastUpdateTime: this.lastUpdateTime,
      retryCount: this.retryCount,
      cacheAgeSeconds: this.lastUpdateTime 
        ? Math.round((Date.now() - this.lastUpdateTime) / 1000)
        : null
    };
  }

  /**
   * Get "last updated" display string
   */
  getLastUpdatedText(currentLang = 'en') {
    if (!this.lastUpdateTime) return null;

    const ageMs = Date.now() - this.lastUpdateTime;
    const ageMin = Math.round(ageMs / 60000);

    if (ageMin < 1) {
      return currentLang === 'pt' ? 'Atualizado agora' : 'Updated now';
    } else if (ageMin < 60) {
      return currentLang === 'pt' 
        ? `Atualizado há ${ageMin} min` 
        : `Updated ${ageMin} min ago`;
    } else {
      const ageHours = Math.round(ageMin / 60);
      return currentLang === 'pt'
        ? `Atualizado há ${ageHours}h`
        : `Updated ${ageHours}h ago`;
    }
  }
}

// Helper function for creating a managed sync instance
function createRealtimeSync(options = {}) {
  return new RealtimeSync(options);
}

export { RealtimeSync, createRealtimeSync };
