import { defineConfig } from "drizzle-kit";
import { resolveDatabaseUrl } from "./lib/env";

const url = resolveDatabaseUrl();

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url,
    // pg v8+ treats sslmode=require as verify-full; drizzle-kit's internal
    // postgres client needs this override to connect from Vercel to Supabase.
    ssl: { rejectUnauthorized: false },
  },
});
