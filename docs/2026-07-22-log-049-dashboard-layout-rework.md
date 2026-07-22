# Log 049 — Dashboard Layout Rework

**Date:** 2026-07-22
**Time:** 03:15 AM (+08:00)

## Summary of Session

Reworked the dashboard layout to elevate the Activity Score Leaderboard (moved from Row 5 to Row 4), group activity-themed panels together (Score + Timeline), group member-event panels together (Needs Attention + Clan Log), and convert Data Freshness from a full card to a compact inline footer strip.

## New Layout

```
Row 1: [Clan Identity — full width]
Row 2: [War Record | Current War | Capital] — 3 cols
Row 3: [Donations — full width]
Row 4: [Activity Score Leaderboard | Activity Timeline] — 2 cols
Row 5: [Needs Attention | Clan Log] — 2 cols
Row 6: [Navigation Summary — full width]
Footer: [Compact data freshness chips — inline strip]
```

## Changes

### Row 4: Activity Score + Activity Timeline (2 cols)
- Previously: Activity Timeline was full-width (Row 4), Activity Score was in a 3-col row (Row 5)
- Now: Side by side — "who's active" (leaderboard) next to "when are they active" (timeline)
- Activity Score gets visibility much higher on the page

### Row 5: Needs Attention + Clan Log (2 cols)
- Previously: 3-col row with Activity Score + Needs Attention + Clan Log
- Now: 2-col row with just Needs Attention + Clan Log
- Both are member-event panels — grouped together as a "member activity" section

### Data Freshness → compact footer
- Previously: Full card with 4 rows in a 2-col grid alongside Navigation Summary
- Now: Single inline strip of 4 chips (Last poll, Daily batch, Tracking started, War synced)
- Uses `FreshnessChip` component (inline label + value) instead of `FreshnessRow` (full-width row)
- Frees vertical space and gives Navigation Summary full width

### Navigation Summary — full width
- Previously: 2-col alongside Data Freshness
- Now: Full width strip (Row 6)
- Acts as the "where to next" section before the footer

## Decisions

- **Activity Score click → same member detail popup**: No separate score-breakdown popup. Clicking a member in the leaderboard opens the unified MemberDetailSheet (which already has the Activity Score breakdown in the Donations section). This keeps things consistent — one popup everywhere.
- **2-col rows instead of 3-col**: With Activity Score elevated to Row 4, the remaining member panels (Needs Attention + Clan Log) work better as a 2-col pair. 3 cols made each panel too narrow for the content.
- **Compact freshness footer**: Data Freshness is reference info, not primary content. An inline chip strip at the bottom is sufficient and doesn't waste a full card's worth of vertical space.

## Next Action

Proceed to Step 1.4: Implement War Center.
