"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { clanConfig } from "@/config/clan.config";
import { CUSTOM_RANGE_MAX_DAYS } from "@/lib/time/windows";
import { Button } from "./button";
import {
  IconCalendar,
  IconChevronLeft,
  IconChevronRight,
} from "./icons";

/**
 * WindowPicker — one control for "which time window is this panel showing".
 *
 * Replaces the old two-control pattern (preset Tabs in the card header + a
 * separate raw date-input row below it). The preset tabs and the custom-range
 * trigger now live in a single pill container, in the exact spot every other
 * card's Tabs occupies — one filter, one placement, no second row.
 *
 * The custom trigger opens a themed range popover (portal-rendered so it
 * floats above neighboring glass cards, with viewport flip-up and
 * scroll/resize tracking): quick ranges, a hand-rolled Umbra-styled month
 * calendar — the native <input type="date"> calendar never matched the dark
 * theme — and an Apply/Clear footer. Built from the shared primitives
 * (Button, focus-ring, umbra tokens) so it reads as part of the same kit as
 * Tabs/Select/Modal.
 *
 * Purely presentational, same contract as the old RangeControl: the owning
 * panel keeps the window state and the /api/analytics fetch; this control
 * only reports preset switches and custom-range intents. Day keys are
 * clan-timezone CALENDAR DAYS ("YYYY-MM-DD") — the same contract as
 * lib/time/windows.ts computeCustomWindow (from ≤ to, `to` not in the
 * future, span ≤ 366 days).
 */

// ── Day-key helpers (clan-timezone calendar days, "YYYY-MM-DD") ───────────

const TZ = clanConfig.timezone;

/** "YYYY-MM-DD" for an instant in the clan timezone (client-side Intl). */
export function dayKeyInTz(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: TZ,
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** First day of the month `offsetMonths` from now (0 = this month). */
function firstOfMonth(offsetMonths: number): string {
  const now = new Date();
  return dayKeyInTz(
    new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offsetMonths, 1, 12, 0, 0)),
  );
}

/** Last day of the month `offsetMonths` from now (0 = this month). */
function lastOfMonth(offsetMonths: number): string {
  const now = new Date();
  return dayKeyInTz(
    new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offsetMonths + 1, 0, 12, 0, 0),
    ),
  );
}

/** Day key `days` days before today (inclusive span of `days` days). */
function daysAgoKey(days: number): string {
  const now = new Date();
  return dayKeyInTz(new Date(now.getTime() - days * 86_400_000));
}

function parseDayKey(key: string): { y: number; m: number; d: number } {
  const [y = 0, m = 1, d = 1] = key.split("-").map(Number);
  return { y, m: m - 1, d };
}

function makeDayKey(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Inclusive calendar days between two day keys. */
function dayCount(from: string, to: string): number {
  const f = parseDayKey(from);
  const t = parseDayKey(to);
  return Math.round((Date.UTC(t.y, t.m, t.d) - Date.UTC(f.y, f.m, f.d)) / 86_400_000) + 1;
}

const shortDay = (key: string) => {
  const { y, m, d } = parseDayKey(key);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m, d)));
};

/** "Jul 1 – Jul 31" — full form (list headers, section labels). */
export function formatRange(from: string, to: string): string {
  return `${shortDay(from)} – ${shortDay(to)}`;
}

/** Compact trigger form: "Jul 1–31" / "Aug 28 – Sep 15" / "Dec 28 – Jan 6, 2027". */
function formatRangeCompact(from: string, to: string): string {
  const f = parseDayKey(from);
  const t = parseDayKey(to);
  if (f.y === t.y && f.m === t.m) {
    return `${shortDay(from)}–${t.d}`;
  }
  if (f.y === t.y) {
    return `${shortDay(from)} – ${shortDay(to)}`;
  }
  const end = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(t.y, t.m, t.d)));
  return `${shortDay(from)} – ${end}`;
}

const monthLabel = (y: number, m: number) =>
  new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m, 1)));

const dayAriaLabel = (y: number, m: number, d: number) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m, d)));

/** y*12+m — total-month index for "is this month before/after that one". */
const monthIndex = (y: number, m: number) => y * 12 + m;

// ── WindowPicker ──────────────────────────────────────────────────────────

export interface WindowPickerPreset {
  value: string;
  label: string;
}

export interface WindowPickerCustomRange {
  status: "idle" | "loading" | "ready" | "error";
  /** Applied ("ready") or in-flight ("loading") range day keys. */
  from?: string;
  to?: string;
  error?: string | null;
}

export function WindowPicker({
  presets,
  activePreset,
  onPresetChange,
  custom,
  onApplyCustom,
  onClearCustom,
  label,
}: {
  presets: WindowPickerPreset[];
  /** Currently selected preset value; null while a custom range is active. */
  activePreset: string | null;
  onPresetChange: (value: string) => void;
  custom: WindowPickerCustomRange;
  onApplyCustom: (from: string, to: string) => void;
  onClearCustom: () => void;
  /** Accessible name for the tablist. */
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const todayKey = useMemo(() => dayKeyInTz(new Date()), []);

  const customActive = custom.status === "loading" || custom.status === "ready";
  const triggerText =
    customActive && custom.from && custom.to
      ? formatRangeCompact(custom.from, custom.to)
      : "Custom";

  // Draft range + visible month — reset every time the popover opens.
  const [draft, setDraft] = useState<{ from: string | null; to: string | null }>({
    from: null,
    to: null,
  });
  const [anchor, setAnchor] = useState(() => {
    const t = parseDayKey(todayKey);
    return { y: t.y, m: t.m };
  });
  const [hoverDay, setHoverDay] = useState<string | null>(null);

  const openPopover = useCallback(() => {
    const hasRange = custom.status === "ready" || custom.status === "loading";
    const from = hasRange ? (custom.from ?? null) : null;
    const to = hasRange ? (custom.to ?? null) : null;
    setDraft({ from, to });
    // Anchor on the range's start month (today for a fresh open) so both
    // endpoints of short ranges are visible; never lead with an all-future
    // month as the second grid.
    const anchorKey = from ?? todayKey;
    const a = parseDayKey(anchorKey);
    const today = parseDayKey(todayKey);
    const twoMonths = typeof window !== "undefined" && window.innerWidth >= 640;
    let y = a.y;
    let m = a.m;
    if (twoMonths && monthIndex(y, m) >= monthIndex(today.y, today.m)) {
      const shifted = new Date(Date.UTC(y, m - 1, 1));
      y = shifted.getUTCFullYear();
      m = shifted.getUTCMonth();
    }
    setAnchor({ y, m });
    setHoverDay(null);
    setOpen(true);
  }, [custom.status, custom.from, custom.to, todayKey]);

  // A range that lands (loading → ready) closes the popover — quick chips
  // and the Apply button both route through this.
  const prevStatus = useRef(custom.status);
  useEffect(() => {
    const prev = prevStatus.current;
    prevStatus.current = custom.status;
    if (open && prev !== "ready" && custom.status === "ready") {
      setOpen(false);
      triggerRef.current?.focus();
    }
  }, [custom.status, open]);

  const closePopover = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  const shiftAnchor = useCallback((delta: number) => {
    setAnchor((a) => {
      const shifted = new Date(Date.UTC(a.y, a.m + delta, 1));
      return { y: shifted.getUTCFullYear(), m: shifted.getUTCMonth() };
    });
  }, []);

  return (
    <div className="relative">
      {/* Pill container — the same visual language as Tabs, with the custom
          range trigger as the final tab. */}
      <div className="flex gap-1 rounded-lg bg-white/5 p-1" role="tablist" aria-label={label}>
        {presets.map((preset, index) => {
          const selected = !customActive && preset.value === activePreset;
          const entry = selected || (!customActive && index === 0);
          return (
            <button
              key={preset.value}
              type="button"
              role="tab"
              aria-selected={selected}
              tabIndex={entry ? 0 : -1}
              onClick={() => onPresetChange(preset.value)}
              onKeyDown={(e) => {
                // Roving arrows within the presets (same pattern as Tabs).
                if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
                e.preventDefault();
                const dir = e.key === "ArrowRight" ? 1 : -1;
                const next = presets[(index + dir + presets.length) % presets.length];
                if (next) onPresetChange(next.value);
              }}
              className={`focus-ring rounded-lg px-3 py-2 text-xs font-semibold transition ${
                selected
                  ? "bg-umbra-purple/20 text-umbra-purple"
                  : "text-umbra-muted hover:text-umbra-lilac"
              }`}
            >
              {preset.label}
            </button>
          );
        })}

        {/* Custom range trigger — opens the calendar popover. */}
        <button
          ref={triggerRef}
          type="button"
          role="tab"
          aria-selected={customActive}
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => (open ? closePopover() : openPopover())}
          className={`focus-ring inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition ${
            customActive
              ? "bg-umbra-purple/20 text-umbra-purple"
              : "text-umbra-muted hover:text-umbra-lilac"
          }`}
        >
          <IconCalendar className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className={custom.status === "loading" ? "animate-pulse" : undefined}>
            {triggerText}
          </span>
        </button>
      </div>

      {open && (
        <RangePopover
          triggerRef={triggerRef}
          todayKey={todayKey}
          draft={draft}
          onDraftChange={setDraft}
          anchor={anchor}
          onShiftAnchor={shiftAnchor}
          hoverDay={hoverDay}
          onHoverDayChange={setHoverDay}
          custom={custom}
          onApply={onApplyCustom}
          onClear={() => {
            onClearCustom();
            closePopover();
          }}
          onClose={closePopover}
        />
      )}
    </div>
  );
}

// ── Range popover (portal-rendered, fixed-positioned) ─────────────────────

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function RangePopover({
  triggerRef,
  todayKey,
  draft,
  onDraftChange,
  anchor,
  onShiftAnchor,
  hoverDay,
  onHoverDayChange,
  custom,
  onApply,
  onClear,
  onClose,
}: {
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  todayKey: string;
  draft: { from: string | null; to: string | null };
  onDraftChange: (draft: { from: string | null; to: string | null }) => void;
  anchor: { y: number; m: number };
  onShiftAnchor: (delta: number) => void;
  hoverDay: string | null;
  onHoverDayChange: (day: string | null) => void;
  custom: WindowPickerCustomRange;
  onApply: (from: string, to: string) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const focusedOnce = useRef(false);
  const [style, setStyle] = useState<CSSProperties | null>(null);
  const [twoMonths, setTwoMonths] = useState(
    () => typeof window !== "undefined" && window.innerWidth >= 640,
  );

  const chips = useMemo(
    () => [
      { label: "This month", from: firstOfMonth(0), to: todayKey },
      { label: "Last month", from: firstOfMonth(-1), to: lastOfMonth(-1) },
      { label: "Last 90d", from: daysAgoKey(89), to: todayKey },
    ],
    [todayKey],
  );

  const loading = custom.status === "loading";

  // Position: right-align with the trigger, flip above it when the viewport
  // has no room below, clamp inside the viewport. Re-run on scroll (capture,
  // so nested scrollers count) and resize.
  const place = useCallback(() => {
    const trigger = triggerRef.current;
    const panel = panelRef.current;
    if (!trigger || !panel) return;
    const rect = trigger.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const margin = 8;
    const width = panel.offsetWidth;
    const height = panel.offsetHeight;
    let top: number;
    if (vh - rect.bottom - margin >= height) {
      top = rect.bottom + margin;
    } else if (rect.top - margin >= height) {
      top = rect.top - margin - height;
    } else {
      top = Math.max(margin, Math.min(vh - height - margin, rect.bottom + margin));
    }
    let left = vw < 640 ? rect.left : rect.right - width;
    left = Math.max(margin, Math.min(left, vw - width - margin));
    setStyle({ top, left });
  }, [triggerRef]);

  useIsomorphicLayoutEffect(() => {
    place();
  }, [place, twoMonths]);

  // Focus the panel once it's actually visible — browsers refuse focus on
  // visibility:hidden elements, so this must run AFTER the position style
  // has landed (the setState in place() flushes synchronously before paint).
  useIsomorphicLayoutEffect(() => {
    if (style && !focusedOnce.current && panelRef.current) {
      focusedOnce.current = true;
      panelRef.current.focus();
    }
  }, [style]);

  useEffect(() => {
    const onScroll = () => place();
    const onResize = () => {
      setTwoMonths(window.innerWidth >= 640);
      place();
    };
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [place]);

  // Click-outside closes (the trigger toggles itself).
  useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      onClose();
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [onClose, triggerRef]);

  // Escape closes; Tab stays trapped inside the popover (same contract as
  // Modal — focus returns to the trigger on close).
  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== "Tab") return;
    const panel = panelRef.current;
    if (!panel) return;
    const focusables = Array.from(
      panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    ).filter((el) => el.offsetParent !== null || el === document.activeElement);
    if (focusables.length === 0) {
      e.preventDefault();
      return;
    }
    const first = focusables[0]!;
    const last = focusables[focusables.length - 1]!;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const onDayClick = (key: string) => {
    if (key > todayKey) return;
    onHoverDayChange(null);
    onDraftChange(
      !draft.from || (draft.from && draft.to)
        ? { from: key, to: null }
        : key < draft.from
          ? { from: key, to: null }
          : { from: draft.from, to: key },
    );
  };

  const span = draft.from && draft.to ? dayCount(draft.from, draft.to) : 0;
  const tooWide = span > CUSTOM_RANGE_MAX_DAYS;
  const canApply = !!draft.from && !!draft.to && span >= 1 && !tooWide && !loading;
  const hasApplied = custom.status === "ready" || custom.status === "loading";

  const secondMonth = useMemo(() => {
    const shifted = new Date(Date.UTC(anchor.y, anchor.m + 1, 1));
    return { y: shifted.getUTCFullYear(), m: shifted.getUTCMonth() };
  }, [anchor]);

  return createPortal(
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Custom date range"
      tabIndex={-1}
      onKeyDown={onKeyDown}
      onMouseLeave={() => onHoverDayChange(null)}
      style={{
        position: "fixed",
        top: style?.top ?? 0,
        left: style?.left ?? 0,
        visibility: style ? "visible" : "hidden",
      }}
      className="z-[100] w-fit max-w-[calc(100vw-1rem)] rounded-xl border border-umbra-line bg-[#0f0c20] p-4 shadow-2xl backdrop-blur-md"
    >
      {/* Quick ranges — one click, one fetch */}
      <div className="flex flex-wrap items-center gap-1.5">
        {chips.map((chip) => (
          <button
            key={chip.label}
            type="button"
            disabled={loading}
            onClick={() => {
              onDraftChange({ from: chip.from, to: chip.to });
              onApply(chip.from, chip.to);
            }}
            className="focus-ring rounded-full border border-umbra-line bg-white/[.03] px-2.5 py-1 font-mono text-micro uppercase tracking-wider text-umbra-muted transition hover:border-umbra-purple/40 hover:text-umbra-lilac disabled:cursor-not-allowed disabled:opacity-40"
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Month grids — two side by side on >= sm, one below */}
      <div className="mt-3 flex gap-6">
        <CalendarMonthGrid
          year={anchor.y}
          month={anchor.m}
          todayKey={todayKey}
          draft={draft}
          hoverDay={hoverDay}
          onDayClick={onDayClick}
          onDayHover={onHoverDayChange}
          onShift={onShiftAnchor}
        />
        {twoMonths && (
          <CalendarMonthGrid
            year={secondMonth.y}
            month={secondMonth.m}
            todayKey={todayKey}
            draft={draft}
            hoverDay={hoverDay}
            onDayClick={onDayClick}
            onDayHover={onHoverDayChange}
            onShift={onShiftAnchor}
          />
        )}
      </div>

      {/* Footer: resolved draft + actions */}
      <div className="mt-3 border-t border-white/5 pt-3">
        <p className="font-mono text-2xs text-umbra-muted" aria-live="polite">
          {draft.from && draft.to
            ? `${formatRange(draft.from, draft.to)} · ${span} day${span === 1 ? "" : "s"}${tooWide ? " — max 366" : ""}`
            : draft.from
              ? `From ${shortDay(draft.from)} — pick an end day`
              : "Pick a start and end day"}
        </p>
        {custom.status === "error" && custom.error && (
          <p className="mt-1 font-mono text-2xs text-red-400">{custom.error}</p>
        )}
        <div className="mt-2 flex items-center justify-end gap-2">
          {hasApplied && (
            <Button variant="ghost" size="sm" onClick={onClear}>
              Clear
            </Button>
          )}
          <Button
            variant="primary"
            size="sm"
            disabled={!canApply}
            onClick={() => draft.from && draft.to && onApply(draft.from, draft.to)}
          >
            {loading ? "Loading…" : "Apply"}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ── Calendar month grid ───────────────────────────────────────────────────

interface DayCell {
  slot: number;
  key: string;
  day: number;
}

/** 42 slots (6 weeks); leading blanks keep weekday columns aligned. */
function buildMonthGrid(y: number, m: number): { cells: DayCell[]; blanks: number } {
  const firstWeekday = new Date(Date.UTC(y, m, 1)).getUTCDay();
  const cells: DayCell[] = [];
  for (let i = 0; i < 42; i++) {
    const date = new Date(Date.UTC(y, m, 1 - firstWeekday + i));
    if (date.getUTCMonth() !== m || date.getUTCFullYear() !== y) continue;
    cells.push({ slot: i, key: makeDayKey(y, m, date.getUTCDate()), day: date.getUTCDate() });
  }
  return { cells, blanks: firstWeekday };
}

function CalendarMonthGrid({
  year,
  month,
  todayKey,
  draft,
  hoverDay,
  onDayClick,
  onDayHover,
  onShift,
}: {
  year: number;
  month: number;
  todayKey: string;
  draft: { from: string | null; to: string | null };
  hoverDay: string | null;
  onDayClick: (key: string) => void;
  onDayHover: (key: string | null) => void;
  onShift: (delta: number) => void;
}) {
  const { cells, blanks } = useMemo(() => buildMonthGrid(year, month), [year, month]);
  const today = parseDayKey(todayKey);

  // Forward nav stops at the current month — nothing selectable beyond it.
  const canGoForward = monthIndex(year, month) < monthIndex(today.y, today.m);

  // Arrow-key roving within the grid: ±1/±7 slots (skipping blanks), Home/End
  // to the first/last selectable day — the calendar equivalent of Select's
  // listbox navigation.
  const onCellKeyDown = (e: ReactKeyboardEvent<HTMLButtonElement>, slot: number) => {
    let target: number | null = null;
    let walk = 0;
    switch (e.key) {
      case "ArrowRight":
        target = slot + 1;
        walk = 1;
        break;
      case "ArrowLeft":
        target = slot - 1;
        walk = -1;
        break;
      case "ArrowDown":
        target = slot + 7;
        walk = 7;
        break;
      case "ArrowUp":
        target = slot - 7;
        walk = -7;
        break;
      case "Home": {
        e.preventDefault();
        const first = cells[0];
        if (first) {
          const el = e.currentTarget.parentElement?.querySelector<HTMLButtonElement>(
            `button[data-slot="${first.slot}"]`,
          );
          el?.focus();
        }
        return;
      }
      case "End": {
        e.preventDefault();
        const last = cells[cells.length - 1];
        if (last) {
          const el = e.currentTarget.parentElement?.querySelector<HTMLButtonElement>(
            `button[data-slot="${last.slot}"]`,
          );
          el?.focus();
        }
        return;
      }
      default:
        return;
    }
    e.preventDefault();
    if (target === null || target < 0 || target > 41) return;
    // Walk toward the target slot until a rendered day is found.
    for (let s = target; s >= 0 && s <= 41; s += walk) {
      const el = e.currentTarget.parentElement?.querySelector<HTMLButtonElement>(
        `button[data-slot="${s}"]`,
      );
      if (el) {
        el.focus();
        return;
      }
    }
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <Button
          variant="icon"
          size="sm"
          onClick={() => onShift(-1)}
          aria-label="Previous month"
        >
          <IconChevronLeft className="h-4 w-4" aria-hidden />
        </Button>
        <p className="font-mono text-label uppercase tracking-wider text-umbra-muted">
          {monthLabel(year, month)}
        </p>
        <Button
          variant="icon"
          size="sm"
          onClick={() => onShift(1)}
          disabled={!canGoForward}
          aria-label="Next month"
        >
          <IconChevronRight className="h-4 w-4" aria-hidden />
        </Button>
      </div>

      <div
        className="grid grid-cols-7 gap-1"
        role="group"
        aria-label={`${monthLabel(year, month)} calendar`}
      >
        {WEEKDAYS.map((weekday) => (
          <span
            key={weekday}
            className="flex h-6 w-8 items-center justify-center font-mono text-micro uppercase text-umbra-muted/60"
            aria-hidden
          >
            {weekday}
          </span>
        ))}
        {Array.from({ length: blanks }).map((_, i) => (
          <span key={`blank-${i}`} className="h-8 w-8" aria-hidden />
        ))}
        {cells.map((cell) => {
          const future = cell.key > todayKey;
          const isFrom = draft.from === cell.key;
          const isTo = draft.to === cell.key;
          const inRange =
            draft.from != null &&
            draft.to != null &&
            cell.key > draft.from &&
            cell.key < draft.to;
          const previewEnd =
            draft.from != null &&
            draft.to == null &&
            hoverDay != null &&
            cell.key > draft.from &&
            cell.key <= hoverDay;
          const isToday = cell.key === todayKey;

          let classes: string;
          if (future) {
            classes = "cursor-not-allowed text-umbra-muted/25";
          } else if (isFrom || isTo) {
            classes = "bg-umbra-purple/30 font-semibold text-white ring-1 ring-umbra-purple/50";
          } else if (previewEnd) {
            classes = "bg-umbra-purple/15 text-white ring-1 ring-umbra-purple/30";
          } else if (inRange) {
            classes = "bg-umbra-purple/15 text-umbra-lilac";
          } else if (isToday) {
            classes = "text-white ring-1 ring-umbra-purple/30 hover:bg-white/[.06]";
          } else {
            classes = "text-umbra-lilac/90 hover:bg-white/[.06]";
          }

          return (
            <button
              key={cell.key}
              type="button"
              data-slot={cell.slot}
              aria-label={dayAriaLabel(year, month, cell.day)}
              aria-disabled={future}
              aria-pressed={isFrom || isTo}
              disabled={future}
              onClick={() => onDayClick(cell.key)}
              onMouseEnter={() => onDayHover(cell.key)}
              onKeyDown={(e) => onCellKeyDown(e, cell.slot)}
              className={`focus-ring flex h-8 w-8 items-center justify-center rounded-lg text-xs transition ${classes}`}
            >
              {cell.day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
