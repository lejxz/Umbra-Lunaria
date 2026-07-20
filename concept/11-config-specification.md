# 11 — Final Configuration & Administration Specification

## Configuration layers

Configuration has three deliberately separate layers:

1. **Secrets** — environment variables, never committed.
2. **Static clan configuration** — version-controlled non-secret defaults requiring deployment to change.
3. **Runtime settings** — administrator-editable database values for operational behavior and scoring.

## Environment variables

Set these in Vercel; copy only the non-secret references to GitHub Actions where needed.

```text
# Clash of Clans API
COC_API_TOKEN=
COC_API_BASE_URL=https://cocproxy.royaleapi.dev/v1

# Database
DATABASE_URL=

# Machine-to-machine route security
INGEST_SECRET=
CRON_SECRET=

# Administrator session protection for roster and settings writes
ADMIN_SESSION_SECRET=
ADMIN_PASSWORD_HASH=
```

`COC_API_TOKEN`, `DATABASE_URL`, `INGEST_SECRET`, `CRON_SECRET`, `ADMIN_SESSION_SECRET`, and `ADMIN_PASSWORD_HASH` are secrets. They must not be checked into source control, exposed in browser code, or copied into session logs.

## GitHub Actions secrets

```text
VERCEL_APP_URL=
INGEST_SECRET=
```

The workflow calls `/api/ingest` with `Authorization: Bearer ${{ secrets.INGEST_SECRET }}`. Its secret must exactly match the Vercel environment value.

## Static clan configuration

`config/clan.config.ts` contains versioned, non-secret defaults:

| Setting | Current/default value | Purpose |
|---|---|---|
| `clanTag` | `#2JPCYP98L` | The one clan tracked by this deployment. |
| `timezone` | `Asia/Manila` | Day boundaries and rendered timestamps. |
| `memberRetentionDays` | `14` | Retained departed-member data duration. |
| `pollIntervalMinutes` | `10` | Target light-poll cadence; workflow cron must match it. |
| `minWarsForConfidentRanking` | `3` | Threshold for a full-confidence auto-select score. |
| `features` | per feature | Enable/disable incomplete or optional surfaces. |

Static config changes require review and redeploy. The clan tag is intentionally a single value, not an array.

## Runtime settings

Administrators can change the following without a deploy:

1. Inactivity threshold for the dashboard attention panel.
2. Member Activity Score window and component weights.
3. War auto-select component weights.
4. Minimum tracked data threshold for score confidence.
5. Dashboard alert timing for attacks remaining.
6. Feature visibility toggles for optional Capital, Builder Base, and planning surfaces.
7. Display limits for clan-log and leaderboard windows.

Every score-weight set is validated before save:

1. Values are non-negative.
2. Required configured weights sum to 1.0.
3. A version and update timestamp are stored with the setting.
4. Data-unavailable reweighting follows the product rules, not a hidden manual override.

## Administrative protection

1. The app uses a small administrator session for roster and settings writes.
2. Session credentials are validated server-side and stored in secure, HTTP-only cookies.
3. Read-only pages remain public.
4. Write routes reject unauthenticated access and log an auditable actor/time/result without storing secrets.
5. Machine route secrets and administrator credentials are independent; one must never be reused as the other.

## Future multi-clan note

Multi-clan support remains out of scope. Adding it later requires tenant-scoped data, configuration, permissions, and routing; it is not a safe one-line extension of `clanTag`.
