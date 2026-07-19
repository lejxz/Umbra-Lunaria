# 11 — Config Specification

Two layers, deliberately kept separate (see the note at the end of `03-data-model-and-database.md`):

- **Static config** — things that rarely change, checked into the repo (minus secrets) or set as environment variables. Requires a redeploy to change.
- **Runtime settings** — things leadership may want to change without touching code or redeploying, stored in the database and editable from a settings screen.

## Static config — environment variables

These go in Vercel's Project → Settings → Environment Variables, never committed to the repo:

```
# Clash of Clans
COC_API_TOKEN=              # the JWT token from developer.clashofclans.com
COC_API_BASE_URL=https://cocproxy.royaleapi.dev/v1   # RoyaleAPI proxy, see 02-api-and-proxy-strategy.md

# Database (auto-populated by the Vercel + Neon marketplace integration)
DATABASE_URL=

# Ingestion security
INGEST_SECRET=              # shared secret the GitHub Actions poller must send; rejects unauthenticated calls to /api/ingest
CRON_SECRET=                # auto-provisioned by Vercel for the /api/cron/purge route
```

## Static config — `config/clan.config.ts` (checked into the repo, non-secret)

```ts
export const clanConfig = {
  // The single clan this deployment tracks. Format: "#XXXXXXXX" (URL-encode the
  // '#' as %23 when building raw API URLs; the coc-client wrapper should handle
  // this so callers just pass the human-readable tag).
  clanTag: "#2Y8V8VGQ",

  // IANA timezone used for "daily" boundaries in the activity graph and
  // donation-window buckets. Not necessarily UTC — pick whatever the
  // clan's leadership actually operates in.
  timezone: "Asia/Manila",

  // How long a departed member's data is retained before the daily purge
  // job deletes it. Matches the 2-week requirement by default; exposed as
  // config rather than hardcoded in case that number needs revisiting.
  memberRetentionDays: 14,

  // Poll cadence target for the GitHub Actions workflow, in minutes.
  // This value alone does not change the schedule — .github/workflows/poll.yml
  // must be edited to match, since GitHub Actions schedules are static cron
  // expressions, not read from this file at runtime.
  pollIntervalMinutes: 10,

  // Minimum number of observed wars before a member's auto-select ranking
  // is shown with full confidence rather than a "limited data" flag.
  // See 09-war-planning-and-auto-select.md.
  minWarsForConfidentRanking: 3,

  // Feature toggles — lets a clan turn off a section it doesn't use
  // (e.g., a clan that never touches Clan Capital) without deleting code.
  features: {
    clanCapital: true,
    builderBaseSummary: true,
    warPlanningAutoSelect: true,
  },
} satisfies ClanConfig;
```

## Runtime settings (database-backed, editable from a Settings page)

Not exhaustive, but the settings that plausibly change often enough that a redeploy would be annoying:

- Inactivity threshold (days) used for the dashboard's "needs attention" panel.
- Auto-select scoring weights, if the clan wants to tune how heavily rushed % vs. activity vs. 3-star rate count — expose this as sliders/inputs rather than a code change, since it's a judgment call the clan should own, not one this plan should hardcode permanently.

## A note on multi-clan, even though it's out of scope

The brief is explicitly single-clan, and `clanConfig.clanTag` reflects that as a single value, not an array. If this ever needs to support more than one clan, that's a real architecture change (multi-tenant DB schema, per-clan config resolution, per-clan auth scoping) — not a small tweak. Worth knowing now so nobody's surprised later; not worth building for today.
