import { describe, it, expect } from "vitest";
import {
  parseWarSnapshot,
  buildAnalysis,
  toHistoryEntry,
  type WarRow,
  type HistoryProjection,
  type RawSnapshot,
} from "@/lib/war/war-snapshot";

/**
 * Tests for the pure snapshot-parsing + analysis logic extracted from
 * `lib/db/war-queries.ts` (concept/12 Step 1.1.C — "Add focused tests for
 * empty database, cold start, reset week, missing API values, partial
 * history, and purged-member log records"). See tests/README.md for the
 * strategy.
 *
 * These tests cover the edge cases the query layer must handle: null/missing
 * snapshots, missing clans, empty rosters, partial attack data, cold-start
 * (no attacks), and the analysis "never fake a zero" rule.
 */

// ---------------------------------------------------------------------------
// parseWarSnapshot
// ---------------------------------------------------------------------------

describe("parseWarSnapshot — null / missing snapshot", () => {
  it("returns null when warSnapshot is null", () => {
    const row: WarRow = makeRow({ warSnapshot: null });
    expect(parseWarSnapshot(row)).toBeNull();
  });

  it("returns null when warSnapshot is undefined", () => {
    const row: WarRow = makeRow({ warSnapshot: undefined });
    expect(parseWarSnapshot(row)).toBeNull();
  });

  it("returns null when snapshot has no clan", () => {
    const row: WarRow = makeRow({
      warSnapshot: { state: "preparation", opponent: {} } as RawSnapshot,
    });
    expect(parseWarSnapshot(row)).toBeNull();
  });

  it("returns null when snapshot has no opponent", () => {
    const row: WarRow = makeRow({
      warSnapshot: { state: "preparation", clan: {} } as RawSnapshot,
    });
    expect(parseWarSnapshot(row)).toBeNull();
  });
});

describe("parseWarSnapshot — cold start (preparation, no attacks)", () => {
  it("parses a 5v5 preparation war with rosters but no attacks", () => {
    const snap: RawSnapshot = {
      state: "preparation",
      teamSize: 5,
      attacksPerMember: 2,
      clan: {
        tag: "#CLAN",
        name: "Umbra Lunaria",
        clanLevel: 11,
        stars: 0,
        destructionPercentage: 0,
        attacks: 0,
        members: [
          { tag: "#P1", name: "Alice", townhallLevel: 17, mapPosition: 1 },
          { tag: "#P2", name: "Bob", townhallLevel: 16, mapPosition: 2 },
        ],
      },
      opponent: {
        tag: "#OPP",
        name: "Enemy",
        clanLevel: 10,
        stars: 0,
        destructionPercentage: 0,
        attacks: 0,
        members: [
          { tag: "#E1", name: "Eve", townhallLevel: 17, mapPosition: 1 },
          { tag: "#E2", name: "Eva", townhallLevel: 15, mapPosition: 2 },
        ],
      },
    };
    const row = makeRow({ warSnapshot: snap, state: "preparation" });
    const parsed = parseWarSnapshot(row);
    expect(parsed).not.toBeNull();
    expect(parsed!.detail.state).toBe("preparation");
    expect(parsed!.detail.teamSize).toBe(5);
    expect(parsed!.detail.attacksPerMember).toBe(2);
    expect(parsed!.detail.clan.members).toHaveLength(2);
    expect(parsed!.detail.opponent.members).toHaveLength(2);
    expect(parsed!.attackLog).toEqual([]);
    // Base state: no attacks → worstDefenseStars is null
    expect(parsed!.detail.clan.members[0]!.worstDefenseStars).toBeNull();
  });
});

describe("parseWarSnapshot — battle day with attacks", () => {
  it("parses attacks into the merged attack log sorted by order", () => {
    const snap: RawSnapshot = {
      state: "inWar",
      teamSize: 2,
      attacksPerMember: 2,
      clan: {
        tag: "#CLAN",
        name: "Us",
        stars: 3,
        destructionPercentage: 75,
        attacks: 2,
        members: [
          {
            tag: "#P1",
            name: "Alice",
            townhallLevel: 17,
            mapPosition: 1,
            attacks: [
              { attackerTag: "#P1", defenderTag: "#E1", stars: 3, destructionPercentage: 100, order: 2 },
            ],
            // NOTE: opponentAttacks is NOT an array in the CoC API — it's a
            // count (number). Defense data is derived from the global attack
            // list by matching defenderTag. Eva's attack (order 1) targets
            // #P1, so Alice's base defense will be derived from it.
          },
        ],
      },
      opponent: {
        tag: "#OPP",
        name: "Them",
        stars: 1,
        destructionPercentage: 45,
        attacks: 1,
        members: [
          {
            tag: "#E1",
            name: "Eve",
            townhallLevel: 17,
            mapPosition: 1,
            // Eve's base was attacked by Alice (order 2, defenderTag=#E1).
            // Defense data is derived from the global attack list.
          },
          {
            tag: "#E2",
            name: "Eva",
            townhallLevel: 15,
            mapPosition: 2,
            attacks: [
              { attackerTag: "#E2", defenderTag: "#P1", stars: 1, destructionPercentage: 45, order: 1 },
            ],
          },
        ],
      },
    };
    const row = makeRow({ warSnapshot: snap, state: "inWar" });
    const parsed = parseWarSnapshot(row);
    expect(parsed!.attackLog).toHaveLength(2);
    expect(parsed!.attackLog[0]!.order).toBe(1);
    expect(parsed!.attackLog[1]!.order).toBe(2);
    // Attack log enrichment: attacker/defender names + isOwnClan
    expect(parsed!.attackLog[0]!.attackerName).toBe("Eva");
    expect(parsed!.attackLog[0]!.attackerIsOwnClan).toBe(false);
    expect(parsed!.attackLog[0]!.defenderName).toBe("Alice");
    expect(parsed!.attackLog[0]!.defenderIsOwnClan).toBe(true);
    // Base state (defense): Alice's base was attacked once, worst = 1★ 45%
    expect(parsed!.detail.clan.members[0]!.worstDefenseStars).toBe(1);
    expect(parsed!.detail.clan.members[0]!.worstDefenseDestruction).toBe(45);
    // Best attack (offense): Alice scored 3★ 100%
    expect(parsed!.detail.clan.members[0]!.bestStars).toBe(3);
    expect(parsed!.detail.clan.members[0]!.bestDestruction).toBe(100);
  });

  it("filters out attacks missing attackerTag, defenderTag, or order", () => {
    const snap: RawSnapshot = {
      state: "inWar",
      teamSize: 1,
      attacksPerMember: 1,
      clan: {
        tag: "#C", name: "Us", stars: 0, destructionPercentage: 0, attacks: 0,
        members: [{
          tag: "#P1", name: "Alice", townhallLevel: 17, mapPosition: 1,
          attacks: [
            { attackerTag: "#P1", defenderTag: "#E1", stars: 3, destructionPercentage: 100, order: 1 },
            { attackerTag: "#P1", defenderTag: undefined, stars: 2, destructionPercentage: 50, order: 2 },
            { attackerTag: undefined, defenderTag: "#E1", stars: 1, destructionPercentage: 30, order: 3 },
            { attackerTag: "#P1", defenderTag: "#E1", stars: 0, destructionPercentage: 10 }, // no order
          ],
        }],
      },
      opponent: { tag: "#O", name: "Them", stars: 0, destructionPercentage: 0, attacks: 0, members: [] },
    };
    const parsed = parseWarSnapshot(makeRow({ warSnapshot: snap }));
    expect(parsed!.attackLog).toHaveLength(1);
    expect(parsed!.attackLog[0]!.order).toBe(1);
  });
});

describe("parseWarSnapshot — missing API values", () => {
  it("falls back to row-level teamSize/attacksPerMember when snapshot omits them", () => {
    const snap: RawSnapshot = {
      state: "preparation",
      clan: { tag: "#C", name: "Us", stars: 0, destructionPercentage: 0, attacks: 0, members: [] },
      opponent: { tag: "#O", name: "Them", stars: 0, destructionPercentage: 0, attacks: 0, members: [] },
      // no teamSize or attacksPerMember in snapshot
    };
    const row = makeRow({ warSnapshot: snap, teamSize: 10, attacksPerMember: 2 });
    const parsed = parseWarSnapshot(row);
    expect(parsed!.detail.teamSize).toBe(10);
    expect(parsed!.detail.attacksPerMember).toBe(2);
  });

  it("defaults attacksPerMember to 2 when neither snapshot nor row has it", () => {
    const snap: RawSnapshot = {
      state: "preparation",
      clan: { tag: "#C", name: "Us", stars: 0, destructionPercentage: 0, attacks: 0, members: [] },
      opponent: { tag: "#O", name: "Them", stars: 0, destructionPercentage: 0, attacks: 0, members: [] },
    };
    const row = makeRow({ warSnapshot: snap, teamSize: null, attacksPerMember: null });
    const parsed = parseWarSnapshot(row);
    expect(parsed!.detail.attacksPerMember).toBe(2);
    expect(parsed!.detail.teamSize).toBeNull();
  });

  it("handles missing member fields with safe defaults", () => {
    const snap: RawSnapshot = {
      state: "preparation",
      clan: {
        tag: "#C", name: "Us", stars: 0, destructionPercentage: 0, attacks: 0,
        members: [{ name: "NoTag" }], // missing tag, townhallLevel, mapPosition
      },
      opponent: { tag: "#O", name: "Them", stars: 0, destructionPercentage: 0, attacks: 0, members: [] },
    };
    const parsed = parseWarSnapshot(makeRow({ warSnapshot: snap }));
    const m = parsed!.detail.clan.members[0]!;
    expect(m.tag).toBe("");
    expect(m.townhallLevel).toBe(0);
    expect(m.mapPosition).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// buildAnalysis
// ---------------------------------------------------------------------------

describe("buildAnalysis — never fake a zero", () => {
  it("returns null rates when there are no attacks (preparation)", () => {
    const detail = makeParsedDetail({ state: "preparation" });
    const a = buildAnalysis(detail, []);
    expect(a.ownThreeStarRate).toBeNull();
    expect(a.opponentThreeStarRate).toBeNull();
    expect(a.ownAverageStars).toBeNull();
    expect(a.opponentAverageStars).toBeNull();
    expect(a.ownNoAttackMembers).toBeNull(); // null during prep
    expect(a.opponentNoAttackMembers).toBeNull();
    expect(a.ownBestAttack).toBeNull();
  });

  it("returns null no-attack count during preparation", () => {
    const detail = makeParsedDetail({ state: "preparation" });
    const a = buildAnalysis(detail, []);
    expect(a.ownNoAttackMembers).toBeNull();
  });

  it("counts no-attack members during battle", () => {
    const detail = makeParsedDetail({ state: "inWar" });
    // 2 members, 0 attacks used each
    const a = buildAnalysis(detail, []);
    expect(a.ownNoAttackMembers).toBe(2);
    expect(a.opponentNoAttackMembers).toBe(2);
  });
});

describe("buildAnalysis — attack metrics", () => {
  it("computes 3-star rate and average stars from the attack log", () => {
    const detail = makeParsedDetail({ state: "warEnded" });
    const attacks = [
      { order: 1, attackerTag: "#P1", attackerName: "A", attackerMapPosition: 1, attackerTownhallLevel: 17, attackerIsOwnClan: true, defenderTag: "#E1", defenderName: "E", defenderMapPosition: 1, defenderTownhallLevel: 17, defenderIsOwnClan: false, stars: 3, destructionPercentage: 100, duration: null },
      { order: 2, attackerTag: "#P2", attackerName: "B", attackerMapPosition: 2, attackerTownhallLevel: 16, attackerIsOwnClan: true, defenderTag: "#E2", defenderName: "F", defenderMapPosition: 2, defenderTownhallLevel: 16, defenderIsOwnClan: false, stars: 1, destructionPercentage: 50, duration: null },
      { order: 3, attackerTag: "#E1", attackerName: "E", attackerMapPosition: 1, attackerTownhallLevel: 17, attackerIsOwnClan: false, defenderTag: "#P1", defenderName: "A", defenderMapPosition: 1, defenderTownhallLevel: 17, defenderIsOwnClan: true, stars: 2, destructionPercentage: 70, duration: null },
    ];
    const a = buildAnalysis(detail, attacks);
    expect(a.ownAttacksUsed).toBe(2);
    expect(a.ownThreeStarRate).toBe(0.5); // 1 of 2 own attacks was 3★
    expect(a.ownAverageStars).toBe(2); // (3+1)/2
    expect(a.opponentAttacksUsed).toBe(1);
    expect(a.opponentThreeStarRate).toBe(0); // 0 of 1 opp attacks was 3★
    expect(a.opponentAverageStars).toBe(2);
  });

  it("picks the best own attack by highest destruction (tie-break on stars)", () => {
    const detail = makeParsedDetail({ state: "warEnded" });
    const attacks = [
      { order: 1, attackerTag: "#P1", attackerName: "Alice", attackerMapPosition: 1, attackerTownhallLevel: 17, attackerIsOwnClan: true, defenderTag: "#E1", defenderName: "E", defenderMapPosition: 1, defenderTownhallLevel: 17, defenderIsOwnClan: false, stars: 2, destructionPercentage: 80, duration: null },
      { order: 2, attackerTag: "#P2", attackerName: "Bob", attackerMapPosition: 2, attackerTownhallLevel: 16, attackerIsOwnClan: true, defenderTag: "#E2", defenderName: "F", defenderMapPosition: 2, defenderTownhallLevel: 16, defenderIsOwnClan: false, stars: 3, destructionPercentage: 100, duration: null },
    ];
    const a = buildAnalysis(detail, attacks);
    expect(a.ownBestAttack).toEqual({ attackerName: "Bob", stars: 3, destruction: 100 });
  });

  it("computes average TH per side", () => {
    const detail = makeParsedDetail({ state: "warEnded" });
    const a = buildAnalysis(detail, []);
    expect(a.ownAverageTh).toBe(16.5); // (17+16)/2
    expect(a.opponentAverageTh).toBe(16.5);
  });
});

// ---------------------------------------------------------------------------
// toHistoryEntry
// ---------------------------------------------------------------------------

describe("toHistoryEntry — projection mapping", () => {
  it("maps a projected row with a snapshot to a history entry with hasDetail=true", () => {
    const proj: HistoryProjection = {
      id: 42,
      warType: "regular",
      opponentName: "Enemy",
      opponentTag: "#OPP",
      opponentBadgeUrls: { small: "url" },
      opponentClanLevel: 10,
      result: "win",
      teamSize: 5,
      ownStars: 15,
      opponentStars: 12,
      ownDestructionPercentage: 95,
      opponentDestructionPercentage: 80,
      endTime: new Date("2026-07-20T00:00:00Z"),
      startTime: new Date("2026-07-19T00:00:00Z"),
      attacksPerMember: 2,
      lastSyncedAt: new Date("2026-07-20T01:00:00Z"),
      hasSnapshot: true,
    };
    const entry = toHistoryEntry(proj);
    expect(entry.warId).toBe(42);
    expect(entry.hasDetail).toBe(true);
    expect(entry.result).toBe("win");
    expect(entry.opponentName).toBe("Enemy");
  });

  it("maps a backfill row (no snapshot) with hasDetail=false", () => {
    const proj: HistoryProjection = {
      id: 99,
      warType: "regular",
      opponentName: "Backfill",
      opponentTag: "#BF",
      opponentBadgeUrls: null,
      opponentClanLevel: null,
      result: "tie",
      teamSize: null,
      ownStars: 10,
      opponentStars: 10,
      ownDestructionPercentage: null,
      opponentDestructionPercentage: null,
      endTime: new Date("2026-06-01T00:00:00Z"),
      startTime: null,
      attacksPerMember: null,
      lastSyncedAt: new Date("2026-07-22T00:00:00Z"),
      hasSnapshot: false,
    };
    const entry = toHistoryEntry(proj);
    expect(entry.hasDetail).toBe(false);
    expect(entry.result).toBe("tie");
    expect(entry.teamSize).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRow(overrides: Partial<WarRow> = {}): WarRow {
  return {
    id: 1,
    warType: "regular",
    state: "preparation",
    teamSize: 2,
    attacksPerMember: 2,
    startTime: new Date("2026-07-23T04:10:24.000Z"),
    endTime: new Date("2026-07-24T04:10:24.000Z"),
    preparationStartTime: new Date("2026-07-22T04:10:24.000Z"),
    lastSyncedAt: new Date("2026-07-22T12:00:00Z"),
    warSnapshot: null,
    ...overrides,
  };
}

function makeParsedDetail(overrides: Partial<{ state: string }> = {}): import("@/lib/view-models/war").CurrentWarDetail {
  return {
    warId: 1,
    warType: "regular",
    state: (overrides.state ?? "preparation") as "preparation" | "inWar" | "warEnded",
    teamSize: 2,
    attacksPerMember: 2,
    startTime: new Date("2026-07-23T04:10:24.000Z"),
    endTime: new Date("2026-07-24T04:10:24.000Z"),
    preparationStartTime: new Date("2026-07-22T04:10:24.000Z"),
    lastSyncedAt: new Date("2026-07-22T12:00:00Z"),
    clan: {
      tag: "#CLAN", name: "Us", clanLevel: 11, badgeUrls: null,
      stars: 0, destructionPercentage: 0, attacks: 0, attacksRemaining: 4,
      members: [
        { tag: "#P1", name: "Alice", mapPosition: 1, townhallLevel: 17, attacksUsed: 0, attacksAllowed: 2, attacksRemaining: 2, bestStars: null, bestDestruction: null, defendedAgainst: 0, worstDefenseStars: null, worstDefenseDestruction: null, isOwnClan: true },
        { tag: "#P2", name: "Bob", mapPosition: 2, townhallLevel: 16, attacksUsed: 0, attacksAllowed: 2, attacksRemaining: 2, bestStars: null, bestDestruction: null, defendedAgainst: 0, worstDefenseStars: null, worstDefenseDestruction: null, isOwnClan: true },
      ],
    },
    opponent: {
      tag: "#OPP", name: "Them", clanLevel: 10, badgeUrls: null,
      stars: 0, destructionPercentage: 0, attacks: 0, attacksRemaining: 4,
      members: [
        { tag: "#E1", name: "Eve", mapPosition: 1, townhallLevel: 17, attacksUsed: 0, attacksAllowed: 2, attacksRemaining: 2, bestStars: null, bestDestruction: null, defendedAgainst: 0, worstDefenseStars: null, worstDefenseDestruction: null, isOwnClan: false },
        { tag: "#E2", name: "Eva", mapPosition: 2, townhallLevel: 16, attacksUsed: 0, attacksAllowed: 2, attacksRemaining: 2, bestStars: null, bestDestruction: null, defendedAgainst: 0, worstDefenseStars: null, worstDefenseDestruction: null, isOwnClan: false },
      ],
    },
  };
}
