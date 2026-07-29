# Log 107 — HoF Cleanup, Bug Fixes, Attack Progress Feature

**Date:** 2026-07-27
**Time:** 02:45 PM (+08:00)

## Summary of Session
Removed four unneeded Hall of Fame categories, fixed three bugs (missing group
labels, timezone-incorrect roster bucketing, unused imports), and added an
attack-progress bar to the current-war card.

## Work Completed

### 1. Removed unneeded HoF categories
Per user request, removed four Hall of Fame sections that aren't needed:
- **Most Raid Medals** — removed from `CAPITAL_ITEMS` + metadata + query function
- **Most Bonus Attacks** — removed from `CAPITAL_ITEMS` + metadata + query function
- **Most Seasons** — removed from `CAPITAL_ITEMS` + metadata + query function
- **Longest Tenured / Tenure** — removed the entire Section 4 + `TENURE_ITEMS`
  + metadata + query function

The Capital section now has 4 cards: The Capitalist (cached), Most Raid Gold,
Raid MVP, Best Gold/Attack. The shell's `hasAny` check no longer references
`tenureCards`. Removed unused `IconClock` and `IconUsers` imports.

In `lib/db/hall-of-fame-queries.ts`, removed `computeMostRaidMedals`,
`computeMostBonusAttacks`, `computeMostSeasons`, `computeLongestTenure` and
their `Promise.all` entries. Removed the now-unused `isNull` import.

### 2. Bug: attention groups had no visible labels
`components/dashboard/needs-attention.tsx` `AttentionGroup` destructured
`label` but never rendered it — each group (Inactive, Opted Out, etc.) was
visually indistinguishable from the next. Fixed by rendering the label as a
colored mono heading above each group's member list.

### 3. Bug: roster-size chart bucketed by UTC, not clan timezone
`lib/db/queries.ts` `getRosterSizeTrend` used `date_trunc('day', ...)` which
truncates at midnight UTC (08:00 Manila). Evening raids got allocated to the
wrong day. Fixed by passing the clan timezone as the third argument to
`date_trunc` (PG 13+): `date_trunc('day', col, 'Asia/Manila')`. Also
normalized the returned `day` value via `new Date(...)` to guard against
drizzle returning a string from raw SQL (the `firstSeen.getTime` bug pattern).

### 4. Cleanup: unused imports
- Removed `isSameDayInClanTz` from `lib/db/queries.ts` (unused after the
  timezone fix).
- Removed `isNull` from `lib/db/hall-of-fame-queries.ts` (unused after
  removing `computeLongestTenure`).
- Lint now reports **0 warnings** (was 2-3).

### 5. New feature: attack-progress bar on the current-war card
`components/dashboard/current-war-card.tsx` — added an `AttackProgress`
component that renders below the VS layout during battle day (`inWar` state).
Shows two progress bars (ours vs enemy) with:
- Attacks used / total allowed (e.g. "8/10 vs 6/10")
- Percentage bar with gradient fill (violet for us, red for enemy)
- Only renders when `teamSize`, `attacksPerMember`, and both attack counts
  are available

This is the key at-a-glance war metric: "have all members attacked?" A low
bar with time running out is the "needs attention" signal.

## Verification
- `bun run typecheck` → clean
- `bun run lint` → 0 errors, 0 warnings
- `bun run test` → 150/150 pass
- All 6 routes return 200

## Next Action
Continue auditing the war center and capital pages for similar at-a-glance
metric opportunities. The donation analytics could benefit from a per-member
ratio indicator (given/received) to surface one-way donors.
