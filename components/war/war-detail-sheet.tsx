"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Modal } from "@/components/ui/modal";
import type { WarDetailView } from "@/lib/view-models/war";
import type { ClanBadgeUrls } from "@/lib/view-models/dashboard";
import { TimeAgo } from "@/components/ui/time-ago";
import { IconSwords, IconLoader, IconAlert, IconWarEmpty } from "@/components/ui/icons";
import { WarClanColumn, StateBadge } from "./war-hero";
import { WarRosters } from "./war-rosters";
import { WarAttackLog } from "./war-attack-log";

/**
 * War detail sheet — opened from the history "View details" button. Fetches
 * the full parsed snapshot + attack log + derived analysis for a live-tracked
 * war from /api/war/[id], then renders:
 *
 *   1. Header — opponent, result, score, state, timers, freshness.
 *   2. Analysis panel — attack efficiency, 3-star rate, avg stars, no-attack
 *      members, best own attack, TH matchup quality. Own vs opponent side by
 *      side. Every "never fake a zero" rule applies (rates are null/— when
 *      the denominator is 0).
 *   3. Roster scouting (compact) — both clans by map position with base state.
 *   4. Attack log — every attack ordered, attacker → defender, stars/destruction.
 *
 * The sheet is read-only and public (concept/01). Own-clan members are not
 * clickable here (the sheet is already a modal over the war page); the shared
 * member sheet can be opened from the main roster instead.
 */
export function WarDetailSheet({
  warId,
  clanBadgeUrls,
  clanName,
  onClose,
}: {
  warId: number | null;
  clanBadgeUrls?: ClanBadgeUrls | null;
  clanName?: string | null;
  onClose: () => void;
}) {
  const [data, setData] = useState<WarDetailView | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (warId === null) {
      setData(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    fetch(`/api/war/${warId}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((d: WarDetailView) => {
        setData(d);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load war");
        setLoading(false);
      });
  }, [warId]);

  return (
    <Modal
      open={warId !== null}
      onClose={onClose}
      aria-labelledby="war-detail-title"
      maxWidth="max-w-4xl"
    >
      {loading && (
        <div className="flex items-center justify-center gap-3 py-16">
          <IconLoader className="h-6 w-6 animate-spin text-umbra-purple" aria-hidden />
          <span className="text-sm text-umbra-muted">Loading war detail…</span>
        </div>
      )}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-400/30 bg-red-400/5 px-4 py-6 text-red-300">
          <IconAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <div>
            <p className="text-sm font-medium">Couldn&apos;t load war detail</p>
            <p className="mt-1 text-2xs text-red-300/70">{error}</p>
          </div>
        </div>
      )}
      {data && !loading && !error && (
        <WarDetailContent data={data} clanBadgeUrls={clanBadgeUrls} clanName={clanName} />
      )}
    </Modal>
  );
}

function WarDetailContent({
  data,
  clanBadgeUrls,
  clanName,
}: {
  data: WarDetailView;
  clanBadgeUrls?: ClanBadgeUrls | null;
  clanName?: string | null;
}) {
  const { detail: w, attackLog, analysis } = data;

  return (
    <div>
      {/* ---- Header ---- */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-umbra-line pb-4">
        <div>
          <p className="font-mono text-label uppercase tracking-[.16em] text-umbra-purple">
            {w.warType === "cwl" ? "Clan War League" : "Regular war"} · {stateLabel(w.state)}
          </p>
          <h2 id="war-detail-title" className="mt-1 font-display text-xl text-umbra-lilac">
            vs {w.opponent.name}
          </h2>
          {w.endTime && (
            <p className="mt-1 text-2xs text-umbra-muted">
              Ended <TimeAgo date={w.endTime} />
              {w.lastSyncedAt && <> · synced <TimeAgo date={w.lastSyncedAt} /></>}
            </p>
          )}
        </div>
      </div>

      {/* ---- Score line (VS Arena Layout) ---- */}
      <div className="relative mt-8 flex items-stretch justify-center gap-2 sm:gap-6">
        {/* Glowing auras based on result */}
        <div className="pointer-events-none absolute inset-0 flex overflow-hidden rounded-2xl">
          {w.state === "warEnded" && resultFromStars(w) === "win" && (
            <div className="absolute left-[-20%] top-[-20%] h-[140%] w-[70%] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-500/15 via-emerald-500/5 to-transparent" />
          )}
          {w.state === "warEnded" && resultFromStars(w) === "loss" && (
            <div className="absolute right-[-20%] top-[-20%] h-[140%] w-[70%] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-500/15 via-red-500/5 to-transparent" />
          )}
        </div>

        <WarClanColumn
          badgeUrls={clanBadgeUrls ?? null}
          name={clanName ?? "Our Clan"}
          clanLevel={w.clan.clanLevel}
          stars={w.clan.stars}
          destruction={w.clan.destructionPercentage}
          attacks={w.clan.attacks}
          attacksRemaining={0} // Past wars have 0 attacks remaining typically
          tone="own"
        />

        {/* Center column: VS + Result Badge */}
        <div className="z-10 flex shrink-0 flex-col items-center justify-center gap-3 px-2 sm:px-4">
          <StateBadge label={stateLabel(w.state)} tone={w.state === "warEnded" ? "muted" : "amber"} />

          {w.teamSize != null && (
            <span className="rounded-full border border-umbra-purple/20 bg-umbra-purple/10 px-2.5 py-0.5 text-label font-semibold uppercase tracking-wider text-umbra-purple/90">
              {w.teamSize}v{w.teamSize}
              {w.attacksPerMember != null && ` · ${w.attacksPerMember} atk`}
            </span>
          )}

          <div className="relative mt-2 flex h-10 w-10 items-center justify-center rounded-full border border-umbra-purple/30 bg-umbra-purple/10 text-umbra-purple shadow-[0_0_15px_rgba(139,92,246,0.1)]">
            <IconSwords className="h-5 w-5" />
          </div>

          {w.state === "warEnded" && resultFromStars(w) !== null && (
            <div
              className={`mt-1 flex items-center justify-center rounded-full border px-3 py-1 backdrop-blur-md ${
                resultFromStars(w) === "win"
                  ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-400"
                  : resultFromStars(w) === "loss"
                    ? "border-red-400/30 bg-red-400/10 text-red-400"
                    : "border-amber-400/30 bg-amber-400/10 text-amber-400"
              }`}
            >
              <p className="whitespace-nowrap text-center font-display text-2xs font-bold uppercase leading-tight tracking-wide">
                {resultFromStars(w) === "win"
                  ? "Victory"
                  : resultFromStars(w) === "loss"
                    ? "Defeat"
                    : "Tie"}
              </p>
            </div>
          )}
        </div>

        <WarClanColumn
          badgeUrls={w.opponent.badgeUrls}
          name={w.opponent.name}
          clanLevel={w.opponent.clanLevel}
          stars={w.opponent.stars}
          destruction={w.opponent.destructionPercentage}
          attacks={w.opponent.attacks}
          attacksRemaining={0}
          tone="opponent"
        />
      </div>

      {/* Star progress bar */}
      {w.teamSize != null && w.teamSize > 0 && (
        <div className="mt-8 px-4 sm:px-8">
          <div className="mb-2 flex items-center justify-between font-mono text-xs font-semibold text-umbra-muted">
            <span className="drop-shadow-sm text-amber-400/90">★ {w.clan.stars}</span>
            <span className="text-2xs uppercase tracking-widest text-umbra-muted/50">{w.teamSize * 3} Max</span>
            <span className="drop-shadow-sm text-red-400/90">{w.opponent.stars} ★</span>
          </div>
          <div className="relative flex h-3 overflow-hidden rounded-full border border-white/5 bg-black/40 shadow-inner shadow-black/50">
            <div className="absolute inset-x-0 top-0 h-px bg-white/5" />
            <div className="flex w-1/2 justify-end">
              <div className="bg-gradient-to-l from-amber-400 to-amber-600 transition-all duration-1000 ease-out" style={{ width: `${(w.clan.stars / (w.teamSize * 3)) * 100}%` }} />
            </div>
            <div className="z-10 h-full w-px bg-white/20" />
            <div className="flex w-1/2 justify-start">
              <div className="bg-gradient-to-r from-red-500 to-red-700 transition-all duration-1000 ease-out" style={{ width: `${(w.opponent.stars / (w.teamSize * 3)) * 100}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* ---- Analysis panel ---- */}
      <div className="mt-5">
        <p className="font-mono text-label uppercase tracking-[.16em] text-umbra-purple">
          Analysis
        </p>
        <h3 className="mt-1 font-display text-base text-umbra-lilac">Performance breakdown</h3>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatCard
            label="3★ rate"
            own={analysis.ownThreeStarRate}
            opp={analysis.opponentThreeStarRate}
            format="percent"
          />
          <StatCard
            label="Avg stars"
            own={analysis.ownAverageStars}
            opp={analysis.opponentAverageStars}
            format="stars"
          />
          <StatCard
            label="Attacks used"
            own={analysis.ownAttacksUsed}
            opp={analysis.opponentAttacksUsed}
            ownTotal={analysis.ownAttacksTotal}
            oppTotal={analysis.opponentAttacksTotal}
            format="fraction"
          />
          <StatCard
            label="No-attack"
            own={analysis.ownNoAttackMembers}
            opp={analysis.opponentNoAttackMembers}
            format="number"
          />
        </div>

        {/* Narrative highlights */}
        <div className="mt-3 space-y-1.5">
          {analysis.ownBestAttack && (
            <Highlight>
              <strong className="text-umbra-lilac">{analysis.ownBestAttack.attackerName}</strong>{" "}
              landed our best attack —{" "}
              <span className="text-amber-400">
                {analysis.ownBestAttack.stars}★ {analysis.ownBestAttack.destruction}%
              </span>
              .
            </Highlight>
          )}
          {analysis.ownAverageTh != null && analysis.opponentAverageTh != null && (
            <Highlight>
              TH matchup: our avg{" "}
              <strong className="text-umbra-lilac">TH{analysis.ownAverageTh.toFixed(1)}</strong>{" "}
              vs their avg{" "}
              <strong className="text-red-300/90">TH{analysis.opponentAverageTh.toFixed(1)}</strong>
              {analysis.ownAverageTh - analysis.opponentAverageTh >= 1
                ? " — we had a Town Hall advantage."
                : analysis.opponentAverageTh - analysis.ownAverageTh >= 1
                  ? " — we were out-levelled."
                  : " — evenly matched on levels."}
            </Highlight>
          )}
          {analysis.ownNoAttackMembers != null && analysis.ownNoAttackMembers > 0 && (
            <Highlight>
              <strong className="text-red-300/90">{analysis.ownNoAttackMembers}</strong>{" "}
              member{analysis.ownNoAttackMembers === 1 ? "" : "s"} used no attacks.
            </Highlight>
          )}
          {attackLog.length === 0 && (
            <Highlight>No attacks were recorded for this war.</Highlight>
          )}
        </div>
      </div>

      {/* ---- Roster ---- */}
      <div className="mt-5">
        <WarRosters
          currentWar={w}
          onMemberClick={() => {}} // Disabled in detail view as per original concept
        />
      </div>

      {/* ---- Attack log ---- */}
      <div className="mt-5">
        <WarAttackLog
          attackLog={attackLog}
          warState={w.state}
          onMemberClick={() => {}} // Disabled in detail view
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small sub-components
// ---------------------------------------------------------------------------

function stateLabel(state: string): string {
  if (state === "preparation") return "Preparation";
  if (state === "inWar") return "Battle day";
  if (state === "warEnded") return "Ended";
  return state;
}

function resultFromStars(w: WarDetailView["detail"]): "win" | "loss" | "tie" | null {
  if (w.state !== "warEnded") return null;
  if (w.clan.stars > w.opponent.stars) return "win";
  if (w.clan.stars < w.opponent.stars) return "loss";
  if (w.clan.destructionPercentage > w.opponent.destructionPercentage) return "win";
  if (w.clan.destructionPercentage < w.opponent.destructionPercentage) return "loss";
  return "tie";
}



function StatCard({
  label,
  own,
  opp,
  ownTotal,
  oppTotal,
  format,
}: {
  label: string;
  own: number | null;
  opp: number | null;
  ownTotal?: number;
  oppTotal?: number;
  format: "percent" | "stars" | "fraction" | "number";
}) {
  const fmt = (v: number | null, total?: number) => {
    if (v === null) return "—";
    if (format === "percent") return `${Math.round(v * 100)}%`;
    if (format === "stars") return v.toFixed(1);
    if (format === "fraction") return total != null ? `${v}/${total}` : `${v}`;
    return `${v}`;
  };

  // Determine winner for subtle highlighting
  let ownWins = false;
  let oppWins = false;
  if (own !== null && opp !== null) {
    if (own > opp) {
      if (label === "No-attack") oppWins = true; else ownWins = true;
    } else if (opp > own) {
      if (label === "No-attack") ownWins = true; else oppWins = true;
    }
  }

  return (
    <div className="glass relative overflow-hidden rounded-xl p-3 sm:p-4 border border-umbra-line/50 transition-all duration-300 hover:border-umbra-purple/30 hover:bg-white/[.04]">
      {/* Subtle win glow */}
      {ownWins && <div className="pointer-events-none absolute left-0 top-0 h-full w-[2px] bg-emerald-400/50 shadow-[0_0_10px_rgba(52,211,153,0.3)]" />}
      {oppWins && <div className="pointer-events-none absolute right-0 top-0 h-full w-[2px] bg-red-400/50 shadow-[0_0_10px_rgba(248,113,113,0.3)]" />}
      
      <p className="text-micro font-semibold uppercase tracking-wider text-umbra-muted/80">{label}</p>
      
      <div className="mt-2 flex items-baseline justify-between gap-2">
        <span className={`font-display text-lg sm:text-xl font-bold ${ownWins ? "text-emerald-300 drop-shadow-[0_0_8px_rgba(110,231,183,0.3)]" : "text-umbra-lilac"}`}>
          {fmt(own, ownTotal)}
        </span>
        <span className={`font-display text-lg sm:text-xl font-bold ${oppWins ? "text-red-300 drop-shadow-[0_0_8px_rgba(252,165,165,0.3)]" : "text-red-300/80"}`}>
          {fmt(opp, oppTotal)}
        </span>
      </div>
      
      <div className="mt-1 flex justify-between text-[0.6rem] uppercase tracking-widest text-umbra-muted/40">
        <span>us</span>
        <span>them</span>
      </div>
    </div>
  );
}

function Highlight({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex items-start gap-3 overflow-hidden rounded-xl border border-white/5 bg-gradient-to-r from-white/[0.03] to-transparent p-3 text-xs leading-6 text-white/70">
      <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-umbra-purple" />
      {children}
    </div>
  );
}
