# Log 087 — War score fix + three-star count + capital contribution log

**Date:** 2026-07-25

## Summary

Fixed three bugs + added the capital contribution log card.

## Bug fixes

### 1. War score N/A for opted-out members
**File:** `lib/scoring/activity-score.ts`

**Bug:** The `warAvailable` check excluded opted-out members (`warPreference !== "out"`) even if they had war history. A member like "Yeon's Slave" who was opted out but had 2 wars with 100% participation + 2.8 avg stars showed N/A for the war component.

**Fix:** Removed the `warPreference !== "out"` condition. War is now available whenever `warAttacksAllowed > 0` — regardless of current preference. The war score reflects past performance, not future eligibility.

### 2. Three-star rate always 0%
**File:** `lib/db/member-queries.ts`

**Bug:** `getWarDetail()` hardcoded `threeStarAttacks: 0` with a `// TODO: count from warAttacks` comment. The three-star count was never actually queried — it was always 0, making the three-star rate always 0%.

**Fix:** Added a query to `warAttacks` table counting `stars = 3` for the member's wars:
```sql
SELECT count(*) FROM war_attacks
WHERE war_id IN (member's wars) AND attacker_tag = player AND stars = 3
```

### 3. War participation was already all-time
**Verified:** `getWarDetail()` already queries ALL `warParticipants` for the member (no time-window filter). The war participation summary in member detail IS all-time, not limited to 30 days.

## New feature: Capital contribution log

### Ingest route (`app/api/ingest/route.ts`)
- Before updating `members.clanCapitalContributions`, reads the old value
- Computes delta = new - old (handles weekly resets since it's a lifetime total)
- If delta > 0, logs to `membership_events` with `eventType: "capitalContribution"` + `metadata: { amount, total }`
- Updates every batch poll (every 6 hours)

### Capital page (`components/capital/raid-history.tsx`)
- New collapsible "Contribution log" card on the capital page
- Shows recent contribution deltas: member name, +amount, total, timestamp
- Alternating row backgrounds for scannability
- Yellow accent dot (matching the capital section's color)
- Collapsible with 20 most recent entries

### View model + query
- `ContributionLogEntry` type in `lib/view-models/capital.ts`
- `contributionLog` field added to `RaidHistoryView`
- Query in `lib/db/capital-queries.ts` fetches the 20 most recent `capitalContribution` events from `membership_events`

## Test updates
Updated `tests/lib/activity-score.test.ts` — the two tests that expected opted-out members to have war excluded now test the correct behavior:
- Opted out WITH war data → war component IS available (shows score)
- Opted out WITHOUT war data → war component is NOT available (null attacks)

## Verification
- Typecheck: clean
- Lint: 0 errors (13 pre-existing warnings)
- Tests: 147/147 pass
