"use client";

import { useState } from "react";
import type { MemberRoster } from "@/lib/view-models/members";
import type { ActivityScoreLeaderboard } from "@/lib/view-models/dashboard";
import { ScoreLeaderboard } from "./score-leaderboard";
import { MembersRoster } from "./members-roster";

export function MembersShell({
  roster,
  activityScore,
}: {
  roster: MemberRoster;
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
        selectedTag={selectedTag}
        onMemberClick={setSelectedTag}
      />
    </>
  );
}
