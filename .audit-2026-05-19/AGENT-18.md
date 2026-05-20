# Agent 18: RuneScape Domain Accuracy Analysis

## Findings

### P1: XP table may not match RS3 wiki
- Exact XP values per level must match game
- Off-by-one errors cause wrong level calculations
- Suggestion: Cross-reference all 120 levels against wiki

### P1: Skill caps not accurate
- Some skills cap at 99, some at 120
- Code may treat all as 99
- Suggestion: Add skill-specific level caps

### P1: Quest requirements not validated
- Quest prerequisites may be wrong
- Affects quest completion logic
- Suggestion: Update against official quest wiki

### P1: Ability rotations not RS3-accurate
- Combat ability sequences may not match game
- DPS calculations therefore wrong
- Suggestion: Add ability rotation reference data

### P1: Special attacks not handled
- Some weapons have special attacks
- Not accounted for in DPS
- Suggestion: Add special attack handler

### P1: GE price data may be stale
- GE prices change daily
- Cached old prices give wrong net worth
- Suggestion: Update GE data daily

## Recommendations
- Audit all XP tables against RS3 wiki
- Document skill-specific level caps
- Validate quest requirements
- Add ability rotation database
- Implement daily GE price updates
