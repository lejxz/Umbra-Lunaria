import { defineConfig } from "drizzle-kit";
import { resolveDatabaseUrl } from "./lib/env";

const url = resolveDatabaseUrl();

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url,
  },
});
