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

## 3. Other dashboard widgets (candidates, not committed)

The user's own brief leaves room for "other features you might have in mind." Reasonable, low-cost additions that fit a *clan-owned* dashboard rather than duplicating in-game info:

- Current war status strip (state, time remaining, stars/attacks used) — links through to the full War page.
- Capital raid weekend countdown/status strip — links through to the full Capital page.
- Clan-level stat cards: clan level, total trophies, war win streak/win rate, capital league.
- "Needs attention" panel: members inactive for N+ days (configurable threshold), or members with 0 war attacks used with little time left in an active war.

Keep the dashboard a **summary and navigation hub**, not a place where every table lives — the dedicated pages (Members, War, Capital) are where the depth belongs.
