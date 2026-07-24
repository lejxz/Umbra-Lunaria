import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/session";
import {
  getRuntimeSettings,
  saveRuntimeSettings,
} from "@/lib/settings/runtime";
import {
  DEFAULT_SETTINGS,
  validateSettings,
  type RuntimeSettings,
} from "@/lib/settings/defaults";

/**
 * /api/settings — runtime settings read/write.
 *
 * GET (public): Returns the effective runtime settings. Reads are public per
 * concept/11 §"Administrative protection" #3 — read-only pages stay public and
 * the settings object contains no secrets (only weights, thresholds, toggles).
 *
 * POST (protected): Replaces the settings document. Requires an authenticated
 * admin session cookie. Validates before persisting; invalid payloads are
 * rejected with 400 and the per-field error list. A successful write stamps
 * the audit columns (updatedAt, updatedBy) and logs an audit event.
 *
 * Audit: concept/11 #4 requires writes to "log an auditable actor/time/result
 * without storing secrets." The actor is recorded in the `updated_by` column
 * on the settings row. The console audit line below records the result of
 * each write attempt (actor omitted from logs — only "admin" — to avoid
 * leaking identity in log aggregators).
 */
export async function GET() {
  const settings = await getRuntimeSettings();
  return NextResponse.json({ settings, defaults: DEFAULT_SETTINGS });
}

export async function POST(req: NextRequest) {
  const { authenticated } = await getAdminSession();
  if (!authenticated) {
    // Audit: unauthorized write attempt.
    console.warn("[audit] settings write rejected: unauthenticated");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  // Defensive double-validation. saveRuntimeSettings also validates, but
  // validating here lets us return a clean 400 with the error list before
  // touching the database.
  const result = validateSettings(body);
  if (!result.ok) {
    console.warn(
      `[audit] settings write rejected: ${result.errors.length} validation error(s)`,
    );
    return NextResponse.json(
      { error: "Validation failed", errors: result.errors },
      { status: 400 },
    );
  }

  const settings = body as RuntimeSettings;
  let writeResult;
  try {
    writeResult = await saveRuntimeSettings(settings, /* updatedBy */ "admin");
  } catch (err) {
    // DB errors (connection failure, constraint violation) — return 500 with a
    // generic message so the client gets a clean response and the error is
    // surfaced in the server log.
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[audit] settings write failed: ${msg}`);
    return NextResponse.json(
      { error: "Failed to save settings" },
      { status: 500 },
    );
  }
  if (!writeResult.ok) {
    return NextResponse.json(
      { error: "Validation failed", errors: writeResult.errors },
      { status: 400 },
    );
  }

  console.info("[audit] settings write succeeded by admin");
  return NextResponse.json({ ok: true, settings });
}
