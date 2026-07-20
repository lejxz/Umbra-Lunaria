import Image from "next/image";
import type { DashboardClan } from "@/lib/view-models/dashboard";
import { TimeAgo } from "@/components/ui/time-ago";
import { UnavailableValue } from "@/components/ui/state-primitives";
import Link from "next/link";

/**
 * Clan identity card — the first, most prominent card on the dashboard.
 * Shows badge, name/tag, description, location, type, labels, leagues,
 * requirements, and freshness. See concept/05-dashboard.md §1.
 */
export function ClanIdentityCard({ clan }: { clan: DashboardClan }) {
  return (
    <section
      className="glass rounded-2xl p-5 sm:p-6"
      aria-labelledby="clan-identity-title"
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-6">
        {/* Badge */}
        {clan.badgeUrls?.large || clan.badgeUrls?.medium ? (
          <Image
            src={clan.badgeUrls.large ?? clan.badgeUrls.medium!}
            alt={`${clan.name} badge`}
            width={72}
            height={72}
            className="h-[72px] w-[72px] shrink-0 rounded-full object-cover shadow-glow"
            unoptimized
          />
        ) : (
          <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full border border-umbra-line bg-umbra-elevated/50">
            <span className="font-display text-2xl text-umbra-purple">
              {clan.name.charAt(0)}
            </span>
          </div>
        )}

        {/* Identity copy */}
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] uppercase tracking-[.16em] text-umbra-purple">
            Clan identity
          </p>
          <h2
            id="clan-identity-title"
            className="mt-1 font-display text-2xl font-semibold text-umbra-lilac"
          >
            {clan.name}
          </h2>
          {clan.description && (
            <p className="mt-1 line-clamp-2 text-sm text-umbra-muted">
              {clan.description}
            </p>
          )}
          <p className="mt-1 text-sm text-umbra-muted">
            {[
              clan.location?.name,
              clan.type && `${clan.type} clan`,
              clan.isFamilyFriendly === false && "Not family-friendly",
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>

          {/* Labels with icons */}
          {clan.labels && clan.labels.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {clan.labels.map((label) => (
                <span
                  key={label.name}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-umbra-muted"
                >
                  {label.iconUrls?.small && (
                    <Image
                      src={label.iconUrls.small}
                      alt=""
                      width={16}
                      height={16}
                      className="h-4 w-4"
                      unoptimized
                    />
                  )}
                  {label.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Facts grid */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:text-right">
          <Fact label="Clan tag" value={clan.tag} />
          <Fact
            label="War league"
            value={clan.warLeague?.name ?? <UnavailableValue />}
          />
          <Fact
            label="Capital league"
            value={clan.capitalLeague?.name ?? <UnavailableValue />}
          />
          <Fact
            label="War frequency"
            value={clan.warFrequency ?? <UnavailableValue />}
          />
          <Fact
            label="Members"
            value={clan.memberCount?.toString() ?? <UnavailableValue />}
          />
          <Fact
            label="Req. trophies"
            value={clan.requiredTrophies?.toString() ?? <UnavailableValue />}
          />
        </div>
      </div>

      {/* Freshness */}
      <div className="mt-4 flex items-center justify-between border-t border-umbra-line pt-3">
        <span className="font-mono text-[10px] uppercase tracking-wider text-umbra-muted">
          {clan.lastPolledAt ? (
            <>
              ● Captured <TimeAgo date={clan.lastPolledAt} />
            </>
          ) : (
            "● No capture yet"
          )}
        </span>
        <Link
          href="/members"
          className="font-mono text-[10px] uppercase tracking-wider text-umbra-purple transition hover:text-umbra-lilac"
        >
          View members →
        </Link>
      </div>
    </section>
  );
}

function Fact({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <span className="block font-mono text-[9px] uppercase tracking-wider text-umbra-muted">
        {label}
      </span>
      <span className="mt-1 block text-sm font-semibold text-white">
        {value}
      </span>
    </div>
  );
}
