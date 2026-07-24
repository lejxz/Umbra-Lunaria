import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth/session";

/**
 * POST /api/auth/logout
 *
 * Clears the admin session cookie. Always returns 200 — calling logout with
 * no active session is a no-op, not an error. Idempotent so the client can
 * call it on "clean up" paths without checking session state first.
 */
export async function POST() {
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
