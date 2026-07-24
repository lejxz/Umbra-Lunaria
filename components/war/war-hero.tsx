import Image from "next/image";
import Link from "next/link";
import type { CurrentWarDetail, WarHistoryEntry, WarLeadAnalysis } from "@/lib/view-models/war";
import type { ClanBadgeUrls } from "@/lib/view-models/dashboard";
import { LiveCountdown } from "@/components/ui/live-countdown";
import { TimeAgo } from "@/components/ui/time-ago";
import { IconSwords, IconWarEmpty, IconChevronRight } from "@/components/ui/icons";
import { WarRefreshButton } from "./war-refresh-button";

/**
 * War hero — the top of the War Center always answers (concept/07 §"landing
 * state"). Improved layout: a prominent state banner + countdown, a clean VS
 * matchup with a star-progress bar showing the lead, and compact stat chips.
 *
 * No-active-war state shows the last result inline so the page still answers
 * "what was the last war?".
 */
export function WarHero({
  currentWar,
  clanBadgeUrls,
  clanName,
  lastResult,
  leadAnalysis,
  refreshTtlSeconds,
}: {
  currentWar: CurrentWarDetail | null;
  clanBadgeUrls?: ClanBadgeUrls | null;
  clanName?: string | null;
  lastResult?: WarHistoryEntry | null;
  leadAnalysis?: WarLeadAnalysis;
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
            history below.
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

  // Stale-capture heuristic: an active war not synced in the last hour.
  const stale =
    isWarActive &&
    currentWar.lastSyncedAt &&
    Date.now() - new Date(currentWar.lastSyncedAt).getTime() > 60 * 60 * 1000;

  // Star progress for the VS bar.
  const ownStars = currentWar.clan.stars;
  const oppStars = currentWar.opponent.stars;
  const maxPossibleStars =
    currentWar.teamSize != null && currentWar.teamSize > 0
      ? currentWar.teamSize * 3
      : null;
  const ownPct =
    maxPossibleStars && maxPossibleStars > 0
      ? (ownStars / maxPossibleStars) * 100
      : 0;
  const oppPct =
    maxPossibleStars && maxPossibleStars > 0
      ? (oppStars / maxPossibleStars) * 100
      : 0;

  const stateMeta = {
    preparation: { label: "○ Preparation", tone: "purple" as const },
    inWar: { label: "● Battle day", tone: "amber" as const },
    warEnded: { label: "War ended", tone: "muted" as const },
  }[currentWar.state];

  return (
    <section className="glass flex flex-col rounded-2xl p-6 shadow-[inset_0_0_20px_rgba(0,0,0,0.2)]" aria-labelledby="war-hero-title">
      {/* Header row */}
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

      {/* VS matchup */}
      <div className="relative mt-8 flex items-stretch justify-center gap-2 sm:gap-6">
        {/* Glowing auras */}
        <div className="pointer-events-none absolute inset-0 flex overflow-hidden rounded-2xl">
           {leadAnalysis?.leader === "own" && <div className="absolute left-[-20%] top-[-20%] h-[140%] w-[70%] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-500/15 via-emerald-500/5 to-transparent" />}
           {leadAnalysis?.leader === "opponent" && <div className="absolute right-[-20%] top-[-20%] h-[140%] w-[70%] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-500/15 via-red-500/5 to-transparent" />}
        </div>

        <WarClanColumn
          badgeUrls={clanBadgeUrls ?? null}
          name={clanName ?? "Our Clan"}
          clanLevel={currentWar.clan.clanLevel}
          stars={ownStars}
          destruction={currentWar.clan.destructionPercentage}
          attacks={currentWar.clan.attacks}
          attacksRemaining={currentWar.clan.attacksRemaining}
          tone="own"
        />

        {/* Center column: Countdown + VS + Lead */}
        <div className="z-10 flex shrink-0 flex-col items-center justify-center gap-3 px-2 sm:px-4">
          <StateBadge label={stateMeta.label} tone={stateMeta.tone} />

          {countdownTarget && isWarActive ? (
            <div className="flex flex-col items-center text-center">
              <p className="font-mono text-2xs uppercase tracking-[.16em] text-umbra-purple/70">
                {currentWar.state === "preparation" ? "Starts in" : "Ends in"}
              </p>
              <p className="mt-0.5 font-mono text-xl font-bold tracking-tight text-white drop-shadow-md">
                <LiveCountdown targetDate={countdownTarget} />
              </p>
            </div>
          ) : currentWar.state === "warEnded" && currentWar.endTime ? (
            <p className="text-center font-mono text-xs text-umbra-muted">
              Ended <br /><TimeAgo date={currentWar.endTime} />
            </p>
          ) : null}

          {currentWar.teamSize != null && (
            <span className="rounded-full border border-umbra-purple/20 bg-umbra-purple/10 px-2.5 py-0.5 text-label font-semibold uppercase tracking-wider text-umbra-purple/90">
              {currentWar.teamSize}v{currentWar.teamSize}
              {currentWar.attacksPerMember != null && ` · ${currentWar.attacksPerMember} atk`}
            </span>
          )}

          <div className="relative mt-2 flex h-10 w-10 items-center justify-center rounded-full border border-umbra-purple/30 bg-umbra-purple/10 text-umbra-purple shadow-[0_0_15px_rgba(139,92,246,0.1)]">
            <IconSwords className="h-5 w-5" />
          </div>

          {leadAnalysis && leadAnalysis.leader !== "unknown" && (
            <div
              className={`mt-1 flex items-center justify-center rounded-full border px-3 py-1 backdrop-blur-md ${
                leadAnalysis.leader === "own"
                  ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-400"
                  : leadAnalysis.leader === "opponent"
                    ? "border-red-400/30 bg-red-400/10 text-red-400"
                    : "border-amber-400/30 bg-amber-400/10 text-amber-400"
              }`}
            >
              <p className="whitespace-nowrap text-center font-display text-2xs font-bold uppercase leading-tight tracking-wide">
                {leadAnalysis.summary}
              </p>
            </div>
          )}
        </div>

        <WarClanColumn
          badgeUrls={currentWar.opponent.badgeUrls}
          name={currentWar.opponent.name}
          clanLevel={currentWar.opponent.clanLevel}
          stars={oppStars}
          destruction={currentWar.opponent.destructionPercentage}
          attacks={currentWar.opponent.attacks}
          attacksRemaining={currentWar.opponent.attacksRemaining}
          tone="opponent"
        />
      </div>

      {/* Star progress bar (only meaningful once stars exist) */}
      {maxPossibleStars != null && maxPossibleStars > 0 && (
        <div className="mt-8 px-4 sm:px-8">
          <div className="mb-2 flex items-center justify-between font-mono text-xs font-semibold text-umbra-muted">
            <span className="drop-shadow-sm text-amber-400/90">★ {ownStars}</span>
            <span className="text-2xs uppercase tracking-widest text-umbra-muted/50">{maxPossibleStars} Max</span>
            <span className="drop-shadow-sm text-red-400/90">{oppStars} ★</span>
          </div>
          <div className="relative flex h-3 overflow-hidden rounded-full border border-white/5 bg-black/40 shadow-inner shadow-black/50">
            <div className="absolute inset-x-0 top-0 h-px bg-white/5" />
            {/* Left side (Us) */}
            <div className="flex w-1/2 justify-end">
              <div className="bg-gradient-to-l from-amber-400 to-amber-600 transition-all duration-1000 ease-out" style={{ width: `${ownPct}%` }} />
            </div>
            {/* Center divider */}
            <div className="z-10 h-full w-px bg-white/20" />
            {/* Right side (Them) */}
            <div className="flex w-1/2 justify-start">
              <div className="bg-gradient-to-r from-red-500 to-red-700 transition-all duration-1000 ease-out" style={{ width: `${oppPct}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* Plan lineup link during preparation */}
      {currentWar.state === "preparation" && (
        <div className="mt-4 flex justify-center">
          <Link
            href="/planning"
            className="focus-ring inline-flex items-center gap-1.5 rounded-full border border-umbra-purple/40 bg-umbra-purple/10 px-4 py-2 font-mono text-label uppercase tracking-wider text-umbra-purple transition hover:border-umbra-purple/60 hover:bg-umbra-purple/20"
          >
            Plan lineup
            <IconChevronRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      )}
    </section>
  );
}

function StateBadge({
  label,
  tone,
}: {
  label: string;
  tone: "purple" | "amber" | "muted";
}) {
  const toneClass = {
    purple: "border-umbra-purple/30 bg-umbra-purple/15 text-umbra-purple",
    amber: "border-amber-400/30 bg-amber-400/10 text-amber-400",
    muted: "border-white/10 bg-white/5 text-umbra-muted",
  }[tone];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-2xs font-semibold uppercase tracking-wider ${toneClass}`}
    >
      {label}
    </span>
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
    <div className="flex flex-1 flex-col items-center text-center">
      {badgeUrls?.small && (
        <div className="relative mb-2 h-12 w-12">
          <Image
            src={badgeUrls.small}
            alt={`${name} badge`}
            fill
            className={`object-contain drop-shadow-md ${tone === "opponent" ? "grayscale" : ""}`}
          />
        </div>
      )}
      <p
        className={`font-display text-sm font-medium leading-tight line-clamp-2 ${
          tone === "opponent" ? "text-red-300/90" : "text-umbra-lilac"
        }`}
      >
        {name}
      </p>
      {clanLevel != null && (
        <p className="mt-0.5 text-2xs text-umbra-muted">Lv {clanLevel}</p>
      )}
      <div className="mt-2 flex w-full flex-col items-center gap-1">
        <div className="flex items-baseline justify-center gap-1.5 rounded-lg bg-white/[.04] px-3 py-1.5">
          <span className="font-display text-xl font-bold text-amber-400 leading-none tracking-tight">
            ★{stars}
          </span>
          <span className="font-mono text-2xs font-medium text-umbra-muted">
            {destruction}%
          </span>
        </div>
        <p className="font-mono text-micro text-umbra-muted">
          {attacks} atk · {attacksRemaining} left
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
