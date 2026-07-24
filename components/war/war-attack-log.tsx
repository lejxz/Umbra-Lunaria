"use client";

import type { WarAttackLogEntry } from "@/lib/view-models/war";
import { EmptyState } from "@/components/ui/empty-state";
import { IconSwords } from "@/components/ui/icons";

/**
 * Attack log — every attack in the current war, ordered by attack order, with
 * attacker → defender, map positions, stars, destruction, and duration
 * (concept/07 §"Attack log"). Own-clan attackers link to the shared member
 * detail sheet; opponent attackers are not clickable.
 *
 * Improved: tighter rows, colored star pills, clearer attacker/defender
 * separation. Empty during preparation (no attacks yet).
 */
export function WarAttackLog({
  attackLog,
  warState,
  onMemberClick,
}: {
  attackLog: WarAttackLogEntry[];
  warState: "preparation" | "inWar" | "warEnded";
  onMemberClick: (playerTag: string) => void;
}) {
  if (warState === "preparation" || attackLog.length === 0) {
    return (
      <section className="glass flex flex-col rounded-2xl p-5" aria-labelledby="war-attacks-title">
        <p className="font-mono text-label uppercase tracking-[.16em] text-umbra-purple">Attack log</p>
        <h3 id="war-attacks-title" className="mt-1 font-display text-lg text-umbra-lilac">Attacks</h3>
        <div className="mt-4">
          <EmptyState
            title={warState === "preparation" ? "No attacks yet" : "No attacks recorded"}
            description={warState === "preparation" ? "Attacks appear here once the battle day begins." : "No attacks were observed for this war."}
          />
        </div>
      </section>
    );
  }

  return (
    <section className="glass flex flex-col rounded-2xl p-5" aria-labelledby="war-attacks-title">
      <div className="flex items-center justify-between">
        <p className="font-mono text-label uppercase tracking-[.16em] text-umbra-purple">Attack log</p>
        <span className="text-2xs text-umbra-muted">{attackLog.length} attacks</span>
      </div>
      <h3 id="war-attacks-title" className="mt-1 font-display text-lg text-umbra-lilac">Attacks</h3>

      <div className="mt-4 max-h-[32rem] overflow-y-auto rounded-xl border border-umbra-line bg-white/[.02]">
        <table className="w-full text-left">
          <thead className="sticky top-0 z-10 border-b border-umbra-line bg-umbra-ink/95 font-mono text-2xs uppercase text-umbra-muted backdrop-blur supports-[backdrop-filter]:bg-umbra-ink/80">
            <tr>
              <th className="w-8 px-3 py-2 text-center font-medium">#</th>
              <th className="px-3 py-2 font-medium">Attacker</th>
              <th className="px-3 py-2 text-center font-medium"></th>
              <th className="px-3 py-2 font-medium">Defender</th>
              <th className="px-3 py-2 text-center font-medium">★</th>
              <th className="hidden px-3 py-2 text-right font-medium sm:table-cell">Destr.</th>
              <th className="hidden px-3 py-2 text-right font-medium sm:table-cell">Dur.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-umbra-line/60">
            {attackLog.map((a) => (
              <tr key={a.order} className="text-sm transition hover:bg-umbra-purple/10">
                <td className="px-3 py-2 text-center align-middle font-mono text-2xs text-umbra-muted/70">{a.order}</td>
                <td className="px-3 py-2 align-middle">
                  <AttackParticipant
                    tag={a.attackerTag}
                    name={a.attackerName}
                    mapPosition={a.attackerMapPosition}
                    townhall={a.attackerTownhallLevel}
                    isOwnClan={a.attackerIsOwnClan}
                    onMemberClick={onMemberClick}
                  />
                </td>
                <td className="px-3 py-2 text-center align-middle">
                  <IconSwords 
                    className={`mx-auto h-3 w-3 ${a.attackerIsOwnClan ? "text-umbra-purple/60" : "text-red-400/60"}`} 
                    aria-hidden 
                  />
                </td>
                <td className="px-3 py-2 align-middle">
                  <AttackParticipant
                    tag={a.defenderTag}
                    name={a.defenderName}
                    mapPosition={a.defenderMapPosition}
                    townhall={a.defenderTownhallLevel}
                    isOwnClan={a.defenderIsOwnClan}
                    onMemberClick={onMemberClick}
                  />
                </td>
                <td className="px-3 py-2 text-center align-middle">
                  <span className={a.stars >= 3 ? "text-amber-400" : "text-umbra-muted/70"}>
                    <Stars value={a.stars} />
                  </span>
                </td>
                <td className={`hidden px-3 py-2 text-right align-middle font-mono text-2xs sm:table-cell ${a.destructionPercentage === 100 ? "text-amber-400" : "text-umbra-muted"}`}>
                  {a.destructionPercentage}%
                </td>
                <td className="hidden px-3 py-2 text-right align-middle font-mono text-2xs text-umbra-muted/50 sm:table-cell">
                  {a.duration}s
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function AttackParticipant({
  tag,
  name,
  mapPosition,
  townhall,
  isOwnClan,
  onMemberClick,
}: {
  tag: string;
  name: string;
  mapPosition: number | null;
  townhall: number | null;
  isOwnClan: boolean;
  onMemberClick: (playerTag: string) => void;
}) {
  const isOpponent = !isOwnClan;
  const badgeColor = isOwnClan
    ? "bg-umbra-purple/15 text-umbra-purple"
    : "bg-red-400/10 text-red-400/90";
  const nameColor = isOwnClan ? "text-umbra-lilac" : "text-red-300/80";

  const inner = (
    <span className="flex items-center gap-2">
      {mapPosition != null && (
        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded font-mono text-2xs font-semibold ${badgeColor}`}>
          {mapPosition}
        </span>
      )}
      <div className="flex min-w-0 flex-col justify-center">
        <span className={`truncate text-xs ${nameColor}`}>{name}</span>
        {townhall != null && <span className="font-mono text-2xs text-umbra-muted/60">TH{townhall}</span>}
      </div>
    </span>
  );
  if (isOwnClan && tag) {
    return (
      <button type="button" onClick={() => onMemberClick(tag)} className="focus-ring -m-1 rounded-md p-1 text-left transition hover:bg-umbra-purple/10">
        {inner}
      </button>
    );
  }
  return inner;
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
