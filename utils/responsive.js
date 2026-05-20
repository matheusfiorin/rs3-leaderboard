/**
 * Responsive Design Utilities
 * Mobile-first approach with media query helpers
 */

// Breakpoint definitions
const BREAKPOINTS = {
  xs: 320,    // Mobile small
  sm: 576,    // Mobile
  md: 768,    // Tablet
  lg: 992,    // Desktop
  xl: 1200,   // Desktop large
  xxl: 1400   // Desktop extra large
};

/**
 * Media query helper
 * @param {string} breakpoint - Breakpoint name
 * @returns {string} CSS media query
 */
function getMediaQuery(breakpoint) {
  const width = BREAKPOINTS[breakpoint];
  if (!width) {
    console.warn(`Unknown breakpoint: ${breakpoint}`);
    return '';
  }
  return `(min-width: ${width}px)`;
}

/**
 * Check if viewport matches breakpoint
 * @param {string} breakpoint
 * @returns {boolean}
 */
function matchesBreakpoint(breakpoint) {
  const query = getMediaQuery(breakpoint);
  if (!query) return false;
  return window.matchMedia(query).matches;
}

/**
 * Setup responsive listeners
 * @param {Object} callbacks - {breakpoint: callback, ...}
 * @returns {Function} Unsubscribe
 */
function onBreakpointChange(callbacks) {
  const listeners = new Map();

  Object.entries(callbacks).forEach(([breakpoint, callback]) => {
    const query = getMediaQuery(breakpoint);
    if (!query) return;

    const mq = window.matchMedia(query);
    
    const handler = (e) => {
      if (e.matches) {
        callback(breakpoint);
      }
    };

    mq.addListener(handler);
    listeners.set(breakpoint, { mq, handler });
  });

  // Return unsubscribe function
  return () => {
    listeners.forEach(({ mq, handler }) => {
      mq.removeListener(handler);
    });
  };
}

/**
 * Get current viewport size
 * @returns {Object} {width, height, breakpoint}
 */
function getViewportSize() {
  const width = Math.max(
    document.documentElement.clientWidth,
    window.innerWidth || 0
  );
  const height = Math.max(
    document.documentElement.clientHeight,
    window.innerHeight || 0
  );

  let breakpoint = 'xs';
  if (width >= BREAKPOINTS.xxl) breakpoint = 'xxl';
  else if (width >= BREAKPOINTS.xl) breakpoint = 'xl';
  else if (width >= BREAKPOINTS.lg) breakpoint = 'lg';
  else if (width >= BREAKPOINTS.md) breakpoint = 'md';
  else if (width >= BREAKPOINTS.sm) breakpoint = 'sm';

  return { width, height, breakpoint };
}

/**
 * Check if device is touch-enabled
 * @returns {boolean}
 */
function isTouchDevice() {
  return (
    !!(typeof window !== 'undefined' &&
      ('ontouchstart' in window ||
        (window.DocumentTouch && document instanceof window.DocumentTouch) ||
        navigator.maxTouchPoints > 0 ||
        navigator.msMaxTouchPoints > 0))
  );
}

/**
 * Setup touch-specific handlers
 * @param {Element} element
 * @param {Object} handlers - {onTap, onSwipeLeft, onSwipeRight, onLongPress}
 * @returns {Function} Unsubscribe
 */
function setupTouchHandlers(element, handlers = {}) {
  if (!element) return () => {};

  let touchStartX = 0;
  let touchStartY = 0;
  let touchStartTime = 0;
  let touchTimeout = null;

  const SWIPE_THRESHOLD = 50;
  const LONG_PRESS_TIME = 500;

  const handleTouchStart = (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    touchStartTime = Date.now();

    if (handlers.onLongPress) {
      touchTimeout = setTimeout(() => {
        handlers.onLongPress(e);
      }, LONG_PRESS_TIME);
    }
  };

  const handleTouchEnd = (e) => {
    clearTimeout(touchTimeout);

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const duration = Date.now() - touchStartTime;

    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;
    const isSwipe = Math.abs(deltaX) > SWIPE_THRESHOLD && Math.abs(deltaY) < 100;

    if (duration < LONG_PRESS_TIME && isSwipe) {
      if (deltaX < 0 && handlers.onSwipeLeft) {
        handlers.onSwipeLeft(e);
      } else if (deltaX > 0 && handlers.onSwipeRight) {
        handlers.onSwipeRight(e);
      }
    } else if (duration < 200 && !isSwipe && handlers.onTap) {
      handlers.onTap(e);
    }
  };

  element.addEventListener('touchstart', handleTouchStart, false);
  element.addEventListener('touchend', handleTouchEnd, false);

  return () => {
    element.removeEventListener('touchstart', handleTouchStart);
    element.removeEventListener('touchend', handleTouchEnd);
  };
}

/**
 * Debounce resize listener
 * @param {Function} callback
 * @param {number} delay
 * @returns {Function} Unsubscribe
 */
function onResize(callback, delay = 250) {
  let timeoutId;

  const handler = () => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      callback(getViewportSize());
    }, delay);
  };

  window.addEventListener('resize', handler);

  return () => {
    window.removeEventListener('resize', handler);
    clearTimeout(timeoutId);
  };
}

/**
 * Orientatio change listener
 * @param {Function} callback
 * @returns {Function} Unsubscribe
 */
function onOrientationChange(callback) {
  const handler = () => {
    setTimeout(() => {
      callback({
        orientation: window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'
      });
    }, 100);
  };

  window.addEventListener('orientationchange', handler);
  
  return () => {
    window.removeEventListener('orientationchange', handler);
  };
}

/**
 * Viewport meta tag configuration
 */
function setupViewportMeta() {
  let meta = document.querySelector('meta[name="viewport"]');
  
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'viewport';
    document.head.appendChild(meta);
  }
  
  meta.content = 'width=device-width, initial-scale=1.0, viewport-fit=cover';
}

/**
 * Safe area insets (for notched devices)
 */
const safeAreaStyles = `
:root {
  --safe-area-inset-top: max(0px, env(safe-area-inset-top));
  --safe-area-inset-right: max(0px, env(safe-area-inset-right));
  --safe-area-inset-bottom: max(0px, env(safe-area-inset-bottom));
  --safe-area-inset-left: max(0px, env(safe-area-inset-left));
}

body {
  padding-top: var(--safe-area-inset-top);
  padding-right: var(--safe-area-inset-right);
  padding-bottom: var(--safe-area-inset-bottom);
  padding-left: var(--safe-area-inset-left);
}
`;

/**
 * Mobile-first responsive utilities CSS
 */
const responsiveStyles = `
/* Responsive grid */
.grid {
  display: grid;
  gap: 1rem;
}

@media (min-width: 576px) {
  .grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 992px) {
  .grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: 1200px) {
  .grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

/* Responsive typography */
@media (max-width: 575.98px) {
  html {
    font-size: 14px;
  }
  
  h1 { font-size: 1.5rem; }
  h2 { font-size: 1.25rem; }
  h3 { font-size: 1.1rem; }
}

/* Tap target minimum */
@media (max-width: 992px) {
  button, a, input, select, textarea {
    min-height: 48px;
    min-width: 48px;
  }
}

/* Stack on mobile */
.flex-row {
  display: flex;
  flex-direction: column;
}

@media (min-width: 768px) {
  .flex-row {
    flex-direction: row;
  }
}

/* Hide on small screens */
.hide-sm {
  display: none;
}

@media (min-width: 576px) {
  .hide-sm {
    display: block;
  }
}

/* Hide on large screens */
.hide-lg {
  display: block;
}

@media (min-width: 992px) {
  .hide-lg {
    display: none;
  }
}
`;

export {
  BREAKPOINTS,
  getMediaQuery,
  matchesBreakpoint,
  onBreakpointChange,
  getViewportSize,
  isTouchDevice,
  setupTouchHandlers,
  onResize,
  onOrientationChange,
  setupViewportMeta,
  safeAreaStyles,
  responsiveStyles
};
