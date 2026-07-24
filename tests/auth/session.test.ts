import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { scryptSync, randomBytes } from "node:crypto";
import {
  verifyAdminPassword,
  createSessionToken,
  verifySessionToken,
  SESSION_TTL_SECONDS,
} from "@/lib/auth/session";

/**
 * Tests for the admin session primitives.
 *
 * The session module reads env vars (`ADMIN_PASSWORD_HASH`,
 * `ADMIN_SESSION_SECRET`), so each test sets/clears them as needed. Token
 * creation requires the secret; password verification requires the hash.
 *
 * These cover concept/12 Step 2.0 checkboxes: "Test public reads, unauthorized
 * writes, authorized writes, cookie expiration, and settings validation."
 */
describe("verifyAdminPassword", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("accepts the correct password", () => {
    const salt = randomBytes(16).toString("hex");
    // Use Buffer.from(hex) to match the implementation in lib/auth/session.ts.
    const hash = scryptSync("hunter2", Buffer.from(salt, "hex"), 64).toString("hex");
    vi.stubEnv("ADMIN_PASSWORD_HASH", `scrypt:${salt}:${hash}`);

    expect(verifyAdminPassword("hunter2")).toBe(true);
  });

  it("rejects a wrong password", () => {
    const salt = randomBytes(16).toString("hex");
    const hash = scryptSync("hunter2", Buffer.from(salt, "hex"), 64).toString("hex");
    vi.stubEnv("ADMIN_PASSWORD_HASH", `scrypt:${salt}:${hash}`);

    expect(verifyAdminPassword("wrong")).toBe(false);
  });

  it("rejects when the env var is missing (fails closed)", () => {
    vi.stubEnv("ADMIN_PASSWORD_HASH", "");
    expect(verifyAdminPassword("anything")).toBe(false);
  });

  it("rejects when the hash format is malformed", () => {
    vi.stubEnv("ADMIN_PASSWORD_HASH", "not-a-valid-format");
    expect(verifyAdminPassword("anything")).toBe(false);
  });

  it("rejects an empty password even when configured", () => {
    const salt = randomBytes(16).toString("hex");
    const hash = scryptSync("hunter2", Buffer.from(salt, "hex"), 64).toString("hex");
    vi.stubEnv("ADMIN_PASSWORD_HASH", `scrypt:${salt}:${hash}`);
    expect(verifyAdminPassword("")).toBe(false);
  });
});

describe("session token create/verify", () => {
  beforeEach(() => {
    vi.stubEnv("ADMIN_SESSION_SECRET", "test-secret-key-for-vitest");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("round-trips a freshly minted token", () => {
    const token = createSessionToken();
    expect(verifySessionToken(token)).toBe(true);
  });

  it("rejects a tampered token (signature mismatch)", () => {
    const token = createSessionToken();
    const [payload, sig] = token.split(".");
    // Flip a character in the signature.
    const tamperedSig = sig!.replace(/^./, sig![0] === "a" ? "b" : "a");
    expect(verifySessionToken(`${payload}.${tamperedSig}`)).toBe(false);
  });

  it("rejects an expired token", () => {
    const token = createSessionToken();
    // Advance time past the TTL.
    const future = new Date(Date.now() + (SESSION_TTL_SECONDS + 10) * 1000);
    expect(verifySessionToken(token, future)).toBe(false);
  });

  it("accepts a token just inside the TTL", () => {
    const token = createSessionToken();
    const nearExpiry = new Date(Date.now() + (SESSION_TTL_SECONDS - 60) * 1000);
    expect(verifySessionToken(token, nearExpiry)).toBe(true);
  });

  it("rejects when the secret is missing", () => {
    // Mint a token with a valid secret, then clear it. verifySessionToken
    // should return false (not throw) when the secret env var is absent.
    const token = createSessionToken();
    vi.stubEnv("ADMIN_SESSION_SECRET", "");
    expect(verifySessionToken(token)).toBe(false);
  });

  it("rejects a token signed with a different secret", () => {
    vi.stubEnv("ADMIN_SESSION_SECRET", "secret-A");
    const token = createSessionToken();
    vi.stubEnv("ADMIN_SESSION_SECRET", "secret-B");
    expect(verifySessionToken(token)).toBe(false);
  });

  it("rejects malformed tokens", () => {
    expect(verifySessionToken("")).toBe(false);
    expect(verifySessionToken("no-dot-here")).toBe(false);
    expect(verifySessionToken("a.b.c")).toBe(false);
    expect(verifySessionToken(null)).toBe(false);
    expect(verifySessionToken(undefined)).toBe(false);
  });
});
