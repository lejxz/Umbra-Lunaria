"use client";

import { useState } from "react";
import type { MemberRoster, MemberDetailView } from "@/lib/view-models/members";
import type { ActivityScoreLeaderboard } from "@/lib/view-models/dashboard";
import { ScoreLeaderboard } from "./score-leaderboard";
import { MembersRoster } from "./members-roster";

export function MembersShell({
  roster,
  memberDetails,
  activityScore,
}: {
  roster: MemberRoster;
  memberDetails: Record<string, MemberDetailView>;
  activityScore: ActivityScoreLeaderboard;
}) {
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  return (
    <>
      <ScoreLeaderboard
        leaderboard={activityScore}
        onMemberClick={setSelectedTag}
      />
      <MembersRoster
        roster={roster}
        memberDetails={memberDetails}
        selectedTag={selectedTag}
        onMemberClick={setSelectedTag}
      />
    </>
  );
}
