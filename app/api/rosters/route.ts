import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/session";
import {
  createRoster,
  updateRoster,
  listRosters,
  validateRoster,
  ConflictError,
  type RosterInput,
} from "@/lib/planning/roster-service";

/**
 * /api/rosters — list + create + update war roster drafts.
 *
 * GET (public): list rosters (drafts first, then finalized, newest first).
 *   Read-only pages stay public per concept/11 §"Administrative protection" #3.
 *
 * POST (protected): create a new draft roster. Requires admin session.
 *   Body: { title?, warSize, slots: [{ playerTag, mapPosition }] }.
 *   Validates the payload, then inserts the roster + slots.
 *
 * PATCH (protected): update an existing draft. Body: { id, title?, warSize,
 *   slots }. Rejects finalized rosters with 409. Slots are replaced wholesale.
 *
 * Audit: the `created_by` / `updated_at` columns on war_rosters are the audit
 * trail. Console audit lines record the actor (always "admin") + result.
 *
 * See concept/09 §"Write protection" + concept/12 Step 2.2.
 */

export async function GET() {
  try {
    const rosters = await listRosters();
    return NextResponse.json({ rosters });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[audit] rosters list failed: ${msg}`);
    return NextResponse.json(
      { error: "Failed to load rosters" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const { authenticated } = await getAdminSession();
  if (!authenticated) {
    console.warn("[audit] roster create rejected: unauthenticated");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const result = validateRoster(body, /* requireFull */ false);
  if (!result.ok) {
    return NextResponse.json(
      { error: "Validation failed", errors: result.errors },
      { status: 400 },
    );
  }

  try {
    const roster = await createRoster(body as RosterInput, /* createdBy */ "admin");
    console.info(`[audit] roster ${roster.id} created by admin`);
    return NextResponse.json({ roster }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[audit] roster create failed: ${msg}`);
    return NextResponse.json(
      { error: "Failed to create roster" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  const { authenticated } = await getAdminSession();
  if (!authenticated) {
    console.warn("[audit] roster update rejected: unauthenticated");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body.id !== "number") {
    return NextResponse.json(
      { error: "Roster id is required" },
      { status: 400 },
    );
  }

  const { id, ...rest } = body;
  const result = validateRoster(rest, /* requireFull */ false);
  if (!result.ok) {
    return NextResponse.json(
      { error: "Validation failed", errors: result.errors },
      { status: 400 },
    );
  }

  try {
    const roster = await updateRoster(
      id,
      rest as RosterInput,
      /* updatedBy */ "admin",
    );
    console.info(`[audit] roster ${id} updated by admin`);
    return NextResponse.json({ roster });
  } catch (err) {
    if (err instanceof ConflictError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[audit] roster ${id} update failed: ${msg}`);
    return NextResponse.json(
      { error: "Failed to update roster" },
      { status: 500 },
    );
  }
}
