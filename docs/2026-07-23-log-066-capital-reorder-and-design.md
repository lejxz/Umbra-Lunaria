# Log 066 — Capital Page Section Reorder + Design Improvements

**Date:** 2026-07-23
**Time:** 02:20 AM (+08:00)

## Summary of Session
Reordered the Capital page sections per user request (raid-weekend history moved up to second, district list moved to last) and improved the overall design of all four capital components.

## Work Completed

### Section reorder (`components/capital/capital-shell.tsx`)
New order:
1. **Overview** — current Capital facts.
2. **Raid-weekend history** — moved up from last; this is the high-value seasonal content users expect to see early.
3. **Upgrade timeline** — tracked district-level changes.
4. **District list** — moved to last; district levels change infrequently (a level-up is a multi-day Capital Gold effort), so this is the least-urgent reference section.

### Overview card redesign (`capital-overview-card.tsx`)
- Hero-style layout: the **Capital Hall level is the centerpiece** (large display number in a bordered accent box with the capital icon), flanked by points + districts as side stats, and the league as a right-column badge.
- On narrow screens the league badge wraps below; on sm+ it sits in a third column.
- Removed the old 3-equal-columns MiniStat grid (Hall/points/districts all the same size) — the Hall level is the most-asked Capital question and now visually dominates.

### Raid-pending card redesign (`raid-pending-card.tsx`)
- Added a "Pending" badge in the header (amber pill) so the status is immediately visible.
- Replaced the generic EmptyState with a centered dashed-border "Coming soon" panel (icon + title + description) — more deliberate than the old empty-state component.
- Kept the `clanCapitalContributions` lifetime-total caveat, now more muted.

### District list redesign (`district-list.tsx`)
- Relabeled "reference" (was "current levels") to signal it's the slow-changing reference section.
- Districts now **sorted by level descending** (highest first) so the districts closest to a milestone surface at the top.
- Tighter rows (py-1.5 vs py-2) and lighter borders (umbra-line/60) for a denser, more reference-table feel.
- Added a footer note explaining why this section is last: "District levels update infrequently — a level-up is a multi-day Capital Gold effort."

### Upgrade timeline polish (`upgrade-timeline.tsx`)
- Upgrade count moved to a purple badge in the header (was plain text).
- Timeline dots changed to emerald (was purple) to match the "upgrade = progress" semantic.
- Tighter rows + lighter borders to match the district list's density.

## Decisions Made
- **Hall level as the centerpiece.** The single most-asked question about a clan's Capital is "what Hall level?" — making it the visual anchor (large number + icon + accent border) answers it instantly. The old equal-weight grid treated Hall/points/districts the same, burying the lead.
- **District list last, sorted by level.** District levels change on a multi-day cadence (Capital Gold accumulation), so the list is the least-urgent section. Sorting by level descending surfaces the highest-level districts first — the ones closest to a milestone or worth celebrating.
- **Raid pending, not hidden.** Moving raid history up to second (rather than leaving it last or omitting it) sets the expectation that this is where raid content will live once Phase 3.1 lands. The "Pending" badge + "Coming soon" panel make the status unambiguous without fabricating data.

## Verification
- `bun run typecheck` — 0 errors. `bun run lint` — 0 errors.
- Agent Browser (desktop + 375×812 mobile): section order confirmed as Overview → Raid-weekend → Upgrade timeline → District list. Overview hero renders "HALL" centerpiece + points/districts/league. Raid-pending shows "Coming soon" + Pending badge. No page/console errors.

## Next Action
Capital page redesign complete. Next is Step 1.6 — Phase 1 integration and release gate.
