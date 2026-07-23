import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { resolveDatabaseUrl } from "@/lib/env";
import * as schema from "./schema";

const connectionString = resolveDatabaseUrl();
const pool = new Pool({
  connectionString,
  max: 1,
  idleTimeoutMillis: 5000,
  allowExitOnIdle: true,
  // pg v8+ treats sslmode=require as verify-full, which fails in serverless
  // environments (Vercel) that don't have Supabase's CA cert loaded.
  // rejectUnauthorized: false keeps the connection encrypted but skips
  // certificate verification — the standard approach for Supabase + pg
  // on any serverless/edge platform.
  ssl: { rejectUnauthorized: false },
});

export const db = drizzle(pool, { schema });
