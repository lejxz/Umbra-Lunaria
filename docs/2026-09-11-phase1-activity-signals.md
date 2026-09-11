# Phase 1 Execution Log — Activity Signals Overhaul

**Date:** 2026-09-11
**Plan:** [`2026-09-11-implementation-plan.md`](./2026-09-11-implementation-plan.md) §1.5 / Phase 1 (steps 1.1–1.8)
**Status:** executed — code merged, migration 0011 applied to production, historical backfill run and verified idempotent.

---

## What shipped

| Step | Change | Files |
|---|---|---|
| 1.1 | **Poll reorder + evidence query.** `runLightPoll` now runs war sync (regular + CWL, best-effort) BEFORE the snapshot insert, after the membership ops (`war_participants` FK to `members` requires the join/rejoin ops to be applied first). One extra query per poll reads every attack by a live member in `(member's prior snapshot, now]` — the global lower bound is the earliest live member's prior snapshot, so brand-new members and fresh databases are covered. | `app/api/ingest/route.ts` |
| 1.2 | **Pure function.** `computeActivityFlags(current, prior, warAttacksInInterval = 0)`: a war attack in the interval sets BOTH flags (performing a war attack is unambiguous login evidence) — even on a first-ever snapshot (event evidence needs no counter baseline). 10 new unit tests (war-only, first-poll + evidence, multi-attack, CWL-equivalence, default-0 legacy, reset+war, XP ×4). | `lib/ingest/membership.ts`, `tests/ingest/membership.test.ts` |
| 1.3 | **Index.** `war_attacks_attacked_at_idx` — the per-poll evidence query and the backfill read by time range. | `drizzle/0011_war_activity_signals.sql`, `lib/db/schema.ts` |
| 1.4 | **Backfill (one-shot, committed).** Flags `activity_flag` + `login_day_flag` on (a) the first snapshot at/after each attack on the same clan-TZ day and (b) that day's last-of-day snapshot (the pruning-proof marker — heals days already pruned to EOD), then re-runs `computeCheckpoints()` + `checkHallOfFameRecords()`. `--dry-run` supported; prints before/after counts. | `scripts/backfill-war-activity.ts` |
| 1.5 | **Score honesty (G3).** The Activity Score's war window now selects `involves_own_clan = true` (regular + CWL) instead of `warType = 'regular'` — the same "wars tracked" definition the roster summary and member detail already use. | `lib/db/queries.ts` |
| 1.6 | **XP signal (G4).** `member_snapshots.exp_level` (migration 0011) stored each poll; a strict increase is interval-grain activity evidence (like trophies, it does NOT set the login flag — only donation movement and war attacks do). | `drizzle/0011_*`, `lib/db/schema.ts`, `app/api/ingest/route.ts`, `lib/ingest/membership.ts` |
| 1.7 | **Evidence-aware needs-attention.** "Last seen" is now `max(latest activity-flagged snapshot, latest raw war-attack timestamp)`; detail strings name the evidence — "Last seen: war attack 2d ago · donation 9d ago". The raw-attack path means the queue is honest even where the backfill couldn't reach. | `lib/db/queries.ts` |
| 1.8 | **Docs.** Concept 04 gains the "War, XP and day-grain evidence" section (evidence classes, ordering note, score/needs-attention alignment). | `docs/concept/04-activity-tracking-and-polling.md` |
| — | **Retention amendment (found during execution).** The daily purge now also keeps every snapshot carrying `activity_flag`/`login_day_flag` (retention rule 5, pure model + SQL + tests). Without it, war days would fade from the 30-day heatmap as they age past the 7-day pruning horizon — acceptance (c) would decay over time. | `lib/ingest/purge-retention.ts`, `app/api/cron/purge/route.ts`, `tests/ingest/purge-retention.test.ts` |

## Production backfill results (run 2026-09-11, after migration 0011)

| Metric | Before | After |
|---|---:|---:|
| `member_snapshots` rows | 15,825 | 15,825 (unchanged — flags only) |
| activity-flagged snapshots | 73 | 98 |
| login-flagged snapshots | 72 | 97 |
| distinct login days (clan TZ) | 21 | **42** |
| war-blind attack days | 3 members / see below | **0** |

- **25 snapshots flagged** from 29 targets (4 were already flagged): #YPCC8QYU2 ×7, #QU80CGJV8 ×6, #LURG82P98 ×6, #G9UQYQ2RG ×2, #L8YYY8CGY ×2, #QVJGULLUV ×1, #GL098C0GP ×1.
- **The owner-reported case is healed:** `KnieieGurow` (#L8YYY8CGY) attacked 2026-09-09 and had NO activity-flagged snapshot ever; after the backfill the war day is flagged and needs-attention's raw-attack path guarantees he can never be listed "inactive" while attacking.
- `Kenttoy` and `Zyco` (late-July / early-August attacks) were also healed — via the EOD target: in the once-daily-poll era the day's only snapshot can precede the attack, so same-day-post-attack matching alone would miss it. Day-grain attribution stays correct; the interval-rate impact is bounded to those healed days.
- Checkpoints (`cumulative_login_days`) and Hall of Fame ("dedicated" streaks) re-computed after the flag update.
- **Idempotency verified twice:** re-applying the UPDATE changes 0 rows.

## Acceptance criteria — verification

- **(a) War-only member shows Active within one poll** — holds by construction post-deploy: the evidence query runs after war sync in the same poll, and an attack recorded this poll is inside this poll's evidence window. (Live behavior verifiable on the next war day after deploy.)
- **(b) KnieieGurow case disappears from needs-attention** — healed (flagged war days + the effective-last-seen `max(flag, raw attack)` rule that works even without flags).
- **(c) Heatmap shows war days** — login days 21 → 42; flagged snapshots survive future pruning via retention rule 5.
- **(d) Score shifts bounded** — the activity component can only rise for war-active members (bounded by its 25-pt weight, re-normalized); the war component now includes CWL wars (this is the intended G3 fix, not a regression). Component breakdowns remain fully visible in the member sheet.
- **(e) `vitest run` green** — 189/189 (13 new: 10 membership, 3 purge-retention).
- **(f) Backfill idempotent** — verified in-run and by the full re-run (0 changed rows, 0 unhealed attack days).

## Deployment notes

- Migration 0011 was applied to production **before** the code push (Vercel's `drizzle-kit migrate` build step will see it already applied and skip it — belt and braces ordering).
- The backfill ran against production before deploy; the pre-deploy light polls continued writing old-logic flags (no conflict — the backfill only touched historical rows, and its targets were already-observed attack days).
- `scripts/backfill-war-activity.ts` reads `DATABASE_URL` from the environment only — no credentials in the repo. It is a one-shot: keep it for new deployments (fresh databases have no history to heal, so it's a no-op there) and for audits.

## Follow-ups (not this phase)

- Day-grain evidence from capital contributions and career-total deltas is deferred to Phase 3.1 (Feature 8) — same machinery, one query, per the plan.
- The `needsAttention.inactiveDays` threshold remains a hardcoded 7 (pre-existing TODO; Phase 2.2 introduces the runtime_settings reader pattern it can ride on).
