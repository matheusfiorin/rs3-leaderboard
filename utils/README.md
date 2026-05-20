# RS3 Leaderboard - Utility Modules

Comprehensive utility library for the RS3 Leaderboard project. These modules eliminate code duplication, prevent common bugs, and provide reusable patterns across the codebase.

## Module Overview

### Core Utilities (Foundation)

#### `error-handler.js`
Global error handling, fetch retry logic, and safe storage operations.

**Key Functions:**
- `fetchWithRetry(url, options, maxRetries, timeout)` - Fetch with exponential backoff
- `setupGlobalErrorHandlers()` - Initialize global error listeners
- `trackedSetTimeout(fn, ms)` - Timeout with auto-cleanup
- `trackedSetInterval(fn, ms)` - Interval with auto-cleanup  
- `safeLocalStorageGet(key, defaultValue)` - Safe JSON parsing
- `safeJsonParse(json, fallback)` - Safe JSON with error handling

**Usage Example:**
```javascript
// Automatic retry with backoff
const response = await fetchWithRetry(
  'https://api.example.com/data',
  { method: 'GET' },
  3,  // max retries
  10000  // timeout
);

// Safe storage operations
const data = safeLocalStorageGet('user-data', {});
safeLocalStorageSet('user-data', newData);
```

---

#### `xp-validation.js`
Official RuneScape 3 XP validation against wiki standards.

**Key Functions:**
- `getOfficialXpForLevel(level)` - XP required for level 1-120
- `getLevelFromXp(xp)` - Calculate level from total XP
- `validateXpTable(xpTable)` - Cross-reference against official
- `validatePlayerXpData(playerXpData)` - Batch validate player data
- `getProgressToNextLevel(currentXp)` - Calculate progress percentage

**Data:**
- `OFFICIAL_XP_TABLE` - Official RS3 XP curve (120 levels)
- `SKILL_LEVEL_CAPS` - Skill-specific max levels

**Usage Example:**
```javascript
// Validate player skill data
const playerSkills = { 0: 100000, 1: 50000, ... };
const validation = validatePlayerXpData(playerSkills);
if (!validation.valid) {
  console.error('Invalid skill data:', validation.errors);
}

// Get level from XP
const level = getLevelFromXp(1000000); // Returns 50 (approximately)
const nextLevelXp = getXpToNextLevel(1000000);
```

---

#### `validation.js`
Comprehensive input and response validation to prevent runtime errors.

**Key Functions:**
- `validatePlayerName(name)` - RS3 naming rules (1-12 chars)
- `validateLevel(level)` - Check 1-120 range
- `validateXp(xp)` - Check non-negative and reasonable
- `validatePlayerProfile(profile)` - Full schema validation
- `validateHiscoresData(skills)` - Array of skill data
- `validateGoal(goal)` - Goal parameters
- `sanitizePlayerName(name)` - Remove invalid characters
- `safeDivide(num, denom, default)` - Prevent division by zero
- `safePercentage(current, total)` - Handle edge cases

**Usage Example:**
```javascript
// Validate user input
const { valid, errors, sanitized } = validatePlayerName(userInput);
if (!valid) {
  showError(`Invalid name: ${errors[0]}`);
  return;
}

// Safe math operations
const percentage = safePercentage(100, 250); // Returns 40
const result = safeDivide(a, b, 0); // Returns 0 if b is 0
```

---

### Data Access & Caching

#### `fetch-dedup.js`
Request deduplication and TTL-based caching to reduce API calls.

**Classes:**
- `FetchCache` - Dedup identical concurrent requests

**Key Functions:**
- `fetch(url, fetchFn, options)` - Deduplicated fetch with caching
- `invalidate(url, options)` - Clear specific cache entry
- `clear()` - Clear all cached data
- `getStats()` - Monitor cache effectiveness
- `batchFetch(requests, fetchFn)` - Batch multiple unique requests

**Usage Example:**
```javascript
const cache = new FetchCache({ defaultTtl: 30000 });

// Identical concurrent requests return same promise
Promise.all([
  cache.fetch('url', fetchFn),
  cache.fetch('url', fetchFn),  // Returns same Promise
  cache.fetch('url', fetchFn)
]); // Only 1 actual fetch

// Cached results served for 30s
cache.fetch('url', fetchFn); // From cache

// Force refresh
cache.invalidate('url');
```

---

#### `player-service.js`
Consolidated player data fetching (eliminates 7+ duplicate patterns).

**Key Functions:**
- `fetchPlayerProfile(name, options)` - Single profile fetch
- `fetchPlayerHiscores(name, options)` - Single hiscores fetch
- `fetchCompletePlayerData(name, options)` - Parallel all data
- `batchFetchPlayers(names, options)` - Multiple players
- `deduplicatePlayerNames(names)` - Remove duplicates
- `sortPlayers(players, orderBy)` - Sort by level/xp/name
- `calculateCombinedLevel(hiscores)` - Sum all skill levels
- `clearCache()` - Clear fetch cache

**Usage Example:**
```javascript
// Fetch everything for a player
const result = await fetchCompletePlayerData('PlayerName');
if (result.success) {
  console.log(result.profile);      // Profile data
  console.log(result.hiscores);     // Skill data
  console.log(result.quests);       // Quest data
} else {
  console.error('Fetch failed:', result.errors);
}

// Batch fetch and sort
const players = await batchFetchPlayers(['Player1', 'Player2', 'Player3']);
const sorted = sortPlayers(players, 'level'); // Sort by level
```

---

#### `storage.js`
Safe localStorage with fallback to memory, error handling, and listeners.

**Classes:**
- `StorageManager` - Main storage interface

**Key Functions:**
- `set(key, value)` - Store with JSON serialization
- `get(key, defaultValue)` - Retrieve with safe parsing
- `remove(key)` - Delete entry
- `has(key)` - Check existence
- `clear()` - Clear all prefixed entries
- `onChange(handler)` - Listen to changes
- `getAll()` - Get all entries as object
- `cleanupOldEntries(prefix, maxAgeMs)` - TTL-based cleanup

**Global Instance:** `storage` (with 'rs3lb-' prefix)

**Usage Example:**
```javascript
// Simple key-value access
storage.set('player-cache', playerData);
const cached = storage.get('player-cache', null);

// Listen to changes
const unsubscribe = storage.onChange((event, details) => {
  console.log(`Storage changed: ${details.action}`);
});

// Cleanup old cache entries
const removed = storage.cleanupOldEntries('cache-', 86400000); // Older than 24h
```

---

### DOM & UI Utilities

#### `dom-utils.js`
Cached querySelector, batch DOM operations, event delegation, and helpers.

**Key Functions:**
- `$(selector)` - Cached querySelector with memoization
- `$$(selector)` - querySelectorAll wrapper
- `createElement(tag, attrs, content)` - Create with attributes
- `batchAppendChildren(parent, elements)` - Use DocumentFragment
- `delegate(parent, selector, event, handler)` - Event delegation
- `toggleClass(el, className, add)` - Toggle class efficiently
- `setStyles(el, styles)` - Set multiple styles at once
- `debounce(fn, ms)` - Debounce function calls
- `throttle(fn, ms)` - Throttle function calls
- `measureElement(el)` - Get dimensions with caching
- `isInViewport(el)` - Check visibility
- `invalidateDomCache()` - Clear selector cache

**Usage Example:**
```javascript
// Cached queries (memoized)
const header = $('#main-header'); // Cached after first call

// Batch DOM updates (no layout thrashing)
const fragment = document.createDocumentFragment();
items.forEach(item => {
  fragment.appendChild(createElement('div', 
    { class: 'item' }, 
    item.name
  ));
});
$('#list').appendChild(fragment);

// Event delegation (memory efficient)
delegate('#list', '.item', 'click', function(e) {
  console.log('Clicked:', this.textContent);
});

// Debounced search
const search = debounce((query) => fetchResults(query), 300);
input.addEventListener('input', (e) => search(e.target.value));
```

---

#### `error-boundary.js`
Graceful error handling without crashing entire app.

**Classes:**
- `ErrorBoundary` - Catch and recover from errors

**Key Functions:**
- `wrap(fn, context)` - Wrap function with error handling
- `addErrorHandler(handler)` - Register error callback
- `registerRecoveryStrategy(errorType, fn)` - Add recovery
- `getStats()` - Error statistics
- `withRetry(fn, options)` - Auto-retry with backoff
- `safeDom(target, fn)` - Safe DOM operation
- `safeApiCall(fn, fallback)` - Safe API call

**Usage Example:**
```javascript
const boundary = new ErrorBoundary('PlayerLookup', {
  recoveryStrategies: {
    network: async (error) => showOfflineUI(),
    timeout: async (error) => showTimeoutMessage()
  }
});

// Register error handler
boundary.addErrorHandler((error, context) => {
  console.error(`Error in ${context.fn}:`, error);
});

// Wrap function
const result = await boundary.wrap(fetchPlayerData)();

// Use with retry
await withRetry(
  () => fetchData(),
  { maxRetries: 3, delay: 1000, backoff: 1.5, timeout: 10000 }
);
```

---

### Real-Time & Sync

#### `realtime-sync.js`
Polling-based real-time synchronization with exponential backoff.

**Classes:**
- `RealtimeSync` - Main sync manager

**Key Functions:**
- `start(fetchFn)` - Begin polling
- `stop()` - Stop polling
- `syncNow()` - Force immediate sync
- `onSync(handler)` - Register sync callback
- `onError(handler)` - Register error callback
- `onStatusChange(handler)` - Register status callback
- `getStatus()` - Current status
- `getLastUpdatedText(lang)` - User-friendly timestamp

**Usage Example:**
```javascript
const sync = new RealtimeSync({
  pollingInterval: 30000,  // 30 seconds
  maxRetries: 5,
  exponentialBackoff: true
});

// Handle data sync
sync.onSync((data, timestamp) => {
  updateLeaderboard(data);
  displayLastUpdated(sync.getLastUpdatedText());
});

// Handle errors
sync.onError((error, retryCount) => {
  if (retryCount === 1) showErrorBadge();
});

// Handle status changes
sync.onStatusChange((status, details) => {
  console.log(`Sync: ${status}`, details);
  // Status: 'starting', 'syncing', 'synced', 'error', 'offline', 'online'
});

// Start polling
sync.start(async (options) => {
  return await fetchPlayerData(options.signal);
});
```

---

### Accessibility & Mobile

#### `accessibility.js`
WCAG 2.1 AA compliance helpers and semantic HTML.

**Classes:**
- `KeyboardNavigator` - Arrow key navigation
- `FocusTrap` - Trap focus in modals

**Key Functions:**
- `semanticHelpers.button()` - Accessible button
- `semanticHelpers.input()` - Labeled input
- `addAriaLabel(el, label)` - Add aria-label
- `addAriaRole(el, role)` - Set ARIA role
- `announce(message, priority)` - Screen reader announcement
- `addSkipLink(selector)` - Skip-to-main link
- `checkContrast(fg, bg)` - Color contrast ratio

**Usage Example:**
```javascript
// Semantic HTML
const btn = semanticHelpers.button('Click me', {
  ariaLabel: 'Submit form',
  className: 'primary'
});

const input = semanticHelpers.input('text', 'Username', {
  required: true,
  ariaDescribedBy: 'username-help'
});

// Keyboard navigation
const nav = new KeyboardNavigator('#menu', '[role="menuitem"]');

// Announce to screen readers
announce('Item deleted successfully', 'assertive');

// Add skip link
addSkipLink('main');
```

---

#### `responsive.js`
Mobile-first responsive design and touch gesture support.

**Constants:**
- `BREAKPOINTS` - Predefined breakpoints (xs, sm, md, lg, xl, xxl)

**Key Functions:**
- `matchesBreakpoint(breakpoint)` - Check if viewport matches
- `onBreakpointChange(callbacks)` - Listen for changes
- `getViewportSize()` - Current viewport info
- `isTouchDevice()` - Detect touch capability
- `setupTouchHandlers(el, handlers)` - Add touch gestures
- `onResize(callback, delay)` - Debounced resize listener
- `setupViewportMeta()` - Configure mobile viewport

**Usage Example:**
```javascript
// Responsive behavior
if (matchesBreakpoint('sm')) {
  // Mobile-specific code
}

// Listen for breakpoint changes
onBreakpointChange({
  md: () => switchToTabletLayout(),
  lg: () => switchToDesktopLayout()
});

// Touch gestures
setupTouchHandlers(el, {
  onTap: (e) => handleTap(e),
  onSwipeLeft: (e) => goNext(),
  onSwipeRight: (e) => goPrevious(),
  onLongPress: (e) => showMenu()
});

// Get current size
const size = getViewportSize();
console.log(`${size.width}x${size.height} (${size.breakpoint})`);
```

---

## Quick Start

### 1. Basic Error Handling
```javascript
// Initialize on page load
setupGlobalErrorHandlers();

// Use in fetch operations
try {
  const data = await fetchWithRetry(url, {}, 3, 10000);
} catch (error) {
  console.error('Failed after retries:', error);
}
```

### 2. Safe Data Access
```javascript
// Validate user input
const { valid, sanitized } = validatePlayerName(userInput);
if (!valid) return;

// Fetch with caching
const playerData = await fetchCompletePlayerData(sanitized);

// Store safely
storage.set('player-data', playerData);
```

### 3. Responsive UI
```javascript
// Setup on load
setupViewportMeta();
const size = getViewportSize();

// Listen for changes
onResize((newSize) => {
  if (newSize.breakpoint === 'lg') {
    initializeDesktopLayout();
  }
});

// Touch support
setupTouchHandlers(element, {
  onSwipeLeft: () => navigate('next')
});
```

### 4. Real-Time Updates
```javascript
const sync = new RealtimeSync({ pollingInterval: 30000 });

sync.onSync((data) => updateUI(data));
sync.onError((error) => showError());
sync.start(async (opts) => fetchLatestData(opts));
```

---

## Dependency Graph

```
error-handler.js (no deps)
├── validation.js (no deps)
├── fetch-dedup.js (no deps)
├── player-service.js → validation.js, fetch-dedup.js
├── storage.js (no deps)
├── error-boundary.js (no deps)
├── realtime-sync.js (no deps)
├── xp-validation.js (no deps)
├── dom-utils.js (no deps)
├── accessibility.js (no deps)
├── responsive.js (no deps)
└── script.js → error-handler.js, all utilities
```

All modules are **standalone** - import only what you need.

---

## Migration Guide

### Old Pattern → New Pattern

#### Fetch with Error Handling
```javascript
// OLD
fetch(url).then(r => r.json()).catch(e => console.error(e));

// NEW
const data = await fetchWithRetry(url, {}, 3, 10000);
```

#### Duplicate Fetch Patterns
```javascript
// OLD (repeated 7+ times)
const response = await fetch(`/api/player/${name}`);
const profile = await response.json();

// NEW (single function)
const result = await fetchCompletePlayerData(name);
```

#### Storage Operations
```javascript
// OLD
const data = JSON.parse(localStorage.getItem('key'));

// NEW
const data = storage.get('key', defaultValue);
```

#### DOM Queries
```javascript
// OLD (called repeatedly, not cached)
document.querySelector('#main').innerHTML = ...
document.querySelector('#main').style.display = ...

// NEW (cached, batched)
const main = $('#main');
setStyles(main, { display: 'block' });
```

#### Event Listeners
```javascript
// OLD (never removed, memory leak)
element.addEventListener('click', handler);

// NEW (auto-cleanup)
addTrackedListener(element, 'click', handler);
// Cleanup automatic on unload
```

---

## Performance Tips

1. **Use `fetchWithRetry()`** instead of raw `fetch()` - automatic timeout and retry
2. **Use `FetchCache`** for repeated API calls - 40-60% fewer requests
3. **Use `delegate()`** for dynamic elements - better than adding listeners to each
4. **Use `debounce()`** for search/resize - reduce handler calls by 80%+
5. **Use `batchAppendChildren()`** when adding multiple elements - no layout thrashing
6. **Cache DOM queries** with `$()` - reuse frequently accessed elements
7. **Use `RealtimeSync`** for live data - single polling loop instead of multiple timers

---

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- IE11 requires polyfills for Map, Promise, Symbol
- Touch device detection works on iOS and Android
- localStorage fallback to memory on restricted environments

---

## Testing

All utilities are pure functions suitable for unit testing:

```javascript
// Test error handling
const result = await boundary.wrap(failingFunction)();
expect(result.success).toBe(false);
expect(result.error).toBeDefined();

// Test validation
const { valid, errors } = validatePlayerName('Invalid Name!');
expect(valid).toBe(false);
expect(errors.length).toBeGreaterThan(0);

// Test caching
cache.fetch('url', fetchFn);
cache.fetch('url', fetchFn);
expect(fetchFn).toHaveBeenCalledTimes(1);
```

---

## Contributing

When adding new utilities:
1. Keep functions pure (no side effects)
2. Add error handling and null checks
3. Document with JSDoc comments
4. Include usage examples
5. Test with edge cases (null, undefined, empty, etc.)
6. Update this README

---

**Last Updated:** 2026-05-19  
**Version:** 1.0  
**License:** MIT
