# Log 044 — Redesign Activity Heatmap + War Empty State + Readability

**Date:** 2026-07-22
**Time:** 02:24 AM (+08:00)

## Summary of Session

Redesigned the Activity section in the member detail popup to use a heatmap strip instead of small boxes. Redesigned the War Record section with a proper empty-state visual (crossed swords icon + message) for when no wars are tracked. Improved readability across the site by bumping base font size, line-height, and brightening the muted text color.

## Work Completed

### Activity section — heatmap redesign
- Replaced the 4×4 pixel squares with a **horizontal heatmap strip** — one cell per day, full width, with gradient fill for active days and dim for inactive
- Summary line: "X / Y active days" in large purple text + login day count
- Date labels at start/end of the strip
- "Last active" and "Tracking" info as inline text with a divider, not in boxes
- Removed the legend (the heatmap is self-explanatory)
- Hover effect: cells scale up slightly on hover

### War Record — empty state visual
- When `warsTracked === 0`: shows a dimmed crossed-swords SVG icon + "No wars tracked yet" message + subtitle
- When wars exist: shows big "X wars tracked" number + participation % + 4-cell stat grid (missed, 3-star rate, avg stars, stars earned)
- Color accents: missed (amber if >0, emerald if 0), 3-star rate (emerald), stars earned (amber)

### Readability improvements (site-wide)
- **Base font size**: set to `14px` explicitly in `body` (was browser default 16px but components were using 12-13px)
- **Line height**: `1.6` for body text (better readability for dense data)
- **Muted text color**: brightened from `#9287AD` to `#A89CC4` — more readable on dark backgrounds while still clearly secondary
- These changes apply globally through `globals.css` and `tailwind.config.ts`

## Decisions Made

- **Heatmap strip over pixel grid**: The old 4×4 pixel squares were too small and abstract. A full-width horizontal strip (one cell per day) is more intuitive — it reads left to right like a timeline, and the gradient fill gives visual weight to active days. This is similar to GitHub's contribution graph but simpler.
- **Empty state with icon**: A plain "No wars tracked yet" text is forgettable. The dimmed crossed-swords SVG gives the section visual weight even when empty, matching the war theme.
- **Brighter muted color**: `#9287AD` was too dim for small text on the dark background. `#A89CC4` provides better contrast while still being clearly secondary to white text. This is a ~15% lightness increase.
- **Explicit base font size**: Setting `font-size: 14px` on `body` ensures consistency across browsers. The tailwind config already had bumped sizes for xs/sm/base, but the body default was implicit.

## Next Action

Proceed to Step 1.4: Implement War Center.
