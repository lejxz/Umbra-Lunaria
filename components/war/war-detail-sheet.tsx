"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Modal } from "@/components/ui/modal";
import type { WarDetailView } from "@/lib/view-models/war";
import type { ClanBadgeUrls } from "@/lib/view-models/dashboard";
import { TimeAgo } from "@/components/ui/time-ago";
import { IconSwords, IconLoader, IconAlert, IconWarEmpty } from "@/components/ui/icons";

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
        <ResultPill result={w.state === "warEnded" ? resultFromStars(w) : null} />
      </div>

      {/* ---- Score line ---- */}
      <div className="mt-4 flex items-center justify-center gap-4 rounded-xl bg-white/[.03] px-4 py-3">
        <ClanSide
          name={clanName ?? "Our Clan"}
          badgeUrls={clanBadgeUrls ?? null}
          stars={w.clan.stars}
          destruction={w.clan.destructionPercentage}
          attacks={w.clan.attacks}
          tone="own"
        />
        <div className="flex flex-col items-center px-2">
          <span className="font-mono text-label uppercase tracking-wider text-umbra-muted">score</span>
          <span className="mt-1 font-display text-2xl font-bold text-umbra-lilac">
            {w.clan.stars} – {w.opponent.stars}
          </span>
        </div>
        <ClanSide
          name={w.opponent.name}
          badgeUrls={w.opponent.badgeUrls}
          stars={w.opponent.stars}
          destruction={w.opponent.destructionPercentage}
          attacks={w.opponent.attacks}
          tone="opponent"
        />
      </div>

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

      {/* ---- Roster (compact) ---- */}
      <div className="mt-5">
        <p className="font-mono text-label uppercase tracking-[.16em] text-umbra-purple">
          Roster · base state
        </p>
        <h3 className="mt-1 font-display text-base text-umbra-lilac">Participant roster</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <RosterMini title="Our clan" members={w.clan.members} tone="own" />
          <RosterMini title="Opponent" members={w.opponent.members} tone="opponent" />
        </div>
      </div>

      {/* ---- Attack log ---- */}
      {attackLog.length > 0 && (
        <div className="mt-5">
          <p className="font-mono text-label uppercase tracking-[.16em] text-umbra-purple">
            Attack log · {attackLog.length} attacks
          </p>
          <h3 className="mt-1 font-display text-base text-umbra-lilac">Every attack</h3>
          <div className="mt-3 max-h-72 overflow-y-auto rounded-xl border border-umbra-line">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-10 bg-umbra-surface/95 backdrop-blur">
                <tr className="text-left text-2xs uppercase tracking-wider text-umbra-muted">
                  <th className="px-2 py-2 font-semibold">#</th>
                  <th className="px-2 py-2 font-semibold">Attacker</th>
                  <th className="px-2 py-2 text-center font-semibold">→</th>
                  <th className="px-2 py-2 font-semibold">Defender</th>
                  <th className="px-2 py-2 text-center font-semibold">★</th>
                  <th className="px-2 py-2 text-right font-semibold">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-umbra-line/60">
                {attackLog.map((a) => (
                  <tr key={a.order} className="text-xs">
                    <td className="px-2 py-1.5 font-mono text-2xs text-umbra-muted">{a.order}</td>
                    <td className="px-2 py-1.5">
                      <span className={a.attackerIsOwnClan ? "text-umbra-lilac" : "text-red-300/80"}>
                        {a.attackerName}
                      </span>
                      {a.attackerTownhallLevel != null && (
                        <span className="ml-1 text-micro text-umbra-muted">TH{a.attackerTownhallLevel}</span>
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-center text-umbra-purple/50">
                      <IconSwords className="mx-auto h-3 w-3" aria-hidden />
                    </td>
                    <td className="px-2 py-1.5">
                      <span className={a.defenderIsOwnClan ? "text-umbra-lilac" : "text-red-300/80"}>
                        {a.defenderName}
                      </span>
                      {a.defenderTownhallLevel != null && (
                        <span className="ml-1 text-micro text-umbra-muted">TH{a.defenderTownhallLevel}</span>
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <span className="text-amber-400">{"★".repeat(a.stars)}</span>
                      <span className="text-umbra-muted/30">{"★".repeat(3 - a.stars)}</span>
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono text-2xs text-umbra-muted">
                      {a.destructionPercentage}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
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

function ResultPill({ result }: { result: "win" | "loss" | "tie" | null }) {
  if (result === "win")
    return (
      <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-400">
        Victory
      </span>
    );
  if (result === "loss")
    return (
      <span className="rounded-full border border-red-400/30 bg-red-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-red-400">
        Defeat
      </span>
    );
  if (result === "tie")
    return (
      <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-400">
        Draw
      </span>
    );
  return (
    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-umbra-muted">
      Ongoing
    </span>
  );
}

function ClanSide({
  name,
  badgeUrls,
  stars,
  destruction,
  attacks,
  tone,
}: {
  name: string;
  badgeUrls: ClanBadgeUrls | null;
  stars: number;
  destruction: number;
  attacks: number;
  tone: "own" | "opponent";
}) {
  return (
    <div className="flex flex-1 flex-col items-center text-center">
      {badgeUrls?.small ? (
        <div className="relative mb-1 h-9 w-9">
          <Image
            src={badgeUrls.small}
            alt={`${name} badge`}
            fill
            className={`object-contain ${tone === "opponent" ? "grayscale" : ""}`}
          />
        </div>
      ) : (
        <IconWarEmpty className="mb-1 h-8 w-8 text-umbra-purple/40" />
      )}
      <p
        className={`max-w-[8rem] truncate text-2xs font-medium ${
          tone === "opponent" ? "text-red-300/90" : "text-umbra-lilac"
        }`}
      >
        {name}
      </p>
      <p className="mt-0.5 font-mono text-micro text-umbra-muted">
        {stars}★ · {destruction}% · {attacks} atk
      </p>
    </div>
  );
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
  return (
    <div className="rounded-xl border border-umbra-line bg-white/[.02] px-3 py-2.5">
      <p className="text-micro font-semibold uppercase tracking-wider text-umbra-muted">{label}</p>
      <div className="mt-1.5 flex items-baseline justify-between gap-2">
        <span className="font-display text-base font-bold text-umbra-lilac">
          {fmt(own, ownTotal)}
        </span>
        <span className="font-display text-base font-bold text-red-300/80">
          {fmt(opp, oppTotal)}
        </span>
      </div>
      <div className="mt-0.5 flex justify-between text-micro text-umbra-muted/60">
        <span>us</span>
        <span>them</span>
      </div>
    </div>
  );
}

function Highlight({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-umbra-line bg-white/[.02] px-3 py-1.5 text-2xs leading-5 text-umbra-muted">
      {children}
    </p>
  );
}

function RosterMini({
  title,
  members,
  tone,
}: {
  title: string;
  members: WarDetailView["detail"]["clan"]["members"];
  tone: "own" | "opponent";
}) {
  return (
    <div className="rounded-xl border border-umbra-line bg-white/[.02]">
      <div className="flex items-center justify-between border-b border-umbra-line px-3 py-1.5">
        <span
          className={`text-2xs font-semibold uppercase tracking-wider ${
            tone === "opponent" ? "text-red-300/80" : "text-umbra-lilac"
          }`}
        >
          {title}
        </span>
        <span className="font-mono text-micro text-umbra-muted">{members.length}</span>
      </div>
      <ul className="max-h-48 divide-y divide-umbra-line/60 overflow-y-auto">
        {members.map((m) => (
          <li
            key={`${m.tag}-${m.mapPosition}`}
            className="grid grid-cols-[1.25rem_1fr_auto] items-center gap-2 px-3 py-1.5"
          >
            <span className="font-mono text-micro text-umbra-purple/80">{m.mapPosition}</span>
            <span className="truncate text-2xs text-umbra-lilac" title={m.name}>
              {m.name} <span className="text-umbra-muted">· TH{m.townhallLevel}</span>
            </span>
            <BaseStateMini
              stars={m.worstDefenseStars}
              destruction={m.worstDefenseDestruction}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function BaseStateMini({
  stars,
  destruction,
}: {
  stars: number | null;
  destruction: number | null;
}) {
  if (stars === null || destruction === null) {
    return <span className="font-mono text-micro text-umbra-muted/40">—</span>;
  }
  const destroyed = stars >= 3;
  return (
    <span
      className={`font-mono text-micro ${destroyed ? "text-amber-400" : "text-umbra-muted"}`}
      title={`Base worst: ${stars}★ ${destruction}%`}
    >
      {stars}★ {destruction}%
    </span>
  );
}
