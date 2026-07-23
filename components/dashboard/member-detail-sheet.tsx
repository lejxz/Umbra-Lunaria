"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import type { MemberDetailView } from "@/lib/view-models/members";
import { MemberDetailContent } from "@/components/members/member-detail-sheet";

/**
 * Dashboard member detail sheet — fetches the full member detail from
 * /api/members/[tag] when a member is clicked, then renders the same
 * MemberDetailContent used by the Members page. This ensures UI consistency
 * between the dashboard popup and the members popup.
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

  useEffect(() => {
    if (!playerTag) {
      setDetail(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    // URL-encode the tag (replace # with %23 for the URL)
    const encodedTag = encodeURIComponent(playerTag);
    fetch(`/api/members/${encodedTag}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setDetail(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
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
