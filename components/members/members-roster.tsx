"use client";

import { useState, useMemo, useEffect, useRef, memo } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import {
  formatRole,
  type MemberRoster,
  type MemberSortField,
  type SortDirection,
  type MemberRosterEntry,
} from "@/lib/view-models/members";
import { Badge, EmptyState, Select, Toggle } from "@/components/ui";
import type { MemberDetailView } from "@/lib/view-models/members";

// fix (docs/2026-09-11-priority-fixes.md, bundle): the detail sheet (with its
// DonationChart → recharts dependency) is only rendered on click — lazy-load
// it so it doesn't ship in /members' initial bundle (same pattern as
// dashboard-shell.tsx).
const MemberDetailSheet = dynamic(
  () => import("./member-detail-sheet").then((m) => m.MemberDetailSheet),
  { ssr: false },
);

/**
 * Members roster — client component with sorting, filtering, and member
 * detail sheet. See docs/concept/06-members.md.
 *
 * fix A-3 + B-8 (docs/2026-09-11-priority-fixes.md): member details are no
 * longer embedded server-side for the whole roster (the page used to run a
 * ~50× getMemberDetail fan-out per render). They are fetched on click from
 * GET /api/members/[tag] — the same pattern as the dashboard's popup — with
 * an AbortController + per-session memo so rapid clicks can't race and
 * reopening a member doesn't refetch.
 */
export function MembersRoster({
  roster,
  selectedTag,
  onMemberClick,
}: {
  roster: MemberRoster;
  selectedTag?: string | null;
  onMemberClick?: (tag: string | null) => void;
}) {
  const [sortField, setSortField] = useState<MemberSortField>("clanRank");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState<string>("");
  const [filterWarPref, setFilterWarPref] = useState<string>("");
  const [filterActiveOnly, setFilterActiveOnly] = useState(false);
  const [internalSelectedTag, setInternalSelectedTag] = useState<string | null>(null);

  const activeSelectedTag = selectedTag !== undefined ? selectedTag : internalSelectedTag;
  const handleMemberClick = onMemberClick ?? setInternalSelectedTag;

  // ── Detail fetching (fix A-3/B-8) ──
  const [selectedDetail, setSelectedDetail] = useState<MemberDetailView | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const detailCacheRef = useRef(new Map<string, MemberDetailView>());

  useEffect(() => {
    if (!activeSelectedTag) {
      abortRef.current?.abort();
      abortRef.current = null;
      setSelectedDetail(null);
      setDetailError(null);
      setDetailLoading(false);
      return;
    }

    const cached = detailCacheRef.current.get(activeSelectedTag);
    if (cached) {
      abortRef.current?.abort();
      abortRef.current = null;
      setSelectedDetail(cached);
      setDetailError(null);
      setDetailLoading(false);
      return;
    }

    // Abort any in-flight fetch so a slow response for member A can never
    // land under member B's sheet (ordering guard for rapid clicks).
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setDetailLoading(true);
    setDetailError(null);
    fetch(`/api/members/${encodeURIComponent(activeSelectedTag)}`, {
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: MemberDetailView) => {
        if (controller.signal.aborted) return;
        detailCacheRef.current.set(activeSelectedTag, data);
        setSelectedDetail(data);
        setDetailLoading(false);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setDetailError(err instanceof Error ? err.message : String(err));
        setDetailLoading(false);
      });

    return () => controller.abort();
  }, [activeSelectedTag]);

  const sorted = useMemo(() => {
    let result = [...roster.entries];

    if (filterRole) {
      result = result.filter((m) => m.role === filterRole);
    }
    if (filterWarPref) {
      result = result.filter((m) => m.warPreference === filterWarPref);
    }
    if (filterActiveOnly) {
      result = result.filter((m) => m.isActive);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.playerTag.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "role":
          cmp = roleOrder(a.role) - roleOrder(b.role);
          break;
        case "townHallLevel":
          cmp = (a.townHallLevel ?? 0) - (b.townHallLevel ?? 0);
          break;
        case "donations":
          cmp = (a.currentDonations ?? 0) - (b.currentDonations ?? 0);
          break;
        case "trophies":
          cmp = (a.trophies ?? 0) - (b.trophies ?? 0);
          break;
        case "clanRank":
          cmp = (a.clanRank ?? 99) - (b.clanRank ?? 99);
          break;
        case "joinedAt":
          cmp = a.joinedAt.getTime() - b.joinedAt.getTime();
          break;
        case "activity":
          cmp =
            (a.lastActiveAt?.getTime() ?? 0) - (b.lastActiveAt?.getTime() ?? 0);
          break;
        case "warsMissed":
          cmp = a.warsMissed - b.warsMissed;
          break;
        case "rushedPercent":
          cmp = (a.rushedPercent ?? 0) - (b.rushedPercent ?? 0);
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [roster.entries, sortField, sortDir, filterRole, filterWarPref, filterActiveOnly, searchQuery]);

  return (
    <section className="glass flex flex-col rounded-2xl p-5" aria-labelledby="members-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-label uppercase tracking-[.16em] text-umbra-purple">
          Participant Roster
        </p>
        <div className="flex items-center gap-2">
          <Badge tone="brand">
            {sorted.length} of {roster.totalMembers}
          </Badge>
        </div>
      </div>
      <h3 id="members-title" className="mt-1 font-display text-lg text-umbra-lilac">
        Clan Members
      </h3>

      {/* Filter and Sort bar */}
      <div className="relative z-20 mt-5 mb-5 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-label uppercase tracking-wider text-umbra-muted">Filter</span>
        </div>
        <input
          type="text"
          placeholder="Search by name or #tag..."
          aria-label="Search members by name or player tag"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-8 w-48 rounded-lg border border-umbra-line bg-umbra-ink/60 px-3 text-xs text-umbra-lilac placeholder-umbra-muted/50 focus:border-umbra-purple/50 focus:outline-none focus:ring-1 focus:ring-umbra-purple/50 transition"
        />
        <Select
          value={filterRole}
          onChange={setFilterRole}
          ariaLabel="Filter by role"
          options={[
            { value: "", label: "All roles" },
            { value: "leader", label: "Leader" },
            { value: "coLeader", label: "Co-Leader" },
            { value: "admin", label: "Elder" },
            { value: "member", label: "Member" },
          ]}
        />
        <Select
          value={filterWarPref}
          onChange={setFilterWarPref}
          ariaLabel="Filter by war preference"
          options={[
            { value: "", label: "All war pref" },
            { value: "in", label: "In" },
            { value: "out", label: "Out" },
          ]}
        />
        <div className="flex items-center mt-0.5 ml-2">
          <Toggle
            checked={filterActiveOnly}
            onChange={setFilterActiveOnly}
            label="Active only"
          />
        </div>
        
        {/* Separator */}
        <div className="mx-2 hidden h-4 w-px bg-umbra-line/50 sm:block"></div>
        
        <div className="flex items-center gap-2">
          <span className="font-mono text-label uppercase tracking-wider text-umbra-muted">Sort</span>
        </div>
        <Select
          value={sortField}
          onChange={(v) => setSortField(v as MemberSortField)}
          ariaLabel="Sort members by"
          options={[
            { value: "clanRank", label: "Clan Rank" },
            { value: "name", label: "Name" },
            { value: "townHallLevel", label: "Town Hall" },
            { value: "trophies", label: "Trophies" },
            { value: "donations", label: "Donations" },
            { value: "activity", label: "Last Seen" },
            { value: "warsMissed", label: "Wars Missed" },
          ]}
        />
        <button
          onClick={() => setSortDir(sortDir === "asc" ? "desc" : "asc")}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-umbra-line bg-umbra-ink/60 text-xs text-umbra-lilac transition hover:border-umbra-purple/50 focus-ring"
          title={`Toggle to ${sortDir === "asc" ? "descending" : "ascending"}`}
        >
          {sortDir === "asc" ? "↑" : "↓"}
        </button>
      </div>

      {/* Roster */}
      {sorted.length === 0 ? (
        <EmptyState
          title="No members found"
          description="Try adjusting your filters. The roster may also be empty if tracking hasn't started."
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="data-container hidden md:block">
            <table className="w-full text-left">
              <thead className="data-thead">
                <tr>
                  <th className="data-th font-mono text-micro uppercase tracking-wider text-umbra-muted">#</th>
                  <th className="data-th font-mono text-micro uppercase tracking-wider text-umbra-muted">Member</th>
                  <th className="data-th font-mono text-micro uppercase tracking-wider text-umbra-muted">TH</th>
                  <th className="data-th font-mono text-micro uppercase tracking-wider text-umbra-muted">Trophies</th>
                  <th className="data-th font-mono text-micro uppercase tracking-wider text-umbra-muted">Donations</th>
                  <th className="data-th font-mono text-micro uppercase tracking-wider text-umbra-muted">Last Seen</th>
                  <th className="data-th font-mono text-micro uppercase tracking-wider text-umbra-muted">Wars</th>
                  <th className="data-th font-mono text-micro uppercase tracking-wider text-umbra-muted">War</th>
                </tr>
              </thead>
              <tbody className="data-tbody">
                {sorted.map((m) => (
                  <MemberRowDesktop
                    key={m.playerTag}
                    member={m}
                    onSelect={handleMemberClick}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-2 md:hidden">
            {sorted.map((m) => (
              <MemberRowMobile
                key={m.playerTag}
                member={m}
                onSelect={handleMemberClick}
              />
            ))}
          </div>
        </>
      )}

      {/* Member detail sheet (fetched on click — fix A-3) */}
      {activeSelectedTag && detailError && (
        <div className="mt-4 rounded-lg border border-red-400/30 bg-red-400/5 px-4 py-3 text-sm text-red-300">
          Failed to load member: {detailError}
        </div>
      )}
      {activeSelectedTag && detailLoading && !selectedDetail && (
        <div className="mt-4 flex items-center justify-center gap-3 rounded-lg border border-umbra-line bg-white/[.02] px-4 py-6">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-umbra-purple border-t-transparent" />
          <span className="text-sm text-umbra-muted">Loading member…</span>
        </div>
      )}
      {activeSelectedTag && selectedDetail && (
        <MemberDetailSheet
          detail={selectedDetail}
          onClose={() => handleMemberClick(null)}
        />
      )}
    </section>
  );
}

/** Role sort order — leader > coLeader > admin > member */
function roleOrder(role: string): number {
  switch (role) {
    case "leader":
      return 0;
    case "coLeader":
      return 1;
    case "admin":
      return 2;
    default:
      return 3;
  }
}

/**
 * fix §5 + §6.6 (docs/2026-09-10 assessment): the roster rows are memoized —
 * typing in the search box re-rendered ~50 rows × 2 markups on every keystroke;
 * React.memo keeps row DOM stable when its props (member, handler) are
 * unchanged. The desktop row is also fully keyboard-operable (Enter/Space open
 * the member sheet) with an accessible name — previously it was click-only,
 * which locked keyboard users out of member details entirely.
 */
const MemberRowDesktop = memo(function MemberRowDesktop({
  member: m,
  onSelect,
}: {
  member: MemberRosterEntry;
  onSelect: (tag: string | null) => void;
}) {
  return (
    <tr
      tabIndex={0}
      role="button"
      aria-label={`Open details for ${m.name}`}
      onClick={() => onSelect(m.playerTag)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(m.playerTag);
        }
      }}
      className="cursor-pointer data-tr focus-ring"
    >
      {/* Rank */}
      <td className="data-td font-mono text-xs text-umbra-muted">
        {m.clanRank ?? "—"}
      </td>
      {/* Member — icon + name + tag + role */}
      <td className="data-td">
        <div className="flex items-center gap-3">
          {m.leagueTier?.iconUrls?.small && (
            <Image
              src={m.leagueTier.iconUrls.small}
              alt=""
              width={28}
              height={28}
              className="h-7 w-7 shrink-0"
            />
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium text-umbra-lilac">{m.name}</p>
            <div className="flex items-center gap-1.5 font-mono text-2xs text-umbra-muted">
              {m.playerTag} · <span>{formatRole(m.role)}</span>
            </div>
          </div>
        </div>
      </td>
      {/* TH */}
      <td className="data-td">
        <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-lg bg-umbra-purple/15 px-1.5 font-mono text-sm font-bold text-umbra-purple">
          {m.townHallLevel ?? "—"}
        </span>
      </td>
      {/* Trophies */}
      <td className="data-td font-mono text-sm text-white">
        {m.trophies ?? "—"}
        {m.leagueTier?.name && (
          <span className="ml-1 text-label text-umbra-muted">
            {m.leagueTier.name}
          </span>
        )}
      </td>
      {/* Donations */}
      <td className="data-td">
        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="text-emerald-400" aria-hidden="true">
            ↑{m.currentDonations ?? 0}
          </span>
          <span className="text-umbra-muted" aria-hidden="true">
            ↓{m.currentDonationsReceived ?? 0}
          </span>
          <span className="sr-only">
            {m.currentDonations ?? 0} donated, {m.currentDonationsReceived ?? 0} received
          </span>
        </div>
      </td>
      {/* Activity */}
      <td className="data-td">
        <ActivityIndicator isActive={m.isActive} lastActive={m.lastActiveAt} />
      </td>
      {/* Wars — attended / tracked (X out of Y = how many you participated in) */}
      <td className="data-td font-mono text-xs text-white">
        {m.warsTracked > 0 ? (
          <span>
            <span className={m.warsMissed > 0 ? "text-amber-400" : "text-emerald-400"}>
              {m.warsTracked - m.warsMissed}
            </span>
            <span className="text-umbra-muted">/{m.warsTracked}</span>
          </span>
        ) : (
          <span className="text-umbra-muted">—</span>
        )}
      </td>
      {/* War pref */}
      <td className="data-td">
        {m.warPreference && (
          <Badge tone={m.warPreference === "in" ? "success" : "muted"}>
            {m.warPreference}
          </Badge>
        )}
      </td>
    </tr>
  );
});

const MemberRowMobile = memo(function MemberRowMobile({
  member: m,
  onSelect,
}: {
  member: MemberRosterEntry;
  onSelect: (tag: string | null) => void;
}) {
  return (
    <button
      onClick={() => onSelect(m.playerTag)}
      aria-label={`Open details for ${m.name}`}
      className="flex w-full items-center gap-3 rounded-lg border border-umbra-line bg-white/[.03] p-3 text-left transition hover:bg-white/[.04] focus-ring"
    >
      {m.leagueTier?.iconUrls?.small && (
        <Image
          src={m.leagueTier.iconUrls.small}
          alt=""
          width={36}
          height={36}
          className="h-9 w-9 shrink-0"
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-umbra-lilac">{m.name}</p>
          {/* Activity dot for compact view */}
          <ActivityDot isActive={m.isActive} lastActive={m.lastActiveAt} />
        </div>
        <p className="font-mono text-label text-umbra-muted">
          TH{m.townHallLevel} · <span>{formatRole(m.role)}</span>
        </p>
        <p className="font-mono text-label text-umbra-muted">
          <span aria-hidden="true">
            ↑{m.currentDonations ?? 0} ↓{m.currentDonationsReceived ?? 0}
          </span>
          <span className="sr-only">
            {m.currentDonations ?? 0} donated, {m.currentDonationsReceived ?? 0} received
          </span>
          {m.warsTracked > 0 && ` · ${m.warsTracked - m.warsMissed}/${m.warsTracked} wars`}
        </p>
      </div>
      {m.warPreference && (
        <Badge tone={m.warPreference === "in" ? "success" : "muted"}>
          {m.warPreference}
        </Badge>
      )}
    </button>
  );
});


/**
 * fix B-3 (hydration): "today" in the clan timezone is computed AFTER mount
 * (null during SSR + hydration) so the server HTML and first client render
 * always agree. Calling `new Date().toLocaleDateString()` during render made
 * the active-today dot flip colors across Manila midnight between SSR and
 * hydration — a guaranteed DOM mismatch for users in other timezones.
 */
function useClanTodayStr(): string | null {
  const [today, setToday] = useState<string | null>(null);
  useEffect(() => {
    setToday(
      new Date().toLocaleDateString("en-US", { timeZone: "Asia/Manila" }),
    );
  }, []);
  return today;
}

function ActivityIndicator({
  isActive,
  lastActive,
}: {
  isActive: boolean;
  lastActive: Date | null;
}) {
  const todayStr = useClanTodayStr();
  const isRecent =
    todayStr !== null &&
    lastActive !== null &&
    lastActive.toLocaleDateString("en-US", { timeZone: "Asia/Manila" }) ===
      todayStr;

  const colorClass = isActive
    ? isRecent
      ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]"
      : "bg-orange-400 shadow-[0_0_6px_rgba(251,146,60,0.5)]"
    : "bg-umbra-muted/40";

  return (
    <div className="flex items-center gap-2">
      <span className={`h-2 w-2 rounded-full ${colorClass}`} />
      <span className="font-mono text-label text-umbra-muted">
        {lastActive
          ? lastActive.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              timeZone: "Asia/Manila",
            })
          : "—"}
      </span>
    </div>
  );
}

function ActivityDot({
  isActive,
  lastActive,
}: {
  isActive: boolean;
  lastActive: Date | null;
}) {
  const todayStr = useClanTodayStr();
  const isRecent =
    todayStr !== null &&
    lastActive !== null &&
    lastActive.toLocaleDateString("en-US", { timeZone: "Asia/Manila" }) ===
      todayStr;

  const colorClass = isActive
    ? isRecent
      ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]"
      : "bg-orange-400 shadow-[0_0_6px_rgba(251,146,60,0.5)]"
    : "bg-umbra-muted/40";

  return (
    <span className={`h-2 w-2 shrink-0 rounded-full ${colorClass}`} />
  );
}
