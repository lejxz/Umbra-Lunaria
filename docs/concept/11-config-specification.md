# 11 — Final Configuration & Administration Specification

## Configuration layers

Configuration has three deliberately separate layers:

1. **Secrets** — environment variables, never committed.
2. **Static clan configuration** — version-controlled non-secret defaults requiring deployment to change.
3. **Runtime settings** — administrator-editable database values for operational behavior and scoring.

## Environment variables

Set these in Vercel. The `INGEST_SECRET` is also configured in the third-party cron-job service that triggers `/api/ingest` (see docs/concept/04). The `CRON_SECRET` is sent automatically by Vercel Cron when it invokes `/api/cron/purge`.

```text
# Clash of Clans API
COC_API_TOKEN=
COC_API_BASE_URL=https://cocproxy.royaleapi.dev/v1

# Database
DATABASE_URL=

# Machine-to-machine route security
INGEST_SECRET=
CRON_SECRET=
```

`COC_API_TOKEN`, `DATABASE_URL`, `INGEST_SECRET`, and `CRON_SECRET` are secrets. They must not be checked into source control, exposed in browser code, or copied into session logs.

## Third-party cron-job service configuration

The external cron-job service (e.g. cron-job.org / EasyCron / UptimeRobot Cron) owns the light-poll and daily-batch schedule. Configure two jobs pointing at the deployed Vercel URL:

| Job | Schedule | Method | URL | Headers | Body |
|---|---|---|---|---|---|
| Light poll | every 5 min | POST | `https://<vercel-app>/api/ingest` | `Authorization: Bearer <INGEST_SECRET>` | `{"batch": false}` |
| Daily batch | once daily (e.g. 04:00 Asia/Manila) | POST | `https://<vercel-app>/api/ingest` | `Authorization: Bearer <INGEST_SECRET>` | `{"batch": true}` |

The `INGEST_SECRET` configured in the cron service must exactly match the Vercel environment value. Use the service's "request timeout" ≥ 30s for the daily batch (full player-detail fetches take longer than the light poll).

## GitHub Actions (manual fallback only)

```text
VERCEL_APP_URL=
INGEST_SECRET=
```

`.github/workflows/poll.yml` is retained as a `workflow_dispatch`-only (manual) fallback for ad-hoc ingest runs from the Actions tab. It is no longer the primary scheduler — the third-party cron service is, for schedule consistency (see docs/concept/04). The `INGEST_SECRET` repository secret must still match the Vercel environment value when the fallback is used.

## Static clan configuration

`config/clan.config.ts` contains versioned, non-secret defaults:

| Setting | Current/default value | Purpose |
|---|---|---|
| `clanTag` | `#2JPCYP98L` | The one clan tracked by this deployment. |
| `timezone` | `Asia/Manila` | Day boundaries and rendered timestamps. |
| `memberRetentionDays` | `14` | Retained departed-member data duration. |
| `pollIntervalMinutes` | `5` | Target light-poll cadence; the third-party cron-job service schedule must match it. |
| `minWarsForConfidentRanking` | `3` | Threshold for a full-confidence Member Activity Score limited-data label. |
| `features` | per feature | Enable/disable optional surfaces (Capital, Builder Base). |

Static config changes require review and redeploy. The clan tag is intentionally a single value, not an array.

## Future multi-clan note

Multi-clan support remains out of scope. Adding it later requires tenant-scoped data, configuration, permissions, and routing; it is not a safe one-line extension of `clanTag`.
