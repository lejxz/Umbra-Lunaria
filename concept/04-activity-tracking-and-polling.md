# 04 — Activity Tracking & the Polling Engine

## Activity flag

Between two consecutive polls, if any of a member's trackable stats changed — donations given, donations received, trophies, versus trophies, capital gold contributed during a raid weekend — that member is marked active for that interval. Presented in the UI as "activity," not "online status."

## Poll frequency

Every 10–15 minutes, via the GitHub Actions workflow (`01-tech-stack.md`).

Each cycle:
1. `GET /clans/{clanTag}/members` — one call, whole roster.
2. Diff against the most recent snapshot per member.
3. Insert `member_snapshots` rows, set `activity_flag` and detect login days (below).
4. Update `members.left_at`/`purge_at` for anyone missing from the response.
5. Poll `currentwar` on the same cadence only while a war is active.

Full `players/{tag}` detail (troop/hero/spell/pet levels, Builder Base) is fetched on a slower daily batch cycle, plus on demand with a short cache TTL when a leader opens a member's detail popup.

## Login activity graph

Built from daily donation deltas specifically, not the general activity flag. A donation (given or received) requires the player to be online and act, so it's a stronger signal than a passive stat change. Logic:

- Track `donations` and `donations_received` per poll.
- A calendar day is marked as a **login day** if either value increased since the last poll captured that day.
- Supercell resets both counters to 0 weekly. A reset (value drops) is never counted as a login day by itself; only an *increase* after the reset counts.
- Rendered as a calendar/graph of login days per member — dates, not a streak count.

This is still an inference (a login without any donation activity won't show up), but it's a real, verifiable signal, not a guess. Labeled "estimated login activity" in the UI.

## Weekly donation reset handling

Same reset logic applies to the donation totals shown on the dashboard (`05-dashboard.md`) — a reset must not be read as a drop in activity.

## Cold start

No history exists before the tool starts polling. Activity graphs, login graphs, and `09-war-planning-and-auto-select.md` scoring are all empty on day one and build up from there. UI should state the tracking start date rather than show an unexplained blank chart.
