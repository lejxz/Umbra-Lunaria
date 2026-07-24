import { describe, it, expect } from "vitest";
import {
  validateSettings,
  DEFAULT_SETTINGS,
  type RuntimeSettings,
} from "@/lib/settings/defaults";

/**
 * Tests for runtime-settings validation.
 *
 * Covers concept/12 Step 2.0: "Validate non-negative weights and total weight
 * rules before saving" and "Test ... settings validation."
 */
describe("validateSettings", () => {
  it("accepts the default settings", () => {
    const result = validateSettings(DEFAULT_SETTINGS);
    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("accepts valid custom weights that sum to 1.0", () => {
    const settings: RuntimeSettings = {
      ...DEFAULT_SETTINGS,
      activityScore: { donations: 0.5, activity: 0.3, war: 0.1, capital: 0.1 },
      warSelect: {
        activity: 0.4,
        participation: 0.3,
        averageStars: 0.1,
        threeStarRate: 0.1,
        accountReadiness: 0.1,
      },
    };
    expect(validateSettings(settings).ok).toBe(true);
  });

  it("rejects activity-score weights that do not sum to 1.0", () => {
    const settings: RuntimeSettings = {
      ...DEFAULT_SETTINGS,
      activityScore: { donations: 0.5, activity: 0.5, war: 0.5, capital: 0.5 },
    };
    const result = validateSettings(settings);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.path === "activityScore")).toBe(true);
  });

  it("rejects war-select weights that do not sum to 1.0", () => {
    const settings: RuntimeSettings = {
      ...DEFAULT_SETTINGS,
      warSelect: {
        activity: 0.5,
        participation: 0.5,
        averageStars: 0.3,
        threeStarRate: 0.1,
        accountReadiness: 0.1,
      },
    };
    const result = validateSettings(settings);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.path === "warSelect")).toBe(true);
  });

  it("rejects negative weights", () => {
    const settings: RuntimeSettings = {
      ...DEFAULT_SETTINGS,
      activityScore: { donations: -0.1, activity: 0.45, war: 0.25, capital: 0.4 },
    };
    const result = validateSettings(settings);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.path === "activityScore.donations")).toBe(true);
  });

  it("rejects an out-of-bounds inactivity threshold", () => {
    const settings: RuntimeSettings = {
      ...DEFAULT_SETTINGS,
      inactivityThresholdDays: 0,
    };
    const result = validateSettings(settings);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.path === "inactivityThresholdDays")).toBe(true);
  });

  it("rejects a non-boolean feature toggle", () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      features: { clanCapital: "yes", builderBaseSummary: true, warPlanningAutoSelect: true },
    } as unknown as RuntimeSettings;
    const result = validateSettings(settings);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.path === "features.clanCapital")).toBe(true);
  });

  it("rejects a non-integer threshold", () => {
    const settings: RuntimeSettings = {
      ...DEFAULT_SETTINGS,
      minWarsForConfidentRanking: 3.5,
    };
    const result = validateSettings(settings);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.path === "minWarsForConfidentRanking")).toBe(true);
  });

  it("rejects a missing displayLimits object", () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      displayLimits: undefined,
    } as unknown as RuntimeSettings;
    const result = validateSettings(settings);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.path === "displayLimits")).toBe(true);
  });

  it("rejects a non-object root", () => {
    expect(validateSettings(null).ok).toBe(false);
    expect(validateSettings("string").ok).toBe(false);
    expect(validateSettings(42).ok).toBe(false);
  });

  it("tolerates float weights within the sum tolerance", () => {
    // 0.33 + 0.33 + 0.34 = 1.00 exactly; 0.1+0.2+0.3+0.4 = 1.0 in float math.
    const settings: RuntimeSettings = {
      ...DEFAULT_SETTINGS,
      activityScore: { donations: 0.4, activity: 0.3, war: 0.2, capital: 0.1 },
    };
    expect(validateSettings(settings).ok).toBe(true);
  });
});
