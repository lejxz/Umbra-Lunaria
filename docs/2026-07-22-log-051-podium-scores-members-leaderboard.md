# Log 051 — Podium Styling, Per-Window Scores, Members Page Leaderboard

**Date:** 2026-07-22
**Time:** 03:49 AM (+08:00)

## Summary of Session

Applied the donation podium styling (rank colors, #number, gradient badges) to the Activity Score leaderboard. Added league tier icons to the donation top donors. Made the 24h/7d/30d tabs switch BOTH the activity timeline chart AND the activity score leaderboard (previously only the chart switched). Added a standalone Activity Score Leaderboard card to the Members page with the full ranked list.

## Changes

### Podium styling for Activity Score leaderboard
- Rank 1: gold (`text-amber-300` with glow), `bg-gradient-to-r from-amber-500/10`
- Rank 2: silver (`text-slate-300`), `bg-gradient-to-r from-slate-400/10`
- Rank 3: bronze (`text-orange-400`), `bg-gradient-to-r from-orange-500/10`
- Rank 4+: purple (`text-umbra-purple`), plain `bg-white/[.02]`
- `#number` format matching donation top donors
- League tier icons shown next to each entry

### League icons for donation top donors
- Added `leagueTier` field to `DonationLeaderboardEntry` view model
- Updated query layer to include `leagueTier` from the member map
- Added `Image` import and league tier icon rendering to the donation top donors list

### Per-window activity scores (24h/7d/30d tabs now switch leaderboard)
- Added `activityScore7d` and `activityScore30d` to `DashboardData` view model
- Updated `getDashboard()` to fetch `getMemberActivityScore("24h")`, `("7d")`, and `("30d")` in parallel
- Updated `ActivityAnalytics` to accept `leaderboardByWindow` prop (Record of 3 windows)
- The 24h/7d/30d tabs now switch BOTH the timeline chart and the score leaderboard
- Label updates dynamically: "Activity Score · 24h" / "7d" / "30d"

### Standalone Activity Score Leaderboard on Members page
- Created `components/members/score-leaderboard.tsx`
- Shows the FULL ranked list (not capped at 8) in a responsive grid (1/2/3 cols)
- Same podium styling as the dashboard (gold/silver/bronze/purple)
- Shows league tier icon, name, TH level, league tier name, limited-data flag
- Shows component breakdown bars (4 bars per entry)
- Clickable — opens the member detail popup
- Updated `app/members/page.tsx` to fetch `getMemberActivityScore("30d")` and render the leaderboard above the roster table

## Next Action

Proceed to Step 1.4: Implement War Center.
