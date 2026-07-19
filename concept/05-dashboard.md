# 05 — Main Dashboard

## 1. Clan donations (24h / week / month)

Computed from `member_snapshots` diffs (see `04-activity-tracking-and-polling.md`), summed across the clan, with the weekly-reset detection already handled at ingestion time so this view never has to special-case it.

- Three toggle-able windows: last 24h, last 7 days, last 30 days.
- Total given, total received, and a leaderboard (top donors / top receivers) for the selected window.
- Ratio view (given:received) per member is a natural, cheap addition — flag as a "nice to have" for Phase 1 rather than core.

## 2. Clan activity graph

- **24h view:** hour-by-hour bucket of the count of members flagged active in that hour (or a % of roster active).
- **Week view:** day-by-day.
- **Month view:** day-by-day, or week-by-week if 30 daily bars gets visually noisy on mobile — test both, mobile-usability wins the tiebreak (see `10-mobile-support.md`).
- Every view should show a clear empty/partial state for the cold-start period described in `04-activity-tracking-and-polling.md` — don't render an empty chart with no explanation.

## 3. All-time clan war record

Stat card row: `warWins`, `warTies`, `warLosses`, `warWinStreak` — pulled directly from the clan object, all-time totals tracked by Supercell. Not limited by the cold-start problem the rest of this dashboard has, since Supercell has always been counting these regardless of when this tool started polling. Win rate computed as `warWins / (warWins + warTies + warLosses)`.

## 4. Clan info panel

Small reference panel, cached from the clan object (`03-data-model-and-database.md`): clan level, clan points, capital league, capital hall level, join requirements (`requiredTrophies`, `requiredTownhallLevel`, `requiredBuilderBaseTrophies`), location, labels, war frequency setting. Useful as a quick "about this clan" reference and if the dashboard link is ever shared for recruitment.

## 5. Needs-attention panel

- Members inactive for N+ days (configurable threshold, `11-config-specification.md`).
- Members with 0 war attacks used and little time left in an active war.
- Members with `warPreference = out` (`06-members.md`) — informational, not a problem, but useful to see at a glance who's opted out before planning a roster.

## 6. Navigation strips

- Current war status strip (state, time remaining, stars/attacks used) — links to the full War page.
- Capital raid weekend countdown/status strip — links to the full Capital page.

Keep the dashboard a **summary and navigation hub**, not a place where every table lives — the dedicated pages (Members, War, Capital) are where the depth belongs.
