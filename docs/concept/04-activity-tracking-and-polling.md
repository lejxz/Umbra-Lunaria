# 04 — Polling, Historical Tracking, and Data Quality

## Polling schedule

Umbra Lunaria uses two capture modes:

| Mode | Target cadence | Work |
|---|---|---|
| Light poll | Every 5 minutes | Roster, member snapshots, join/leave detection, and current war while preparation/battle is active. |
| Daily batch | Once daily | Clan cache, full player details, Capital districts, completed raid seasons, and stale reference refreshes. |

Both capture modes are triggered by an **external third-party cron-job web service** (e.g. cron-job.org / EasyCron / UptimeRobot Cron) that POSTs `/api/ingest` on a fixed schedule with the `INGEST_SECRET` bearer token. This replaced the earlier GitHub Actions trigger because the third-party service delivers more consistent, sub-minute-jitter scheduling than GitHub Actions cron (which drifts under load) and keeps both the light poll and the daily batch behind one configurable scheduler. The repository's `.github/workflows/poll.yml` is retained as a manual (`workflow_dispatch`) fallback for ad-hoc runs, not as the primary scheduler.

The daily retention purge is still run by **Vercel Cron** (`/api/cron/purge`), because it only needs once-daily execution and Vercel Cron can call the route with the `CRON_SECRET` natively.

Two cron jobs are configured in the third-party service:

1. **Light poll** — every 5 minutes, `POST /api/ingest` with body `{"batch": false}` and `Authorization: Bearer <INGEST_SECRET>`.
2. **Daily batch** — once daily (e.g. 04:00 clan time), `POST /api/ingest` with body `{"batch": true}` and the same bearer token.

Scheduled delivery is best effort: the UI must tolerate delayed or missed samples and show the latest successful capture time.

## Page-view caching (ISR)

To avoid unnecessary compute usage from page views, the read-only pages use Next.js **Incremental Static Regeneration (ISR)** with a `revalidate` window matching the poll cadence:

| Page | `revalidate` | Rationale |
|---|---|---|
| Dashboard (`/`) | 300s (5 min) | Matches the data's natural freshness window — the cron poll is the only thing that changes the data. |
| Members (`/members`) | 300s | Roster changes on the poll cadence; member detail sheets are fetched client-side on click (not cached). |
| Capital (`/capital`) | 300s | Capital data changes slowly (district levels take days to upgrade). |
| War (`/war`) | dynamic (no ISR) | Has a manual refresh button + 45s TTL — must stay dynamic for the refresh to work. |

Between revalidations, Vercel serves the cached HTML from the edge — **0 DB queries** per page view. Only the background revalidation (every 5 min) triggers a DB hit. The ingest route and the war refresh route both call `revalidatePath()` to bust the cache immediately after a fresh capture, so the next page view always shows the latest data.

This eliminates DB round-trips for regular page views entirely — only the scheduled revalidation window triggers a DB read. See `docs/2026-07-22-supabase-vercel-free-tier-load-analysis.md` for the original load analysis (written during Supabase era; the storage-efficiency rationale remains valid under Supabase).

## Light-poll sequence

1. Fetch the clan member roster.
2. Upsert current member display values by stable player tag.
3. Compare each observed counter with the prior snapshot.
4. Insert a new member snapshot with reset-aware donation and activity evidence.
5. Mark absent retained members as left and set their purge deadline.
6. Clear departure state for a rejoined player.
7. If a war is in `preparation` or `inWar`, fetch and upsert current-war, participants, and attacks.

Ordering note (Phase 1): step 7 actually runs BETWEEN the membership reconciliation and step 4's snapshot insert — war attacks must be on disk before the snapshot flags are computed, because the war evidence for this interval is read from `war_attacks.attacked_at` (see "War, XP and day-grain evidence"). It stays after the membership ops because `war_participants` has a foreign key to `members`.

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
3. XP level (rising — any gameplay produces XP).
4. A war attack first recorded in the interval.
5. Other explicitly tracked player fields added in future migrations.

This is activity evidence, not online presence. The UI must never call it “online now.”

### Estimated login days

A calendar day receives estimated login evidence when donations given or received increase during that day, or when the member performs at least one war attack during that day. A weekly counter reset alone does not count as a login. The view is labeled “estimated login activity,” presents dates rather than a fake streak, and is absent until enough snapshots exist.

## War, XP and day-grain evidence

The original design judged activity only from clan-roster counters (donations, trophies), which made the tracker structurally blind to the war-first member — someone who neither donates nor requests but fights every war. Phase 1 (docs/2026-09-11-implementation-plan.md §1.5) closed that gap with three evidence classes:

1. **War attacks — interval grain.** Every war attack is stored with the timestamp of the poll that first observed it (`war_attacks.attacked_at`, both regular and CWL wars). Each light poll reads, in one query, the attacks by live members in the half-open interval (that member's prior snapshot, now], and an attack in the interval sets BOTH flags — performing a war attack is unambiguous login evidence. Each attack is therefore counted exactly once, by the poll whose evidence window contains it. Attacks recorded by the manual war refresh button land in the next poll's window. A historical backfill (scripts/backfill-war-activity.ts) applied the same rule retroactively to recorded attacks: the first snapshot at/after the attack on the same clan-timezone day, plus that day's last snapshot, are flagged — healing the heatmap, streaks, and `cumulativeLoginDays` for pre-fix data.
2. **XP level — interval grain.** `member_snapshots.exp_level` stores the roster's `expLevel` each poll; a strict increase is activity evidence (XP never decreases and every XP source is gameplay). Like trophies it does NOT count as login evidence on its own — only donation movement and war attacks do.
3. **Day-grain evidence — retention.** Activity evidence must survive pruning: the daily purge keeps every snapshot carrying `activity_flag` or `login_day_flag`, in addition to the last-of-day marker, so a war day stays lit in the 30-day heatmap forever rather than fading when it ages past the 7-day pruning horizon.

Score alignment (gap G3): the Activity Score's war component counts ALL wars involving the clan — regular AND Clan War League — selected via `wars.involves_own_clan`, the same definition the roster summary and member detail use. Before Phase 1 the score filtered to regular wars only, silently excluding every CWL attack during league months.

Needs-attention alignment: the inactive queue judges "last seen" as the newest of any evidence source (flagged snapshot or raw war-attack timestamp), and its detail string names the evidence ("Last seen: war attack 2d ago · donation 9d ago") so leadership can distinguish a lapsed warrior from a lapsed donor.

## Cold starts, partial data, and failures

1. All tracked history begins at the first successful capture; the product cannot reconstruct prior activity or donation trends.
2. Charts show a tracking-start date and a useful partial-data state.
3. A failed poll retains existing data and records a failure for observability; it must not mark members inactive or departed.
4. A member detail view can show current API data even when historical sections are not ready.
5. Rank and auto-select views show “limited data” when their required observation period is incomplete.
