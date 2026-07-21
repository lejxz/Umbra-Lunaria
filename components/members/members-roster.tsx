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

    // Filters
    if (filterRole) {
      result = result.filter((m) => m.role === filterRole);
    }
    if (filterWarPref) {
      result = result.filter((m) => m.warPreference === filterWarPref);
    }
    if (filterActiveOnly) {
      result = result.filter((m) => m.isActive);
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "role":
          cmp = a.role.localeCompare(b.role);
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
            (a.lastActiveAt?.getTime() ?? 0) -
            (b.lastActiveAt?.getTime() ?? 0);
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
        <FilterSelect
          label="Role"
          value={filterRole}
          onChange={setFilterRole}
          options={[
            { value: "", label: "All" },
            { value: "leader", label: "Leader" },
            { value: "coLeader", label: "Co-leader" },
            { value: "admin", label: "Admin" },
            { value: "member", label: "Member" },
          ]}
        />
        <FilterSelect
          label="War pref"
          value={filterWarPref}
          onChange={setFilterWarPref}
          options={[
            { value: "", label: "All" },
            { value: "in", label: "In" },
            { value: "out", label: "Out" },
          ]}
        />
        <label className="flex items-center gap-2 text-xs text-umbra-muted">
          <input
            type="checkbox"
            checked={filterActiveOnly}
            onChange={(e) => setFilterActiveOnly(e.target.checked)}
            className="h-3.5 w-3.5 accent-umbra-purple"
          />
          Active only
        </label>
        <span className="ml-auto font-mono text-[10px] text-umbra-muted">
          {sorted.length} / {roster.totalMembers} members
        </span>
      </div>

      {/* Roster table (desktop) / cards (mobile) */}
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
                  <Th label="Name" field="name" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
                  <Th label="Role" field="role" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
                  <Th label="TH" field="townHallLevel" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
                  <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-wider text-umbra-muted">League</th>
                  <Th label="Trophies" field="trophies" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
                  <Th label="Donations" field="donations" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
                  <Th label="Activity" field="activity" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
                  <Th label="Wars missed" field="warsMissed" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
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
                    <td className="px-4 py-3 font-mono text-xs text-umbra-muted">
                      {m.clanRank ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        {m.leagueTier?.iconUrls?.small && (
                          <Image
                            src={m.leagueTier.iconUrls.small}
                            alt=""
                            width={20}
                            height={20}
                            className="h-5 w-5 shrink-0"
                            unoptimized
                          />
                        )}
                        <div>
                          <p className="text-sm text-umbra-lilac">{m.name}</p>
                          <p className="font-mono text-[10px] text-umbra-muted">
                            {m.playerTag}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-umbra-muted capitalize">
                      {m.role}
                    </td>
                    <td className="px-4 py-3 font-mono text-sm text-umbra-purple">
                      {m.townHallLevel ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-umbra-muted">
                      {m.leagueTier?.name ?? m.league?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-sm text-white">
                      {m.trophies ?? "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-white">
                      <span className="text-emerald-400">{m.currentDonations ?? 0}</span>
                      <span className="text-umbra-muted"> / </span>
                      <span className="text-umbra-muted">{m.currentDonationsReceived ?? 0}</span>
                    </td>
                    <td className="px-4 py-3">
                      <ActivityDot isActive={m.isActive} lastActive={m.lastActiveAt} />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-white">
                      {m.warsTracked > 0 ? `${m.warsMissed}/${m.warsTracked}` : "—"}
                    </td>
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
                    width={32}
                    height={32}
                    className="h-8 w-8 shrink-0"
                    unoptimized
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm text-umbra-lilac">{m.name}</p>
                    <ActivityDot isActive={m.isActive} lastActive={m.lastActiveAt} compact />
                  </div>
                  <p className="font-mono text-[10px] text-umbra-muted">
                    TH{m.townHallLevel} · {m.role} · {m.currentDonations ?? 0} given
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
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="flex items-center gap-1.5 text-xs text-umbra-muted">
      <span className="font-mono uppercase tracking-wider">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-umbra-line bg-umbra-ink/60 px-2 py-1 text-xs text-umbra-lilac focus-ring"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ActivityDot({
  isActive,
  lastActive,
  compact,
}: {
  isActive: boolean;
  lastActive: Date | null;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <span
        className={`h-2 w-2 shrink-0 rounded-full ${isActive ? "bg-emerald-400" : "bg-umbra-muted/40"}`}
        title={lastActive ? `Last active ${lastActive.toLocaleDateString()}` : "No activity"}
      />
    );
  }
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`h-2 w-2 rounded-full ${isActive ? "bg-emerald-400" : "bg-umbra-muted/40"}`}
      />
      <span className="font-mono text-[10px] text-umbra-muted">
        {lastActive
          ? lastActive.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "Asia/Manila" })
          : "—"}
      </span>
    </div>
  );
}
