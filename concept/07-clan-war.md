# 07 — Final Clan War Center

## Purpose

The War Center combines all-time/current clan war context with tracked per-member execution. It supports regular wars, CWL, current battle management, and preparation-day scouting without pretending to have history the API cannot provide.

## War Center landing state

The top of the page always answers:

1. Is the clan in preparation, battle, or no war?
2. When does preparation end or battle end?
3. What are each clan’s stars, destruction, attacks used, and attacks remaining?
4. Who still has attacks available?
5. When was the displayed state last refreshed?

When no war is active, show the most recent completed war and a clear no-active-war state.

## Current war detail

### Summary

1. War type, state, team size, and attacks per member.
2. Preparation and battle timers using API times.
3. Own and opponent clan identity, badges, levels, stars, destruction, and attack progress.
4. Current war capture time.

### Roster and attack status

1. Both clan rosters ordered by map position.
2. Member Town Hall level and role where supplied.
3. Attacks used versus allowed.
4. Best stars/destruction earned.
5. Prominent no-attack/attacks-left state.
6. Link from a clan member to the reusable member detail sheet.

### Attack log

1. Attacker and defender.
2. Map positions where known.
3. Stars, destruction, attack order, and time.
4. Sort by attack order by default.

## Refresh behavior

1. The page exposes a large manual refresh control.
2. `/api/war/refresh` fetches server-side and updates the stored current-war state.
3. A 30–60 second shared TTL prevents concurrent refresh bursts.
4. The result reports the capture time and any safe error state.
5. Browser polling directly against Supercell is prohibited.

## War history

### Regular wars

Show opponent, result, war size, stars, destruction, end date, and a link to a detail view. Historical backfill from `warlog` is permitted only while the clan’s `isWarLogPublic` value permits it.

If the war log is private or a historic record is unavailable, say so directly: history before tracking may be incomplete and new rich records build from captured current wars.

### Clan War League

Show league group, rounds, war status, opponent, result, and round-level detail. CWL uses the league-group and war-tag endpoints; it is not inferred from the regular-war log.

## Preparation-day scouting

When state is `preparation`, render a side-by-side own/opponent roster:

1. Map position.
2. Player name and Town Hall level.
3. League information where available.
4. Town Hall mismatch and likely matchup cues.
5. Link to the Planning page for manual lineup construction.

These cues support leader discussion; they do not dictate attack assignments.

## Data-quality rules

1. A war is only “live” to the latest successful capture time.
2. Participant data is exact for wars observed by the tracker.
3. Missed-attack metrics do not claim pre-tracker history.
4. All times are converted from API UTC values to the clan timezone for display.
