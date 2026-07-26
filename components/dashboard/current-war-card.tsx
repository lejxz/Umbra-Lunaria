import Image from "next/image";
import type { WarSummaryView, ClanBadgeUrls } from "@/lib/view-models/dashboard";
import { UnavailableValue } from "@/components/ui/state-primitives";
import { LiveCountdown } from "@/components/ui/live-countdown";
import { IconSwords, IconWarEmpty } from "@/components/ui/icons";

/**
 * Current war card — compact Our-clan vs Enemy-clan layout.
 * Shows stars and destruction percentage side by side with a VS icon
 * in the middle. Links to /war.
 * See docs/concept/05-dashboard.md § 9 and docs/concept/07.
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
      className="lunar-card lunar-hover flex h-full flex-col p-5"
      aria-labelledby="current-war-title"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-label uppercase tracking-[.16em] text-umbra-purple">
            Live status
          </p>
          <h3
            id="current-war-title"
            className="mt-1 font-display text-lg text-umbra-moonlight"
          >
            Current war
          </h3>
        </div>
        {countdownTarget && isWarActive && (
          <div className="flex flex-col items-end text-right">
            <p className="font-mono text-label uppercase tracking-[.16em] text-umbra-faint">
              {warSummary.state === "preparation" ? "Starts in" : "Ends in"}
            </p>
            <p className="mt-1 font-mono text-lg font-medium tracking-wider text-umbra-moonlight">
              <LiveCountdown targetDate={countdownTarget} />
            </p>
          </div>
        )}
      </div>

      {warSummary.state === null || warSummary.state === "notInWar" ? (
        <div className="mt-4 flex flex-1 flex-col items-center justify-center py-6">
          <div className="mb-3 flex justify-center text-umbra-purple/40">
            <IconWarEmpty className="h-12 w-12" />
          </div>
          <p className="text-sm text-umbra-lilac">
            {warSummary.state === null ? "No war data yet" : "Clan is at peace"}
          </p>
          <p className="mt-1 text-xs text-umbra-faint">
            Wars appear here when they start
          </p>
        </div>
      ) : (
        <>

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
                    className="object-contain drop-shadow-[0_0_10px_rgba(182,120,255,0.35)]"
                  />
                </div>
              )}
              <p className="font-display text-sm font-medium text-umbra-moonlight leading-tight line-clamp-2">
                {clanName ?? "Our Clan"}
              </p>

              <div className="mt-3 flex w-full flex-col items-center">
                <div className="lunar-tile flex items-baseline justify-center gap-1.5 !px-4 !py-2">
                  <span className="font-display text-2xl font-bold text-amber-300 leading-none tracking-tight drop-shadow-[0_0_8px_rgba(252,211,77,0.4)]">
                    ★{warSummary.ownStars ?? <UnavailableValue />}
                  </span>
                  <span className="font-mono text-2xs font-medium text-umbra-muted">
                    {warSummary.ownDestructionPercentage !== null
                      ? `${warSummary.ownDestructionPercentage}%`
                      : "—"}
                  </span>
                </div>
              </div>
            </div>

            {/* Center column: Status | Icon | Team size */}
            <div className="flex flex-col items-center justify-center px-3 shrink-0">
              {/* State badge */}
              <span
                className={`mb-3.5 inline-flex items-center rounded-full border px-2.5 py-0.5 text-label font-semibold uppercase tracking-wider whitespace-nowrap ${
                  warSummary.state === "inWar"
                    ? "border-amber-400/30 bg-amber-400/10 text-amber-300"
                    : warSummary.state === "preparation"
                      ? "border-umbra-purple/40 bg-umbra-purple/15 text-umbra-purple"
                      : "border-umbra-line bg-white/5 text-umbra-muted"
                }`}
              >
                {warSummary.state === "inWar"
                  ? "● Battle day"
                  : warSummary.state === "preparation"
                    ? "○ Preparation"
                    : "War ended"}
              </span>

              {/* VS Icon */}
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-umbra-purple/40 bg-umbra-purple/10 text-umbra-purple shadow-glow-sm">
                <IconSwords className="h-6 w-6" />
              </div>

              {/* Team size */}
              {warSummary.teamSize && (
                <div className="mt-3.5 inline-flex items-center justify-center rounded-full border border-umbra-purple/40 bg-umbra-purple/10 px-2.5 py-0.5">
                  <span className="text-label font-semibold uppercase tracking-wider text-umbra-purple">
                    {warSummary.teamSize}v{warSummary.teamSize}
                  </span>
                </div>
              )}
            </div>

            {/* Enemy clan */}
            <div className="flex-1 flex flex-col items-center text-center">
              {warSummary.opponentBadgeUrls?.small && (
                <div className="relative h-12 w-12 mb-2">
                  <Image
                    src={warSummary.opponentBadgeUrls.small}
                    alt={`${warSummary.opponentName ?? "Enemy"} Badge`}
                    fill
                    className="object-contain drop-shadow-lg grayscale transition-all duration-300 hover:grayscale-0"
                  />
                </div>
              )}
              <p className="font-display text-sm font-medium text-rose-300/90 leading-tight line-clamp-2">
                {warSummary.opponentName ?? "Enemy"}
              </p>

              <div className="mt-3 flex w-full flex-col items-center">
                <div className="lunar-tile flex items-baseline justify-center gap-1.5 !px-4 !py-2">
                  <span className="font-display text-2xl font-bold text-amber-300 leading-none tracking-tight drop-shadow-[0_0_8px_rgba(252,211,77,0.4)]">
                    ★{warSummary.opponentStars ?? <UnavailableValue />}
                  </span>
                  <span className="font-mono text-2xs font-medium text-umbra-muted">
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
