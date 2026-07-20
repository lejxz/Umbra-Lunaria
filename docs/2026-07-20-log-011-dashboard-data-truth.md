# Log 011 — Dashboard Data Truth Fix

**Date:** 2026-07-20
**Time:** 09:00 PM (+08:00)

## Summary of Session

Corrected two dashboard presentation issues: removed the duplicate Clan Profile card and prevented incomplete war totals from being presented as a misleading win rate.

## Work Completed
- Removed the duplicate Clan Profile render from `app/page.tsx`.
- Kept the API-backed `warWins` value as the card value.
- Changed win-rate derivation to require numeric `warWins`, `warTies`, and `warLosses`; incomplete cached records no longer become an implied 100% rate.

## Decisions Made
- Kept the API’s all-time `warWins` field because the concept explicitly defines it as a Supercell-tracked clan statistic.
- Treat missing ties/losses as unknown rather than zero. This preserves data truth until the daily clan cache has a complete record.

## Deviations and Verification
- No API or ingestion mapping was changed; the existing mapping already reads `warWins`, `warTies`, `warLosses`, and `warWinStreak` from the clan response.
- `npm run typecheck` passed.
- Database migrations and `npm run build` passed with `.env.local` loaded into the process.
- `git diff --check` passed. No secrets or `.env.local` were staged.

## Next Action

Continue with the next dashboard or Step 1.2 refinement after confirming the corrected production values.
