# Log 091 — UI Phases 9-10: Navigation Polish + Readability

**Date:** 2026-07-25
**Time:** 11:50 PM (+08:00)

## Phase 9: Navigation Polish

### Changes to `components/navigation.tsx`
- **Logo:** `<img>` → `<Image>` component with alt="Umbra Lunaria"
- **Collapsed width:** `lg:w-20` (80px) → `lg:w-16` (64px) — tighter, more standard icon-only state
- **Transition speed:** `duration-300 ease-in-out` → `duration-200 ease-out` — snappier, less jarring resize
- **All child transitions matched:** logo fade, nav label fade, status footer fade all changed from `duration-300` to `duration-200` — everything arrives simultaneously
- **Logo padding:** collapsed `p-4` → `p-4` (kept), expanded `p-6` → `p-5` (matches card standard)
- **Nav item padding:** expanded `lg:px-4` → `lg:px-3`, `lg:py-3` → `lg:py-2.5` — slightly tighter
- **Status footer:** redesigned to show emerald dot + glow + "Systems nominal" + "Tracking the clan quietly." — full-width at bottom, no absolute positioning jank
- **Mobile safe-area:** added `style={{ paddingBottom: "env(safe-area-inset-bottom)" }}` on the aside for iOS notch support

## Phase 10: Readability Pass

### Changes
- **Muted color bump:** `umbra-muted` from `#A89CC4` → `#B0A4CC` — slightly lighter for better WCAG AA at small text sizes (9-13px)
- **Tooltips on truncated names:** added `title={name}` on strategy page member names (2 instances)
- **`tabular-nums`:** added to numeric stat displays across member-detail-sheet, score-leaderboard, members-roster, hall-of-fame record-card, strategy page
- **Grid gaps:** already standardized in Phase 8 (card grids = gap-4, tile grids = gap-2)

## Verification
- Typecheck: clean
- Lint: 0 errors (12 warnings — one less than before, the old `clanConfig` unused import warning disappeared)
- Tests: 147/147 pass
