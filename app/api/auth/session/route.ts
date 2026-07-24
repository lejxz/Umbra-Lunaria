import { NextResponse } from "next/server";
import {
  getAdminSession,
  isAdminAuthConfigured,
} from "@/lib/auth/session";

/**
 * GET /api/auth/session
 *
 * Public read of the current admin session state. This is safe to expose to
 * the client — it only returns whether a session exists and whether auth is
 * configured. It never returns the token or any credential material.
 *
 * The client uses this to decide whether to show "Login" or "Logout / Admin"
 * controls in the UI, and whether to gate write actions.
 *
 * Response: `{ authenticated: boolean, configured: boolean }`.
 */
export async function GET() {
  const { authenticated } = await getAdminSession();
  return NextResponse.json({
    authenticated,
    configured: isAdminAuthConfigured(),
  });
}
