# WindowPicker — One Unified Window Filter with a Themed Calendar

**Date:** 2026-09-16
**Time:** 01:05 PM (+08:00)

> Documentation note: this execution log was written retroactively the same
> day — the commit (`7f6732a`) landed before a documentation audit caught
> that it had no log entry. Content follows the shipped code.

## Summary of Session
Replaced the two-control time filter — preset `Tabs` in the card header plus
`RangeControl`'s raw native date-input row rendered below it — with a single
`WindowPicker` in the global UI kit. This closed the consistency problem the
owner reported: "the cards already have a filter" in the standard spot, so a
second control with a different shape and placement in the same cards felt
off. One filter, one placement, one component for every custom-window panel.

## Work Completed
- **`components/ui/window-picker.tsx`** (new, ~800 lines) — the shared
  control, exported from the `components/ui` barrel with `formatRange`:
  - A single `role="tablist"` pill holding the presets **and** the
    custom-range trigger, in the exact spot every other card's `Tabs`
    occupies — no second row, no layout surprise. Roving arrow-key
    navigation between presets (same pattern as `Tabs`).
  - The custom trigger (`aria-haspopup="dialog"`) opens a
    **portal-rendered range popover** — outside the glass cards, so it
    floats above neighboring cards and is unaffected by their
    `backdrop-blur` stacking contexts. Right-aligned with the trigger,
    flips above it when the viewport is tight, and tracks scroll/resize.
  - **Quick-range chips** (This month · Last month · Last 90d), a
    hand-rolled **Umbra-themed two-month calendar** (single month on
    `< 640px` widths) with hover range preview, and a resolved-range footer
    showing `range · N days · max 366` with **Apply / Clear** buttons — the
    native `<input type="date">` calendar never matched the dark theme.
  - **Full keyboard support**: Escape closes and restores focus to the
    trigger, Tab stays trapped inside the popover (same contract as
    `Modal`), arrow keys navigate the day grid.
  - The same **day-key contract** as `lib/time/windows.ts`
    `computeCustomWindow`: clan-timezone calendar days (`YYYY-MM-DD`),
    `from ≤ to`, `to` never in the future, span ≤
    `CUSTOM_RANGE_MAX_DAYS` (366), with the client-side guard included so
    invalid drafts never reach the API.
- **`donation-analytics.tsx` + `membership-timeline.tsx`** — adopted
  `WindowPicker`, dropped the separate filter row and their draft-input
  state.
- **`components/dashboard/range-control.tsx`** — deleted (181 lines,
  superseded).
- **`components/ui/icons.tsx`** — `+IconCalendar`.
- **Focus bug fixed along the way**: browsers refuse `focus()` on
  `visibility: hidden` elements, so the popover panel is focused only after
  its position style lands — the `setState` inside the layout effect
  flushes before paint, making the focus deterministic.
- Later the same day, two more panels adopted it: the war-performance
  panel (`70e7f0b`) and the war-analytics row (`da652aa`) — see
 [`2026-09-16-war-performance-star-efficiency.md`](./2026-09-16-war-performance-star-efficiency.md)
 and
 [`2026-09-16-attack-quality-windowed.md`](./2026-09-16-attack-quality-windowed.md).

## Decisions Made
- **Purely presentational contract** (inherited from `RangeControl`): the
  owning panel keeps the window state and the `/api/analytics` fetch; the
  picker only reports preset switches and custom-range intents. This keeps
  every adopter's data flow identical and the control trivially testable.
- **Portal, not in-card popover**: glass cards create stacking contexts
  (`backdrop-blur`), so an in-card popover would either clip against the
  card or lose the layering fight with sibling cards — the same root cause
  as the chart-tooltip z-index bug fixed later that day in
  `app/globals.css`.
- **Hand-rolled calendar over a library**: the design language (umbra
  tokens, focus-ring, mono micro-labels) is bespoke; wiring a third-party
  calendar to it would cost more CSS surgery than the ~200-line month grid
  cost to write, with zero new dependencies.
- **One component for presets + custom**: splitting them would have
  recreated the two-controls problem the pass was fixing.

## Next Action
Nothing blocking — all custom-window panels (donation, membership timeline,
war analytics row) now share the one control. Possible follow-up: quick
ranges scoped per panel (e.g. "This war season" for the war row) if a need
surfaces.
