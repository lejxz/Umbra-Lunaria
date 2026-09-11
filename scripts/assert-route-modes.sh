#!/usr/bin/env bash
#
# Route-mode assertion (docs/2026-09-10 assessment §8.2, "Testing" #2).
#
# A single `cookies()` call in the root layout once silently flipped every
# route to dynamic rendering, defeating the app's entire ISR/egress strategy
# (assessment finding A-1) — and nothing noticed for weeks because no build
# output was ever checked. This script parses a `next build` log and fails
# unless the six content routes render ○ (Static) with their intended
# revalidate periods and the API routes stay ƒ (Dynamic).
#
# Usage: scripts/assert-route-modes.sh [build.log]
#   (default: build.log in the repo root — run `next build 2>&1 | tee build.log`)

set -euo pipefail

BUILD_LOG="${1:-build.log}"

if [ ! -f "$BUILD_LOG" ]; then
  echo "❌ build log not found: $BUILD_LOG (run: bunx next build 2>&1 | tee build.log)" >&2
  exit 1
fi

fail() { echo "❌ $1" >&2; exit 1; }

# assert_static <route> <revalidate-token>
#   route         e.g. "/members" (or "/" for the root)
#   revalidate    expected ISR period as printed ("15m", "1h", "5m"), or "" to skip
assert_static() {
  local route="$1" revalidate="$2"
  local pattern=" ○ ${route} "

  local line
  line=$(grep -F "$pattern" "$BUILD_LOG" || true)
  if [ -z "$line" ]; then
    local found
    found=$(grep -E " ${route}( |$)" "$BUILD_LOG" | head -1 || true)
    fail "route ${route} is NOT static (expected ○ with ISR). Route-table line: '${found:-<absent>}'"
  fi
  if [ -n "$revalidate" ] && ! echo "$line" | grep -qF " ${revalidate} "; then
    fail "route ${route} has the wrong revalidate period — expected ${revalidate}: ${line}"
  fi
  echo "✓ ${route} ○ Static (Revalidate ${revalidate})"
}

# assert_dynamic <route>
assert_dynamic() {
  local route="$1"
  if ! grep -qF " ƒ ${route}" "$BUILD_LOG"; then
    fail "API route ${route} is missing or no longer dynamic (expected ƒ)"
  fi
  echo "✓ ${route} ƒ Dynamic"
}

echo "Asserting ISR route modes from ${BUILD_LOG}…"

assert_static "/" "15m"
assert_static "/capital" "1h"
assert_static "/hall-of-fame" "1h"
assert_static "/members" "1h"
assert_static "/strategy" "1h"
assert_static "/war" "5m"

assert_dynamic "/api/cron/purge"
assert_dynamic "/api/ingest"
assert_dynamic "/api/members/[tag]"
assert_dynamic "/api/war/[id]"
assert_dynamic "/api/war/refresh"

echo "✅ All content routes are Static (ISR) with intended periods; API routes dynamic."
