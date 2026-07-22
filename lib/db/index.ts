import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { resolveDatabaseUrl } from "@/lib/env";
import * as schema from "./schema";

const connectionString = resolveDatabaseUrl();
const sql = neon(connectionString);

export const db = drizzle(sql, { schema });
