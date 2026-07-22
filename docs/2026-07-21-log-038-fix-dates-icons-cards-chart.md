# Log 038 — Fix Date Error, Placeholder Icons, Smaller Cards, Donation Chart

**Date:** 2026-07-21
**Time:** 07:48 PM (+08:00)

## Summary of Session

Fixed the `toLocaleDateString is not a function` crash on the dashboard popup (dates from API are ISO strings, not Date objects). Fixed placeholder icons not rendering for all units (mapped paths 404'd, now all return placeholder). Made progression cards 50% smaller with bigger level boxes. Added donation chart to the member detail popup. Moved achievements to after progression.

## Work Completed

### Fix: date crash on dashboard popup
- Root cause: `/api/members/[tag]` returns JSON where dates are ISO strings. The member detail sheet called `.toLocaleDateString()` directly on strings.
- Fix: Added `toDate()` and `formatDate()` helpers that convert `Date | string | null` to `Date` before calling `.toLocaleDateString()`. All date renderings now use `formatDate()`.

### Fix: placeholder icons not rendering
- Root cause: `getUnitIcon()` returned mapped paths (e.g. `/assets/unit-icons/barbarian.png`) for known units, but those PNG files don't exist — they 404. Only unmapped units got the placeholder.
- Fix: `getUnitIcon()` now returns the placeholder for ALL units until real Fankit PNGs are added. Added `dangerouslyAllowSVG: true` to `next.config.ts` so `next/image` can serve local SVGs.
- Updated tests to expect placeholder for all units.

### Smaller progression cards
- Grid: 8/10/12 columns (was 4/6/8) — ~50% smaller cards, more per row
- Level box: `text-[11px]` (was `text-[9px]`), `px-1.5 py-0.5` (was `px-1`), `rounded-tr-md` — bigger and more readable
- Level box positioned at `bottom-0 left-0` (was `bottom-0.5 left-0.5`) — flush to corner like in-game

### Donation chart in member detail popup
- Added `DonationChart` (reused from dashboard) to the DonationsSection
- Shows 30-day donation trend with the same purple/violet bars
- Chart height: 140px in a `h-[140px]` container

### Achievements moved after progression
- Split `CareerSection` into `CareerSection` (stats only) + `AchievementsSection` (expandable list)
- New section order: Profile → Activity → Donations → War → Career → Progression → Achievements → Rushed

### Progression cards auto-populated
- Confirmed: progression cards are auto-populated from the API response. If Supercell adds a new troop, it will appear automatically in the progression grid with the placeholder icon — no code changes needed.

## Next Action

Proceed to Step 1.4: Implement War Center.
