# Log 104 — Remove Super Troops from Progression, Normalize Asset Filenames

**Date:** 2026-07-27
**Time:** 08:08 AM (+08:00)

## Summary of Session
Pulled first (new hero + hero-equipment + hero-gear PNGs uploaded). Two fixes:
(1) super troops were showing for every player regardless of unlock — removed
them from the progression grid entirely; (2) asset filenames used 4+ inconsistent
conventions — normalized all 112 files to `Icon_<Category>_<Name>.png`.

## Root Cause: Super Troops "Unlocked"

The CoC API returns every super troop in the `troops` array at `level: 1` for
**every player**, regardless of whether they've actually boosted it. There is
no `unlocked` field. Verified by fetching a live player: all 17 super troops
appear at `level: 1` with their `maxLevel`. Super troops are temporary 1-week
boosts, not researchable progression — the player's real investment lives on
the base troop (already shown in the Troops section).

## Work Completed

### 1. Removed super troops from the progression grid
- `components/members/member-detail-sheet.tsx` `ProgressionSection` — super
  troops are now filtered out (`continue` in the split loop) instead of
  rendered. The Troops & Siege tab has two groups: Troops, Siege Machines.
- Removed the `isSuper` prop + boost-dot indicator + `(boost)` tooltip suffix
  from `ProgressionCard` (no longer needed).
- Removed the now-unused `resolveSuperTroopLevel` import (kept `isSuperTroop`
  for the filter). The `lib/assets/super-troops.ts` module is unchanged — still
  used by the ingest rushed-percent calculation.

### 2. Normalized all asset filenames to `Icon_<Category>_<Name>.png`
Renamed 35 non-conforming files to a single convention:
- `Hero_Equipment_*.png` (26 files) → `Icon_HE_*.png`
- `HeroEquipment_MP_*.png` (2 files, camelCase) → `Icon_HE_MP_*.png`
- `HeroGear_*.png` (2 files) → `Icon_HG_*.png`
- `icon_gear_*.png` (1 file, lowercase) → `Icon_HG_*.png`
- `HG_DD_*.png` (5 files, incl. 2 with spaces) → `Icon_HG_DD_*.png` (spaces
  stripped: `Fire Heart` → `FireHeart`, `Flame Blower` → `FlameBlower`)
- Fixed `Icon_HE_rc_frost_flake.png` → `Icon_HE_RC_Frost_Flake.png` (case).

Category prefixes now in use:
- `HV` — Home Village troops/heroes
- `BB` — Builder Base troops/heroes
- `HE` — Hero Equipment
- `HG` — Hero Gear (Dragon Duke double-cannon attachments, etc.)

All 112 PNGs conform; 0 non-conforming files remain.

### 3. Wired the new icons into the map
- `lib/assets/unit-icon-map.ts`:
  - Heroes (HV): Barbarian King, Archer Queen, Grand Warden, Royal Champion,
    Minion Prince, Dragon Duke, Ruin Witch → real PNGs (were placeholders).
  - Heroes (BB): Battle Machine, Battle Copter → real PNGs.
  - **New Hero Equipment section** (27 entries): Archer Puppet, Frozen Arrow,
    Giant Arrow, Healer Puppet, Invisibility Vial, Magic Mirror, Monolith
    Arrow, Barbarian Puppet, Earthquake Boots, Rage Vial, Spiky Ball,
    Vampstache, Giant Gauntlet, Eternal Tome, Healing Tome, Life Gem,
    Rage Gem, Dark Orb, Henchmen Puppet, Metal Pants, Electro Boots,
    Frost Flake, Haste Vial, Hog Rider Puppet, Royal Gem, Seeking Shield.
  - **New Hero Gear section** (8 entries): Electro Fangs, Fire Heart,
    Flame Blower, Rocket Backpack, Stun Blaster, Lavaloon Puppet,
    Meteor Staff, Rocket Spear.
  - 3 equipment names seen in the DB without a Fankit file (Heroic Torch,
    Noble Iron, Snake Bracelet) → placeholder.
- 112 mapped PNGs verified to exist on disk (0 missing). 36 entries remain on
  the placeholder (spells, pets, 3 unmatched equipment).

### 4. Updated the naming-convention test
- `tests/lib/unit-icon-map.test.ts` — the regex now allows `HV|BB|HE|HG`
  prefixes (was `HV|BB`). Updated the "placeholder for units without a
  downloaded asset" test (heroes now have real PNGs; only spells/pets remain
  placeholder). 149/149 tests pass.

## Verification
- `bun run typecheck` → clean.
- `bun run lint` → 0 errors, 2 pre-existing warnings.
- `bun run test` → 149/149 pass.
- Filesystem check: 112 mapped PNGs exist, 0 missing.
- `/members` returns 200.

## Decisions Made
- **Remove super troops entirely** rather than trying to detect "unlocked"
  state. The player-detail API has no unlock field, and super troops aren't
  researchable progression — the base troop's level is the real signal. The
  `SUPER_TROOP_BASE` map is kept for the ingest rushed-percent calc.
- **Single naming convention** `Icon_<Category>_<Name>.png` — categories are
  `HV`/`BB`/`HE`/`HG`. Spaces stripped from filenames (use `_` or PascalCase).
- **Keep the map entries for undownloaded assets** (spells, pets, 3 equipment)
  on the placeholder so the names are documented for future Fankit batches.

## Next Action
Download the remaining Fankit batches (spells, pets) and flip their map entries
from `placeholder.svg` to the real PNG paths.
