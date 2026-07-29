# Log 108 — Donation Ratio Summary, UX Polish

**Date:** 2026-07-27
**Time:** 02:58 PM (+08:00)

## Summary of Session
Reviewed the recent improvement logs (100-107) and continued with the
next-action from log 107: a per-member donation ratio indicator to surface
one-way donors and receivers. Audited the war center and capital pages for
similar at-a-glance metric gaps.

## Work Completed

### 1. Donation ratio summary (member detail)
`components/members/member-detail-sheet.tsx` — added a `DonationRatioSummary`
component below the 30-day donation inline stats. It shows:
- A **30d balance** label with a tone tag: "Net donor" (emerald), "Balanced"
  (amber), or "Net receiver" (rose).
- The given:received ratio (e.g. "2.50:1") when received > 0.
- A split bar: given (left, gradient) vs received (right, muted) with
  percentage labels.
- Hidden when both given and received are 0 (cold start — no donations).

The 1.2× threshold for net donor/receiver avoids flagging near-balanced
members. This surfaces the two important clansmen leadership wants to see:
generous members who don't get support back (net donors), and members who take
donations but rarely return them (net receivers).

### 2. Audit findings (no action needed)
- **War hero** already has a star-progress bar (own vs opponent) and a lead-
  analysis badge. The dashboard's new attack-progress bar (log 107) complements
  this — the war page focuses on stars, the dashboard on attack completion.
- **Capital raid history** has a proper data-table layout and empty state.
- **Members roster** has working search + filter + sort.
- **War attack log** renders attacker → defender with stars/destruction/duration.

No bugs found in these areas during the audit.

## Verification
- `bun run typecheck` → clean
- `bun run lint` → 0 errors, 0 warnings
- `bun run test` → 150/150 pass
- All 6 routes return 200

## Next Action
The member detail sheet is now feature-rich. Future polish candidates:
- A "last seen" indicator on the members roster (how many days since each
  member's last tracked activity).
- A war participation rate column on the members roster.
- Capital district upgrade progress bars (current level → next level cost).
