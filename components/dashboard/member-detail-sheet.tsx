"use client";

import Image from "next/image";
import { Modal } from "@/components/ui/modal";
import { Badge, UnavailableValue } from "@/components/ui";

/**
 * Shared member-detail sheet shell. This is a minimal version for Phase 1.2 —
 * the full member detail (with activity, donations, war participation, career,
 * progression cards) will be built in Phase 1.3 (Members page).
 *
 * For now, this shows the basic member info available from the dashboard's
 * activity score data. It receives the full member list from the dashboard
 * so it can display any member that appears in the leaderboard, needs-attention,
 * or clan log panels.
 */
export function MemberDetailSheet({
  playerTag,
  onClose,
  members,
}: {
  playerTag: string | null;
  onClose: () => void;
  members: Map<
    string,
    {
      name: string;
      role: string;
      townHallLevel: number | null;
      league?: { name: string; iconUrls?: { small?: string; tiny?: string } } | null;
      leagueTier?: { name: string; iconUrls?: { small?: string } } | null;
      warPreference?: string | null;
      score?: number;
      scoreComponents?: Array<{ name: string; available: boolean; points: number }>;
    }
  >;
}) {
  const open = playerTag !== null;
  const member = playerTag !== null ? members.get(playerTag) : undefined;

  return (
    <Modal
      open={open}
      onClose={onClose}
      aria-labelledby="member-detail-title"
    >
      {member && (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-[.16em] text-umbra-purple">
                Member summary
              </p>
              <h2 id="member-detail-title" className="mt-1 font-display text-2xl text-umbra-lilac">
                {member.name}
              </h2>
              <p className="mt-1 font-mono text-xs text-umbra-muted">
                {playerTag}
              </p>
            </div>
            {member.townHallLevel && (
              <div className="shrink-0 rounded-xl bg-umbra-purple/15 px-4 py-2 text-center">
                <p className="font-mono text-[9px] uppercase tracking-wider text-umbra-muted">
                  Town Hall
                </p>
                <p className="font-display text-2xl font-bold text-umbra-purple">
                  {member.townHallLevel}
                </p>
              </div>
            )}
          </div>

          {/* League tier (new ranking system) — primary league display */}
          {member.leagueTier && (
            <div className="flex items-center gap-4 rounded-lg bg-white/[.035] p-3">
              {member.leagueTier.iconUrls?.small && (
                <Image
                  src={member.leagueTier.iconUrls.small}
                  alt={member.leagueTier.name}
                  width={36}
                  height={36}
                  className="h-9 w-9"
                  unoptimized
                />
              )}
              <div className="min-w-0">
                <p className="font-mono text-[9px] uppercase tracking-wider text-umbra-muted">
                  League tier
                </p>
                <p className="truncate text-sm font-semibold text-white">
                  {member.leagueTier.name}
                </p>
              </div>
            </div>
          )}

          {/* Quick facts */}
          <div className="grid grid-cols-2 gap-3">
            <Fact label="Role" value={member.role} />
            <Fact
              label="War preference"
              value={
                member.warPreference ? (
                  <Badge tone={member.warPreference === "in" ? "success" : "muted"}>
                    {member.warPreference === "in" ? "In" : "Out"}
                  </Badge>
                ) : (
                  <UnavailableValue />
                )
              }
            />
          </div>

          {/* Activity score */}
          {member.score !== undefined && (
            <div className="rounded-xl bg-white/[.035] p-4">
              <div className="flex items-center justify-between">
                <p className="font-mono text-[9px] uppercase tracking-wider text-umbra-muted">
                  Activity score · 30d
                </p>
                <p className="font-mono text-lg font-bold text-emerald-400">
                  {member.score.toFixed(1)}
                </p>
              </div>
              {member.scoreComponents && member.scoreComponents.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {member.scoreComponents.map((c) => (
                    <div
                      key={c.name}
                      className="flex items-center justify-between text-xs"
                    >
                      <span className="capitalize text-umbra-muted">{c.name}</span>
                      <span className="font-mono text-umbra-lilac">
                        {c.available ? c.points.toFixed(1) : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <p className="text-center text-xs text-umbra-muted">
            Full member detail available on the Members page (Phase 1.3)
          </p>
        </div>
      )}
    </Modal>
  );
}

function Fact({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-lg bg-white/[.035] p-3">
      <p className="font-mono text-[9px] uppercase tracking-wider text-umbra-muted">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}
