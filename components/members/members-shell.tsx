"use client";

import { useState } from "react";
import type { MemberRoster, MemberDetailView } from "@/lib/view-models/members";
import type { ActivityScoreLeaderboard } from "@/lib/view-models/dashboard";
import { CardMount } from "@/components/ui/card-mount";
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
    <div className="space-y-5">
      <CardMount delay={0}>
        <ScoreLeaderboard
          leaderboard={activityScore}
          onMemberClick={setSelectedTag}
        />
      </CardMount>
      <CardMount delay={0.04}>
        <MembersRoster
          roster={roster}
          memberDetails={memberDetails}
          selectedTag={selectedTag}
          onMemberClick={setSelectedTag}
        />
      </CardMount>
    </div>
  );
}
