# Log 069 — Attack Log Sort, Attention Queue Fix, War Performance Chart Fix

**Date:** 2026-07-23
**Time:** 05:15 AM (+08:00)

## Summary of Session
Three fixes: (1) attack log now sorts descending (newest at top, oldest at bottom — log-style), (2) Attention Queue no longer floods with every war participant who has attacks remaining — it now only flags members who have used ZERO attacks (genuine no-shows), and (3) the war performance chart container height was fixed (was `h-64 flex-1` which didn't resolve for ResponsiveContainer; changed to `h-56` fixed height).

## Work Completed

### Attack log sort — descending (log-style) (`lib/war/war-snapshot.ts`)
Changed the attack-log sort from ascending (`a.order - b.order`) to descending (`b.order - a.order`). The log now reads like a feed: newest attacks at the top, oldest at the bottom. The order numbers are still displayed so users can see the chronological sequence. Updated the test assertions to match.

### Attention Queue — no more war-participant flood (`lib/db/queries.ts` + `dashboard-shell.tsx`)
**Root cause:** the `attacksRemaining` group flagged EVERY war participant who had `used < allowed` — during battle day this is basically every participant early in the day, flooding the queue with non-actionable entries.

**Fix:** changed the condition from `wp.used < wp.allowed` to `wp.used === 0 && wp.allowed > 0` — only members who have used ZERO attacks are flagged (genuine no-shows). Members who have used 1 of 2 attacks are NOT flagged (they're participating, just not done yet).

Also relabeled the panel:
- Subtitle: "Inactive & Issues" → "Inactive & No-shows"
- Group label: "Attacks remaining" → "No attacks in current war"
- Reason: "N attack(s) remaining" → "No attacks used in current war"

### War performance chart height fix (`dashboard-shell.tsx`)
Changed the chart container from `h-64 flex-1` (which didn't resolve to a pixel height for `ResponsiveContainer`'s `height="100%"`) to `h-56` (fixed 224px). The chart now renders correctly after client-side hydration.

## Verification
- `bun run typecheck` — 0 errors. `bun run lint` — 0 errors. `bun run test` — 147 passed.
- Agent Browser: attack log present on war page (empty during prep — correct). Attention Queue shows "INACTIVE & NO-SHOWS" label. Dashboard charts render after hydration (27 line paths in the war performance chart, 2 pie paths in the donut, 2 area paths in the roster chart — confirmed via `document.querySelectorAll`).

## Next Action
All three issues fixed. Continue to Step 1.6 — Phase 1 integration and release gate.
