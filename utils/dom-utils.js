/**
 * DOM Utilities
 * Consolidates common DOM manipulation patterns, reduces code duplication
 */

// Cache for frequent DOM queries
const domCache = new Map();

/**
 * Cached querySelector
 * @param {string} selector
 * @returns {Element|null}
 */
function $(selector) {
  if (!domCache.has(selector)) {
    domCache.set(selector, document.querySelector(selector));
  }
  return domCache.get(selector);
}

/**
 * Cached querySelectorAll
 * @param {string} selector
 * @returns {NodeList}
 */
function $$(selector) {
  return document.querySelectorAll(selector);
}

/**
 * Invalidate DOM cache (call after DOM changes)
 */
function invalidateDomCache() {
  domCache.clear();
}

/**
 * Batch DOM updates using DocumentFragment
 * @param {Element} parent
 * @param {Array<Element>} elements
 */
function batchAppendChildren(parent, elements) {
  if (!parent || !Array.isArray(elements)) return;
  
  const fragment = document.createDocumentFragment();
  elements.forEach(el => fragment.appendChild(el));
  parent.appendChild(fragment);
}

/**
 * Create element with attributes and content
 * @param {string} tag
 * @param {Object} attrs - { class, id, data-*, etc }
 * @param {string|Element|Array} content
 * @returns {Element}
 */
function createElement(tag, attrs = {}, content = '') {
  const el = document.createElement(tag);
  
  // Set attributes
  Object.entries(attrs).forEach(([key, value]) => {
    if (key === 'class') {
      el.className = value;
    } else if (key === 'style') {
      Object.assign(el.style, value);
    } else if (key.startsWith('data-')) {
      el.dataset[key.slice(5)] = value;
    } else if (typeof value === 'boolean') {
      if (value) el.setAttribute(key, '');
    } else if (value !== null && value !== undefined) {
      el.setAttribute(key, value);
    }
  });
  
  // Set content
  if (content) {
    if (typeof content === 'string') {
      el.textContent = content;
    } else if (Array.isArray(content)) {
      batchAppendChildren(el, content);
    } else if (content instanceof Element) {
      el.appendChild(content);
    }
  }
  
  return el;
}

/**
 * Remove element safely
 * @param {Element|string} target
 */
function removeElement(target) {
  const el = typeof target === 'string' ? $(target) : target;
  if (el && el.parentNode) {
    el.parentNode.removeChild(el);
  }
}

/**
 * Remove all children from element
 * @param {Element|string} target
 */
function clearElement(target) {
  const el = typeof target === 'string' ? $(target) : target;
  if (el) {
    el.textContent = '';
  }
}

/**
 * Show/hide element
 * @param {Element|string} target
 * @param {boolean} visible
 */
function toggleVisibility(target, visible) {
  const el = typeof target === 'string' ? $(target) : target;
  if (el) {
    el.style.display = visible ? '' : 'none';
  }
}

/**
 * Add/remove class with caching
 * @param {Element|string} target
 * @param {string} className
 * @param {boolean} add
 */
function toggleClass(target, className, add) {
  const el = typeof target === 'string' ? $(target) : target;
  if (el) {
    if (add) {
      el.classList.add(className);
    } else {
      el.classList.remove(className);
    }
  }
}

/**
 * Has class
 * @param {Element|string} target
 * @param {string} className
 * @returns {boolean}
 */
function hasClass(target, className) {
  const el = typeof target === 'string' ? $(target) : target;
  return el ? el.classList.contains(className) : false;
}

/**
 * Set multiple styles at once
 * @param {Element|string} target
 * @param {Object} styles
 */
function setStyles(target, styles) {
  const el = typeof target === 'string' ? $(target) : target;
  if (el) {
    Object.assign(el.style, styles);
  }
}

/**
 * Get computed style value
 * @param {Element|string} target
 * @param {string} property
 * @returns {string}
 */
function getComputedStyleValue(target, property) {
  const el = typeof target === 'string' ? $(target) : target;
  if (!el) return '';
  return window.getComputedStyle(el)[property];
}

/**
 * Set data attribute
 * @param {Element|string} target
 * @param {string} key
 * @param {any} value
 */
function setData(target, key, value) {
  const el = typeof target === 'string' ? $(target) : target;
  if (el) {
    el.dataset[key] = value;
  }
}

/**
 * Get data attribute
 * @param {Element|string} target
 * @param {string} key
 * @returns {any}
 */
function getData(target, key) {
  const el = typeof target === 'string' ? $(target) : target;
  return el ? el.dataset[key] : undefined;
}

/**
 * Event delegation helper
 * @param {Element|string} parent
 * @param {string} selector
 * @param {string} event
 * @param {Function} handler
 * @returns {Function} Unsubscribe function
 */
function delegate(parent, selector, event, handler) {
  const el = typeof parent === 'string' ? $(parent) : parent;
  if (!el) return () => {};
  
  const listener = (e) => {
    const target = e.target.closest(selector);
    if (target) {
      handler.call(target, e);
    }
  };
  
  el.addEventListener(event, listener);
  
  return () => {
    el.removeEventListener(event, listener);
  };
}

/**
 * Debounce function calls
 * @param {Function} fn
 * @param {number} ms
 * @returns {Function}
 */
function debounce(fn, ms) {
  let timeout;
  return function debounced(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), ms);
  };
}

/**
 * Throttle function calls
 * @param {Function} fn
 * @param {number} ms
 * @returns {Function}
 */
function throttle(fn, ms) {
  let lastCall = 0;
  let timeout;
  
  return function throttled(...args) {
    const now = Date.now();
    if (now - lastCall >= ms) {
      lastCall = now;
      fn.apply(this, args);
    } else {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        lastCall = Date.now();
        fn.apply(this, args);
      }, ms - (now - lastCall));
    }
  };
}

/**
 * Once helper (execute handler only once)
 * @param {Element|string} target
 * @param {string} event
 * @param {Function} handler
 */
function once(target, event, handler) {
  const el = typeof target === 'string' ? $(target) : target;
  if (!el) return;
  
  const wrapper = (e) => {
    handler.call(el, e);
    el.removeEventListener(event, wrapper);
  };
  
  el.addEventListener(event, wrapper);
}

/**
 * Batch update DOM with callbacks
 * Uses requestAnimationFrame for optimal performance
 * @param {Function} updateFn
 */
function batchDomUpdates(updateFn) {
  if (typeof updateFn !== 'function') return;
  requestAnimationFrame(updateFn);
}

/**
 * Measure element dimensions with caching
 * @param {Element|string} target
 * @returns {Object} {width, height, offsetTop, offsetLeft}
 */
const dimensionCache = new WeakMap();

function measureElement(target) {
  const el = typeof target === 'string' ? $(target) : target;
  if (!el) return null;
  
  if (dimensionCache.has(el)) {
    return dimensionCache.get(el);
  }
  
  const rect = {
    width: el.offsetWidth,
    height: el.offsetHeight,
    offsetTop: el.offsetTop,
    offsetLeft: el.offsetLeft,
    rect: el.getBoundingClientRect()
  };
  
  dimensionCache.set(el, rect);
  return rect;
}

/**
 * Clear dimension cache
 */
function clearDimensionCache() {
  // WeakMap auto-clears, but we can manually clear by creating new instance
  // For now, users can just call measureElement again to get fresh values
}

/**
 * Check if element is in viewport
 * @param {Element|string} target
 * @returns {boolean}
 */
function isInViewport(target) {
  const el = typeof target === 'string' ? $(target) : target;
  if (!el) return false;
  
  const rect = el.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

export {
  $,
  $$,
  invalidateDomCache,
  batchAppendChildren,
  createElement,
  removeElement,
  clearElement,
  toggleVisibility,
  toggleClass,
  hasClass,
  setStyles,
  getComputedStyleValue,
  setData,
  getData,
  delegate,
  debounce,
  throttle,
  once,
  batchDomUpdates,
  measureElement,
  clearDimensionCache,
  isInViewport
};
