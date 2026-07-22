# Log 022 — Phase 1.2 Fix: API Image URLs + Player Tags

**Date:** 2026-07-21
**Time:** 01:50 PM (+08:00)

## Summary of Session

Fixed the dashboard to make full use of the image URLs returned by the Clash of Clans API. The clan labels now render with their API-provided icons, the activity score leaderboard shows league icons alongside each member, the member detail sheet shows the league icon + league tier, and player tags are displayed in the leaderboard, needs-attention panel, and donation leaderboard.

## Work Completed

- Configured `next.config.ts` with `images.remotePatterns` for `api-assets.clashofclans.com` (clan badges, league icons, label icons, league-tier icons).
- Updated `ClanBadgeUrls` view model to include `tiny` variant (used by league icons).
- Added `league` and `leagueTier` fields to `MemberActivityScore` view model (with `iconUrls` for rendering).
- Updated `ScoreInput` in `lib/scoring/activity-score.ts` to carry `league` and `leagueTier` through the scoring function.
- Updated `getRetainedMembers()` in `lib/db/queries.ts` to fetch `league` and `leagueTier` columns.
- Updated `getMemberActivityScore()` to pass league info into `ScoreInput`.
- Updated `clan-identity-card.tsx`: labels now render as pill spans with the API-provided icon (`Image` component) + label name.
- Updated `activity-score-leaderboard.tsx`: each entry now shows the league icon (20×20), player tag (mono font), and league name in the subtitle.
- Updated `member-detail-sheet.tsx`: added a league info section showing the league icon (36×36), league name, and league tier name.
- Updated `needs-attention.tsx`: each member now shows their player tag in mono font.
- Updated `donation-analytics.tsx`: top donor entries now show player tag in mono font.
- Updated `dashboard-shell.tsx`: memberMap now carries `league` and `leagueTier` through to the member detail sheet.
- Updated `tests/lib/activity-score.test.ts`: `baseInput()` helper now includes `league: null` and `leagueTier: null`.

## Decisions Made

- **`next/image` with `unoptimized` flag**: Used `unoptimized` on all API-sourced images to avoid Next.js image optimization overhead for external URLs. The images are already small PNGs from Supercell's CDN — optimization would add latency without meaningful size reduction.
- **League icon in leaderboard (20×20)**: Small enough to fit inline with the rank number and name, large enough to be recognizable. The league tier icon is not shown in the leaderboard (too dense) but is shown in the member detail sheet.
- **Player tags in mono font**: Used JetBrains Mono at 10px for player tags throughout. This visually distinguishes the permanent identity (tag) from the mutable display name, matching the concept/02 rule "player tags are the permanent identity key."

## Next Action

Proceed to Step 1.3: Implement Members and member detail — the full roster table and complete member detail sheet with activity, donations, war participation, career stats, and progression cards.
