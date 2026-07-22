# 04 — Polling, Historical Tracking, and Data Quality

## Polling schedule

Umbra Lunaria uses two capture modes:

| Mode | Target cadence | Work |
|---|---|---|
| Light poll | Every 10 minutes | Roster, member snapshots, join/leave detection, and current war while preparation/battle is active. |
| Daily batch | Once daily | Clan cache, full player details, Capital districts, completed raid seasons, and stale reference refreshes. |

Both capture modes are triggered by an **external third-party cron-job web service** (e.g. cron-job.org / EasyCron / UptimeRobot Cron) that POSTs `/api/ingest` on a fixed schedule with the `INGEST_SECRET` bearer token. This replaced the earlier GitHub Actions trigger because the third-party service delivers more consistent, sub-minute-jitter scheduling than GitHub Actions cron (which drifts under load) and keeps both the light poll and the daily batch behind one configurable scheduler. The repository's `.github/workflows/poll.yml` is retained as a manual (`workflow_dispatch`) fallback for ad-hoc runs, not as the primary scheduler.

The daily retention purge is still run by **Vercel Cron** (`/api/cron/purge`), because it only needs once-daily execution and Vercel Cron can call the route with the `CRON_SECRET` natively.

Two cron jobs are configured in the third-party service:

1. **Light poll** — every 10 minutes, `POST /api/ingest` with body `{"batch": false}` and `Authorization: Bearer <INGEST_SECRET>`.
2. **Daily batch** — once daily (e.g. 04:00 clan time), `POST /api/ingest` with body `{"batch": true}` and the same bearer token.

Scheduled delivery is best effort: the UI must tolerate delayed or missed samples and show the latest successful capture time.

## Light-poll sequence

1. Fetch the clan member roster.
2. Upsert current member display values by stable player tag.
3. Compare each observed counter with the prior snapshot.
4. Insert a new member snapshot with reset-aware donation and activity evidence.
5. Mark absent retained members as left and set their purge deadline.
6. Clear departure state for a rejoined player.
7. If a war is in `preparation` or `inWar`, fetch and upsert current-war, participants, and attacks.

## Daily-batch sequence

1. Refresh the clan cache and its full identity/war/Capital fields.
2. Fetch complete player details for retained members on a safe, rate-aware cadence.
3. Refresh unit-level and career-detail payloads.
4. Capture Capital district levels.
5. Fetch completed Capital raid seasons and per-member contributions.
6. Refresh any stale reference mapping required for presentation, without replacing audited raw values.

## Reset-aware donation accounting

Donation totals are calculated from consecutive snapshots, never from only the first and last counter in a window.

For each consecutive pair for a member:

```text
if current_counter >= previous_counter:
  contribution = current_counter - previous_counter
else:
  contribution = current_counter  // weekly reset occurred
```

The selected 24-hour, 7-day, or 30-day total is the sum of each pair’s contribution in that window. This preserves donations made after a weekly reset instead of turning them into a false zero. The first sample has no prior delta and contributes no inferred history.

The same rule applies independently to donations given and received. Time-window boundaries are calculated in the clan timezone, then queried as UTC timestamps.

## Activity and estimated login evidence

### Activity flag

A member is marked active for a poll interval when an observable state changed, such as:

1. Donations given or received.
2. Trophies or Builder Base trophies.
3. A current Capital contribution value when it is observed.
4. Other explicitly tracked player fields added in future migrations.

This is activity evidence, not online presence. The UI must never call it “online now.”

### Estimated login days

A calendar day receives estimated login evidence when donations given or received increase during that day. A weekly counter reset alone does not count as a login. The view is labeled “estimated login activity,” presents dates rather than a fake streak, and is absent until enough snapshots exist.

## Cold starts, partial data, and failures

1. All tracked history begins at the first successful capture; the product cannot reconstruct prior activity or donation trends.
2. Charts show a tracking-start date and a useful partial-data state.
3. A failed poll retains existing data and records a failure for observability; it must not mark members inactive or departed.
4. A member detail view can show current API data even when historical sections are not ready.
5. Rank and auto-select views show “limited data” when their required observation period is incomplete.
