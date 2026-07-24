# Log 068 — Donation Ratio Removed, War Chart Height Fix, Base Defense Bug Fix

**Date:** 2026-07-23
**Time:** 04:55 AM (+08:00)

## Summary of Session
Removed the donation ratio line (always 1:1 in CoC), fixed the war-performance chart height (dead space below), and fixed a critical bug where base defense stars never updated — the CoC API returns `opponentAttacks` as a count (number), not an array, so the parser was reading a non-existent array and always got empty defense data.

## Work Completed

### Donation ratio line removed (`donation-chart.tsx`)
Reverted from ComposedChart (Bar + Line) back to a simple BarChart. In CoC, every donation is simultaneously a give (donor) and a receive (recipient), so the clan-wide given total always equals received. The ratio would always be ~1.0 — no signal.

### War-performance chart height fix (`dashboard-shell.tsx`)
Changed the chart container from `h-48` (192px) to `h-64 flex-1` (256px + flex-grow) so it fills the card height instead of leaving dead space below.

### Base defense star bug fix (`lib/war/war-snapshot.ts`) — CRITICAL
**Root cause:** The CoC API's `currentwar` endpoint returns `opponentAttacks` as a **count (integer)** on each member object, NOT an array of attack objects. The `RawMember` type declared `opponentAttacks?: RawAttack[]` (array), so `m.opponentAttacks ?? []` got the number, `.length` was undefined, and defense data was never computed. The base-state column always showed `—` even after attacks were made.

**Fix:** Defense data is now derived by scanning ALL attacks across both clans and grouping by `defenderTag`:
1. Collect all attacks from both clans' members' `attacks` arrays.
2. Build a `Map<defenderTag, RawAttack[]>` — each defender's tag maps to the attacks made against their base.
3. `buildRosterMember` looks up the member's tag in this map to get their defense attacks, then computes `worstDefenseStars` / `worstDefenseDestruction` / `defendedAgainst`.

This is the correct approach because the CoC API only provides attack data from the attacker's perspective (`attacks` on the attacker's member object). There is no per-member defense array — it must be derived.

Also removed `opponentAttacks` from the `RawMember` interface (it was misleading — the field exists in the API but as a count, not an array we can use).

Updated the test fixtures in `tests/war/war-snapshot.test.ts` to match the corrected approach (defense derived from `defenderTag` matching, not from a non-existent `opponentAttacks` array).

## Verification
- `bun run typecheck` — 0 errors. `bun run lint` — 0 errors. `bun run test` — 147 passed.
- The base defense fix is verified by the existing war-snapshot tests, which assert `worstDefenseStars` is correctly computed from attacks where the member's tag is the `defenderTag`.

## Next Action
All three issues fixed. The war page roster's "Base" mode will now correctly show defense stars when attacks are made against a base.
