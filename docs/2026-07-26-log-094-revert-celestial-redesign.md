# Log 094 — Revert Celestial Observatory Redesign

**Date:** 2026-07-26
**Time:** 06:17 PM (+08:00)

## Summary of Session
Reverted the entire Celestial Observatory redesign (commit `6a84382`) per user request. The repository is restored to its pre-redesign state (`abed9c6`). No code from the redesign remains in the tree.

## Work Completed
- Ran `git revert --no-edit 6a84382`, producing commit `d448829` ("Revert 'feat(ui): Celestial Observatory redesign — glass/glow, lunar nav, celestial icons'").
- The revert restores all 50 files touched by the redesign to their `abed9c6` contents: `tailwind.config.ts`, `app/globals.css`, `components/navigation.tsx`, `components/page-scaffold.tsx`, `components/ui/icons.tsx` and every other UI primitive, plus all dashboard / members / war / capital / hall-of-fame / strategy feature components, `lib/chart-theme.ts`, and `lib/db/hall-of-fame-queries.ts`.
- The redesign's docs log (`docs/2026-07-26-log-093-celestial-observatory-redesign.md`) was removed by the revert; this log entry documents the reversal.
- Pushed both the revert commit and this doc to `origin/main` under the credentials `lejxz <lejxz.dev@gmail.com>`.

## Decisions Made
- Used `git revert` (a new commit that undoes `6a84382`) rather than `git reset --hard` + force-push. This preserves commit history and avoids rewriting public history on the remote — safer for collaborators and for the active 15-minute webDevReview cron that pulls from the repo state.
- Left the recurring webDevReview cron (job 291712) active; it will resume normal QA + incremental development against the restored baseline. It is not coupled to the redesign.

## Verification
- `git log --oneline -3` shows the revert on top:
  ```
  d448829 Revert "feat(ui): Celestial Observatory redesign …"
  6a84382 feat(ui): Celestial Observatory redesign …
  abed9c6 Delete docs/ui-improvement-plan.md
  ```
- `git show --stat d448829` confirms 50 files changed (1380 insertions, 2719 deletions) — the exact inverse of the redesign.
- Working tree is clean; no redesign artifacts remain in tracked files.

## Next Action
The site is back on the original umbra dark theme. The webDevReview cron will continue routine QA and may propose independent improvements going forward.
