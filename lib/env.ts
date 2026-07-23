/**
 * Environment resolution helper.
 *
 * The cloud sandbox injects `DATABASE_URL=file:/home/z/my-project/db/custom.db`
 * (a SQLite default for the Next.js starter) into every process it spawns,
 * which overrides the real Neon Postgres URL stored in `.env` (shell env wins
 * over .env in both Bun and Next.js). This module reads `.env` directly and
 * returns the real connection string whenever the injected value is the
 * sandbox SQLite default. Every other variable is left to normal Bun/Next.js
 * .env loading.
 *
 * Used by `lib/db/index.ts` (runtime queries) and `drizzle.config.ts`
 * (migrations) so both resolve to the same Neon database regardless of the
 * sandbox injection. See concept/11-config-specification.md.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/** True when a value is the sandbox's injected SQLite default. */
function isSandboxSqliteDefault(value: string | undefined): boolean {
  return !!value && value.startsWith("file:");
}

/**
 * Parse a `.env` file into a plain object. Tolerates quotes, blank lines, and
 * comments. Kept minimal on purpose — not a general dotenv replacement.
 */
function parseEnvFile(filePath: string): Record<string, string> {
  const out: Record<string, string> = {};
  let raw: string;
  try {
    raw = readFileSync(filePath, "utf8");
  } catch {
    return out;
  }
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

/**
 * Resolve the database URL to use. Prefers a real process.env postgres URL;
 * falls back to the `.env` value when the env value is missing or is the
 * sandbox's SQLite `file:` default. Throws if no usable URL can be found.
 *
 * Also strips `sslmode` and Supabase-specific `supa` query params from the
 * returned URL so that pg-connection-string never applies strict
 * sslmode=require/verify-full semantics. Callers that need SSL pass
 * `ssl: { rejectUnauthorized: false }` explicitly in their pool config.
 */
export function resolveDatabaseUrl(): string {
  const env = process.env.DATABASE_URL;
  if (env && !isSandboxSqliteDefault(env)) {
    return sanitizeDbUrl(env);
  }
  const fromFile = parseEnvFile(resolve(process.cwd(), ".env"))["DATABASE_URL"];
  if (fromFile && !isSandboxSqliteDefault(fromFile)) {
    return sanitizeDbUrl(fromFile);
  }
  if (env) return sanitizeDbUrl(env); // last resort — let the caller surface the bad URL
  throw new Error(
    "DATABASE_URL is not set. See .env.example and concept/11-config-specification.md.",
  );
}

/**
 * Strip SSL-mode and Supabase-specific query params from a postgres URL so
 * that pg-connection-string doesn't apply strict sslmode=require/verify-full
 * semantics. SSL is handled explicitly by each caller's pool config.
 */
function sanitizeDbUrl(url: string): string {
  try {
    const u = new URL(url);
    u.searchParams.delete("sslmode");
    u.searchParams.delete("supa");
    return u.toString();
  } catch {
    // Not a parseable URL (e.g. sandbox SQLite path) — return as-is.
    return url;
  }
}
