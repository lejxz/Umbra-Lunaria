/**
 * Administrator session management.
 *
 * Design (see concept/11-config-specification.md §"Administrative protection"
 * and concept/12 Step 2.0):
 *
 * - No player account system. A single shared administrator credential gates
 *   write actions (roster drafts, runtime settings).
 * - The password is verified server-side against a scrypt hash stored in the
 *   `ADMIN_PASSWORD_HASH` env var (`scrypt:<salt>:<hash>` format). The `:`
 *   delimiter is used instead of `$` because Next.js's dotenv loader expands
 *   `$` as a variable reference, which would silently strip the salt and hash.
 * - A successful login mints a signed session token (HMAC-SHA256 over a
 *   payload of `{ exp, nonce }`). The token is stored in a secure,
 *   HttpOnly, SameSite=Strict cookie.
 * - Token verification is constant-time and rejects expired tokens.
 *
 * Why HMAC over JWT: we don't need the portability of JWT. A self-signed
 * HMAC token is smaller, has no alg-confusion attack surface, and the
 * verifier is the only party that ever reads it.
 *
 * All functions here are safe to call from server components / route handlers
 * (Node.js runtime). They must never be imported into client code.
 */

import {
  scryptSync,
  randomBytes,
  timingSafeEqual,
  createHmac,
} from "node:crypto";
import { cookies } from "next/headers";

/** Cookie name holding the admin session token. */
export const SESSION_COOKIE = "ul_admin_session";

/** Session lifetime in seconds (8 hours). */
export const SESSION_TTL_SECONDS = 8 * 60 * 60;

/** Leeway when comparing expiry (clock-skew tolerance, in seconds). */
const EXPIRY_LEEWAY_SECONDS = 5;

// ---------------------------------------------------------------------------
// Password verification
// ---------------------------------------------------------------------------

/**
 * Verify a plaintext password against the `ADMIN_PASSWORD_HASH` env var.
 *
 * The hash format is `scrypt:<salt-hex>:<hash-hex>`. Returns true only when
 * the env var is configured AND the password matches. A missing or malformed
 * env var always returns false (never throws to the caller) so a misconfigured
 * deployment fails closed (login rejected) rather than crashing.
 *
 * Comparison is constant-time via `timingSafeEqual`.
 */
export function verifyAdminPassword(password: string): boolean {
  const stored = process.env.ADMIN_PASSWORD_HASH;
  if (!stored || !password) return false;

  const parts = stored.split(":");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;

  // Guaranteed present by the length check above; TS can't narrow array access.
  const salt = parts[1]!;
  const expectedHash = parts[2]!;
  let saltBuf: Buffer;
  let expectedBuf: Buffer;
  try {
    saltBuf = Buffer.from(salt, "hex");
    expectedBuf = Buffer.from(expectedHash, "hex");
  } catch {
    return false;
  }
  if (saltBuf.length === 0 || expectedBuf.length === 0) return false;

  // Derive with the same parameters used at hash-creation time (keylen 64).
  const derived = scryptSync(password, saltBuf, 64);

  // timingSafeEqual requires equal-length buffers.
  if (derived.length !== expectedBuf.length) return false;
  return timingSafeEqual(derived, expectedBuf);
}

// ---------------------------------------------------------------------------
// Session token creation / verification (HMAC-signed)
// ---------------------------------------------------------------------------

interface SessionPayload {
  /** Absolute expiry, seconds since epoch. */
  exp: number;
  /** Random nonce to make tokens unique. */
  nonce: string;
}

/**
 * Mint a signed session token. Returns the opaque token string to place in a
 * cookie. Throws if `ADMIN_SESSION_SECRET` is not configured.
 *
 * Token format: `base64url(payload).base64url(hmac)` where payload is
 * `base64url(JSON{exp,nonce})`. This is deliberately not a JWT — no header,
 * no alg field, no ambiguity.
 */
export function createSessionToken(now: Date = new Date()): string {
  const secret = requireSessionSecret();
  const payload: SessionPayload = {
    exp: Math.floor(now.getTime() / 1000) + SESSION_TTL_SECONDS,
    nonce: randomBytes(16).toString("hex"),
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url",
  );
  const sig = createHmac("sha256", secret).update(payloadB64).digest("base64url");
  return `${payloadB64}.${sig}`;
}

/**
 * Verify a session token string. Returns `true` only when the signature is
 * valid (constant-time) and the token has not expired. A missing secret,
 * malformed token, bad signature, or expired token all return `false`
 * without throwing.
 */
export function verifySessionToken(
  token: string | undefined | null,
  now: Date = new Date(),
): boolean {
  if (!token) return false;
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) return false;

  const dot = token.lastIndexOf(".");
  if (dot <= 0) return false;
  const payloadB64 = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  // Recompute the expected signature.
  const expectedSig = createHmac("sha256", secret)
    .update(payloadB64)
    .digest("base64url");

  // Constant-time string compare. base64url strings are ASCII; compare as
  // buffers of equal length requirement.
  if (sig.length !== expectedSig.length) return false;
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length) return false;
  if (!timingSafeEqual(sigBuf, expBuf)) return false;

  // Signature valid — now check expiry.
  let payload: SessionPayload;
  try {
    payload = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf8"),
    ) as SessionPayload;
  } catch {
    return false;
  }
  if (typeof payload.exp !== "number") return false;
  const nowSec = Math.floor(now.getTime() / 1000);
  return payload.exp + EXPIRY_LEEWAY_SECONDS > nowSec;
}

/**
 * Read the current admin session state from the incoming cookies.
 *
 * Returns `{ authenticated: true }` or `{ authenticated: false }`. This is
 * the single entry point used by route handlers to decide whether a write
 * action is allowed.
 *
 * Must be awaited — `cookies()` is async in Next.js 15+.
 */
export async function getAdminSession(): Promise<{ authenticated: boolean }> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  return { authenticated: verifySessionToken(token) };
}

/**
 * Set the session cookie on the outgoing response. Called after a successful
 * login. The cookie is secure, HttpOnly, SameSite=Strict, and scoped to the
 * root path.
 */
export async function setSessionCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

/**
 * Clear the session cookie (logout).
 */
export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function requireSessionSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "ADMIN_SESSION_SECRET is not set. Configure it in .env — see .env.example.",
    );
  }
  return secret;
}

/**
 * True when the admin auth env vars are configured. Used by the login route
 * and the session-status route to surface a clear "not configured" state
 * instead of silently rejecting every login.
 */
export function isAdminAuthConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD_HASH && process.env.ADMIN_SESSION_SECRET);
}
