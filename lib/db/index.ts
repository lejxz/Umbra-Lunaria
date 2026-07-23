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
});

export const db = drizzle(pool, { schema });
