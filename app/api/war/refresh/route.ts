import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { clanConfig } from "@/config/clan.config";
import {
  refreshCurrentWar,
  type RefreshResult,
} from "@/lib/ingest/war-sync";

/**
 * POST /api/war/refresh
 *
 * Public (no administrator secret) — per docs/concept/07 §"Refresh behavior" and
 * docs/concept/01 "Read and write policy", a war refresh is a public request that
 * is server-side rate-limited and cached. The browser never calls Supercell
 * directly.
 *
 * Backed by a shared 45-second TTL (within the "30–60 second" band from the
 * concept): concurrent requests within the window collapse into the cached
 * result, preventing refresh bursts from hammering the CoC API. The response
 * always reports the capture time and any safe error state so the UI can show
 * freshness + failure reason without a fabricated value.
 */

const TTL_MS = 45_000;

// Module-level cache — shared across all requests in the serverless instance.
let cachedAt: number | null = null;
let cachedResult: RefreshResult | null = null;

export async function POST() {
  const now = Date.now();

  // ---- Shared TTL window ----
  if (cachedAt !== null && cachedResult !== null && now - cachedAt < TTL_MS) {
    return NextResponse.json({
      ...cachedResult,
      cached: true,
      ttlSeconds: Math.max(0, Math.round((TTL_MS - (now - cachedAt)) / 1000)),
    });
  }

  const result = await refreshCurrentWar(clanConfig.clanTag);

  cachedAt = now;
  cachedResult = result;

  // Revalidate ONLY the war page — not the entire layout. The layout-level
  // bust was causing ALL pages to re-render on every war refresh click,
  // driving egress. The dashboard's own ISR will pick up war changes on its
  // 15-min cycle. (docs log 116)
  if (result.ok) {
    revalidatePath("/war", "page");
  }

  return NextResponse.json({
    ...result,
    cached: false,
    ttlSeconds: Math.round(TTL_MS / 1000),
  });
}
