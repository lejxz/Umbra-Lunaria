# Log 052 — Fix War Sync: CoC API Time Format Parsing

**Date:** 2026-07-22
**Time:** 04:00 AM (+08:00)

## Summary of Session

Investigated why manual polls weren't updating war data. Found that the war sync was failing with "Invalid time value" because the CoC API returns timestamps in the format `YYYYMMDDTHHMMSS.000Z` (no dashes/colons), which JavaScript's `new Date()` cannot parse. Added a `parseCoCTime()` helper that converts the format to ISO 8601 before parsing.

## Root Cause

The Clash of Clans API returns war timestamps in a compact format:
```
"20260722T051024.000Z"
```

JavaScript's `new Date("20260722T051024.000Z")` returns `Invalid Date` because it expects ISO 8601 format:
```
"2026-07-22T05:10:24.000Z"
```

The `syncCurrentWar` function in `app/api/ingest/route.ts` was using `new Date(currentWar.startTime)` directly, which produced `Invalid Date`, causing the entire war sync to fail with "Invalid time value".

## Fix

Added `parseCoCTime()` helper in `app/api/ingest/route.ts`:
- Converts `"20260722T051024.000Z"` → `"2026-07-22T05:10:24.000Z"` via regex
- Returns `Date | null` (null for unparseable values)
- Replaced all `new Date(currentWar.xxxTime)` calls with `parseCoCTime(currentWar.xxxTime)`

## Verification

**Before fix:**
```json
{
  "warSynced": false,
  "errors": ["war sync failed: Invalid time value"]
}
```

**After fix:**
```json
{
  "warSynced": true,
  "errors": []
}
```

War #1 now in DB: preparation vs "asian clan GG", 5v5, ends Jul 24 04:10 UTC.

## Data Pipeline Audit Summary

The full audit showed:
- ✅ Clan data: fresh (last poll: Jul 22, 05:13 UTC)
- ✅ Member snapshots: 255 total, latest Jul 22 05:13 UTC
- ✅ Donations: updating (Yeon: 178 → 374 between polls)
- ✅ Activity flags: working (latest snapshot active=true)
- ✅ Membership events: 45 (all departures tracked)
- ✅ Unit levels: 5 members, last capture Jul 21 (daily batch hasn't run today yet)
- ✅ Wars: NOW WORKING (was failing due to time format bug)
- ✅ Current war: preparation, 5v5 vs "asian clan GG"

## Next Action

Proceed to Step 1.4: Implement War Center.
