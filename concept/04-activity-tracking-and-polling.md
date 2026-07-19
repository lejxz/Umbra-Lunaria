# 04 — Activity Tracking & the Polling Engine

This is the piece almost every other feature depends on, so it gets its own document instead of being buried inside "dashboard" or "members."

## What "activity" actually means here

The Clash of Clans API never tells you when someone was last online. What it gives you is a snapshot of mutable state. Activity, in this project, is defined as:

> Between two consecutive polls, did any of a member's trackable stats change?

Trackable stats: donations given, donations received, trophies, versus (Builder Base) trophies, and — during a raid weekend — clan capital gold contributed. If any of these differ between snapshot *N* and snapshot *N-1* for a member, that member is marked active for that interval.

**This is a proxy, not a fact.** A member could open the app, scout bases, and close it without donating or attacking, and this system will not see that as activity. Conversely, a single donation gives a full "active" mark for a window that might be hours long, depending on poll frequency. The UI should describe this as "activity signal" or "estimated activity," not "online status," so leadership doesn't over-trust a single flag.

## Poll frequency

Target: **every 10–15 minutes**, via the GitHub Actions workflow described in `01-tech-stack.md`. Reasoning:

- Frequent enough that the hour-by-hour activity graph (a stated requirement) actually has resolution — a once-a-day poll would make an "hourly" graph meaningless.
- Infrequent enough to stay well inside CoC API rate limits and not hammer the RoyaleAPI proxy.

Each cycle:
1. `GET /clans/{clanTag}/members` (one call, gets the whole roster's donation/trophy state).
2. Diff against the most recent snapshot per member.
3. Insert new `member_snapshots` rows, set `activity_flag` per member.
4. Update `members.left_at`/`purge_at` for anyone missing from the response (see `03-data-model-and-database.md`).
5. Only during an active war (checked cheaply via a cached `wars.state`), also poll `currentwar` on this same cadence — otherwise skip it, no need to poll war state when there is no war.

Full `players/{tag}` detail (troop/hero/spell/pet levels, Builder Base) is **not** fetched every cycle for every member — that's 50 extra API calls every 10 minutes for data that changes rarely (upgrades take hours to days). Instead:
- Fetched on a slower daily batch cycle, **and**
- Fetched on demand, with a short cache TTL, when a leader opens that specific member's detail popup and the cached copy is more than a few hours old.

## Handling the weekly donation reset

Supercell resets donation counts to 0 at the end of each Clan Games / weekly cycle. A naive diff would read that reset as "donations decreased by 400," which is nonsense and must not be logged as negative activity or thrown into the activity graph as a dip. The ingestion logic explicitly detects a reset (current value less than previous, combined with a small tolerance/heuristic around the known weekly reset window) and records it as a reset event, not a real decrease. Get this wrong and the whole donation graph produces a misleading weekly cliff.

## Why there's no login-streak feature

A login streak was in the original brief. It's been dropped, not softened into an "estimate," because there is no API field — direct or indirect — that reflects when someone opened the app. The activity flag above is grounded in things that genuinely change value in the API response (donations, trophies, capital contributions); a streak claims something the data can't actually back up, since attacking and donating five times in one polling window is indistinguishable from doing it once. See the fuller reasoning in `00-overview.md`. What stays is the honest version: activity graphs and activity-based war-roster ranking, both built on real field changes, both clearly labeled as inferred activity rather than confirmed logins.

## The cold-start problem

On day one of deployment, there is no history. The activity graph is empty, and the war-planning auto-select (`09-war-planning-and-auto-select.md`) has nothing to rank on except live troop levels. This is expected and should be communicated in the UI (e.g., "Activity tracking started on [date] — data before this is not available") rather than showing a confusing blank chart with no explanation.
