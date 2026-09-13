import { describe, it, expect } from "vitest";
import {
  careerMoved,
  achievementsMoved,
  diffCareerProgress,
  type CareerCapture,
} from "@/lib/scoring/career-deltas";

/**
 * Tests for lib/scoring/career-deltas.ts (Phase 3.1 —
 * docs/2026-09-11-implementation-plan.md §3.1 + §1.5 item 7):
 *
 *   - careerMoved: day-grain activity evidence. Career totals only move on
 *     gameplay, so a rising total marks the day active. Deliberate exclusions:
 *     defenseWins (passive — rises when OTHER players lose attacks against the
 *     village) and expLevel (already interval-grain via member_snapshots).
 *   - diffCareerProgress: the member-detail "Progress (window)" diff —
 *     scalar deltas + per-achievement deltas, null-safe on missing baselines
 *     (no fabricated zeros: the window predating tracking is NOT zero
 *     progress).
 */

function capture(overrides?: {
  warStars?: number | null;
  attackWins?: number | null;
  defenseWins?: number | null;
  clanCapitalContributions?: number | null;
  expLevel?: number | null;
  achievements?: Array<{ name: string; value: number }>;
}): CareerCapture {
  // `?? ` fallbacks would swallow an EXPLICIT null — pick() only substitutes
  // the default when the field is absent (undefined).
  const pick = (v: number | null | undefined, d: number): number | null =>
    v === undefined ? d : v;
  return {
    scalars: {
      warStars: pick(overrides?.warStars, 100),
      attackWins: pick(overrides?.attackWins, 1000),
      defenseWins: pick(overrides?.defenseWins, 500),
      clanCapitalContributions: pick(overrides?.clanCapitalContributions, 10000),
      expLevel: pick(overrides?.expLevel, 180),
    },
    achievements: overrides?.achievements ?? [
      { name: "Keep Your Account Safe", value: 1 },
      { name: "Bigger Coffers", value: 8 },
    ],
  };
}

// ---------------------------------------------------------------------------
// careerMoved — day-grain activity evidence
// ---------------------------------------------------------------------------

describe("careerMoved", () => {
  it("is false for identical captures", () => {
    expect(careerMoved(capture(), capture())).toBe(false);
  });

  it("is false when either capture is missing (cold start / fetch failure)", () => {
    expect(careerMoved(null, capture())).toBe(false);
    expect(careerMoved(capture(), null)).toBe(false);
    expect(careerMoved(null, null)).toBe(false);
  });

  it("war stars rising marks the day active", () => {
    const prev = capture({ warStars: 100 });
    const cur = capture({ warStars: 103 });
    expect(careerMoved(prev, cur)).toBe(true);
  });

  it("attack wins rising marks the day active", () => {
    expect(careerMoved(capture({ attackWins: 10 }), capture({ attackWins: 11 }))).toBe(true);
  });

  it("clan capital contributions rising marks the day active", () => {
    expect(
      careerMoved(
        capture({ clanCapitalContributions: 500 }),
        capture({ clanCapitalContributions: 2500 }),
      ),
    ).toBe(true);
  });

  it("an achievement value rising marks the day active", () => {
    const prev = capture({ achievements: [{ name: "Gold Grab", value: 100 }] });
    const cur = capture({ achievements: [{ name: "Gold Grab", value: 101 }] });
    expect(careerMoved(prev, cur)).toBe(true);
  });

  it("defense wins rising does NOT mark the day (passive signal — no login needed)", () => {
    expect(careerMoved(capture({ defenseWins: 10 }), capture({ defenseWins: 15 }))).toBe(false);
  });

  it("XP level rising does NOT mark the day (already interval-grain via member_snapshots)", () => {
    expect(careerMoved(capture({ expLevel: 180 }), capture({ expLevel: 181 }))).toBe(false);
  });

  it("totals only DECREASING (API counter drift) does not mark the day", () => {
    const prev = capture({ warStars: 105, attackWins: 1200 });
    const cur = capture({ warStars: 100, attackWins: 1150 });
    expect(careerMoved(prev, cur)).toBe(false);
  });

  it("null-to-value transitions are not movement (absence is not zero)", () => {
    const prev = capture({ warStars: null });
    const cur = capture({ warStars: 50 });
    expect(careerMoved(prev, cur)).toBe(false);
  });
});

describe("achievementsMoved", () => {
  it("empty on either side is not movement", () => {
    expect(achievementsMoved([], [{ name: "A", value: 1 }])).toBe(false);
    expect(achievementsMoved([{ name: "A", value: 1 }], [])).toBe(false);
    expect(achievementsMoved([], [])).toBe(false);
  });

  it("an achievement only present on one side is not movement", () => {
    const prev = capture({ achievements: [{ name: "Old", value: 5 }] }).achievements;
    const cur = [{ name: "New Achievement", value: 99 }];
    expect(achievementsMoved(prev, cur)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// diffCareerProgress — the "Progress (window)" view
// ---------------------------------------------------------------------------

describe("diffCareerProgress", () => {
  it("returns all-null deltas when there is no baseline (window predates tracking)", () => {
    const diff = diffCareerProgress(null, capture());
    expect(diff.warStars).toBeNull();
    expect(diff.attackWins).toBeNull();
    expect(diff.defenseWins).toBeNull();
    expect(diff.clanCapitalContributions).toBeNull();
    expect(diff.expLevels).toBeNull();
    expect(diff.achievements).toEqual([]);
    expect(diff.noChange).toBe(true);
  });

  it("returns all-null deltas when the current side is missing", () => {
    const diff = diffCareerProgress(capture(), null);
    expect(diff.warStars).toBeNull();
    expect(diff.noChange).toBe(true);
  });

  it("computes scalar deltas from baseline to current", () => {
    const prev = capture({
      warStars: 100,
      attackWins: 1000,
      defenseWins: 500,
      clanCapitalContributions: 10000,
      expLevel: 180,
    });
    const cur = capture({
      warStars: 112,
      attackWins: 1034,
      defenseWins: 502,
      clanCapitalContributions: 12500,
      expLevel: 182,
    });
    const diff = diffCareerProgress(prev, cur);
    expect(diff.warStars).toBe(12);
    expect(diff.attackWins).toBe(34);
    expect(diff.defenseWins).toBe(2);
    expect(diff.clanCapitalContributions).toBe(2500);
    expect(diff.expLevels).toBe(2);
    expect(diff.noChange).toBe(false);
  });

  it("null scalars on either side yield null deltas (not fabricated zeros)", () => {
    const prev = capture({ warStars: null, attackWins: 10 });
    const cur = capture({ warStars: 5, attackWins: null });
    const diff = diffCareerProgress(prev, cur);
    expect(diff.warStars).toBeNull();
    expect(diff.attackWins).toBeNull();
  });

  it("lists rising achievements sorted by delta descending, with from/to", () => {
    const prev = capture({
      achievements: [
        { name: "Gold Grab", value: 1_000_000 },
        { name: "Friend in Need", value: 5000 },
        { name: "Spoils of War", value: 100 },
      ],
    });
    const cur = capture({
      achievements: [
        { name: "Gold Grab", value: 1_150_000 },
        { name: "Friend in Need", value: 5050 },
        { name: "Spoils of War", value: 100 }, // unchanged — excluded
      ],
    });
    const diff = diffCareerProgress(prev, cur);
    expect(diff.achievements).toHaveLength(2);
    expect(diff.achievements[0]?.name).toBe("Gold Grab");
    expect(diff.achievements[0]?.delta).toBe(150_000);
    expect(diff.achievements[0]?.from).toBe(1_000_000);
    expect(diff.achievements[0]?.to).toBe(1_150_000);
    expect(diff.achievements[1]?.name).toBe("Friend in Need");
    expect(diff.achievements[1]?.delta).toBe(50);
  });

  it("achievements that DECREASED are excluded (counter drift is not negative progress)", () => {
    const prev = capture({ achievements: [{ name: "Drifty", value: 100 }] });
    const cur = capture({ achievements: [{ name: "Drifty", value: 90 }] });
    const diff = diffCareerProgress(prev, cur);
    expect(diff.achievements).toEqual([]);
  });

  it("identical captures report noChange", () => {
    const diff = diffCareerProgress(capture(), capture());
    expect(diff.noChange).toBe(true);
    expect(diff.achievements).toEqual([]);
  });

  it("ties on delta are sorted by name for stable rendering", () => {
    const prev = capture({
      achievements: [
        { name: "Zeta", value: 1 },
        { name: "Alpha", value: 1 },
      ],
    });
    const cur = capture({
      achievements: [
        { name: "Zeta", value: 3 },
        { name: "Alpha", value: 3 },
      ],
    });
    const diff = diffCareerProgress(prev, cur);
    expect(diff.achievements.map((a) => a.name)).toEqual(["Alpha", "Zeta"]);
  });
});
