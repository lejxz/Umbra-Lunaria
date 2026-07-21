# Log 032 — Fix Activity Timeline Chart Not Rendering

**Date:** 2026-07-21
**Time:** 03:20 PM (+08:00)

## Summary of Session

Fixed the activity timeline chart that disappeared after the redesign. The `ResponsiveContainer` from Recharts needs an explicit height on its parent to render — `flex-1` + `min-h` doesn't give it a computed height it can use. Switched to an explicit `h-[220px]` on the chart container.

## Work Completed

- Changed the chart container from `min-h-[180px] flex-1` to explicit `h-[220px]`
- Removed `flex flex-col` and `minHeight: 380px` from the card section (no longer needed)
- Verified the chart now renders: `hasSvg: true, svgHeight: 220`

## Root Cause

Recharts `ResponsiveContainer` with `height="100%"` requires its parent to have an explicit computed height. With `flex-1` + `min-h-[180px]`, the div had a rendered height of 199px (from the min-height), but `ResponsiveContainer` saw `height: 100%` of a flex child that didn't have an explicit height set — it resolved to 0, so no SVG was rendered.

The donation chart works because its parent is a CSS Grid (`grid flex-1`), and grid items get explicit heights from the grid track. Flex children with `min-height` don't get the same treatment.

## Fix

Used an explicit `h-[220px]` on the chart container — simple and reliable. The card no longer needs `flex flex-col` or `minHeight` since the chart has its own fixed height.

## Next Action

Proceed to Step 1.3: Implement Members and member detail.
