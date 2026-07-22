"use client";

import type { CurrentWarDetail, WarRosterMember } from "@/lib/view-models/war";
import { IconArrowUp, IconArrowDown } from "@/components/ui/icons";

/**
 * Side-by-side own/opponent roster for the current war (concept/07 §"Roster
 * and attack status" + §"Preparation-day scouting").
 *
 * Compact row layout (per the UI redesign):
 *
 *   | # | Name | TH | TH adv/disadv |          ★★☆  % |
 *
 *   - #  — map position
 *   - Name — player name (own-clan rows are clickable into the member sheet)
 *   - TH — Town Hall level
 *   - TH adv/disadv — the Town Hall difference vs the opponent at the same map
 *     position. Advantage (our TH higher) = green ↑, disadvantage = red ↓,
 *     even = muted. This is the key preparation-scouting cue.
 *   - ★★☆ % (right-aligned) — the DEFENSIVE STATE of this member's base: the
 *     worst attack against it (max stars + max destruction opponents achieved).
 *     A 3★ 100% means the base is fully destroyed; untouched bases show a
 *     muted dash. During preparation there are no attacks, so every row shows
 *     the placeholder.
 *
 * Both rosters are ordered by map position. Opponent TH by map position drives
 * the adv/disadv cue for our clan; the opponent column shows the inverse.
 */
export function WarRosters({
  currentWar,
  onMemberClick,
}: {
  currentWar: CurrentWarDetail;
  onMemberClick: (playerTag: string) => void;
}) {
  const isPrep = currentWar.state === "preparation";

  // Opponent TH by map position — for the adv/disadv cue.
  const opponentThByPos = new Map<number, number>();
  for (const m of currentWar.opponent.members) {
    opponentThByPos.set(m.mapPosition, m.townhallLevel);
  }
  // Own TH by map position — for the opponent column's inverse cue.
  const ownThByPos = new Map<number, number>();
  for (const m of currentWar.clan.members) {
    ownThByPos.set(m.mapPosition, m.townhallLevel);
  }

  return (
    <section className="glass flex flex-col rounded-2xl p-5" aria-labelledby="war-rosters-title">
      <div className="flex items-center justify-between">
        <p className="font-mono text-label uppercase tracking-[.16em] text-umbra-purple">
          {isPrep ? "Preparation · scout" : "War roster"}
        </p>
        <span className="text-2xs text-umbra-muted">
          {currentWar.clan.members.length} vs {currentWar.opponent.members.length}
          {isPrep ? " · base state hidden until battle" : ""}
        </span>
      </div>
      <h3 id="war-rosters-title" className="mt-1 font-display text-lg text-umbra-lilac">
        {isPrep ? "Roster scouting" : "Participant roster"}
      </h3>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <RosterColumn
          title="Our clan"
          members={currentWar.clan.members}
          tone="own"
          isPrep={isPrep}
          onMemberClick={onMemberClick}
          opposingThByPos={opponentThByPos}
        />
        <RosterColumn
          title="Opponent"
          members={currentWar.opponent.members}
          tone="opponent"
          isPrep={isPrep}
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
        <span>
          <span className="text-amber-400">★★★</span> base destroyed
        </span>
        <span>· = even / untouched</span>
      </div>
    </section>
  );
}

function RosterColumn({
  title,
  members,
  tone,
  isPrep,
  onMemberClick,
  opposingThByPos,
}: {
  title: string;
  members: WarRosterMember[];
  tone: "own" | "opponent";
  isPrep: boolean;
  onMemberClick: (playerTag: string) => void;
  opposingThByPos: Map<number, number>;
}) {
  return (
    <div className="flex flex-col rounded-xl border border-umbra-line bg-white/[.02]">
      <div className="flex items-center justify-between border-b border-umbra-line px-3 py-2">
        <span
          className={`font-display text-sm ${tone === "opponent" ? "text-red-300/90" : "text-umbra-lilac"}`}
        >
          {title}
        </span>
        <span className="font-mono text-2xs text-umbra-muted">{members.length}</span>
      </div>
      <div className="max-h-96 overflow-y-auto">
        {members.length === 0 ? (
          <p className="px-3 py-6 text-center text-2xs text-umbra-muted">
            No roster data
          </p>
        ) : (
          <ul className="divide-y divide-umbra-line/60">
            {members.map((m) => {
              const content = (
                <RosterRow m={m} opposingThByPos={opposingThByPos} isPrep={isPrep} />
              );
              if (tone === "own" && m.tag) {
                return (
                  <li key={m.tag}>
                    <button
                      type="button"
                      onClick={() => onMemberClick(m.tag)}
                      className="focus-ring flex w-full items-center text-left transition hover:bg-umbra-purple/10"
                    >
                      {content}
                    </button>
                  </li>
                );
              }
              return (
                <li key={`${m.tag}-${m.mapPosition}`} className="flex items-center">
                  {content}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

/**
 * One roster row. Grid: `# | Name | TH | adv | base-state`.
 * Own-clan rows are wrapped in a <button> by the caller; the row itself is a
 * plain flex layout so it works inside either a button or a li.
 */
function RosterRow({
  m,
  opposingThByPos,
  isPrep,
}: {
  m: WarRosterMember;
  opposingThByPos: Map<number, number>;
  isPrep: boolean;
}) {
  const opposingTh = opposingThByPos.get(m.mapPosition);
  const diff =
    typeof opposingTh === "number" ? m.townhallLevel - opposingTh : null;

  return (
    <div className="grid w-full grid-cols-[1.5rem_1fr_auto] items-center gap-2 px-3 py-2 sm:grid-cols-[1.5rem_1fr_auto_auto_auto]">
      {/* # — map position */}
      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-umbra-purple/15 font-mono text-2xs font-semibold text-umbra-purple">
        {m.mapPosition}
      </span>

      {/* Name */}
      <span className="min-w-0 truncate text-xs text-umbra-lilac" title={m.name}>
        {m.name}
      </span>

      {/* TH (hidden on the narrowest screens — the adv column already shows TH context) */}
      <span className="hidden font-mono text-2xs text-umbra-muted sm:inline">
        TH{m.townhallLevel}
      </span>

      {/* TH advantage / disadvantage */}
      <ThAdvantage diff={diff} ownTh={m.townhallLevel} oppTh={opposingTh ?? null} />

      {/* Base state (right-aligned) — defense: worst attack against this base */}
      <BaseState
        stars={m.worstDefenseStars}
        destruction={m.worstDefenseDestruction}
        defendedAgainst={m.defendedAgainst}
        isPrep={isPrep}
      />
    </div>
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
    return <span className="hidden text-micro text-umbra-muted/50 sm:inline">—</span>;
  }
  if (diff === 0) {
    return (
      <span
        className="hidden items-center gap-0.5 text-micro text-umbra-muted sm:inline-flex"
        title={`Even matchup — both TH${ownTh}`}
      >
        = TH{ownTh}
      </span>
    );
  }
  const advantage = diff > 0;
  return (
    <span
      className={`hidden items-center gap-0.5 text-micro font-semibold sm:inline-flex ${
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

/**
 * Right-aligned base-state cell. Shows the worst attack against the base:
 * `★★★ 100%` (destroyed) down to `★☆☆ 45%`. Muted dash when untouched or
 * during preparation. 3-star fully-destroyed bases get an amber accent.
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
        className="justify-self-end font-mono text-2xs text-umbra-muted/40"
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
