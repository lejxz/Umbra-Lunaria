# Log 028 — Redesign War Record, Current War, and Capital Cards

**Date:** 2026-07-21
**Time:** 01:48 PM (+08:00)

## Summary of Session

Redesigned three dashboard cards per user feedback: the War Record card (removed empty space in second half), the Capital Overview card (simplified to just stats + league, removed district list), and the Current War card (new Our-clan vs Enemy-clan layout with a custom VS sword icon).

## Work Completed

### War Record card
- Made the card `flex flex-col` so the win rate box uses `flex-1` to fill remaining vertical space — no more empty gap in the second half
- Reduced stat font size from `text-xl` to `text-lg` for better proportion
- Win rate box now centers vertically and fills the remaining space

### Capital Overview card
- Simplified: removed the 8-item district grid entirely
- Now shows just 3 stats (Hall level, Capital pts, Districts) + Capital league in a centered box
- League box uses `flex-1` to fill remaining space, matching the War Record card's balance
- Removed the `Badge` import (no longer needed)

### Current War card
- Completely redesigned with an Our-clan vs Enemy-clan layout:
  - State badge + team size centered at top
  - **Our clan** (left): stars (big purple) + destruction % (small)
  - **VS icon** (center): custom SVG with crossed swords in a circular badge
  - **Enemy clan** (right): opponent name + stars (big red) + destruction % (small)
  - Timer at bottom (when war is active)
- Created a custom `VsIcon` SVG component — two crossed swords (purple + lilac) inside a circular badge with the observatory theme colors
- Removed the old score box, destruction/attacks mini-stats, and opponent name line
- The "no war" state still shows "Clan is at peace" centered

## Decisions Made

- **`flex-1` for vertical fill**: All three cards now use `flex flex-col` with the bottom element using `flex-1` to fill remaining space. This ensures all three cards in the 3-column row have equal height with no empty gaps.
- **Custom VS sword icon**: Created a pure SVG with two crossed swords (one purple `#B678FF`, one lilac `#EEE5FF`) inside a circular badge with `rgba(182, 120, 255, 0.08)` fill. This fits the observatory theme better than a text "VS" and gives the war card a distinctive visual identity.
- **Stars + destruction as the score**: The user asked for "star & total%" for each clan. Stars are shown large (2xl font, colored), destruction % is shown small below (10px mono). This is the standard CoC war score format.
- **Removed district list from Capital card**: The user wanted just the core stats + league. The full district list belongs on the Capital page (Phase 1.5).

## Next Action

Proceed to Step 1.3: Implement Members and member detail.
