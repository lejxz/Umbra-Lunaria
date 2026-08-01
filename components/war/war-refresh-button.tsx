"use client";

// NOTE: The refresh button is temporarily disabled for egress optimization
// (docs log 116). The full implementation is preserved below in a comment
// block for easy re-enablement. When re-enabling, uncomment the imports and
// the component body, and remove the stub return.
//
// import { useState, useEffect, useRef } from "react";
// import { useRouter } from "next/navigation";
// import { IconSync, IconLoader, IconAlert } from "@/components/ui/icons";

/**
 * War refresh control — POSTs /api/war/refresh, which fetches the current war
 * server-side behind a shared TTL (docs/concept/07 §"Refresh behavior"). The
 * browser never calls Supercell directly. Shows loading, success, cached
 * (rate-limited), and error states, and triggers a client-side router refresh
 * on success so the new capture time + state render without a hard reload.
 */
export function WarRefreshButton({ ttlSeconds }: { ttlSeconds: number }) {
  void ttlSeconds; // temporarily disabled — egress optimization (docs log 116)
  return null;
}
