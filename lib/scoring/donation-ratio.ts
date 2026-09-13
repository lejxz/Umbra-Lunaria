/**
 * Donation-ratio "needs attention" flag (Phase 2.2 —
 * docs/2026-09-11-implementation-plan.md §2.2).
 *
 * Flags members who request far more than they give: with a configurable
 * look-back window (default 30 days, reset-aware donation accounting via
 * calculateDonationWindow), a member is listed when
 *
 *   received ≥ receivedFloor   (default 200 — request-light members are
 *                              exempt: flagging someone who received 20
 *                              troops for not donating is noise, not signal)
 *   AND given/received < minRatio  (default 0.5 — the clan-median proxy)
 *
 * Everything here is pure: settings parsing, the threshold decision, and the
 * detail-string formatting. DB reads (runtime_settings + donation snapshots)
 * live in lib/db/queries.ts's getNeedsAttention.
 *
 * Settings are read from runtime_settings key "needsAttention.donationRatio"
 * (JSONB) and merged over code defaults, so the clan can override behavior
 * with a single SQL UPDATE and no deploy:
 *
 *   INSERT INTO runtime_settings (key, value)
 *   VALUES ('needsAttention.donationRatio',
 *           '{"enabled":true,"minRatio":0.5,"windowDays":30,"receivedFloor":200}')
 *   ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
 *
 * No admin UI by design (consistent with the no-auth architecture —
 * docs/2026-09-11-implementation-plan.md §2.2).
 */

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export interface DonationRatioSettings {
  /** Category kill-switch — when false the group is absent from the queue. */
  enabled: boolean;
  /** given/received strictly below this ratio is flagged. */
  minRatio: number;
  /** Look-back window in calendar days (clan timezone). */
  windowDays: number;
  /** Minimum received in-window before a member can be flagged. */
  receivedFloor: number;
}

export const DONATION_RATIO_SETTINGS_KEY = "needsAttention.donationRatio";

export const DEFAULT_DONATION_RATIO_SETTINGS: DonationRatioSettings = {
  enabled: true,
  minRatio: 0.5,
  windowDays: 30,
  receivedFloor: 200,
};

/** Clamp bounds — a bad row in runtime_settings must never brick the queue. */
const MIN_RATIO_BOUNDS = { min: 0, max: 10 };
const WINDOW_DAYS_BOUNDS = { min: 1, max: 90 };
const RECEIVED_FLOOR_BOUNDS = { min: 0, max: 100_000 };

function clampNumber(value: number, bounds: { min: number; max: number }): number {
  if (Number.isNaN(value)) return bounds.min;
  return Math.min(bounds.max, Math.max(bounds.min, value));
}

/**
 * Merge a raw runtime_settings JSONB value (unknown shape — never trust it)
 * over the code defaults. Unknown keys are ignored; known keys are coerced
 * and clamped into their safe ranges. `null`/non-object input yields the
 * defaults, which is also the empty-table behavior.
 */
export function parseDonationRatioSettings(raw: unknown): DonationRatioSettings {
  const defaults = DEFAULT_DONATION_RATIO_SETTINGS;
  if (raw === null || raw === undefined || typeof raw !== "object") {
    return { ...defaults };
  }

  const obj = raw as Record<string, unknown>;
  const enabled =
    typeof obj["enabled"] === "boolean" ? obj["enabled"] : defaults.enabled;

  const minRatio =
    typeof obj["minRatio"] === "number" && Number.isFinite(obj["minRatio"])
      ? clampNumber(obj["minRatio"], MIN_RATIO_BOUNDS)
      : defaults.minRatio;

  const windowDays =
    typeof obj["windowDays"] === "number" && Number.isFinite(obj["windowDays"])
      ? Math.round(clampNumber(obj["windowDays"], WINDOW_DAYS_BOUNDS))
      : defaults.windowDays;

  const receivedFloor =
    typeof obj["receivedFloor"] === "number" &&
    Number.isFinite(obj["receivedFloor"])
      ? Math.round(clampNumber(obj["receivedFloor"], RECEIVED_FLOOR_BOUNDS))
      : defaults.receivedFloor;

  return { enabled, minRatio, windowDays, receivedFloor };
}

// ---------------------------------------------------------------------------
// Threshold decision
// ---------------------------------------------------------------------------

export interface DonationRatioInput {
  /** Reset-aware given total over the window (calculateDonationWindow). */
  given: number;
  /** Reset-aware received total over the window. */
  received: number;
}

/**
 * Pure threshold decision — should this member be flagged?
 *
 * Order of guards matters for the semantics documented above: disabled
 * never flags; below-floor never flags (request-light members); received
 * of 0 can never flag (already covered by floor > 0, but explicit for
 * division-safety when floor is overridden to 0).
 */
export function isBelowDonationRatio(
  input: DonationRatioInput,
  settings: DonationRatioSettings,
): boolean {
  if (!settings.enabled) return false;
  if (settings.receivedFloor > 0 && input.received < settings.receivedFloor) {
    return false;
  }
  if (input.received <= 0) return false;
  return input.given / input.received < settings.minRatio;
}

// ---------------------------------------------------------------------------
// Detail string
// ---------------------------------------------------------------------------

/**
 * One-line, at-a-glance detail for the queue row — e.g.
 * "Gave 120 / received 400 · ratio 0.30× (min 0.50×)".
 * Display-only; kept pure for unit tests.
 */
export function donationRatioDetail(
  input: DonationRatioInput,
  settings: DonationRatioSettings,
): string {
  const ratio =
    input.received > 0 ? input.given / input.received : Number.NaN;
  const ratioLabel = Number.isNaN(ratio)
    ? "—"
    : `${ratio.toFixed(2)}×`;
  return `Gave ${input.given} / received ${input.received} · ratio ${ratioLabel} (min ${settings.minRatio.toFixed(2)}×)`;
}
