"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import type {
  MemberRoster,
  MemberSortField,
  SortDirection,
} from "@/lib/view-models/members";
import { Badge, EmptyState } from "@/components/ui";
import { MemberDetailSheet } from "./member-detail-sheet";
import type { MemberDetailView } from "@/lib/view-models/members";

/**
 * Members roster — client component with sorting, filtering, and member
 * detail sheet. See concept/06-members.md.
 *
 * Design: clean card-based layout with a filter bar, desktop table, and
 * mobile cards. Readable spacing, clear visual hierarchy.
 */
export function MembersRoster({
  roster,
  memberDetails,
}: {
  roster: MemberRoster;
  memberDetails: Record<string, MemberDetailView>;
}) {
  const [sortField, setSortField] = useState<MemberSortField>("clanRank");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");
  const [filterRole, setFilterRole] = useState<string>("");
  const [filterWarPref, setFilterWarPref] = useState<string>("");
  const [filterActiveOnly, setFilterActiveOnly] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

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
  }, [roster.entries, sortField, sortDir, filterRole, filterWarPref, filterActiveOnly]);

  function toggleSort(field: MemberSortField) {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  const selectedDetail = selectedTag ? memberDetails[selectedTag] : null;

  return (
    <div>
      {/* Filter bar */}
      <div className="glass mb-5 flex flex-wrap items-center gap-3 rounded-2xl p-4">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-wider text-umbra-muted">Filter</span>
        </div>
        <FilterSelect
          value={filterRole}
          onChange={setFilterRole}
          options={[
            { value: "", label: "All roles" },
            { value: "leader", label: "Leader" },
            { value: "coLeader", label: "Co-leader" },
            { value: "admin", label: "Admin" },
            { value: "member", label: "Member" },
          ]}
        />
        <FilterSelect
          value={filterWarPref}
          onChange={setFilterWarPref}
          options={[
            { value: "", label: "All war pref" },
            { value: "in", label: "In" },
            { value: "out", label: "Out" },
          ]}
        />
        <label className="flex cursor-pointer items-center gap-2 text-xs text-umbra-lilac">
          <input
            type="checkbox"
            checked={filterActiveOnly}
            onChange={(e) => setFilterActiveOnly(e.target.checked)}
            className="h-3.5 w-3.5 accent-umbra-purple"
          />
          Active only
        </label>
        <div className="ml-auto flex items-center gap-2">
          <span className="font-mono text-[10px] text-umbra-muted">
            {sorted.length} of {roster.totalMembers}
          </span>
        </div>
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
          <div className="glass hidden overflow-hidden rounded-2xl md:block">
            <table className="w-full text-left">
              <thead className="border-b border-umbra-line bg-white/[.02]">
                <tr>
                  <Th label="#" field="clanRank" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
                  <Th label="Member" field="name" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
                  <Th label="TH" field="townHallLevel" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
                  <Th label="Trophies" field="trophies" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
                  <Th label="Donations" field="donations" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
                  <Th label="Activity" field="activity" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
                  <Th label="Wars" field="warsMissed" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
                  <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-wider text-umbra-muted">War</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-umbra-line/50">
                {sorted.map((m) => (
                  <tr
                    key={m.playerTag}
                    onClick={() => setSelectedTag(m.playerTag)}
                    className="cursor-pointer transition hover:bg-white/[.04] focus-ring"
                  >
                    {/* Rank */}
                    <td className="px-4 py-3 font-mono text-xs text-umbra-muted">
                      {m.clanRank ?? "—"}
                    </td>
                    {/* Member — icon + name + tag + role */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {m.leagueTier?.iconUrls?.small && (
                          <Image
                            src={m.leagueTier.iconUrls.small}
                            alt=""
                            width={28}
                            height={28}
                            className="h-7 w-7 shrink-0"
                            unoptimized
                          />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-umbra-lilac">{m.name}</p>
                          <p className="font-mono text-[10px] text-umbra-muted">
                            {m.playerTag} · <span className="capitalize">{m.role}</span>
                          </p>
                        </div>
                      </div>
                    </td>
                    {/* TH */}
                    <td className="px-4 py-3">
                      <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-md bg-umbra-purple/15 px-1.5 font-mono text-sm font-bold text-umbra-purple">
                        {m.townHallLevel ?? "—"}
                      </span>
                    </td>
                    {/* Trophies */}
                    <td className="px-4 py-3 font-mono text-sm text-white">
                      {m.trophies ?? "—"}
                      {m.leagueTier?.name && (
                        <span className="ml-1 text-[10px] text-umbra-muted">
                          {m.leagueTier.name}
                        </span>
                      )}
                    </td>
                    {/* Donations */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 font-mono text-xs">
                        <span className="text-emerald-400">↑{m.currentDonations ?? 0}</span>
                        <span className="text-umbra-muted">↓{m.currentDonationsReceived ?? 0}</span>
                      </div>
                    </td>
                    {/* Activity */}
                    <td className="px-4 py-3">
                      <ActivityIndicator isActive={m.isActive} lastActive={m.lastActiveAt} />
                    </td>
                    {/* Wars */}
                    <td className="px-4 py-3 font-mono text-xs text-white">
                      {m.warsTracked > 0 ? (
                        <span>
                          <span className={m.warsMissed > 0 ? "text-amber-400" : "text-emerald-400"}>
                            {m.warsMissed}
                          </span>
                          <span className="text-umbra-muted">/{m.warsTracked}</span>
                        </span>
                      ) : (
                        <span className="text-umbra-muted">—</span>
                      )}
                    </td>
                    {/* War pref */}
                    <td className="px-4 py-3">
                      {m.warPreference && (
                        <Badge tone={m.warPreference === "in" ? "success" : "muted"}>
                          {m.warPreference}
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-2 md:hidden">
            {sorted.map((m) => (
              <button
                key={m.playerTag}
                onClick={() => setSelectedTag(m.playerTag)}
                className="glass flex w-full items-center gap-3 rounded-xl p-3 text-left transition hover:bg-white/[.04] focus-ring"
              >
                {m.leagueTier?.iconUrls?.small && (
                  <Image
                    src={m.leagueTier.iconUrls.small}
                    alt=""
                    width={36}
                    height={36}
                    className="h-9 w-9 shrink-0"
                    unoptimized
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-umbra-lilac">{m.name}</p>
                    <ActivityDot isActive={m.isActive} />
                  </div>
                  <p className="font-mono text-[10px] text-umbra-muted">
                    TH{m.townHallLevel} · <span className="capitalize">{m.role}</span>
                  </p>
                  <p className="font-mono text-[10px] text-umbra-muted">
                    ↑{m.currentDonations ?? 0} ↓{m.currentDonationsReceived ?? 0}
                    {m.warsTracked > 0 && ` · ${m.warsMissed}/${m.warsTracked} missed`}
                  </p>
                </div>
                {m.warPreference && (
                  <Badge tone={m.warPreference === "in" ? "success" : "muted"}>
                    {m.warPreference}
                  </Badge>
                )}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Member detail sheet */}
      {selectedTag && selectedDetail && (
        <MemberDetailSheet
          detail={selectedDetail}
          onClose={() => setSelectedTag(null)}
        />
      )}
    </div>
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

function Th({
  label,
  field,
  sortField,
  sortDir,
  onSort,
}: {
  label: string;
  field: MemberSortField;
  sortField: MemberSortField;
  sortDir: SortDirection;
  onSort: (field: MemberSortField) => void;
}) {
  const active = sortField === field;
  return (
    <th
      className="cursor-pointer px-4 py-3 font-mono text-[9px] uppercase tracking-wider text-umbra-muted transition hover:text-umbra-lilac"
      onClick={() => onSort(field)}
    >
      <span className={active ? "text-umbra-purple" : ""}>
        {label}
        {active && (sortDir === "asc" ? " ↑" : " ↓")}
      </span>
    </th>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-umbra-line bg-umbra-ink/60 px-3 py-1.5 text-xs text-umbra-lilac transition focus:border-umbra-purple/50 focus:outline-none"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function ActivityIndicator({
  isActive,
  lastActive,
}: {
  isActive: boolean;
  lastActive: Date | null;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`h-2 w-2 rounded-full ${
          isActive
            ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]"
            : "bg-umbra-muted/40"
        }`}
      />
      <span className="font-mono text-[10px] text-umbra-muted">
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

function ActivityDot({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={`h-2 w-2 shrink-0 rounded-full ${
        isActive
          ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]"
          : "bg-umbra-muted/40"
      }`}
    />
  );
}
