# Log 005 — Dashboard Alignment Fixes

**Date:** 2026-07-20
**Time:** 06:20 PM (+08:00)

## Summary of Session

Reconciled the dashboard implementation with the concept requirements identified during review. Fixed weekly donation reset accounting, added clan-log click-through behavior, converted dashboard navigation strips into links, and reformatted the dashboard panel code for maintainability.

## Work Completed
- Changed donation aggregation to sum positive deltas across every consecutive snapshot pair, preserving contributions on both sides of weekly counter resets.
- Added a clickable `ClanLog` client component using the shared `Modal`, including a retention-aware removed-data message for old left-member entries.
- Added `/war` and `/capital` navigation links to the dashboard strips.
- Reformatted `dashboard-panels.tsx` into reviewable multi-line JSX and added comments where reset behavior is non-obvious.
- Reviewed the existing `Sheet` export in `components/ui/modal.tsx`; it does exist in the current repository, so the earlier session note was verified rather than changed.

## Decisions Made
- Kept donation reset handling in the query layer because ingestion records raw snapshots and the dashboard owns windowed aggregation.
- Used the existing modal surface for clan-log details to keep member interactions consistent with the planned Step 1.2 member popup.
- Treat entries older than the configured 14-day retention window as removed-data notices; current retained entries show the available member identity and explain that richer details arrive with Step 1.2.

## Deviations and Verification
- The full member-detail popup remains a Step 1.2 deliverable; this session adds the required clan-log click target and retention behavior without duplicating the future detail implementation.
- `npm run typecheck` passed. Production build and database migration verification are run after the final diff review.
- No secrets, credentials, or `.env.local` were staged.

## Next Action

Proceed to the remaining Step 1.2 Members List work after verifying the production build and reviewing the updated dashboard behavior.
