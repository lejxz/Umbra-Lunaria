"use client";

/**
 * PlannerShell — the interactive war roster builder.
 *
 * Two-panel layout (concept/09 §"Manual roster builder"):
 *   - Left: available members (searchable, filterable, draggable).
 *   - Right: selected lineup (ordered map-position slots, draggable, reorderable).
 *   - Top: war-size selector + draft summary + finalize (Phase 2.2 wiring).
 *
 * Interactions:
 *   - Desktop: @dnd-kit drag-and-drop. Pool→slot, slot→pool, slot↔slot swap.
 *   - Mobile: tap "+" on a member to add to the next free slot; tap "×" on a
 *     slot to remove; up/down arrows to reorder.
 *
 * Draft state is local (client) for Phase 2.1. Step 2.2 will persist drafts
 * via /api/rosters. Opening the shared MemberDetailSheet is a modal overlay,
 * so draft state is never lost.
 */

import { useMemo, useState, useCallback } from "react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useDraggable,
  useDroppable,
  DragOverlay,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { PageScaffold } from "@/components/page-scaffold";
import { MemberDetailSheet } from "@/components/dashboard/member-detail-sheet";
import { Modal } from "@/components/ui/modal";
import {
  IconGrip,
  IconPlus,
  IconX,
  IconChevronUp,
  IconChevronDown,
  IconSearch,
  IconSwords,
  IconAlert,
  IconSave,
  IconCheck,
} from "@/components/ui/icons";
import { WAR_SIZES, type WarSize, type LineupSlot, type PlanningContext } from "@/lib/planning/types";
import { PrepContext } from "@/components/planning/prep-context";

// Parsed drag ids — "pool:<tag>" or "slot:<pos>".
function parseDragId(id: string): { kind: "pool" | "slot"; value: string } | null {
  if (id.startsWith("pool:")) return { kind: "pool", value: id.slice(5) };
  if (id.startsWith("slot:")) return { kind: "slot", value: id.slice(5) };
  return null;
}

export function PlannerShell({ context }: { context: PlanningContext }) {
  const { members, prepWar, minWarsForConfidentRanking } = context;

  // Default war size: the prep war's team size if present, else 10 (smallest).
  const initialSize: WarSize = (WAR_SIZES as readonly number[]).includes(
    prepWar?.teamSize ?? 10,
  )
    ? (prepWar!.teamSize as WarSize)
    : 10;

  const [warSize, setWarSize] = useState<WarSize>(initialSize);
  const [slots, setSlots] = useState<LineupSlot[]>(() =>
    Array.from({ length: initialSize }, (_, i) => ({ position: i + 1, playerTag: null })),
  );
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [warPrefFilter, setWarPrefFilter] = useState<"all" | "in" | "out">("all");
  const [pendingSize, setPendingSize] = useState<WarSize | null>(null);
  const [savedToast, setSavedToast] = useState(false);

  const memberByTag = useMemo(() => {
    const map = new Map<string, (typeof members)[number]>();
    for (const m of members) map.set(m.playerTag, m);
    return map;
  }, [members]);

  const selectedTags = useMemo(
    () => new Set(slots.map((s) => s.playerTag).filter((t): t is string => t !== null)),
    [slots],
  );

  // ── Filtering ────────────────────────────────────────────────────────────
  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members.filter((m) => {
      if (warPrefFilter !== "all" && m.warPreference !== warPrefFilter) return false;
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) ||
        m.role.toLowerCase().includes(q) ||
        m.playerTag.toLowerCase().includes(q)
      );
    });
  }, [members, search, warPrefFilter]);

  // ── Slot mutations ───────────────────────────────────────────────────────
  const fillCount = slots.filter((s) => s.playerTag !== null).length;

  const addMemberToFirstFreeSlot = useCallback(
    (tag: string) => {
      setSlots((prev) => {
        const freeIdx = prev.findIndex((s) => s.playerTag === null);
        if (freeIdx === -1) return prev; // lineup full — caller should disable.
        const next = prev.slice();
        next[freeIdx] = { ...next[freeIdx]!, playerTag: tag };
        return next;
      });
    },
    [],
  );

  const removeMemberFromSlot = useCallback((position: number) => {
    setSlots((prev) =>
      prev.map((s) => (s.position === position ? { ...s, playerTag: null } : s)),
    );
  }, []);

  const swapSlots = useCallback((posA: number, posB: number) => {
    if (posA === posB) return;
    setSlots((prev) => {
      const a = prev.find((s) => s.position === posA);
      const b = prev.find((s) => s.position === posB);
      if (!a || !b) return prev;
      return prev.map((s) => {
        if (s.position === posA) return { ...s, playerTag: b.playerTag };
        if (s.position === posB) return { ...s, playerTag: a.playerTag };
        return s;
      });
    });
  }, []);

  // ── War size change with truncation warning ──────────────────────────────
  const applySizeChange = useCallback(
    (next: WarSize) => {
      const filled = slots.filter((s) => s.playerTag !== null).length;
      if (next < warSize && filled > next) {
        // Would truncate — ask before applying.
        setPendingSize(next);
        return;
      }
      setWarSize(next);
      setSlots(
        Array.from({ length: next }, (_, i) => ({
          position: i + 1,
          playerTag: slots[i]?.playerTag ?? null,
        })),
      );
    },
    [warSize, slots],
  );

  const confirmTruncate = useCallback(() => {
    if (!pendingSize) return;
    const next = pendingSize;
    setWarSize(next);
    setSlots(
      Array.from({ length: next }, (_, i) => ({
        position: i + 1,
        playerTag: slots[i]?.playerTag ?? null,
      })),
    );
    setPendingSize(null);
  }, [pendingSize, slots]);

  // ── DnD sensors ──────────────────────────────────────────────────────────
  // Activation distance prevents drag from hijacking tap/click on touch.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const [activeTag, setActiveTag] = useState<string | null>(null);

  const onDragStart = useCallback((e: DragStartEvent) => {
    const parsed = parseDragId(String(e.active.id));
    if (parsed?.kind === "pool") setActiveTag(parsed.value);
    else if (parsed?.kind === "slot") {
      const pos = Number(parsed.value);
      setActiveTag(
        slots.find((s) => s.position === pos)?.playerTag ?? null,
      );
    }
  }, [slots]);

  const onDragEnd = useCallback((e: DragEndEvent) => {
    setActiveTag(null);
    const { active, over } = e;
    if (!over) return;
    const a = parseDragId(String(active.id));
    const o = parseDragId(String(over.id));
    if (!a || !o) return;

    if (a.kind === "pool" && o.kind === "pool") return; // dropped back in pool

    if (a.kind === "pool" && o.kind === "slot") {
      const tag = a.value;
      const targetPos = Number(o.value);
      setSlots((prev) => {
        const next = prev.slice();
        const targetIdx = next.findIndex((s) => s.position === targetPos);
        if (targetIdx === -1) return prev;
        // If member was somehow already in another slot, clear that slot first.
        for (let i = 0; i < next.length; i++) {
          if (next[i]!.playerTag === tag) next[i] = { ...next[i]!, playerTag: null };
        }
        // Displaced occupant (if any) goes back to pool — i.e. just overwritten.
        next[targetIdx] = { ...next[targetIdx]!, playerTag: tag };
        return next;
      });
      return;
    }

    if (a.kind === "slot" && o.kind === "pool") {
      // Remove from the source slot.
      const srcPos = Number(a.value);
      setSlots((prev) =>
        prev.map((s) => (s.position === srcPos ? { ...s, playerTag: null } : s)),
      );
      return;
    }

    if (a.kind === "slot" && o.kind === "slot") {
      const srcPos = Number(a.value);
      const dstPos = Number(o.value);
      swapSlots(srcPos, dstPos);
      return;
    }
  }, [swapSlots]);

  // ── "Save draft" — Phase 2.1 stub (no persistence yet) ────────────────────
  const saveDraft = useCallback(() => {
    // Phase 2.2 will POST to /api/rosters here. For now, surface a local
    // confirmation so the button isn't a dead control.
    setSavedToast(true);
    window.setTimeout(() => setSavedToast(false), 2500);
  }, []);

  const activeMember = activeTag ? memberByTag.get(activeTag) ?? null : null;

  return (
    <PageScaffold
      section="Planning"
      title="War planning"
      description="Assemble the next war roster. Drag members between panels on desktop, or tap to add and remove on mobile."
    >
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        {/* ── Control bar ──────────────────────────────────────────────────── */}
        <section className="glass mb-5 flex flex-wrap items-center gap-4 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <label
              htmlFor="war-size"
              className="font-mono text-label uppercase tracking-[.16em] text-umbra-muted"
            >
              War size
            </label>
            <select
              id="war-size"
              value={warSize}
              onChange={(e) => applySizeChange(Number(e.target.value) as WarSize)}
              className="select-input min-w-[5.5rem]"
            >
              {WAR_SIZES.map((s) => (
                <option key={s} value={s}>
                  {s}v{s}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 font-mono text-label uppercase tracking-wider text-umbra-muted">
            <IconSwords className="h-3.5 w-3.5" aria-hidden />
            <span>
              {fillCount}/{warSize} filled
            </span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={saveDraft}
              disabled={fillCount === 0}
              className="focus-ring inline-flex items-center gap-1.5 rounded-full border border-umbra-purple/40 bg-umbra-purple/10 px-4 py-2 font-mono text-label uppercase tracking-wider text-umbra-purple transition hover:border-umbra-purple/60 hover:bg-umbra-purple/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {savedToast ? <IconCheck className="h-3.5 w-3.5" /> : <IconSave className="h-3.5 w-3.5" />}
              {savedToast ? "Saved locally" : "Save draft"}
            </button>
          </div>
        </section>

        {/* ── Two-panel layout ──────────────────────────────────────────────── */}
        <div className="grid gap-5 lg:grid-cols-[1fr_minmax(22rem,28rem)]">
          <AvailableMembersPanel
            members={filteredMembers}
            totalCount={members.length}
            selectedTags={selectedTags}
            warSize={warSize}
            fillCount={fillCount}
            minWarsForConfidentRanking={minWarsForConfidentRanking}
            search={search}
            onSearch={setSearch}
            warPrefFilter={warPrefFilter}
            onWarPrefFilter={setWarPrefFilter}
            onAdd={addMemberToFirstFreeSlot}
            onMemberClick={setSelectedMember}
          />
          <SelectedLineupPanel
            slots={slots}
            memberByTag={memberByTag}
            onRemove={removeMemberFromSlot}
            onReorder={swapSlots}
            onMemberClick={setSelectedMember}
          />
        </div>

        <DragOverlay>
          {activeMember ? (
            <DragPreview name={activeMember.name} th={activeMember.townHallLevel} />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* ── Prep-day opponent context ────────────────────────────────────── */}
      {prepWar && <PrepContext prepWar={prepWar} />}

      {/* ── Shared member detail sheet (lazy fetch) ──────────────────────── */}
      <MemberDetailSheet
        playerTag={selectedMember}
        onClose={() => setSelectedMember(null)}
      />

      {/* ── Truncation confirm dialog ────────────────────────────────────── */}
      {pendingSize !== null && (
        <Modal
          open
          onClose={() => setPendingSize(null)}
          aria-labelledby="truncate-title"
        >
          <div className="p-6">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 rounded-full bg-amber-400/15 p-2 text-amber-300">
                <IconAlert className="h-5 w-5" />
              </span>
              <div>
                <h2 id="truncate-title" className="font-display text-lg text-umbra-lilac">
                  Shrink to {pendingSize}v{pendingSize}?
                </h2>
                <p className="mt-2 text-sm leading-6 text-umbra-muted">
                  The current lineup has {fillCount} members selected. Shrinking to{" "}
                  {pendingSize}v{pendingSize} will drop the{" "}
                  {Math.max(0, fillCount - pendingSize)} highest-position members back
                  into the available pool.
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingSize(null)}
                className="focus-ring rounded-full border border-umbra-line px-4 py-2 font-mono text-label uppercase tracking-wider text-umbra-muted transition hover:text-umbra-lilac"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmTruncate}
                className="focus-ring rounded-full border border-amber-400/40 bg-amber-400/10 px-4 py-2 font-mono text-label uppercase tracking-wider text-amber-300 transition hover:bg-amber-400/20"
              >
                Shrink &amp; drop tail
              </button>
            </div>
          </div>
        </Modal>
      )}
    </PageScaffold>
  );
}

// ---------------------------------------------------------------------------
// DragPreview — compact card shown under the cursor during a drag.
// ---------------------------------------------------------------------------

/** Compact drag preview shown under the cursor while dragging. */
function DragPreview({ name, th }: { name: string; th: number | null }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-umbra-purple/60 bg-umbra-elevated px-3 py-2 shadow-glow">
      <ThBadge th={th} />
      <span className="text-sm font-medium text-umbra-lilac">{name}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Available members panel
// ---------------------------------------------------------------------------

interface AvailableMembersPanelProps {
  members: PlanningContext["members"];
  totalCount: number;
  selectedTags: Set<string>;
  warSize: WarSize;
  fillCount: number;
  minWarsForConfidentRanking: number;
  search: string;
  onSearch: (v: string) => void;
  warPrefFilter: "all" | "in" | "out";
  onWarPrefFilter: (v: "all" | "in" | "out") => void;
  onAdd: (tag: string) => void;
  onMemberClick: (tag: string) => void;
}

function AvailableMembersPanel(props: AvailableMembersPanelProps) {
  const { setNodeRef } = useDroppable({ id: "pool" });
  return (
    <section className="glass flex flex-col rounded-2xl">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-umbra-line p-4">
        <div>
          <p className="font-mono text-label uppercase tracking-[.16em] text-umbra-purple">
            Available roster
          </p>
          <p className="mt-1 text-xs text-umbra-muted">
            {props.members.length} of {props.totalCount} members shown
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <IconSearch
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-umbra-muted"
              aria-hidden
            />
            <input
              type="search"
              value={props.search}
              onChange={(e) => props.onSearch(e.target.value)}
              placeholder="Search name, role, tag"
              className="w-44 rounded-full border border-umbra-line bg-umbra-ink/60 py-1.5 pl-8 pr-3 text-sm text-umbra-lilac placeholder:text-umbra-muted focus:outline-none focus:ring-1 focus:ring-umbra-purple/50 sm:w-56"
            />
          </div>
          <select
            value={props.warPrefFilter}
            onChange={(e) =>
              props.onWarPrefFilter(e.target.value as "all" | "in" | "out")
            }
            className="select-input min-w-[5rem]"
            aria-label="Filter by war preference"
          >
            <option value="all">All</option>
            <option value="in">In</option>
            <option value="out">Out</option>
          </select>
        </div>
      </header>
      <div
        ref={setNodeRef}
        className="max-h-[36rem] overflow-y-auto p-3"
        style={{ scrollbarGutter: "stable" }}
      >
        {props.members.length === 0 ? (
          <p className="px-2 py-8 text-center text-sm text-umbra-muted">
            No members match the current filter.
          </p>
        ) : (
          <ul className="space-y-2">
            {props.members.map((m) => (
              <AvailableMemberRow
                key={m.playerTag}
                member={m}
                selected={props.selectedTags.has(m.playerTag)}
                lineupFull={props.fillCount >= props.warSize}
                onAdd={props.onAdd}
                onClick={props.onMemberClick}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

interface AvailableMemberRowProps {
  member: PlanningContext["members"][number];
  selected: boolean;
  lineupFull: boolean;
  onAdd: (tag: string) => void;
  onClick: (tag: string) => void;
}

function AvailableMemberRow({
  member,
  selected,
  lineupFull,
  onAdd,
  onClick,
}: AvailableMemberRowProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `pool:${member.playerTag}`,
  });
  const style = {
    transform: transform ? CSS.Translate.toString(transform) : undefined,
    opacity: isDragging ? 0.4 : 1,
  };

  const optedOut = member.warPreference === "out";

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-3 rounded-xl border p-2.5 transition ${
        optedOut
          ? "border-umbra-line/40 bg-umbra-surface/20 opacity-70"
          : "border-umbra-line bg-umbra-surface/40 hover:border-umbra-purple/40 hover:bg-umbra-elevated/60"
      } ${selected ? "ring-1 ring-umbra-purple/40" : ""}`}
    >
      <button
        type="button"
        {...listeners}
        {...attributes}
        className="cursor-grab text-umbra-muted transition hover:text-umbra-lilac active:cursor-grabbing"
        aria-label={`Drag ${member.name}`}
        title="Drag to lineup"
      >
        <IconGrip className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onClick(member.playerTag)}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <ThBadge th={member.townHallLevel} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-umbra-lilac">
              {member.name}
            </span>
            {optedOut && (
              <span className="rounded-full bg-umbra-line/30 px-1.5 py-0.5 font-mono text-[0.6rem] uppercase tracking-wider text-umbra-muted">
                Out
              </span>
            )}
          </span>
          <span className="mt-0.5 flex items-center gap-2 text-xs text-umbra-muted">
            <span>{member.role}</span>
            <span aria-hidden>·</span>
            <ActivityCue
              isActive={member.isActive}
              lastActiveAt={member.lastActiveAt}
            />
          </span>
        </span>
      </button>
      <div className="flex flex-col items-end gap-1">
        <button
          type="button"
          onClick={() => onAdd(member.playerTag)}
          disabled={selected || lineupFull}
          className="focus-ring inline-flex items-center gap-1 rounded-full border border-umbra-purple/30 bg-umbra-purple/10 px-2.5 py-1 font-mono text-[0.65rem] uppercase tracking-wider text-umbra-purple transition hover:border-umbra-purple/60 hover:bg-umbra-purple/20 disabled:cursor-not-allowed disabled:opacity-30"
          title={
            selected
              ? "Already in lineup"
              : lineupFull
                ? "Lineup full"
                : "Add to next free slot"
          }
          aria-label={`Add ${member.name} to lineup`}
        >
          <IconPlus className="h-3 w-3" />
          Add
        </button>
        {member.limitedData && (
          <span className="font-mono text-[0.6rem] uppercase tracking-wider text-amber-300/80">
            Limited data
          </span>
        )}
      </div>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Selected lineup panel
// ---------------------------------------------------------------------------

interface SelectedLineupPanelProps {
  slots: LineupSlot[];
  memberByTag: Map<string, PlanningContext["members"][number]>;
  onRemove: (position: number) => void;
  onReorder: (posA: number, posB: number) => void;
  onMemberClick: (tag: string) => void;
}

function SelectedLineupPanel({
  slots,
  memberByTag,
  onRemove,
  onReorder,
  onMemberClick,
}: SelectedLineupPanelProps) {
  return (
    <section className="glass flex flex-col rounded-2xl">
      <header className="flex items-center justify-between border-b border-umbra-line p-4">
        <div>
          <p className="font-mono text-label uppercase tracking-[.16em] text-umbra-purple">
            Selected lineup
          </p>
          <p className="mt-1 text-xs text-umbra-muted">
            Drag to reorder · tap × to remove
          </p>
        </div>
      </header>
      <div className="max-h-[36rem] overflow-y-auto p-3">
        <ol className="space-y-2">
          {slots.map((slot, idx) => (
            <LineupSlotRow
              key={slot.position}
              slot={slot}
              member={slot.playerTag ? memberByTag.get(slot.playerTag) ?? null : null}
              isFirst={idx === 0}
              isLast={idx === slots.length - 1}
              onRemove={onRemove}
              onReorder={onReorder}
              onMemberClick={onMemberClick}
            />
          ))}
        </ol>
      </div>
    </section>
  );
}

interface LineupSlotRowProps {
  slot: LineupSlot;
  member: PlanningContext["members"][number] | null;
  isFirst: boolean;
  isLast: boolean;
  onRemove: (position: number) => void;
  onReorder: (posA: number, posB: number) => void;
  onMemberClick: (tag: string) => void;
}

function LineupSlotRow({
  slot,
  member,
  isFirst,
  isLast,
  onRemove,
  onReorder,
  onMemberClick,
}: LineupSlotRowProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `slot:${slot.position}`,
    // Only occupied slots are draggable (empty slots are drop targets only).
    disabled: member === null,
  });
  const { setNodeRef: dropRef, isOver } = useDroppable({
    id: `slot:${slot.position}`,
  });
  const style = {
    transform: transform ? CSS.Translate.toString(transform) : undefined,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <li
      ref={(node) => {
        setNodeRef(node);
        dropRef(node);
      }}
      style={style}
      className={`flex items-center gap-3 rounded-xl border p-2.5 transition ${
        member
          ? "border-umbra-line bg-umbra-surface/40"
          : "border-dashed border-umbra-line/50 bg-transparent"
      } ${isOver ? "ring-1 ring-umbra-purple/60" : ""}`}
    >
      <span className="w-6 shrink-0 text-center font-mono text-sm font-semibold text-umbra-muted">
        {slot.position}
      </span>
      {member ? (
        <>
          <button
            type="button"
            {...listeners}
            {...attributes}
            className="cursor-grab text-umbra-muted transition hover:text-umbra-lilac active:cursor-grabbing"
            aria-label={`Drag ${member.name} from position ${slot.position}`}
            title="Drag to reorder or back to pool"
          >
            <IconGrip className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onMemberClick(member.playerTag)}
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
          >
            <ThBadge th={member.townHallLevel} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-umbra-lilac">
                {member.name}
              </span>
              <span className="mt-0.5 block text-xs text-umbra-muted">
                TH {member.townHallLevel ?? "—"}
                {member.warPreference === "out" && " · opted out"}
              </span>
            </span>
          </button>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => !isFirst && onReorder(slot.position, slot.position - 1)}
              disabled={isFirst}
              className="rounded p-1 text-umbra-muted transition hover:text-umbra-lilac disabled:cursor-not-allowed disabled:opacity-30"
              aria-label={`Move ${member.name} up`}
              title="Move up"
            >
              <IconChevronUp className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => !isLast && onReorder(slot.position, slot.position + 1)}
              disabled={isLast}
              className="rounded p-1 text-umbra-muted transition hover:text-umbra-lilac disabled:cursor-not-allowed disabled:opacity-30"
              aria-label={`Move ${member.name} down`}
              title="Move down"
            >
              <IconChevronDown className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onRemove(slot.position)}
              className="rounded p-1 text-umbra-muted transition hover:text-rose-300"
              aria-label={`Remove ${member.name} from lineup`}
              title="Remove"
            >
              <IconX className="h-3.5 w-3.5" />
            </button>
          </div>
        </>
      ) : (
        <span className="flex-1 py-1 text-sm italic text-umbra-muted/60">
          Empty slot — drag a member here or tap Add.
        </span>
      )}
    </li>
  );
}

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------

/** TH-level pill. Uses a fixed color ramp so higher THs read "heavier". */
function ThBadge({ th }: { th: number | null }) {
  if (th === null) return <span className="th-badge th-unknown">—</span>;
  const tier =
    th >= 14 ? "high" : th >= 11 ? "mid" : th >= 8 ? "low" : "base";
  return <span className={`th-badge th-${tier}`}>TH{th}</span>;
}

/** Inline "active Xd ago" / "inactive" cue. */
function ActivityCue({
  isActive,
  lastActiveAt,
}: {
  isActive: boolean;
  lastActiveAt: string | null;
}) {
  if (!lastActiveAt) return <span>Inactive</span>;
  const days = Math.floor((Date.now() - new Date(lastActiveAt).getTime()) / 86_400_000);
  const label =
    days < 1 ? "today" : days === 1 ? "1d ago" : `${days}d ago`;
  return (
    <span className={isActive ? "text-emerald-300/80" : "text-umbra-muted/70"}>
      {isActive ? "Active " : "Inactive "}
      {label}
    </span>
  );
}
