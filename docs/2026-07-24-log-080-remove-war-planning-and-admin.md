# Log 080 — Remove war planning + admin + auto-select

**Date:** 2026-07-24
**Time:** 07:15 PM (+08:00)

## Summary of Session

Removed the entire war planning implementation — the admin session, runtime
settings, manual roster planner, roster persistence, and auto-select scoring —
because there was not enough practical use to justify the surface area. The
app is now a read-only clan observatory + Capital raid history. All Phase 2
code and Step 3.2 (auto-select) code is deleted; the database tables remain as
vestigial (empty, unused).

## What was removed

### Implementation files (deleted)
- `lib/auth/` — session.ts, rate-limit.ts (admin login, HMAC tokens, cookies)
- `lib/settings/` — defaults.ts, runtime.ts (runtime settings + validation)
- `lib/planning/` — types.ts, planning-context.ts, roster-service.ts,
  war-select-inputs.ts (planner context, roster CRUD/validation, auto-select inputs)
- `lib/scoring/war-select-score.ts` — the 30/25/20/15/10 composite score
- `components/planning/` — planner-shell.tsx, prep-context.tsx, auto-select-panel.tsx
- `app/planning/` — the /planning route
- `app/api/auth/` — login, logout, session routes
- `app/api/settings/` — settings GET/POST route
- `app/api/rosters/` — list, create, update, finalize routes

### Test files (deleted)
- `tests/auth/` — session.test.ts, rate-limit.test.ts (18 tests)
- `tests/settings/` — validate-settings.test.ts (11 tests)
- `tests/planning/` — planning-context.test.ts, roster-service.test.ts (24 tests)
- `tests/lib/war-select-score.test.ts` (15 tests)

### App modifications
- `components/navigation.tsx` — removed the Planning nav link + NavIconPlanning import
- `components/war/war-hero.tsx` — removed the "Plan lineup" link to /planning +
  its now-unused Link / IconChevronRight imports
- `config/clan.config.ts` — removed the `features.warPlanningAutoSelect`
  toggle; kept `minWarsForConfidentRanking` (still used by the dashboard
  activity score limited-data label)
- `.env` — removed ADMIN_PASSWORD_HASH + ADMIN_SESSION_SECRET
- `.env.example` — removed the admin session section + generation instructions

### Concept docs updated
- `docs/concept/09-war-planning-and-auto-select.md` — STATUS: DROPPED banner at top
- `docs/concept/11-config-specification.md` — removed ADMIN env vars from the env
  block, removed the "Runtime settings" + "Administrative protection" sections,
  updated `minWarsForConfidentRanking` description (no longer "auto-select")
- `docs/concept/12-Implemantation-plan-and-modularity.md` — replaced Phase 2 + Step
  3.2 with DROPPED notices (checkboxes preserved as a record of what was built
  then removed); updated the delivery sequence; added a top-of-plan DROPPED note

## What was kept

- **Phase 1** (read-only observatory) — unchanged, fully working
- **Step 3.0** (rushed analysis) — unchanged; the two SUSPENDED items remain
- **Step 3.1** (Capital raid history) — unchanged; ingest + history UI stay
- **DB tables** `war_rosters`, `war_roster_slots`, `runtime_settings` — left in
  the schema as vestigial (empty, unused). Dropping them would require a
  destructive migration with no benefit.
- **`@dnd-kit` dependency** — left in package.json (harmless; the package is
  installed but no longer imported anywhere). Removed from docs/concept/01's
  description as a planning tool.

## Verification

- **Typecheck**: clean (`tsc --noEmit`)
- **Lint**: 0 errors (13 pre-existing warnings in untouched files)
- **Tests**: 146/147 pass (1 pre-existing `windows.test.ts` failure unrelated).
  Test count dropped from 215 → 147 (the 68 deleted auth/settings/planning/
  war-select tests are gone).
- **Pages**: `/`, `/members`, `/war`, `/capital` all return 200 with no console
  errors. `/planning`, `/api/auth/*`, `/api/settings`, `/api/rosters` correctly
  404.
- **Nav**: the Planning link is gone; the war-hero "Plan lineup" link is gone.

## Rationale

The war planning feature was fully built and verified (Phase 2 complete,
Step 3.2 complete), but on reflection there wasn't enough practical use to
justify the admin session machinery, the roster persistence surface, and the
auto-select scoring complexity. The app's core value — a quiet read-only clan
observatory with Capital raid history — is simpler and more maintainable
without it. Removing the code is cleaner than leaving it dormant.

## Next Action

The app is now a focused read-only observatory. Remaining unchecked work:
- Step 3.0 SUSPENDED items (maxed-for-current-TH, roster rushed sort — future)
- Phase 4 (release hardening + optional PWA)
