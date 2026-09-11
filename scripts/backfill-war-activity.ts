/**
 * scripts/backfill-war-activity.ts — Phase 1 step 1.4 (one-shot).
 * docs/2026-09-11-implementation-plan.md §1.5 step 4.
 *
 * Heals the member-activity history so war participation counts: for every
 * recorded war attack, set `activity_flag` + `login_day_flag` on the member's
 *
 *   (a) first snapshot at/after the attack on the SAME clan-timezone day
 *       (interval-honest: the snapshot that "observed" the attack), and
 *   (b) the last snapshot of that clan-timezone day
 *       (the row that survives intra-day pruning forever — this is what
 *       heals the 30-day heatmap for days already pruned to their EOD
 *       marker, and keeps the day lit after future pruning).
 *
 * Both flags are set because performing a war attack is unambiguous login
 * evidence — the same semantics the live poll now applies
 * (computeActivityFlags(..., warAttacksInInterval)).
 *
 * After the flag update the script re-runs `computeCheckpoints()` (so
 * `cumulative_login_days` picks up the healed days) and
 * `checkHallOfFameRecords()` (so the "dedicated" streak reflects them).
 *
 * Idempotent: targets already flagged are excluded by the UPDATE's WHERE —
 * running the script a second time reports 0 changed rows (verified at the
 * end of every run).
 *
 * Usage:
 *   DATABASE_URL=postgres://... bun run scripts/backfill-war-activity.ts [--dry-run]
 *
 * --dry-run prints the target counts and before-state without writing
 * anything (checkpoints / HoF recompute also skipped).
 *
 * The DATABASE_URL is NOT hardcoded here — it is a secret and must be
 * supplied via the environment (same variable `lib/db` reads).
 */

import { sql, type SQL } from "drizzle-orm";
import { clanConfig } from "../config/clan.config";

/** Rows come back as snake_case records from raw SQL. */
type Row = Record<string, unknown>;

// Same tradeoff as the purge route: parameterized `AT TIME ZONE $1` fails on
// Supabase's PgBouncer transaction pooler, so the clan timezone — a
// hardcoded config constant, not user input — is inlined as a raw literal.
const TZ = sql.raw(`'${clanConfig.timezone}'`);

// The backfill target set, shared by the count query and the UPDATE.
const TARGETS: SQL = sql`
  WITH attacks AS (
    SELECT DISTINCT wa.attacker_tag AS player_tag, wa.attacked_at
    FROM war_attacks wa
    WHERE wa.attacked_at IS NOT NULL
  ),
  first_after AS (
    -- (a) the first snapshot at/after the attack, same clan-TZ day.
    SELECT DISTINCT ON (a.player_tag, a.attacked_at)
      ms.id
    FROM attacks a
    JOIN member_snapshots ms
      ON ms.player_tag = a.player_tag
     AND ms.captured_at >= a.attacked_at
     AND date_trunc('day', ms.captured_at AT TIME ZONE ${TZ})
        = date_trunc('day', a.attacked_at AT TIME ZONE ${TZ})
    ORDER BY a.player_tag, a.attacked_at, ms.captured_at, ms.id
  ),
  attack_days AS (
    SELECT DISTINCT a.player_tag,
      date_trunc('day', a.attacked_at AT TIME ZONE ${TZ}) AS day_start
    FROM attacks a
  ),
  eod AS (
    -- (b) the last snapshot of the attack's clan-TZ day — the pruning-proof
    -- day marker.
    SELECT DISTINCT ON (ad.player_tag, ad.day_start)
      ms.id
    FROM attack_days ad
    JOIN member_snapshots ms
      ON ms.player_tag = ad.player_tag
     AND date_trunc('day', ms.captured_at AT TIME ZONE ${TZ}) = ad.day_start
    ORDER BY ad.player_tag, ad.day_start, ms.captured_at DESC, ms.id DESC
  )
  SELECT id FROM first_after
  UNION
  SELECT id FROM eod
`;

const UPDATE: SQL = sql`
  UPDATE member_snapshots ms
  SET activity_flag = true, login_day_flag = true
  WHERE ms.id IN (${TARGETS})
    AND (ms.activity_flag = false OR ms.login_day_flag = false)
  RETURNING ms.player_tag, ms.captured_at
`;

interface StatsSnapshot {
  totalSnapshots: number;
  activityFlagged: number;
  loginFlagged: number;
  loginDays: number;
  warAttacks: number;
  distinctAttackers: number;
}

interface Db {
  execute: (query: SQL) => Promise<{ rows?: unknown[] }>;
}

async function queryRows(db: Db, stmt: SQL): Promise<Row[]> {
  const result = await db.execute(stmt);
  return (result.rows ?? []) as Row[];
}

async function stats(db: Db): Promise<StatsSnapshot> {
  const [totals] = await queryRows(
    db,
    sql`
      SELECT
        count(*) AS total,
        count(*) FILTER (WHERE activity_flag) AS active,
        count(*) FILTER (WHERE login_day_flag) AS logins
      FROM member_snapshots
    `,
  );
  const [days] = await queryRows(
    db,
    sql`
      SELECT count(*) AS login_days
      FROM (
        SELECT DISTINCT player_tag,
          date_trunc('day', captured_at AT TIME ZONE ${TZ}) AS day
        FROM member_snapshots WHERE login_day_flag
      ) _
    `,
  );
  const [attacks] = await queryRows(
    db,
    sql`
      SELECT count(*) AS total, count(DISTINCT attacker_tag) AS attackers
      FROM war_attacks WHERE attacked_at IS NOT NULL
    `,
  );

  return {
    totalSnapshots: Number(totals?.total ?? 0),
    activityFlagged: Number(totals?.active ?? 0),
    loginFlagged: Number(totals?.logins ?? 0),
    loginDays: Number(days?.login_days ?? 0),
    warAttacks: Number(attacks?.total ?? 0),
    distinctAttackers: Number(attacks?.attackers ?? 0),
  };
}

function printStats(label: string, s: StatsSnapshot): void {
  console.log(`\n[${label}]`);
  console.log(`  snapshots:            ${s.totalSnapshots}`);
  console.log(`  activity-flagged:     ${s.activityFlagged}`);
  console.log(`  login-flagged:        ${s.loginFlagged}`);
  console.log(`  distinct login days:  ${s.loginDays}`);
  console.log(`  war attacks:          ${s.warAttacks} (${s.distinctAttackers} attackers)`);
}

function asDate(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (typeof value === "string") return new Date(value);
  return null;
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const url = process.env.DATABASE_URL;

  if (!url || !url.startsWith("postgres")) {
    console.error(
      "✗ DATABASE_URL must be set to a Postgres connection string " +
        "(e.g. postgresql://user:pass@host:6543/postgres). It is not hardcoded " +
        "in this script — pass it via the environment.",
    );
    process.exit(1);
  }

  console.log(
    dryRun
      ? "→ war-activity backfill (DRY RUN — no writes)"
      : "→ war-activity backfill",
  );

  // Imported AFTER the DATABASE_URL guard so the pool in lib/db binds to the
  // intended database (lib/db resolves the URL at import time).
  const { db } = await import("../lib/db");
  const { computeCheckpoints } = await import("../lib/ingest/checkpoints");
  const { checkHallOfFameRecords } = await import("../lib/db/records-updater");

  // ---- BEFORE ---------------------------------------------------------------
  const before = await stats(db);
  printStats("BEFORE", before);

  // War-blind ATTACKS (day-grain): an attack whose clan-timezone day carries
  // no activity-flagged snapshot — the unit this backfill heals. Day-grain is
  // the honest comparator: in the once-daily-poll era (late July 2026) the
  // day's only snapshot can precede the attack, and the EOD target (b) still
  // heals the day; interval-timestamp comparison would false-alarm there.
  const blindRows = await queryRows(
    db,
    sql`
      WITH attacks AS (
        SELECT DISTINCT wa.attacker_tag AS player_tag, wa.attacked_at
        FROM war_attacks wa
        WHERE wa.attacked_at IS NOT NULL
      ),
      unhealed AS (
        SELECT DISTINCT a.player_tag, a.attacked_at
        FROM attacks a
        WHERE NOT EXISTS (
          SELECT 1 FROM member_snapshots ms
          WHERE ms.player_tag = a.player_tag
            AND ms.activity_flag
            AND date_trunc('day', ms.captured_at AT TIME ZONE ${TZ})
              = date_trunc('day', a.attacked_at AT TIME ZONE ${TZ})
        )
      ),
      names AS (
        SELECT player_tag, name FROM members
        UNION
        SELECT DISTINCT attacker_tag AS player_tag, 'departed' AS name FROM war_attacks
      )
      SELECT u.player_tag, coalesce(n.name, u.player_tag) AS name, u.attacked_at AS last_unhealed_attack
      FROM unhealed u
      LEFT JOIN names n ON n.player_tag = u.player_tag
    `,
  );
  const blindAttacks = blindRows.map((r) => ({
    playerTag: String(r.player_tag),
    name: String(r.name),
    attack: asDate(r.last_unhealed_attack),
  }));
  const blindByTag = new Map<string, { name: string; attack: Date }>();
  for (const b of blindAttacks) {
    const existing = blindByTag.get(b.playerTag);
    if (!existing || (b.attack && existing.attack && b.attack > existing.attack)) {
      blindByTag.set(b.playerTag, { name: b.name, attack: b.attack! });
    }
  }
  console.log(
    `\nWar-blind members (attacks whose day has no flagged snapshot): ${blindByTag.size}` +
      ` (${blindAttacks.length} unhealed attack day(s))`,
  );
  for (const [tag, b] of blindByTag) {
    console.log(`  · ${b.name} (${tag}) — attack ${b.attack?.toISOString()}`);
  }

  // ---- TARGETS ---------------------------------------------------------------
  const [targetCount] = await queryRows(
    db,
    sql`
      SELECT count(*) AS targets,
             count(*) FILTER (WHERE activity_flag = false OR login_day_flag = false) AS to_change
      FROM member_snapshots
      WHERE id IN (${TARGETS})
    `,
  );
  console.log(
    `\nTarget snapshots: ${targetCount?.targets ?? 0} ` +
      `(${targetCount?.to_change ?? 0} currently unflagged → would change)`,
  );

  if (dryRun) {
    console.log(
      "\n✓ dry run complete — nothing written, checkpoints/HoF not recomputed",
    );
    process.exit(0);
  }

  // ---- APPLY -----------------------------------------------------------------
  const updated = await queryRows(db, UPDATE);
  console.log(`\nFlagged ${updated.length} snapshot(s) from war-attack evidence.`);
  const perMember = new Map<string, number>();
  for (const u of updated) {
    const tag = String(u.player_tag);
    perMember.set(tag, (perMember.get(tag) ?? 0) + 1);
  }
  for (const [tag, count] of [...perMember.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  · ${tag}: ${count} snapshot(s)`);
  }

  // ---- RECOMPUTE CHECKPOINTS + HALL OF FAME ---------------------------------
  console.log("\n→ re-computing member checkpoints (cumulative_login_days)…");
  await computeCheckpoints();
  console.log("✓ checkpoints updated");

  console.log("→ re-checking Hall of Fame records (dedicated streaks)…");
  const hofErrors = await checkHallOfFameRecords();
  if (hofErrors.length > 0) {
    console.warn("⚠ HoF errors:", hofErrors);
  } else {
    console.log("✓ Hall of Fame updated");
  }

  // ---- AFTER -----------------------------------------------------------------
  const after = await stats(db);
  printStats("AFTER ", after);

  const stillBlindRows = await queryRows(
    db,
    sql`
      WITH attacks AS (
        SELECT DISTINCT wa.attacker_tag AS player_tag, wa.attacked_at
        FROM war_attacks wa
        WHERE wa.attacked_at IS NOT NULL
      )
      SELECT DISTINCT a.player_tag, a.attacked_at
      FROM attacks a
      WHERE NOT EXISTS (
        SELECT 1 FROM member_snapshots ms
        WHERE ms.player_tag = a.player_tag
          AND ms.activity_flag
          AND date_trunc('day', ms.captured_at AT TIME ZONE ${TZ})
            = date_trunc('day', a.attacked_at AT TIME ZONE ${TZ})
      )
    `,
  );
  const healedCount = blindAttacks.length - stillBlindRows.length;
  console.log(
    `\nWar-blind attack days after backfill: ${healedCount} of ${blindAttacks.length} healed`,
  );
  for (const r of stillBlindRows) {
    console.log(
      `  ⚠ still unhealed: ${String(r.player_tag)} attack ${String(r.attacked_at)} — the attack's clan-TZ day has no snapshot at all (no poll that day)`,
    );
  }

  // ---- IDEMPOTENCY -----------------------------------------------------------
  console.log("\n→ idempotency check: re-applying the UPDATE (expect 0 rows)…");
  const second = await queryRows(db, UPDATE);
  console.log(
    second.length === 0
      ? "✓ idempotent — second application changed 0 rows"
      : `✗ NOT idempotent — second application changed ${second.length} rows (investigate!)`,
  );
}

main().catch((err: unknown) => {
  console.error("✗ backfill failed:", err);
  process.exit(1);
});
