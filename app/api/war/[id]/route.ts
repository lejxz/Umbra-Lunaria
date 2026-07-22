import { NextRequest, NextResponse } from "next/server";
import { getWarDetail } from "@/lib/db/war-queries";

/**
 * GET /api/war/[id]
 * Returns the full WarDetailView (parsed snapshot + attack log + analysis) for
 * a live-tracked war by id. Used by the War Center's history "View details"
 * button, which opens a popup with the full analysis.
 *
 * Returns 404 when the war doesn't exist or has no snapshot (backfill rows
 * from the public war log have no roster/attack detail and are not
 * detail-able — the UI disables the button for those rows).
 *
 * Public read-only (concept/01 "Read and write policy") — war data is public
 * to anyone with the URL.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: raw } = await params;
  const warId = Number(raw);
  if (!Number.isFinite(warId) || warId <= 0) {
    return NextResponse.json(
      { error: "Invalid war id" },
      { status: 400 },
    );
  }

  try {
    const detail = await getWarDetail(warId);
    if (!detail) {
      return NextResponse.json(
        { error: "War not found or no detail available" },
        { status: 404 },
      );
    }
    return NextResponse.json(detail);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
