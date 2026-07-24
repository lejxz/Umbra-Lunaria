import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/session";
import {
  finalizeRoster,
  validateRoster,
  ConflictError,
  NotFoundError,
  getRoster,
  type RosterInput,
} from "@/lib/planning/roster-service";

/**
 * POST /api/rosters/[id]/finalize — lock a draft roster as finalized.
 *
 * Protected: requires admin session. Finalize is the "commit" action — after
 * this, the roster and its slots are immutable (concept/09 §"Write protection"
 * + concept/12 Step 2.2).
 *
 * The roster's current slots must already form a complete, valid lineup
 * (exactly `warSize` slots, unique members, contiguous positions). The route
 * re-validates from the DB before finalizing to catch a stale client state.
 *
 * On success, stamps `status = "finalized"`, `finalizedAt = now`, and
 * `configVersion = v<SETTINGS_VALIDATION_VERSION>` (the auto-select config
 * snapshot required by concept/09 §"Confidence and explanation" #4).
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { authenticated } = await getAdminSession();
  if (!authenticated) {
    console.warn("[audit] roster finalize rejected: unauthenticated");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid roster id" }, { status: 400 });
  }

  // Re-validate the persisted roster before finalizing — a client could have
  // stale state where the draft was never saved with a complete lineup.
  const existing = await getRoster(id);
  if (!existing) {
    return NextResponse.json({ error: "Roster not found" }, { status: 404 });
  }

  const toValidate: RosterInput = {
    title: existing.title,
    warSize: existing.warSize as RosterInput["warSize"],
    slots: existing.slots,
  };
  const result = validateRoster(toValidate, /* requireFull */ true);
  if (!result.ok) {
    return NextResponse.json(
      { error: "Roster is not ready to finalize", errors: result.errors },
      { status: 400 },
    );
  }

  try {
    const roster = await finalizeRoster(id, /* finalizedBy */ "admin");
    console.info(`[audit] roster ${id} finalized by admin`);
    return NextResponse.json({ roster });
  } catch (err) {
    if (err instanceof ConflictError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    if (err instanceof NotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[audit] roster ${id} finalize failed: ${msg}`);
    return NextResponse.json(
      { error: "Failed to finalize roster" },
      { status: 500 },
    );
  }
}
