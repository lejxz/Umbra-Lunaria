# Log 088 — War Strategy page

**Date:** 2026-07-25
**Time:** 10:30 PM (+08:00)

## Summary

New `/strategy` page between War Center and Capital in the navigation.
Pure read-only ranking — no admin, no writes. Two lists: suggested war
participants + members needing review.

## What was built

### Page: `/strategy`
- Server component with ISR (5 min)
- Error state fallback (same pattern as other pages)

### Data: `lib/db/strategy-queries.ts`
`getStrategyPage()` fetches:
1. All retained members with rushedPercent, warPreference, joinedAt
2. All-time war participation per member (warParticipants)
3. All-time three-star counts per attacker (warAttacks)
4. Latest activity per member (memberSnapshots)
5. 30-day activity scores (getMemberActivityScore)

### Composite score (0-100) for suggested participants
5 factors:
- **Participation (30%)** — attacks used / allowed, all-time. New members
  with no war data get a neutral 0.5 (not penalized).
- **Performance (25%)** — blend of avg stars (60%) + 3★ rate (40%). New
  members get 0.5.
- **Activity (20%)** — 30-day activity score / 100
- **Readiness (15%)** — 1 − rushed/100
- **Recency (10%)** — 1 if active today, linear decay to 0 at 7 days

New members (warsTracked < minWarsForConfidentRanking) get an `isNewMember`
flag + a "New" badge in the UI, but are NOT penalized in the score.

### Review list
Members flagged when any of:
- Inactive 4+ days
- Activity score < 30
- War participation < 50% (if 3+ wars tracked)
- Rushed > 60%
- Opted out of wars

Each member gets reason tags (color-coded: rose for inactive/rushed, amber
for low scores, muted for opted out).

### UI: `components/strategy/strategy-shell.tsx`
- **Suggested Participants**: table with rank, name, TH, composite score
  (color-coded: emerald ≥70, amber ≥50, rose <50), participation rate,
  avg stars, 3★ rate, activity score, rushed %, active/inactive status.
  New members get a "New" badge. Opted-out members get an "Out" badge.
- **Review Needed**: card list with member name, TH, reason tags, days
  inactive. Clickable rows open the shared MemberDetailSheet.
- Both lists are scrollable (max-h-500px / max-h-400px).

### Navigation
New "Strategy" link between "War center" and "Capital" in the sidebar +
mobile bottom bar. Uses the NavIconPlanning icon (ClipboardList).

## Verification
- Typecheck: clean
- Lint: 0 errors in new files
- Tests: 147/147 pass
- Browser: /strategy returns 200, nav link visible, heading renders,
  no console errors
