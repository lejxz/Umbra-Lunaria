# Log 043 — Redesign Member Detail + Implement Rushed Analysis

**Date:** 2026-07-22
**Time:** 02:12 AM (+08:00)

## Summary of Session

Pulled recent changes (logs 039-042 with clan identity redesigns). Reviewed the codebase for hardcoded values — found hardcoded `"Asia/Manila"` timezone strings throughout components (should use `clanConfig.timezone` but that's a larger refactor). Redesigned the member detail popup: merged Career section into Profile, improved Activity section, implemented rushed analysis using the API's `maxLevel` field (no longer requires separate cap reference files), and redesigned all sections for consistency. Updated concept/06 and the implementation plan.

## Work Completed

### Rushed analysis — implemented using API maxLevel
- Created `lib/scoring/rushed.ts` with `computeRushed()` function
- Formula: `rushed_percent = sum(max(0, maxLevel_i - level_i)) / sum(maxLevel_i) × 100`
- Uses the API's `maxLevel` field (global max, not TH-specific) — no separate cap reference files needed
- Added `computeRushedFromProgression()` in `lib/db/member-queries.ts`
- Rushed section now shows real data: overall percentage + per-category breakdown (troops, heroes, equipment, spells, pets)
- Color-coded: green (<10%), amber (10-30%), red (>30%)
- Verified live: Yeon (TH17) = 30.8% overall rushed, troops 46%, heroes 26%, equipment 23%, spells 27%, pets 35%
- 6 unit tests in `tests/lib/rushed.test.ts`

### Profile section — merged with Career
- Merged Career stats (war stars, attack wins, defense wins, capital contrib) directly into Profile
- New layout: 4 rows of 4 stats each (16 total cells):
  - Row 1: Role, Exp level, Clan rank, Joined date
  - Row 2: Trophies, Best trophies, League tier, War pref
  - Row 3: War stars (amber), Attack wins (emerald), Defense wins (red), Capital contrib
  - Row 4 (if BB): Builder Hall, BB trophies, Best BB
- Career stats get color accents (war stars=amber, attack wins=emerald, defense wins=red)
- Removed the separate CareerSection — it's now part of Profile
- Footer note: "Career values are lifetime Supercell totals"

### Activity section — redesigned
- 4-column stat row: Last active, Tracking started, Login days (30d), Active days (30d)
- Activity grid with legend (active=purple, inactive=dim)
- Color accents on login days (purple) and active days (emerald)
- Partial data warning

### Other sections — redesigned for consistency
- **Donations**: Same 3 donation cells + 2 stats + chart + 4-component score grid
- **War participation**: 2 rows of 4 stats (8 total), color accents (missed=amber, stars=amber, 3-star=emerald)
- **Progression**: Same compact grid (8/10/12 cols), in-game style cards
- **Rushed**: Big overall % with color tone, 5-column category breakdown
- **Achievements**: Same expandable list, now at the end (after Rushed)

### Section order
New order: Profile → Activity → Donations → War → Progression → Rushed → Achievements

### Docs updated
- `concept/06-members.md` §7: Updated rushed analysis to note it uses API maxLevel, not TH-specific cap files
- `concept/12-Implemantation-plan-and-modularity.md` Step 3.0: Checked off rushed implementation items, noted TH-specific caps as future enhancement

### Code quality
- Removed unused `Link` imports from capital-summary-card, current-war-card, war-record-card
- Hardcoded `"Asia/Manila"` timezone noted but not fully refactored (would require changes across 10+ files — deferred)

## Hardcoded values review

Found hardcoded `"Asia/Manila"` timezone in 10+ component files. The `clanConfig.timezone` value is available but not used in UI components. This is a known tech debt item — the timezone is only configurable at the config level, not dynamically from runtime settings. A full refactor would involve:
1. Creating a shared `formatDate()` utility that reads from clanConfig
2. Replacing all inline `timeZone: "Asia/Manila"` calls
3. This is deferred to a future cleanup pass

## Next Action

Proceed to Step 1.4: Implement War Center.
