/**
 * Error Boundary & Recovery
 * Catches errors in specific sections without crashing the app
 */

class ErrorBoundary {
  constructor(name, options = {}) {
    this.name = name;
    this.errorHandlers = [];
    this.errors = [];
    this.recoveryStrategies = options.recoveryStrategies || {};
    this.maxErrors = options.maxErrors || 10;
    this.onError = options.onError;
  }

  /**
   * Register error handler
   * @param {Function} handler - Called with (error, details)
   */
  addErrorHandler(handler) {
    this.errorHandlers.push(handler);
    return () => {
      this.errorHandlers = this.errorHandlers.filter(h => h !== handler);
    };
  }

  /**
   * Wrap function with error boundary
   * @param {Function} fn
   * @param {Object} context
   * @returns {Function}
   */
  wrap(fn, context = null) {
    return async (...args) => {
      try {
        const result = await fn.apply(context, args);
        return { success: true, data: result };
      } catch (error) {
        return this.handleError(error, { fn: fn.name, args });
      }
    };
  }

  /**
   * Handle error with recovery
   * @param {Error} error
   * @param {Object} context
   * @returns {Object} {success, data, error}
   */
  async handleError(error, context = {}) {
    console.error(`[${this.name}] Error:`, error);

    // Store error
    this.errors.push({
      timestamp: Date.now(),
      message: error.message,
      stack: error.stack,
      context
    });

    // Keep only recent errors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }

    // Emit to handlers
    this.errorHandlers.forEach(handler => {
      try {
        handler(error, context);
      } catch (e) {
        console.error('Error handler failed:', e);
      }
    });

    // Call optional callback
    if (this.onError) {
      try {
        await this.onError(error, context);
      } catch (e) {
        console.error('onError callback failed:', e);
      }
    }

    // Try recovery
    let recovered = false;
    const errorType = this.classifyError(error);
    
    if (this.recoveryStrategies[errorType]) {
      try {
        await this.recoveryStrategies[errorType](error, context);
        recovered = true;
      } catch (e) {
        console.error('Recovery failed:', e);
      }
    }

    return {
      success: false,
      error: error.message,
      recovered,
      errorType,
      context
    };
  }

  /**
   * Classify error type
   * @param {Error} error
   * @returns {string}
   */
  classifyError(error) {
    if (error instanceof SyntaxError) return 'syntax';
    if (error instanceof TypeError) return 'type';
    if (error instanceof RangeError) return 'range';
    if (error.name === 'AbortError') return 'aborted';
    if (error.message.includes('NetworkError')) return 'network';
    if (error.message.includes('timeout')) return 'timeout';
    if (error.message.includes('404')) return 'notfound';
    return 'unknown';
  }

  /**
   * Register recovery strategy for error type
   * @param {string} errorType
   * @param {Function} recoveryFn
   */
  registerRecoveryStrategy(errorType, recoveryFn) {
    this.recoveryStrategies[errorType] = recoveryFn;
  }

  /**
   * Get error statistics
   * @returns {Object}
   */
  getStats() {
    const errorCounts = {};
    this.errors.forEach(err => {
      const type = this.classifyError(new Error(err.message));
      errorCounts[type] = (errorCounts[type] || 0) + 1;
    });

    return {
      totalErrors: this.errors.length,
      errorCounts,
      recentErrors: this.errors.slice(-5),
      boundaryName: this.name
    };
  }

  /**
   * Clear error history
   */
  clearErrors() {
    this.errors = [];
  }
}

/**
 * Safe async operation with automatic retry
 * @param {Function} fn - Async function to execute
 * @param {Object} options - {maxRetries, delay, backoff, timeout}
 * @returns {Promise}
 */
async function withRetry(fn, options = {}) {
  const maxRetries = options.maxRetries || 3;
  const delay = options.delay || 1000;
  const backoff = options.backoff || 1.5;
  const timeout = options.timeout || 30000;

  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Add timeout
      return await Promise.race([
        fn(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Operation timeout')), timeout)
        )
      ]);
    } catch (error) {
      lastError = error;
      
      if (attempt < maxRetries - 1) {
        const waitMs = delay * Math.pow(backoff, attempt);
        console.warn(`Retry attempt ${attempt + 1}/${maxRetries} after ${waitMs}ms:`, error.message);
        await new Promise(resolve => setTimeout(resolve, waitMs));
      }
    }
  }

  throw lastError;
}

/**
 * Safe DOM operation (silently fails if element not found)
 * @param {string|Element} target
 * @param {Function} fn
 * @returns {any}
 */
function safeDom(target, fn) {
  try {
    const el = typeof target === 'string' ? document.querySelector(target) : target;
    if (!el) return null;
    return fn(el);
  } catch (error) {
    console.error('DOM operation failed:', error);
    return null;
  }
}

/**
 * Safe API call with fallback
 * @param {Function} fn
 * @param {any} fallback
 * @returns {Promise}
 */
async function safeApiCall(fn, fallback = null) {
  try {
    return await fn();
  } catch (error) {
    console.error('API call failed:', error);
    return fallback;
  }
}

/**
 * Global error boundary for main app
 */
const appErrorBoundary = new ErrorBoundary('AppGlobal', {
  recoveryStrategies: {
    network: async (error) => {
      console.log('Attempting network recovery...');
      // Show offline indicator
      const el = document.getElementById('offline-indicator');
      if (el) el.style.display = 'block';
    },
    timeout: async (error) => {
      console.log('Request timeout, clearing cache...');
      // Could clear cache here
    }
  }
});

export {
  ErrorBoundary,
  appErrorBoundary,
  withRetry,
  safeDom,
  safeApiCall
};
