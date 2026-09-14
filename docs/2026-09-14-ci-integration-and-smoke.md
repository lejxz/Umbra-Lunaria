# CI/CD Completion — Integration Suite, Nightly Smoke, Branch Protection

**Date:** 2026-09-14
**Plan:** [`2026-09-11-implementation-plan.md`](./2026-09-11-implementation-plan.md) §"Phase 6 — CI/CD overhaul" (documented follow-ups)
**Context:** Phase 6's core (per-step summaries, route-mode summary, the always-run `report` job, failure-log artifacts) shipped with the planning session. This session executes the three documented follow-ups — the roadmap's last open items.

## Work completed

### 1. Disposable-Postgres integration job

The assessment's §8 recommendation #3 ("one disposable-Postgres integration suite … covers A-2, B-2, B-10, and the journal integrity permanently"), deferred pending an environment decision — now resolved: a **GitHub Actions service container** (`postgres:18-alpine`), zero cost, zero blast radius.

| Piece | File(s) | Notes |
|---|---|---|
| Purge extraction | `lib/ingest/run-purge.ts` (new) | The route's SQL passes 1–7 moved verbatim into an importable function. The route keeps auth + the pre-prune checkpoint gate + `revalidatePath` — no behavior change, but the SQL is now testable. |
| Integration suite | `tests/integration/db.test.ts` (new, 7 tests) | Runs **only** when `INTEGRATION_DATABASE_URL` is set, and **refuses any non-localhost URL** — the suite can never point at a real deployment. `beforeAll` applies the drizzle migrations itself (journal integrity is asserted against the shipped `.sql` files). |
| CI job | `.github/workflows/ci.yml` → `integration` | Service-container PG + `bunx vitest run tests/integration`, JSON reporter parsed into the job summary, failure artifacts — same reporting contract as the quality job. The `report` job's matrix now includes it (4 rows). |
| Local-DB support | `lib/db/index.ts` | The pool's `ssl` is now conditional on a non-localhost host — disposable local/CI databases don't speak TLS; production (Supabase) is remote, so its behavior is unchanged. |
| Testability fix | `getRosterSizeTrend(days, now)` | Optional `now` parameter, matching `getActivityTimeline`'s existing pattern — deterministic windowed tests. |

**What the suite covers** (the "where the bugs actually live" list from the assessment):

1. **Migration journal integrity** — applied count == shipped `.sql` count; core tables exist.
2. **Purge SQL == pure model, exactly** — seeds a rich 3-day chain (mid-day counter reset, activity-flagged rows, EOD markers) and asserts the SQL's survivors **equal** `selectRetainedSnapshotIds()` from the fuzz-tested `lib/ingest/purge-retention.ts`. The B-2 class of bug (retention rule drift between spec and SQL) is now impossible to reintroduce silently.
3. **Recent snapshots never pruned**; **departed-member purge** (member + snapshots + unit levels gone, immutable `membership_events` kept).
4. **War pruning** — >365d backfill wars deleted, >90d `warSnapshot` JSONB nulled (row kept), recent wars untouched.
5. **`getRosterSizeTrend`** — clan-TZ day bucketing verified at the Manila-midnight boundary (23:00Z vs 01:00-next-day), `dayKey` from SQL `to_char`.
6. **`getActivityTimeline`** — window filtering, flag counting, bucket totals.

**Validated before pushing** with an embedded PostgreSQL 18.4 (`embedded-postgres` npm, run as an unprivileged user): 7/7 green locally before the first CI run.

### 2. Nightly deployment smoke — `.github/workflows/smoke.yml` (new)

Runs at **03:30 Asia/Manila daily** (after the 02:00 purge) + manual dispatch. Checks every content page (`/`, `/members`, `/war`, `/capital`, `/hall-of-fame`, `/strategy`, `/offline`) for HTTP 200 **plus a page-specific content marker** (so a deployed error page fails, not just a 5xx), and the PWA shell assets (`/manifest.webmanifest`, `/sw.js` with its body intact). Writes a per-endpoint ✅/❌ table to the run summary; exits red on any failure. When `VERCEL_APP_URL` is unset the run exits **neutral with a note** instead of failing every night. The endpoint logic was validated locally against a production build (9/9 green).

### 3. Branch protection on `main`

Applied via the GitHub API: `main` now **requires the `CI status report` check**, blocks force pushes and deletions. `enforce_admins` is **false** — the owner keeps the ability to push directly (this repo's working pattern); the protection binds non-admin collaborators and PR merges to the CI gate. The required context matches the report job's name exactly.

## Decisions

- **`postgres:18-alpine`** in CI because the suite was locally validated against embedded PG 18.4 — CI runs the same major version the validation used.
- **The integration suite is skip-by-default, not excluded** — `bun run test` locally shows it as one skipped file (7 skipped tests), making the suite's existence visible, while `INTEGRATION_DATABASE_URL` gates any real connection. Combined with the localhost-only refusal, an accidental run against production is impossible.
- **Purge extraction over route-level HTTP tests** — invoking the route would need a Next server, auth, and `revalidatePath` mocking; the function boundary gives the same coverage for free and improves the route's readability.
- **Smoke content markers over plain status codes** — a Vercel "Application error" page returns 200; the per-page h1 marker catches that class of silent breakage.

## Verification

- `tsc --noEmit`, `eslint .` clean; unit suite 20 files / 280 tests green (unaffected).
- Integration suite: 7/7 green against embedded PostgreSQL 18.4 locally.
- Smoke endpoint logic: 9/9 green against a local production build (`next start`).
- Both workflow files parse as valid YAML.
- First CI run on the pushed commit (below) exercises the service-container job end-to-end.

## Next Action

None — the roadmap (Phases 1–6) and its documented follow-ups are all executed. Future ideas live in the assessment §7 unselected items (2 · 4 · 7 · 13–15) whenever a second roadmap is wanted.
