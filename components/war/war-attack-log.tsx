"use client";

import type { WarAttackLogEntry } from "@/lib/view-models/war";
import { EmptyState } from "@/components/ui/empty-state";
import { IconSwords } from "@/components/ui/icons";

/**
 * Attack log — every attack in the current war, ordered by attack order, with
 * attacker → defender, map positions, stars, destruction, and duration.
 * Own-clan attackers link to the shared member detail sheet; opponent
 * attackers are not clickable.
 *
 * Empty during preparation (no attacks yet).
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
      <section className="lunar-card flex flex-col" aria-labelledby="war-attacks-title">
        <p className="font-mono text-label uppercase tracking-[.16em] text-umbra-purple">Attack log</p>
        <h3 id="war-attacks-title" className="mt-1 font-display text-lg text-umbra-moonlight">Attacks</h3>
        <div className="mt-4">
          <EmptyState
            title={warState === "preparation" ? "No attacks yet" : "No attacks recorded"}
            description={warState === "preparation" ? "Attacks appear here once the battle day begins." : "No attacks were observed for this war."}
            icon={<IconSwords className="h-7 w-7" />}
          />
        </div>
      </section>
    );
  }

  return (
    <section className="lunar-card flex flex-col" aria-labelledby="war-attacks-title">
      <div className="flex items-center justify-between">
        <p className="font-mono text-label uppercase tracking-[.16em] text-umbra-purple">Attack log</p>
        <span className="text-2xs text-umbra-muted">{attackLog.length} attacks</span>
      </div>
      <h3 id="war-attacks-title" className="mt-1 font-display text-lg text-umbra-moonlight">Attacks</h3>

      <div className="mt-4 data-container">
        <table className="w-full text-left">
          <thead className="data-thead">
            <tr>
              <th className="w-8 data-th text-center">#</th>
              <th className="data-th">Attacker</th>
              <th className="data-th text-center"></th>
              <th className="data-th">Defender</th>
              <th className="data-th text-center">★</th>
              <th className="hidden data-th text-right sm:table-cell">Destr.</th>
              <th className="hidden data-th text-right sm:table-cell">Dur.</th>
            </tr>
          </thead>
          <tbody className="data-tbody">
            {attackLog.map((a) => (
              <tr key={a.order} className="data-tr">
                <td className="data-td text-center font-mono text-2xs text-umbra-muted">{a.order}</td>
                <td className="data-td">
                  <AttackParticipant
                    tag={a.attackerTag}
                    name={a.attackerName}
                    mapPosition={a.attackerMapPosition}
                    townhall={a.attackerTownhallLevel}
                    isOwnClan={a.attackerIsOwnClan}
                    onMemberClick={onMemberClick}
                  />
                </td>
                <td className="data-td text-center">
                  <IconSwords
                    className={`mx-auto h-3 w-3 ${a.attackerIsOwnClan ? "text-umbra-purple/60" : "text-red-400/60"}`}
                    aria-hidden
                  />
                </td>
                <td className="data-td">
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
                  <span className={a.stars >= 3 ? "text-amber-400" : "text-umbra-muted"}>
                    <Stars value={a.stars} />
                  </span>
                </td>
                <td className={`hidden data-td text-right font-mono text-2xs sm:table-cell ${a.destructionPercentage === 100 ? "text-amber-400" : "text-umbra-muted"}`}>
                  {a.destructionPercentage}%
                </td>
                <td className="hidden data-td text-right font-mono text-2xs text-umbra-muted sm:table-cell">
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
  const badgeColor = isOwnClan
    ? "bg-umbra-purple/15 text-umbra-purple"
    : "bg-red-400/10 text-red-300/90";
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
        {townhall != null && <span className="font-mono text-2xs text-umbra-faint">TH{townhall}</span>}
      </div>
    </span>
  );
  if (isOwnClan && tag) {
    return (
      <button
        type="button"
        onClick={() => onMemberClick(tag)}
        className="focus-ring -m-1 rounded-lg p-1 text-left transition hover:bg-umbra-purple/10"
      >
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
