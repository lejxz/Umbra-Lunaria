"use client";

import { useState } from "react";
import type { CurrentWarDetail, WarRosterMember } from "@/lib/view-models/war";
import {
  IconArrowUp,
  IconArrowDown,
  IconShieldOff,
  IconCheck,
} from "@/components/ui/icons";

/**
 * Side-by-side own/opponent roster for the current war (concept/07 §"Roster
 * and attack status" + §"Preparation-day scouting").
 *
 * Improved layout:
 *   - Sticky column headers (Our clan / Opponent) that stay visible on scroll.
 *   - A compact, scannable row: `# | Name TH | adv | right-column`.
 *   - TH advantage is a graded pill (↑N green / ↓N red / = muted).
 *   - The right column adapts to state + a user toggle:
 *       Preparation → "base" (defense: base destroyed state).
 *       Battle/ended → "attacks" (offense: best attack + urgency badge).
 *
 * Own-clan rows link to the shared member detail sheet; opponent rows don't.
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

  const opponentThByPos = new Map<number, number>();
  for (const m of currentWar.opponent.members) {
    opponentThByPos.set(m.mapPosition, m.townhallLevel);
  }
  const ownThByPos = new Map<number, number>();
  for (const m of currentWar.clan.members) {
    ownThByPos.set(m.mapPosition, m.townhallLevel);
  }

  return (
    <section className="glass flex flex-col rounded-2xl p-5" aria-labelledby="war-rosters-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-label uppercase tracking-[.16em] text-umbra-purple">
          {isPrep ? "Preparation · scout" : "War roster"}
        </p>
        <div className="flex items-center gap-3">
          <span className="text-2xs text-umbra-muted">
            {currentWar.clan.members.length} vs {currentWar.opponent.members.length}
          </span>
          {!isPrep && (
            <div
              role="tablist"
              aria-label="Roster right-column view"
              className="flex rounded-full border border-umbra-line bg-umbra-ink/40 p-0.5"
            >
              <ToggleTab active={mode === "attacks"} onClick={() => setMode("attacks")} label="Attacks" />
              <ToggleTab active={mode === "base"} onClick={() => setMode("base")} label="Base" />
            </div>
          )}
        </div>
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
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-2xs text-umbra-muted">
        <span className="flex items-center gap-1">
          <IconArrowUp className="h-3 w-3 text-emerald-400" /> TH advantage
        </span>
        <span className="flex items-center gap-1">
          <IconArrowDown className="h-3 w-3 text-red-400" /> TH disadvantage
        </span>
        {mode === "base" ? (
          <span>
            <span className="text-amber-400">★★★</span> base destroyed
          </span>
        ) : (
          <>
            <span className="flex items-center gap-1">
              <IconShieldOff className="h-3 w-3 text-red-400" /> no attacks
            </span>
            <span className="flex items-center gap-1">
              <IconCheck className="h-3 w-3 text-emerald-400" /> all attacks used
            </span>
          </>
        )}
      </div>
    </section>
  );
}

function ToggleTab({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`focus-ring rounded-full px-2.5 py-1 text-2xs font-semibold uppercase tracking-wider transition ${
        active ? "bg-umbra-purple/20 text-umbra-lilac" : "text-umbra-muted hover:text-umbra-lilac"
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
    <div className="flex flex-col overflow-hidden rounded-xl border border-umbra-line bg-white/[.02]">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-umbra-line bg-umbra-surface/95 px-3 py-2 backdrop-blur">
        <span className={`font-display text-sm ${tone === "opponent" ? "text-red-300/90" : "text-umbra-lilac"}`}>
          {title}
        </span>
        <span className="font-mono text-2xs text-umbra-muted">{members.length}</span>
      </div>
      <div className="max-h-96 overflow-y-auto">
        {members.length === 0 ? (
          <p className="px-3 py-6 text-center text-2xs text-umbra-muted">No roster data</p>
        ) : (
          <ul className="divide-y divide-umbra-line/40">
            {members.map((m) => {
              const content = <RosterRow m={m} opposingThByPos={opposingThByPos} isPrep={isPrep} mode={mode} />;
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
 * One roster row. Grid: `# | Name+TH | adv | right-column`.
 */
function RosterRow({
  m,
  opposingThByPos,
  isPrep,
  mode,
}: {
  m: WarRosterMember;
  opposingThByPos: Map<number, number>;
  isPrep: boolean;
  mode: "attacks" | "base";
}) {
  const opposingTh = opposingThByPos.get(m.mapPosition);
  const diff = typeof opposingTh === "number" ? m.townhallLevel - opposingTh : null;

  return (
    <div className="grid w-full grid-cols-[1.75rem_1fr_auto] items-center gap-2 px-3 py-2 sm:grid-cols-[1.75rem_1fr_auto_auto]">
      {/* # — map position */}
      <span className="flex h-5 w-5 items-center justify-center rounded bg-umbra-purple/15 font-mono text-2xs font-semibold text-umbra-purple">
        {m.mapPosition}
      </span>

      {/* Name + TH (combined to save horizontal space) */}
      <div className="min-w-0">
        <span className="block truncate text-sm text-umbra-lilac" title={m.name}>
          {m.name}
        </span>
        <span className="font-mono text-2xs text-umbra-muted">TH{m.townhallLevel}</span>
      </div>

      {/* TH advantage / disadvantage */}
      <ThAdvantage diff={diff} ownTh={m.townhallLevel} oppTh={opposingTh ?? null} />

      {/* Right column — attacks (offense) or base (defense) */}
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
    </div>
  );
}

function ThAdvantage({ diff, ownTh, oppTh }: { diff: number | null; ownTh: number; oppTh: number | null }) {
  if (diff === null || oppTh === null) {
    return <span className="hidden text-2xs text-umbra-muted/40 sm:inline">—</span>;
  }
  if (diff === 0) {
    return (
      <span
        className="hidden items-center text-2xs text-umbra-muted/60 sm:inline-flex"
        title={`Even — both TH${ownTh}`}
      >
        =
      </span>
    );
  }
  const advantage = diff > 0;
  return (
    <span
      className={`hidden items-center gap-0.5 rounded px-1 text-2xs font-semibold sm:inline-flex ${
        advantage ? "text-emerald-400" : "text-red-400"
      }`}
      title={`${advantage ? "Advantage" : "Disadvantage"}: TH${ownTh} vs TH${oppTh} (±${Math.abs(diff)})`}
    >
      {advantage ? <IconArrowUp className="h-3 w-3" aria-hidden /> : <IconArrowDown className="h-3 w-3" aria-hidden />}
      {Math.abs(diff)}
    </span>
  );
}

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
      className={`flex items-center justify-end gap-1 justify-self-end font-mono text-2xs ${destroyed ? "text-amber-400" : "text-umbra-muted"}`}
      title={`Base attacked ${defendedAgainst}× · worst result ${stars}★ ${destruction}%`}
    >
      <Stars value={stars} />
      <span>{destruction}%</span>
    </span>
  );
}

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
      {bestStars != null && (
        <span className="font-mono text-2xs text-umbra-muted" title={`Best attack: ${bestStars}★ ${bestDestruction ?? 0}%`}>
          <Stars value={bestStars} />
        </span>
      )}
      {noAttack ? (
        <span
          className="inline-flex items-center gap-0.5 rounded-full border border-red-400/30 bg-red-400/10 px-1.5 py-0.5 text-2xs font-semibold uppercase text-red-400"
          title="No attacks used yet"
        >
          <IconShieldOff className="h-2.5 w-2.5" aria-hidden />
          {attacksUsed}/{attacksAllowed}
        </span>
      ) : attacksRemaining > 0 ? (
        <span
          className="rounded-full border border-amber-400/30 bg-amber-400/10 px-1.5 py-0.5 text-2xs font-semibold uppercase text-amber-400"
          title={`${attacksRemaining} attack${attacksRemaining === 1 ? "" : "s"} left`}
        >
          {attacksUsed}/{attacksAllowed}
        </span>
      ) : (
        <span
          className="inline-flex items-center gap-0.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-1.5 py-0.5 text-2xs font-semibold uppercase text-emerald-400"
          title="All attacks used"
        >
          <IconCheck className="h-2.5 w-2.5" aria-hidden />
          {attacksUsed}/{attacksAllowed}
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
