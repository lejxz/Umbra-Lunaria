# Hall of Fame Dashboard Section (2026-07-22)

## Overview

Implemented a **Hall of Fame** section on the dashboard — a full-width card sitting between the Activity Analytics panel and the Attention Queue. It displays 5 all-time clan records, each held by a single member. A new all-time high **overwrites** the existing record row (no accumulation). The 5 awards and their record holders are visually displayed as frosted-glass award tiles.

This feature is **completely separate** from the existing Activity Score (0–100 normalized leaderboard). The Hall of Fame uses raw, uncapped lifetime numbers that grow indefinitely.

---

## Awards

| Award | Title | Metric | Source Table |
|---|---|---|---|
| 🎁 **Philanthropist** | Highest donations given | All-time cumulative reset-aware donation total | `member_snapshots.donations` |
| ⚔️ **Vanguard** | Most 3-star war attacks | Count of `war_attacks` rows with `stars = 3` | `war_attacks` |
| 🔥 **Dedicated** | Longest consecutive daily login streak | Longest unbroken run of `login_day_flag = true` days | `member_snapshots.login_day_flag` |
| 💰 **Capitalist** | Highest Capital gold in a single raid weekend | Max `capital_resources_looted` per member per `capital_raid_seasons` row | `capital_contributions` |
| 👁️ **Unsleeping** | Highest raw all-time activity (uncapped) | Weighted sum: `donations + (login_days × 100) + (3-stars × 500) + (capital_looted / 10)` | All of the above |

### The Unsleeping — Calculation Detail

The Unsleeping award deliberately avoids the normalized 0–100 Activity Score (which is relative to the current clan and resets feel every window). Instead it computes a single **ever-growing raw score** per member:

```
raw_score =
  all_time_donations_given
  + (unique_login_days × 100)
  + (total_3_star_attacks × 500)
  + floor(total_capital_looted / 10)
```

This produces large uncapped numbers (e.g. 50,000+ pts for a veteran) that grow indefinitely, giving the Hall of Fame its intended "legendary" feel.

---

## Database

### New table: `hall_of_fame_records`

```sql
CREATE TABLE "hall_of_fame_records" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "award_key" text NOT NULL UNIQUE,   -- "philanthropist" | "vanguard" | "dedicated" | "capitalist" | "unsleeping"
  "holder_tag" text NOT NULL,
  "holder_name" text NOT NULL,        -- preserved even if member is later purged
  "record_value" integer NOT NULL,    -- raw integer (donations, stars, days, gold, raw score)
  "value_label" text NOT NULL,        -- human-readable, e.g. "9,616 troops", "15 three-stars (80% rate)"
  "period_label" text,                -- e.g. "Since tracking began", "Raid Jul 4, 2026"
  "achieved_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
```

- **5 rows maximum** (one per award key, enforced by `UNIQUE` on `award_key`).
- New records use `INSERT ... ON CONFLICT DO UPDATE` — only updates when the new value **strictly exceeds** the stored record value.
- Migration file: [`drizzle/0002_hall_of_fame.sql`](../drizzle/0002_hall_of_fame.sql)

---

## Architecture

### Records Updater — `lib/db/records-updater.ts`

Pure server-side utility. Contains 5 private compute functions (one per award) and a single public export:

```ts
export async function checkHallOfFameRecords(): Promise<string[]>
```

- Returns an array of error strings (empty = all OK).
- Reads from existing tables — **no new API calls**.
- Fetches existing records first and **skips the upsert** if the new computed value does not exceed the current record. This means zero DB writes on days where no record is broken.

### Daily Batch Hook — `app/api/ingest/route.ts`

`checkHallOfFameRecords()` is called at the **very end** of `runDailyBatch()`, wrapped in try/catch so a failure here never breaks the rest of the ingest:

```ts
// ---- Hall of Fame records (checked once per daily batch) ----
try {
  const hofErrors = await checkHallOfFameRecords();
  errors.push(...hofErrors);
} catch (err) {
  errors.push(`hall-of-fame records update failed: ${msg}`);
}
```

**Performance impact:**
- ❌ NOT called during the 5-minute light poll — zero impact.
- ✅ Called once per day during the daily batch.
- Adds ~5 `SELECT` queries + 0–5 `UPDATE` queries (only when records are broken).
- Dashboard reads 5 rows on page load — trivially fast.

### Query Layer — `lib/db/queries.ts`

New `getHallOfFame()` function reads the 5 rows and maps them to the `HallOfFame` view model. It is added to the `getDashboard()` `Promise.all([...])` array so it fetches in parallel with all other dashboard data.

### View Models — `lib/view-models/dashboard.ts`

New types added:
- `HallOfFameAwardKey` — union of the 5 award key strings
- `HallOfFameEntry` — single record row shape
- `HallOfFame` — `{ entries: HallOfFameEntry[] }`
- `DashboardData.hallOfFame: HallOfFame` — added to the aggregate

### UI Component — `components/dashboard/hall-of-fame-card.tsx`

Full-width frosted-glass card. Renders 5 award tiles in a responsive grid (`1 col → 2 col → 5 col`). Each tile has:
- Award icon + title + subtitle
- A large bold record value number in the award's accent color
- Human-readable value label below
- Holder name + period label at the bottom
- A 👑 crown badge (visible on hover)

Before the first daily batch runs, tiles render as **"Pending"** placeholders (dashed border, muted opacity) — graceful empty state with no errors.

---

## Files Changed

| File | Type | Summary |
|---|---|---|
| `lib/db/schema.ts` | Modified | Added `hallOfFameRecords` table definition |
| `drizzle/0002_hall_of_fame.sql` | New | Migration SQL — applied 2026-07-22 |
| `lib/db/records-updater.ts` | New | 5 record compute functions + `checkHallOfFameRecords()` |
| `app/api/ingest/route.ts` | Modified | Import + call `checkHallOfFameRecords()` at end of daily batch |
| `lib/view-models/dashboard.ts` | Modified | `HallOfFameAwardKey`, `HallOfFameEntry`, `HallOfFame` types; `DashboardData.hallOfFame` field |
| `lib/db/queries.ts` | Modified | `getHallOfFame()` function; wired into `getDashboard()` |
| `components/dashboard/hall-of-fame-card.tsx` | New | Hall of Fame UI card component |
| `components/dashboard/dashboard-shell.tsx` | Modified | Import + render `HallOfFameCard` as Row 5 |
