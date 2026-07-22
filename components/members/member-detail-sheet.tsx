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
          <p className="font-mono text-xs text-umbra-muted">{p.playerTag} · <span className="capitalize">{p.role}</span> · {p.clanRank ? `Rank ${p.clanRank}` : 'Unranked'}</p>
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
// Section 2: Activity
// ---------------------------------------------------------------------------

function ActivitySection({ detail }: { detail: MemberDetailView }) {
  const a = detail.activity;
  return (
    <div>
      <SectionLabel>Activity</SectionLabel>
      <div className="grid grid-cols-2 gap-2">
        <CompactStat label="Last active" value={fmtDate(a.lastActiveAt)} />
        <CompactStat label="Login days (30d)" value={a.loginDays.length} accent="purple" />
      </div>
      {a.buckets.length > 0 && (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1.5">
            <p className="font-mono text-[10px] uppercase tracking-wider text-umbra-muted">30-day activity</p>
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
      {a.hasPartialData && (
        <p className="mt-2 text-[10px] text-amber-400">⚠ Partial tracking data</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section 3: War participation
// ---------------------------------------------------------------------------

function WarSection({ detail }: { detail: MemberDetailView }) {
  const w = detail.warParticipation;
  return (
    <div>
      <SectionLabel>War Record</SectionLabel>
      {w.warsTracked === 0 ? (
        <p className="text-xs text-umbra-muted">No wars tracked yet.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            <CompactStat label="Wars Tracked" value={w.warsTracked} />
            <CompactStat label="Wars Missed" value={w.warsMissed} accent={w.warsMissed > 0 ? "amber" : "emerald"} />
            <CompactStat label="3-Star Rate" value={w.threeStarRate !== null ? `${(w.threeStarRate * 100).toFixed(0)}%` : <UnavailableValue />} accent="emerald" />
            <CompactStat label="Avg Stars" value={w.averageStars !== null ? w.averageStars.toFixed(1) : <UnavailableValue />} />
          </div>
          {w.currentWarStatus && (
            <div className="mt-3 rounded-lg bg-umbra-purple/10 border border-umbra-purple/20 px-3 py-1.5 text-center text-xs text-umbra-lilac">
              Current war: <span className="font-semibold">{w.currentWarStatus}</span>
            </div>
          )}
        </>
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
      <div className="grid grid-cols-3 gap-2">
        <DonationCell label="24h" given={d.given24h} received={d.received24h} />
        <DonationCell label="7d" given={d.given7d} received={d.received7d} />
        <DonationCell label="30d" given={d.given30d} received={d.received30d} />
      </div>
      
      {d.buckets.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-umbra-muted">30-day trend</p>
          <div className="h-[80px]"><DonationChart buckets={d.buckets} /></div>
        </div>
      )}
    </div>
  );
}

function DonationCell({ label, given, received }: { label: string; given: number; received: number }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg bg-white/[.03] border border-white/[.02] py-3">
      <p className="font-mono text-[10px] uppercase tracking-wider text-umbra-muted">{label}</p>
      <div className="mt-1 flex items-baseline gap-1 font-mono">
        <span className="text-base font-bold text-emerald-400">↑{given}</span>
        <span className="text-xs text-umbra-muted">↓{received}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section 5: Rushed analysis
// ---------------------------------------------------------------------------

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

function ProgressionSection({ detail }: { detail: MemberDetailView }) {
  const p = detail.progression;
  const categories = [
    { id: "troops", label: "Troops", items: p.troops },
    { id: "heroes", label: "Heroes & Equip", items: [...p.heroes, ...p.heroEquipment] },
    { id: "spells", label: "Spells & Pets", items: [...p.spells, ...p.pets] },
    { id: "builder", label: "Builder Base", items: [...p.builderBaseTroops, ...p.builderBaseHeroes] },
  ].filter(c => c.items.length > 0);

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
              {cat.label} ({cat.items.length})
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="grid grid-cols-8 gap-2 sm:grid-cols-10 md:grid-cols-12">
          {activeCat.items.map((item) => (
            <ProgressionCard key={item.name} name={item.name} level={item.level} maxLevel={item.maxLevel} />
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
              <span className="truncate text-umbra-lilac">{a.name}</span>
              <span className="shrink-0 font-mono text-umbra-muted text-[11px]">
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

function SectionLabel({ children, noMargin }: { children: React.ReactNode, noMargin?: boolean }) {
  return (
    <div className={`flex items-center gap-2 border-b border-umbra-line/50 pb-1 ${noMargin ? '' : 'mb-3'}`}>
      <h3 className="font-display text-sm font-semibold text-umbra-lilac">{children}</h3>
    </div>
  );
}
