import Image from "next/image";
import type { DashboardClan } from "@/lib/view-models/dashboard";
import { UnavailableValue } from "@/components/ui/state-primitives";

/**
 * Clan identity card — the first, most prominent card on the dashboard.
 * Uses the Clan-Card-Background.png as a cover image with a dark overlay
 * for readability. Layout echoes the in-game Clash of Clans clan profile:
 *   - Left side: Badge, Name, Tag, Description, and Labels
 *   - Right side: List of stats (Key-Value pairs)
 * See concept/05-dashboard.md §1.
 */
export function ClanIdentityCard({ clan }: { clan: DashboardClan }) {
  return (
    <section
      className="relative h-full overflow-hidden rounded-2xl border border-umbra-line shadow-2xl"
      aria-labelledby="clan-identity-title"
    >
      {/* Background image */}
      <Image
        src="/assets/Clan-Card-Background.png"
        alt=""
        fill
        className="object-cover"
        priority
        unoptimized
      />

      {/* Dark gradient overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-r from-umbra-ink/95 via-umbra-ink/80 to-umbra-ink/90" />

      {/* Content */}
      <div className="relative flex h-full flex-col gap-8 p-5 sm:p-8 md:flex-row md:items-center md:justify-between">
        
        {/* ===== LEFT COLUMN: Identity ===== */}
        <div className="flex flex-1 flex-col items-center text-center">
          <div className="flex flex-col items-center gap-4">
            {/* Badge */}
            <div className="shrink-0">
              {clan.badgeUrls?.large || clan.badgeUrls?.medium ? (
                <Image
                  src={clan.badgeUrls.large ?? clan.badgeUrls.medium!}
                  alt={`${clan.name} badge`}
                  width={104}
                  height={104}
                  className="h-26 w-26 object-contain drop-shadow-lg"
                  unoptimized
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-xl border border-umbra-line bg-umbra-elevated/50">
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
                className="font-display text-3xl font-semibold text-umbra-lilac drop-shadow-md"
              >
                {clan.name}
              </h2>
              <p className="mt-1 font-mono text-[13px] text-umbra-muted">{clan.tag}</p>
            </div>
          </div>

          {/* Description */}
          {clan.description && (
            <div className="mt-5 w-full max-w-[420px] rounded-xl border border-umbra-line/50 bg-umbra-ink/50 p-4 backdrop-blur-sm">
              <p className="whitespace-pre-line break-words text-center text-sm leading-relaxed text-umbra-muted">
                {clan.description}
              </p>
            </div>
          )}
        </div>

        {/* ===== RIGHT COLUMN: Stats List ===== */}
        <div className="flex w-full shrink-0 flex-col rounded-xl border border-white/5 bg-umbra-ink/40 p-5 backdrop-blur-md md:max-w-[340px] lg:max-w-[400px]">
          <StatRow label="Members" value={clan.memberCount ? `${clan.memberCount}/50` : <UnavailableValue />} />
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

          {/* Labels */}
          {clan.labels && clan.labels.length > 0 && (
            <div className="mt-2 flex flex-wrap justify-center gap-1.5 pt-2">
              {clan.labels.map((label) => (
                <span
                  key={label.name}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-umbra-ink/50 px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-umbra-muted backdrop-blur-sm shadow-md"
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
                  <span className="drop-shadow-md text-white">{label.name}</span>
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
    <div className="flex items-center justify-between border-b border-white/5 py-2.5 last:border-0 last:pb-0">
      <span className="font-mono text-[10px] uppercase tracking-wider text-umbra-muted">
        {label}
      </span>
      <span className="text-right text-[13px] font-semibold text-white">
        {value ?? <UnavailableValue />}
      </span>
    </div>
  );
}
