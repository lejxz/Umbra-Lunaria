import Image from "next/image";
import type { DashboardClan } from "@/lib/view-models/dashboard";
import { UnavailableValue } from "@/components/ui/state-primitives";

/**
 * Clan identity card — the first, most prominent card on the dashboard.
 * Two-column layout echoing the in-game Clash of Clans clan view:
 *   Left half:  badge, name, tag, meta chips, description (in a container)
 *   Right half: stat mini-cards grid
 * See concept/05-dashboard.md §1.
 */
export function ClanIdentityCard({ clan }: { clan: DashboardClan }) {
  return (
    <section
      className="glass rounded-2xl p-5 sm:p-6"
      aria-labelledby="clan-identity-title"
    >
      <div className="grid gap-5 lg:grid-cols-2">
        {/* ===== Left half: identity + meta + description ===== */}
        <div className="flex flex-col gap-4">
          {/* Badge + name + tag */}
          <div className="flex items-start gap-4">
            <div className="shrink-0">
              {clan.badgeUrls?.large || clan.badgeUrls?.medium ? (
                <Image
                  src={clan.badgeUrls.large ?? clan.badgeUrls.medium!}
                  alt={`${clan.name} badge`}
                  width={64}
                  height={64}
                  className="h-16 w-16 object-contain"
                  unoptimized
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-umbra-line bg-umbra-elevated/50">
                  <span className="font-display text-2xl text-umbra-purple">
                    {clan.name.charAt(0)}
                  </span>
                </div>
              )}
            </div>
            <div className="min-w-0">
              <h2
                id="clan-identity-title"
                className="font-display text-xl font-semibold text-umbra-lilac sm:text-2xl"
              >
                {clan.name}
              </h2>
              <p className="mt-0.5 font-mono text-xs text-umbra-muted">
                {clan.tag}
              </p>
            </div>
          </div>

          {/* Meta chips — below the clan tag */}
          <div className="flex flex-wrap gap-1.5">
            {clan.location?.name && <Chip>{clan.location.name}</Chip>}
            {clan.type && (
              <Chip>
                {clan.type === "open"
                  ? "Open"
                  : clan.type === "inviteOnly"
                    ? "Invite only"
                    : clan.type === "closed"
                      ? "Closed"
                      : clan.type}
              </Chip>
            )}
            {clan.isFamilyFriendly !== null && (
              <Chip tone={clan.isFamilyFriendly ? "success" : "muted"}>
                {clan.isFamilyFriendly
                  ? "Family-friendly"
                  : "Not family-friendly"}
              </Chip>
            )}
            {clan.chatLanguage?.name && <Chip>{clan.chatLanguage.name}</Chip>}
          </div>

          {/* Description — in a container matching the stat card background */}
          {clan.description && (
            <div className="rounded-xl border border-umbra-line bg-umbra-ink/40 p-3">
              <p className="whitespace-pre-line text-xs leading-relaxed text-umbra-muted">
                {clan.description}
              </p>
            </div>
          )}

          {/* Labels with icons */}
          {clan.labels && clan.labels.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {clan.labels.map((label) => (
                <span
                  key={label.name}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-umbra-muted"
                >
                  {label.iconUrls?.small && (
                    <Image
                      src={label.iconUrls.small}
                      alt=""
                      width={14}
                      height={14}
                      className="h-3.5 w-3.5"
                      unoptimized
                    />
                  )}
                  {label.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ===== Right half: stat mini-cards ===== */}
        <div className="grid grid-cols-2 gap-2.5 self-start">
          <StatCard label="Clan level" value={clan.clanLevel} />
          <StatCard label="Members" value={clan.memberCount} />
          <StatCard
            label="War league"
            value={clan.warLeague?.name ?? <UnavailableValue />}
          />
          <StatCard
            label="Capital league"
            value={clan.capitalLeague?.name ?? <UnavailableValue />}
          />
          <StatCard label="War wins" value={clan.warWins} tone="success" />
          <StatCard label="War losses" value={clan.warLosses} tone="danger" />
          <StatCard label="Win streak" value={clan.warWinStreak} tone="brand" />
          <StatCard label="Req. trophies" value={clan.requiredTrophies} />
        </div>
      </div>
    </section>
  );
}

/** Small stat card — individual container for each clan fact. */
function StatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  tone?: "default" | "success" | "danger" | "brand";
}) {
  const valueColor =
    tone === "success"
      ? "text-emerald-400"
      : tone === "danger"
        ? "text-red-400"
        : tone === "brand"
          ? "text-umbra-purple"
          : "text-white";

  return (
    <div className="rounded-xl border border-umbra-line bg-umbra-ink/40 p-3">
      <p className="font-mono text-[9px] uppercase tracking-wider text-umbra-muted">
        {label}
      </p>
      <p className={`mt-1 text-sm font-bold ${valueColor}`}>
        {value ?? <UnavailableValue />}
      </p>
    </div>
  );
}

/** Pill chip for meta info (location, type, etc.) */
function Chip({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "success" | "muted";
}) {
  const classes =
    tone === "success"
      ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-400"
      : tone === "muted"
        ? "border-white/10 bg-white/5 text-umbra-muted"
        : "border-umbra-purple/20 bg-umbra-purple/10 text-umbra-lilac";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${classes}`}
    >
      {children}
    </span>
  );
}
