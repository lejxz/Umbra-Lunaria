/**
 * Integration suite — real SQL against a disposable Postgres
 * (docs/2026-09-14-ci-integration-and-smoke.md).
 *
 * Runs ONLY when INTEGRATION_DATABASE_URL is set (CI service container, or a
 * local docker PG). The URL must point at localhost — anything else is
 * refused, so this suite can never touch a real deployment database.
 *
 * Covers the previously untested DB layer (assessment §8 "Where the bugs
 * actually live"): migration journal integrity, the purge SQL (extracted to
 * lib/ingest/run-purge.ts for exactly this purpose) verified against the
 * pure fuzz-tested model in lib/ingest/purge-retention.ts, and the two
 * windowed queries behind the Clan Pulse panel (clan-TZ day bucketing + the
 * to_char day-key sidestep).
 *
 * Local run:
 *   docker run -d --name ul-int -p 5433:5432 -e POSTGRES_PASSWORD=ci -e POSTGRES_USER=ci -e POSTGRES_DB=ci postgres:16-alpine
 *   INTEGRATION_DATABASE_URL=postgres://ci:ci@localhost:5433/ci bunx vitest run tests/integration
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";

const INTEGRATION_URL = process.env.INTEGRATION_DATABASE_URL ?? "";

// Hard safety: refuse anything that is not localhost, regardless of what the
// variable contains. An integration suite that can silently point at
// production is worse than no integration suite.
function assertLocalhost(url: string): void {
  const host = new URL(url).hostname;
  if (!["localhost", "127.0.0.1", "::1"].includes(host)) {
    throw new Error(
      `INTEGRATION_DATABASE_URL must point at localhost (got ${host}) — refusing to run integration tests against a remote database.`,
    );
  }
}

const d = describe.skipIf(!INTEGRATION_URL);

// Filled in beforeAll (dynamic imports AFTER process.env.DATABASE_URL is set,
// because lib/db creates its pool at module load).
let queries: typeof import("@/lib/db/queries");
let appDb: typeof import("@/lib/db")["db"];
let runPurge: (typeof import("@/lib/ingest/run-purge"))["runPurge"];
let selectRetainedSnapshotIds: (typeof import("@/lib/ingest/purge-retention"))["selectRetainedSnapshotIds"];
let schema: typeof import("@/lib/db/schema");
let migratePool: import("pg").Pool;

/** All tests share one fixed "now" so seeded relative times are deterministic. */
const NOW = new Date("2026-09-14T12:00:00Z");

/** Manila is UTC+8: 12:00Z = 20:00 Manila same day — mid-day, far from edges. */
function atDay(day: string, hourZ = 12): Date {
  return new Date(`${day}T${String(hourZ).padStart(2, "0")}:00:00Z`);
}

/** days before NOW, mid-day UTC (20:00 Manila — far from day edges). */
function daysAgo(n: number): Date {
  const d = new Date(NOW);
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

d("Integration — disposable Postgres", () => {
  beforeAll(async () => {
    assertLocalhost(INTEGRATION_URL);
    // lib/db reads DATABASE_URL at module load — point it at the disposable
    // DB BEFORE the first import of any app module.
    process.env.DATABASE_URL = INTEGRATION_URL;

    // 1. Apply migrations with a private pool (idempotent — the journal
    //    skips already-applied entries).
    const { Pool } = await import("pg");
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const { migrate } = await import("drizzle-orm/node-postgres/migrator");
    migratePool = new Pool({ connectionString: INTEGRATION_URL });
    await migrate(drizzle(migratePool), { migrationsFolder: "./drizzle" });

    // 2. Import the modules under test (their pools now target the
    //    integration DB via process.env.DATABASE_URL).
    queries = await import("@/lib/db/queries");
    ({ db: appDb } = await import("@/lib/db"));
    ({ runPurge } = await import("@/lib/ingest/run-purge"));
    ({ selectRetainedSnapshotIds } = await import("@/lib/ingest/purge-retention"));
    schema = await import("@/lib/db/schema");

    // 3. Clean slate for the tables this suite touches.
    for (const table of [
      schema.memberSnapshots,
      schema.unitLevels,
      schema.members,
      schema.membershipEvents,
      schema.wars,
      schema.capitalDistrictSnapshots,
    ]) {
      await appDb.delete(table);
    }
  }, 120_000);

  afterAll(async () => {
    await migratePool?.end();
  });

  it("migrations applied — core tables exist", async () => {
    const { sql } = await import("drizzle-orm");
    const res = await appDb.execute(
      sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`,
    );
    const names = (res.rows as { table_name: string }[]).map((r) => r.table_name);
    for (const expected of [
      "members",
      "member_snapshots",
      "membership_events",
      "wars",
      "war_participants",
      "war_attacks",
      "capital_district_snapshots",
      "runtime_settings",
      "hall_of_fame_records",
    ]) {
      expect(names).toContain(expected);
    }
    // The drizzle journal lives in its own schema and must have recorded
    // every shipped migration.
    const journal = await appDb.execute(
      sql`SELECT count(*)::int AS n FROM drizzle.__drizzle_migrations`,
    );
    const applied = Number((journal.rows?.[0] as { n: number } | undefined)?.n ?? 0);
    const { readdirSync } = await import("node:fs");
    const shipped = readdirSync("./drizzle").filter((f) => f.endsWith(".sql")).length;
    expect(applied).toBe(shipped);
  });

  it("getRosterSizeTrend buckets by CLAN-TZ day (not UTC) and returns SQL day keys", async () => {
    // One member has snapshots at 2026-09-12T15:00Z (23:00 Manila, still
    // Sep 12) and 2026-09-12T17:00Z (01:00 Manila, Sep 13!) — the boundary
    // that breaks UTC bucketing.
    await appDb.insert(schema.members).values([
      memberRow("#AAA", "BoundaryMember"),
      memberRow("#BBB", "SteadyMember"),
    ]);
    await appDb.insert(schema.memberSnapshots).values([
      snap("#AAA", atDay("2026-09-12", 15)), // Manila Sep 12
      snap("#AAA", atDay("2026-09-12", 17)), // Manila Sep 13 (crosses midnight)
      snap("#AAA", atDay("2026-09-13", 12)), // Manila Sep 13
      snap("#BBB", atDay("2026-09-13", 12)), // Manila Sep 13
    ]);

    const trend = await queries.getRosterSizeTrend(30, NOW);
    const byKey = new Map(trend.points.map((p) => [p.dayKey, p.count]));

    expect(trend.points.length).toBeGreaterThanOrEqual(2);
    expect(byKey.get("2026-09-12")).toBe(1); // only #AAA before midnight
    expect(byKey.get("2026-09-13")).toBe(2); // both after midnight
    // dayKey is a plain SQL string, exactly the to_char format.
    expect([...byKey.keys()].every((k) => /^\d{4}-\d{2}-\d{2}$/.test(k))).toBe(true);
  });

  it("getActivityTimeline counts distinct flagged members per bucket and in-window totals", async () => {
    // Fresh member; flags spread over the last few hours of the window.
    await appDb.insert(schema.members).values(memberRow("#CCC", "ActiveMember"));
    await appDb.insert(schema.memberSnapshots).values([
      { ...snap("#CCC", new Date(NOW.getTime() - 2 * 3600_000)), activityFlag: true },
      { ...snap("#CCC", new Date(NOW.getTime() - 5 * 3600_000)), activityFlag: true },
      // Unflagged snapshot — not activity evidence.
      { ...snap("#CCC", new Date(NOW.getTime() - 6 * 3600_000)) },
      // Out of window (25h ago) — excluded even though flagged.
      { ...snap("#CCC", new Date(NOW.getTime() - 25 * 3600_000)), activityFlag: true },
    ]);

    const timeline = await queries.getActivityTimeline("24h", NOW);
    expect(timeline.buckets).toHaveLength(24);
    expect(timeline.totalActiveMembers).toBe(1);
    expect(timeline.totalMembers).toBeGreaterThanOrEqual(1);
    // Buckets that contain the flagged snapshots have 1 active; the sum of
    // active over all buckets equals 2 (two flagged snapshots in distinct
    // hourly buckets).
    const sumActive = timeline.buckets.reduce((s, b) => s + b.activeMembers, 0);
    expect(sumActive).toBe(2);
  });

  it("runPurge — snapshot pruning matches the pure fuzz-tested model exactly", async () => {
    // Rich chain for #PURGE: 10 days old (older than the 7-day horizon),
    // several snapshots per day, a mid-day counter reset, flagged rows, and
    // an EOD marker. The SQL must keep exactly the rows the pure model
    // (lib/ingest/purge-retention.ts — the fuzz-tested spec) keeps.
    const oldDay = (n: number) => daysAgo(n);
    await appDb.insert(schema.members).values(memberRow("#PURGE", "PruneMe"));

    const chain = [
      // Day −10: climb 0 → 40 → 80 (EOD marker keeps the last).
      { ...snap("#PURGE", oldDay(10)), donations: 0 },
      { ...snap("#PURGE", new Date(oldDay(10).getTime() + 3600_000)), donations: 40 },
      { ...snap("#PURGE", new Date(oldDay(10).getTime() + 2 * 3600_000)), donations: 80 },
      // Day −9: reset mid-day (80 → 5 → 30) + a flagged row in between.
      { ...snap("#PURGE", oldDay(9)), donations: 80 },
      { ...snap("#PURGE", new Date(oldDay(9).getTime() + 3600_000)), donations: 5 },
      { ...snap("#PURGE", new Date(oldDay(9).getTime() + 2 * 3600_000)), donations: 30, activityFlag: true },
      { ...snap("#PURGE", new Date(oldDay(9).getTime() + 3 * 3600_000)), donations: 60 }, // EOD
      // Day −8: flat, two rows — only the EOD survives.
      { ...snap("#PURGE", oldDay(8)), donations: 60 },
      { ...snap("#PURGE", new Date(oldDay(8).getTime() + 2 * 3600_000)), donations: 60 },
    ];
    const inserted = await appDb
      .insert(schema.memberSnapshots)
      .values(chain)
      .returning({ id: schema.memberSnapshots.id });

    const expectedSurvivors = selectRetainedSnapshotIds(
      chain.map((c, i) => ({
        id: inserted[i]!.id,
        playerTag: c.playerTag,
        capturedAt: c.capturedAt,
        donations: c.donations,
        donationsReceived: c.donationsReceived,
        activityFlag: c.activityFlag ?? false,
        loginDayFlag: c.loginDayFlag ?? false,
      })),
    );
    expect(expectedSurvivors.size).toBeGreaterThan(0);
    expect(expectedSurvivors.size).toBeLessThan(chain.length);

    await runPurge(NOW);

    const { eq } = await import("drizzle-orm");
    const remaining = await appDb
      .select({ id: schema.memberSnapshots.id })
      .from(schema.memberSnapshots)
      .where(eq(schema.memberSnapshots.playerTag, "#PURGE"));
    const remainingIds = new Set(remaining.map((r) => r.id));

    // The SQL rule and the pure model must agree EXACTLY.
    expect([...remainingIds].sort()).toEqual([...expectedSurvivors].sort());
  });

  it("runPurge — recent snapshots (<7d) are never pruned", async () => {
    const { eq } = await import("drizzle-orm");
    await appDb.insert(schema.members).values(memberRow("#RECENT", "KeepMe"));
    await appDb.insert(schema.memberSnapshots).values([
      snap("#RECENT", daysAgo(3)),
      snap("#RECENT", daysAgo(2)),
      snap("#RECENT", daysAgo(1)),
    ]);

    await runPurge(NOW);

    const remaining = await appDb
      .select({ id: schema.memberSnapshots.id })
      .from(schema.memberSnapshots)
      .where(eq(schema.memberSnapshots.playerTag, "#RECENT"));
    expect(remaining).toHaveLength(3);
  });

  it("runPurge — departed members past purgeAt are removed with their data; events kept", async () => {
    const { eq } = await import("drizzle-orm");
    await appDb.insert(schema.members).values({
      ...memberRow("#GONE", "Departed"),
      leftAt: daysAgo(20),
      purgeAt: daysAgo(6), // 14-day retention after leaving
    });
    await appDb.insert(schema.memberSnapshots).values(snap("#GONE", daysAgo(21)));
    await appDb.insert(schema.membershipEvents).values({
      playerTag: "#GONE",
      nameAtEvent: "Departed",
      eventType: "leave",
      eventTime: daysAgo(20),
      metadata: {},
    });

    await runPurge(NOW);

    expect(
      await appDb.select().from(schema.members).where(eq(schema.members.playerTag, "#GONE")),
    ).toEqual([]);
    expect(
      await appDb.select().from(schema.memberSnapshots).where(eq(schema.memberSnapshots.playerTag, "#GONE")),
    ).toEqual([]);
    // membership_events are the immutable audit log — never purged.
    expect(
      await appDb.select().from(schema.membershipEvents).where(eq(schema.membershipEvents.playerTag, "#GONE")),
    ).toHaveLength(1);
  });

  it("runPurge — old backfill wars pruned, old warSnapshots nulled, recent wars kept", async () => {
    await appDb.insert(schema.wars).values([
      warRow("old-backfill", { endTime: daysAgo(400), warType: "regular" }), // deleted (no snapshot, >365d)
      warRow("old-snapshotted", { endTime: daysAgo(120), state: "warEnded", warSnapshot: { raw: true } }), // kept, snapshot nulled
      warRow("recent", { endTime: daysAgo(10), state: "warEnded", warSnapshot: { raw: true } }), // kept intact
    ]);

    const result = await runPurge(NOW);

    expect(result.prunedWars).toBe(1);

    const remaining = await appDb
      .select({ opponentName: schema.wars.opponentName, warSnapshot: schema.wars.warSnapshot })
      .from(schema.wars);
    const byName = new Map(remaining.map((w) => [w.opponentName, w.warSnapshot]));

    expect(byName.has("old-backfill")).toBe(false);
    expect(byName.get("old-snapshotted")).toBeNull();
    expect(byName.get("recent")).toEqual({ raw: true });
    expect(result.prunedWarSnapshots).toBe(1);
  });
});

// ── Fixtures ─────────────────────────────────────────────────────────────

function memberRow(playerTag: string, name: string) {
  return {
    playerTag,
    name,
    role: "member",
    townHallLevel: 15,
    warPreference: "in",
    trophies: 3000,
    joinedAt: daysAgo(40),
  };
}

function snap(playerTag: string, capturedAt: Date) {
  return {
    playerTag,
    capturedAt,
    donations: 100,
    donationsReceived: 50,
    trophies: 3000,
    activityFlag: false,
    loginDayFlag: false,
  };
}

function warRow(
  opponentName: string,
  opts: { endTime: Date; warType?: string; state?: string; warSnapshot?: unknown },
) {
  return {
    opponentTag: "#OPP" + opponentName.slice(0, 4),
    opponentName,
    warType: opts.warType ?? "regular",
    state: opts.state ?? "warEnded",
    teamSize: 10,
    attacksPerMember: 2,
    startTime: new Date(opts.endTime.getTime() - 2 * 86_400_000),
    endTime: opts.endTime,
    warSnapshot: (opts.warSnapshot as object) ?? null,
  };
}
