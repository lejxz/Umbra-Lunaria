import Link from "next/link";
import type { WarSummaryView } from "@/lib/view-models/dashboard";
import { UnavailableValue } from "@/components/ui/state-primitives";

/**
 * Current war card — compact Our-clan vs Enemy-clan layout.
 * Shows stars and destruction percentage side by side with a VS icon
 * in the middle. Links to /war.
 * See concept/05-dashboard.md §9 and concept/07.
 */
export function CurrentWarCard({
  warSummary,
}: {
  warSummary: WarSummaryView;
}) {
  const isWarActive =
    warSummary.state === "preparation" || warSummary.state === "inWar";

  return (
    <section
      className="glass flex flex-col rounded-2xl p-5"
      aria-labelledby="current-war-title"
    >
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
      <h3
        id="current-war-title"
        className="mt-1 font-display text-lg text-umbra-lilac"
      >
        Current war
      </h3>

      {warSummary.state === null || warSummary.state === "notInWar" ? (
        <div className="mt-4 flex flex-1 flex-col items-center justify-center py-6">
          <div className="mb-3 flex justify-center text-umbra-purple/40">
            <WarEmptyIcon />
          </div>
          <p className="text-sm text-umbra-muted">
            {warSummary.state === null ? "No war data yet" : "Clan is at peace"}
          </p>
          <p className="mt-1 text-xs text-umbra-muted">
            Wars appear here when they start
          </p>
        </div>
      ) : (
        <>
          {/* State badge + team size */}
          <div className="mt-3 flex items-center justify-center gap-2">
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                warSummary.state === "inWar"
                  ? "border-amber-400/30 bg-amber-400/10 text-amber-400"
                  : warSummary.state === "preparation"
                    ? "border-umbra-purple/30 bg-umbra-purple/15 text-umbra-purple"
                    : "border-white/10 bg-white/5 text-umbra-muted"
              }`}
            >
              {warSummary.state === "inWar"
                ? "● Battle day"
                : warSummary.state === "preparation"
                  ? "○ Preparation"
                  : "War ended"}
            </span>
            {warSummary.teamSize && (
              <span className="font-mono text-[10px] text-umbra-muted">
                {warSummary.teamSize}v{warSummary.teamSize}
              </span>
            )}
          </div>

          {/* VS layout: Our clan | VS icon | Enemy clan */}
          <div className="mt-3 flex flex-1 items-center justify-center gap-3">
            {/* Our clan */}
            <div className="flex-1 text-center">
              <p className="font-mono text-[9px] uppercase tracking-wider text-umbra-muted">
                Our clan
              </p>
              <p className="mt-1 font-display text-2xl font-bold text-umbra-purple">
                {warSummary.ownStars ?? <UnavailableValue />}
              </p>
              <p className="mt-0.5 font-mono text-[10px] text-umbra-muted">
                {warSummary.ownDestructionPercentage !== null
                  ? `${warSummary.ownDestructionPercentage}%`
                  : "—"}
              </p>
            </div>

            {/* VS icon */}
            <VsIcon />

            {/* Enemy clan */}
            <div className="flex-1 text-center">
              <p className="font-mono text-[9px] uppercase tracking-wider text-umbra-muted">
                {warSummary.opponentName ?? "Enemy"}
              </p>
              <p className="mt-1 font-display text-2xl font-bold text-red-400">
                {warSummary.opponentStars ?? <UnavailableValue />}
              </p>
              <p className="mt-0.5 font-mono text-[10px] text-umbra-muted">
                {warSummary.opponentDestructionPercentage !== null
                  ? `${warSummary.opponentDestructionPercentage}%`
                  : "—"}
              </p>
            </div>
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

/**
 * Custom VS icon — crossed swords in a circular badge.
 * Pure SVG, themed with the purple/lilac observatory palette.
 */
function VsIcon() {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
      aria-hidden="true"
    >
      {/* Circle background */}
      <circle
        cx="20"
        cy="20"
        r="18"
        stroke="rgba(182, 120, 255, 0.3)"
        strokeWidth="1.5"
        fill="rgba(182, 120, 255, 0.08)"
      />
      {/* Crossed swords — left sword (purple) */}
      <g transform="translate(20 20) rotate(-45)">
        <rect
          x="-0.8"
          y="-10"
          width="1.6"
          height="14"
          rx="0.5"
          fill="#B678FF"
        />
        <rect x="-3" y="4" width="6" height="1.5" rx="0.5" fill="#B678FF" />
        <polygon points="-1,4 1,4 0,7" fill="#B678FF" />
      </g>
      {/* Crossed swords — right sword (lilac) */}
      <g transform="translate(20 20) rotate(45)">
        <rect
          x="-0.8"
          y="-10"
          width="1.6"
          height="14"
          rx="0.5"
          fill="#EEE5FF"
        />
        <rect x="-3" y="4" width="6" height="1.5" rx="0.5" fill="#EEE5FF" />
        <polygon points="-1,4 1,4 0,7" fill="#EEE5FF" />
      </g>
    </svg>
  );
}

/**
 * Empty state icon for War
 */
function WarEmptyIcon() {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M24 4C14 4 10 10 10 10V22C10 32 22 42 24 44C26 42 38 32 38 22V10C38 10 34 4 24 4Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="2 4"
      />
      <path
        d="M17 17L31 31M31 17L17 31"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
