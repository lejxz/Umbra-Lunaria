# Log 101 — Fix Super Troop Level Bug (Display + Rushed Calc)

**Date:** 2026-07-27
**Time:** 05:12 AM (+08:00)

## Summary of Session
Super troops (Super Valkyrie, Inferno Dragon, Sneaky Goblin, etc.) displayed
"level 1" in the member progression cards and inflated the rushed-percent
calculation. Root cause: the CoC API reports every super troop at `level: 1`
because a super troop is a temporary 1-week boost, not a separately researched
unit — the player's real investment lives on the base troop.

## Root Cause Analysis

### The CoC API behavior
A super troop is a 1-week boosted variant of a regular troop. The API returns:
```
{ "name": "Super Valkyrie", "level": 1, "maxLevel": 12, "village": "home" }
```
The `level: 1` is the *boost* level (always 1), not the lab level. The player's
actual Valkyrie research is on the base troop entry:
```
{ "name": "Valkyrie", "level": 8, "maxLevel": 12, "village": "home" }
```

### Two impacts
1. **Display** — the member-detail progression card showed "Super Valkyrie 1/12",
   which reads as "barely started" when the player actually has a level-8
   Valkyrie. Misleading.
2. **Rushed calc** — `computeRushed()` in the ingest used the raw `level: 1`
   for super troops, inflating the deficit (every super troop counted as
   max-deficit-11 instead of reflecting the base troop's actual level).

DB inspection confirmed: all 19 super troops + variants (Super Barbarian,
Sneaky Goblin, Inferno Dragon, Rocket Balloon, Ice Hound, Super Yeti, etc.)
sat at `level: 1` while their base troops had real lab levels (5-13).

## Work Completed

### New shared module: `lib/assets/super-troops.ts`
- `SUPER_TROOP_BASE` map — super troop → base troop name. Covers all 18
  super/boosted variants including the non-obvious ones:
  - `Sneaky Goblin` → `Goblin` (not "Super Goblin")
  - `Inferno Dragon` → `Dragon` (not "Super Dragon")
  - `Rocket Balloon` → `Balloon`
  - `Ice Hound` → `Lava Hound`
  - `Super Ice Hound` → `Lava Hound`
  - (`Lavaloon` is a distinct troop, NOT a super variant — omitted)
- `isSuperTroop(name)` / `baseTroopName(name)` helpers.
- `resolveSuperTroopLevel(troop, byName)` — returns the base troop's
  `{ level, maxLevel }` when the troop is a super variant and the base is in
  the payload; otherwise returns the raw level (graceful fallback).

### Display fix: `components/members/member-detail-sheet.tsx`
- `ProgressionSection` now indexes troops by name and maps each troop through
  `resolveSuperTroopLevel` before rendering. Super troops show the base
  troop's lab level + max.
- `ProgressionCard` gains an `isSuper` prop — when true, renders a small
  violet glow dot (top-right) as a "boost" indicator, and the tooltip reads
  "Super Valkyrie (super boost): base Valkyrie level 8/12" so the inheritance
  is explicit.

### Rushed-calc fix: `app/api/ingest/route.ts`
- Before calling `computeRushed`, the ingest now resolves super troop levels
  from their base via `resolveSuperTroopLevel`. Super troops no longer
  contribute a false `maxLevel - 1` deficit.
- Triggered a re-ingest so existing members' `rushed_percent` recomputed.

## Verification
- `bun run typecheck` → clean.
- `bun run lint` → 0 errors, 2 pre-existing warnings.
- `bun run test` → 149/149 pass.
- Re-ingest succeeded (7 members polled). Rushed percentages recomputed —
  e.g. the most-rushed member dropped from an inflated value to 63% (super
  troops no longer count as full deficit).
- `/members` returns 200.

## Decisions Made
- **Presentation-layer fix for display** (don't mutate stored raw data) — the
  `unit_levels.troops` JSONB keeps the raw API payload so future analyses can
  see the original boost state; the resolution happens at read time.
- **Ingest-layer fix for rushed** — the rushed percent is *persisted* on the
  members row (`rushed_percent` column), so it must be computed correctly at
  ingest time, not at read time. A re-ingest backfills existing rows.
- **Shared module** — both the UI and the ingest import from
  `lib/assets/super-troops.ts` so the mapping stays in sync.
- **Graceful fallback** — when a super troop's base isn't in the payload
  (e.g. a brand-new super variant the tracker hasn't seen the base for), the
  raw `level: 1` is used rather than crashing.

## Next Action
The boost indicator dot is subtle; if it's not discoverable enough, consider
grouping super troops into their own progression sub-tab labeled "Super
Troops (boosted)".
