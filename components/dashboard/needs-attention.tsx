import type { NeedsAttention as NeedsAttentionData } from "@/lib/view-models/dashboard";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { MemberDetailSheet } from "@/components/members/member-detail-sheet";
import { IconClock, IconSwords, IconShieldOff } from "@/components/ui/icons";

export function AttentionPanel({
  title,
  subtitle,
  groups,
  onMemberClick,
}: {
  title: string;
  subtitle: string;
  groups: Array<{
    label: string;
    tone: "warning" | "danger" | "muted";
    icon: "clock" | "swords" | "shield";
    members: Array<{
      playerTag: string;
      name: string;
      role: string;
      townHallLevel: number | null;
      reason: string;
      detail: string | null;
    }>;
  }>;
  onMemberClick?: (playerTag: string) => void;
}) {
  const totalSignals = groups.reduce((acc, group) => acc + group.members.length, 0);

  return (
    <section
      className="glass flex flex-col rounded-2xl p-5 h-[350px]"
      aria-labelledby={`attention-title-${title.toLowerCase().replace(/\s+/g, "-")}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="font-mono text-label uppercase tracking-[.16em] text-umbra-purple">
          {subtitle}
        </p>
        <Badge tone={totalSignals > 0 ? (groups.some(g => g.tone === "danger" || g.tone === "warning") ? "warning" : "muted") : "muted"}>
          {totalSignals} {totalSignals === 1 ? "signal" : "signals"}
        </Badge>
      </div>
      <h3
        id={`attention-title-${title.toLowerCase().replace(/\s+/g, "-")}`}
        className="mt-1 font-display text-lg text-umbra-lilac"
      >
        {title}
      </h3>

      {totalSignals === 0 ? (
        <div className="mt-4 flex flex-1 items-center justify-center">
          <EmptyState
            title="All clear"
            description="No members found for this queue."
          />
        </div>
      ) : (
        <div className="mt-4 flex-1 space-y-4 overflow-y-auto pr-2">
          {groups.map((group) => {
            if (group.members.length === 0) return null;
            return (
              <AttentionGroup
                key={group.label}
                label={group.label}
                tone={group.tone}
                icon={group.icon}
                members={group.members}
                onMemberClick={onMemberClick}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}

function AttentionGroup({
  label,
  tone,
  icon,
  members,
  onMemberClick,
}: {
  label: string;
  tone: "warning" | "danger" | "muted";
  icon: "clock" | "swords" | "shield";
  members: Array<{
    playerTag: string;
    name: string;
    role: string;
    townHallLevel: number | null;
    reason: string;
    detail: string | null;
  }>;
  onMemberClick?: (playerTag: string) => void;
}) {
  const color =
    tone === "warning"
      ? "text-amber-400"
      : tone === "danger"
        ? "text-red-400"
        : "text-umbra-muted";

  return (
    <div>
      <div className="space-y-1.5">
        {members.map((m) => (
          <button
            key={m.playerTag}
            onClick={() => onMemberClick?.(m.playerTag)}
            className="flex w-full items-center justify-between gap-2.5 rounded-lg bg-white/[.035] px-3 py-2 text-left transition hover:bg-white/[.06] focus-ring"
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded bg-black/20 ${color}`}>
                {icon === "clock" && <IconClock className="h-4 w-4" />}
                {icon === "swords" && <IconSwords className="h-4 w-4" />}
                {icon === "shield" && <IconShieldOff className="h-4 w-4" />}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm text-umbra-lilac">{m.name}</p>
                <p className="truncate text-2xs text-umbra-muted">
                  {m.detail ?? m.reason}
                </p>
              </div>
            </div>
            {m.townHallLevel && (
              <Badge tone="brand">TH{m.townHallLevel}</Badge>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
