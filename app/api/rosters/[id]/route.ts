import { NextRequest, NextResponse } from "next/server";
import { getRoster } from "@/lib/planning/roster-service";

/**
 * GET /api/rosters/[id] — fetch a single roster with its slots.
 *
 * Public read (matches the rosters list route). Returns 404 when the roster
 * doesn't exist.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid roster id" }, { status: 400 });
  }

  try {
    const roster = await getRoster(id);
    if (!roster) {
      return NextResponse.json({ error: "Roster not found" }, { status: 404 });
    }
    return NextResponse.json({ roster });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[audit] roster ${id} get failed: ${msg}`);
    return NextResponse.json(
      { error: "Failed to load roster" },
      { status: 500 },
    );
  }
}
