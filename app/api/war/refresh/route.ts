import { NextResponse } from "next/server";

/**
 * POST /api/war/refresh
 * Phase 1 — see concept/07-clan-war.md. Will fetch currentwar fresh on
 * button press, update wars/war_participants, and return the latest state
 * behind a short server-side TTL cache.
 */
export async function POST() {
  return NextResponse.json({ error: "not implemented — Phase 1" }, { status: 501 });
}
