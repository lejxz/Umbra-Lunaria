"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import type { MemberDetailView } from "@/lib/view-models/members";
import { MemberDetailContent } from "@/components/members/member-detail-sheet";
import { IconLoader, IconAlert } from "@/components/ui/icons";

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
          <IconLoader className="h-8 w-8 animate-spin text-umbra-purple" />
          <p className="font-mono text-label uppercase tracking-wider text-umbra-faint">
            Loading member…
          </p>
        </div>
      )}
      {error && (
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-rose-400/30 bg-rose-400/10 text-rose-300">
            <IconAlert className="h-6 w-6" />
          </div>
          <p className="text-sm text-rose-300">Failed to load member: {error}</p>
        </div>
      )}
      {detail && !loading && !error && (
        <MemberDetailContent detail={detail} />
      )}
    </Modal>
  );
}
