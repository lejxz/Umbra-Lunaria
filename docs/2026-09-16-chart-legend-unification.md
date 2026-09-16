# Chart Legend Unification + Graph Card Size Standard

**Date:** 2026-09-16
**Time:** 05:35 PM (+08:00)

## Summary of Session
Unified every dashboard chart card's legend into ONE shared component and one
height system, per the owner's request: the membership-timeline explanation
footnote ("Stacked: … Overlay: … Range: …") was removed, the Clan Pulse stat
strip + legend duplication was redesigned into a single stat-legend row, the
Recharts built-in legend and three hand-rolled legend variants were replaced,
and all graph card rows now share one height (420px on lg) with one standard
plot height (h-56 mobile / h-64 up on full-width cards).

## Work Completed
- **`components/ui/chart-legend.tsx`** (new, UI kit) — `ChartLegend`, the one
  legend pattern for every chart card: swatch shapes that mirror their series
  (`bar` / `dot` / `line` / `dashed` / `dotted` / `area`), one typography
  (`font-mono text-label uppercase tracking-wider text-umbra-muted`), one
  placement (below the chart, `mt-2.5`, wrapping). Items may carry a live
  `value` + toned `detail` so a panel can fold its stat strip into the legend
  instead of printing the same series twice. Exported from the UI barrel.
- **Membership timeline** — the footnote paragraph ("Stacked: membership
  events per clan day. Overlay: … Range: 2026-08-18 → 2026-09-16.") removed
  entirely (production-copy principle: the legend already names every series,
  and the active range is visible in the WindowPicker); Recharts' built-in
  `<Legend>` (default icons, its own font size, rendered inside the chart's
  layout) replaced by the shared ChartLegend below the plot: Joined ·
  Rejoined · Left · TH up · Renamed (bar swatches) + Capital contributors
  (translucent area swatch with a bright top edge).
- **Clan Pulse** — the stat strip above the chart (`Active · 24h 1/7 14% |
  Roster 7 ±0 | Engagement 1% avg ±0pp`) and the legend below it described
  the same three series twice (six labels for three series). Both are now ONE
  stat-legend row below the chart: `■ Active 1/7 14% · ─ Roster 7 ±0 · ┄
  Engagement 1% avg ±0pp` — each item's swatch keys the series, its value and
  toned delta carry the readout. `⚠ Partial` moved next to the window Tabs in
  the header (matching the donation panel's header placement of its partial
  flag). Local `StatChip` / `Divider` / `LegendSwatch` components deleted.
- **War performance** — local `LegendDot` / `LegendLine` bits (text-[0.6rem])
  replaced by the shared ChartLegend: win / loss / tie (dots — the result
  encoding on the Us line) + us / them / 3-war avg (solid / dashed / dotted
  line swatches in the exact chart stroke colors).
- **Donation analytics** — gained the legend it never had (Given / Received
  bar swatches) below the chart, completing the pattern across all chart
  cards. Lives in the panel, not in `DonationChart`, so the member-detail
  sheet's compact 140px mini-chart stays legend-free.
- **Attack quality** — tier rows and the 3★ delta footer migrated from
  `text-[0.65rem]` to the `text-label` token so every card's micro-type is
  the same size.
- **Graph card size standard** — measured at 1440px before: war row 363,
  donations 380, Clan Pulse 408, membership timeline 392 (and three different
  plot heights). After: all five graph cards exactly 420px, full-width plots
  exactly 256px (`h-56 sm:h-64`), the war row lifted via `lg:min-h-[420px]`
  on its grid wrapper so both cards and their `flex-1` charts stretch
  together. Recharts' in-chart `<Legend>` no longer steals plot height on
  the timeline (the plot is a fixed box now).
- Live-verified (agent-browser, real Supabase data) at 1440px and 375px;
  VLM-checked screenshots (legend consistency, no stat strip, no footnote,
  equal war cards, clean mobile wrapping). Mobile page-level horizontal
  overflow traced to the pre-existing Row 2 summary cards (`grid-cols-4`
  current-war stats) — documented known issue, not introduced here.

## Decisions Made
- **One component, optional values**: the legend is a key first, but items
  may carry a live value/detail. Pulse uses values (its story IS those three
  numbers); war performance and the timeline don't (their header badges
  already summarize: W-T-L record, net roster change) — same visual language
  either way, no duplicated strips.
- **Below the chart, always**: three placements existed (above, below,
  inside-the-chart). Below won — standard chart convention, and it stops
  Recharts' `<Legend>` from consuming plot height.
- **Area swatch for the overlay**: the capital-contributors density is an
  area fill, not a bar or line — a translucent wide swatch with a bright top
  edge reads as "filled region" without adding a new shape family.
- **420px on lg for all graph cards**: the tallest natural content (chart +
  legend + 5-row leaderboard column) needs ~404px; 420 gives every row the
  same rhythm with a few px of slack absorbed by the grids. Mobile keeps
  natural heights (cards stack; plots h-56).
- **Fixed plot height over fill**: the donation and pulse charts used to
  stretch with their leaderboard columns (274/250px — part of the
  inconsistency). Fixed h-64 plots make the three full-width cards
  pixel-identical; the few px of column slack are invisible.

## Next Action
Nothing blocking. Pre-existing mobile overflow of the Row 2 summary cards
(current-war `grid-cols-4` stats) and Row 5's `h-[450px]` cards remain the
known out-of-scope issues for a future pass.
