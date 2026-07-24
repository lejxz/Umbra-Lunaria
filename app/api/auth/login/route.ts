import { NextRequest, NextResponse } from "next/server";
import {
  verifyAdminPassword,
  createSessionToken,
  setSessionCookie,
  isAdminAuthConfigured,
} from "@/lib/auth/session";
import { checkLoginRateLimit } from "@/lib/auth/rate-limit";

/**
 * POST /api/auth/login
 *
 * Authenticates the administrator and sets a session cookie. The session is
 * a signed HMAC token stored in a secure, HttpOnly, SameSite=Strict cookie
 * (see lib/auth/session.ts). Read-only pages remain public; this session
 * only gates write actions (roster drafts, runtime settings).
 *
 * Request body: `{ password: string }`.
 *
 * Responses:
 *  - 200 `{ ok: true }` — login succeeded, cookie set.
 *  - 400 `{ error: "Password is required" }`.
 *  - 401 `{ error: "Invalid password" }`.
 *  - 429 `{ error: "Too many attempts", retryAfterMs }` — rate limited.
 *  - 503 `{ error: "Admin auth not configured" }` — env vars missing.
 *
 * Rate limiting: 10 attempts / 10 min per client IP (warm-instance scope).
 */
export async function POST(req: NextRequest) {
  if (!isAdminAuthConfigured()) {
    return NextResponse.json(
      { error: "Admin auth not configured" },
      { status: 503 },
    );
  }

  const ip = getClientIp(req);
  const decision = checkLoginRateLimit(ip);
  if (!decision.allowed) {
    return NextResponse.json(
      { error: "Too many attempts", retryAfterMs: decision.retryAfterMs },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(decision.retryAfterMs / 1000)) },
      },
    );
  }

  const body = await req.json().catch(() => ({}));
  const password = typeof body?.password === "string" ? body.password : "";
  if (!password) {
    return NextResponse.json(
      { error: "Password is required" },
      { status: 400 },
    );
  }

  if (!verifyAdminPassword(password)) {
    // Use the same message for "wrong password" and "no such user" so an
    // attacker can't distinguish them — though there is only one admin.
    return NextResponse.json(
      { error: "Invalid password" },
      { status: 401 },
    );
  }

  const token = createSessionToken();
  await setSessionCookie(token);
  return NextResponse.json({ ok: true });
}

/**
 * Best-effort client-IP extraction. Falls back to a constant when no proxy
 * headers are present (local dev) so the rate limiter still has a key.
 */
function getClientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  const cf = req.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  return "local";
}
