import Image from "next/image";
import type { CurrentWarDetail, WarHistoryEntry } from "@/lib/view-models/war";
import type { ClanBadgeUrls } from "@/lib/view-models/dashboard";
import { LiveCountdown } from "@/components/ui/live-countdown";
import { TimeAgo } from "@/components/ui/time-ago";
import { IconSwords, IconWarEmpty } from "@/components/ui/icons";
import { WarRefreshButton } from "./war-refresh-button";

/**
 * War hero — the top of the War Center always answers (concept/07 §"landing
 * state"): is the clan in preparation, battle, or no war? When does the next
 * phase end? What are each clan's stars, destruction, attacks used/remaining?
 * When was the displayed state last refreshed?
 *
 * Shows a clear no-active-war state when there is no current war, and surfaces
 * the shared-TTL refresh control. The "stale capture" caveat is shown when an
 * active war hasn't been synced recently. When at peace, a one-line "last
 * result" surfaces the most recent ended war so the page still answers "what
 * was the last war?".
 */
export function WarHero({
  currentWar,
  clanBadgeUrls,
  clanName,
  lastResult,
  refreshTtlSeconds,
}: {
  currentWar: CurrentWarDetail | null;
  clanBadgeUrls?: ClanBadgeUrls | null;
  clanName?: string | null;
  lastResult?: WarHistoryEntry | null;
  refreshTtlSeconds: number;
}) {
  if (!currentWar) {
    return (
      <section className="glass flex flex-col rounded-2xl p-6" aria-labelledby="war-hero-title">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-label uppercase tracking-[.16em] text-umbra-purple">
              Live status
            </p>
            <h2 id="war-hero-title" className="mt-1 font-display text-2xl text-umbra-lilac">
              Current war
            </h2>
          </div>
          <WarRefreshButton ttlSeconds={refreshTtlSeconds} />
        </div>
        <div className="mt-6 flex flex-1 flex-col items-center justify-center py-10">
          <div className="mb-3 flex justify-center text-umbra-purple/40">
            <IconWarEmpty className="h-14 w-14" />
          </div>
          <p className="font-display text-lg text-umbra-lilac">No active war</p>
          <p className="mt-1 max-w-sm text-center text-sm text-umbra-muted">
            The clan isn&apos;t in a war right now. The most recent result appears in the
            history below once tracking begins.
          </p>
          {lastResult && (
            <div className="mt-5 w-full max-w-md rounded-xl border border-umbra-line bg-white/[.03] px-4 py-3">
              <p className="font-mono text-label uppercase tracking-[.16em] text-umbra-purple">
                Last result
              </p>
              <div className="mt-1.5 flex items-center justify-between gap-3">
                <span className="truncate text-sm text-umbra-lilac">
                  vs {lastResult.opponentName ?? "Unknown"}
                </span>
                <ResultBadge result={lastResult.result} />
              </div>
              <p className="mt-1 font-mono text-2xs text-umbra-muted">
                ★{lastResult.ownStars ?? "—"}–{lastResult.opponentStars ?? "—"}
                {lastResult.ownDestructionPercentage != null &&
                  ` · ${lastResult.ownDestructionPercentage}%`}
                {lastResult.endTime && (
                  <> · <TimeAgo date={lastResult.endTime} /></>
                )}
              </p>
            </div>
          )}
        </div>
      </section>
    );
  }

  const isWarActive =
    currentWar.state === "preparation" || currentWar.state === "inWar";
  const countdownTarget =
    currentWar.state === "preparation"
      ? currentWar.startTime
      : currentWar.endTime;

  // Stale-capture heuristic: an active war not synced in the last hour may
  // reflect a missed poll rather than the live state.
  const stale =
    isWarActive &&
    currentWar.lastSyncedAt &&
    Date.now() - new Date(currentWar.lastSyncedAt).getTime() > 60 * 60 * 1000;

  return (
    <section className="glass flex flex-col rounded-2xl p-6" aria-labelledby="war-hero-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-label uppercase tracking-[.16em] text-umbra-purple">
            Live status · {currentWar.warType === "cwl" ? "Clan War League" : "Regular war"}
          </p>
          <h2 id="war-hero-title" className="mt-1 font-display text-2xl text-umbra-lilac">
            Current war
          </h2>
        </div>
        <div className="flex flex-col items-end gap-2">
          <WarRefreshButton ttlSeconds={refreshTtlSeconds} />
          {currentWar.lastSyncedAt && (
            <p className="text-2xs text-umbra-muted">
              Synced <TimeAgo date={currentWar.lastSyncedAt} />
            </p>
          )}
        </div>
      </div>

      {/* Stale-capture notice */}
      {stale && (
        <p className="mt-3 rounded-lg border border-amber-400/30 bg-amber-400/5 px-3 py-2 text-2xs text-amber-400">
          This capture is over an hour old — it may not reflect the live war state. Use
          Refresh to update.
        </p>
      )}

      {/* Timer */}
      {countdownTarget && isWarActive && (
        <div className="mt-4 flex flex-col items-center rounded-xl bg-white/[.035] px-4 py-3">
          <p className="font-mono text-label uppercase tracking-[.16em] text-umbra-purple">
            {currentWar.state === "preparation" ? "Battle starts in" : "Battle ends in"}
          </p>
          <p className="mt-1 font-mono text-2xl font-medium tracking-wider text-umbra-lilac">
            <LiveCountdown targetDate={countdownTarget} />
          </p>
        </div>
      )}
      {currentWar.state === "warEnded" && (
        <div className="mt-4 flex justify-center rounded-xl bg-white/[.035] px-4 py-3">
          <p className="font-mono text-sm uppercase tracking-wider text-umbra-muted">
            War ended
            {currentWar.endTime && (
              <> · <TimeAgo date={currentWar.endTime} /></>
            )}
          </p>
        </div>
      )}

      {/* VS layout */}
      <div className="mt-5 flex flex-1 items-center justify-center gap-3">
        <WarClanColumn
          badgeUrls={clanBadgeUrls ?? null}
          name={clanName ?? "Our Clan"}
          clanLevel={null}
          stars={currentWar.clan.stars}
          destruction={currentWar.clan.destructionPercentage}
          attacks={currentWar.clan.attacks}
          attacksRemaining={currentWar.clan.attacksRemaining}
          tone="own"
        />

        <div className="flex flex-col items-center justify-center px-2 shrink-0">
          <span
            className={`mb-2.5 inline-flex items-center rounded-full border px-2.5 py-0.5 text-label font-semibold uppercase tracking-wider whitespace-nowrap ${
              currentWar.state === "inWar"
                ? "border-amber-400/30 bg-amber-400/10 text-amber-400"
                : currentWar.state === "preparation"
                  ? "border-umbra-purple/30 bg-umbra-purple/15 text-umbra-purple"
                  : "border-white/10 bg-white/5 text-umbra-muted"
            }`}
          >
            {currentWar.state === "inWar"
              ? "● Battle day"
              : currentWar.state === "preparation"
                ? "○ Preparation"
                : "War ended"}
          </span>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-umbra-purple/10 border border-umbra-purple/20 text-umbra-purple/80 shadow-[inset_0_0_12px_rgba(182,120,255,0.15)]">
            <IconSwords className="h-6 w-6" />
          </div>
          {currentWar.teamSize != null && (
            <div className="mt-2.5 inline-flex items-center justify-center rounded-full border border-umbra-purple/20 bg-umbra-purple/10 px-2.5 py-0.5">
              <span className="text-label font-semibold uppercase tracking-wider text-umbra-purple/90">
                {currentWar.teamSize}v{currentWar.teamSize}
              </span>
            </div>
          )}
        </div>

        <WarClanColumn
          badgeUrls={currentWar.opponent.badgeUrls}
          name={currentWar.opponent.name}
          clanLevel={currentWar.opponent.clanLevel}
          stars={currentWar.opponent.stars}
          destruction={currentWar.opponent.destructionPercentage}
          attacks={currentWar.opponent.attacks}
          attacksRemaining={currentWar.opponent.attacksRemaining}
          tone="opponent"
        />
      </div>
    </section>
  );
}

function WarClanColumn({
  badgeUrls,
  name,
  clanLevel,
  stars,
  destruction,
  attacks,
  attacksRemaining,
  tone,
}: {
  badgeUrls: ClanBadgeUrls | null;
  name: string;
  clanLevel: number | null;
  stars: number;
  destruction: number;
  attacks: number;
  attacksRemaining: number;
  tone: "own" | "opponent";
}) {
  return (
    <div className="flex-1 flex flex-col items-center text-center">
      {badgeUrls?.small && (
        <div className="relative h-12 w-12 mb-2">
          <Image
            src={badgeUrls.small}
            alt={`${name} badge`}
            fill
            className={`object-contain drop-shadow-md ${tone === "opponent" ? "grayscale" : ""}`}
          />
        </div>
      )}
      <p
        className={`font-display text-[15px] font-medium leading-tight line-clamp-2 ${
          tone === "opponent" ? "text-red-300/90" : "text-umbra-lilac"
        }`}
      >
        {name}
      </p>
      {clanLevel != null && (
        <p className="mt-0.5 text-2xs text-umbra-muted">Lv {clanLevel}</p>
      )}
      <div className="mt-3 flex w-full flex-col items-center gap-1.5">
        <div className="flex items-baseline justify-center gap-1.5 rounded-xl bg-white/[.035] px-4 py-2">
          <span className="font-display text-2xl font-bold text-amber-400 leading-none tracking-tight">
            ★{stars}
          </span>
          <span className="font-mono text-2xs font-medium text-umbra-muted">
            {destruction}%
          </span>
        </div>
        <p className="font-mono text-2xs text-umbra-muted">
          {attacks} attacks · {attacksRemaining} left
        </p>
      </div>
    </div>
  );
}

function ResultBadge({ result }: { result: "win" | "loss" | "tie" | null }) {
  if (result === "win")
    return (
      <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-2xs font-semibold uppercase text-emerald-400">
        Win
      </span>
    );
  if (result === "loss")
    return (
      <span className="rounded-full border border-red-400/30 bg-red-400/10 px-2 py-0.5 text-2xs font-semibold uppercase text-red-400">
        Loss
      </span>
    );
  if (result === "tie")
    return (
      <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-2xs font-semibold uppercase text-amber-400">
        Tie
      </span>
    );
  return (
    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-2xs font-semibold uppercase text-umbra-muted">
      —
    </span>
  );
}
