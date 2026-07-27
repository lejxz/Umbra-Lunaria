# Log 099 — Fix Longest Tenured Hall of Fame (missing original members)

**Date:** 2026-07-27
**Time:** 01:58 AM (+08:00)

## Summary of Session
The "Longest Tenured" Hall of Fame card was only showing recent joiners (Zyco
3 days, Kenttoy 0 days) instead of the actual longest-tenured members. The 5
original members present when tracking started were missing entirely.

## Root Cause
`computeLongestTenure()` in `lib/db/hall-of-fame-queries.ts` queried
`membership_events` filtered by `event_type = 'join'`. But original members
(present when tracking began) have **no "join" event** — they were backfilled
as existing members during the first ingest, not logged as a join. The
`membership_events` table only records events *observed* by the tracker
(joins/leaves/rejoins after tracking started).

DB verification confirmed: 7 current members, but only 2 had a "join" event.
The query returned only those 2.

## Work Completed
- **`lib/db/hall-of-fame-queries.ts`** `computeLongestTenure()` — rewrote to
  query `members.joinedAt` directly instead of `membership_events.eventTime`.
  `members.joinedAt` is `notNull()` and set for every member ("first observed
  by this tracker" per the schema comment), so it captures the full roster.
  The query now reads:
  ```ts
  db.select({ playerTag, name, firstSeen: members.joinedAt })
    .from(members)
    .where(isNull(members.leftAt))
    .orderBy(members.joinedAt)
    .limit(10)
  ```
- Removed the now-unused `membershipEvents` import and the `inArray` import
  (was only used in the old subquery). Kept `and` (still used by the
  fastest-3-star query).

## Verification
- Before: 2 entries (Zyco 3d, Kenttoy 0d).
- After: 7 entries — KnieieGurow, Juskepz, Yeon, Yeon's Slave, ⊷⊰ q.p ⊱⊷
  (all 6d, tracking start), Zyco (3d), Kenttoy (0d).
- `bun run typecheck` → clean.
- `bun run lint` → 0 errors, 2 pre-existing warnings.
- `bun run test` → 147/147 pass.

## Decisions Made
- Used `members.joinedAt` (tracker-first-observed) rather than attempting to
  reconstruct a "true" historic join date. The CoC API does not provide true
  historic clan-join dates for existing members, so "first observed by this
  tracker" is the most honest tenure signal available. Original members all
  share the tracking-start timestamp, which correctly reflects "been here as
  long as we've been watching".

## Next Action
None — the fix is complete and verified.
