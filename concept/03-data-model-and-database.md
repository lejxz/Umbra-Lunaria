# 03 — Final Data Model & Retention Contract

## Database role

Neon PostgreSQL is the product memory. Supercell supplies the latest state; the database stores the state needed to render fast pages and the observations needed to explain change over time.

All timestamps are stored as `timestamptz` in UTC and rendered in `clanConfig.timezone`. Tags are stored as text with the leading `#`. Integer values are used for counts and levels; JSONB is reserved for nested API payloads that are read together rather than queried independently.

## Core entities

### `clans`

One row for the configured clan. It caches all current clan facts used by the identity, war-record, and Capital cards:

1. Identity: tag, name, description, type, badge URLs, location, chat language, family-friendly status.
2. Status: clan level, member count, clan points, Builder Base points, Capital points, leagues, labels, and requirements.
3. War facts: frequency, wins, ties, losses, and win streak.
4. Capital facts: Capital Hall level and latest districts payload.
5. Freshness: last successful clan capture time.

Missing API fields remain nullable. A nullable war-loss count is not equivalent to zero.

### `members`

One row per currently retained player tag. It holds the latest display profile and membership lifecycle:

1. Current name, role, Town Hall, experience, league, trophies, Builder Base fields, and clan rank.
2. Current war preference and daily-refreshed player detail summary.
3. Career totals and selected achievement values in a structured JSONB payload.
4. `joined_at`, `left_at`, and `purge_at` observations made by Umbra Lunaria.

`joined_at` means “first observed by this tracker,” not the player’s true historic clan-join date.

### `member_snapshots`

One row per observed member per light poll. It contains the counters required to derive historical trends:

1. Donations given and received.
2. Home and Builder Base trophies when available.
3. Activity flag.
4. Login-day evidence flag.
5. Capture timestamp.

This table is the source for donation windows, activity timelines, estimated login days, and the activity component of Member Activity Score.

### `unit_levels`

The latest complete player progression payload keyed by player tag:

1. Troops and siege machines.
2. Heroes and hero equipment.
3. Spells.
4. Pets.
5. Builder Base progression.
6. Capture timestamp.

The captured API currently represents pets among troop-like progression entries. The persistence layer may expose a normalized `pets` presentation field, but it must preserve the original API category mapping for refreshes and audits.

### Optional `member_name_observations`

If name history is surfaced, store `(player_tag, name, observed_at)` whenever the current API name changes. This creates history only after tracking begins; the API cannot backfill prior names.

## War entities

### `wars`

One row per regular war or CWL war. It stores opponent identity, war type, state, team size, attacks per member, stars, destruction, result, and lifecycle times.

### `war_participants`

One row for every rostered member in a tracked war, including members with zero attacks. It holds attack allowance, attacks used, stars earned, and missed status. This is the authoritative source for missed-war and attack-slot-use metrics.

### `war_attacks`

One row per attack with attacker, defender, stars, destruction, attack order, and timestamp. It supports attack logs, average stars, and three-star rate.

## Capital entities

### `capital_district_snapshots`

One row per district per daily clan capture. Diffs between consecutive snapshots create completed district-upgrade events; no record should claim live remaining cost or percentage progress.

### `capital_raid_seasons` and `capital_contributions`

Completed raid seasons retain totals, rewards, attacks used, resources looted, and per-member contribution. These tables drive Capital history, zero-attack attention, participation, and the Capital component of Member Activity Score.

## Hall of Fame and history entities

### `hall_of_fame_records`

Top-5 leaderboard per award category (`philanthropist`, `vanguard`, `dedicated`, `capitalist`, `unsleeping` — full definitions in `05-dashboard.md` section 8), one row per award/rank pair, overwritten on each daily batch rather than accumulated. `holder_name` is stored directly on the row and preserved after the source member is purged, so a historical record stays displayable even once the underlying `members` row is gone. Populated by `lib/db/records-updater.ts`.

### `membership_events`

Append-only join/leave/rejoin log, one row per event, keyed by player tag with the display name captured at event time. This is the correct fix for a real gap in an earlier version of this schema: a single mutable row per member can't represent "left, then rejoined" as two distinct events, and loses the leave date entirely once purged. This table is exempt from both the 14-day member retention purge and the snapshot pruning pass — see "NOT pruned" below — specifically so the clan activity log (`05-dashboard.md` section 9) keeps working after the member row itself is gone.

### `cwl_seasons`

One row per Clan War League season: season identifier, state, the full league-group API response as JSONB, and capture time. Stored as a raw payload rather than normalized, since the War Center reads the league group structure directly rather than reconstructing it from separate rounds/clans tables.

## Planning and settings entities

1. `war_rosters` stores draft/finalized roster metadata, creator, title, and war size.
2. `war_roster_slots` stores player tags and selected map positions.
3. `runtime_settings` stores administrator-editable thresholds and score weights with an update timestamp and validation version.
4. A minimal administrator-session/audit record may be added when write protection is implemented; it must never store plaintext secrets.

## Derived data rules

1. Derived values are calculated from source tables at read time or through explicit materialized summaries.
2. The source window and tracking start date must accompany derived values when data is partial.
3. A score or percentage never overwrites the original API facts used to produce it.
4. New persistent requirements require a Drizzle migration; undocumented schema drift is not permitted.

## Retention and privacy contract

1. A member absent from a live roster receives `left_at = now()` and `purge_at = left_at + memberRetentionDays`.
2. Rejoining before purge clears both lifecycle fields.
3. The daily purge deletes the retained member profile, snapshots, progression, and name observations after the retention deadline.
4. Historic war outcomes remain useful after a purge. Attack and participant data must retain aggregate war meaning while the departed player identity is anonymized where required.
5. The clan log keeps enough immutable event information to render a clear “left on [date]; data removed” state after profile data has been purged.

## Migration rollback strategy

Drizzle migrations are forward-only in this project — `drizzle-kit` does not auto-generate down-migrations, and writing hand-rolled SQL rollback for every migration adds maintenance cost without clear benefit for a single-clan tool with a small schema. The rollback strategy is therefore **Neon branch restore**, not SQL down-migrations.

1. **Forward verification before production.** Every new migration (`drizzle/NNNN_*.sql`) is applied to a Neon branch first (Neon's free tier supports branching) and the affected read/write paths are smoke-tested there. Only after the branch verifies clean is the migration applied to the production database (via the daily deploy's `drizzle-kit migrate`, or the HTTP migrator in `scripts/migrate.ts` for sandbox/dev).
2. **Rollback = restore the branch.** If a migration corrupts production data, the recovery path is to restore the Neon database to its pre-migration state using Neon's built-in point-in-time restore (free tier retains ~7 days of history). This is faster and more reliable than running a hand-written down-migration, and it restores not just schema but any data written between the bad migration and the rollback.
3. **Migration files are append-only.** Never edit an already-applied migration SQL file — add a new migration that corrects the issue instead. The `drizzle/meta/_journal.json` + the `__drizzle_migrations` table track applied state; editing applied files causes checksum drift.
4. **Every migration ships with its journal entry.** A new `drizzle/NNNN_*.sql` file must be accompanied by a new entry in `drizzle/meta/_journal.json` so both `drizzle-kit migrate` and the HTTP migrator apply it in order.

This keeps the migration surface simple and honest: forward-only SQL, verified on a branch, rolled back via Neon restore if ever needed.

## Retention and pruning

The database runs on Neon's free tier (512 MB storage, 100 CU-hours/month). Without pruning, `member_snapshots` — the dominant write table — would grow unbounded (48 polls/day × N members × 365 days). Pruning keeps the database bounded at any clan size.

### Checkpoint columns

Three columns on `members` store cumulative lifetime totals, computed from ALL snapshots before pruning:

| Column | Computed from | Used by |
|---|---|---|
| `cumulative_donations_given` | Reset-aware lifetime donation delta (given) | HoF Philanthropist, HoF Unsleeping, Activity Score ("all" window) |
| `cumulative_donations_received` | Reset-aware lifetime donation delta (received) | HoF Unsleeping (via Philanthropist) |
| `cumulative_login_days` | Distinct calendar days with `loginDayFlag = true` | HoF Dedicated, HoF Unsleeping |

Checkpoints are computed:
1. During the daily batch (00:00 PHT, before HoF) — primary.
2. During the purge route (02:00 PHT, before pruning) — safety re-compute in case the daily batch failed.

### Pruning schedule (runs daily at 02:00 AM PHT via Vercel Cron)

| Pass | What | Rule | Rationale |
|---|---|---|---|
| 1. Departed members | Delete members + snapshots + unit_levels | `purge_at < now()` | Existing 14-day retention policy. |
| 2. Intra-day snapshots | Delete snapshots >7 days old, keep LAST per member per day | `captured_at < 7d AND id NOT IN (DISTINCT ON (player_tag, day) ... ORDER BY captured_at DESC)` | The last snapshot of each day has the highest donation counter (preserves delta chain) and the most accurate flags. Cuts ~98% of growth. |
| 3. Capital snapshots | Delete `capital_district_snapshots` >90 days | `captured_at < 90d` | Upgrade timeline derives from diffs; old raw snapshots aren't needed for display. |
| 4. Old backfill wars | Delete wars >365 days with no snapshot, `war_type='regular'` | `end_time < 365d AND war_snapshot IS NULL` | History list shows 50, trend chart shows 20 — old backfill rows have no detail and aren't referenced. |

### NOT pruned (by design)

| Table | Why kept |
|---|---|
| `membership_events` | Immutable log, tiny (~100/year). |
| `war_attacks` | Small (~500/year), referenced by HoF Vanguard (3-star count) + attack distribution donut. |
| `war_participants` | Small (~200/year), referenced by member war history (all-time). |
| `hall_of_fame_records` | 5 rows per award, overwritten not accumulated. |
| `cwl_seasons` | ~12/year, tiny. |
| Daily last-of-day snapshots | Kept forever — preserve the donation-delta chain and login-day flags. The checkpoint columns cover the lifetime totals. |

### Cron architecture

| Job | Platform | Schedule (PHT) | Purpose |
|---|---|---|---|
| Light poll | Third-party cron (cron-job.org) | Every 15 min | Roster + snapshots + war sync |
| Daily batch | Third-party cron (cron-job.org) | 00:00 midnight | Full player details + war-log backfill + checkpoints + HoF |
| Purge | Vercel Cron | 02:00 AM (`0 18 * * *` UTC) | Safety checkpoint → prune |

The 2-hour gap between the daily batch (00:00) and the purge (02:00) guarantees checkpoints are computed before pruning. The purge route also re-computes checkpoints as a safety net.
