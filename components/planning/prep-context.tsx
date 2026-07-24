"use client";

/**
 * PrepContext — preparation-day opponent context panel.
 *
 * Shows the opponent clan's roster (map position + TH level + name) when a war
 * is in preparation. This is for *scouting* — leadership matches TH levels
 * against our selected lineup. Per concept/09, the planner NEVER auto-assigns
 * targets; this panel is read-only context.
 *
 * Collapsible so it doesn't crowd the two-panel layout on smaller screens.
 */

import { useState } from "react";
import { IconChevronDown, IconChevronUp, IconSwords } from "@/components/ui/icons";
import type { PrepWarContext, PrepOpponentMember } from "@/lib/planning/types";

export function PrepContext({ prepWar }: { prepWar: PrepWarContext }) {
  const [open, setOpen] = useState(true);
  const sorted = [...prepWar.opponentMembers].sort(
    (a, b) => a.mapPosition - b.mapPosition,
  );

  // TH distribution — quick "how many TH15s do they have?" glance.
  const thCounts = new Map<number, number>();
  for (const m of prepWar.opponentMembers) {
    thCounts.set(m.townhallLevel, (thCounts.get(m.townhallLevel) ?? 0) + 1);
  }
  const thTiers = [...thCounts.entries()].sort((a, b) => b[0] - a[0]);

  return (
    <section className="glass mt-5 rounded-2xl">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 p-4 text-left"
        aria-expanded={open}
      >
        <span className="flex items-center gap-3">
          <span className="rounded-full bg-umbra-purple/15 p-2 text-umbra-purple">
            <IconSwords className="h-4 w-4" />
          </span>
          <span>
            <span className="block font-mono text-label uppercase tracking-[.16em] text-umbra-purple">
              Preparation day
            </span>
            <span className="mt-0.5 block text-sm text-umbra-lilac">
              vs {prepWar.opponentName}
              {prepWar.opponentClanLevel !== null && (
                <span className="text-umbra-muted"> · Lv {prepWar.opponentClanLevel}</span>
              )}
            </span>
          </span>
        </span>
        <span className="flex items-center gap-3">
          <span className="hidden font-mono text-label uppercase tracking-wider text-umbra-muted sm:block">
            {prepWar.opponentMembers.length} on map
          </span>
          {open ? (
            <IconChevronUp className="h-4 w-4 text-umbra-muted" />
          ) : (
            <IconChevronDown className="h-4 w-4 text-umbra-muted" />
          )}
        </span>
      </button>

      {open && (
        <div className="border-t border-umbra-line p-4">
          {/* TH distribution summary */}
          {thTiers.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="font-mono text-label uppercase tracking-wider text-umbra-muted">
                TH mix:
              </span>
              {thTiers.map(([th, count]) => (
                <span
                  key={th}
                  className="rounded-full border border-umbra-line bg-umbra-surface/40 px-2 py-0.5 text-xs text-umbra-lilac"
                >
                  {count}× TH{th}
                </span>
              ))}
            </div>
          )}

          {/* Opponent roster by map position */}
          <ol className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {sorted.map((m) => (
              <OpponentRow key={m.tag} member={m} />
            ))}
          </ol>

          <p className="mt-4 text-xs italic text-umbra-muted">
            Opponent roster is read-only scouting context. The planner never
            auto-assigns targets — leadership decides the matchup.
          </p>
        </div>
      )}
    </section>
  );
}

function OpponentRow({ member }: { member: PrepOpponentMember }) {
  const tier =
    member.townhallLevel >= 14
      ? "high"
      : member.townhallLevel >= 11
        ? "mid"
        : member.townhallLevel >= 8
          ? "low"
          : "base";
  return (
    <li className="flex items-center gap-2 rounded-lg border border-umbra-line/40 bg-umbra-surface/20 px-2.5 py-1.5">
      <span className="w-5 text-center font-mono text-xs text-umbra-muted">
        {member.mapPosition}
      </span>
      <span className={`th-badge th-${tier}`}>TH{member.townhallLevel}</span>
      <span className="truncate text-sm text-umbra-lilac">{member.name}</span>
    </li>
  );
}
