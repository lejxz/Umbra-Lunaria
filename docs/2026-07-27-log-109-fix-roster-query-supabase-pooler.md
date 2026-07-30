# Log 109 — Fix Roster Size Trend Query (Supabase Pooler Compatibility)

**Date:** 2026-07-27
**Time:** 05:39 PM (+08:00)

## Summary of Session
The dashboard failed to load with "Failed query: select date_trunc('day',
captured_at, $1)..." — the timezone-aware `date_trunc` 3-argument form I added
in log 107 is not supported by Supabase's PgBouncer pooler. Fixed with the
standard `AT TIME ZONE` approach using a raw SQL literal.

## Root Cause
Log 107 changed `getRosterSizeTrend` to use `date_trunc('day', col, 'Asia/Manila')`
(PG 13+ 3-argument form). Supabase's connection pooler (PgBouncer in transaction
mode) rejects this form. The first attempt at a fix (`AT TIME ZONE $1` with a
drizzle parameter) also failed — PgBouncer doesn't handle parameterized `AT TIME
ZONE` operators reliably.

## Fix
`lib/db/queries.ts` `getRosterSizeTrend` — inlined the timezone as a raw SQL
string literal via `sql.raw("'Asia/Manila'")` instead of a parameterized value.
The timezone comes from `clanConfig.timezone` (a hardcoded config value, not
user input), so inlining is safe. The query now reads:

```sql
date_trunc('day', captured_at AT TIME ZONE 'Asia/Manila')
```

This converts the `timestamptz` to a `timestamp` in Manila local time, then
truncates to midnight Manila — the standard PostgreSQL approach that works on
all versions and through PgBouncer.

## Verification
- Before: dashboard returned 32KB error page with "Failed query".
- After: dashboard returns 203KB with full data (Stars per war, Top 5 Donors,
  Attack quality, Clan Log — 0 "Failed query" errors).
- `bun run typecheck` → clean
- `bun run lint` → 0 errors, 0 warnings
- `bun run test` → 150/150 pass
- All 6 routes return 200

## Next Action
None — the dashboard loads correctly. The timezone bucketing fix from log 107
is preserved (days still align to Manila midnight, not UTC midnight).
