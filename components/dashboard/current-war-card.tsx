import Image from "next/image";
import type { WarSummaryView, ClanBadgeUrls } from "@/lib/view-models/dashboard";
import { UnavailableValue } from "@/components/ui/state-primitives";
import { LiveCountdown } from "@/components/ui/live-countdown";
import { IconSwords, IconWarEmpty } from "@/components/ui/icons";

/**
 * Current war card — compact Our-clan vs Enemy-clan layout.
 * Shows stars and destruction percentage side by side with a VS icon
 * in the middle. Links to /war.
 * See concept/05-dashboard.md § 9 and concept/07.
 */
export function CurrentWarCard({
  warSummary,
  clanBadgeUrls,
  clanName,
}: {
  warSummary: WarSummaryView;
  clanBadgeUrls?: ClanBadgeUrls | null;
  clanName?: string;
}) {
  const isWarActive =
    warSummary.state === "preparation" || warSummary.state === "inWar";

  const countdownTarget =
    warSummary.state === "preparation" ? warSummary.startTime : warSummary.endTime;

  return (
    <section
      className="glass flex flex-col rounded-2xl p-5"
      aria-labelledby="current-war-title"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[.16em] text-umbra-purple">
            Live status
          </p>
          <h3
            id="current-war-title"
            className="mt-1 font-display text-lg text-umbra-lilac"
          >
            Current war
          </h3>
        </div>
        {countdownTarget && isWarActive && (
          <div className="flex flex-col items-end">
            <div className="flex flex-col items-center justify-center rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 shadow-sm backdrop-blur-sm">
              <span className="mb-0.5 font-mono text-[9px] font-medium uppercase tracking-wider text-umbra-muted">
                {warSummary.state === "preparation" ? "Starts in" : "Ends in"}
              </span>
              <span className="font-mono text-xs font-bold tracking-widest text-umbra-lilac">
                <LiveCountdown targetDate={countdownTarget} />
              </span>
            </div>
          </div>
        )}
      </div>

      {warSummary.state === null || warSummary.state === "notInWar" ? (
        <div className="mt-4 flex flex-1 flex-col items-center justify-center py-6">
          <div className="mb-3 flex justify-center text-umbra-purple/40">
            <IconWarEmpty className="h-12 w-12" />
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
          {/* State badge */}
          <div className="mt-3 flex items-center justify-center">
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
          </div>

          {/* VS layout: Our clan | VS icon | Enemy clan */}
          <div className="mt-3 flex flex-1 items-center justify-center gap-3">
            {/* Our clan */}
            <div className="flex-1 flex flex-col items-center text-center">
              {clanBadgeUrls?.small && (
                <div className="relative h-12 w-12 mb-2">
                  <Image
                    src={clanBadgeUrls.small}
                    alt={clanName ?? "Our Clan"}
                    fill
                    className="object-contain drop-shadow-md"
                  />
                </div>
              )}
              <p className="font-display text-[15px] font-medium text-umbra-lilac leading-tight line-clamp-2">
                {clanName ?? "Our Clan"}
              </p>
              
              <div className="mt-3 flex w-full flex-col items-center">
                <div className="flex items-baseline justify-center gap-1.5 rounded-xl bg-white/[.035] px-4 py-2">
                  <span className="font-display text-2xl font-bold text-amber-400 leading-none tracking-tight">
                    ★{warSummary.ownStars ?? <UnavailableValue />}
                  </span>
                  <span className="font-mono text-[11px] font-medium text-umbra-muted">
                    {warSummary.ownDestructionPercentage !== null
                      ? `${warSummary.ownDestructionPercentage}%`
                      : "—"}
                  </span>
                </div>
              </div>
            </div>

            {/* VS icon & team size */}
            <div className="flex flex-col items-center justify-center px-2 shrink-0">
              {warSummary.teamSize && (
                <div className="mb-2.5 rounded-full border border-umbra-purple/20 bg-umbra-purple/10 px-2.5 py-0.5 shadow-sm">
                  <span className="font-mono text-[10px] font-bold tracking-[0.2em] text-umbra-purple/90 ml-[0.2em]">
                    {warSummary.teamSize}V{warSummary.teamSize}
                  </span>
                </div>
              )}
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-umbra-purple/10 border border-umbra-purple/20 text-umbra-purple/80 shadow-[inset_0_0_12px_rgba(182,120,255,0.15)]">
                <IconSwords className="h-6 w-6" />
              </div>
            </div>

            {/* Enemy clan */}
            <div className="flex-1 flex flex-col items-center text-center">
              {warSummary.opponentBadgeUrls?.small && (
                <div className="relative h-12 w-12 mb-2">
                  <Image
                    src={warSummary.opponentBadgeUrls.small}
                    alt={`${warSummary.opponentName ?? "Enemy"} Badge`}
                    fill
                    className="object-contain drop-shadow-md grayscale hover:grayscale-0 transition-all duration-300"
                  />
                </div>
              )}
              <p className="font-display text-[15px] font-medium text-red-300/90 leading-tight line-clamp-2">
                {warSummary.opponentName ?? "Enemy"}
              </p>
              
              <div className="mt-3 flex w-full flex-col items-center">
                <div className="flex items-baseline justify-center gap-1.5 rounded-xl bg-white/[.035] px-4 py-2">
                  <span className="font-display text-2xl font-bold text-amber-400 leading-none tracking-tight">
                    ★{warSummary.opponentStars ?? <UnavailableValue />}
                  </span>
                  <span className="font-mono text-[11px] font-medium text-umbra-muted">
                    {warSummary.opponentDestructionPercentage !== null
                      ? `${warSummary.opponentDestructionPercentage}%`
                      : "—"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
