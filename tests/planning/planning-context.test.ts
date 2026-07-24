import { describe, it, expect } from "vitest";
import { toPrepOpponentMember, type LineupSlot } from "@/lib/planning/types";
import { toPlanningMember } from "@/lib/planning/planning-context";
import type { MemberRosterEntry } from "@/lib/view-models/members";
import type { WarRosterMember } from "@/lib/view-models/war";

/**
 * Tests for the planning context derivation.
 *
 * The derivation functions are pure (DB-free), so they're unit-tested directly.
 * `minWarsForConfidentRanking` is read from clanConfig (= 3); the limited-data
 * flag derives from it.
 */

function makeEntry(over: Partial<MemberRosterEntry> = {}): MemberRosterEntry {
  return {
    playerTag: "#TAG1",
    name: "Test",
    role: "member",
    townHallLevel: 14,
    clanRank: 1,
    trophies: 5000,
    league: null,
    leagueTier: null,
    builderBaseTrophies: null,
    expLevel: 200,
    warPreference: "in",
    currentDonations: 100,
    currentDonationsReceived: 50,
    lastActiveAt: new Date("2026-07-23T10:00:00Z"),
    isActive: true,
    warsTracked: 5,
    warsMissed: 0,
    attacksUsed: 10,
    attacksAllowed: 10,
    rushedPercent: null,
    joinedAt: new Date("2026-01-01T00:00:00Z"),
    leftAt: null,
    isDeparted: false,
    ...over,
  };
}

describe("toPlanningMember", () => {
  it("maps all fields and serializes lastActiveAt to ISO string", () => {
    const m = toPlanningMember(makeEntry());
    expect(m.playerTag).toBe("#TAG1");
    expect(m.townHallLevel).toBe(14);
    expect(m.warPreference).toBe("in");
    expect(m.isActive).toBe(true);
    expect(m.lastActiveAt).toBe("2026-07-23T10:00:00.000Z");
    expect(m.warsTracked).toBe(5);
    expect(m.attacksUsed).toBe(10);
  });

  it("flags limitedData when warsTracked < minWarsForConfidentRanking (3)", () => {
    expect(toPlanningMember(makeEntry({ warsTracked: 0 })).limitedData).toBe(true);
    expect(toPlanningMember(makeEntry({ warsTracked: 2 })).limitedData).toBe(true);
    expect(toPlanningMember(makeEntry({ warsTracked: 3 })).limitedData).toBe(false);
    expect(toPlanningMember(makeEntry({ warsTracked: 10 })).limitedData).toBe(false);
  });

  it("handles null lastActiveAt (never active)", () => {
    const m = toPlanningMember(makeEntry({ lastActiveAt: null, isActive: false }));
    expect(m.lastActiveAt).toBeNull();
    expect(m.isActive).toBe(false);
  });

  it("preserves null warPreference", () => {
    const m = toPlanningMember(makeEntry({ warPreference: null }));
    expect(m.warPreference).toBeNull();
  });

  it("preserves null townHallLevel", () => {
    const m = toPlanningMember(makeEntry({ townHallLevel: null }));
    expect(m.townHallLevel).toBeNull();
  });
});

describe("toPrepOpponentMember", () => {
  it("trims WarRosterMember to scouting fields only", () => {
    const full: WarRosterMember = {
      tag: "#OPP1",
      name: "Enemy",
      mapPosition: 3,
      townhallLevel: 15,
      attacksUsed: 0,
      attacksAllowed: 0,
      attacksRemaining: 0,
      bestStars: null,
      bestDestruction: null,
      defendedAgainst: 0,
      worstDefenseStars: null,
      worstDefenseDestruction: null,
      isOwnClan: false,
    };
    const m = toPrepOpponentMember(full);
    expect(m).toEqual({
      tag: "#OPP1",
      name: "Enemy",
      mapPosition: 3,
      townhallLevel: 15,
    });
    // Attack/defense fields must not leak through.
    expect(m).not.toHaveProperty("attacksUsed");
    expect(m).not.toHaveProperty("defendedAgainst");
  });
});

/**
 * Slot-state sanity: the `LineupSlot` shape is what the planner mutates. These
 * aren't testing the component (which needs a React test env) — they document
 * the invariant the component relies on: positions are 1-indexed and unique.
 */
describe("LineupSlot invariant", () => {
  it("produces 1-indexed unique positions for a war size", () => {
    const slots: LineupSlot[] = Array.from({ length: 15 }, (_, i) => ({
      position: i + 1,
      playerTag: null,
    }));
    const positions = slots.map((s) => s.position);
    expect(positions[0]).toBe(1);
    expect(positions[positions.length - 1]).toBe(15);
    expect(new Set(positions).size).toBe(15);
  });
});
