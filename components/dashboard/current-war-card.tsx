import Link from "next/link";
import type { WarSummaryView } from "@/lib/view-models/dashboard";
import { Badge, UnavailableValue } from "@/components/ui";

/**
 * Current war card — a compact overview for the 3-column stats row.
 * Shows war state, opponent, score, and a countdown timer. Links to /war.
 * See concept/05-dashboard.md §9 (navigation summary) and concept/07.
 */
export function CurrentWarCard({
  warSummary,
}: {
  warSummary: WarSummaryView;
}) {
  const isWarActive =
    warSummary.state === "preparation" || warSummary.state === "inWar";

  return (
    <section className="glass rounded-2xl p-5" aria-labelledby="current-war-title">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[.16em] text-umbra-purple">
          Live status
        </p>
        <Link
          href="/war"
          className="font-mono text-[10px] uppercase tracking-wider text-umbra-muted transition hover:text-umbra-lilac"
        >
          War center →
        </Link>
      </div>
      <h3 id="current-war-title" className="mt-1 font-display text-lg text-umbra-lilac">
        Current war
      </h3>

      {warSummary.state === null || warSummary.state === "notInWar" ? (
        <div className="mt-4 flex flex-col items-center justify-center py-6">
          <p className="text-sm text-umbra-muted">
            {warSummary.state === null
              ? "No war data yet"
              : "Clan is at peace"}
          </p>
          <p className="mt-1 text-xs text-umbra-muted">
            Wars appear here when they start
          </p>
        </div>
      ) : (
        <>
          {/* State badge */}
          <div className="mt-3 flex items-center gap-2">
            <Badge
              tone={
                warSummary.state === "inWar"
                  ? "warning"
                  : warSummary.state === "preparation"
                    ? "brand"
                    : "muted"
              }
            >
              {warSummary.state === "inWar"
                ? "● Battle day"
                : warSummary.state === "preparation"
                  ? "○ Preparation"
                  : "War ended"}
            </Badge>
            {warSummary.teamSize && (
              <span className="font-mono text-xs text-umbra-muted">
                {warSummary.teamSize}v{warSummary.teamSize}
              </span>
            )}
          </div>

          {/* Opponent */}
          {warSummary.opponentName && (
            <p className="mt-2 truncate text-sm text-umbra-lilac">
              vs {warSummary.opponentName}
            </p>
          )}

          {/* Score */}
          {warSummary.ownStars !== null && warSummary.opponentStars !== null && (
            <div className="mt-3 rounded-xl bg-white/[.035] p-3 text-center">
              <p className="font-mono text-[9px] uppercase tracking-wider text-umbra-muted">
                Stars
              </p>
              <p className="mt-1 font-display text-2xl font-bold text-white">
                <span className="text-umbra-purple">{warSummary.ownStars}</span>
                <span className="mx-2 text-umbra-muted">—</span>
                <span className="text-red-400">{warSummary.opponentStars}</span>
              </p>
            </div>
          )}

          {/* Destruction + attacks */}
          <div className="mt-2 grid grid-cols-2 gap-2">
            <MiniStat
              label="Destruction"
              value={
                warSummary.ownDestructionPercentage !== null
                  ? `${warSummary.ownDestructionPercentage}%`
                  : <UnavailableValue />
              }
            />
            <MiniStat
              label="Attacks"
              value={
                warSummary.ownAttacks !== null
                  ? `${warSummary.ownAttacks}/${warSummary.opponentAttacks ?? "—"}`
                  : <UnavailableValue />
              }
            />
          </div>

          {/* Timer */}
          {warSummary.endTime && isWarActive && (
            <div className="mt-3 rounded-lg bg-umbra-purple/10 px-3 py-2 text-center">
              <p className="font-mono text-[9px] uppercase tracking-wider text-umbra-muted">
                {warSummary.state === "preparation"
                  ? "Battle starts"
                  : "Battle ends"}
              </p>
              <p className="mt-0.5 font-mono text-xs text-umbra-lilac">
                {new Date(warSummary.endTime).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: "Asia/Manila",
                })}
              </p>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-lg bg-white/[.035] p-2.5 text-center">
      <p className="font-mono text-[9px] uppercase tracking-wider text-umbra-muted">
        {label}
      </p>
      <p className="mt-1 font-display text-base font-bold text-white">{value}</p>
    </div>
  );
}
