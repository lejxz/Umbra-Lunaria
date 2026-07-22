import { describe, it, expect } from "vitest";
import { computeWinRate } from "@/lib/scoring/war-metrics";

/**
 * Edge-case tests for `computeWinRate` (lib/scoring/war-metrics.ts).
 *
 * The core contract — null when any input is null, null when the denominator
 * is 0, wins/(wins+ties+losses) otherwise — is already pinned in
 * tests/lib/activity-score.test.ts. These tests cover the edge cases that
 * aren't exercised there:
 *
 *   - very large win/loss counts (no overflow / precision loss)
 *   - the 0/0/0 → null rule, re-pinned here so this file is self-contained
 *     when run in isolation
 *   - the documented "negative inputs should not occur" contract — pinned so
 *     a future "add validation" change is a deliberate, tested decision
 *     rather than an accidental behavior shift
 */

describe("computeWinRate — edge cases", () => {
  it("returns null when all three inputs are 0 (denominator 0)", () => {
    expect(computeWinRate(0, 0, 0)).toBeNull();
  });

  it("handles very large win/loss counts without precision loss", () => {
    // 1_000_000 wins, 1 tie, 999_999 losses → 1_000_000 / 2_000_000 = 0.5
    const rate = computeWinRate(1_000_000, 1, 999_999);
    expect(rate).not.toBeNull();
    expect(rate as number).toBeCloseTo(0.5, 10);
  });

  it("returns 1.0 for a billion wins with no ties or losses", () => {
    const rate = computeWinRate(1_000_000_000, 0, 0);
    expect(rate).not.toBeNull();
    expect(rate as number).toBeCloseTo(1.0, 10);
  });

  it("does not validate against negative inputs (out-of-contract caller)", () => {
    // The function does not defensively reject negative inputs — the caller
    // is responsible for only passing non-negative integers from the CoC API.
    // This test pins the current "no validation" behavior so a future change
    // to add validation is intentional and visible in the diff.
    //
    // -5 / (-5 + 0 + -5) = -5 / -10 = 0.5
    expect(computeWinRate(-5, 0, -5)).toBeCloseTo(0.5, 5);
  });
});
