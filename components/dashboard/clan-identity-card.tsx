import Image from "next/image";
import type { DashboardClan } from "@/lib/view-models/dashboard";
import { TimeAgo } from "@/components/ui/time-ago";
import { UnavailableValue } from "@/components/ui/state-primitives";
import Link from "next/link";

/**
 * Clan identity card — the first, most prominent card on the dashboard.
 * Shows badge, name/tag, description, location, type, labels, leagues,
 * requirements, and freshness. See concept/05-dashboard.md §1.
 *
 * The badge is rendered without a circular container or shadow — the API
 * badge image already has its own shape. The description follows the CoC
 * in-game clan view style with limited characters per line.
 */
export function ClanIdentityCard({ clan }: { clan: DashboardClan }) {
  return (
    <section
      className="glass rounded-2xl p-5 sm:p-6"
      aria-labelledby="clan-identity-title"
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:gap-6">
        {/* Badge — no circular container, no forced shadow. The API badge
            image already has its own shape and styling. */}
        <div className="flex shrink-0 justify-center lg:justify-start">
          {clan.badgeUrls?.large || clan.badgeUrls?.medium ? (
            <Image
              src={clan.badgeUrls.large ?? clan.badgeUrls.medium!}
              alt={`${clan.name} badge`}
              width={80}
              height={80}
              className="h-20 w-20 object-contain"
              unoptimized
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-xl border border-umbra-line bg-umbra-elevated/50">
              <span className="font-display text-3xl text-umbra-purple">
                {clan.name.charAt(0)}
              </span>
            </div>
          )}
        </div>

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

          {/* Description — CoC in-game style: limited chars per line, small text */}
          {clan.description && (
            <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-umbra-muted">
              {clan.description}
            </p>
          )}

          {/* Meta line — location, type, family-friendly as inline tags */}
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            {clan.location?.name && (
              <span className="inline-flex items-center gap-1 text-umbra-muted">
                <span className="text-umbra-purple">📍</span>
                {clan.location.name}
              </span>
            )}
            {clan.type && (
              <span className="text-umbra-muted">
                · {clan.type === "open" ? "Open" : clan.type === "inviteOnly" ? "Invite only" : clan.type === "closed" ? "Closed" : clan.type}
              </span>
            )}
            {clan.isFamilyFriendly !== null && (
              <span className="text-umbra-muted">
                · {clan.isFamilyFriendly ? "Family-friendly" : "Not family-friendly"}
              </span>
            )}
            {clan.chatLanguage?.name && (
              <span className="text-umbra-muted">
                · {clan.chatLanguage.name}
              </span>
            )}
          </div>

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

        {/* Facts — in a contained sub-card */}
        <div className="shrink-0 rounded-xl border border-umbra-line bg-umbra-ink/40 p-3">
          <p className="mb-2 font-mono text-[9px] uppercase tracking-wider text-umbra-muted">
            Details
          </p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
            <Fact label="Clan tag" value={clan.tag} mono />
            <Fact
              label="Level"
              value={clan.clanLevel?.toString() ?? <UnavailableValue />}
            />
            <Fact
              label="Members"
              value={clan.memberCount?.toString() ?? <UnavailableValue />}
            />
            <Fact
              label="War league"
              value={clan.warLeague?.name ?? <UnavailableValue />}
            />
            <Fact
              label="Capital league"
              value={clan.capitalLeague?.name ?? <UnavailableValue />}
            />
            <Fact
              label="War freq."
              value={clan.warFrequency ?? <UnavailableValue />}
            />
            <Fact
              label="Req. trophies"
              value={clan.requiredTrophies?.toString() ?? <UnavailableValue />}
            />
            <Fact
              label="Req. TH"
              value={clan.requiredTownhallLevel?.toString() ?? <UnavailableValue />}
            />
          </div>
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
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div>
      <span className="block font-mono text-[9px] uppercase tracking-wider text-umbra-muted">
        {label}
      </span>
      <span
        className={`mt-0.5 block text-xs font-semibold text-white ${mono ? "font-mono" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}
