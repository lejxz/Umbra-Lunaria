# Log 034 — Fix Card Heights + Page Background

**Date:** 2026-07-21
**Time:** 05:31 PM (+08:00)

## Summary of Session

Fixed the three bottom cards (Member Activity Score, Clan Log, Needs Attention) that were growing to fit all content instead of scrolling. Changed `minHeight: 380px` to `height: 380px` so they're fixed height with internal scrolling. Also added `Clan-Card-Background.png` as a subtle full-page background image with an 85% dark overlay.

## Work Completed

### Fixed card heights
- Changed `style={{ minHeight: "380px" }}` to `style={{ height: "380px" }}` in all three bottom cards:
  - `activity-score-leaderboard.tsx`
  - `clan-log.tsx`
  - `needs-attention.tsx`
- With `minHeight`, the cards grew to fit all content (the clan log had 20 entries, making it very tall). With fixed `height: 380px`, the content area uses `flex-1 overflow-y-auto` to scroll within the fixed height.
- Verified: all three cards are exactly 380px tall.

### Page background
- Updated `globals.css`:
  - `body` now uses `background-image: url("/assets/Clan-Card-Background.png")` with `background-size: cover`, `background-position: center`, `background-attachment: fixed`
  - Added `body::before` pseudo-element with `rgba(9, 8, 17, 0.85)` overlay — 85% dark overlay so the background is visible at ~15% opacity but content remains readable
  - Added `body > * { position: relative; z-index: 1; }` so all content sits above the overlay
  - Removed the old `radial-gradient` background

## Decisions Made

- **`height` not `minHeight`**: `minHeight` lets the card grow beyond 380px when content is long (like the 20-entry clan log). Fixed `height` with `flex-1 overflow-y-auto` on the content area ensures the card stays compact and scrolls internally.
- **85% dark overlay**: The background image is visible at ~15% opacity — subtle enough to not distract from content, but present enough to add atmosphere. The `background-attachment: fixed` keeps it stationary while scrolling.
- **`body::before` for overlay**: Using a pseudo-element with `position: fixed` and `pointer-events: none` ensures the overlay covers the viewport without blocking clicks, and stays fixed during scroll.

## Next Action

Proceed to Step 1.3: Implement Members and member detail.
