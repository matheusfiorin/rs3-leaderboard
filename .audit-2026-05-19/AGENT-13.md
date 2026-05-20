# Agent 13: Data Validation Analysis

## Findings

### P1: JSON parsing without error handling
- JSON.parse() can throw, no try-catch visible
- Corrupted data files cause crashes
- Suggestion: Wrap JSON.parse in try-catch

### P1: Schema validation missing
- Data loaded from API/files without shape validation
- Silent failures if data structure wrong
- Suggestion: Add zod or similar schema validator

### P1: GE price data not validated
- Prices could be NaN, negative, or missing
- Used in calculations without checks
- Suggestion: Validate prices > 0 before use

### P1: Player hiscores not validated
- Level/XP values assumed to be numbers
- No checks for out-of-range values (>99)
- Suggestion: Add range validation

### P1: Quest progress not validated
- Quest data structure not enforced
- Could cause calculation errors
- Suggestion: Add quest schema validation

## Recommendations
- Add schema validation library (zod)
- Wrap all JSON.parse() in try-catch
- Validate all API responses
- Validate price data (> 0)
- Document expected data shapes
