# 03 — Data Model & Database

## Provider

**PostgreSQL via Neon**, installed through the Vercel Marketplace (Storage tab in the Vercel dashboard). Reasoning is in `01-tech-stack.md`. Free tier is enough for a single clan (50 members) with snapshots every 10–15 minutes — this is a small amount of data, in the tens of MB per year, not a scaling concern.

Setup is: Vercel Dashboard → your project → Storage → Marketplace Database Providers → Neon → Create. Vercel injects `DATABASE_URL` (or `POSTGRES_URL`, depending on the integration's exact naming at setup time — check the generated env vars after creating it) into the project automatically. No separate Neon account juggling needed.

## Core tables (proposed, not final SQL)

### `clans`
One row. Holds the single configured clan's tag, cached name/badge/level, and the timestamp of the last successful poll. Also a natural home for a couple of feature toggles (see `11-config-specification.md`).

### `members`
| column | notes |
|---|---|
| `player_tag` | Primary key. Stable identifier — see `02-api-and-proxy-strategy.md`. |
| `name` | Cached display name, refreshed each poll. |
| `role` | leader / coLeader / admin / member, from the API. |
| `town_hall_level` | |
| `joined_at` | First time this tag was observed in the clan by this tool. Not the real in-game join date if the tool started after they joined — disclosed to the user in the UI, not silently presented as fact. |
| `left_at` | NULL while still in clan; set the poll cycle a member is no longer in the `members` API response. |
| `purge_at` | Generated as `left_at + 14 days`. Row (and dependent snapshot rows) hard-deleted by the daily purge job once this passes. See retention policy below. |

### `member_snapshots`
The time-series backbone. One row per member per poll cycle.

| column | notes |
|---|---|
| `player_tag` | FK → members |
| `captured_at` | timestamp of this poll |
| `donations`, `donations_received` | reset by Supercell weekly — the diffing logic must detect the reset (a drop to 0 or a decrease) and not count it as negative activity, see `04-activity-tracking-and-polling.md` |
| `trophies`, `versus_trophies` | |
| `activity_flag` | boolean, computed at ingestion time: did *anything* comparable change since the previous snapshot for this member? |

This table is the one that grows continuously and is the target of the retention policy.

### `troop_levels`, `hero_levels`, `spell_levels`, `pet_levels`
Normalized tables (or one JSONB `unit_levels` column per member, updated on each full `players/{tag}` fetch — see the tradeoff note below) holding current level of every unit the member has unlocked, keyed against the static reference data described in `06-members.md` for rushed % calculation.

**Tradeoff note:** a JSONB blob is simpler to write and is probably the right starting choice for Phase 1 — normalized tables only start to pay off once you need to query *across* members by specific unit level (e.g., "who doesn't have max Rage Spell"), which is a Phase 2+ feature at best. Don't over-normalize before it's needed.

### `wars` and `war_attacks`
One row per war (regular or CWL round) this tool has observed via `currentwar` or `warlog`; one row per individual attack (attacker tag, defender tag, stars, destruction %, attack order). This is the table that makes war-roster history in `09-war-planning-and-auto-select.md` possible, and it **only contains data from wars fought since this tool started polling** — see the honesty note in `00-overview.md` about historical data.

### `capital_raid_seasons` and `capital_contributions`
Mirrors the CoC API's capital raid season structure; per-member offensive/defensive capital gold contributed.

### `war_rosters` and `war_roster_slots`
The output of the planning tool: a draft or finalized roster for an upcoming war, with slot assignments, so leadership can save and revisit a plan before the war actually starts.

## Retention policy: members who leave the clan

**Requirement (as specified):** a member's data is deleted 2 weeks after they leave.

**Implementation:**
1. Every poll cycle, compare the current `members` API response against the `members` table. Any tag present in the DB but missing from the live response gets `left_at = now()` and `purge_at = now() + interval '14 days'` set, if not already set.
2. If a member **rejoins** before `purge_at`, clear `left_at`/`purge_at` — don't lose their history over a short absence (e.g., accidentally leaving and rejoining, or a clan-hop-back).
3. A **daily** Vercel Cron job (`/api/cron/purge`, once every 24 hours is genuinely sufficient here — no need to fight the Hobby cadence limit for this one) hard-deletes: the `members` row and every dependent row in `member_snapshots`, `troop_levels`/unit data, and (recommend keeping) an *anonymized* trace in `war_attacks` — see note below.

**Judgment call worth flagging:** wiping a departed member out of `war_attacks` entirely would quietly corrupt historical war records for everyone who fought alongside them (attack counts, war win/loss totals). The recommended approach is to delete their personally-identifying data (name, tag→identity mapping) but keep the war outcome row itself with the tag anonymized (e.g., replaced with a hash), so clan-level war statistics stay accurate. Decide explicitly whether this satisfies "data will be dropped or deleted" as intended — if the requirement means *fully* gone with no trace anywhere, including aggregate war stats, that's also implementable, but it will make historical war win-rate numbers silently drift downward every time someone leaves. Worth a real decision, not a default.

## Config table vs. config file

Some settings (clan tag, feature toggles) are simple enough to live in a checked-in config file (`11-config-specification.md`). Settings that change at runtime through the UI (e.g., war roster drafts, per-member notes from leadership) belong in the database, not the file, since a file change requires a redeploy and a database write doesn't.
