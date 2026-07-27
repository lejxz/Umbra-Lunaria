# Log 103 — Super Troops as In-Tab Section, Troop Launcher Siege Fix

**Date:** 2026-07-27
**Time:** 07:05 AM (+08:00)

## Summary of Session
Two corrections to the progression cards from log 102: (1) super troops should
be a sub-section within the Troops tab (before siege), not a separate tab;
(2) "Troop Launcher" (and "Sky Wagon") are siege machines but were missing
from `SIEGE_MACHINE_NAMES`, so they rendered in the regular Troops section.

## Work Completed

### 1. Super troops back inside the Troops tab
- `components/members/member-detail-sheet.tsx` `ProgressionSection` — removed
  the conditional "Super Troops" tab. The `troops` category now has three
  groups in order: "Troops" (regular), "Super Troops (boosted)" (only when the
  member has super troops), "Siege Machines". The tab count includes all three.
- This matches the user's intent: super troops grouped, but not a separate tab.

### 2. Troop Launcher + Sky Wagon classified as siege
- `SIEGE_MACHINE_NAMES` — added `"Troop Launcher"` and `"Sky Wagon"`. Both are
  siege machines in the CoC API but were absent from the set, so they landed in
  the regular Troops section. Now they correctly group under "Siege Machines".

## Verification
- `bun run typecheck` → clean.
- `bun run lint` → 0 errors, 2 pre-existing warnings.
- `bun run test` → 149/149 pass.
- `/members` returns 200.

## Decisions Made
- Kept the super-troop group conditional (`superTroops.length > 0`) so members
  with no active super troops don't see an empty "Super Troops (boosted)"
  heading — the group simply doesn't render.
- Added `Sky Wagon` alongside `Troop Launcher` since it's also a siege machine
  (the Siege Barracks' airborne variant) and was equally missing from the set.

## Next Action
None — both corrections are complete and verified.
