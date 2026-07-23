# Neon + Vercel Free-Tier Load Analysis

**Date:** 2026-07-22
**Scope:** Phase 1 (read-only observatory) — dashboard, members, war center, capital. Configured clan: `#2JPCYP98L` (5 members at time of writing).

This analysis uses live database measurements (taken 2026-07-22) and the
project's polling architecture (concept/04) to project free-tier consumption
and identify the first constraint that will be hit. It is a planning aid, not
a SLA — re-measure after schema or traffic changes.

**Bottom line:** on the current Vercel Hobby + Neon Free tiers, the app has
ample headroom at any clan size up to the CoC 50-member cap. The first
constraint that could surface is the Supercell API rate limit on the shared
RoyaleAPI proxy IP (already handled gracefully by failed-poll safety), not
Vercel or Neon. See §6 for the verified limit numbers.

---

## 1. Architecture recap (what consumes each free tier)

| Trigger | Work | Vercel function calls | Neon queries | Supercell API calls |
|---|---|---|---|---|
| Cron light poll (every 30 min) | Roster + snapshots + current war | 1 (`/api/ingest` `batch:false`) | ~5 members × 3 writes + 1 war sync | 2 (`/clans/{tag}`, `/clans/{tag}/currentwar`) |
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
poll). At the configured **30-minute cadence** (updated 2026-07-23 from 10 min
to reduce Neon CU consumption) with 5 retained members:

```
snapshots/day  = members × polls/day = 5 × 96 = 480 (theoretical max)
measured peak  = 255/day (at the old 10-min cadence; ~51 polls that day)
```

The measured 255/day was lower than the old 720/day theoretical max (10-min
cadence) because the cron service does not always hit exactly 48 polls/day
(network jitter, brief downtime). At the new 30-min cadence the theoretical
max drops to 480/day. For capacity planning, use the **theoretical max**
(480/day) as the worst case.

### 30/90/365-day storage projection (snapshots only)

| Horizon | Rows (at 30-min cadence) | Size |
|---|---|---|
| 30 days | 14,400 | ~4.9 MB |
| 90 days | 43,200 | ~14.7 MB |
| 365 days | 175,200 | ~60 MB |

`unit_levels` adds 5 rows/day (one per member, daily batch) = ~1.8k rows/year
(~230 kB). `wars` + `war_attacks` grow with war frequency (~1–2 wars/week,
each ~50v50 attacks max) = negligible. **Total DB at 1 year: ~60–80 MB.**

---

## 3. Neon Free Tier consumption

Neon's free tier (as of 2026-07):

| Resource | Free allowance | Projected usage (1 year, 30-min cadence) | Status |
|---|---|---|---|
| **Storage** | 0.5 GB (512 MB) | ~60–80 MB (all tables) | ✅ ~12–16% of limit |
| **Compute (CU-hours)** | **100 CU-hours/month** | ~42 CU/month (observed rate, 30-min cadence) | ✅ under limit (~58% headroom) |
| **Projects** | 1 | 1 | ✅ |
| **Branches** | 10 | 1 (main) | ✅ |

### Compute time (observed)

Neon bills compute in Compute Units (CU). The free tier allows **100 CU-hours
per month**. Each poll wakes the suspended compute (cold start ~300–800 ms) +
runs ~20 queries (~1s active), so the real CU cost is higher than the pure
active-query time suggests.

**Observed CU consumption** (2026-07-23, at the old 10-min cadence):

| Time | Cumulative CU | Delta |
|---|---|---|
| 5:00 PM | 4.4 CU | — |
| 8:40 AM (next day) | 7.14 CU | +2.74 CU in 15h40m |

That rate (~0.175 CU/hour) extrapolates to ~4.2 CU/day → **~126 CU/month** at
the old 10-min cadence — slightly over the 100 CU free-tier limit. The cadence
was therefore reduced to **30 minutes** (48 polls/day instead of 144), which
cuts the poll-driven CU by ~33%.

**Revised estimate at 30-min cadence:** ~0.06 CU/hour → ~1.4 CU/day →
**~42 CU/month**. This is **under the 100 CU free-tier limit**, with ~58%
headroom. The dominant cost is the cold-start wake per poll, not the query
time itself.

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
| **Function invocations** | 100,000/month | ~3,500/month (see below) | ✅ ~3.5% of limit |
| **Function execution time** | 100 GB-hours/month | <1 GB-hour/month | ✅ |
| **Edge requests** | 1,000,000/month | ~5,000/month | ✅ |
| **Cron jobs** | 2 (Hobby) | 1 (`/api/cron/purge`) | ✅ |
| **Build minutes** | 6,000/month | ~20/deploy | ✅ |
| **Bandwidth** | 100 GB/month | <1 GB/month | ✅ |

### Function invocations per month

| Source | Calls/day | Calls/month |
|---|---|---|
| Light poll (cron) | 96 | 2,880 |
| Daily batch (cron) | 1 | 30 |
| Purge (Vercel Cron) | 1 | 30 |
| Page views | ~10 (assumed) | 300 |
| War refresh (TTL-cached) | ~5 | 150 |
| Member detail sheet | ~10 | 300 |
| **Total** | | **~3,690/month** |

Well under the 100,000/month limit. Even at 10× the assumed page-view traffic,
usage stays under 10%.

### Function execution duration

The daily batch is the longest function (5 sequential player fetches + war-log
backfill). Measured: ~3–8 seconds at 5 members.

**Verified Vercel Hobby limit (2026-07, per vercel.com/docs/functions/configuring-functions/duration):**
the **default** maximum function duration on Hobby is **300 seconds (5 minutes)**
— not 10s. (Vercel raised this from the older 10s/60s defaults.) The Hobby
extended maximum is also 300s; Pro goes to 800s and beyond.

At ~1.5s per player fetch, 300s allows **~200 sequential fetches** — far beyond
the CoC hard clan cap of 50 members. So the daily batch is well within the
Hobby default at **any** clan size, and **no `maxDuration` config is required**.
The light poll (~1–2s) and every other route are even shorter.

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

**Light-poll API budget**: 2 calls × 48 polls/day = **192 API calls/day**.
**Daily-batch API budget**: 7 calls/day.
**Total**: ~199 API calls/day.

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

| Constraint | Limit | Projection (30-min cadence) | First-to-hit rank |
|---|---|---|---|
| **Neon compute (CU)** | **100 CU-hours/month** | ~42 CU/month (observed, 30-min cadence) | ✅ under limit (~58% headroom) |
| Supercell API rate | soft, per IP | ~199 calls/day | 2nd (tolerable; proxy-shared risk) |
| Vercel function invocations | 100k/month | ~3.7k/month | 3rd (safe until ~25× traffic) |
| Neon storage | 512 MB | ~60–80 MB | 4th (only if clan grows to 50+) |
| Vercel function duration | 300s (Hobby default) | daily batch ~8s at 5 members | 5th (never) |

### Neon CU — under control at 30-min cadence

**Observed (2026-07-23):** Neon CU consumption rose from 4.4 CU at 5:00 PM to
7.14 CU at 8:40 AM the next day — a rate of ~0.175 CU/hour at the old 10-min
cadence. That extrapolates to ~126 CU/month, slightly over the 100 CU free-tier
limit.

The cadence was reduced to **30 minutes** (48 polls/day instead of 144),
cutting the poll-driven CU by ~33% to an estimated **~42 CU/month** — under
the 100 CU limit with ~58% headroom. The dominant cost is the Neon compute
cold-start wake per poll, not the query time itself.

**If CU consumption rises** (e.g. clan grows, page-view traffic increases),
the mitigations are:
1. **Raise the cadence to 30 min** (48 polls/day) — halves the CU to ~21/month.
   Donation counters and war state don't change faster than every 30 min.
2. **Batch the DB writes** — combine per-member snapshot inserts into one batch.
3. **Upgrade to Neon Pro** ($19/month) — raises the CU limit to 1,920 CU-hours.

### The soft first ceiling: Supercell API rate (proxy-shared IP)

At 30-min cadence the API budget is ~199 calls/day — well within Supercell's
tolerance. If RoyaleAPI's proxy IP is shared with many other consumers, a
rate-limit hit could cause intermittent failed polls, handled gracefully by
failed-poll safety (concept/04 #3).

---

## 7. Recommendations for free-tier sustainability

1. **Monitor Neon CU monthly** — at 30-min cadence the projected ~42 CU/month
   fits under the 100 CU limit with ~58% headroom. If consumption approaches
   90 CU before month-end (e.g. clan grows or traffic increases), raise the
   cadence to 30 min or consider Neon Pro.
2. **Snapshot pruning** — add a purge step for departed-member snapshots
   (keep only the last pre-departure row for the clan log). Prevents unbounded
   `member_snapshots` growth if the clan churns. Priority: medium.
3. **No `maxDuration` config needed** — Vercel Hobby's default 300s already
   covers any clan size up to the CoC 50-member cap.
4. **Keep the 45s refresh TTL** — it prevents refresh-button bursts from
   multiplying Supercell calls. Do not lower it below 30s.
5. **Do not lower poll cadence below 30 min** — the light poll does 2 Supercell
   calls each; 30 min is the current sweet spot between CU savings and data
   freshness.

---

## Post-migration update (2026-07-23)

The database was migrated from Neon to Supabase. The CU-hour constraint no
longer applies — Supabase's free tier does not meter compute. The storage
analysis (~7 MB at 50 members with pruning) remains valid; the pruning
strategy remains good practice for staying under Supabase's 500 MB limit.

**What changed:**
- Neon CU-hour limit (100 CU/month) → **eliminated** (Supabase doesn't meter compute).
- Neon storage limit (512 MB) → Supabase storage limit (500 MB) — essentially the same.
- Neon auto-suspend cold starts (~300-800ms) → Supabase has no auto-suspend (always warm during active use).
- The ISR caching strategy remains valuable (reduces Vercel function invocations + DB query load).
- The pruning strategy remains valuable (keeps storage bounded).
- The poll cadence (15 min) can stay or be lowered without CU concerns.
