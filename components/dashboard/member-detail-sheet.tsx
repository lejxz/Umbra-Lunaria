"use client";

import { useState, useEffect, useRef } from "react";
import { Modal } from "@/components/ui/modal";
import type { MemberDetailView } from "@/lib/view-models/members";
import { MemberDetailContent } from "@/components/members/member-detail-sheet";

/**
 * Dashboard member detail sheet — fetches the full member detail from
 * /api/members/[tag] when a member is clicked, then renders the same
 * MemberDetailContent used by the Members page. This ensures UI consistency
 * between the dashboard popup and the members popup.
 *
 * fix B-8 (docs/2026-09-11-priority-fixes.md): the fetch now uses an
 * AbortController + per-session memo — rapid clicks on member A then B can
 * no longer resolve out of order and render A's data under B's sheet, and
 * reopening a previously viewed member doesn't refetch.
 */
export function MemberDetailSheet({
  playerTag,
  onClose,
}: {
  playerTag: string | null;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<MemberDetailView | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const cacheRef = useRef(new Map<string, MemberDetailView>());

  useEffect(() => {
    if (!playerTag) {
      abortRef.current?.abort();
      abortRef.current = null;
      setDetail(null);
      setError(null);
      setLoading(false);
      return;
    }

    const cached = cacheRef.current.get(playerTag);
    if (cached) {
      abortRef.current?.abort();
      abortRef.current = null;
      setDetail(cached);
      setError(null);
      setLoading(false);
      return;
    }

    // Abort any in-flight request so a slow response for member A can never
    // overwrite the state while member B's sheet is opening.
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    // URL-encode the tag (replace # with %23 for the URL)
    const encodedTag = encodeURIComponent(playerTag);
    fetch(`/api/members/${encodedTag}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: MemberDetailView) => {
        if (controller.signal.aborted) return;
        cacheRef.current.set(playerTag, data);
        setDetail(data);
        setLoading(false);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      });

    return () => controller.abort();
  }, [playerTag]);

  return (
    <Modal
      open={playerTag !== null}
      onClose={onClose}
      aria-labelledby="member-detail-title"
      maxWidth="max-w-4xl"
    >
      {loading && (
        <div className="flex flex-col items-center justify-center gap-3 py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-umbra-purple border-t-transparent" />
          <p className="text-sm text-umbra-muted">Loading member…</p>
        </div>
      )}
      {error && (
        <div className="py-8 text-center text-sm text-red-400">
          Failed to load member: {error}
        </div>
      )}
      {detail && !loading && !error && (
        <MemberDetailContent detail={detail} />
      )}
    </Modal>
  );
}
