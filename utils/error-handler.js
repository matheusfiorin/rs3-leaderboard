/**
 * Global Error Handler Module
 * Handles unhandled promise rejections, fetch errors, and provides retry logic
 */

// Store all active timeouts and intervals for cleanup
const activeTimers = new Map();
const activeListeners = new Set();

/**
 * Enhanced fetch wrapper with retry logic and timeout
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options (method, body, etc.)
 * @param {number} maxRetries - Max retry attempts (default 3)
 * @param {number} timeoutMs - Request timeout in ms (default 10000)
 * @param {AbortController} abortController - Optional abort controller
 * @returns {Promise<Response>}
 */
async function fetchWithRetry(url, options = {}, maxRetries = 3, timeoutMs = 10000, abortController = null) {
  let lastError;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const controller = abortController || new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response;
    } catch (error) {
      lastError = error;
      
      // Don't retry on abort
      if (error.name === 'AbortError') {
        throw error;
      }
      
      // Calculate exponential backoff
      const backoffMs = Math.min(1000 * Math.pow(2, attempt), 10000);
      
      // Only retry if there are attempts left
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }
  }
  
  throw new Error(`Fetch failed after ${maxRetries} attempts: ${lastError?.message}`);
}

/**
 * Setup global error handlers
 */
function setupGlobalErrorHandlers() {
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled Promise Rejection:', event.reason);
    
    // Prevent default error handling (which would crash the app)
    event.preventDefault();
    
    // Show user-friendly error message
    showErrorNotification('Something went wrong. Please refresh the page.');
  });
  
  // Handle global errors
  window.addEventListener('error', (event) => {
    console.error('Global Error:', event.error);
    showErrorNotification('An unexpected error occurred.');
  });
  
  // Cleanup on page unload
  window.addEventListener('beforeunload', cleanupAllTimers);
}

/**
 * Show error notification to user
 * @param {string} message - Error message
 */
function showErrorNotification(message) {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #ff4444;
    color: white;
    padding: 16px 20px;
    border-radius: 4px;
    font-size: 14px;
    z-index: 10000;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  `;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => notification.remove(), 5000);
}

/**
 * Wrap a setTimeout with tracking for cleanup
 * @param {Function} callback
 * @param {number} ms
 * @returns {number} Timeout ID
 */
function trackedSetTimeout(callback, ms) {
  const id = setTimeout(() => {
    callback();
    activeTimers.delete(id);
  }, ms);
  
  activeTimers.set(id, { type: 'timeout' });
  return id;
}

/**
 * Wrap a setInterval with tracking for cleanup
 * @param {Function} callback
 * @param {number} ms
 * @returns {number} Interval ID
 */
function trackedSetInterval(callback, ms) {
  const id = setInterval(callback, ms);
  activeTimers.set(id, { type: 'interval' });
  return id;
}

/**
 * Add listener with automatic tracking
 * @param {Element} element
 * @param {string} event
 * @param {Function} handler
 */
function addTrackedListener(element, event, handler) {
  element.addEventListener(event, handler);
  activeListeners.add({ element, event, handler });
}

/**
 * Clean up all tracked timers and listeners
 */
function cleanupAllTimers() {
  // Clear all timeouts and intervals
  activeTimers.forEach((meta, id) => {
    if (meta.type === 'timeout') {
      clearTimeout(id);
    } else if (meta.type === 'interval') {
      clearInterval(id);
    }
  });
  activeTimers.clear();
  
  // Remove all tracked listeners
  activeListeners.forEach(({ element, event, handler }) => {
    element.removeEventListener(event, handler);
  });
  activeListeners.clear();
}

/**
 * Safe JSON parsing with error handling
 * @param {string} json
 * @param {*} fallback - Value to return on parse error
 * @returns {*}
 */
function safeJsonParse(json, fallback = null) {
  try {
    return JSON.parse(json);
  } catch (error) {
    console.error('JSON parse error:', error);
    return fallback;
  }
}

/**
 * Safe localStorage access with try-catch
 * @param {string} key
 * @param {*} defaultValue
 * @returns {*}
 */
function safeLocalStorageGet(key, defaultValue = null) {
  try {
    const item = localStorage.getItem(key);
    return item ? safeJsonParse(item, defaultValue) : defaultValue;
  } catch (error) {
    console.error('localStorage.getItem failed:', error);
    return defaultValue;
  }
}

/**
 * Safe localStorage write
 * @param {string} key
 * @param {*} value
 * @returns {boolean} Success
 */
function safeLocalStorageSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error('localStorage.setItem failed:', error);
    return false;
  }
}

// Export as module
export {
  fetchWithRetry,
  setupGlobalErrorHandlers,
  showErrorNotification,
  trackedSetTimeout,
  trackedSetInterval,
  addTrackedListener,
  cleanupAllTimers,
  safeJsonParse,
  safeLocalStorageGet,
  safeLocalStorageSet,
};
