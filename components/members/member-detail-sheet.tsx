"use client";

import Image from "next/image";
import type { MemberDetailView } from "@/lib/view-models/members";
import { Modal } from "@/components/ui/modal";
import { Badge, UnavailableValue } from "@/components/ui";
import { getUnitIcon } from "@/lib/assets/unit-icon-map";
import { useState } from "react";

/**
 * Full member detail sheet with 7 sections per concept/06-members.md:
 * 1. Profile summary (API fact)
 * 2. Activity (tracked history)
 * 3. Donations (tracked/derived)
 * 4. War participation (tracked)
 * 5. Career statistics (API fact)
 * 6. Progression cards (API fact)
 * 7. Rushed analysis (derived)
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
    >
      <div className="max-h-[85vh] space-y-5 overflow-y-auto">
        {/* 1. Profile summary */}
        <ProfileSection detail={detail} />

        {/* Departed notice */}
        {detail.profile.isDeparted && (
          <div className="rounded-lg bg-amber-400/10 px-4 py-2 text-sm text-amber-400">
            ⚠ This member departed on{" "}
            {detail.profile.leftAt
              ? detail.profile.leftAt.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  timeZone: "Asia/Manila",
                })
              : "an unknown date"}
            . Data is retained temporarily.
          </div>
        )}

        {/* 2. Activity */}
        <ActivitySection detail={detail} />

        {/* 3. Donations */}
        <DonationsSection detail={detail} />

        {/* 4. War participation */}
        <WarSection detail={detail} />

        {/* 5. Career */}
        <CareerSection detail={detail} />

        {/* 6. Progression */}
        <ProgressionSection detail={detail} />

        {/* 7. Rushed */}
        <RushedSection detail={detail} />
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Section 1: Profile
// ---------------------------------------------------------------------------

function ProfileSection({ detail }: { detail: MemberDetailView }) {
  const p = detail.profile;
  return (
    <div>
      <SectionLabel source="API fact">Profile summary</SectionLabel>
      <div className="flex items-start gap-4">
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
          <h2 id="member-detail-title" className="font-display text-2xl text-umbra-lilac">
            {p.name}
          </h2>
          <p className="font-mono text-xs text-umbra-muted">{p.playerTag}</p>
        </div>
        {p.townHallLevel && (
          <div className="shrink-0 rounded-xl bg-umbra-purple/15 px-3 py-1.5 text-center">
            <p className="font-mono text-[9px] uppercase tracking-wider text-umbra-muted">TH</p>
            <p className="font-display text-xl font-bold text-umbra-purple">{p.townHallLevel}</p>
          </div>
        )}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <FactCell label="Role" value={<span className="capitalize">{p.role}</span>} />
        <FactCell label="Exp level" value={p.expLevel ?? <UnavailableValue />} />
        <FactCell label="Trophies" value={p.trophies ?? <UnavailableValue />} />
        <FactCell label="Best trophies" value={p.bestTrophies ?? <UnavailableValue />} />
        <FactCell label="League tier" value={p.leagueTier?.name ?? <UnavailableValue />} />
        <FactCell label="War pref" value={
          p.warPreference ? (
            <Badge tone={p.warPreference === "in" ? "success" : "muted"}>{p.warPreference}</Badge>
          ) : <UnavailableValue />
        } />
        <FactCell label="Clan rank" value={p.clanRank ?? <UnavailableValue />} />
        <FactCell label="Joined" value={
          p.joinedAt ? p.joinedAt.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "Asia/Manila" }) : "—"
        } />
      </div>
      {(p.builderHallLevel || p.builderBaseTrophies) && (
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <FactCell label="Builder Hall" value={p.builderHallLevel ?? <UnavailableValue />} />
          <FactCell label="BB trophies" value={p.builderBaseTrophies ?? <UnavailableValue />} />
          <FactCell label="Best BB trophies" value={p.bestBuilderBaseTrophies ?? <UnavailableValue />} />
        </div>
      )}
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
      <SectionLabel source="tracked history">Activity</SectionLabel>
      <div className="grid grid-cols-2 gap-2">
        <FactCell label="Last active" value={
          a.lastActiveAt ? a.lastActiveAt.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "Asia/Manila" }) : "—"
        } />
        <FactCell label="Tracking started" value={
          a.trackingStart ? a.trackingStart.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "Asia/Manila" }) : "—"
        } />
      </div>
      {a.hasPartialData && (
        <p className="mt-2 text-xs text-amber-400">⚠ Partial data — tracking started partway through this window.</p>
      )}
      {a.buckets.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {a.buckets.map((b, i) => (
            <div
              key={i}
              title={`${b.label}: ${b.active ? "active" : "inactive"}`}
              className={`h-4 w-4 rounded-sm ${b.active ? "bg-umbra-purple" : "bg-white/10"}`}
            />
          ))}
        </div>
      )}
      {a.loginDays.length > 0 && (
        <p className="mt-2 text-xs text-umbra-muted">
          {a.loginDays.length} estimated login day{a.loginDays.length !== 1 ? "s" : ""} in the last 30 days.
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
      <SectionLabel source="tracked / derived">Donations & contribution</SectionLabel>
      <div className="grid grid-cols-3 gap-2">
        <DonationCell label="24h" given={d.given24h} received={d.received24h} />
        <DonationCell label="7d" given={d.given7d} received={d.received7d} />
        <DonationCell label="30d" given={d.given30d} received={d.received30d} />
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <FactCell label="Ratio (30d)" value={d.ratio !== null ? d.ratio.toFixed(2) : <UnavailableValue />} />
        <FactCell label="Activity score" value={d.activityScore !== null ? d.activityScore.toFixed(1) : <UnavailableValue />} />
      </div>
      {d.activityScoreComponents.length > 0 && (
        <div className="mt-2 space-y-1">
          {d.activityScoreComponents.map((c) => (
            <div key={c.name} className="flex items-center justify-between text-xs">
              <span className="capitalize text-umbra-muted">{c.name}</span>
              <span className="font-mono text-umbra-lilac">
                {c.available ? c.points.toFixed(1) : "—"}
              </span>
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
      <SectionLabel source="tracked history">War participation</SectionLabel>
      {w.warsTracked === 0 ? (
        <p className="text-xs text-umbra-muted">No wars tracked yet. Wars will appear here once the tracker observes them.</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            <FactCell label="Wars tracked" value={w.warsTracked} />
            <FactCell label="Wars missed" value={w.warsMissed} />
            <FactCell label="Participation" value={w.participationRate !== null ? `${(w.participationRate * 100).toFixed(0)}%` : <UnavailableValue />} />
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <FactCell label="Stars earned" value={w.starsEarned} />
            <FactCell label="Avg stars" value={w.averageStars !== null ? w.averageStars.toFixed(1) : <UnavailableValue />} />
            <FactCell label="3-star rate" value={w.threeStarRate !== null ? `${(w.threeStarRate * 100).toFixed(0)}%` : <UnavailableValue />} />
          </div>
          {w.recentWars.length > 0 && (
            <div className="mt-3">
              <p className="mb-1.5 font-mono text-[9px] uppercase tracking-wider text-umbra-muted">Recent wars</p>
              <div className="space-y-1">
                {w.recentWars.map((war) => (
                  <div key={war.warId} className="flex items-center justify-between rounded-lg bg-white/[.035] px-3 py-1.5 text-xs">
                    <div className="min-w-0">
                      <p className="truncate text-umbra-lilac">vs {war.opponentName ?? "Unknown"}</p>
                      <p className="font-mono text-[10px] text-umbra-muted">
                        {war.attacksUsed}/{war.attacksAllowed} attacks · {war.starsEarned} stars
                        {war.missed && " · missed"}
                      </p>
                    </div>
                    {war.result && (
                      <Badge tone={war.result === "win" ? "success" : war.result === "loss" ? "danger" : "muted"}>
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
  const [showAll, setShowAll] = useState(false);
  return (
    <div>
      <SectionLabel source="API fact">Career statistics</SectionLabel>
      <div className="grid grid-cols-3 gap-2">
        <FactCell label="War stars" value={c.warStars ?? <UnavailableValue />} />
        <FactCell label="Attack wins" value={c.attackWins ?? <UnavailableValue />} />
        <FactCell label="Defense wins" value={c.defenseWins ?? <UnavailableValue />} />
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <FactCell label="Capital contrib" value={c.clanCapitalContributions ?? <UnavailableValue />} />
        <FactCell label="Best BB trophies" value={c.bestBuilderBaseTrophies ?? <UnavailableValue />} />
      </div>
      {c.achievements.length > 0 && (
        <div className="mt-3">
          <button
            onClick={() => setShowAll(!showAll)}
            className="font-mono text-[10px] uppercase tracking-wider text-umbra-purple transition hover:text-umbra-lilac"
          >
            {showAll ? "Hide" : "Show"} {c.achievements.length} achievements
          </button>
          {showAll && (
            <div className="mt-2 space-y-1">
              {c.achievements.map((a) => (
                <div key={a.name} className="flex items-center justify-between rounded-lg bg-white/[.035] px-3 py-1.5 text-xs">
                  <span className="truncate text-umbra-lilac">{a.name}</span>
                  <span className="font-mono text-umbra-muted">
                    {a.value.toLocaleString()}
                    {a.target && ` / ${a.target.toLocaleString()}`}
                    {a.stars && ` ★${a.stars}`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <p className="mt-2 text-[11px] text-umbra-muted">
        Lifetime Supercell totals — not tracked since Umbra Lunaria began.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section 6: Progression
// ---------------------------------------------------------------------------

function ProgressionSection({ detail }: { detail: MemberDetailView }) {
  const p = detail.progression;
  const categories: Array<{ label: string; items: Array<{ name: string; level: number; maxLevel: number | null }> }> = [
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
        <p className="text-xs text-umbra-muted">Progression data pending first daily batch.</p>
      </div>
    );
  }

  return (
    <div>
      <SectionLabel source="API fact">Progression</SectionLabel>
      <div className="space-y-3">
        {categories.filter((c) => c.items.length > 0).map((cat) => (
          <div key={cat.label}>
            <p className="mb-1.5 font-mono text-[9px] uppercase tracking-wider text-umbra-muted">
              {cat.label}
            </p>
            <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
              {cat.items.map((item) => (
                <ProgressionCard key={item.name} name={item.name} level={item.level} maxLevel={item.maxLevel} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

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
    <div className={`rounded-lg border p-2 text-center ${isMaxed ? "border-emerald-400/30 bg-emerald-400/5" : "border-umbra-line bg-white/[.035]"}`}>
      {icon ? (
        <Image src={icon} alt={name} width={28} height={28} className="mx-auto h-7 w-7 object-contain" unoptimized />
      ) : (
        <div className="mx-auto flex h-7 w-7 items-center justify-center rounded bg-umbra-elevated/50">
          <span className="text-[10px] text-umbra-muted">{name.charAt(0)}</span>
        </div>
      )}
      <p className="mt-1 truncate text-[10px] text-umbra-lilac">{name}</p>
      <p className={`font-mono text-[10px] ${isMaxed ? "text-emerald-400" : "text-umbra-muted"}`}>
        {level}{maxLevel ? `/${maxLevel}` : ""}
      </p>
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
      <SectionLabel source="derived analysis">Rushed analysis</SectionLabel>
      {r.overallPercent === null ? (
        <p className="text-xs text-umbra-muted">
          Not available yet — requires Town Hall cap reference data (Phase 3.0).
        </p>
      ) : (
        <>
          <div className="rounded-xl bg-white/[.035] p-3 text-center">
            <p className="font-mono text-[9px] uppercase tracking-wider text-umbra-muted">Overall rushed</p>
            <p className="mt-1 font-display text-3xl font-bold text-amber-400">
              {r.overallPercent.toFixed(1)}%
            </p>
          </div>
          {r.categoryBreakdown.length > 0 && (
            <div className="mt-2 grid grid-cols-3 gap-2">
              {r.categoryBreakdown.map((c) => (
                <FactCell key={c.category} label={c.category} value={
                  c.percent !== null ? `${c.percent.toFixed(0)}%` : <UnavailableValue />
                } />
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
    <div className="mb-2 flex items-center gap-2">
      <h3 className="font-display text-sm font-semibold text-umbra-lilac">{children}</h3>
      <span className="font-mono text-[9px] uppercase tracking-wider text-umbra-purple">{source}</span>
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
    <div className="rounded-lg bg-white/[.035] p-2">
      <p className="font-mono text-[9px] uppercase tracking-wider text-umbra-muted">{label}</p>
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
      <p className="font-mono text-[9px] uppercase tracking-wider text-umbra-muted">{label}</p>
      <p className="mt-0.5 text-sm font-bold text-emerald-400">{given}</p>
      <p className="font-mono text-[10px] text-umbra-muted">/ {received}</p>
    </div>
  );
}
