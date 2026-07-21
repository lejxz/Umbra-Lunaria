import Image from "next/image";
import type { DashboardClan } from "@/lib/view-models/dashboard";
import { UnavailableValue } from "@/components/ui/state-primitives";

/**
 * Clan identity card — the first, most prominent card on the dashboard.
 *
 * Layout (echoes the in-game Clash of Clans clan profile):
 *   ┌───────────────────────────────────────────────────────┐
 *   │  [Badge]                                               │
 *   │           Umbra Lunaria                                │
 *   │           #2JPCYP98L                                   │
 *   │                                                        │
 *   │  ┌─────────────────────────────────────────────────┐  │
 *   │  │  🌕 ⊱⊶⊰ Umbra Lunaria / Moon's Shadow ...      │  │
 *   │  └─────────────────────────────────────────────────┘  │
 *   │                                                        │
 *   │  [Clan Wars] [CWL] [Competitive]                      │
 *   ├───────────────────────────────────────────────────────┤
 *   │  Clan level  Members  War league  Capital league       │
 *   │     11         5     Crystal II    Bronze III          │
 *   │  Location       Type        Language     Req. trophies │
 *   │  International  Invite only  English         0         │
 *   └───────────────────────────────────────────────────────┘
 *
 * See concept/05-dashboard.md §1.
 */
export function ClanIdentityCard({ clan }: { clan: DashboardClan }) {
  return (
    <section
      className="glass rounded-2xl p-5 sm:p-6"
      aria-labelledby="clan-identity-title"
    >
      {/* ===== Header: badge + name + tag (centered) ===== */}
      <div className="flex flex-col items-center text-center">
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
        <h2
          id="clan-identity-title"
          className="mt-3 font-display text-2xl font-semibold text-umbra-lilac"
        >
          {clan.name}
        </h2>
        <p className="mt-1 font-mono text-xs text-umbra-muted">{clan.tag}</p>
      </div>

      {/* ===== Description (constrained width, CoC style) ===== */}
      {clan.description && (
        <div className="mt-4 flex justify-center">
          <div className="w-full max-w-[360px] rounded-xl border border-umbra-line bg-umbra-ink/40 p-3">
            <p className="whitespace-pre-line break-words text-center text-xs leading-relaxed text-umbra-muted">
              {clan.description}
            </p>
          </div>
        </div>
      )}

      {/* ===== Labels with icons ===== */}
      {clan.labels && clan.labels.length > 0 && (
        <div className="mt-4 flex flex-wrap justify-center gap-1.5">
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

      {/* ===== Divider ===== */}
      <div className="mt-5 border-t border-umbra-line" />

      {/* ===== Stats grid — 4 columns × 2 rows, label over value ===== */}
      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4">
        <StatCell label="Clan level" value={clan.clanLevel} />
        <StatCell label="Members" value={clan.memberCount} />
        <StatCell
          label="War league"
          value={clan.warLeague?.name ?? <UnavailableValue />}
        />
        <StatCell
          label="Capital league"
          value={clan.capitalLeague?.name ?? <UnavailableValue />}
        />
        <StatCell
          label="Location"
          value={clan.location?.name ?? <UnavailableValue />}
        />
        <StatCell
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
        <StatCell
          label="Language"
          value={clan.chatLanguage?.name ?? <UnavailableValue />}
        />
        <StatCell label="Req. trophies" value={clan.requiredTrophies} />
      </div>
    </section>
  );
}

/**
 * Stat cell — label on top, value below. No individual borders/containers;
 * the grid itself provides the structure. This gives a clean, scannable
 * layout similar to the in-game clan profile stats row.
 */
function StatCell({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="text-center">
      <p className="font-mono text-[9px] uppercase tracking-wider text-umbra-muted">
        {label}
      </p>
      <p className="mt-1 text-sm font-bold text-white">
        {value ?? <UnavailableValue />}
      </p>
    </div>
  );
}
