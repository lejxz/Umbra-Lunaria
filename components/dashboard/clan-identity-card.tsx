import Image from "next/image";
import type { DashboardClan } from "@/lib/view-models/dashboard";
import { UnavailableValue } from "@/components/ui/state-primitives";

/**
 * Clan identity card — the hero of the dashboard. The Clan-Card-Background
 * image sits behind a deep-void gradient; the badge glows at the centre, the
 * clan description lives in a calm lunar-tile prose container, and the stat
 * panel on the right reads as a quiet observatory ledger.
 *
 * Layout echoes the in-game Clash of Clans clan profile:
 *   - Left side: Badge, Name, Tag, Description, and Labels
 *   - Right side: List of stats (Key-Value pairs)
 * See docs/concept/05-dashboard.md §1.
 */
export function ClanIdentityCard({ clan }: { clan: DashboardClan }) {
  return (
    <section
      className="lunar-card relative overflow-hidden p-0"
      aria-labelledby="clan-identity-title"
    >
      {/* Background image */}
      <Image
        src="/assets/Clan-Card-Background.jpg"
        alt=""
        fill
        className="object-cover"
        priority
        unoptimized
      />

      {/* Dark gradient overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-r from-umbra-void/95 via-umbra-ink/80 to-umbra-ink/90" />
      <div className="absolute inset-0 bg-gradient-to-t from-umbra-void/70 via-transparent to-umbra-void/40" />

      {/* Content */}
      <div className="relative flex flex-col gap-8 p-5 sm:p-8 md:flex-row md:items-stretch md:justify-between">

        {/* ===== LEFT COLUMN: Identity ===== */}
        <div className="flex flex-1 flex-col items-center text-center">
          <div className="flex flex-col items-center gap-4">
            {/* Badge — glows like a caught moonbeam */}
            <div className="shrink-0">
              {clan.badgeUrls?.large || clan.badgeUrls?.medium ? (
                <div className="relative">
                  <div className="absolute -inset-3 rounded-full bg-umbra-purple/20 blur-2xl" aria-hidden />
                  <Image
                    src={clan.badgeUrls.large ?? clan.badgeUrls.medium!}
                    alt={`${clan.name} badge`}
                    width={104}
                    height={104}
                    className="relative h-26 w-26 object-contain drop-shadow-[0_0_18px_rgba(182,120,255,0.45)]"
                    unoptimized
                  />
                </div>
              ) : (
                <div className="relative flex h-24 w-24 items-center justify-center rounded-full border border-umbra-line-bright bg-umbra-elevated/70 shadow-glow">
                  <span className="font-display text-4xl text-umbra-purple">
                    {clan.name.charAt(0)}
                  </span>
                </div>
              )}
            </div>

            {/* Title & Tag */}
            <div>
              <h2
                id="clan-identity-title"
                className="font-display text-3xl font-semibold text-umbra-moonlight drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)]"
              >
                {clan.name}
              </h2>
              <p className="mt-1 font-mono text-xs tracking-wider text-umbra-faint">{clan.tag}</p>
            </div>
          </div>

          {/* Description — the clan's own sigil text, rendered in monospace
              so any box-drawing art displays as the clan intended. */}
          {clan.description && (
            <div className="lunar-tile mt-5 w-full max-w-[460px] !bg-umbra-ink/60 backdrop-blur-md">
              <p className="whitespace-pre break-words text-left font-mono text-xs leading-relaxed text-umbra-lilac/90">
                {clan.description}
              </p>
            </div>
          )}
        </div>

        {/* ===== RIGHT COLUMN: Stats List ===== */}
        <div className="flex w-full shrink-0 flex-col rounded-r-md border border-umbra-line bg-umbra-ink/50 p-5 backdrop-blur-md md:max-w-[340px] lg:max-w-[400px]">
          <p className="mb-2 font-mono text-label uppercase tracking-[.18em] text-umbra-faint">
            Clan ledger
          </p>
          <div className="flex flex-col">
            <StatRow label="Members" value={clan.memberCount ? `${clan.memberCount}/50` : <UnavailableValue />} />
            <StatRow label="Clan Level" value={clan.clanLevel ?? <UnavailableValue />} />
            <StatRow label="Clan Points" value={clan.clanPoints != null ? clan.clanPoints.toLocaleString() : <UnavailableValue />} />
            <StatRow label="Clan War League" value={clan.warLeague?.name ?? <UnavailableValue />} />
            <StatRow label="Clan Location" value={clan.location?.name ?? <UnavailableValue />} />
            <StatRow label="Chat Language" value={clan.chatLanguage?.name ?? <UnavailableValue />} />
            <StatRow
              label="Type"
              value={
                clan.type ? (
                  clan.type === "open"
                    ? "Open"
                    : clan.type === "inviteOnly"
                      ? "Invite only"
                      : clan.type === "closed"
                        ? "Closed"
                        : clan.type
                ) : (
                  <UnavailableValue />
                )
              }
            />
            <StatRow label="Required League" value={clan.requiredTrophies} />
          </div>

          {/* Labels */}
          {clan.labels && clan.labels.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5 pt-2">
              {clan.labels.map((label) => (
                <span
                  key={label.name}
                  className="inline-flex items-center gap-1.5 rounded-full border border-umbra-line bg-umbra-elevated/60 px-2 py-1 text-micro font-semibold uppercase tracking-wider text-umbra-lilac backdrop-blur-sm"
                >
                  {label.iconUrls?.small && (
                    <Image
                      src={label.iconUrls.small}
                      alt=""
                      width={12}
                      height={12}
                      className="h-3 w-3"
                      unoptimized
                    />
                  )}
                  <span>{label.name}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/**
 * Stat row — label on left, value on right.
 * Echoes the CoC list layout but with premium web typography.
 */
function StatRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between border-b border-umbra-line-soft py-2.5 last:border-0 last:pb-0">
      <span className="font-mono text-label uppercase tracking-wider text-umbra-faint">
        {label}
      </span>
      <span className="text-right text-xs font-semibold text-umbra-moonlight">
        {value ?? <UnavailableValue />}
      </span>
    </div>
  );
}
