import { describe, it, expect } from "vitest";
import {
  matchExistingWar,
  type ExistingWarRow,
} from "@/lib/ingest/war-identity";

/**
 * Tests for the pure war-identity-matching logic extracted from
 * `syncCurrentWar` (concept/12 Step 1.0.D — "duplicate-attack protection" and
 * "war lifecycle" idempotency). See tests/README.md for the test strategy.
 *
 * The identity rule makes war sync idempotent across preparation → inWar →
 * warEnded transitions: CWL matches on `war_tag`, regular matches on
 * (opponent_tag + start_time). Duplicate attacks are enforced by the DB
 * unique index; this function only handles war-row identity.
 */

const START = new Date("2026-07-23T04:10:24.000Z");

function row(
  overrides: Partial<ExistingWarRow> = {},
): ExistingWarRow {
  return {
    id: 1,
    warTag: null,
    opponentTag: "#OPP",
    startTime: START,
    ...overrides,
  };
}

describe("matchExistingWar — CWL (warTag provided)", () => {
  it("matches on war_tag when warTag is provided", () => {
    const wars = [row({ id: 5, warTag: "#CWL001" })];
    const match = matchExistingWar(wars, { startTime: null }, "#CWL001");
    expect(match?.id).toBe(5);
  });

  it("returns undefined when no war has the matching warTag", () => {
    const wars = [row({ id: 5, warTag: "#CWL002" })];
    const match = matchExistingWar(wars, { startTime: null }, "#CWL001");
    expect(match).toBeUndefined();
  });

  it("ignores opponent_tag + startTime when matching CWL", () => {
    // CWL identity is war_tag alone — even if startTime differs, a matching
    // war_tag is the same war.
    const wars = [
      row({ id: 5, warTag: "#CWL001", opponentTag: "#DIFFERENT", startTime: new Date("2026-01-01") }),
    ];
    const match = matchExistingWar(
      wars,
      { opponentTag: "#OPP", startTime: START },
      "#CWL001",
    );
    expect(match?.id).toBe(5);
  });
});

describe("matchExistingWar — regular (no warTag)", () => {
  it("matches on (opponent_tag + start_time)", () => {
    const wars = [row({ id: 7 })];
    const match = matchExistingWar(
      wars,
      { opponentTag: "#OPP", startTime: START },
    );
    expect(match?.id).toBe(7);
  });

  it("returns undefined when opponent_tag differs", () => {
    const wars = [row({ id: 7, opponentTag: "#OTHER" })];
    const match = matchExistingWar(
      wars,
      { opponentTag: "#OPP", startTime: START },
    );
    expect(match).toBeUndefined();
  });

  it("returns undefined when start_time differs", () => {
    const wars = [row({ id: 7, startTime: new Date("2026-01-01T00:00:00Z") })];
    const match = matchExistingWar(
      wars,
      { opponentTag: "#OPP", startTime: START },
    );
    expect(match).toBeUndefined();
  });

  it("returns undefined when currentWar has no opponent_tag", () => {
    const wars = [row({ id: 7 })];
    const match = matchExistingWar(
      wars,
      { opponentTag: undefined, startTime: START },
    );
    expect(match).toBeUndefined();
  });

  it("returns undefined when currentWar has no startTime", () => {
    const wars = [row({ id: 7 })];
    const match = matchExistingWar(
      wars,
      { opponentTag: "#OPP", startTime: null },
    );
    expect(match).toBeUndefined();
  });

  it("returns undefined when existing war has null startTime", () => {
    const wars = [row({ id: 7, startTime: null })];
    const match = matchExistingWar(
      wars,
      { opponentTag: "#OPP", startTime: START },
    );
    expect(match).toBeUndefined();
  });
});

describe("matchExistingWar — empty candidates", () => {
  it("returns undefined when the candidate list is empty", () => {
    const match = matchExistingWar(
      [],
      { opponentTag: "#OPP", startTime: START },
    );
    expect(match).toBeUndefined();
  });

  it("returns undefined for CWL when the candidate list is empty", () => {
    const match = matchExistingWar([], { startTime: null }, "#CWL001");
    expect(match).toBeUndefined();
  });
});

describe("matchExistingWar — idempotency across state transitions", () => {
  it("matches the same war row across preparation → inWar → warEnded", () => {
    // The same war row (id=1) persists; only the state column changes.
    // Identity matching should find it on every poll.
    const war = row({ id: 1, warTag: null, opponentTag: "#OPP", startTime: START });
    // Run the match 3× to represent the 3 state transitions — the identity
    // (opponent_tag + start_time) doesn't change, so the match is stable.
    for (let i = 0; i < 3; i++) {
      const match = matchExistingWar(
        [war],
        { opponentTag: "#OPP", startTime: START },
      );
      expect(match?.id).toBe(1);
    }
  });
});
