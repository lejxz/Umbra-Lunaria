import { describe, it, expect } from "vitest";
import { getWarRecord } from "@/lib/scoring/war-record";
import type { DashboardClan } from "@/lib/view-models/dashboard";

/**
 * Tests for the pure `getWarRecord` view-model assembler.
 *
 * `getWarRecord` is extracted from lib/db/queries.ts into
 * lib/scoring/war-record.ts so it can be unit-tested without a DATABASE_URL.
 * (queries.ts re-exports it for API stability — see the comment there.)
 *
 * The function takes a `DashboardClan | null` and returns a `WarRecordView`,
 * passing wins/ties/losses/winStreak through and deriving `winRate` via
 * `computeWinRate` (which respects the "never fake a zero" rule — null when
 * any input is null or the denominator is 0).
 */

// Helper: build a DashboardClan with only the war-record-relevant fields
// populated. Other fields default to null — getWarRecord only reads
// warWins / warTies / warLosses / warWinStreak.
function clanWith(
  overrides: Partial<
    Pick<DashboardClan, "warWins" | "warTies" | "warLosses" | "warWinStreak">
  >,
): DashboardClan {
  return {
    tag: "#CLAN",
    name: "TestClan",
    description: null,
    type: null,
    isFamilyFriendly: null,
    badgeUrls: null,
    clanLevel: null,
    memberCount: null,
    clanPoints: null,
    clanCapitalPoints: null,
    location: null,
    chatLanguage: null,
    labels: null,
    warFrequency: null,
    warLeague: null,
    capitalLeague: null,
    requiredTrophies: null,
    requiredTownhallLevel: null,
    warWins: null,
    warTies: null,
    warLosses: null,
    warWinStreak: null,
    isWarLogPublic: null,
    capitalHallLevel: null,
    lastPolledAt: null,
    lastDailyBatchAt: null,
    ...overrides,
  };
}

describe("getWarRecord", () => {
  it("returns all-null fields (including winRate) when clan is null", () => {
    const result = getWarRecord(null);

    expect(result.wins).toBeNull();
    expect(result.ties).toBeNull();
    expect(result.losses).toBeNull();
    expect(result.winStreak).toBeNull();
    expect(result.winRate).toBeNull();
  });

  it("passes wins/ties/losses/winStreak through and computes winRate ≈ 0.386 for 22/1/34", () => {
    // 22 wins, 1 tie, 34 losses → 22 / 57 ≈ 0.386
    const result = getWarRecord(
      clanWith({
        warWins: 22,
        warTies: 1,
        warLosses: 34,
        warWinStreak: 3,
      }),
    );

    expect(result.wins).toBe(22);
    expect(result.ties).toBe(1);
    expect(result.losses).toBe(34);
    expect(result.winStreak).toBe(3);
    expect(result.winRate).not.toBeNull();
    expect(result.winRate as number).toBeCloseTo(22 / 57, 5);
  });

  it("returns null winRate when warWins is null (private war log / missing API field)", () => {
    const result = getWarRecord(
      clanWith({
        warWins: null,
        warTies: 1,
        warLosses: 34,
        warWinStreak: 3,
      }),
    );

    // Pass-through fields are preserved.
    expect(result.wins).toBeNull();
    expect(result.ties).toBe(1);
    expect(result.losses).toBe(34);
    expect(result.winStreak).toBe(3);
    // ...but the derived winRate is null because wins is null.
    expect(result.winRate).toBeNull();
  });

  it("returns null winRate when warTies is null", () => {
    const result = getWarRecord(
      clanWith({ warWins: 22, warTies: null, warLosses: 34 }),
    );
    expect(result.ties).toBeNull();
    expect(result.winRate).toBeNull();
  });

  it("returns null winRate when warLosses is null", () => {
    const result = getWarRecord(
      clanWith({ warWins: 22, warTies: 1, warLosses: null }),
    );
    expect(result.losses).toBeNull();
    expect(result.winRate).toBeNull();
  });

  it("returns null winRate for 0/0/0 (no wars recorded yet — denominator 0)", () => {
    const result = getWarRecord(
      clanWith({
        warWins: 0,
        warTies: 0,
        warLosses: 0,
        warWinStreak: 0,
      }),
    );

    // The API has explicitly reported 0 for all three fields — they pass
    // through as 0, but winRate stays null (never fake a zero).
    expect(result.wins).toBe(0);
    expect(result.ties).toBe(0);
    expect(result.losses).toBe(0);
    expect(result.winStreak).toBe(0);
    expect(result.winRate).toBeNull();
  });

  it("returns winRate 1.0 when the clan has only wins", () => {
    const result = getWarRecord(
      clanWith({ warWins: 10, warTies: 0, warLosses: 0, warWinStreak: 5 }),
    );

    expect(result.winRate).not.toBeNull();
    expect(result.winRate as number).toBeCloseTo(1.0, 5);
  });

  it("returns winRate 0.0 when the clan has only losses", () => {
    const result = getWarRecord(
      clanWith({ warWins: 0, warTies: 0, warLosses: 10 }),
    );

    expect(result.winRate).toBe(0);
  });

  it("preserves winStreak independently of the winRate computation", () => {
    // winStreak is a pass-through, not a derived field — it should be
    // surfaced even when winRate can't be computed.
    const result = getWarRecord(
      clanWith({ warWins: null, warTies: null, warLosses: null, warWinStreak: 7 }),
    );

    expect(result.winStreak).toBe(7);
    expect(result.winRate).toBeNull();
  });
});
