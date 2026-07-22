"use client";

import Image from "next/image";
import type { MemberDetailView } from "@/lib/view-models/members";
import { Modal } from "@/components/ui/modal";
import { Badge, UnavailableValue } from "@/components/ui";
import { getUnitIcon } from "@/lib/assets/unit-icon-map";
import { DonationChart } from "@/components/dashboard/donation-chart";
import { useState } from "react";

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
    <div className="space-y-6">
      <ProfileSection detail={detail} />
      {detail.profile.isDeparted && (
        <div className="rounded-lg bg-amber-400/10 px-4 py-2 text-sm text-amber-400">
          ⚠ Departed {fmtDate(detail.profile.leftAt, { month: "short", day: "numeric", year: "numeric", timeZone: TZ })}. Data retained temporarily.
        </div>
      )}
      
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <ActivitySection detail={detail} />
        <WarSection detail={detail} />
      </div>
      
      <DonationsSection detail={detail} />
      <ActivityScoreSection detail={detail} />
      <RushedSection detail={detail} />
      <ProgressionSection detail={detail} />
      <AchievementsSection detail={detail} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section 1: Profile (Compacted)
// ---------------------------------------------------------------------------

function ProfileSection({ detail }: { detail: MemberDetailView }) {
  const p = detail.profile;
  const c = detail.career;

  return (
    <div>
      {/* Header: league icon + name/tag + TH badge */}
      <div className="flex items-center gap-4">
        {p.leagueTier?.iconUrls?.small && (
          <Image src={p.leagueTier.iconUrls.small} alt={p.leagueTier.name} width={56} height={56} className="h-14 w-14 shrink-0" unoptimized />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <h2 id="member-detail-title" className="font-display text-2xl text-umbra-lilac">{p.name}</h2>
            {p.warPreference && (
              <Badge tone={p.warPreference === "in" ? "success" : "muted"}>{p.warPreference}</Badge>
            )}
          </div>
          <p className="font-mono text-xs text-umbra-muted mt-1">
            {p.playerTag} · <span className="capitalize">{p.role}</span>
            {detail.donations.activityScoreRank ? (
              <span className="ml-2 inline-flex items-center rounded bg-umbra-purple/20 px-1.5 py-0.5 text-[10px] font-semibold text-umbra-lilac">
                #{detail.donations.activityScoreRank} Activity Rank
              </span>
            ) : (
              <span className="ml-2">· {p.clanRank ? `Clan Rank ${p.clanRank}` : 'Unranked'}</span>
            )}
          </p>
        </div>
        {p.townHallLevel && (
          <div className="shrink-0 rounded-xl bg-umbra-purple/15 px-4 py-2 text-center shadow-[0_0_15px_rgba(182,120,255,0.1)]">
            <p className="font-mono text-[10px] uppercase tracking-wider text-umbra-muted">TH</p>
            <p className="font-display text-2xl font-bold text-umbra-purple">{p.townHallLevel}</p>
          </div>
        )}
      </div>

      {/* Dense Profile Grid */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <CompactStat label="Exp level" value={p.expLevel ?? <UnavailableValue />} />
        <CompactStat label="Joined" value={fmtDate(p.joinedAt)} />
        <CompactStat label="Trophies" value={p.trophies ?? <UnavailableValue />} />
        <CompactStat label="Best trophies" value={p.bestTrophies ?? <UnavailableValue />} />
        <CompactStat label="League tier" value={p.leagueTier?.name ?? <UnavailableValue />} />
        <CompactStat label="War stars" value={c.warStars ?? <UnavailableValue />} accent="amber" />
        <CompactStat label="Atk / Def wins" value={`${c.attackWins ?? 0} / ${c.defenseWins ?? 0}`} accent="emerald" />
        <CompactStat label="Capital contrib" value={c.clanCapitalContributions?.toLocaleString() ?? <UnavailableValue />} />
      </div>

      {/* Builder Base (if present) */}
      {(p.builderHallLevel || p.builderBaseTrophies) && (
        <div className="mt-3 flex items-center gap-4 rounded-lg bg-white/[.02] px-4 py-2">
          <p className="font-mono text-[10px] uppercase tracking-wider text-umbra-muted">Builder Base</p>
          <div className="h-4 w-px bg-umbra-line/30" />
          <p className="font-mono text-xs text-white">BH {p.builderHallLevel ?? "—"}</p>
          <p className="font-mono text-xs text-white">🏆 {p.builderBaseTrophies ?? "—"} <span className="text-umbra-muted text-[10px]">(Best: {p.bestBuilderBaseTrophies ?? "—"})</span></p>
        </div>
      )}
    </div>
  );
}

function CompactStat({ label, value, accent }: { label: string; value: React.ReactNode; accent?: "emerald" | "amber" | "purple" }) {
  const colorClass = accent === "emerald" ? "text-emerald-400" : accent === "amber" ? "text-amber-400" : accent === "purple" ? "text-umbra-purple" : "text-white";
  return (
    <div className="flex flex-col justify-center rounded-lg bg-white/[.03] px-3 py-2 border border-white/[.02]">
      <p className="font-mono text-[10px] uppercase tracking-wider text-umbra-muted">{label}</p>
      <p className={`mt-0.5 text-sm font-semibold ${colorClass}`}>{value}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section 2: Activity — heatmap style
// ---------------------------------------------------------------------------

function ActivitySection({ detail }: { detail: MemberDetailView }) {
  const a = detail.activity;
  const activeDays = a.buckets.filter((b) => b.active).length;
  const totalDays = a.buckets.length;

  return (
    <div className="flex h-full flex-col">
      <SectionLabel>Log In Activity</SectionLabel>

      {/* Summary line */}
      <div className="flex items-baseline gap-3">
        <div>
          <span className="font-display text-2xl font-bold text-umbra-purple">{activeDays}</span>
          <span className="text-sm text-umbra-muted"> / {totalDays} active days</span>
        </div>
      </div>

      {/* Heatmap strip — full width barcode style */}
      {a.buckets.length > 0 && (
        <div className="mt-4 flex w-full flex-1 flex-col">
          <div className="flex flex-1 gap-[2px]">
            {a.buckets.map((b, i) => (
              <div
                key={i}
                title={`${b.label}: ${b.active ? "active" : "inactive"}`}
                className={`flex-1 rounded-sm transition-all hover:scale-y-[1.05] ${
                  b.active
                    ? "bg-gradient-to-t from-umbra-indigo/40 to-umbra-purple shadow-[0_0_8px_rgba(182,120,255,0.2)]"
                    : "bg-white/[.03] border border-white/5"
                }`}
              />
            ))}
          </div>
          {/* Date labels */}
          <div className="mt-3 flex w-full justify-between font-mono text-[9px] uppercase tracking-widest text-umbra-muted/60">
            <span>{a.buckets[0]?.label ?? ""}</span>
            <span>{a.buckets[a.buckets.length - 1]?.label ?? ""}</span>
          </div>
        </div>
      )}

      {/* Last active + tracking info */}
      <div className="mt-5 flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[10px] uppercase tracking-wider text-umbra-muted">Last active</span>
          <span className="font-semibold text-white">{fmtDate(a.lastActiveAt)}</span>
        </div>
        <div className="h-3 w-px bg-umbra-line/30" />
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[10px] uppercase tracking-wider text-umbra-muted">Tracking</span>
          <span className="text-umbra-muted">{fmtDate(a.trackingStart)}</span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section 3: War participation
// ---------------------------------------------------------------------------

function WarSection({ detail }: { detail: MemberDetailView }) {
  const w = detail.warParticipation;

  if (w.warsTracked === 0) {
    return (
      <div>
        <SectionLabel>War Record</SectionLabel>
        <div className="flex flex-col items-center justify-center py-6 text-center">
          {/* Crossed swords icon (dimmed) */}
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="opacity-30">
            <g transform="translate(20 20) rotate(-45)">
              <rect x="-0.8" y="-10" width="1.6" height="14" rx="0.5" fill="#9287AD" />
              <rect x="-3" y="4" width="6" height="1.5" rx="0.5" fill="#9287AD" />
            </g>
            <g transform="translate(20 20) rotate(45)">
              <rect x="-0.8" y="-10" width="1.6" height="14" rx="0.5" fill="#9287AD" />
              <rect x="-3" y="4" width="6" height="1.5" rx="0.5" fill="#9287AD" />
            </g>
          </svg>
          <p className="mt-2 text-sm text-umbra-muted">No wars tracked yet</p>
          <p className="mt-0.5 text-[11px] text-umbra-muted/60">
            War history will appear here once the tracker observes a war.
          </p>
        </div>
      </div>
    );
  }

  const participationPct = w.participationRate !== null ? Math.round(w.participationRate * 100) : null;

  return (
    <div>
      <SectionLabel>War Record</SectionLabel>
      {/* Big participation number */}
      <div className="flex items-baseline gap-3">
        <span className="font-display text-2xl font-bold text-umbra-purple">{w.warsTracked}</span>
        <span className="text-sm text-umbra-muted">wars tracked</span>
        {participationPct !== null && (
          <span className="ml-auto font-mono text-xs text-emerald-400">{participationPct}% participation</span>
        )}
      </div>

      {/* Stat row */}
      <div className="mt-2 grid grid-cols-2 gap-2">
        <CompactStat
          label="Missed"
          value={w.warsMissed}
          accent={w.warsMissed > 0 ? "amber" : "emerald"}
        />
        <CompactStat
          label="3-star rate"
          value={w.threeStarRate !== null ? `${(w.threeStarRate * 100).toFixed(0)}%` : <UnavailableValue />}
          accent="emerald"
        />
        <CompactStat
          label="Avg stars"
          value={w.averageStars !== null ? w.averageStars.toFixed(1) : <UnavailableValue />}
        />
        <CompactStat label="Stars earned" value={w.starsEarned} accent="amber" />
      </div>

      {w.currentWarStatus && (
        <div className="mt-3 rounded-lg bg-umbra-purple/10 border border-umbra-purple/20 px-3 py-1.5 text-center text-xs text-umbra-lilac">
          Current war: <span className="font-semibold">{w.currentWarStatus}</span>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section 4: Donations
// ---------------------------------------------------------------------------

function DonationsSection({ detail }: { detail: MemberDetailView }) {
  const d = detail.donations;
  return (
    <div>
      <SectionLabel>Donations</SectionLabel>
      <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 rounded-lg bg-white/[.02] border border-white/[.02] px-4 py-2">
        <DonationInline label="24h" given={d.given24h} received={d.received24h} />
        <DonationInline label="7d" given={d.given7d} received={d.received7d} />
        <DonationInline label="30d" given={d.given30d} received={d.received30d} />
      </div>
      
      {d.buckets.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-umbra-muted">30-day trend</p>
          <div className="h-[140px]"><DonationChart buckets={d.buckets} /></div>
        </div>
      )}
    </div>
  );
}

function DonationInline({ label, given, received }: { label: string; given: number; received: number }) {
  return (
    <div className="flex items-center gap-2 font-mono">
      <span className="text-[10px] uppercase tracking-wider text-umbra-muted">{label}:</span>
      <div className="flex items-baseline gap-1.5">
        <span className="text-sm font-bold text-emerald-400">↑{given}</span>
        <span className="text-xs text-umbra-muted">↓{received}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section 5: Activity Score & Rushed analysis
// ---------------------------------------------------------------------------

function ActivityScoreSection({ detail }: { detail: MemberDetailView }) {
  const score = detail.donations.activityScore;
  if (score === null) return null;

  return (
    <div className="rounded-xl border border-umbra-line bg-umbra-surface/40 p-4 shadow-lg backdrop-blur-md">
      <SectionLabel noMargin>Activity Score</SectionLabel>
      <div className="mt-4 flex items-center gap-6">
        <div className="text-center">
          <p className="font-display text-4xl font-bold text-umbra-purple">{Math.round(score)}</p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-umbra-muted">out of 100</p>
        </div>
        <div className="flex-1">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {detail.donations.activityScoreComponents.map((c, i) => (
              <div key={i} className="rounded-lg bg-white/[.03] px-2 py-2 text-center">
                <p className="font-mono text-[9px] uppercase tracking-wider text-umbra-muted">{c.name}</p>
                <p className={`mt-0.5 font-mono text-sm font-bold ${c.available ? "text-white" : "text-umbra-muted/40"}`}>
                  {c.available ? `+${Math.round(c.points)} pts` : "N/A"}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function RushedSection({ detail }: { detail: MemberDetailView }) {
  const r = detail.rushed;
  if (r.overallPercent === null) {
    return null;
  }

  const pct = r.overallPercent;
  const tone = pct < 10 ? "emerald" : pct < 30 ? "amber" : "red";
  const toneClass = tone === "emerald" ? "text-emerald-400" : tone === "amber" ? "text-amber-400" : "text-red-400";

  return (
    <div className="rounded-xl border border-umbra-line bg-umbra-surface/40 p-4 shadow-lg backdrop-blur-md">
      <SectionLabel noMargin>Rushed Analysis</SectionLabel>
      <div className="mt-4 flex items-center gap-6">
        <div className="text-center">
          <p className={`font-display text-4xl font-bold ${toneClass}`}>{pct.toFixed(1)}%</p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-umbra-muted">overall rushed</p>
        </div>
        <div className="flex-1">
          <div className="grid grid-cols-5 gap-2">
            {r.categoryBreakdown.map((c) => (
              <div key={c.category} className="rounded-lg bg-white/[.03] px-2 py-2 text-center">
                <p className="font-mono text-[9px] uppercase tracking-wider text-umbra-muted">{c.category}</p>
                <p className={`mt-0.5 font-mono text-sm font-bold ${c.percent !== null && c.percent >= 30 ? "text-red-400" : c.percent !== null && c.percent >= 10 ? "text-amber-400" : "text-emerald-400"}`}>
                  {c.percent !== null ? `${c.percent.toFixed(0)}%` : "—"}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section 6: Progression (Tabs)
// ---------------------------------------------------------------------------

const SIEGE_MACHINE_NAMES = new Set([
  "Wall Wrecker", "Battle Blimp", "Stone Slammer", 
  "Siege Barracks", "Log Launcher", "Flame Flinger", "Battle Drill"
]);

function ProgressionSection({ detail }: { detail: MemberDetailView }) {
  const p = detail.progression;
  
  const troops = p.troops.filter(t => !SIEGE_MACHINE_NAMES.has(t.name));
  const siegeMachines = p.troops.filter(t => SIEGE_MACHINE_NAMES.has(t.name));

  const categories = [
    { 
      id: "troops", 
      label: "Troops & Siege", 
      count: troops.length + siegeMachines.length,
      groups: [
        { title: "Troops", items: troops },
        { title: "Siege Machines", items: siegeMachines }
      ] 
    },
    { 
      id: "heroes", 
      label: "Heroes & Equip", 
      count: p.heroes.length + p.heroEquipment.length,
      groups: [
        { title: "Heroes", items: p.heroes },
        { title: "Equipment", items: p.heroEquipment }
      ] 
    },
    { 
      id: "spells", 
      label: "Spells & Pets",
      count: p.spells.length + p.pets.length, 
      groups: [
        { title: "Spells", items: p.spells },
        { title: "Pets", items: p.pets }
      ] 
    },
    { 
      id: "builder", 
      label: "Builder Base",
      count: p.builderBaseTroops.length + p.builderBaseHeroes.length, 
      groups: [
        { title: "BB Troops", items: p.builderBaseTroops },
        { title: "BB Heroes", items: p.builderBaseHeroes }
      ] 
    },
  ].filter(c => c.count > 0);

  const [activeTab, setActiveTab] = useState(categories[0]?.id);

  if (categories.length === 0) {
    return (
      <div>
        <SectionLabel>Progression</SectionLabel>
        <p className="text-xs text-umbra-muted">Progression data pending first daily batch.</p>
      </div>
    );
  }

  const activeCat = categories.find((c) => c.id === activeTab) || categories[0];
  if (!activeCat) return null;

  return (
    <div>
      <SectionLabel>Progression</SectionLabel>
      <div className="mt-3">
        {/* Tab bar */}
        <div className="mb-4 flex flex-wrap gap-2 border-b border-umbra-line/50 pb-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveTab(cat.id)}
              className={`rounded-lg px-3 py-1.5 font-mono text-xs uppercase tracking-wider transition ${
                activeTab === cat.id
                  ? "bg-umbra-purple/20 text-umbra-purple font-bold"
                  : "text-umbra-muted hover:bg-white/[.04] hover:text-umbra-lilac"
              }`}
            >
              {cat.label} ({cat.count})
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="space-y-4">
          {activeCat.groups.filter(g => g.items.length > 0).map(group => (
            <div key={group.title}>
              <h4 className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-umbra-muted">{group.title}</h4>
              <div className="grid grid-cols-8 gap-2 sm:grid-cols-10 md:grid-cols-12">
                {group.items.map((item) => (
                  <ProgressionCard key={item.name} name={item.name} level={item.level} maxLevel={item.maxLevel} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProgressionCard({ name, level, maxLevel }: { name: string; level: number; maxLevel: number | null }) {
  const icon = getUnitIcon(name);
  const isMaxed = maxLevel !== null && level >= maxLevel;
  return (
    <div className="group relative" title={`${name}: ${level}${maxLevel ? `/${maxLevel}` : ""}${isMaxed ? " (MAX)" : ""}`}>
      <div className={`relative aspect-square w-full overflow-hidden rounded-md border ${isMaxed ? "border-amber-400/50 bg-amber-400/5 shadow-[0_0_8px_rgba(251,191,36,0.15)]" : "border-umbra-line bg-umbra-ink/60"}`}>
        <Image src={icon} alt={name} fill className="object-contain p-1" unoptimized />
        <div className={`absolute bottom-0 left-0 rounded-tr-md px-1.5 py-0.5 font-mono text-[11px] font-bold leading-none ${isMaxed ? "bg-amber-400 text-umbra-ink" : "bg-umbra-ink/95 text-umbra-lilac"}`}>
          {isMaxed ? "MAX" : level}
        </div>
      </div>
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
      <div className="flex items-center justify-between border-b border-umbra-line/50 pb-1 mb-2">
        <h3 className="font-display text-sm font-semibold text-umbra-lilac">Achievements</h3>
        <button onClick={() => setShowAll(!showAll)} className="font-mono text-[10px] uppercase tracking-wider text-umbra-purple transition hover:text-umbra-lilac">
          {showAll ? "Hide" : "Show"} {c.achievements.length} achievements
        </button>
      </div>
      
      {showAll && (
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {c.achievements.map((a) => (
            <div key={a.name} className="flex items-center justify-between rounded-lg bg-white/[.03] border border-white/[.02] px-3 py-2 text-xs">
              <div className="flex items-center gap-2 overflow-hidden">
                <span className="truncate font-medium text-umbra-lilac/90">{a.name}</span>
                {a.stars !== undefined && (
                  <div className="flex items-center text-amber-400 shrink-0">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <svg 
                        key={i} 
                        xmlns="http://www.w3.org/2000/svg" 
                        viewBox="0 0 24 24" 
                        className={`w-3.5 h-3.5 ${(a.stars ?? 0) > i ? "fill-current text-amber-400" : "fill-transparent stroke-current stroke-2 text-amber-400/20"}`}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                    ))}
                  </div>
                )}
              </div>
              <span className="shrink-0 font-mono text-umbra-muted/80 text-[11px] ml-4">
                {a.value.toLocaleString()}{a.target && ` / ${a.target.toLocaleString()}`}
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

function SectionLabel({ children, noMargin }: { children: React.ReactNode, noMargin?: boolean }) {
  return (
    <div className={`flex items-center gap-2 border-b border-umbra-line/50 pb-1 ${noMargin ? '' : 'mb-3'}`}>
      <h3 className="font-display text-sm font-semibold text-umbra-lilac">{children}</h3>
    </div>
  );
}
