import { defineConfig } from "vitest/config";
import { resolve } from "path";

// See concept/12-Implemantation-plan-and-modularity.md Step 1.0.A —
// a lightweight test runner for pure data logic and route helpers.
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    exclude: ["node_modules/**", ".next/**"],
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "."),
    },
  },
});
