# Log 075: UI Upgrades and Activity Bug Fix
Date: 2026-07-24

## 1. War Hero Card Premium UI Redesign
- Redesigned the "Current war" hero card into a unified "VS Arena" layout.
- Fixed a critical `maxPossibleStars` calculation bug where it incorrectly used `teamSize * attacksPerMember` instead of `teamSize * 3`.
- Replaced the large top countdown box with a centralized matchup column containing the state badge, countdown, and lead analysis.
- Created a split "Tug of War" progress bar using dynamic gradients for the clan and opponent based on star percentages.
- Added atmospheric glowing auras (`radial-gradient`) behind the winning clan to communicate momentum.

## 2. Members Roster Activity Bug Fix
- **Issue:** The Activity column on the Members page was showing a gray circle with "Jul 24" for all members, including inactive ones (e.g., KnieieGurow).
- **Cause:** The `getLatestActivity` query in `lib/db/member-queries.ts` was simply pulling the most recent snapshot for each player (which would be today) and setting `lastActiveAt` to that date, regardless of whether `activityFlag` was true or false.
- **Fix:** Modified the query to filter by `eq(memberSnapshots.activityFlag, true)`. This ensures that `lastActiveAt` now accurately reflects the timestamp of the member's *last active* snapshot. Members who have not been active recently will now correctly show as inactive, and those who have never been active in recorded history will gracefully default to a `—` state.
