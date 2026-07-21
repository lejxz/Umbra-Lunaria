"use client";

import Image from "next/image";
import type { MemberDetailView } from "@/lib/view-models/members";
import { Modal } from "@/components/ui/modal";
import { Badge, UnavailableValue } from "@/components/ui";
import { getUnitIcon } from "@/lib/assets/unit-icon-map";
import { DonationChart } from "@/components/dashboard/donation-chart";
import { useState } from "react";

/**
 * Convert a Date or ISO string to a Date object.
 * When data comes from the API (JSON), dates are serialized as strings.
 */
function toDate(d: Date | string | null): Date | null {
  if (!d) return null;
  return d instanceof Date ? d : new Date(d);
}

function formatDate(d: Date | string | null, opts?: Intl.DateTimeFormatOptions): string {
  const date = toDate(d);
  if (!date) return "—";
  return date.toLocaleDateString("en-US", opts ?? { month: "short", day: "numeric", timeZone: "Asia/Manila" });
}

/**
 * Full member detail sheet with 7 sections per concept/06-members.md.
 * Uses a wider modal (max-w-3xl). The Modal handles scrolling — this
 * component does NOT add its own overflow.
 */
export function MemberDetailSheet({
  detail,
  onClose,
}: {
  detail: MemberDetailView;
  onClose: () => void;
}) {
  return (
    <Modal
      open
      onClose={onClose}
      aria-labelledby="member-detail-title"
      maxWidth="max-w-3xl"
    >
      <MemberDetailContent detail={detail} />
    </Modal>
  );
}

/**
 * The content of the member detail sheet (without the Modal wrapper).
 * Exported so the dashboard can reuse the exact same layout in its own
 * Modal — ensures UI consistency between dashboard and members popups.
 */
export function MemberDetailContent({ detail }: { detail: MemberDetailView }) {
  return (
    <div className="space-y-6">
      <ProfileSection detail={detail} />

      {detail.profile.isDeparted && (
        <div className="rounded-lg bg-amber-400/10 px-4 py-2 text-sm text-amber-400">
          ⚠ This member departed on{" "}
          {detail.profile.leftAt
            ? formatDate(detail.profile.leftAt, {
                month: "short",
                day: "numeric",
                year: "numeric",
                timeZone: "Asia/Manila",
              })
            : "an unknown date"}
          . Data is retained temporarily.
        </div>
      )}

      <ActivitySection detail={detail} />
      <DonationsSection detail={detail} />
      <WarSection detail={detail} />
      <CareerSection detail={detail} />
      <ProgressionSection detail={detail} />
      <AchievementsSection detail={detail} />
      <RushedSection detail={detail} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section 1: Profile
// ---------------------------------------------------------------------------

function ProfileSection({ detail }: { detail: MemberDetailView }) {
  const p = detail.profile;
  return (
    <div>
      <SectionLabel source="API fact">Profile</SectionLabel>

      {/* Header: icon + name/tag + TH */}
      <div className="flex items-center gap-4">
        {p.leagueTier?.iconUrls?.small && (
          <Image
            src={p.leagueTier.iconUrls.small}
            alt={p.leagueTier.name}
            width={48}
            height={48}
            className="h-12 w-12 shrink-0"
            unoptimized
          />
        )}
        <div className="min-w-0 flex-1">
          <h2
            id="member-detail-title"
            className="font-display text-2xl text-umbra-lilac"
          >
            {p.name}
          </h2>
          <p className="font-mono text-xs text-umbra-muted">{p.playerTag}</p>
        </div>
        {p.townHallLevel && (
          <div className="shrink-0 rounded-xl bg-umbra-purple/15 px-4 py-2 text-center">
            <p className="font-mono text-[9px] uppercase tracking-wider text-umbra-muted">
              TH
            </p>
            <p className="font-display text-xl font-bold text-umbra-purple">
              {p.townHallLevel}
            </p>
          </div>
        )}
      </div>

      {/* Stats — uniform height cells */}
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <FactCell label="Role" value={<span className="capitalize">{p.role}</span>} />
        <FactCell label="Exp level" value={p.expLevel ?? <UnavailableValue />} />
        <FactCell label="Trophies" value={p.trophies ?? <UnavailableValue />} />
        <FactCell label="Best trophies" value={p.bestTrophies ?? <UnavailableValue />} />
        <FactCell label="League tier" value={p.leagueTier?.name ?? <UnavailableValue />} />
        <FactCell
          label="War pref"
          value={
            p.warPreference ? (
              <Badge tone={p.warPreference === "in" ? "success" : "muted"}>
                {p.warPreference}
              </Badge>
            ) : (
              <UnavailableValue />
            )
          }
        />
        <FactCell label="Clan rank" value={p.clanRank ?? <UnavailableValue />} />
        <FactCell
          label="Joined"
          value={
            p.joinedAt
              ? formatDate(p.joinedAt, {
                  month: "short",
                  day: "numeric",
                  timeZone: "Asia/Manila",
                })
              : "—"
          }
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section 2: Activity
// ---------------------------------------------------------------------------

function ActivitySection({ detail }: { detail: MemberDetailView }) {
  const a = detail.activity;
  return (
    <div>
      <SectionLabel source="tracked">Activity</SectionLabel>
      <div className="grid grid-cols-2 gap-2">
        <FactCell
          label="Last active"
          value={
            a.lastActiveAt
              ? formatDate(a.lastActiveAt, {
                  month: "short",
                  day: "numeric",
                  timeZone: "Asia/Manila",
                })
              : "—"
          }
        />
        <FactCell
          label="Tracking started"
          value={
            a.trackingStart
              ? formatDate(a.trackingStart, {
                  month: "short",
                  day: "numeric",
                  timeZone: "Asia/Manila",
                })
              : "—"
          }
        />
      </div>
      {a.hasPartialData && (
        <p className="mt-2 text-xs text-amber-400">⚠ Partial data</p>
      )}
      {a.buckets.length > 0 && (
        <div className="mt-3">
          <p className="mb-1.5 font-mono text-[9px] uppercase tracking-wider text-umbra-muted">
            30-day activity
          </p>
          <div className="flex flex-wrap gap-0.5">
            {a.buckets.map((b, i) => (
              <div
                key={i}
                title={`${b.label}: ${b.active ? "active" : "inactive"}`}
                className={`h-3.5 w-3.5 rounded-sm ${b.active ? "bg-umbra-purple" : "bg-white/10"}`}
              />
            ))}
          </div>
        </div>
      )}
      {a.loginDays.length > 0 && (
        <p className="mt-2 text-xs text-umbra-muted">
          {a.loginDays.length} estimated login day
          {a.loginDays.length !== 1 ? "s" : ""} in the last 30 days.
        </p>
      )}
      <p className="mt-1 text-[11px] text-umbra-muted">
        Estimated from observed changes — not online presence.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section 3: Donations
// ---------------------------------------------------------------------------

function DonationsSection({ detail }: { detail: MemberDetailView }) {
  const d = detail.donations;
  return (
    <div>
      <SectionLabel source="tracked / derived">Donations</SectionLabel>
      <div className="grid grid-cols-3 gap-2">
        <DonationCell label="24h" given={d.given24h} received={d.received24h} />
        <DonationCell label="7d" given={d.given7d} received={d.received7d} />
        <DonationCell label="30d" given={d.given30d} received={d.received30d} />
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <FactCell
          label="Ratio (30d)"
          value={d.ratio !== null ? d.ratio.toFixed(2) : <UnavailableValue />}
        />
        <FactCell
          label="Activity score"
          value={d.activityScore !== null ? d.activityScore.toFixed(1) : <UnavailableValue />}
        />
      </div>

      {/* 30-day donation chart — reuses the dashboard DonationChart */}
      {d.buckets.length > 0 && (
        <div className="mt-3">
          <p className="mb-1 font-mono text-[9px] uppercase tracking-wider text-umbra-muted">
            30-day trend
          </p>
          <div className="h-[140px]">
            <DonationChart buckets={d.buckets} />
          </div>
        </div>
      )}

      {d.activityScoreComponents.length > 0 && (
        <div className="mt-2 grid grid-cols-2 gap-1 sm:grid-cols-4">
          {d.activityScoreComponents.map((c) => (
            <div
              key={c.name}
              className="rounded bg-white/[.035] px-2 py-1 text-center"
            >
              <p className="font-mono text-[8px] uppercase tracking-wider text-umbra-muted">
                {c.name}
              </p>
              <p className="font-mono text-xs text-umbra-lilac">
                {c.available ? c.points.toFixed(1) : "—"}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section 4: War participation
// ---------------------------------------------------------------------------

function WarSection({ detail }: { detail: MemberDetailView }) {
  const w = detail.warParticipation;
  return (
    <div>
      <SectionLabel source="tracked">War participation</SectionLabel>
      {w.warsTracked === 0 ? (
        <p className="text-xs text-umbra-muted">No wars tracked yet.</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            <FactCell label="Wars tracked" value={w.warsTracked} />
            <FactCell label="Wars missed" value={w.warsMissed} />
            <FactCell
              label="Participation"
              value={
                w.participationRate !== null
                  ? `${(w.participationRate * 100).toFixed(0)}%`
                  : <UnavailableValue />
              }
            />
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <FactCell label="Stars earned" value={w.starsEarned} />
            <FactCell
              label="Avg stars"
              value={w.averageStars !== null ? w.averageStars.toFixed(1) : <UnavailableValue />}
            />
            <FactCell
              label="3-star rate"
              value={
                w.threeStarRate !== null
                  ? `${(w.threeStarRate * 100).toFixed(0)}%`
                  : <UnavailableValue />
              }
            />
          </div>
          {w.recentWars.length > 0 && (
            <div className="mt-3">
              <p className="mb-1.5 font-mono text-[9px] uppercase tracking-wider text-umbra-muted">
                Recent wars
              </p>
              <div className="space-y-1">
                {w.recentWars.map((war) => (
                  <div
                    key={war.warId}
                    className="flex items-center justify-between rounded-lg bg-white/[.035] px-3 py-1.5 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-umbra-lilac">
                        vs {war.opponentName ?? "Unknown"}
                      </p>
                      <p className="font-mono text-[10px] text-umbra-muted">
                        {war.attacksUsed}/{war.attacksAllowed} attacks ·{" "}
                        {war.starsEarned} stars
                        {war.missed && " · missed"}
                      </p>
                    </div>
                    {war.result && (
                      <Badge
                        tone={
                          war.result === "win"
                            ? "success"
                            : war.result === "loss"
                              ? "danger"
                              : "muted"
                        }
                      >
                        {war.result}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {w.currentWarStatus && (
            <div className="mt-2 rounded-lg bg-umbra-purple/10 px-3 py-2 text-center text-xs text-umbra-lilac">
              Current war: {w.currentWarStatus}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section 5: Career
// ---------------------------------------------------------------------------

function CareerSection({ detail }: { detail: MemberDetailView }) {
  const c = detail.career;
  return (
    <div>
      <SectionLabel source="API fact">Career</SectionLabel>
      <div className="grid grid-cols-3 gap-2">
        <FactCell label="War stars" value={c.warStars ?? <UnavailableValue />} />
        <FactCell label="Attack wins" value={c.attackWins ?? <UnavailableValue />} />
        <FactCell label="Defense wins" value={c.defenseWins ?? <UnavailableValue />} />
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <FactCell
          label="Capital contrib"
          value={c.clanCapitalContributions ?? <UnavailableValue />}
        />
        <FactCell
          label="Best BB trophies"
          value={c.bestBuilderBaseTrophies ?? <UnavailableValue />}
        />
      </div>
      <p className="mt-2 text-[11px] text-umbra-muted">
        Lifetime Supercell totals — not tracked since Umbra Lunaria began.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section 5b: Achievements (after progression)
// ---------------------------------------------------------------------------

function AchievementsSection({ detail }: { detail: MemberDetailView }) {
  const c = detail.career;
  const [showAll, setShowAll] = useState(false);

  if (c.achievements.length === 0) return null;

  return (
    <div>
      <SectionLabel source="API fact">Achievements</SectionLabel>
      <button
        onClick={() => setShowAll(!showAll)}
        className="font-mono text-[10px] uppercase tracking-wider text-umbra-purple transition hover:text-umbra-lilac"
      >
        {showAll ? "Hide" : "Show"} {c.achievements.length} achievements
      </button>
      {showAll && (
        <div className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
          {c.achievements.map((a) => (
            <div
              key={a.name}
              className="flex items-center justify-between rounded-lg bg-white/[.035] px-3 py-1.5 text-xs"
            >
              <span className="truncate text-umbra-lilac">{a.name}</span>
              <span className="shrink-0 font-mono text-umbra-muted">
                {a.value.toLocaleString()}
                {a.target && ` / ${a.target.toLocaleString()}`}
                {a.stars && ` ★${a.stars}`}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section 6: Progression — in-game CoC style, compact
// ---------------------------------------------------------------------------

function ProgressionSection({ detail }: { detail: MemberDetailView }) {
  const p = detail.progression;
  const categories: Array<{
    label: string;
    items: Array<{ name: string; level: number; maxLevel: number | null }>;
  }> = [
    { label: "Troops", items: p.troops },
    { label: "Heroes", items: p.heroes },
    { label: "Equipment", items: p.heroEquipment },
    { label: "Spells", items: p.spells },
    { label: "Pets", items: p.pets },
    { label: "BB Troops", items: p.builderBaseTroops },
    { label: "BB Heroes", items: p.builderBaseHeroes },
  ];

  const hasAny = categories.some((c) => c.items.length > 0);

  if (!hasAny) {
    return (
      <div>
        <SectionLabel source="API fact">Progression</SectionLabel>
        <p className="text-xs text-umbra-muted">
          Progression data pending first daily batch.
        </p>
      </div>
    );
  }

  return (
    <div>
      <SectionLabel source="API fact">Progression</SectionLabel>
      <div className="space-y-3">
        {categories
          .filter((c) => c.items.length > 0)
          .map((cat) => (
            <div key={cat.label}>
              <p className="mb-1.5 font-mono text-[9px] uppercase tracking-wider text-umbra-muted">
                {cat.label} ({cat.items.length})
              </p>
              <div className="grid grid-cols-8 gap-1 sm:grid-cols-10 md:grid-cols-12">
                {cat.items.map((item) => (
                  <ProgressionCard
                    key={item.name}
                    name={item.name}
                    level={item.level}
                    maxLevel={item.maxLevel}
                  />
                ))}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

/**
 * Compact in-game CoC style progression card.
 * Small square tile with icon + level box at bottom-left.
 */
function ProgressionCard({
  name,
  level,
  maxLevel,
}: {
  name: string;
  level: number;
  maxLevel: number | null;
}) {
  const icon = getUnitIcon(name);
  const isMaxed = maxLevel !== null && level >= maxLevel;

  return (
    <div
      className="group relative"
      title={`${name}: ${level}${maxLevel ? `/${maxLevel}` : ""}${isMaxed ? " (MAX)" : ""}`}
    >
      {/* Tile */}
      <div
        className={`relative aspect-square w-full overflow-hidden rounded-md border ${
          isMaxed
            ? "border-amber-400/50 bg-amber-400/5"
            : "border-umbra-line bg-umbra-ink/60"
        }`}
      >
        <Image
          src={icon}
          alt={name}
          fill
          className="object-contain p-1"
          unoptimized
        />
        {/* Level box — bottom-left, in-game style, bigger for readability */}
        <div
          className={`absolute bottom-0 left-0 rounded-tr-md px-1.5 py-0.5 font-mono text-[11px] font-bold leading-none ${
            isMaxed
              ? "bg-amber-400 text-umbra-ink"
              : "bg-umbra-ink/95 text-umbra-lilac"
          }`}
        >
          {isMaxed ? "MAX" : level}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section 7: Rushed
// ---------------------------------------------------------------------------

function RushedSection({ detail }: { detail: MemberDetailView }) {
  const r = detail.rushed;
  return (
    <div>
      <SectionLabel source="derived">Rushed analysis</SectionLabel>
      {r.overallPercent === null ? (
        <p className="text-xs text-umbra-muted">
          Not available yet — requires Town Hall cap reference data (Phase 3.0).
        </p>
      ) : (
        <>
          <div className="rounded-xl bg-white/[.035] p-3 text-center">
            <p className="font-mono text-[9px] uppercase tracking-wider text-umbra-muted">
              Overall rushed
            </p>
            <p className="mt-1 font-display text-3xl font-bold text-amber-400">
              {r.overallPercent.toFixed(1)}%
            </p>
          </div>
          {r.categoryBreakdown.length > 0 && (
            <div className="mt-2 grid grid-cols-3 gap-2">
              {r.categoryBreakdown.map((c) => (
                <FactCell
                  key={c.category}
                  label={c.category}
                  value={
                    c.percent !== null ? `${c.percent.toFixed(0)}%` : <UnavailableValue />
                  }
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function SectionLabel({
  source,
  children,
}: {
  source: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-2 flex items-center gap-2 border-b border-umbra-line/50 pb-1">
      <h3 className="font-display text-sm font-semibold text-umbra-lilac">
        {children}
      </h3>
      <span className="font-mono text-[9px] uppercase tracking-wider text-umbra-purple">
        {source}
      </span>
    </div>
  );
}

function FactCell({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex h-full flex-col justify-center rounded-lg bg-white/[.035] p-2">
      <p className="font-mono text-[9px] uppercase tracking-wider text-umbra-muted">
        {label}
      </p>
      <p className="mt-0.5 text-xs font-semibold text-white">{value}</p>
    </div>
  );
}

function DonationCell({
  label,
  given,
  received,
}: {
  label: string;
  given: number;
  received: number;
}) {
  return (
    <div className="rounded-lg bg-white/[.035] p-2 text-center">
      <p className="font-mono text-[9px] uppercase tracking-wider text-umbra-muted">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-bold text-emerald-400">{given}</p>
      <p className="font-mono text-[10px] text-umbra-muted">/ {received}</p>
    </div>
  );
}
