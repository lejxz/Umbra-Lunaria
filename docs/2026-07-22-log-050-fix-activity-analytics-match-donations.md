# Log 050 — Fix Activity Analytics to Match Donations Card

**Date:** 2026-07-22
**Time:** 03:36 AM (+08:00)

## Summary of Session

Rewrote the merged Activity Analytics card to exactly match the Donation Analytics card pattern. Both cards now use the same `minHeight: 380px`, same header/stats/tabs layout, same chart height (`h-[220px]`), same grid (`1fr_280px`), same leaderboard styling, and same axis colors.

## Changes

- **minHeight**: Changed from `height: 560px` (fixed, too tall) to `minHeight: 380px` (matches Donations)
- **Chart height**: Changed from `flex-1 h-full` (unreliable) to explicit `h-[220px]` (matches Donations)
- **Header stats**: Uses `StatChip` matching `TotalChip` from Donations — same padding, font sizes, divider
- **Grid**: `lg:grid-cols-[1fr_280px]` — same as Donations (was `1fr_320px`)
- **Leaderboard styling**: Matches Top Donors — same `bg-white/[.02] border border-white/5`, same font sizes (`text-[13px]`), same padding
- **Axis colors**: Updated from `#9287AD` to `#A89CC4` (the brighter muted color from the readability pass)
- **Removed**: `overflow-hidden` on the grid container (was causing chart clipping), complex stat card with dividers (simplified to match Donations), `custom-scrollbar` class (not defined anywhere)
- **Leaderboard**: Shows top 8 entries with `maxHeight: 220px` scroll (was unbounded)

## Decisions

- **Same minHeight as Donations**: Both are "primary analytical panels" — they should be the same height for visual consistency. `minHeight: 380px` lets them grow if needed but ensures they match.
- **Explicit chart height**: `h-[220px]` instead of `flex-1` — Recharts `ResponsiveContainer` needs an explicit height to render. This is the same approach that works in Donations.
- **Leaderboard always 30d**: The Activity Score is a 30-day rolling measure (per concept/05 §5). The 24h/7d/30d tabs control the timeline chart only, not the leaderboard. Labeled "Activity Score · 30d" to make this clear.

## Next Action

Proceed to Step 1.4: Implement War Center.
