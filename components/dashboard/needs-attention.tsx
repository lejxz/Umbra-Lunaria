import type { NeedsAttention as NeedsAttentionData } from "@/lib/view-models/dashboard";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

/**
 * Needs-attention panel. Shows three separate lists:
 * 1. Members inactive beyond the configured threshold
 * 2. Members in an active war with attacks remaining
 * 3. Members whose war preference is "out" (informational, not an error)
 * See concept/05-dashboard.md §7.
 */
export function NeedsAttentionPanel({
  attention,
  onMemberClick,
}: {
  attention: NeedsAttentionData;
  onMemberClick?: (playerTag: string) => void;
}) {
  const totalSignals =
    attention.inactive.length +
    attention.attacksRemaining.length +
    attention.warPreferenceOut.length;

  return (
    <section
      className="glass flex flex-col rounded-2xl p-5"
      aria-labelledby="attention-title"
      style={{ minHeight: "380px" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[.16em] text-umbra-purple">
          Attention queue
        </p>
        <Badge tone={totalSignals > 0 ? "warning" : "muted"}>
          {totalSignals} {totalSignals === 1 ? "signal" : "signals"}
        </Badge>
      </div>
      <h3
        id="attention-title"
        className="mt-1 font-display text-lg text-umbra-lilac"
      >
        Needs attention
      </h3>

      {totalSignals === 0 ? (
        <div className="mt-4 flex flex-1 items-center justify-center">
          <EmptyState
            title="No attention items"
            description="All members are active and up to date."
          />
        </div>
      ) : (
        <div className="mt-4 flex-1 space-y-4 overflow-y-auto">
          {/* Attacks remaining */}
          {attention.attacksRemaining.length > 0 && (
            <AttentionGroup
              label="Attacks remaining"
              tone="warning"
              members={attention.attacksRemaining}
              onMemberClick={onMemberClick}
            />
          )}

          {/* Inactive */}
          {attention.inactive.length > 0 && (
            <AttentionGroup
              label={`Inactive (${attention.inactivityThresholdDays}d+)`}
              tone="danger"
              members={attention.inactive}
              onMemberClick={onMemberClick}
            />
          )}

          {/* War preference out */}
          {attention.warPreferenceOut.length > 0 && (
            <AttentionGroup
              label="Opted out of wars"
              tone="muted"
              members={attention.warPreferenceOut}
              onMemberClick={onMemberClick}
            />
          )}
        </div>
      )}
    </section>
  );
}

function AttentionGroup({
  label,
  tone,
  members,
  onMemberClick,
}: {
  label: string;
  tone: "warning" | "danger" | "muted";
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
      <p className={`mb-1.5 text-xs font-semibold ${color}`}>{label}</p>
      <div className="space-y-1.5">
        {members.map((m) => (
          <button
            key={m.playerTag}
            onClick={() => onMemberClick?.(m.playerTag)}
            className="flex w-full items-center justify-between gap-2.5 rounded-lg bg-white/[.035] px-3 py-2 text-left transition hover:bg-white/[.06] focus-ring"
          >
            <div className="min-w-0">
              <p className="truncate text-sm text-umbra-lilac">{m.name}</p>
              <p className="truncate text-[11px] text-umbra-muted">
                {m.detail ?? m.reason}
              </p>
            </div>
            {m.townHallLevel && (
              <span className="shrink-0 font-mono text-[10px] text-umbra-purple">
                TH{m.townHallLevel}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
