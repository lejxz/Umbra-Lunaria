"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MemberRoster } from "@/lib/view-models/members";
import type { ActivityScoreLeaderboard } from "@/lib/view-models/dashboard";
import { ScoreLeaderboard } from "./score-leaderboard";
import { MembersRoster } from "./members-roster";

/**
 * Members shell — composition root for the members page (Phase 2.1:
 * deep-linkable member profiles, docs/2026-09-11-implementation-plan.md §2.1).
 *
 * URL contract:
 *   /members?tag=%23XXXX opens that member's detail sheet on load.
 *   Selecting a member pushes ?tag= (a new history entry) so the browser
 *   Back button closes the sheet; switching members while a sheet is open
 *   replaces the entry instead of stacking one per click.
 *
 * Implementation note: the tag is read from `window.location.search` inside
 * a mount effect rather than `useSearchParams()`. Next 15's useSearchParams
 * would suspend the whole route on a client-side render boundary and force
 * /members out of static prerendering — breaking the ISR/route-modes CI
 * contract (scripts/assert-route-modes.sh expects ○ with revalidate 3600).
 * Reading location.search after mount is hydration-safe (first client
 * render matches the SSR output: sheet closed).
 */
export function MembersShell({
  roster,
  activityScore,
}: {
  roster: MemberRoster;
  activityScore: ActivityScoreLeaderboard;
}) {
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const mountedRef = useRef(false);

  // Open the deep-linked member (if any) and keep the sheet in sync with
  // browser navigation. popstate fires on Back/Forward — including Back
  // after we pushed a ?tag= entry, which is how "Back closes the sheet"
  // works.
  useEffect(() => {
    const readTag = () =>
      new URLSearchParams(window.location.search).get("tag");

    const initial = readTag();
    if (initial) {
      // Validate against the roster so a stale/typo'd link just lands on the
      // plain roster instead of opening an error sheet.
      setSelectedTag(
        roster.entries.some((m) => m.playerTag === initial) ? initial : null,
      );
    }
    mountedRef.current = true;

    const onPopState = () => setSelectedTag(readTag());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [roster.entries]);

  const handleSelect = useCallback((tag: string | null) => {
    setSelectedTag(tag);
    if (!mountedRef.current || typeof window === "undefined") return;

    const url = new URL(window.location.href);
    const currentTag = url.searchParams.get("tag");
    if (tag === currentTag) return;

    if (tag) {
      url.searchParams.set("tag", tag);
      if (currentTag) {
        // Switching members with a sheet already open — replace, don't stack
        // a history entry per click (Back should close, not walk back through
        // every member you clicked).
        window.history.replaceState(null, "", url);
      } else {
        // Opening — push so Back closes the sheet.
        window.history.pushState(null, "", url);
      }
    } else {
      // Closed via the sheet's close button — strip the tag without
      // navigating (the pushed entry is replaced; Back leaves the page,
      // same as any overlay).
      url.searchParams.delete("tag");
      window.history.replaceState(null, "", url);
    }
  }, []);

  return (
    <>
      <ScoreLeaderboard
        leaderboard={activityScore}
        onMemberClick={handleSelect}
      />
      <MembersRoster
        roster={roster}
        selectedTag={selectedTag}
        onMemberClick={handleSelect}
      />
    </>
  );
}
