import { describe, it, expect } from "vitest";
import {
  diffDistrictSnapshots,
  type DistrictSnapshotRow,
} from "@/lib/capital/district-diff";

/**
 * Tests for the pure district-upgrade diff logic (concept/12 Step 1.5 —
 * "Test no snapshot, one snapshot, and level-increase timeline states").
 * See tests/README.md for the test strategy.
 */

const ts = (iso: string) => new Date(iso);

function row(name: string, level: number, capturedAt: string): DistrictSnapshotRow {
  return { districtName: name, districtHallLevel: level, capturedAt: ts(capturedAt) };
}

describe("diffDistrictSnapshots — no snapshots (cold start)", () => {
  it("returns no events for an empty array", () => {
    expect(diffDistrictSnapshots([])).toEqual([]);
  });
});

describe("diffDistrictSnapshots — one snapshot (no diff possible)", () => {
  it("returns no events when there is only one snapshot per district", () => {
    const snapshots = [
      row("Barbarian Camp", 4, "2026-07-22T00:00:00Z"),
      row("Wizard Valley", 4, "2026-07-22T00:00:00Z"),
    ];
    expect(diffDistrictSnapshots(snapshots)).toEqual([]);
  });
});

describe("diffDistrictSnapshots — level increases", () => {
  it("emits an event when a district's level increases between two snapshots", () => {
    const snapshots = [
      row("Barbarian Camp", 3, "2026-07-20T00:00:00Z"),
      row("Barbarian Camp", 4, "2026-07-21T00:00:00Z"),
    ];
    const events = diffDistrictSnapshots(snapshots);
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({
      districtName: "Barbarian Camp",
      fromLevel: 3,
      toLevel: 4,
      observedAt: ts("2026-07-21T00:00:00Z"),
    });
  });

  it("emits multiple events for multi-level increases across several snapshots", () => {
    const snapshots = [
      row("Dragon Cliffs", 1, "2026-07-20T00:00:00Z"),
      row("Dragon Cliffs", 2, "2026-07-21T00:00:00Z"),
      row("Dragon Cliffs", 3, "2026-07-22T00:00:00Z"),
    ];
    const events = diffDistrictSnapshots(snapshots);
    expect(events).toHaveLength(2);
    expect(events[0]!.toLevel).toBe(3); // newest-first
    expect(events[1]!.toLevel).toBe(2);
  });

  it("handles multiple districts interleaved in the input", () => {
    const snapshots = [
      row("Barbarian Camp", 3, "2026-07-20T00:00:00Z"),
      row("Wizard Valley", 4, "2026-07-20T00:00:00Z"),
      row("Barbarian Camp", 4, "2026-07-21T00:00:00Z"),
      row("Wizard Valley", 5, "2026-07-21T00:00:00Z"),
    ];
    const events = diffDistrictSnapshots(snapshots);
    expect(events).toHaveLength(2);
    const names = events.map((e) => e.districtName).sort();
    expect(names).toEqual(["Barbarian Camp", "Wizard Valley"]);
  });

  it("sorts events newest-first", () => {
    const snapshots = [
      row("A", 1, "2026-07-20T00:00:00Z"),
      row("A", 2, "2026-07-21T00:00:00Z"),
      row("B", 1, "2026-07-22T00:00:00Z"),
      row("B", 2, "2026-07-23T00:00:00Z"),
    ];
    const events = diffDistrictSnapshots(snapshots);
    expect(events[0]!.observedAt).toEqual(ts("2026-07-23T00:00:00Z"));
    expect(events[1]!.observedAt).toEqual(ts("2026-07-21T00:00:00Z"));
  });
});

describe("diffDistrictSnapshots — no-change and decreases", () => {
  it("does not emit an event when the level is unchanged", () => {
    const snapshots = [
      row("Barbarian Camp", 4, "2026-07-20T00:00:00Z"),
      row("Barbarian Camp", 4, "2026-07-21T00:00:00Z"),
    ];
    expect(diffDistrictSnapshots(snapshots)).toEqual([]);
  });

  it("does not emit an event when the level decreases (data correction / API quirk)", () => {
    const snapshots = [
      row("Barbarian Camp", 5, "2026-07-20T00:00:00Z"),
      row("Barbarian Camp", 4, "2026-07-21T00:00:00Z"), // decrease — not an upgrade
    ];
    expect(diffDistrictSnapshots(snapshots)).toEqual([]);
  });

  it("emits an event only for the increasing pair, not the decreasing pair", () => {
    const snapshots = [
      row("A", 3, "2026-07-20T00:00:00Z"),
      row("A", 5, "2026-07-21T00:00:00Z"), // increase → event
      row("A", 4, "2026-07-22T00:00:00Z"), // decrease → no event
      row("A", 6, "2026-07-23T00:00:00Z"), // increase → event
    ];
    const events = diffDistrictSnapshots(snapshots);
    expect(events).toHaveLength(2);
    expect(events[0]!.toLevel).toBe(6); // newest-first
    expect(events[0]!.fromLevel).toBe(4);
    expect(events[1]!.toLevel).toBe(5);
    expect(events[1]!.fromLevel).toBe(3);
  });
});

describe("diffDistrictSnapshots — unsorted input", () => {
  it("sorts each district's snapshots internally regardless of input order", () => {
    // Input is reverse-chronological; the diff should still produce the right
    // event dated at the later snapshot.
    const snapshots = [
      row("A", 4, "2026-07-21T00:00:00Z"),
      row("A", 3, "2026-07-20T00:00:00Z"),
    ];
    const events = diffDistrictSnapshots(snapshots);
    expect(events).toHaveLength(1);
    expect(events[0]!.fromLevel).toBe(3);
    expect(events[0]!.toLevel).toBe(4);
    expect(events[0]!.observedAt).toEqual(ts("2026-07-21T00:00:00Z"));
  });
});
