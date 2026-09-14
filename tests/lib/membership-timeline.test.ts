import { describe, expect, it } from "vitest";
import {
  buildMembershipTimeline,
  dayKeyRange,
  labelForDayKey,
  nextDayKey,
  type MembershipEventRow,
} from "@/lib/scoring/membership-timeline";

/**
 * Phase 4 / F10 — the membership-timeline aggregation math.
 * (docs/2026-09-11-implementation-plan.md §"Phase 4 — Clan history timeline")
 *
 * The SQL grouping (day × event_type) and the chart are thin wrappers around
 * buildMembershipTimeline, so these tests pin the semantics the panel relies
 * on: zero-filled contiguous days, stacked-bar counts per event type, the
 * capital-contribution density overlay, and window totals.
 */

function row(
  dayKey: string,
  eventType: string,
  count: number,
  contributors = count,
  amount: number | null = null,
): MembershipEventRow {
  return { dayKey, eventType, count, contributors, amount };
}

describe("nextDayKey", () => {
  it("rolls within a month", () => {
    expect(nextDayKey("2026-07-22")).toBe("2026-07-23");
  });

  it("rolls over month ends (28/30/31-day months, leap Feb)", () => {
    expect(nextDayKey("2026-01-31")).toBe("2026-02-01");
    expect(nextDayKey("2026-04-30")).toBe("2026-05-01");
    expect(nextDayKey("2026-12-31")).toBe("2027-01-01");
    expect(nextDayKey("2028-02-28")).toBe("2028-02-29"); // leap year
    expect(nextDayKey("2026-02-28")).toBe("2026-03-01"); // non-leap
  });

  it("pads month/day to two digits", () => {
    expect(nextDayKey("2026-09-09")).toBe("2026-09-10");
  });
});

describe("dayKeyRange", () => {
  it("returns every inclusive day, oldest-first", () => {
    expect(dayKeyRange("2026-07-30", "2026-08-02")).toEqual([
      "2026-07-30",
      "2026-07-31",
      "2026-08-01",
      "2026-08-02",
    ]);
  });

  it("returns a single day for an empty span", () => {
    expect(dayKeyRange("2026-07-22", "2026-07-22")).toEqual(["2026-07-22"]);
  });

  it("yields nothing for an inverted range", () => {
    expect(dayKeyRange("2026-07-23", "2026-07-22")).toEqual([]);
  });
});

describe("labelForDayKey", () => {
  it("formats as 'Mon d'", () => {
    expect(labelForDayKey("2026-07-04")).toBe("Jul 4");
    expect(labelForDayKey("2026-12-25")).toBe("Dec 25");
  });
});

describe("buildMembershipTimeline", () => {
  it("zero-fills every day in the range, merging per-type rows", () => {
    const { points, totals } = buildMembershipTimeline(
      [
        row("2026-07-22", "join", 2),
        row("2026-07-22", "leave", 1),
        row("2026-07-24", "thUpgrade", 1),
      ],
      { fromDay: "2026-07-22", toDay: "2026-07-24" },
    );

    expect(points).toHaveLength(3);
    expect(points[0]).toMatchObject({
      day: "2026-07-22",
      label: "Jul 22",
      join: 2,
      leave: 1,
      rejoin: 0,
      thUpgrade: 0,
      rename: 0,
      capitalContributors: 0,
      capitalAmount: 0,
    });
    // Gap day renders as an all-zero point — honest calendar spacing.
    expect(points[1]).toMatchObject({
      day: "2026-07-23",
      join: 0,
      leave: 0,
    });
    expect(points[2]).toMatchObject({ day: "2026-07-24", thUpgrade: 1 });

    expect(totals).toMatchObject({
      join: 2,
      leave: 1,
      thUpgrade: 1,
      netRosterChange: 1, // 2 joins − 1 leave
    });
  });

  it("aggregates multiple rows of the same type on the same day", () => {
    const { points } = buildMembershipTimeline(
      [
        row("2026-07-22", "rename", 2),
        row("2026-07-22", "rename", 1),
      ],
      { fromDay: "2026-07-22", toDay: "2026-07-22" },
    );
    expect(points[0]!.rename).toBe(3);
  });

  it("feeds capitalContribution rows into the density overlay, not the bars", () => {
    const { points, totals } = buildMembershipTimeline(
      [
        row("2026-07-22", "join", 1),
        // 3 contributors moved 45,000 gold that day (one grouped row).
        row("2026-07-22", "capitalContribution", 3, 3, 45000),
        row("2026-07-23", "capitalContribution", 2, 2, 12000),
      ],
      { fromDay: "2026-07-22", toDay: "2026-07-23" },
    );

    // Bar counts stay zero — capitalContribution never stacks into them.
    expect(points[0]).toMatchObject({
      join: 1,
      leave: 0,
      capitalContributors: 3,
      capitalAmount: 45000,
    });
    expect(points[1]).toMatchObject({
      capitalContributors: 2,
      capitalAmount: 12000,
    });
    expect(totals.capitalContributors).toBe(5); // summed contributors
    // Net roster change counts ONLY membership events.
    expect(totals.netRosterChange).toBe(1);
  });

  it("treats a null capital amount as 0", () => {
    const { points } = buildMembershipTimeline(
      [row("2026-07-22", "capitalContribution", 1, 1, null)],
      { fromDay: "2026-07-22", toDay: "2026-07-22" },
    );
    expect(points[0]).toMatchObject({
      capitalContributors: 1,
      capitalAmount: 0,
    });
  });

  it("ignores unknown event types for bars but keeps them out of totals", () => {
    const { points, totals } = buildMembershipTimeline(
      [row("2026-07-22", "someFutureType", 5)],
      { fromDay: "2026-07-22", toDay: "2026-07-22" },
    );
    expect(points).toHaveLength(1);
    expect(points[0]!.join).toBe(0);
    expect(totals.join).toBe(0);
    expect(totals.netRosterChange).toBe(0);
  });

  it("drops malformed day keys instead of throwing", () => {
    const { points } = buildMembershipTimeline(
      [row("not-a-day", "join", 1), row("2026-07-22", "join", 1)],
      { fromDay: "2026-07-22", toDay: "2026-07-22" },
    );
    expect(points).toHaveLength(1);
    expect(points[0]!.join).toBe(1);
  });

  it("computes netRosterChange from joins + rejoins − leaves", () => {
    const { totals } = buildMembershipTimeline(
      [
        row("2026-07-22", "join", 3),
        row("2026-07-23", "rejoin", 2),
        row("2026-07-24", "leave", 4),
      ],
      { fromDay: "2026-07-22", toDay: "2026-07-24" },
    );
    expect(totals.netRosterChange).toBe(3 + 2 - 4); // +1
  });

  it("returns zero points for an inverted range (caller renders empty state)", () => {
    const { points, totals } = buildMembershipTimeline(
      [row("2026-07-22", "join", 1)],
      { fromDay: "2026-07-23", toDay: "2026-07-22" },
    );
    expect(points).toEqual([]);
    expect(totals.join).toBe(1); // totals still reflect the observed rows
  });

  it("handles an empty row set with a full zero-filled range", () => {
    const { points, totals } = buildMembershipTimeline([], {
      fromDay: "2026-07-22",
      toDay: "2026-07-24",
    });
    expect(points).toHaveLength(3);
    expect(points.every((p) => p.join === 0 && p.capitalContributors === 0)).toBe(
      true,
    );
    expect(totals.netRosterChange).toBe(0);
  });
});
