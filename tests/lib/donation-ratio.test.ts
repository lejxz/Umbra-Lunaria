/**
 * Phase 2.2 unit tests — the donation-ratio "needs attention" category's pure
 * logic (lib/scoring/donation-ratio.ts).
 *
 * The category itself is wired in getNeedsAttention (lib/db/queries.ts) using
 * reset-aware per-member window totals; these tests pin the threshold
 * decision, the settings parsing (runtime_settings is an untrusted JSONB
 * value), and the detail-string formatting so the queue's semantics can't
 * drift silently.
 *
 * See tests/README.md for the "mocked query boundary" strategy — pure logic
 * in lib/, tested here; DB reads tested nowhere (they're thin Drizzle calls).
 */

import { describe, expect, it } from "vitest";
import {
  DEFAULT_DONATION_RATIO_SETTINGS,
  isBelowDonationRatio,
  parseDonationRatioSettings,
  donationRatioDetail,
} from "@/lib/scoring/donation-ratio";

// ---------------------------------------------------------------------------
// parseDonationRatioSettings
// ---------------------------------------------------------------------------

describe("parseDonationRatioSettings — runtime_settings JSONB → settings", () => {
  it("returns code defaults for null/undefined/non-object input (absent key, empty table)", () => {
    expect(parseDonationRatioSettings(null)).toEqual(
      DEFAULT_DONATION_RATIO_SETTINGS,
    );
    expect(parseDonationRatioSettings(undefined)).toEqual(
      DEFAULT_DONATION_RATIO_SETTINGS,
    );
    expect(parseDonationRatioSettings("enabled")).toEqual(
      DEFAULT_DONATION_RATIO_SETTINGS,
    );
    expect(parseDonationRatioSettings(42)).toEqual(
      DEFAULT_DONATION_RATIO_SETTINGS,
    );
  });

  it("applies valid overrides on top of the defaults", () => {
    expect(
      parseDonationRatioSettings({
        enabled: false,
        minRatio: 0.8,
        windowDays: 14,
        receivedFloor: 500,
      }),
    ).toEqual({
      enabled: false,
      minRatio: 0.8,
      windowDays: 14,
      receivedFloor: 500,
    });
  });

  it("ignores unknown keys and falls back per-field for wrong-typed values", () => {
    const parsed = parseDonationRatioSettings({
      enabled: "yes", // wrong type → default (true)
      minRatio: 0.9, // valid
      windowDays: "30", // wrong type → default 30
      receivedFloor: -5, // clamped ≥ 0 → 0
      bogusKey: "whatever",
    });
    expect(parsed).toEqual({
      enabled: true,
      minRatio: 0.9,
      windowDays: 30,
      receivedFloor: 0,
    });
  });

  it("clamps hostile values into safe ranges (a bad row can't brick the queue)", () => {
    const parsed = parseDonationRatioSettings({
      minRatio: 999,
      windowDays: 10_000,
      receivedFloor: 1e12,
    });
    expect(parsed.minRatio).toBeLessThanOrEqual(10);
    expect(parsed.windowDays).toBeLessThanOrEqual(90);
    expect(parsed.receivedFloor).toBeLessThanOrEqual(100_000);
    // Non-finite numbers fall back to defaults, never NaN propagation.
    const nan = parseDonationRatioSettings({ minRatio: Number.NaN });
    expect(nan.minRatio).toBe(DEFAULT_DONATION_RATIO_SETTINGS.minRatio);
  });

  it("rounds fractional windowDays to whole days", () => {
    expect(
      parseDonationRatioSettings({ windowDays: 29.7 }).windowDays,
    ).toBe(30);
  });
});

// ---------------------------------------------------------------------------
// isBelowDonationRatio
// ---------------------------------------------------------------------------

describe("isBelowDonationRatio — pure threshold decision", () => {
  it("never flags when the category is disabled", () => {
    const settings = { ...DEFAULT_DONATION_RATIO_SETTINGS, enabled: false };
    expect(
      isBelowDonationRatio({ given: 0, received: 10_000 }, settings),
    ).toBe(false);
  });

  it("flags a heavy receiver giving back less than the minimum ratio", () => {
    // 120/400 = 0.30 < 0.5 → flagged.
    expect(
      isBelowDonationRatio(
        { given: 120, received: 400 },
        DEFAULT_DONATION_RATIO_SETTINGS,
      ),
    ).toBe(true);
  });

  it("does not flag a member exactly at the minimum ratio (strictly below only)", () => {
    // 200/400 = 0.50 — exactly at the threshold, not below.
    expect(
      isBelowDonationRatio(
        { given: 200, received: 400 },
        DEFAULT_DONATION_RATIO_SETTINGS,
      ),
    ).toBe(false);
  });

  it("does not flag a healthy ratio", () => {
    expect(
      isBelowDonationRatio(
        { given: 500, received: 400 },
        DEFAULT_DONATION_RATIO_SETTINGS,
      ),
    ).toBe(false);
  });

  it("does not flag request-light members below the received floor", () => {
    // 0/120 — ratio 0 is terrible, but they only received 120 < floor 200:
    // flagging a member who barely requests is noise, not signal.
    expect(
      isBelowDonationRatio(
        { given: 0, received: 120 },
        DEFAULT_DONATION_RATIO_SETTINGS,
      ),
    ).toBe(false);
  });

  it("does not flag zero-received members even when the floor is overridden to 0", () => {
    // received 0 would divide by zero — guarded, never flagged.
    const settings = { ...DEFAULT_DONATION_RATIO_SETTINGS, receivedFloor: 0 };
    expect(isBelowDonationRatio({ given: 0, received: 0 }, settings)).toBe(
      false,
    );
  });

  it("honors an overridden floor and ratio from runtime_settings", () => {
    const settings = parseDonationRatioSettings({
      minRatio: 0.9,
      receivedFloor: 50,
    });
    // 40/100 = 0.40 — fine at defaults, flagged at 0.9.
    expect(isBelowDonationRatio({ given: 40, received: 100 }, settings)).toBe(
      true,
    );
    // 30/40 = 0.75 < 0.9 but received 40 < floor 50 → not flagged.
    expect(isBelowDonationRatio({ given: 30, received: 40 }, settings)).toBe(
      false,
    );
  });
});

// ---------------------------------------------------------------------------
// donationRatioDetail
// ---------------------------------------------------------------------------

describe("donationRatioDetail — queue row detail string", () => {
  it("formats ratio with two decimals and the configured minimum", () => {
    expect(
      donationRatioDetail(
        { given: 120, received: 400 },
        DEFAULT_DONATION_RATIO_SETTINGS,
      ),
    ).toBe("Gave 120 / received 400 · ratio 0.30× (min 0.50×)");
  });

  it("renders an em-dash ratio when received is zero (no fabricated ratio)", () => {
    const detail = donationRatioDetail(
      { given: 0, received: 0 },
      DEFAULT_DONATION_RATIO_SETTINGS,
    );
    expect(detail).toBe("Gave 0 / received 0 · ratio — (min 0.50×)");
  });

  it("reflects overridden thresholds in the minimum shown", () => {
    const settings = parseDonationRatioSettings({ minRatio: 0.75 });
    expect(
      donationRatioDetail({ given: 90, received: 120 }, settings),
    ).toBe("Gave 90 / received 120 · ratio 0.75× (min 0.75×)");
  });
});
