# Ingest Outage Postmortem + Data Watchdog

**Date:** 2026-10-02
**Time:** 01:40 PM (+08:00)

## Summary of Session
The owner reported cron failures ("downtime of half a day, no recent data
able to pass") with cron-job.org alert emails for both jobs ("Umbra Lunaria —
light poll" and "— daily poll", dated Oct 1). Diagnosis from the database
showed a ~4-hour degraded ingest window on Oct 1 caused by the Supabase
us-east-1 "Intermittent latency in Eastern US" incident, with full
self-recovery and no meaningful data loss. The systemic gap exposed: ingest
death was invisible from inside the repo — the nightly smoke stayed green
because ISR pages serve cached HTML. Fixed by adding a public
`/api/health` freshness endpoint (HTTP 503 when data is stale) and a
`watchdog.yml` GitHub Actions workflow that checks it every 30 minutes and
fails red — plus a read-only `scripts/db-freshness.ts` diagnostic.

## Work Completed

### Incident timeline (all times UTC; Manila = UTC+8)

| Time (UTC) | Observation |
|---|---|
| Sep 29 16:26 | Supabase status page opens "Intermittent latency in Eastern US" (this project's DB is `aws-0-us-east-1`; incident still "identified" as of Oct 2) |
| before Oct 1 08:00 | Healthy baseline: every hour writes 84 member snapshots (7 members × 12 five-min light polls); daily batch at 04:00 |
| Oct 1 08:00–12:00 | Degraded hours: 70 / 49 / 56 / 70 rows — **~13 missed light polls** (16:00–20:00 Manila) |
| Oct 1 (during window) | cron-job.org sends "Cronjob failed" emails for the light-poll and daily-poll jobs |
| Oct 1 12:00 onward | Cadence back to the 84/hour baseline; data flowing normally since |
| Oct 2 04:00 | Daily batch ran normally (`last_daily_batch_at` = Oct 2 04:00:35) |
| Oct 2 ~05:18 | Manual verification poll by the agent: HTTP 200, `membersPolled: 7`, `warSynced: true`, no errors, 1.4 s |

### Impact assessment

- **No permanent meaningful data loss.** Cumulative stats (donations,
  donations-received, capital contributions, trophies) bridge any poll gap —
  the first successful poll after the window captured the full delta, so
  lifetime totals and windowed trends are intact.
- Wars fully synced (`last_synced_at` current; latest war ended Sep 30; war
  log backfill covers gaps by design). No joins/leaves occurred during the
  window, so no membership events were lost.
- Only cost: Oct 1's intra-day activity resolution (~4.5% of the day's
  polls missed; 13 of 288) and slightly fewer career snapshots that day
  (21 vs typical 28 — `careerMoved` is delta-gated). The daily batch
  re-baselined career data on Oct 2.
- The failed-poll safety contract held: no spurious departures or activity
  resets were recorded during the window.

### Root cause

Supabase us-east-1 intermittent latency (ongoing provider incident) made
ingest DB writes slow or intermittently failing. From the cron service's
perspective, calls exceeded its execution timeout or returned errors →
failure emails; from the pipeline's perspective, ~13 polls never completed.
The user-perceived "half a day" likely reflects cron-job.org's own failure
streak (client-side timeouts on requests that sometimes completed
server-side) — the DB-measured data gap is ~4 hours.

### Why nothing caught it

The nightly smoke workflow passed all nights in the window: it greps ISR
pages for content markers, and ISR serves cached HTML regardless of ingest
health. cron-job.org emails exist but are passive. Deployment health and
data health were never separately monitored.

### Remediation (this commit)

- **`app/api/health/route.ts`** — public, `force-dynamic`, `no-store`
  endpoint reporting `clans.last_polled_at` age: HTTP 200 when fresh,
  **HTTP 503 when older than 30 min** (6 missed light polls) or when the DB
  is unreachable. Timestamps only — no counts, tags, or secrets. The
  503-on-stale contract means any plain HTTP monitor can watch ingest health
  without pipeline knowledge.
- **`.github/workflows/watchdog.yml`** — scheduled `*/30 * * * *` (+ manual
  dispatch): GETs `/api/health`, fails red on non-200, writes a summary
  table (HTTP status, last poll, age, threshold). GitHub emails the repo
  owner on failure. Repo is public → scheduled Actions minutes are free.
- **`scripts/db-freshness.ts`** — read-only diagnostic that produced this
  postmortem's evidence: poll-freshness, hourly snapshot cadence, daily
  capture presence, war sync recency. Usage:
  `DATABASE_URL=... bun run scripts/db-freshness.ts [days]`.
- **`scripts/assert-route-modes.sh`** — `/api/health` registered as a
  dynamic route in the build contract.
- **`docs/concept/04`** — monitoring rule appended to the failure-handling
  section.

## Decisions Made
- **Watchdog on GitHub Actions, not another cron-job.org job** — the monitor
  must not share a failure domain with the monitored thing: if cron-job.org
  itself has problems, its self-alerts are exactly the emails that go
  unread. Actions scheduling is an independent provider, and the repo
  already runs scheduled workflows (nightly smoke) successfully.
- **30-minute staleness threshold** — 6 missed light polls: tolerant of
  transient blips (single missed polls happen in normal operation), fast
  enough to surface a real outage within the hour.
- **Public health endpoint with timestamps only** — the smoke/watchdog
  pattern needs unauthenticated reads; poll timestamps carry no sensitive
  data. Everything else stays behind secrets.
- **No ingest-route changes** — the failure was infrastructure-level; the
  route's best-effort semantics and failed-poll safety performed as
  designed. Recovery was automatic once latency subsided.
- **Detection gap accepted for VERCEL_APP_URL secret** — watchdog exits
  neutral without it (same contract as smoke).

## Next Action
Nothing blocking — data flow is verified healthy and monitored. Owner-side
recommendations: (1) enable cron-job.org's retry option on the light-poll
job to smooth over single-shot timeouts; (2) keep an eye on the Supabase
incident (still "identified") — if latency recurs, the watchdog will now say
so within 30 minutes; (3) verify the first scheduled watchdog runs appear
green in the Actions tab.
