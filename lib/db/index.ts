import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. See .env.example and concept/11-config-specification.md.",
  );
}

const sql = neon(process.env.DATABASE_URL);

export const db = drizzle(sql, { schema });
