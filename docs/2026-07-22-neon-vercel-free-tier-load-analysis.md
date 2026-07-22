# Neon + Vercel Free-Tier Load Analysis

**Date:** 2026-07-22
**Scope:** Phase 1 (read-only observatory) — dashboard, members, war center, capital. Configured clan: `#2JPCYP98L` (5 members at time of writing).

This analysis uses live database measurements (taken 2026-07-22) and the
project's polling architecture (concept/04) to project free-tier consumption
and identify the first constraint that will be hit. It is a planning aid, not
a SLA — re-measure after schema or traffic changes.

---

## 1. Architecture recap (what consumes each free tier)

| Trigger | Work | Vercel function calls | Neon queries | Supercell API calls |
|---|---|---|---|---|
| Cron light poll (every 10 min) | Roster + snapshots + current war | 1 (`/api/ingest` `batch:false`) | ~5 members × 3 writes + 1 war sync | 2 (`/clans/{tag}`, `/clans/{tag}/currentwar`) |
| Cron daily batch (1×/day) | Full player details + war-log backfill + Hall of Fame | 1 (`/api/ingest` `batch:true`) | ~5 × 3 writes + ~50 war upserts + 5 queries | 1 + 5 + 1 = 7 (`/clans`, 5× `/players`, `/warlog`) |
| Vercel Cron purge (1×/day) | Retention cleanup | 1 (`/api/cron/purge`) | 1–2 deletes | 0 |
| Page view (dashboard/members/war/capital) | Server-side read | 1 per page | 5–15 reads | 0 |
| War refresh button (user click, 45s TTL) | Live current-war fetch | 1 (`/api/war/refresh`) | 1 war sync | 1 (`/currentwar`) |
| Member detail sheet (user click) | On-demand member read | 1 (`/api/members/[tag]`) | 1–3 reads | 0 |

All server-side. No browser → Supercell calls. No client-side DB access.

---

## 2. Measured database state (2026-07-22)

| Metric | Value |
|---|---|
| Total DB size | **9.4 MB** (`pg_database_size`) |
| `member_snapshots` | ~495 rows / 176 kB (avg ~350 bytes/row) |
| `members` | ~50 rows / 168 kB (includes departed/purged tags) |
| `wars` | 51 rows (1 preparation + 50 backfilled warEnded) / 136 kB |
| `war_participants` | 5 rows / 80 kB |
| `unit_levels` | 5 rows / 128 kB (full progression JSONB per member) |
| Tracking start | 2026-07-20 (2 days of data) |
| Snapshot growth | 255 rows on day 3 (peak), ~50 polls that day |

### Growth rate

The dominant write table is `member_snapshots` (one row per member per light
poll). At the configured 10-minute cadence with 5 retained members:

```
snapshots/day  = members × polls/day = 5 × 144 = 720 (theoretical max)
measured peak  = 255/day (cron ran ~51 times — see note below)
```

The measured 255/day is lower than the 720 theoretical max because the cron
service does not always hit exactly 144 polls/day (network jitter, brief
downtime). For capacity planning, use the **theoretical max** (720/day) as the
worst case and the **measured** (255/day) as the realistic case.

### 30/90/365-day storage projection (snapshots only)

| Horizon | Rows (measured) | Size (measured) | Rows (theoretical max) | Size (theoretical max) |
|---|---|---|---|---|
| 30 days | 7,650 | ~2.6 MB | 21,600 | ~7.4 MB |
| 90 days | 22,950 | ~7.8 MB | 64,800 | ~22 MB |
| 365 days | 93,075 | ~32 MB | 262,800 | ~90 MB |

`unit_levels` adds 5 rows/day (one per member, daily batch) = ~1.8k rows/year
(~230 kB). `wars` + `war_attacks` grow with war frequency (~1–2 wars/week,
each ~50v50 attacks max) = negligible. **Total DB at 1 year: ~40–110 MB.**

---

## 3. Neon Free Tier consumption

Neon's free tier (as of 2026-07):

| Resource | Free allowance | Projected usage (1 year, theoretical max) | Status |
|---|---|---|---|
| **Storage** | 0.5 GB (512 MB) | ~110 MB (all tables) | ✅ ~22% of limit |
| **Compute time** | 1,944 AU-hours/month (~3,000 hours on the smallest compute) | See below | ✅ far under |
| **Projects** | 1 | 1 | ✅ |
| **Branches** | 10 | 1 (main) | ✅ |

### Compute time

Neon bills compute in "Active time" (seconds the compute is running). On the
free tier the compute auto-suspends after 5 minutes of inactivity and
auto-resumes on the next query (cold start ~300–800 ms).

- **Light poll**: 1 DB session, ~20 queries, <1 second active → ~1 sec × 144
  polls/day = **144 sec/day** = 2.4 min/day = **~72 min/month**.
- **Daily batch**: ~30 queries + 5 player upserts, ~5 seconds → **~150
  sec/month**.
- **Page views**: each page view wakes the compute. 10 page views/day × ~0.5
  sec = 5 sec/day = **~2.5 min/month**.
- **Total**: ~75 min/month active compute = **~1.25 hours/month**.

The free tier allows ~3,000 hours of active compute (1,944 AU-hours on the
0.25 CU size). **Usage is <0.05% of the allowance.**

### Cold-start caveat

Because Neon auto-suspends, the **first page view after 5 min of inactivity**
takes an extra ~300–800 ms (compute wake). This is visible as a slightly
slower first load but does not affect the cron polls (they always wake the
compute). No action needed for a single-clan tool; if perceived latency
becomes an issue, Neon's "Always-on" compute (paid) or a simple
keep-alive cron (free, every 4 min) solves it.

### Retention safety valve

The daily purge (`/api/cron/purge`) deletes departed-member profiles after
`memberRetentionDays` (14 days). `member_snapshots` for departed members are
NOT currently purged — they accumulate. At 5 members this is fine (90 MB/year
worst case). If the clan grows to 50 members, snapshots would reach ~900
MB/year, approaching the 512 MB limit. **Recommendation: add snapshot
pruning for departed members in a future hardening pass** (keep only the last
snapshot before departure for the clan log).

---

## 4. Vercel Hobby (free) tier consumption

| Resource | Free allowance | Projected usage (1 year) | Status |
|---|---|---|---|
| **Function invocations** | 100,000/month | ~4,500/month (see below) | ✅ ~4.5% of limit |
| **Function execution time** | 100 GB-hours/month | <1 GB-hour/month | ✅ |
| **Edge requests** | 1,000,000/month | ~5,000/month | ✅ |
| **Cron jobs** | 2 (Hobby) | 1 (`/api/cron/purge`) | ✅ |
| **Build minutes** | 6,000/month | ~20/deploy | ✅ |
| **Bandwidth** | 100 GB/month | <1 GB/month | ✅ |

### Function invocations per month

| Source | Calls/day | Calls/month |
|---|---|---|
| Light poll (cron) | 144 | 4,320 |
| Daily batch (cron) | 1 | 30 |
| Purge (Vercel Cron) | 1 | 30 |
| Page views | ~10 (assumed) | 300 |
| War refresh (TTL-cached) | ~5 | 150 |
| Member detail sheet | ~10 | 300 |
| **Total** | | **~5,130/month** |

Well under the 100,000/month limit. Even at 10× the assumed page-view traffic,
usage stays under 10%.

### Function execution duration

The daily batch is the longest function (5 sequential player fetches + war-log
backfill). Measured: ~3–8 seconds. Vercel Hobby caps function duration at 10
seconds (synchronous) / 60 seconds (streaming). The daily batch is within the
10s cap for a 5-member clan. **At 50 members the daily batch would exceed 10s**
(50 × ~1.5s/player fetch). Mitigation: either (a) paginate the daily batch
across multiple cron invocations, or (b) use `maxDuration` config to raise the
route to 60s (Hobby allows this for streaming/edge, check current Vercel docs).

The light poll is ~1–2s (2 API calls + 5 member upserts) — comfortably within
limits.

---

## 5. Supercell API rate limits (the real first constraint)

The Supercell API (via the RoyaleAPI proxy) is the tightest constraint, not
Vercel or Neon. The developer-tier token is rate-limited per IP (the proxy
IP `45.79.218.79`).

| Endpoint | Calls per light poll | Calls per daily batch |
|---|---|---|
| `/clans/{tag}` | 1 | 1 |
| `/clans/{tag}/currentwar` | 1 | 0 |
| `/players/{tag}` × N members | 0 | 5 |
| `/clans/{tag}/warlog` | 0 | 1 |

**Light-poll API budget**: 2 calls × 144 polls/day = **288 API calls/day**.
**Daily-batch API budget**: 7 calls/day.
**Total**: ~295 API calls/day.

Supercell's published limit is not a hard number, but the developer tier is
generally tolerant of low-frequency polling. The 45-second shared TTL on
`/api/war/refresh` prevents refresh bursts. The daily war-log backfill makes
50 sequential reads once per day (not bursty).

**Risk**: if the proxy IP is shared with other RoyaleAPI users, a rate-limit
hit could cause a failed poll. The ingest route handles this gracefully
(failed-poll safety — concept/04 #3: never mark members inactive on a failed
fetch).

---

## 6. Summary: what hits first, and when

| Constraint | Limit | 1-year projection | First-to-hit rank |
|---|---|---|---|
| Neon storage | 512 MB | ~110 MB | 4th (only if clan grows to 50+) |
| Neon compute | ~3,000 hours | ~1.3 hours | 5th (never) |
| Vercel function invocations | 100k/month | ~5k/month | 3rd (safe until ~20× traffic) |
| Vercel function duration | 10s (Hobby) | daily batch ~8s at 5 members | **1st** (at ~8 members the daily batch exceeds 10s) |
| Supercell API rate | soft, per IP | ~295 calls/day | 2nd (tolerable; proxy-shared risk) |

### The first real ceiling: Vercel function duration (daily batch)

At 5 members, the daily batch takes ~3–8s (5 sequential player fetches). Each
player fetch is ~1–1.5s. At **~8 members the daily batch crosses the 10-second
Hobby limit**. This is the first constraint that will be hit as the clan
grows.

**Mitigations (in order of preference):**
1. Set `export const maxDuration = 60` on the ingest route (Vercel Hobby allows
   up to 60s for serverless functions in some configurations — verify current
   docs). This defers the ceiling to ~40 members.
2. Split the daily batch into chunks: the cron sends `{"batch": true,
   "chunk": 0}` and the route processes a subset of members per call, with the
   cron firing 2–3 times in sequence. Defers to any clan size.
3. Upgrade to Vercel Pro ($20/month) for 300s function duration — only if the
   clan exceeds ~100 members.

### The second ceiling: Supercell API rate (proxy-shared IP)

If RoyaleAPI's proxy IP is shared with many other consumers, a Supercell
rate-limit hit could cause intermittent failed polls. This is already handled
gracefully (failed-poll safety). No structural change needed unless failures
become persistent — in which case a dedicated proxy IP or a lower poll
cadence (every 15 min instead of 10) is the lever.

---

## 7. Recommendations for free-tier sustainability

1. **Snapshot pruning** — add a purge step for departed-member snapshots
   (keep only the last pre-departure row for the clan log). Prevents unbounded
   `member_snapshots` growth if the clan churns. Priority: medium (needed only
   if clan grows beyond ~20 members or churns heavily).
2. **`maxDuration` on ingest route** — set `export const maxDuration = 60` on
   `app/api/ingest/route.ts` proactively, so the daily batch has headroom as
   the clan grows past 5 members. Priority: low now, high before the clan
   exceeds ~8 members.
3. **Keep the 45s refresh TTL** — it prevents refresh-button bursts from
   multiplying Supercell calls. Do not lower it below 30s.
4. **Monitor Neon storage monthly** — re-run the stats script
   (`SELECT pg_size_pretty(pg_database_size(current_database()))`) after major
   schema changes or clan growth. The 512 MB limit has ~5× headroom at 5
   members but only ~1× at 50.
5. **Do not raise poll cadence below 10 min** — the light poll does 2 Supercell
   calls each; at 5-min cadence that doubles to 576 calls/day, increasing
   rate-limit risk without meaningful data-quality gain (donation counters and
   war state don't change faster than every 10 min).
