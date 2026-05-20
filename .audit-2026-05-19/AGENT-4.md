# Agent 4: Code Duplication & Patterns Analysis

## Findings

### P1: Repeated fetch patterns (live.js, lookup.js, script.js)
- Fetch boilerplate duplicated 5+ times
- No centralized API client
- Inconsistent error handling between duplicates
- Suggestion: Create fetch utility function with consistent error handling

### P1: Repeated XP calculation logic (multiple files)
- RS3 XP calculations appear in goals.js, major-goals.js, combat.js
- Risk: Different implementations have different accuracy
- Suggestion: Extract to utils/xp.js with single source of truth

### P1: Repeated DOM manipulation patterns
- querySelector, textContent updates scattered throughout
- No component abstraction
- Suggestion: Create helper functions for DOM updates

### P2: Repeated array filtering logic
- Player filtering, sorting for leaderboards
- Multiple implementations with subtle differences
- Suggestion: Create utils/filters.js with standardized implementations

### P2: localStorage usage patterns duplicated
- Similar get/set/clear patterns in multiple files
- No abstraction layer
- Suggestion: Create storage.js wrapper

### P1: CSS class name duplicates
- .hidden, .active, .error used across multiple stylesheets
- No CSS architecture/BEM naming
- Suggestion: Implement BEM naming, consolidate utility classes

## Recommendations
- Create utils/ directory with centralized helpers
- Extract API client, XP calculations, DOM helpers
- Implement design system for CSS utilities
- Use code metrics to identify duplication patterns
