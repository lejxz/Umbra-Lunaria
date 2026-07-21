# Log 026 — Clan Identity: Replace War Stats with Clan Attributes

**Date:** 2026-07-21
**Time:** 01:25 PM (+08:00)

## Summary of Session

Removed War wins, War losses, and Win streak from the Clan Identity stat cards and replaced them with Location (International), Type (Invite only), and Language (English). Removed the "Not family-friendly" chip entirely. Constrained the description box width to match CoC's in-game description box (~320px, ~40 chars per line).

## Work Completed

- Removed from stat mini-cards: War wins, War losses, Win streak
- Added to stat mini-cards: Location, Type, Language (replacing the three removed)
- Removed the "Not family-friendly" chip from the meta section entirely
- Removed the now-unused `Chip` component
- Constrained description box to `maxWidth: 320px` with `break-words` to match CoC's in-game description box width (~40 chars per line)
- Final stat grid (right half): Clan level, Members, War league, Capital league, Location, Type, Language, Req. trophies

## Decisions Made

- **Location/Type/Language as stat cards**: The user wanted International, Invite only, English to replace the removed war stats. These are clan attributes that fit naturally as stat cards alongside level, members, and leagues.
- **Removed family-friendly entirely**: The user said "Not family-friendly is removed" — the chip is no longer rendered. The `isFamilyFriendly` field is still in the data model for audit but not displayed.
- **Description width constraint (320px)**: CoC's in-game clan description box is roughly 40 characters wide. Setting `maxWidth: 320px` with `break-words` ensures the description wraps at the CoC boundary rather than stretching across the full card width.

## Next Action

Proceed to Step 1.3: Implement Members and member detail.
