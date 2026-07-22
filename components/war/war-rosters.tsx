"use client";

import type { CurrentWarDetail, WarRosterMember } from "@/lib/view-models/war";
import { IconShieldOff } from "@/components/ui/icons";

/**
 * Side-by-side own/opponent roster for the current war (concept/07 §"Roster
 * and attack status" + §"Preparation-day scouting").
 *
 *   - Both rosters ordered by map position.
 *   - Own-clan members are clickable into the shared member detail sheet;
 *     opponent tags are not (they are not in `members`).
 *   - During battle, members with 0 attacks get a prominent no-attack state
 *     without being labelled a failure before battle timing warrants it.
 *   - During preparation, a Town Hall mismatch cue flags positions where the
 *     two clans differ by ≥2 TH levels — a discussion aid, not an assignment.
 */
export function WarRosters({
  currentWar,
  onMemberClick,
}: {
  currentWar: CurrentWarDetail;
  onMemberClick: (playerTag: string) => void;
}) {
  const isPrep = currentWar.state === "preparation";
  const isBattle = currentWar.state === "inWar";

  // Opponent TH by map position — for preparation mismatch cues.
  const opponentThByPos = new Map<number, number>();
  for (const m of currentWar.opponent.members) {
    opponentThByPos.set(m.mapPosition, m.townhallLevel);
  }

  return (
    <section className="glass flex flex-col rounded-2xl p-5" aria-labelledby="war-rosters-title">
      <div className="flex items-center justify-between">
        <p className="font-mono text-label uppercase tracking-[.16em] text-umbra-purple">
          {isPrep ? "Preparation · scout" : "War roster"}
        </p>
        <span className="text-2xs text-umbra-muted">
          {currentWar.clan.members.length} vs {currentWar.opponent.members.length}
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
          isBattle={isBattle}
          onMemberClick={onMemberClick}
          opponentThByPos={isPrep ? opponentThByPos : undefined}
        />
        <RosterColumn
          title="Opponent"
          members={currentWar.opponent.members}
          tone="opponent"
          isPrep={isPrep}
          isBattle={isBattle}
          onMemberClick={onMemberClick}
          opponentThByPos={undefined}
        />
      </div>
    </section>
  );
}

function RosterColumn({
  title,
  members,
  tone,
  isPrep,
  isBattle,
  onMemberClick,
  opponentThByPos,
}: {
  title: string;
  members: WarRosterMember[];
  tone: "own" | "opponent";
  isPrep: boolean;
  isBattle: boolean;
  onMemberClick: (playerTag: string) => void;
  opponentThByPos?: Map<number, number>;
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
              const mismatch =
                isPrep &&
                opponentThByPos &&
                Math.abs((opponentThByPos.get(m.mapPosition) ?? 0) - m.townhallLevel) >= 2;
              const noAttack = isBattle && m.attacksUsed === 0;
              const content = (
                <RosterRow
                  m={m}
                  isPrep={isPrep}
                  noAttack={!!noAttack}
                  mismatch={!!mismatch}
                />
              );
              if (tone === "own" && m.tag) {
                return (
                  <li key={m.tag}>
                    <button
                      type="button"
                      onClick={() => onMemberClick(m.tag)}
                      className="focus-ring flex w-full items-center gap-2 px-3 py-2 text-left transition hover:bg-umbra-purple/10"
                    >
                      {content}
                    </button>
                  </li>
                );
              }
              return (
                <li key={`${m.tag}-${m.mapPosition}`} className="flex items-center gap-2 px-3 py-2">
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

function RosterRow({
  m,
  isPrep,
  noAttack,
  mismatch,
}: {
  m: WarRosterMember;
  isPrep: boolean;
  noAttack: boolean;
  mismatch: boolean;
}) {
  return (
    <>
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-umbra-purple/15 font-mono text-2xs font-semibold text-umbra-purple">
        {m.mapPosition}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-xs text-umbra-lilac">{m.name}</span>
          {mismatch && (
            <span
              title="Town Hall mismatch with the opposing map position"
              className="shrink-0 rounded border border-amber-400/30 bg-amber-400/10 px-1 text-micro font-semibold uppercase text-amber-400"
            >
              TH{m.townhallLevel} mismatch
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-2xs text-umbra-muted">
          <span>TH{m.townhallLevel}</span>
          {!isPrep && (
            <>
              <span>·</span>
              <span>
                {m.attacksUsed}/{m.attacksAllowed} atk
              </span>
              {m.bestStars != null && (
                <>
                  <span>·</span>
                  <span className="text-amber-400">★{m.bestStars}</span>
                  {m.bestDestruction != null && <span>{m.bestDestruction}%</span>}
                </>
              )}
            </>
          )}
        </div>
      </div>
      {!isPrep && (
        <span className="shrink-0">
          {noAttack ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-red-400/30 bg-red-400/10 px-1.5 py-0.5 text-micro font-semibold uppercase text-red-400">
              <IconShieldOff className="h-3 w-3" aria-hidden />
              {m.attacksRemaining} left
            </span>
          ) : m.attacksRemaining > 0 ? (
            <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-1.5 py-0.5 text-micro font-semibold uppercase text-amber-400">
              {m.attacksRemaining} left
            </span>
          ) : (
            <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-1.5 py-0.5 text-micro font-semibold uppercase text-emerald-400">
              done
            </span>
          )}
        </span>
      )}
    </>
  );
}
