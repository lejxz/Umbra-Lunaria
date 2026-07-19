# 03 — Data Model & Database

## Provider

**PostgreSQL via Neon**, installed through the Vercel Marketplace (Storage tab in the Vercel dashboard). Free tier is enough for a single clan (~50 members) with snapshots every 10–15 minutes.

Setup: Vercel Dashboard → project → Storage → Marketplace Database Providers → Neon → Create. Vercel injects `DATABASE_URL` automatically.

## Column type conventions

Not restated in every table below — apply these defaults unless a table says otherwise:

- Tags (`player_tag`, opponent tags) → `text`, primary/foreign key, stored with the leading `#`.
- Timestamps (`captured_at`, `joined_at`, `left_at`, `purge_at`) → `timestamptz`, always UTC in storage; convert to `clanConfig.timezone` only at render time.
- Counts and levels (`donations`, `trophies`, `town_hall_level`, `stars_earned`) → `integer`.
- Flags (`activity_flag`, `missed`) → `boolean`.
- Free-form/nested data (`career_stats`, `unit_levels`, `labels`) → `jsonb`.

## Core tables

### `clans`
One row: clan tag, cached name/badge/level, last successful poll timestamp, feature toggles. Also caches clan-level fields refreshed each poll, not worth their own tables since they're single values, not time-series:

| column | notes |
|---|---|
| `capital_hall_level` | current, from `clanCapital.capitalHallLevel` |
| `war_wins`, `war_ties`, `war_losses`, `war_win_streak` | all-time, from the clan object directly — not limited by when this tool started polling |
| `required_trophies`, `required_town_hall_level`, `required_builder_base_trophies` | join requirements, for the about panel |
| `location`, `labels`, `war_frequency` | about panel |

### `members`
| column | notes |
|---|---|
| `player_tag` | Primary key. |
| `name` | Cached display name, refreshed each poll. |
| `role` | leader / coLeader / admin / member |
| `town_hall_level` | |
| `war_preference` | `in` / `out`, from the player object. Drives auto-select exclusion in `09-war-planning-and-auto-select.md`. |
| `career_stats` | JSONB, refreshed on the daily full `players/{tag}` batch: `warStars`, `attackWins`, `defenseWins`, `bestTrophies`, plus a small set of achievement totals (e.g. lifetime capital gold looted, lifetime troops donated). These are Supercell-tracked career totals, not limited by when this tool started — see `06-members.md`. |
| `joined_at` | First observed by this tool — not necessarily the real in-game join date. |
| `left_at` | NULL while in clan; set when missing from a poll's `members` response. |
| `purge_at` | `left_at + 14 days`. Row and dependents hard-deleted once passed. |

### `member_snapshots`
Time-series backbone, one row per member per poll cycle: `player_tag`, `captured_at`, `donations`, `donations_received`, `trophies`, `versus_trophies`, `activity_flag`. Reset detection for weekly donation resets happens at ingestion (`04-activity-tracking-and-polling.md`).

### `troop_levels`, `hero_levels`, `spell_levels`, `pet_levels`
Normalized tables, or a single JSONB `unit_levels` column per member. JSONB is the Phase 1 default — normalize later only if cross-member unit queries are actually needed.

### `wars` and `war_attacks`
One row per war observed via `currentwar`/`warlog`; one row per attack (attacker, defender, stars, destruction %, order). Only covers wars fought since this tool started polling.

### `war_participants`
One row per roster member per war — this is what makes missed-attack tracking possible. `war_attacks` only logs attacks that happened; a member who used 0 attacks has no row there at all. `war_participants` covers the full roster regardless of whether they attacked.

| column | notes |
|---|---|
| `war_id` | FK → wars |
| `player_tag` | FK → members |
| `attacks_allowed` | from the war's `attacksPerMember` API field |
| `attacks_used` | count of entries in that member's `attacks` array |
| `stars_earned` | sum across their attacks |
| `missed` | `attacks_used = 0` — the flag driving the "did not attack" stat |

### `capital_raid_seasons` and `capital_contributions`
Mirrors the API's raid season structure; per-member offense/defense contribution.

### `capital_district_snapshots`
One row per district per poll — daily cadence is enough, district levels change over days/weeks, not minutes. `district_name`, `district_hall_level`, `captured_at`, sourced from `clanCapital.districts[].districtHallLevel`. Diffed the same way as activity: a level increase between snapshots is logged as an upgrade event with a date. Corrects an earlier version of `08-clan-capital.md`, which assumed no district-level data existed at all — it does, just not a live in-progress/remaining-cost view.

### `war_rosters` and `war_roster_slots`
Draft/finalized rosters from the planning tool.

## Retention policy

1. Every poll cycle, any `player_tag` in the DB missing from the live `members` response gets `left_at = now()`, `purge_at = now() + 14 days`.
2. Rejoining before `purge_at` clears both fields.
3. A daily Vercel Cron job (`/api/cron/purge`) hard-deletes the `members` row and dependent `member_snapshots`/unit-level rows once `purge_at` passes.
4. `war_attacks` rows for a purged member keep the war outcome but anonymize the tag (hashed), so clan-level war win/loss and star totals stay intact instead of silently drifting every time someone leaves.

## Config table vs. config file

Static settings (clan tag, feature toggles) live in the checked-in config file (`11-config-specification.md`). Settings that change at runtime through the UI (war roster drafts, leader notes) live in the database.
