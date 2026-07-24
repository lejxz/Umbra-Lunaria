/**
 * Runtime settings — defaults, types, and validation.
 *
 * Concept/11 §"Runtime settings" defines the seven administrator-editable
 * settings groups. This module owns:
 *
 *   1. The `RuntimeSettings` type (the jsonb document stored in the
 *      `runtime_settings` table under key `SETTINGS_KEY`).
 *   2. The default values, which mirror the existing hardcoded behavior so
 *      Phase 2 changes nothing observable until an admin edits a value.
 *   3. Pure validation: non-negative weights, weight groups summing to 1.0,
 *      integer thresholds within sane bounds.
 *
 * The version/timestamp/actor audit fields live as COLUMNS on the
 * `runtime_settings` table (see lib/db/schema.ts), not inside this object —
 * one source of truth for audit metadata.
 *
 * Default weight values are sourced from the existing scoring modules
 * (lib/scoring/activity-score.ts RAW_WEIGHTS and concept/09 §"Composite score")
 * so the dashboard doesn't shift when Phase 2 lands.
 */

/** Settings key in the `runtime_settings` table. Single document, atomic read. */
export const SETTINGS_KEY = "runtime_settings";

/** Current settings schema version. Bump when the shape changes. */
export const SETTINGS_VALIDATION_VERSION = 1;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Member Activity Score component weights. Must sum to 1.0. */
export interface ActivityScoreWeights {
  donations: number;
  activity: number;
  war: number;
  capital: number;
}

/** War auto-select component weights (concept/09). Must sum to 1.0. */
export interface WarSelectWeights {
  activity: number;
  participation: number;
  averageStars: number;
  threeStarRate: number;
  accountReadiness: number;
}

/** Feature visibility toggles (mirrors config/clan.config.ts features). */
export interface FeatureToggles {
  clanCapital: boolean;
  builderBaseSummary: boolean;
  warPlanningAutoSelect: boolean;
}

/** Display-window limits for list surfaces. */
export interface DisplayLimits {
  clanLogEntries: number;
  leaderboardSize: number;
}

/** The full runtime-settings document. */
export interface RuntimeSettings {
  /** 1. Inactivity threshold for the dashboard "needs attention" panel (days). */
  inactivityThresholdDays: number;
  /** 2. Member Activity Score component weights (sum = 1.0). */
  activityScore: ActivityScoreWeights;
  /** 3. War auto-select component weights (sum = 1.0). */
  warSelect: WarSelectWeights;
  /** 4. Minimum tracked wars for a full-confidence auto-select score. */
  minWarsForConfidentRanking: number;
  /** 5. Hours before war end at which the "attacks remaining" alert surfaces. */
  attacksRemainingAlertHours: number;
  /** 6. Feature visibility toggles. */
  features: FeatureToggles;
  /** 7. Display-window sizes. */
  displayLimits: DisplayLimits;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

/**
 * Default runtime settings. These mirror the values currently hardcoded
 * across lib/scoring/activity-score.ts, config/clan.config.ts, and the
 * dashboard queries so that introducing the settings table changes nothing
 * observable until an admin edits a value.
 */
export const DEFAULT_SETTINGS: RuntimeSettings = {
  // concept/05-dashboard.md attention panel — members inactive this many days
  // appear in "needs attention".
  inactivityThresholdDays: 7,

  // lib/scoring/activity-score.ts RAW_WEIGHTS (35/25/25/15 → normalized to 1.0).
  activityScore: {
    donations: 0.35,
    activity: 0.25,
    war: 0.25,
    capital: 0.15,
  },

  // concept/09-war-planning-and-auto-select.md §"Composite score".
  warSelect: {
    activity: 0.3,
    participation: 0.25,
    averageStars: 0.2,
    threeStarRate: 0.15,
    accountReadiness: 0.1,
  },

  // config/clan.config.ts minWarsForConfidentRanking.
  minWarsForConfidentRanking: 3,

  // Surface the "attacks remaining" alert when this many hours remain in war.
  attacksRemainingAlertHours: 8,

  // config/clan.config.ts features.
  features: {
    clanCapital: true,
    builderBaseSummary: true,
    warPlanningAutoSelect: true,
  },

  displayLimits: {
    clanLogEntries: 50,
    leaderboardSize: 10,
  },
};

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export interface ValidationError {
  /** Dotted path to the offending field, e.g. "activityScore.war". */
  path: string;
  /** Human-readable reason. */
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  /** Present only when ok === false. */
  errors: ValidationError[];
}

/** Tolerance for weight-sum checks (floats rarely sum to exactly 1.0). */
const WEIGHT_SUM_TOLERANCE = 0.0001;

/** Sane bounds for numeric thresholds (reject absurd values early). */
const BOUNDS = {
  inactivityThresholdDays: { min: 1, max: 90 },
  minWarsForConfidentRanking: { min: 1, max: 50 },
  attacksRemainingAlertHours: { min: 1, max: 47 },
  clanLogEntries: { min: 5, max: 500 },
  leaderboardSize: { min: 3, max: 100 },
} as const;

/**
 * Validate a runtime-settings document.
 *
 * Rules (concept/11 §"Runtime settings"):
 *   1. All weight values are non-negative.
 *   2. The activity-score and war-select weight groups each sum to 1.0.
 *   3. Thresholds are within sane bounds.
 *   4. Feature toggles are booleans.
 *
 * Pure function — no DB, no I/O — so it can be unit-tested directly.
 */
export function validateSettings(settings: unknown): ValidationResult {
  const errors: ValidationError[] = [];

  if (!settings || typeof settings !== "object") {
    return { ok: false, errors: [{ path: "", message: "Settings must be an object." }] };
  }
  const s = settings as Record<string, unknown>;

  // 1. inactivityThresholdDays
  checkInt(
    s.inactivityThresholdDays,
    "inactivityThresholdDays",
    BOUNDS.inactivityThresholdDays,
    errors,
  );

  // 2. activityScore weights
  if (checkWeightsObject(s.activityScore, "activityScore", ["donations", "activity", "war", "capital"], errors)) {
    checkWeightSum(
      s.activityScore as unknown as Record<string, number>,
      "activityScore",
      ["donations", "activity", "war", "capital"],
      errors,
    );
  }

  // 3. warSelect weights
  if (checkWeightsObject(s.warSelect, "warSelect", ["activity", "participation", "averageStars", "threeStarRate", "accountReadiness"], errors)) {
    checkWeightSum(
      s.warSelect as unknown as Record<string, number>,
      "warSelect",
      ["activity", "participation", "averageStars", "threeStarRate", "accountReadiness"],
      errors,
    );
  }

  // 4. minWarsForConfidentRanking
  checkInt(
    s.minWarsForConfidentRanking,
    "minWarsForConfidentRanking",
    BOUNDS.minWarsForConfidentRanking,
    errors,
  );

  // 5. attacksRemainingAlertHours
  checkInt(
    s.attacksRemainingAlertHours,
    "attacksRemainingAlertHours",
    BOUNDS.attacksRemainingAlertHours,
    errors,
  );

  // 6. features
  if (s.features && typeof s.features === "object") {
    const f = s.features as Record<string, unknown>;
    for (const key of ["clanCapital", "builderBaseSummary", "warPlanningAutoSelect"]) {
      if (typeof f[key] !== "boolean") {
        errors.push({ path: `features.${key}`, message: "Must be a boolean." });
      }
    }
  } else {
    errors.push({ path: "features", message: "Feature toggles object is required." });
  }

  // 7. displayLimits
  if (s.displayLimits && typeof s.displayLimits === "object") {
    const d = s.displayLimits as Record<string, unknown>;
    checkInt(d.clanLogEntries, "displayLimits.clanLogEntries", BOUNDS.clanLogEntries, errors);
    checkInt(d.leaderboardSize, "displayLimits.leaderboardSize", BOUNDS.leaderboardSize, errors);
  } else {
    errors.push({ path: "displayLimits", message: "Display limits object is required." });
  }

  return { ok: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// Validation helpers (internal)
// ---------------------------------------------------------------------------

function checkInt(
  value: unknown,
  path: string,
  bounds: { min: number; max: number },
  errors: ValidationError[],
): void {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    errors.push({ path, message: "Must be a finite number." });
    return;
  }
  if (!Number.isInteger(value)) {
    errors.push({ path, message: "Must be an integer." });
    return;
  }
  if (value < bounds.min || value > bounds.max) {
    errors.push({
      path,
      message: `Must be between ${bounds.min} and ${bounds.max}.`,
    });
  }
}

function checkWeightsObject(
  value: unknown,
  path: string,
  keys: readonly string[],
  errors: ValidationError[],
): boolean {
  if (!value || typeof value !== "object") {
    errors.push({ path, message: "Weights object is required." });
    return false;
  }
  const w = value as Record<string, unknown>;
  let allPresent = true;
  for (const key of keys) {
    const v = w[key];
    if (typeof v !== "number" || !Number.isFinite(v)) {
      errors.push({ path: `${path}.${key}`, message: "Must be a finite number." });
      allPresent = false;
      continue;
    }
    if (v < 0) {
      errors.push({ path: `${path}.${key}`, message: "Must be non-negative." });
    }
  }
  return allPresent;
}

function checkWeightSum(
  weights: Record<string, number>,
  path: string,
  keys: readonly string[],
  errors: ValidationError[],
): void {
  const sum = keys.reduce((acc, k) => acc + (weights[k] ?? 0), 0);
  if (Math.abs(sum - 1) > WEIGHT_SUM_TOLERANCE) {
    errors.push({
      path,
      message: `Weights must sum to 1.0 (got ${sum.toFixed(4)}).`,
    });
  }
}
