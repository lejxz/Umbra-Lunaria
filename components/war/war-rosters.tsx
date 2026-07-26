"use client";

import { useState } from "react";
import type { CurrentWarDetail, WarRosterMember } from "@/lib/view-models/war";
import {
  IconArrowUp,
  IconArrowDown,
  IconShieldOff,
} from "@/components/ui/icons";

/**
 * Side-by-side own/opponent roster for the current war (docs/concept/07 §"Roster
 * and attack status" + §"Preparation-day scouting").
 */
export function WarRosters({
  currentWar,
  onMemberClick,
}: {
  currentWar: CurrentWarDetail;
  onMemberClick: (playerTag: string) => void;
}) {
  const isPrep = currentWar.state === "preparation";
  const [mode, setMode] = useState<"attacks" | "base">(
    isPrep ? "base" : "attacks",
  );

  // Opponent TH by map position — for the adv/disadv cue.
  const opponentThByPos = new Map<number, number>();
  for (const m of currentWar.opponent.members) {
    opponentThByPos.set(m.mapPosition, m.townhallLevel);
  }
  const ownThByPos = new Map<number, number>();
  for (const m of currentWar.clan.members) {
    ownThByPos.set(m.mapPosition, m.townhallLevel);
  }

  return (
    <section className="lunar-card flex flex-col" aria-labelledby="war-rosters-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-label uppercase tracking-[.16em] text-umbra-purple">
          {isPrep ? "Preparation · scout" : "War roster"}
        </p>
        <div className="flex items-center gap-3">
          <span className="text-2xs text-umbra-muted">
            {currentWar.clan.members.length} vs {currentWar.opponent.members.length}
          </span>
          {/* Toggle — only meaningful once attacks exist (battle/ended). */}
          {!isPrep && (
            <div
              role="tablist"
              aria-label="Roster right-column view"
              className="flex rounded-full border border-umbra-line bg-umbra-ink/40 p-0.5"
            >
              <ToggleTab
                active={mode === "attacks"}
                onClick={() => setMode("attacks")}
                label="Attacks"
              />
              <ToggleTab
                active={mode === "base"}
                onClick={() => setMode("base")}
                label="Base"
              />
            </div>
          )}
        </div>
      </div>
      <h3 id="war-rosters-title" className="mt-1 font-display text-lg text-umbra-moonlight">
        {isPrep ? "Roster scouting" : "Participant roster"}
      </h3>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <RosterColumn
          title="Our clan"
          members={currentWar.clan.members}
          tone="own"
          isPrep={isPrep}
          mode={mode}
          onMemberClick={onMemberClick}
          opposingThByPos={opponentThByPos}
        />
        <RosterColumn
          title="Opponent"
          members={currentWar.opponent.members}
          tone="opponent"
          isPrep={isPrep}
          mode={mode}
          onMemberClick={onMemberClick}
          opposingThByPos={ownThByPos}
        />
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-micro text-umbra-muted">
        <span className="flex items-center gap-1">
          <IconArrowUp className="h-3 w-3 text-emerald-400" /> TH advantage
        </span>
        <span className="flex items-center gap-1">
          <IconArrowDown className="h-3 w-3 text-red-400" /> TH disadvantage
        </span>
        {mode === "base" ? (
          <>
            <span>
              <span className="text-amber-400">★★★</span> base destroyed
            </span>
            <span>· = even / untouched</span>
          </>
        ) : (
          <>
            <span className="flex items-center gap-1">
              <IconShieldOff className="h-3 w-3 text-red-400" /> no attacks used
            </span>
            <span>
              <span className="text-amber-400">★★★</span> best attack
            </span>
          </>
        )}
      </div>
    </section>
  );
}

function ToggleTab({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`focus-ring rounded-full px-2.5 py-1 text-2xs font-semibold uppercase tracking-wider transition ${
        active
          ? "bg-umbra-purple/20 text-umbra-moonlight"
          : "text-umbra-muted hover:text-umbra-lilac"
      }`}
    >
      {label}
    </button>
  );
}

function RosterColumn({
  title,
  members,
  tone,
  isPrep,
  mode,
  onMemberClick,
  opposingThByPos,
}: {
  title: string;
  members: WarRosterMember[];
  tone: "own" | "opponent";
  isPrep: boolean;
  mode: "attacks" | "base";
  onMemberClick: (playerTag: string) => void;
  opposingThByPos: Map<number, number>;
}) {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-umbra-line bg-umbra-ink/40">
      <div className="flex items-center justify-between border-b border-umbra-line px-3 py-2 bg-umbra-surface/60">
        <span
          className={`font-display text-sm ${tone === "opponent" ? "text-red-300/90" : "text-umbra-moonlight"}`}
        >
          {title}
        </span>
        <span className="font-mono text-2xs text-umbra-muted">{members.length}</span>
      </div>
      <div className="max-h-[32rem] overflow-y-auto">
        {members.length === 0 ? (
          <p className="px-3 py-6 text-center text-2xs text-umbra-muted">
            No roster data
          </p>
        ) : (
          <table className="w-full text-left">
            <thead className="data-thead">
              <tr>
                <th className="data-th w-8 text-center">#</th>
                <th className="data-th">Player</th>
                <th className="data-th">TH</th>
                <th className="data-th text-center">Adv</th>
                <th className="data-th text-right">
                  {isPrep || mode === "base" ? "Base" : "Attacks"}
                </th>
              </tr>
            </thead>
            <tbody className="data-tbody">
              {members.map((m) => {
                const isOwn = tone === "own" && m.tag;
                return (
                  <RosterRow
                    key={`${m.tag}-${m.mapPosition}`}
                    m={m}
                    opposingThByPos={opposingThByPos}
                    isPrep={isPrep}
                    mode={mode}
                    isOwn={!!isOwn}
                    onClick={isOwn ? () => onMemberClick(m.tag!) : undefined}
                  />
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function RosterRow({
  m,
  opposingThByPos,
  isPrep,
  mode,
  isOwn,
  onClick,
}: {
  m: WarRosterMember;
  opposingThByPos: Map<number, number>;
  isPrep: boolean;
  mode: "attacks" | "base";
  isOwn: boolean;
  onClick?: () => void;
}) {
  const opposingTh = opposingThByPos.get(m.mapPosition);
  const diff = typeof opposingTh === "number" ? m.townhallLevel - opposingTh : null;

  const content = (
    <>
      {/* # — map position */}
      <td className="data-td text-center align-middle">
        <span className="flex h-5 w-5 items-center justify-center rounded bg-umbra-purple/15 mx-auto font-mono text-2xs font-semibold text-umbra-purple">
          {m.mapPosition}
        </span>
      </td>

      {/* Name */}
      <td className="data-td align-middle">
        <div className="min-w-0 truncate text-xs text-umbra-lilac" title={m.name}>
          {m.name}
        </div>
      </td>

      {/* TH — th-badge ramp */}
      <td className="data-td align-middle">
        <RosterThBadge level={m.townhallLevel} />
      </td>

      {/* TH advantage / disadvantage */}
      <td className="data-td text-center align-middle">
        <ThAdvantage diff={diff} ownTh={m.townhallLevel} oppTh={opposingTh ?? null} />
      </td>

      {/* Right column — attacks (offense) or base (defense) */}
      <td className="data-td text-right align-middle">
        {isPrep || mode === "base" ? (
          <BaseState
            stars={m.worstDefenseStars}
            destruction={m.worstDefenseDestruction}
            defendedAgainst={m.defendedAgainst}
            isPrep={isPrep}
          />
        ) : (
          <AttacksState
            attacksUsed={m.attacksUsed}
            attacksAllowed={m.attacksAllowed}
            attacksRemaining={m.attacksRemaining}
            bestStars={m.bestStars}
            bestDestruction={m.bestDestruction}
          />
        )}
      </td>
    </>
  );

  if (isOwn) {
    return (
      <tr
        onClick={onClick}
        tabIndex={0}
        role="button"
        className="group cursor-pointer data-tr focus-ring"
      >
        {content}
      </tr>
    );
  }

  return <tr className="data-tr">{content}</tr>;
}

/** Compact th-badge sized for the roster row. */
function RosterThBadge({ level }: { level: number }) {
  const toneClass =
    level >= 14 ? "th-high" : level >= 11 ? "th-mid" : "th-low";
  return (
    <span className={`th-badge ${toneClass}`} title={`Town Hall ${level}`}>
      {level}
    </span>
  );
}

function ThAdvantage({
  diff,
  ownTh,
  oppTh,
}: {
  diff: number | null;
  ownTh: number;
  oppTh: number | null;
}) {
  if (diff === null || oppTh === null) {
    return <span className="text-micro text-umbra-faint">—</span>;
  }
  if (diff === 0) {
    return (
      <span
        className="inline-flex items-center gap-0.5 text-micro text-umbra-muted"
        title={`Even matchup — both TH${ownTh}`}
      >
        =
      </span>
    );
  }
  const advantage = diff > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-micro font-semibold ${
        advantage ? "text-emerald-400" : "text-red-400"
      }`}
      title={`${advantage ? "Advantage" : "Disadvantage"}: TH${ownTh} vs TH${oppTh} (±${Math.abs(diff)})`}
    >
      {advantage ? (
        <IconArrowUp className="h-3 w-3" aria-hidden />
      ) : (
        <IconArrowDown className="h-3 w-3" aria-hidden />
      )}
      {Math.abs(diff)}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Right-column renderers
// ---------------------------------------------------------------------------

/**
 * Base state (defense) — the worst attack against this base. 3★ 100% =
 * destroyed (amber). Muted dash when untouched / during preparation.
 */
function BaseState({
  stars,
  destruction,
  defendedAgainst,
  isPrep,
}: {
  stars: number | null;
  destruction: number | null;
  defendedAgainst: number;
  isPrep: boolean;
}) {
  if (isPrep || stars === null || destruction === null) {
    return (
      <span
        className="justify-self-end font-mono text-2xs text-umbra-faint"
        title={isPrep ? "Base state hidden until battle day" : "Base not yet attacked"}
      >
        —
      </span>
    );
  }
  const destroyed = stars >= 3;
  return (
    <span
      className={`flex items-center justify-end gap-1.5 justify-self-end font-mono text-2xs ${
        destroyed ? "text-amber-400" : "text-umbra-muted"
      }`}
      title={`Base attacked ${defendedAgainst}× · worst result ${stars}★ ${destruction}%`}
    >
      <span className={destroyed ? "text-amber-400" : "text-umbra-muted/70"}>
        <Stars value={stars} />
      </span>
      <span className={destroyed ? "text-amber-400" : "text-umbra-muted"}>
        {destruction}%
      </span>
    </span>
  );
}

/**
 * Attacks state (offense) — attacks used/allowed, best stars/destruction, and
 * a prominent no-attack / attacks-left state.
 */
function AttacksState({
  attacksUsed,
  attacksAllowed,
  attacksRemaining,
  bestStars,
  bestDestruction,
}: {
  attacksUsed: number;
  attacksAllowed: number;
  attacksRemaining: number;
  bestStars: number | null;
  bestDestruction: number | null;
}) {
  const noAttack = attacksUsed === 0;
  return (
    <span className="flex items-center justify-end gap-1.5 justify-self-end">
      {/* Best attack stars/destruction (offense) — hidden when no attacks */}
      {bestStars != null && (
        <span
          className="font-mono text-2xs text-umbra-muted"
          title={`Best attack: ${bestStars}★ ${bestDestruction ?? 0}%`}
        >
          <Stars value={bestStars} />
          <span className="ml-1">{bestDestruction ?? 0}%</span>
        </span>
      )}
      {/* Urgency badge */}
      {noAttack ? (
        <span
          className="badge danger"
          title="No attacks used yet"
        >
          <span className="d" aria-hidden />
          <IconShieldOff className="h-3 w-3" aria-hidden />
          {attacksUsed}/{attacksAllowed}
        </span>
      ) : attacksRemaining > 0 ? (
        <span
          className="badge warn"
          title={`${attacksRemaining} attack${attacksRemaining === 1 ? "" : "s"} left`}
        >
          <span className="d" aria-hidden />
          {attacksUsed}/{attacksAllowed}
        </span>
      ) : (
        <span
          className="badge good"
          title="All attacks used"
        >
          <span className="d" aria-hidden />
          ✓ {attacksUsed}/{attacksAllowed}
        </span>
      )}
    </span>
  );
}

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex gap-px tracking-tight" aria-label={`${value} of 3 stars`}>
      {[0, 1, 2].map((i) => (
        <span key={i} className={i < value ? "opacity-100" : "opacity-25"}>
          ★
        </span>
      ))}
    </span>
  );
}
