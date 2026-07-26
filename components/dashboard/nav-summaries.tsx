import Link from "next/link";
import type { WarSummaryView, CapitalNavSummary } from "@/lib/view-models/dashboard";
import { Badge, UnavailableValue } from "@/components/ui";
import { IconChevronRight } from "@/components/ui/icons";

/**
 * Navigation summaries — two strips at the bottom of the dashboard:
 * 1. Current war — state, countdown, stars, attacks, link to /war
 * 2. Capital raid weekend — status, link to /capital
 * See docs/concept/05-dashboard.md §9.
 */
export function NavSummaries({
  warSummary,
  capitalNav,
}: {
  warSummary: WarSummaryView;
  capitalNav: CapitalNavSummary;
}) {
  return (
    <section className="lunar-card p-5">
      {/* Current war strip */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-label uppercase tracking-[.16em] text-umbra-purple">
            Navigation summary
          </p>
          <h3 className="mt-1 font-display text-lg text-umbra-moonlight">
            Current war
          </h3>
          {warSummary.state === null ? (
            <p className="mt-1 text-sm text-umbra-muted">
              No war data yet — the tracker will capture wars when they start.
            </p>
          ) : warSummary.state === "notInWar" ? (
            <p className="mt-1 text-sm text-umbra-muted">
              Not in war. The clan is currently at peace.
            </p>
          ) : (
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
              <Badge
                tone={
                  warSummary.state === "inWar"
                    ? "warning"
                    : warSummary.state === "preparation"
                      ? "brand"
                      : "muted"
                }
              >
                {warSummary.state === "inWar"
                  ? "Battle day"
                  : warSummary.state === "preparation"
                    ? "Preparation"
                    : "War ended"}
              </Badge>
              {warSummary.opponentName && (
                <span className="text-umbra-muted">vs {warSummary.opponentName}</span>
              )}
              {warSummary.ownStars !== null && warSummary.opponentStars !== null && (
                <span className="font-mono text-umbra-moonlight">
                  ⭐ {warSummary.ownStars} - {warSummary.opponentStars}
                </span>
              )}
              {warSummary.endTime && (
                <span className="font-mono text-xs text-umbra-faint">
                  ends {new Date(warSummary.endTime).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Manila" })}
                </span>
              )}
            </div>
          )}
        </div>
        <Link
          href="/war"
          className="btn-ghost focus-ring shrink-0"
        >
          Open War Center
          <IconChevronRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>

      {/* Lunar divider ornament */}
      <div className="lunar-divider my-4" />

      {/* Capital raid weekend strip */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h3 className="font-display text-lg text-umbra-moonlight">
            Capital raid weekend
          </h3>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-umbra-muted">
            {capitalNav.capitalHallLevel !== null && (
              <span>Hall {capitalNav.capitalHallLevel}</span>
            )}
            {capitalNav.capitalLeague?.name && (
              <Badge tone="muted">{capitalNav.capitalLeague.name}</Badge>
            )}
            <span>
              {capitalNav.districtCount ?? <UnavailableValue />} districts tracked
            </span>
          </div>
        </div>
        <Link
          href="/capital"
          className="btn-ghost focus-ring shrink-0"
        >
          Open Capital
          <IconChevronRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
