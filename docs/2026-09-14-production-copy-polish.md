# Production copy polish — remove meta/over-explanation text

**Date:** 2026-09-14
**Request:** "remove meta texts like non essential over explanation texts. They are not needed in a production live website"
**Scope:** User-visible copy only — code comments, tests, and docs were left alone.

## Principle

The site should read like a production product, not an engineering demo.
Removed three classes of text:

1. **Pipeline-speak** — "daily batch", "the tracker observes", "ingestion",
   "backfilled", "between updates", "capture/synced" as nouns for data
   freshness, "Requires W/T/L from API", "Informational — not an error".
2. **Engineering self-narration** — the offline page's data-honesty essay
   ("the offline shell deliberately does not cache API responses…"), the HoF
   "Cached awards last recomputed … Live records are fresh at page load"
   stamp, the CWL standings caveat, the targeting coverage footnote.
3. **Redundant filler** — empty-state descriptions that restated the title,
   page subtitles that explained the page's function.

Kept: short, functional legends that explain a non-obvious notation (the
targeting Δ legend, the CWL ↑/↓ legend, the prep-day "attacks appear when
battle day begins" hint), actionable empty states ("Try adjusting your
filters"), and the thematic flavor copy ("Systems nominal", "The clan
observatory").

## Changes

- `components/ui/empty-state.tsx` — `description` is now optional;
  title-only empty states are valid.
- Offline shell — "You are offline" + one short paragraph; removed the
  caching-contract bullet; "Try the dashboard" → "Go to dashboard".
- Dashboard — error text no longer tells users to "trigger a manual poll
  from GitHub Actions"; war-record card lost "Requires W/T/L from API";
  current-war card lost the "Wars appear here when they start" filler;
  nav summaries and all panel empty states trimmed.
- War center — stale notice reworded ("This data is over an hour old…",
  was "This capture…next scheduled sync…"); "Synced" → "Updated"; private-log
  notice reworded; backfill tooltip de-jargonized; CWL footnote reduced to
  the ↑/↓ legend.
- Capital — "Captured" badge → "Updated"; pending-raid and upgrade-timeline
  empty states trimmed to one line.
- Hall of Fame — freshness stamp is now just "Updated {date}."; section
  placeholders trimmed.
- Strategy — page subtitle removed; empty states title-only; targeting
  coverage footnote removed (coverage already shown in the header pill).
- Members — sheet copy ("No progress data yet", "No progression data yet",
  trimmed data-starts warning); roster empty state is just "Try adjusting
  your filters."; leaderboard eyebrow "Observed clan support" → "Clan support".
- Footer — labels de-jargonized: "Daily batch" → "Records updated",
  "Tracking" → "Tracked since", "War synced" → "War updated".
- Dead code removed — `ComingSoon` (page-scaffold), `MetricState` +
  API/Tracked/Derived source badges (state-primitives), unused `eyebrow`
  prop, orphaned `formatRelative` helper, "Informational — not an error"
  detail in the opted-out group (`lib/db/queries.ts`).
- **PWA shell version bump** — the offline page is precached by the SW, and
  its copy changed, so `SW_VERSION` (public/sw.js) and `REGISTRATION_VERSION`
  (components/pwa/service-worker.tsx) were bumped 1 → 2 together per the
  documented convention. Verified in-browser: one registration, exactly one
  cache (`umbra-lunaria-v2`), localStorage marker = "2".

## Verification

- `tsc` clean, `eslint` clean, vitest 280 passed / 7 skipped (integration
  suite gated as usual).
- `next build` green; `scripts/assert-route-modes.sh` all green (six ISR
  content routes + dynamic API routes unchanged).
- Live `next start` sweep of all seven pages with tags stripped from the
  HTML: zero visible occurrences of tracker/batch/ingestion/backfill/
  captured/synced/GitHub-Actions phrasing. Remaining source hits (e.g.
  `lastSyncedAt`) are RSC payload field names, invisible to users.
- Screenshots captured for the record: `verify-dashboard.png` etc.
