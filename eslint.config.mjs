// ESLint 9 flat config.
// See concept/12-Implemantation-plan-and-modularity.md Step 1.0.A — a working
// ESLint 9 flat configuration so `npm run lint` succeeds.
//
// eslint-config-next ships in the legacy eslintrc format, so we use
// @eslint/eslintrc's FlatCompat to bridge it into the flat config array.
import { FlatCompat } from "@eslint/eslintrc";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});



const eslintConfig = [
  // Ignore build artifacts and vendored files.
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "drizzle/**",
      "public/**",
      "*.config.*",
      "postcss.config.js",
      "next-env.d.ts",
      "vitest.config.ts",
      // Sandbox / dev-tooling — not part of the Umbra Lunaria project.
      "examples/**",
      "skills/**",
      "mini-services/**",
      "upload/**",
      "download/**",
      ".zscripts/**",
    ],
  },
  // Extend Next.js core-web-vitals + TypeScript rules.
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  // fix (docs/2026-09-10 assessment §6.5): `react-hooks/set-state-in-effect`
  // used to be disabled GLOBALLY to silence one legitimate mount-guard
  // pattern (portals need `document`, so they setState after mount). Global
  // disables hide real cascading-render bugs everywhere else, so the override
  // is removed. With the current eslint-plugin-react-hooks the repo lints
  // clean with the rule active; if it ever fires on the intentional
  // mount-guard in components/ui/modal.tsx (`useMounted`), scope an inline
  // eslint-disable comment there instead of re-adding a global off.
];

export default eslintConfig;
