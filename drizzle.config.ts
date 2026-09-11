import { defineConfig } from "drizzle-kit";
import { resolveDatabaseUrl } from "./lib/env";

// Dev tooling: allowEnvFile keeps the .env fallback available during local
// `bun run build` (Next sets NODE_ENV=production there, but the developer
// still relies on .env — see lib/env.ts).
const url = resolveDatabaseUrl({ allowEnvFile: true });

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
