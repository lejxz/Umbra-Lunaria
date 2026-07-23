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

      <div className="mt-4 max-h-[28rem] overflow-y-auto rounded-xl border border-umbra-line/60">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-10 bg-umbra-surface/95 backdrop-blur">
            <tr className="text-left text-2xs uppercase tracking-wider text-umbra-muted">
              <th className="px-2.5 py-2 font-semibold">#</th>
              <th className="px-2.5 py-2 font-semibold">Attacker</th>
              <th className="px-2.5 py-2 text-center font-semibold">→</th>
              <th className="px-2.5 py-2 font-semibold">Defender</th>
              <th className="px-2.5 py-2 text-center font-semibold">★</th>
              <th className="hidden px-2.5 py-2 text-right font-semibold sm:table-cell">Destr.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-umbra-line/40">
            {attackLog.map((a) => (
              <tr key={a.order} className="text-sm transition hover:bg-white/[.03]">
                <td className="px-2.5 py-1.5 font-mono text-2xs text-umbra-muted/70">{a.order}</td>
                <td className="px-2.5 py-1.5">
                  <AttackParticipant
                    tag={a.attackerTag}
                    name={a.attackerName}
                    mapPosition={a.attackerMapPosition}
                    townhall={a.attackerTownhallLevel}
                    isOwnClan={a.attackerIsOwnClan}
                    onMemberClick={onMemberClick}
                  />
                </td>
                <td className="px-2.5 py-1.5 text-center text-umbra-purple/40">
                  <IconSwords className="mx-auto h-3 w-3" aria-hidden />
                </td>
                <td className="px-2.5 py-1.5">
                  <AttackParticipant
                    tag={a.defenderTag}
                    name={a.defenderName}
                    mapPosition={a.defenderMapPosition}
                    townhall={a.defenderTownhallLevel}
                    isOwnClan={a.defenderIsOwnClan}
                    onMemberClick={onMemberClick}
                  />
                </td>
                <td className="px-2.5 py-1.5 text-center">
                  <StarPill value={a.stars} />
                </td>
                <td className="hidden px-2.5 py-1.5 text-right font-mono text-micro text-umbra-muted sm:table-cell">
                  {a.destructionPercentage}%
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
  const inner = (
    <span className="flex items-center gap-1.5">
      {mapPosition != null && (
        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-umbra-purple/15 font-mono text-2xs font-semibold text-umbra-purple">
          {mapPosition}
        </span>
      )}
      <span className={`truncate ${isOwnClan ? "text-umbra-lilac" : "text-red-300/80"}`}>{name}</span>
      {townhall != null && <span className="shrink-0 text-2xs text-umbra-muted/60">TH{townhall}</span>}
    </span>
  );
  if (isOwnClan && tag) {
    return (
      <button type="button" onClick={() => onMemberClick(tag)} className="focus-ring rounded text-left transition hover:underline">
        {inner}
      </button>
    );
  }
  return inner;
}

/** A compact colored star pill: 0★ = muted, 1★ = red, 2★ = amber, 3★ = emerald. */
function StarPill({ value }: { value: number }) {
  const tone =
    value >= 3
      ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-400"
      : value === 2
        ? "border-amber-400/30 bg-amber-400/10 text-amber-400"
        : value === 1
          ? "border-red-400/30 bg-red-400/10 text-red-400"
          : "border-white/10 bg-white/5 text-umbra-muted/50";
  return (
    <span className={`inline-flex items-center gap-px rounded border px-1.5 py-0.5 text-micro font-bold ${tone}`} aria-label={`${value} stars`}>
      {value}<span className="opacity-70">★</span>
    </span>
  );
}
