# Log 085 — UI Redesign Phase C: Dashboard Refactor

**Date:** 2026-07-25
**Time:** 08:00 PM (+08:00)

## Summary

Refactored all 10 dashboard components to use the Phase A shared components
(`<Panel>`, `<StatTile>`, `<Eyebrow>`, `.hover-subtle`, `.tile`). Replaced
all inline `glass` classes, `bg-white/[.035]` stat boxes, `tracking-[.16em]`
eyebrow patterns, and `hover:bg-white/[.06-.07]` row hovers with the
unified design system.

## Components Refactored

| Component | Panel accent | Changes |
|---|---|---|
| `clan-identity-card.tsx` | purple | `.glass` → `.panel` + accent border |
| `war-record-card.tsx` | amber | `.glass` → `.panel` + accent; `bg-white/[.035]` → `.tile`; eyebrow → `<Eyebrow>` |
| `current-war-card.tsx` | amber | `.glass` → `.panel` + accent; tiles → `.tile`; 2 eyebrows → `<Eyebrow>` |
| `capital-summary-card.tsx` | yellow | `.glass` → `.panel` + accent; tiles → `.tile`; eyebrow → `<Eyebrow>` |
| `donation-analytics.tsx` | emerald | `.glass` → `.panel` + accent; row hover → `.hover-subtle`; eyebrow → `<Eyebrow>` |
| `activity-analytics.tsx` | emerald | `.glass` → `.panel` + accent; row hover → `.hover-subtle`; eyebrow → `<Eyebrow>` |
| `needs-attention.tsx` | rose | `.glass` → `.panel` + accent; row hover → `.hover-subtle`; eyebrow → `<Eyebrow>` |
| `clan-log.tsx` | purple | `.glass` → `.panel` + accent; row hover → `.hover-subtle`; alternating rows (`even:bg-white/[.015]`); eyebrow → `<Eyebrow>` |
| `nav-summaries.tsx` | neutral | `.glass` → `<Panel>`; ghost Link styles matched to Button ghost variant |
| `dashboard-shell.tsx` | amber + purple | 4 `.glass` → `.panel` + accent; 5 eyebrows → `<Eyebrow>` |

## Key decisions

1. **`.panel` class vs `<Panel>` component**: Existing `<section>` elements
   with `aria-labelledby` kept their structure and used the `.panel` class +
   accent border directly (preserves accessibility attributes). Only
   `nav-summaries.tsx` (no aria-labelledby) uses the `<Panel>` component.

2. **`.tile` class vs `<StatTile>` component**: Stat boxes with custom
   layouts (centered text, colored values, horizontal star displays) kept
   their JSX structure and only swapped to the `.tile` class. Simple
   label+value boxes could use `<StatTile>`.

3. **Hover standardization**: All row hovers (previously 5 different
   opacity values: .035, .04, .05, .06, .07) are now unified to
   `.hover-subtle` (white/[.04]).

## Verification
- Typecheck: clean
- Lint: 0 errors (12 pre-existing warnings in untouched files)
- Tests: 147/147 pass
- Browser: no console errors
- Grep: 0 remaining `glass`, `tracking-[.16em]`, or `bg-white/[.035]` in dashboard

## Next: Phase D (Other pages)
Apply the same refactor to members, war, capital, and Hall of Fame pages.
