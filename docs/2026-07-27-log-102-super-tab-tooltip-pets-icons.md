# Log 102 — Super Troop Tab, Tooltip, Pet Leak, Missing Icons

**Date:** 2026-07-27
**Time:** 05:25 AM (+08:00)

## Summary of Session
Four issues on the member-detail progression cards: (1) the super-troop tooltip
was too long; (2) super troops were mixed into the main Troops tab; (3) Spirit
Fox (a pet) appeared in the Troops tab; (4) some images didn't load (Ice Hound,
plus 8 unmapped units). Pulled first — a new `Icon_HV_Ruin_Witch.png` asset was
on the remote.

## Root Causes

1. **Tooltip too long** — `Super Valkyrie (super boost): base Valkyrie level
   8/12 (MAX)` was verbose.
2. **Super troops in main tab** — `ProgressionSection` resolved super troop
   levels but kept them in the same `troops` array as regular troops.
3. **Spirit Fox in troops** — the CoC API ships pets inside the `troops` array.
   `splitTroopsAndPets` in the ingest filters by a `PET_NAMES` set, but
   `Spirit Fox` and `Greedy Raven` (newer pets) were missing from it. They
   leaked into `troops` and rendered in the Troops tab.
4. **Ice Hound image 404** — `unit-icon-map.ts` mapped `Super Ice Hound` (a
   name that doesn't exist in the API) to `Icon_HV_Super_Ice_Hound.png`, but
   the actual API troop is `Ice Hound` (the Lava Hound's super variant) — which
   had no mapping and fell to the placeholder. The downloaded file is the icon
   for `Ice Hound`.
5. **8 unmapped units** — a DB cross-check found `Angry Spell`, `Battle
   Copter`, `Battle Machine`, `Dragon Duke`, `Ice Block Spell`, `Minion Prince`,
   `Ruin Witch`, `Totem Spell` in member payloads but not in the icon map.

## Work Completed

### 1. Shortened the tooltip
- `components/members/member-detail-sheet.tsx` `ProgressionCard` — tooltip is
  now `Super Valkyrie · 8/12 (boost)` (was a long sentence). Regular troops:
  `Barbarian · 9/12`.

### 2. Super troops in their own tab
- `ProgressionSection` now splits `p.troops` into three arrays: `regularTroops`,
  `superTroops`, `siegeMachines` (was two). Added a "Super Troops" category tab
  that only renders when the member has super troops (conditional spread). The
  tab label is "Super Troops" with group title "Super Troops (boosted)".
- Switched from `SUPER_TROOP_BASE` import to `isSuperTroop` (cleaner predicate).

### 3. Fixed the pet leak
- `app/api/ingest/route.ts` `PET_NAMES` — added `Spirit Fox` and `Greedy Raven`.
  Re-ingested so existing `unit_levels` rows reclassify them into the `pets`
  JSONB. Verified: neither is in `troops`; both are in `pets`.

### 4. Fixed missing icon mappings
- `lib/assets/unit-icon-map.ts`:
  - `Ice Hound` → `Icon_HV_Super_Ice_Hound.png` (the downloaded file IS the Ice
    Hound icon; "Super Ice Hound" isn't a real API troop name — kept the
    `Super Ice Hound` entry too for safety).
  - `Ruin Witch` → `Icon_HV_Ruin_Witch.png` (just uploaded).
  - New heroes (placeholders, no Fankit asset yet): `Minion Prince`,
    `Dragon Duke`, `Battle Machine` (BB), `Battle Copter` (BB).
  - New spells (placeholders): `Angry Spell`, `Ice Block Spell`, `Totem Spell`.
  - New pets (placeholders): `Sneezy`, `Greedy Raven`.
- Reorganized the Heroes section into "Heroes (Home Village)" and "Heroes
  (Builder Base)" subsections.

### 5. Comprehensive DB cross-check
- Wrote a one-off script that pulled every distinct unit name across all
  `unit_levels` rows (107 names) and diffed against `unitIconMap`. After the
  fixes, 0 names fall through to the unmapped placeholder path (all 8 missing
  units are now mapped, 1 to a real PNG and 7 to the placeholder pending
  Fankit download).

## Verification
- `bun run typecheck` → clean.
- `bun run lint` → 0 errors, 2 pre-existing warnings.
- `bun run test` → 149/149 pass.
- Re-ingest succeeded; DB confirmed Spirit Fox + Greedy Raven in `pets`,
  Ice Hound in `troops`.
- `/members` and `/` return 200.

## Decisions Made
- **Separate Super Troops tab** over a sub-grouping inside Troops — super
  troops are conceptually different (temporary boosts inheriting base levels)
  and clutter the main grid. A conditional tab (only shows when super troops
  exist) keeps the common case clean.
- **Short tooltip** with a middot separator + `(boost)` suffix — the violet
  dot indicator already signals "super"; the tooltip just needs the level.
- **Kept the `Super Ice Hound` map entry** even though it's not a real API
  troop name — harmless, and defensive against a future API rename.
- **Placeholders for undownloaded assets** rather than omitting — the entries
  document expected names so future Fankit downloads only need a path flip.

## Next Action
Download the remaining Fankit batches (heroes, spells, pets) and flip their
map entries from `placeholder.svg` to the real PNG paths. The cross-check
script can be re-run to confirm zero unmapped names.
