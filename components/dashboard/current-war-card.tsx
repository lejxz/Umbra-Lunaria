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
        <div className="mt-4 flex flex-1 flex-col justify-end">
          {/* Header area with State badge */}
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="font-mono text-[9px] font-bold tracking-widest text-umbra-muted">
              {warSummary.teamSize && `${warSummary.teamSize}V${warSummary.teamSize} `}MATCHUP
            </span>
            <span
              className={`inline-flex items-center rounded border px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest ${
                warSummary.state === "inWar"
                  ? "border-amber-400/30 bg-amber-400/10 text-amber-400"
                  : warSummary.state === "preparation"
                    ? "border-umbra-purple/30 bg-umbra-purple/15 text-umbra-purple"
                    : "border-white/10 bg-white/5 text-umbra-muted"
              }`}
            >
              {warSummary.state === "inWar"
                ? "BATTLE DAY"
                : warSummary.state === "preparation"
                  ? "PREPARATION"
                  : "WAR ENDED"}
            </span>
          </div>

          {/* Arena Box */}
          <div className="relative flex w-full items-stretch justify-between rounded-xl bg-black/20 border border-white/5 p-4 shadow-inner">
            {/* Our clan */}
            <div className="flex w-2/5 flex-col items-center text-center">
              {clanBadgeUrls?.small && (
                <div className="relative h-14 w-14 mb-3">
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
              
              <div className="mt-3 flex items-baseline justify-center gap-1.5">
                <span className="font-display text-2xl font-bold text-amber-400 leading-none tracking-tight drop-shadow-[0_0_8px_rgba(251,191,36,0.3)]">
                  ★{warSummary.ownStars ?? <UnavailableValue />}
                </span>
                <span className="font-mono text-[11px] font-medium text-umbra-muted">
                  {warSummary.ownDestructionPercentage !== null
                    ? `${warSummary.ownDestructionPercentage}%`
                    : "—"}
                </span>
              </div>
            </div>

            {/* VS Center */}
            <div className="relative flex w-1/5 flex-col items-center justify-center shrink-0">
               {/* Vertical divider line */}
               <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-white/10 to-transparent" />
               {/* VS Icon */}
               <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-umbra-ink border border-umbra-purple/20 text-umbra-purple/90 shadow-[0_0_12px_rgba(182,120,255,0.15)]">
                 <IconSwords className="h-5 w-5" />
               </div>
            </div>

            {/* Enemy clan */}
            <div className="flex w-2/5 flex-col items-center text-center">
              {warSummary.opponentBadgeUrls?.small && (
                <div className="relative h-14 w-14 mb-3">
                  <Image
                    src={warSummary.opponentBadgeUrls.small}
                    alt={`${warSummary.opponentName ?? "Enemy"} Badge`}
                    fill
                    className="object-contain drop-shadow-md grayscale opacity-90 hover:grayscale-0 hover:opacity-100 transition-all duration-300"
                  />
                </div>
              )}
              <p className="font-display text-[15px] font-medium text-red-300/90 leading-tight line-clamp-2">
                {warSummary.opponentName ?? "Enemy"}
              </p>
              
              <div className="mt-3 flex items-baseline justify-center gap-1.5">
                <span className="font-display text-2xl font-bold text-white leading-none tracking-tight drop-shadow-[0_0_8px_rgba(255,255,255,0.1)]">
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
      )}
    </section>
  );
}
