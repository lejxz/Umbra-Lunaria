"use client";

import type { WarAttackLogEntry } from "@/lib/view-models/war";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { IconSwords } from "@/components/ui/icons";

/**
 * Attack log — every attack in the current war, ordered by attack order, with
 * attacker → defender, map positions, stars, destruction, and duration
 * (docs/concept/07 §"Attack log"). Own-clan attackers link to the shared member
 * detail sheet; opponent attackers are not clickable.
 *
 * Improved: tighter rows, colored star pills, clearer attacker/defender
 * separation. Empty during preparation (no attacks yet).
 */
export function WarAttackLog({
  attackLog,
  warState,
  onMemberClick,
  contained = true,
}: {
  attackLog: WarAttackLogEntry[];
  warState: "preparation" | "inWar" | "warEnded";
  onMemberClick: (playerTag: string) => void;
  contained?: boolean;
}) {
  if (warState === "preparation" || attackLog.length === 0) {
    return (
      <section className={contained ? "glass flex flex-col rounded-2xl p-5" : "flex flex-col"} aria-labelledby="war-attacks-title">
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
    <section className={contained ? "glass flex flex-col rounded-2xl p-5" : "flex flex-col"} aria-labelledby="war-attacks-title">
      {contained ? (
        <>
          <div className="flex items-center justify-between">
            <p className="font-mono text-label uppercase tracking-[.16em] text-umbra-purple">Attack log</p>
            <Badge tone="muted">{attackLog.length} attacks</Badge>
          </div>
          <h3 id="war-attacks-title" className="mt-1 font-display text-lg text-umbra-lilac">Attacks</h3>
        </>
      ) : (
        <div className="flex justify-end mb-4">
          <Badge tone="muted">{attackLog.length} attacks</Badge>
        </div>
      )}

      <div className="mt-4 data-container">
        <table className="w-full text-left">
          <thead className="data-thead">
            <tr>
              <th className="w-8 data-th text-center">#</th>
              <th className="w-1/2 data-th text-right pr-4">Attacker</th>
              <th className="w-8 data-th text-center px-0"></th>
              <th className="w-1/2 data-th pl-4">Defender</th>
              <th className="w-12 data-th text-center">★</th>
              <th className="hidden w-16 data-th text-right sm:table-cell">Destr.</th>
              <th className="hidden w-16 data-th text-right sm:table-cell">Dur.</th>
            </tr>
          </thead>
          <tbody className="data-tbody">
            {attackLog.map((a) => (
              <tr key={a.order} className="text-sm data-tr">
                <td className="data-td text-center font-mono text-2xs text-umbra-muted/70">{a.order}</td>
                <td className="data-td text-right pr-4">
                  <AttackParticipant
                    tag={a.attackerTag}
                    name={a.attackerName}
                    mapPosition={a.attackerMapPosition}
                    townhall={a.attackerTownhallLevel}
                    isOwnClan={a.attackerIsOwnClan}
                    reverse={true}
                    onMemberClick={onMemberClick}
                  />
                </td>
                <td className="data-td text-center px-0">
                  <IconSwords 
                    className={`mx-auto h-3 w-3 ${a.attackerIsOwnClan ? "text-umbra-purple/60" : "text-red-400/60"}`} 
                    aria-hidden 
                  />
                </td>
                <td className="data-td pl-4">
                  <AttackParticipant
                    tag={a.defenderTag}
                    name={a.defenderName}
                    mapPosition={a.defenderMapPosition}
                    townhall={a.defenderTownhallLevel}
                    isOwnClan={a.defenderIsOwnClan}
                    onMemberClick={onMemberClick}
                  />
                </td>
                <td className="data-td text-center">
                  <span className={a.stars >= 3 ? "text-amber-400" : "text-umbra-muted/70"}>
                    <Stars value={a.stars} />
                  </span>
                </td>
                <td className={`hidden data-td text-right font-mono text-2xs sm:table-cell ${a.destructionPercentage === 100 ? "text-amber-400" : "text-umbra-muted"}`}>
                  {a.destructionPercentage}%
                </td>
                <td className="hidden data-td text-right font-mono text-2xs text-umbra-muted/50 sm:table-cell">
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
  reverse = false,
  onMemberClick,
}: {
  tag: string;
  name: string;
  mapPosition: number | null;
  townhall: number | null;
  isOwnClan: boolean;
  reverse?: boolean;
  onMemberClick: (playerTag: string) => void;
}) {
  const badgeColor = isOwnClan
    ? "bg-umbra-purple/15 text-umbra-purple"
    : "bg-red-400/10 text-red-400/90";
  const nameColor = isOwnClan ? "text-umbra-lilac" : "text-red-300/80";

  const inner = (
    <span className={`flex items-center gap-2 ${reverse ? "flex-row-reverse" : ""}`}>
      {mapPosition != null && (
        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded font-mono text-2xs font-semibold ${badgeColor}`}>
          {mapPosition}
        </span>
      )}
      <div className={`flex min-w-0 flex-col justify-center ${reverse ? "items-end text-right" : ""}`}>
        <span className={`truncate text-xs ${nameColor}`}>{name}</span>
        {townhall != null && <span className="font-mono text-2xs text-umbra-muted/60">TH{townhall}</span>}
      </div>
    </span>
  );
  if (isOwnClan && tag) {
    return (
      <button type="button" onClick={() => onMemberClick(tag)} className="focus-ring -m-1 rounded-lg p-1 text-left transition hover:bg-umbra-purple/10">
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
