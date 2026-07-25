# Log 084 — UI Redesign Phase B: Navigation Redesign

**Date:** 2026-07-25
**Time:** 07:30 PM (+08:00)

## Summary

Rewrote the navigation component (sidebar + mobile bottom bar) per the
"Crystalline Observatory" implementation plan §2. All Phase B items
completed: desktop sidebar, mobile bottom bar, per-page active accent
colors, `<Image>` logo, collapse toggle at bottom, `rounded-lg` nav items.

## Changes

### Desktop sidebar (lg+)
- **Width:** 240px expanded / 64px collapsed (was 60px — round number)
- **Logo:** uses `<Image>` component (was `<img>`) with alt text
- **Nav items:** `rounded-lg` (was `rounded-[10px]` — follows the 3-value radius scale)
- **Active state:** left accent bar colored per section:
  - Dashboard → purple (`border-l-umbra-purple`)
  - Members → sky (`border-l-sky-400`)
  - War center → amber (`border-l-amber-400`)
  - Capital → yellow (`border-l-yellow-400`)
  - Hall of Fame → purple (`border-l-umbra-purple`)
- **Active bg:** `bg-umbra-purple/10` + `text-umbra-lilac`
- **Inactive:** `text-umbra-muted` + `hover-subtle` (unified .04 hover)
- **Icon colors:** active = section accent color, inactive = `umbra-muted/70`
- **Collapse toggle:** moved to bottom of sidebar (was floating on border).
  Full-width button with "◀ Collapse" text. When collapsed: just the chevron.
- **Status indicator:** emerald dot + "Systems nominal" text when expanded.
  Just the dot when collapsed. Dot has a subtle glow shadow.

### Mobile bottom bar (<lg)
- **Safe-area padding:** `env(safe-area-inset-bottom)` on the aside (NEW —
  iOS safe area respected)
- **Layout:** `flex justify-around` (unchanged)
- **Active:** icon `text-umbra-purple`, label `text-umbra-lilac`
- **Inactive:** icon `text-umbra-muted/70`, label `text-umbra-muted/40`
- **Item radius:** no rounded items on mobile (flat bar)
- **Item padding:** `px-2 py-1.5` (was `px-3 py-2`)

### Code structure
- LINKS array now typed as `NavLink[]` with `accent: AccentColor` per link
- ACCENT_LEFT_BORDER + ACCENT_ICON_ACTIVE maps for the colored left bar + icon
- Collapse toggle is a full-width button at the bottom (not a floating circle)

## Verification
- Typecheck: clean
- Lint: 0 errors in navigation
- Tests: 147/147 pass
- Browser: desktop 1920px — sidebar renders, collapse/expand works, active
  state shows accent bar. Mobile 375px — bottom bar with 5 items, safe-area
  padding applied. No console errors.

## Next: Phase C (Dashboard refactor)
Replace inline styles in dashboard components with the new shared components
(`<Panel>`, `<StatTile>`, `<Eyebrow>`, `<Button>`, `<Pill>`).
