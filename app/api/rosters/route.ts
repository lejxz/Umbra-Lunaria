import { NextResponse } from "next/server";

/**
 * POST/PATCH /api/rosters
 * Phase 2 — see concept/09-war-planning-and-auto-select.md. Will save/update
 * draft war_rosters + war_roster_slots rows from the planning UI.
 */
export async function POST() {
  return NextResponse.json({ error: "not implemented — Phase 2" }, { status: 501 });
}

export async function PATCH() {
  return NextResponse.json({ error: "not implemented — Phase 2" }, { status: 501 });
}
