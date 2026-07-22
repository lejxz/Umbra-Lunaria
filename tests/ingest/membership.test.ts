import { describe, it, expect } from "vitest";
import {
  reconcileMembership,
  computeActivityFlags,
  type KnownMember,
  type LiveMember,
  type PriorSnapshot,
} from "@/lib/ingest/membership";

/**
 * Tests for the pure membership-reconciliation logic extracted from the ingest
 * route (concept/12 Step 1.0.D — "Add unit tests for member rejoin, departure,
 * retention, failed-poll safety, war lifecycle, and duplicate-attack
 * protection"). See tests/README.md for the test strategy.
 */

const NOW = new Date("2026-07-22T12:00:00Z");
const RETENTION_DAYS = 14;

function live(tag: string, name: string): LiveMember {
  return { tag, name };
}

function known(tag: string, name: string, leftAt: Date | null): KnownMember {
  return { playerTag: tag, name, leftAt };
}

describe("reconcileMembership — joins", () => {
  it("marks a live tag not in known as a join", () => {
    const result = reconcileMembership(
      [live("#A", "Alice")],
      [],
      NOW,
      RETENTION_DAYS,
    );
    expect(result.events.joins).toBe(1);
    expect(result.events.leaves).toBe(0);
    expect(result.events.rejoins).toBe(0);
    expect(result.operations).toEqual([
      { type: "join", tag: "#A", name: "Alice" },
    ]);
  });

  it("marks multiple new live tags as joins", () => {
    const result = reconcileMembership(
      [live("#A", "Alice"), live("#B", "Bob"), live("#C", "Carol")],
      [],
      NOW,
      RETENTION_DAYS,
    );
    expect(result.events.joins).toBe(3);
  });
});

describe("reconcileMembership — rejoins", () => {
  it("marks a live tag with leftAt set as a rejoin", () => {
    const result = reconcileMembership(
      [live("#A", "Alice")],
      [known("#A", "Alice", new Date("2026-07-20T00:00:00Z"))],
      NOW,
      RETENTION_DAYS,
    );
    expect(result.events.rejoins).toBe(1);
    expect(result.operations).toContainEqual({
      type: "rejoin",
      tag: "#A",
      name: "Alice",
    });
  });

  it("does not mark a retained member (no leftAt) as a rejoin", () => {
    const result = reconcileMembership(
      [live("#A", "Alice")],
      [known("#A", "Alice", null)],
      NOW,
      RETENTION_DAYS,
    );
    expect(result.events.rejoins).toBe(0);
    expect(result.operations).toContainEqual({ type: "refresh", tag: "#A" });
  });
});

describe("reconcileMembership — leaves", () => {
  it("marks a retained known member missing from live as a leave", () => {
    const result = reconcileMembership(
      [],
      [known("#A", "Alice", null)],
      NOW,
      RETENTION_DAYS,
    );
    expect(result.events.leaves).toBe(1);
    const leaveOp = result.operations.find((o) => o.type === "leave");
    expect(leaveOp).toBeDefined();
    expect(leaveOp!.type === "leave" && leaveOp!.tag).toBe("#A");
  });

  it("sets purgeAt to capturedAt + retentionDays", () => {
    const result = reconcileMembership(
      [],
      [known("#A", "Alice", null)],
      NOW,
      RETENTION_DAYS,
    );
    const leaveOp = result.operations.find(
      (o): o is Extract<typeof o, { type: "leave" }> => o.type === "leave",
    );
    expect(leaveOp).toBeDefined();
    const expectedPurge = new Date(NOW);
    expectedPurge.setDate(expectedPurge.getDate() + RETENTION_DAYS);
    expect(leaveOp!.purgeAt).toEqual(expectedPurge);
  });

  it("does NOT mark an already-departed member (leftAt set) as a leave", () => {
    const result = reconcileMembership(
      [],
      [known("#A", "Alice", new Date("2026-07-15T00:00:00Z"))],
      NOW,
      RETENTION_DAYS,
    );
    expect(result.events.leaves).toBe(0);
  });
});

describe("reconcileMembership — mixed scenarios", () => {
  it("handles join + rejoin + refresh + leave in one poll", () => {
    const liveMembers = [
      live("#NEW", "Newman"), // join
      live("#REJOIN", "Reina"), // rejoin (was departed)
      live("#STAY", "Stacy"), // refresh (retained, still here)
    ];
    const knownMembers = [
      known("#REJOIN", "Reina", new Date("2026-07-20T00:00:00Z")),
      known("#STAY", "Stacy", null),
      known("#LEAVE", "Leroy", null), // leave (retained, missing from live)
    ];
    const result = reconcileMembership(
      liveMembers,
      knownMembers,
      NOW,
      RETENTION_DAYS,
    );
    expect(result.events).toEqual({ joins: 1, rejoins: 1, leaves: 1 });
    const types = result.operations.map((o) => o.type);
    expect(types).toContain("join");
    expect(types).toContain("rejoin");
    expect(types).toContain("refresh");
    expect(types).toContain("leave");
  });

  it("empty live + empty known = no operations", () => {
    const result = reconcileMembership([], [], NOW, RETENTION_DAYS);
    expect(result.operations).toEqual([]);
    expect(result.events).toEqual({ joins: 0, leaves: 0, rejoins: 0 });
  });

  it("all retained members leave when live is empty (failed-poll caveat)", () => {
    // This is the CORRECT behavior when the poll genuinely returned an empty
    // roster. Failed-poll safety (concept/04 #3) is enforced at the route
    // level — the route never calls reconcileMembership when the clan fetch
    // fails. This test confirms the pure function faithfully reports leaves
    // for every retained member when live is empty.
    const result = reconcileMembership(
      [],
      [known("#A", "Alice", null), known("#B", "Bob", null)],
      NOW,
      RETENTION_DAYS,
    );
    expect(result.events.leaves).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// computeActivityFlags
// ---------------------------------------------------------------------------

describe("computeActivityFlags — first poll (no prior snapshot)", () => {
  it("returns false for both flags when lastSnapshot is null", () => {
    const flags = computeActivityFlags(
      { donations: 100, donationsReceived: 50, trophies: 3000 },
      null,
    );
    expect(flags.activityFlag).toBe(false);
    expect(flags.loginDayFlag).toBe(false);
  });
});

describe("computeActivityFlags — donation increases", () => {
  const prev: PriorSnapshot = {
    donations: 100,
    donationsReceived: 50,
    trophies: 3000,
    builderBaseTrophies: 2000,
  };

  it("flags activity + login when donations given increased", () => {
    const flags = computeActivityFlags(
      { donations: 150, donationsReceived: 50, trophies: 3000, builderBaseTrophies: 2000 },
      prev,
    );
    expect(flags.activityFlag).toBe(true);
    expect(flags.loginDayFlag).toBe(true);
  });

  it("flags activity + login when donations received increased", () => {
    const flags = computeActivityFlags(
      { donations: 100, donationsReceived: 80, trophies: 3000, builderBaseTrophies: 2000 },
      prev,
    );
    expect(flags.activityFlag).toBe(true);
    expect(flags.loginDayFlag).toBe(true);
  });

  it("does NOT flag login when only trophies changed (no donation delta)", () => {
    const flags = computeActivityFlags(
      { donations: 100, donationsReceived: 50, trophies: 3100, builderBaseTrophies: 2000 },
      prev,
    );
    expect(flags.activityFlag).toBe(true);
    expect(flags.loginDayFlag).toBe(false);
  });

  it("does NOT flag login on a counter reset alone (donations dropped)", () => {
    // Weekly reset: donations went 100 → 4. This is NOT a login — the reset
    // itself doesn't prove activity. concept/04: "A weekly counter reset
    // alone does not count as a login."
    const flags = computeActivityFlags(
      { donations: 4, donationsReceived: 50, trophies: 3000, builderBaseTrophies: 2000 },
      prev,
    );
    expect(flags.loginDayFlag).toBe(false);
    // But trophies/BB trophies unchanged, donations dropped, received same →
    // no activity evidence at all.
    expect(flags.activityFlag).toBe(false);
  });
});

describe("computeActivityFlags — Builder Base trophies", () => {
  const prev: PriorSnapshot = {
    donations: 100,
    donationsReceived: 50,
    trophies: 3000,
    builderBaseTrophies: 2000,
  };

  it("flags activity (not login) when only BB trophies changed", () => {
    const flags = computeActivityFlags(
      { donations: 100, donationsReceived: 50, trophies: 3000, builderBaseTrophies: 2100 },
      prev,
    );
    expect(flags.activityFlag).toBe(true);
    expect(flags.loginDayFlag).toBe(false);
  });

  it("does not flag when BB trophies are null in current", () => {
    const flags = computeActivityFlags(
      { donations: 100, donationsReceived: 50, trophies: 3000, builderBaseTrophies: null },
      prev,
    );
    expect(flags.activityFlag).toBe(false);
  });
});
