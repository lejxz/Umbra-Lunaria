# Log 058 — All-Time Records in Member Detail & Activity UI Fixes

**Date:** 2026-07-22
**Time:** 07:07 PM (+08:00)

## Summary of Session
Added a full all-time ranking breakdown to the Member Detail Sheet so every member can see their personal Hall of Fame standing across all 5 categories. Also polished the Activity and War sections with a login streak badge and unified footer styling.

## Work Completed

### All-Time Records in Member Detail Sheet
- Raised `LIMIT` in `records-updater.ts` from `10` to `1000` so the daily batch now stores clan-wide ranks for every member (not just the visible top 5 on the Hall of Fame dashboard card).
- Added `hallOfFameRecords` to the schema imports in `member-queries.ts`.
- Updated `getMemberDetail` to fetch the member's Hall of Fame rows in parallel with the other queries and map them into a per-category `{ rank, valueLabel }` object.
- Added `hallOfFame` property to the `MemberDetailView` interface in `lib/view-models/members.ts`.
- Added `HallOfFameSection` component to `components/members/member-detail-sheet.tsx` rendering a 5-column grid (matching Activity Score layout) with the member's raw value and their clan rank badge (👑 gold for #1, silver #2, bronze #3, purple for all others). Section is hidden entirely if the member has no records yet.

### Activity Section — Login Streak Badge
- Computed current consecutive-day login streak from the heatmap `buckets` array (reversed, counting from most recent).
- Displayed as `X day login streak` in `text-emerald-400 font-mono text-xs` aligned to the right of the summary line — identical styling to "0% participation" in the War section.

### Footer Meta Row Unification
- Replaced the nested `div > div` structure in both the Activity and War footer rows with a flat, consistent inline layout: `LABEL Value | LABEL Value`.
- Replaced the old purple pill box for "Current war: 0/2 attacks used" with the same plain inline text row used by "Last active" and "Tracking".

### Build Fix
- Fixed a TypeScript build error where `hallOfFame` was returned by `getMemberDetail` but not declared in the `MemberDetailView` interface, causing Vercel to reject the build.

## Decisions Made
- Storing all 1000 ranks instead of 10 adds negligible DB storage (clan is capped at 50 members) but unlocks per-member breakdown views without any additional computation.
- Hiding `HallOfFameSection` entirely when all fields are null keeps the popup clean for brand-new members with no tracked history.
- Matched the login streak badge style to the war participation badge exactly so the two sections feel like a matched pair.

## Next Action
Continue with any further UI polish or feature additions as requested.
