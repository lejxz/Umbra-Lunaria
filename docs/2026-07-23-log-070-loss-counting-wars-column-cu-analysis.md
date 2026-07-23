# Log 070 — War Loss Counting Fix + Members Wars Column Fix + CU/ISR Analysis

**Date:** 2026-07-23
**Time:** 05:25 AM (+08:00)

## Summary of Session
Fixed two bugs: (1) war history wasn't counting losses because the CoC API returns `"lose"` but our code expected `"loss"` — normalized at ingestion + fixed 30 existing DB rows; (2) the members page "Wars" column showed `{warsMissed}/{warsTracked}` which read backwards (0/1 = "0 missed" = good, but looked like "0 out of 1" = bad) — flipped to `{warsTracked - warsMissed}/{warsTracked}` = "attended / tracked". Also answered CU questions about ISR caching and 30-min cadence.

## Work Completed

### War loss counting bug (`lib/coc-client/client.ts` + `lib/ingest/war-sync.ts` + DB)
**Root cause:** the CoC warlog API returns `"lose"` for losses, but `CocWarLogEntry.result` was typed as `"win" | "loss" | "tie"`. The backfill stored the raw API value (`"lose"`), but all UI code (history counter, result pills, war-detail sheet) checked for `"loss"`. Result: 30 losses were stored as `"lose"` and never matched any UI condition — they showed as `—` in history and weren't counted in the W/L/T record.

**Fix:**
1. Fixed `CocWarLogEntry.result` type to `"win" | "lose" | "tie"` (matches the actual API).
2. Added normalization in `backfillWarLog`: `entry.result === "lose" ? "loss" : entry.result` — the DB always stores `"loss"` (our canonical form), the API's `"lose"` is converted at the ingestion boundary.
3. Updated 30 existing DB rows from `"lose"` to `"loss"`.

**Result:** the history record summary now correctly shows W 19, L 30, T 1.

### Members "Wars" column — flipped to attended/tracked (`components/members/members-roster.tsx`)
**Root cause:** the column showed `{warsMissed}/{warsTracked}` — e.g. `0/1` meant "0 missed out of 1 tracked" (good), but it read as "0 out of 1" (bad). Users naturally read X/Y as "how many you did", not "how many you missed".

**Fix:** flipped to `{warsTracked - warsMissed}/{warsTracked}` — now `1/1` = "attended 1 of 1" (good, green), `0/1` = "attended 0 of 1" (bad, amber). Also updated the mobile card text from "N/N missed" to "N/N wars".

## Answers to CU questions (documented for reference)

### Zero DB CU per page view — ISR
Adding `export const revalidate = 900` (15 min, matching poll cadence) to dashboard/members/capital pages would make Vercel cache the rendered HTML at the edge. Page views between revalidations hit the cache (0 DB, 0 CU). Only the background revalidation triggers a DB hit (~1-2 CU-sec per 15 min). At 10 page views/day, this cuts page-view CU from ~10-20 CU-sec/day to ~2 CU-sec/day. The war page should stay dynamic (refresh button + TTL). **Not yet implemented — awaiting user decision.**

### 30-min poll cadence
Logical and recommended if CU is a concern. Halves the CU from ~84/month to ~42/month (58% headroom under the 100 CU limit). Data-quality impact is negligible: donation counters reset weekly, war state changes on hour/day timescales, and the activity graph uses daily buckets regardless. The only visible change is the "next poll" countdown showing 30 min instead of 15 min.

### War result — same stars tiebreaker
We rely on the API. The CoC API's warlog endpoint returns the `result` field (`win`/`lose`/`tie`) with the total-destruction tiebreaker already applied. Our `computeWarResult()` has a fallback tiebreaker for live currentwar, but the API always provides the result. No need to implement our own.

## Verification
- `bun run typecheck` — 0 errors. `bun run lint` — 0 errors. `bun run test` — 147 passed.
- DB verified: 30 `loss`, 19 `win`, 1 `tie` — all correctly stored as `"loss"`.

## Next Action
Both bugs fixed. ISR caching and 30-min cadence are documented options awaiting user decision.
