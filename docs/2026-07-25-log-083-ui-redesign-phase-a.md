# Log 083 — UI Redesign Phase A: Foundation

**Date:** 2026-07-25
**Time:** 07:00 PM (+08:00)

## Summary

Implemented Phase A of the "Crystalline Observatory" UI redesign — the
foundation layer. Created 5 shared components + CSS utilities + Tailwind
config bump + installed framer-motion for Phase E (interactivity).

## Work Completed

### A1. Installed framer-motion
`bun add framer-motion` — v12.42.2. Will be used in Phase E for page
transitions, card hover lift, tab underline slide, modal animations, and
count-up stats.

### A2. CSS utilities (globals.css)
Added 4 new component classes:
- `.panel` — Level 1 card surface (rounded-2xl + border + bg-umbra-surface/40 + shadow-lg + backdrop-blur-md). Replaces `.glass` for new components.
- `.tile` — Level 2 inner stat tile (rounded-lg + border-white/[.04] + bg-white/[.025] + p-3).
- `.hover-subtle` — unified hover bg (white/[.04]) for rows/tiles.
- `.hover-emphasis` — unified hover bg (white/[.08]) for buttons/cards.

`.glass` is kept as a backward-compat alias (existing components still use it).

### A3. Tailwind config
Bumped `umbra.muted` from `#A89CC4` → `#B8ACD4` (slightly lighter) for
better WCAG AA contrast at text-xs (13px) and below. This is a global
change — all `text-umbra-muted` instances get the improvement.

### A4-A8. Five shared components

| Component | File | Replaces |
|---|---|---|
| `<Button>` | `components/ui/button.tsx` | 8+ inline button styles |
| `<Eyebrow>` | `components/ui/eyebrow.tsx` | 37+ inline kicker patterns |
| `<Panel>` | `components/ui/panel.tsx` | `.glass` + manual border |
| `<StatTile>` | `components/ui/stat-tile.tsx` | `bg-white/[.035]` stat boxes |
| `<Pill>` | `components/ui/pill.tsx` | Various inline badge styles |

**`<Button>`** — 3 variants (primary, ghost, icon) × 3 sizes (sm, md, lg).
All use rounded-full, inline-flex, focus-ring, transition, disabled states.
Icon-only mode auto-detected when variant="icon" or icon provided without children.

**`<Eyebrow>`** — 6 accent colors (purple, amber, yellow, emerald, sky, rose).
Outputs `font-mono text-label uppercase tracking-[.16em] {accent-color}`.

**`<Panel>`** — base `.panel` class + optional stained-glass top-edge accent
(`border-t-2 border-t-{color}/30`). 6 accent colors matching the section
color system. Hover: `border-umbra-line/40` brighten.

**`<StatTile>`** — `.tile` class with label (mono, uppercase) + value
(font-display, tabular-nums). Supports `format="locale"` for number formatting,
null → "—", and optional icon.

**`<Pill>`** — 5 tones (purple, amber, emerald, rose, muted). rounded-full,
mono font, uppercase, tracking-wider.

### A9. Verification
- Typecheck: clean
- Lint: 0 errors (13 pre-existing warnings in untouched files)
- Tests: 147/147 pass
- Browser: dashboard renders at 200, no console errors

## Next: Phase B (Navigation redesign)
Rewrite the sidebar + mobile bottom bar per the implementation plan §2.
