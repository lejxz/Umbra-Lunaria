# Log 097 — Fix CI: Revert Incompatible ESLint/Dependency Version Bumps

**Date:** 2026-07-26
**Time:** 11:55 PM (+08:00)

## Summary of Session
The GitHub Actions CI workflow ("Typecheck + Lint + Test") was failing on every
push since commit `1243eaa`. Root cause: that commit bumped `eslint` from `^9`
to `^10.8.0` and `eslint-config-next` from `^15.4.0` to `^16.2.12`, both of
which are incompatible with the project's `@eslint/eslintrc` FlatCompat-based
config and its Next.js 15 runtime. Locally lint passed because `bun.lock`
pinned the old compatible versions, but CI had no committed lockfile
(`bun.lock` was gitignored) so it resolved the broken new versions.

## Root Cause Analysis

### The CI failure
```
ESLint: 10.8.0
TypeError: Converting circular structure to JSON
    at @eslint/eslintrc/lib/shared/config-validator.js:308:45
    at ConfigValidator.formatErrors → validateConfigSchema
    → _loadExtendedShareableConfig → _loadExtends
```

ESLint 10's config-schema validator returns error objects with circular
references that `@eslint/eslintrc@3.3.6`'s legacy `FlatCompat` bridge tries to
`JSON.stringify`, crashing. Additionally, `eslint-config-next@16` is built for
Next.js 16, not the Next.js 15 this project runs.

### Why local passed but CI didn't
- **Local**: `bun.lock` (160 KB, untracked) pinned `eslint@9.39.5` +
  `eslint-config-next@15.5.22`. `bun install` honored the lockfile.
- **CI**: `bun.lock` was in `.gitignore` (sandbox-added entry), so
  `bun install --frozen-lockfile` had no lockfile and resolved fresh from
  `package.json`'s `^10.8.0` / `^16.2.12` ranges → installed the broken versions.

### The offending commit
`1243eaa` ("fix: build errors, eslint compatibility, and missing prop types")
made these package.json changes:
- `eslint`: `^9.0.0` → `^10.8.0` ← breaks FlatCompat config
- `eslint-config-next`: `^15.4.0` → `^16.2.12` ← wrong major for Next.js 15
- `drizzle-orm`: `^0.44.0` → `^0.45.2` ← unnecessary major bump
- `vitest`: `^2.1.9` → `^4.1.10` ← unnecessary major bump
- `@vitest/expect`: `^2.1.9` → `^4.1.10` ← matched vitest bump
- `drizzle-kit`: `^0.31.0` → `^0.31.10` ← benign but reverted for consistency
- Added `lodash: ^4.18.1` ← version doesn't exist (latest is 4.17.21); also unused

## Work Completed

### 1. Reverted package.json version ranges
- `eslint`: `^10.8.0` → `^9.0.0` (ESLint 9, compatible with FlatCompat bridge)
- `eslint-config-next`: `^16.2.12` → `^15.4.0` (matches Next.js 15)
- `drizzle-orm`: `^0.45.2` → `^0.44.0`
- `vitest`: `^4.1.10` → `^2.1.9`
- `@vitest/expect`: `^4.1.10` → `^2.1.9`
- `drizzle-kit`: `^0.31.10` → `^0.31.0`
- Removed `lodash: ^4.18.1` (unused — grep confirmed no imports; version
  doesn't exist on npm)

### 2. Committed `bun.lock`
- Removed `bun.lock` and `bun.lockb` from `.gitignore` (they were under the
  "sandbox / dev-tooling" section, not part of the original project).
- `bun.lock` is now tracked so CI's `bun install --frozen-lockfile` uses the
  pinned versions (eslint@9.39.5, eslint-config-next@15.5.22, vitest@2.1.9,
  drizzle-orm@0.44.7) instead of resolving fresh.
- Ran `bun install` to sync the lockfile with the reverted package.json.

### 3. Verified with a clean CI simulation
- Copied `package.json` + `bun.lock` to a temp dir, ran
  `bun install --frozen-lockfile` → succeeded, installed eslint@9.39.5 +
  eslint-config-next@15.5.22 (not the broken 10.x/16.x).
- `bun run typecheck` → clean (no errors)
- `bun run lint` → 0 errors, 2 pre-existing warnings
- `bun run test` → 147/147 pass (13 test files)

## Decisions Made
- **Revert rather than migrate**: ESLint 10 + eslint-config-next 16 would
  require rewriting `eslint.config.mjs` to drop the `FlatCompat` bridge and
  use native flat config — but eslint-config-next 16 is for Next.js 16, which
  this project doesn't run. Reverting to the versions matching Next.js 15 is
  correct.
- **Commit `bun.lock`**: The CI workflow already uses `--frozen-lockfile`,
  which implies the project intends to use a lockfile. Committing it makes CI
  reproducible and prevents this class of drift. The `.gitignore` entries were
  sandbox artifacts, not project policy.
- **Keep the 2 lint warnings**: `isSameDayInClanTz` (unused import in
  `queries.ts`) and `label` (unused var in `needs-attention.tsx`) are
  pre-existing and don't fail CI (ESLint exits 0 on warnings by default).

## Verification
- `bun run typecheck` → clean
- `bun run lint` → 0 errors, 2 warnings (pre-existing)
- `bun run test` → 147/147 pass
- Clean `--frozen-lockfile` install → correct versions installed

## Next Action
Push and confirm the next CI run passes.
