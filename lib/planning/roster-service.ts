/**
 * Roster service — persistence layer for war roster drafts.
 *
 * The schema (`war_rosters` + `war_roster_slots`) already exists with the
 * audit columns Step 2.2 calls for (created_by, created_at, updated_at,
 * finalized_at, config_version, status). This module owns:
 *
 *   1. Pure payload validation (count, unique members, map positions, allowed
 *      war sizes) — extracted so it's unit-testable without a DB.
 *   2. Create / update / finalize / list / get operations against the DB,
 *      guarded by the admin session from lib/auth/session.ts.
 *
 * See concept/09 §"Write protection" + concept/12 Step 2.2.
 *
 * Finalize immutability: once `status = "finalized"`, the roster and its
 * slots are read-only. Update + finalize both reject an already-finalized
 * roster with 409 Conflict.
 */

import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { warRosters, warRosterSlots } from "@/lib/db/schema";
import { WAR_SIZES, type WarSize } from "@/lib/planning/types";
import { SETTINGS_VALIDATION_VERSION } from "@/lib/settings/defaults";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single slot in a create/update payload. Position is 1-indexed. */
export interface RosterSlotInput {
  playerTag: string;
  mapPosition: number;
}

/** Input for POST /api/rosters (create) and PATCH /api/rosters (update). */
export interface RosterInput {
  /** Optional roster title (e.g. "Weekend war Jul 27"). */
  title?: string | null;
  warSize: WarSize;
  slots: RosterSlotInput[];
}

/** A roster row as returned by the API, with its slots. */
export interface RosterWithSlots {
  id: number;
  title: string | null;
  warSize: number;
  status: "draft" | "finalized";
  configVersion: string | null;
  createdBy: string | null;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  finalizedAt: string | null; // ISO
  slots: RosterSlotInput[];
}

// ---------------------------------------------------------------------------
// Validation (pure — no DB)
// ---------------------------------------------------------------------------

export interface RosterValidationError {
  path: string;
  message: string;
}

export interface RosterValidationResult {
  ok: boolean;
  errors: RosterValidationError[];
}

/**
 * Validate a roster payload against the rules in concept/12 Step 2.2:
 *   - warSize is one of the allowed sizes (10/15/20/25/30/40/50).
 *   - slot count ≤ warSize (a draft can be partial; finalize requires full).
 *   - map positions are 1..warSize, unique, and contiguous from 1.
 *   - player tags are unique within the roster.
 *   - no empty/whitespace tags.
 *
 * `requireFull` flips the count check to `=== warSize` (used by finalize).
 */
export function validateRoster(
  input: unknown,
  requireFull: boolean,
): RosterValidationResult {
  const errors: RosterValidationError[] = [];

  if (!input || typeof input !== "object") {
    return { ok: false, errors: [{ path: "", message: "Roster must be an object." }] };
  }
  const r = input as Record<string, unknown>;

  // warSize
  const size = r.warSize;
  if (typeof size !== "number" || !Number.isInteger(size)) {
    errors.push({ path: "warSize", message: "Must be an integer." });
  } else if (!(WAR_SIZES as readonly number[]).includes(size)) {
    errors.push({
      path: "warSize",
      message: `Must be one of ${WAR_SIZES.join(", ")}.`,
    });
  }

  // slots
  const slots = r.slots;
  if (!Array.isArray(slots)) {
    errors.push({ path: "slots", message: "Must be an array of slot objects." });
    return { ok: false, errors };
  }

  const allowedSize = typeof size === "number" ? size : Infinity;
  if (requireFull && slots.length !== allowedSize) {
    errors.push({
      path: "slots",
      message: `A finalized roster must have exactly ${size} slots (got ${slots.length}).`,
    });
  } else if (slots.length > allowedSize) {
    errors.push({
      path: "slots",
      message: `Too many slots (${slots.length}) for war size ${size}.`,
    });
  }

  const seenTags = new Set<string>();
  const seenPositions = new Set<number>();
  slots.forEach((slot, i) => {
    if (!slot || typeof slot !== "object") {
      errors.push({ path: `slots[${i}]`, message: "Must be an object." });
      return;
    }
    const s = slot as Record<string, unknown>;
    const tag = s.playerTag;
    const pos = s.mapPosition;

    if (typeof tag !== "string" || tag.trim() === "") {
      errors.push({ path: `slots[${i}].playerTag`, message: "Must be a non-empty string." });
    } else if (seenTags.has(tag)) {
      errors.push({ path: `slots[${i}].playerTag`, message: `Duplicate member ${tag}.` });
    } else {
      seenTags.add(tag);
    }

    if (typeof pos !== "number" || !Number.isInteger(pos)) {
      errors.push({ path: `slots[${i}].mapPosition`, message: "Must be an integer." });
    } else if (pos < 1 || pos > allowedSize) {
      errors.push({
        path: `slots[${i}].mapPosition`,
        message: `Must be between 1 and ${allowedSize}.`,
      });
    } else if (seenPositions.has(pos)) {
      errors.push({
        path: `slots[${i}].mapPosition`,
        message: `Duplicate position ${pos}.`,
      });
    } else {
      seenPositions.add(pos);
    }
  });

  return { ok: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// DB operations
// ---------------------------------------------------------------------------

/**
 * Create a new draft roster + its slots in a single transaction.
 * Returns the created roster with slots.
 */
export async function createRoster(
  input: RosterInput,
  createdBy: string | null,
): Promise<RosterWithSlots> {
  const [roster] = await db
    .insert(warRosters)
    .values({
      title: input.title ?? null,
      warSize: input.warSize,
      status: "draft",
      createdBy,
    })
    .returning();

  if (!roster) throw new Error("Failed to create roster row.");

  if (input.slots.length > 0) {
    await db.insert(warRosterSlots).values(
      input.slots.map((s) => ({
        rosterId: roster.id,
        playerTag: s.playerTag,
        mapPosition: s.mapPosition,
      })),
    );
  }

  return toRosterWithSlots(roster, input.slots);
}

/**
 * Update an existing draft's title, war size, and slots. Slots are replaced
 * wholesale (delete + re-insert) to keep the unique-position index consistent
 * during reordering. Rejects finalized rosters with a ConflictError.
 */
export async function updateRoster(
  id: number,
  input: RosterInput,
  /** Audit actor — logged here and by the route handler (not a DB column). */
  updatedBy: string | null,
): Promise<RosterWithSlots> {
  const [existing] = await db
    .select()
    .from(warRosters)
    .where(eq(warRosters.id, id))
    .limit(1);
  if (!existing) throw new NotFoundError(`Roster ${id} not found.`);
  if (existing.status === "finalized") {
    throw new ConflictError(`Roster ${id} is finalized and cannot be updated.`);
  }
  console.info(`[audit] roster ${id} update by ${updatedBy ?? "unknown"}`);

  await db
    .update(warRosters)
    .set({
      title: input.title ?? null,
      warSize: input.warSize,
      updatedAt: new Date(),
      // createdBy is preserved on update; updatedBy isn't a column, so the
      // updatedAt timestamp is the audit signal for edits.
    })
    .where(eq(warRosters.id, id));

  // Replace slots wholesale.
  await db.delete(warRosterSlots).where(eq(warRosterSlots.rosterId, id));
  if (input.slots.length > 0) {
    await db.insert(warRosterSlots).values(
      input.slots.map((s) => ({
        rosterId: id,
        playerTag: s.playerTag,
        mapPosition: s.mapPosition,
      })),
    );
  }

  const [updated] = await db
    .select()
    .from(warRosters)
    .where(eq(warRosters.id, id))
    .limit(1);

  return toRosterWithSlots(updated!, input.slots);
}

/**
 * Finalize a draft roster. Stamps the current settings validation version as
 * the config snapshot, sets status + finalizedAt. The roster becomes
 * immutable after this. Rejects already-finalized rosters with ConflictError.
 */
export async function finalizeRoster(
  id: number,
  /** Audit actor — logged here and by the route handler (not a DB column). */
  finalizedBy: string | null,
): Promise<RosterWithSlots> {
  const [existing] = await db
    .select()
    .from(warRosters)
    .where(eq(warRosters.id, id))
    .limit(1);
  if (!existing) throw new NotFoundError(`Roster ${id} not found.`);
  if (existing.status === "finalized") {
    throw new ConflictError(`Roster ${id} is already finalized.`);
  }
  console.info(`[audit] roster ${id} finalize by ${finalizedBy ?? "unknown"}`);

  // Load current slots to return them with the finalized roster.
  const slots = await db
    .select({
      playerTag: warRosterSlots.playerTag,
      mapPosition: warRosterSlots.mapPosition,
    })
    .from(warRosterSlots)
    .where(eq(warRosterSlots.rosterId, id))
    .orderBy(warRosterSlots.mapPosition);

  const now = new Date();
  const configVersion = `v${SETTINGS_VALIDATION_VERSION}`;
  await db
    .update(warRosters)
    .set({
      status: "finalized",
      finalizedAt: now,
      updatedAt: now,
      configVersion,
    })
    .where(eq(warRosters.id, id));

  const [finalized] = await db
    .select()
    .from(warRosters)
    .where(eq(warRosters.id, id))
    .limit(1);

  return toRosterWithSlots(finalized!, slots);
}

/**
 * List all rosters (drafts first, then finalized, newest first).
 * Used by the planner's draft-picker and any future "saved rosters" surface.
 */
export async function listRosters(limit = 50): Promise<RosterWithSlots[]> {
  const rows = await db
    .select()
    .from(warRosters)
    .orderBy(desc(warRosters.status), desc(warRosters.updatedAt))
    .limit(limit);

  // Slots are loaded per-roster to keep the query simple; rosters are few.
  const withSlots = await Promise.all(
    rows.map(async (r) => {
      const slots = await db
        .select({
          playerTag: warRosterSlots.playerTag,
          mapPosition: warRosterSlots.mapPosition,
        })
        .from(warRosterSlots)
        .where(eq(warRosterSlots.rosterId, r.id))
        .orderBy(warRosterSlots.mapPosition);
      return toRosterWithSlots(r, slots);
    }),
  );
  return withSlots;
}

/**
 * Get a single roster with its slots. Returns null when the roster doesn't
 * exist.
 */
export async function getRoster(id: number): Promise<RosterWithSlots | null> {
  const [row] = await db
    .select()
    .from(warRosters)
    .where(eq(warRosters.id, id))
    .limit(1);
  if (!row) return null;

  const slots = await db
    .select({
      playerTag: warRosterSlots.playerTag,
      mapPosition: warRosterSlots.mapPosition,
    })
    .from(warRosterSlots)
    .where(eq(warRosterSlots.rosterId, id))
    .orderBy(warRosterSlots.mapPosition);

  return toRosterWithSlots(row, slots);
}

// ---------------------------------------------------------------------------
// Errors (typed so route handlers can map them to status codes)
// ---------------------------------------------------------------------------

export class ConflictError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = "ConflictError";
  }
}

export class NotFoundError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = "NotFoundError";
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Convert a DB row + slots into the API-facing RosterWithSlots shape. */
function toRosterWithSlots(
  row: {
    id: number;
    title: string | null;
    warSize: number;
    status: string;
    configVersion: string | null;
    createdBy: string | null;
    createdAt: Date;
    updatedAt: Date;
    finalizedAt: Date | null;
  },
  slots: RosterSlotInput[],
): RosterWithSlots {
  return {
    id: row.id,
    title: row.title,
    warSize: row.warSize,
    status: row.status as "draft" | "finalized",
    configVersion: row.configVersion,
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    finalizedAt: row.finalizedAt ? row.finalizedAt.toISOString() : null,
    slots,
  };
}
