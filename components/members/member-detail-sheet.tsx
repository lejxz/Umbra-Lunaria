"use client";

import Image from "next/image";
import type { MemberDetailView } from "@/lib/view-models/members";
import { Modal } from "@/components/ui/modal";
import { Badge, UnavailableValue } from "@/components/ui";
import { getUnitIcon } from "@/lib/assets/unit-icon-map";
import { DonationChart } from "@/components/dashboard/donation-chart";
import { useState } from "react";

/**
 * Full member detail sheet. Redesigned with:
 * - Profile section that merges Career stats (war stars, attack wins, etc.)
 * - Better Activity section with visual grid
 * - Rushed analysis using API-reported maxLevel
 * - Consistent design across all sections
 */

const TZ = "Asia/Manila";

function toDate(d: Date | string | null): Date | null {
  if (!d) return null;
  return d instanceof Date ? d : new Date(d);
}

function fmtDate(d: Date | string | null, opts?: Intl.DateTimeFormatOptions): string {
  const date = toDate(d);
  if (!date) return "—";
  return date.toLocaleDateString("en-US", opts ?? { month: "short", day: "numeric", timeZone: TZ });
}

export function MemberDetailSheet({
  detail,
  onClose,
}: {
  detail: MemberDetailView;
  onClose: () => void;
}) {
  return (
    <Modal open onClose={onClose} aria-labelledby="member-detail-title" maxWidth="max-w-3xl">
      <MemberDetailContent detail={detail} />
    </Modal>
  );
}

export function MemberDetailContent({ detail }: { detail: MemberDetailView }) {
  return (
    <div className="space-y-5">
      <ProfileSection detail={detail} />
      {detail.profile.isDeparted && (
        <div className="rounded-lg bg-amber-400/10 px-4 py-2 text-sm text-amber-400">
          ⚠ Departed {fmtDate(detail.profile.leftAt, { month: "short", day: "numeric", year: "numeric", timeZone: TZ })}. Data retained temporarily.
        </div>
      )}
      <ActivitySection detail={detail} />
      <DonationsSection detail={detail} />
      <WarSection detail={detail} />
      <ProgressionSection detail={detail} />
      <RushedSection detail={detail} />
      <AchievementsSection detail={detail} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section 1: Profile (merged with Career)
// ---------------------------------------------------------------------------

function ProfileSection({ detail }: { detail: MemberDetailView }) {
  const p = detail.profile;
  const c = detail.career;

  return (
    <div>
      {/* Header: league icon + name/tag + TH badge */}
      <div className="flex items-center gap-4">
        {p.leagueTier?.iconUrls?.small && (
          <Image src={p.leagueTier.iconUrls.small} alt={p.leagueTier.name} width={48} height={48} className="h-12 w-12 shrink-0" unoptimized />
        )}
        <div className="min-w-0 flex-1">
          <h2 id="member-detail-title" className="font-display text-2xl text-umbra-lilac">{p.name}</h2>
          <p className="font-mono text-xs text-umbra-muted">{p.playerTag}</p>
        </div>
        {p.townHallLevel && (
          <div className="shrink-0 rounded-xl bg-umbra-purple/15 px-4 py-2 text-center">
            <p className="font-mono text-[9px] uppercase tracking-wider text-umbra-muted">TH</p>
            <p className="font-display text-xl font-bold text-umbra-purple">{p.townHallLevel}</p>
          </div>
        )}
      </div>

      {/* Row 1: Identity stats */}
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Role" value={<span className="capitalize">{p.role}</span>} />
        <Stat label="Exp level" value={p.expLevel ?? <UnavailableValue />} />
        <Stat label="Clan rank" value={p.clanRank ?? <UnavailableValue />} />
        <Stat label="Joined" value={fmtDate(p.joinedAt)} />
      </div>

      {/* Row 2: Trophies & league */}
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Trophies" value={p.trophies ?? <UnavailableValue />} />
        <Stat label="Best trophies" value={p.bestTrophies ?? <UnavailableValue />} />
        <Stat label="League tier" value={p.leagueTier?.name ?? <UnavailableValue />} />
        <Stat label="War pref" value={p.warPreference ? <Badge tone={p.warPreference === "in" ? "success" : "muted"}>{p.warPreference}</Badge> : <UnavailableValue />} />
      </div>

      {/* Row 3: Career stats (merged from Career section) */}
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="War stars" value={c.warStars ?? <UnavailableValue />} accent="amber" />
        <Stat label="Attack wins" value={c.attackWins ?? <UnavailableValue />} accent="emerald" />
        <Stat label="Defense wins" value={c.defenseWins ?? <UnavailableValue />} accent="red" />
        <Stat label="Capital contrib" value={c.clanCapitalContributions?.toLocaleString() ?? <UnavailableValue />} />
      </div>

      {/* Row 4: Builder Base (if present) */}
      {(p.builderHallLevel || p.builderBaseTrophies) && (
        <div className="mt-2 grid grid-cols-3 gap-2">
          <Stat label="Builder Hall" value={p.builderHallLevel ?? <UnavailableValue />} />
          <Stat label="BB trophies" value={p.builderBaseTrophies ?? <UnavailableValue />} />
          <Stat label="Best BB" value={p.bestBuilderBaseTrophies ?? <UnavailableValue />} />
        </div>
      )}

      <p className="mt-2 text-[11px] text-umbra-muted">
        Career values are lifetime Supercell totals — not tracked since Umbra Lunaria began.
      </p>
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
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Last active" value={fmtDate(a.lastActiveAt)} />
        <Stat label="Tracking started" value={fmtDate(a.trackingStart)} />
        <Stat label="Login days (30d)" value={a.loginDays.length} accent="purple" />
        <Stat label="Active days (30d)" value={a.buckets.filter((b) => b.active).length} accent="emerald" />
      </div>
      {a.hasPartialData && (
        <p className="mt-2 text-xs text-amber-400">⚠ Partial data — tracking started partway through this window.</p>
      )}
      {a.buckets.length > 0 && (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1.5">
            <p className="font-mono text-[9px] uppercase tracking-wider text-umbra-muted">30-day activity</p>
            <div className="flex items-center gap-2 text-[10px] text-umbra-muted">
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-umbra-purple" /> Active</span>
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-white/10" /> Inactive</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-0.5">
            {a.buckets.map((b, i) => (
              <div key={i} title={`${b.label}: ${b.active ? "active" : "inactive"}`} className={`h-4 w-4 rounded-sm transition-colors ${b.active ? "bg-umbra-purple" : "bg-white/10"}`} />
            ))}
          </div>
        </div>
      )}
      <p className="mt-2 text-[11px] text-umbra-muted">Estimated from observed changes — not online presence.</p>
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
        <Stat label="Ratio (30d)" value={d.ratio !== null ? d.ratio.toFixed(2) : <UnavailableValue />} />
        <Stat label="Activity score" value={d.activityScore !== null ? d.activityScore.toFixed(1) : <UnavailableValue />} accent="emerald" />
      </div>
      {d.buckets.length > 0 && (
        <div className="mt-3">
          <p className="mb-1 font-mono text-[9px] uppercase tracking-wider text-umbra-muted">30-day trend</p>
          <div className="h-[140px]"><DonationChart buckets={d.buckets} /></div>
        </div>
      )}
      {d.activityScoreComponents.length > 0 && (
        <div className="mt-2 grid grid-cols-4 gap-1">
          {d.activityScoreComponents.map((c) => (
            <div key={c.name} className="rounded bg-white/[.035] px-2 py-1 text-center">
              <p className="font-mono text-[8px] uppercase tracking-wider text-umbra-muted">{c.name}</p>
              <p className="font-mono text-xs text-umbra-lilac">{c.available ? c.points.toFixed(1) : "—"}</p>
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
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Wars tracked" value={w.warsTracked} />
            <Stat label="Wars missed" value={w.warsMissed} accent={w.warsMissed > 0 ? "amber" : "emerald"} />
            <Stat label="Participation" value={w.participationRate !== null ? `${(w.participationRate * 100).toFixed(0)}%` : <UnavailableValue />} />
            <Stat label="Stars earned" value={w.starsEarned} accent="amber" />
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Attacks used" value={w.attacksUsed} />
            <Stat label="Attacks allowed" value={w.attacksAllowed} />
            <Stat label="Avg stars" value={w.averageStars !== null ? w.averageStars.toFixed(1) : <UnavailableValue />} />
            <Stat label="3-star rate" value={w.threeStarRate !== null ? `${(w.threeStarRate * 100).toFixed(0)}%` : <UnavailableValue />} accent="emerald" />
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
                        {war.attacksUsed}/{war.attacksAllowed} attacks · {war.starsEarned} stars{war.missed && " · missed"}
                      </p>
                    </div>
                    {war.result && <Badge tone={war.result === "win" ? "success" : war.result === "loss" ? "danger" : "muted"}>{war.result}</Badge>}
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
// Section 5: Progression
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
            <p className="mb-1.5 font-mono text-[9px] uppercase tracking-wider text-umbra-muted">{cat.label} ({cat.items.length})</p>
            <div className="grid grid-cols-8 gap-1 sm:grid-cols-10 md:grid-cols-12">
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

function ProgressionCard({ name, level, maxLevel }: { name: string; level: number; maxLevel: number | null }) {
  const icon = getUnitIcon(name);
  const isMaxed = maxLevel !== null && level >= maxLevel;
  return (
    <div className="group relative" title={`${name}: ${level}${maxLevel ? `/${maxLevel}` : ""}${isMaxed ? " (MAX)" : ""}`}>
      <div className={`relative aspect-square w-full overflow-hidden rounded-md border ${isMaxed ? "border-amber-400/50 bg-amber-400/5" : "border-umbra-line bg-umbra-ink/60"}`}>
        <Image src={icon} alt={name} fill className="object-contain p-1" unoptimized />
        <div className={`absolute bottom-0 left-0 rounded-tr-md px-1.5 py-0.5 font-mono text-[11px] font-bold leading-none ${isMaxed ? "bg-amber-400 text-umbra-ink" : "bg-umbra-ink/95 text-umbra-lilac"}`}>
          {isMaxed ? "MAX" : level}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section 6: Rushed analysis (now using API maxLevel)
// ---------------------------------------------------------------------------

function RushedSection({ detail }: { detail: MemberDetailView }) {
  const r = detail.rushed;
  if (r.overallPercent === null) {
    return (
      <div>
        <SectionLabel source="derived">Rushed analysis</SectionLabel>
        <p className="text-xs text-umbra-muted">Not available — no progression data with max levels.</p>
      </div>
    );
  }

  const pct = r.overallPercent;
  const tone = pct < 10 ? "emerald" : pct < 30 ? "amber" : "red";
  const toneClass = tone === "emerald" ? "text-emerald-400" : tone === "amber" ? "text-amber-400" : "text-red-400";

  return (
    <div>
      <SectionLabel source="derived">Rushed analysis</SectionLabel>
      <div className="flex items-center gap-4">
        <div className="text-center">
          <p className={`font-display text-4xl font-bold ${toneClass}`}>{pct.toFixed(1)}%</p>
          <p className="font-mono text-[9px] uppercase tracking-wider text-umbra-muted">overall rushed</p>
        </div>
        <div className="flex-1">
          <div className="grid grid-cols-5 gap-1">
            {r.categoryBreakdown.map((c) => (
              <div key={c.category} className="rounded bg-white/[.035] px-1.5 py-1 text-center">
                <p className="font-mono text-[8px] uppercase tracking-wider text-umbra-muted">{c.category}</p>
                <p className={`font-mono text-sm font-bold ${c.percent !== null && c.percent >= 30 ? "text-red-400" : c.percent !== null && c.percent >= 10 ? "text-amber-400" : "text-emerald-400"}`}>
                  {c.percent !== null ? `${c.percent.toFixed(0)}%` : "—"}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <p className="mt-2 text-[11px] text-umbra-muted">
        Derived from API-reported global max levels. Lower is better — 0% means all units are maxed.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section 7: Achievements
// ---------------------------------------------------------------------------

function AchievementsSection({ detail }: { detail: MemberDetailView }) {
  const c = detail.career;
  const [showAll, setShowAll] = useState(false);
  if (c.achievements.length === 0) return null;

  return (
    <div>
      <SectionLabel source="API fact">Achievements</SectionLabel>
      <button onClick={() => setShowAll(!showAll)} className="font-mono text-[10px] uppercase tracking-wider text-umbra-purple transition hover:text-umbra-lilac">
        {showAll ? "Hide" : "Show"} {c.achievements.length} achievements
      </button>
      {showAll && (
        <div className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
          {c.achievements.map((a) => (
            <div key={a.name} className="flex items-center justify-between rounded-lg bg-white/[.035] px-3 py-1.5 text-xs">
              <span className="truncate text-umbra-lilac">{a.name}</span>
              <span className="shrink-0 font-mono text-umbra-muted">
                {a.value.toLocaleString()}{a.target && ` / ${a.target.toLocaleString()}`}{a.stars && ` ★${a.stars}`}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function SectionLabel({ source, children }: { source: string; children: React.ReactNode }) {
  return (
    <div className="mb-2 flex items-center gap-2 border-b border-umbra-line/50 pb-1">
      <h3 className="font-display text-sm font-semibold text-umbra-lilac">{children}</h3>
      <span className="font-mono text-[9px] uppercase tracking-wider text-umbra-purple">{source}</span>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: React.ReactNode; accent?: "emerald" | "amber" | "red" | "purple" }) {
  const colorClass = accent === "emerald" ? "text-emerald-400" : accent === "amber" ? "text-amber-400" : accent === "red" ? "text-red-400" : accent === "purple" ? "text-umbra-purple" : "text-white";
  return (
    <div className="flex h-full flex-col justify-center rounded-lg bg-white/[.035] p-2">
      <p className="font-mono text-[9px] uppercase tracking-wider text-umbra-muted">{label}</p>
      <p className={`mt-0.5 text-xs font-semibold ${colorClass}`}>{value}</p>
    </div>
  );
}

function DonationCell({ label, given, received }: { label: string; given: number; received: number }) {
  return (
    <div className="rounded-lg bg-white/[.035] p-2 text-center">
      <p className="font-mono text-[9px] uppercase tracking-wider text-umbra-muted">{label}</p>
      <p className="mt-0.5 text-sm font-bold text-emerald-400">{given}</p>
      <p className="font-mono text-[10px] text-umbra-muted">/ {received}</p>
    </div>
  );
}
