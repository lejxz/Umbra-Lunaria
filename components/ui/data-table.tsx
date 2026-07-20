"use client";

import { useCallback, useMemo, useState, type KeyboardEvent, type ReactNode } from "react";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import { EmptyState } from "./empty-state";

/**
 * DataTable — the shared table primitive used across the Members, War, and
 * Capital surfaces. See concept/10-mobile-support.md §4 (member tables become
 * cards below the `md` breakpoint) and §Accessibility (rows are keyboard
 * operable, hover detail has tap + keyboard equivalent).
 *
 * Design notes:
 *  - Controlled sorting and filtering. The parent owns the rows; this
 *    component only renders the sort UI and applies the comparison.
 *  - Rows are buttons (rendered as `<tr>` with `tabIndex=0` and role="button")
 *    so Enter/Space trigger `onRowClick`.
 *  - Loading state renders skeleton rows so layout doesn't shift.
 *  - Empty state delegates to the shared `EmptyState` component.
 *  - Below `md`, the table is replaced with stacked cards. Columns marked
 *    `hideOnMobile` are dropped from the card to keep it readable.
 */

export type Column<T> = {
  key: string;
  label: string;
  render: (row: T) => ReactNode;
  /** Whether the header click cycles the sort state. Defaults to false. */
  sortable?: boolean;
  /** Optional sort accessor — defaults to the rendered cell stringified. */
  sortValue?: (row: T) => string | number;
  /** Hide this column on mobile card layout. */
  hideOnMobile?: boolean;
};

export type SortState = {
  key: string;
  direction: "asc" | "desc";
} | null;

export type DataTableProps<T> = {
  rows: T[];
  columns: Column<T>[];
  /** Stable row key extractor. Falls back to index if omitted. */
  getRowId?: (row: T, index: number) => string | number;
  /** Show skeleton rows while data is loading. */
  loading?: boolean;
  /** Number of skeleton rows to render while loading. Defaults to 5. */
  loadingRows?: number;
  /** Render an EmptyState when rows is empty. */
  emptyState?: ReactNode;
  /** Click handler — when set, rows become focusable buttons. */
  onRowClick?: (row: T) => void;
  /** Currently selected row id, used for highlight. */
  selectedRowId?: string | number;
  /** Controlled sort state. When provided, the parent owns the sort. */
  sort?: SortState;
  /** Called when the user cycles the sort on a column. */
  onSortChange?: (sort: SortState) => void;
  /** When true and `sort`/`onSortChange` are not provided, sort is internal. */
  sortable?: boolean;
  /** Accessible label for the table. */
  ariaLabel?: string;
  /** Optional caption rendered above the table. */
  caption?: ReactNode;
};

export function DataTable<T>({
  rows,
  columns,
  getRowId,
  loading = false,
  loadingRows = 5,
  emptyState,
  onRowClick,
  selectedRowId,
  sort,
  onSortChange,
  sortable = false,
  ariaLabel,
  caption,
}: DataTableProps<T>) {
  // Internal sort mirror — only used when the component is uncontrolled.
  const [internalSort, setInternalSort] = useState<SortState>(null);
  const isControlled = sort !== undefined || onSortChange !== undefined;
  const activeSort = isControlled ? sort ?? null : internalSort;

  const handleSortClick = useCallback(
    (column: Column<T>) => {
      if (!column.sortable && !sortable) return;
      if (isControlled && onSortChange) {
        onSortChange(cycleSort(activeSort, column.key));
        return;
      }
      setInternalSort((prev) => cycleSort(prev, column.key));
    },
    [activeSort, isControlled, onSortChange, sortable],
  );

  // Apply the active sort to the rows. Sorting is view-only — the parent owns
  // the data, but a sortable table should reflect the user's choice without
  // requiring the parent to wire state.
  const sortedRows = useMemo(() => {
    if (!activeSort) return rows;
    const column = columns.find((c) => c.key === activeSort.key);
    if (!column) return rows;
    const accessor =
      column.sortValue ??
      ((row: T) => {
        const rendered = column.render(row);
        return typeof rendered === "number"
          ? rendered
          : String(rendered ?? "");
      });
    const direction = activeSort.direction === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = accessor(a);
      const bv = accessor(b);
      if (typeof av === "number" && typeof bv === "number") {
        return (av - bv) * direction;
      }
      return String(av).localeCompare(String(bv)) * direction;
    });
  }, [activeSort, columns, rows]);

  const rowKey = useCallback(
    (row: T, index: number) => (getRowId ? getRowId(row, index) : index),
    [getRowId],
  );

  if (loading) {
    return (
      <TableShell ariaLabel={ariaLabel} caption={caption}>
        <DesktopHeader columns={columns} />
        <tbody className="divide-y divide-white/5">
          {Array.from({ length: loadingRows }).map((_, i) => (
            <tr key={`skeleton-${i}`} className="text-umbra-lilac">
              {columns.map((column) => (
                <td className="px-4 py-3" key={column.key}>
                  <div className="h-4 w-full max-w-[160px] animate-pulse rounded bg-white/5" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </TableShell>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-umbra-line">
        {emptyState ?? (
          <EmptyState
            title="No rows to display"
            description="There is no data for the current view yet."
          />
        )}
      </div>
    );
  }

  const mobileColumns = columns.filter((c) => !c.hideOnMobile);

  return (
    <>
      {/* Desktop / tablet: real table semantics. */}
      <TableShell ariaLabel={ariaLabel} caption={caption} className="hidden md:block">
        <DesktopHeader
          columns={columns}
          activeSort={activeSort}
          onSortClick={handleSortClick}
          sortable={sortable}
        />
        <tbody className="divide-y divide-white/5">
          {sortedRows.map((row, index) => {
            const key = rowKey(row, index);
            const selected = selectedRowId !== undefined && selectedRowId === key;
            return (
              <TableRow
                key={key}
                row={row}
                columns={columns}
                onClick={onRowClick}
                selected={selected}
              />
            );
          })}
        </tbody>
      </TableShell>

      {/* Mobile: stacked cards (below md). See concept/10 §4. */}
      <ul className="space-y-3 md:hidden" aria-label={ariaLabel}>
        {sortedRows.map((row, index) => {
          const key = rowKey(row, index);
          const selected = selectedRowId !== undefined && selectedRowId === key;
          return (
            <MobileCard
              key={key}
              row={row}
              columns={mobileColumns}
              onClick={onRowClick}
              selected={selected}
            />
          );
        })}
      </ul>
    </>
  );
}

function TableShell({
  children,
  ariaLabel,
  caption,
  className,
}: {
  children: ReactNode;
  ariaLabel?: string;
  caption?: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      {caption && <div className="mb-3">{caption}</div>}
      <div className="overflow-x-auto rounded-2xl border border-umbra-line">
        <table className="w-full text-left text-sm" aria-label={ariaLabel}>
          {children}
        </table>
      </div>
    </div>
  );
}

function DesktopHeader<T>({
  columns,
  activeSort,
  onSortClick,
  sortable,
}: {
  columns: Column<T>[];
  activeSort?: SortState;
  onSortClick?: (column: Column<T>) => void;
  sortable?: boolean;
}) {
  return (
    <thead className="bg-white/5 text-xs uppercase tracking-wider text-umbra-muted">
      <tr>
        {columns.map((column) => {
          const canSort = Boolean(column.sortable || (sortable && onSortClick));
          const isActive = activeSort?.key === column.key;
          const direction = isActive ? activeSort?.direction : undefined;
          const ariaSort = canSort
            ? direction === "asc"
              ? "ascending"
              : direction === "desc"
                ? "descending"
                : "none"
            : undefined;
          return (
            <th
              className="px-4 py-3"
              key={column.key}
              scope="col"
              aria-sort={ariaSort}
            >
              {canSort ? (
                <button
                  type="button"
                  onClick={() => onSortClick?.(column)}
                  className="focus-ring inline-flex items-center gap-1.5 rounded text-umbra-muted transition hover:text-umbra-lilac"
                >
                  {column.label}
                  <SortIcon active={isActive} direction={direction} />
                </button>
              ) : (
                column.label
              )}
            </th>
          );
        })}
      </tr>
    </thead>
  );
}

function SortIcon({
  active,
  direction,
}: {
  active: boolean;
  direction?: "asc" | "desc";
}) {
  if (!active || !direction) {
    return <ChevronsUpDown className="h-3 w-3 opacity-50" aria-hidden />;
  }
  return direction === "asc" ? (
    <ChevronUp className="h-3 w-3 text-umbra-purple" aria-hidden />
  ) : (
    <ChevronDown className="h-3 w-3 text-umbra-purple" aria-hidden />
  );
}

function TableRow<T>({
  row,
  columns,
  onClick,
  selected,
}: {
  row: T;
  columns: Column<T>[];
  onClick?: (row: T) => void;
  selected: boolean;
}) {
  const handleKeyDown = (event: KeyboardEvent<HTMLTableRowElement>) => {
    if (!onClick) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick(row);
    }
  };

  return (
    <tr
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? "button" : undefined}
      onClick={onClick ? () => onClick(row) : undefined}
      onKeyDown={onClick ? handleKeyDown : undefined}
      aria-pressed={onClick ? selected : undefined}
      className={`text-umbra-lilac transition ${
        onClick ? "cursor-pointer hover:bg-white/[.035] focus:bg-white/[.035]" : ""
      } ${selected ? "bg-umbra-purple/10" : ""}`}
    >
      {columns.map((column) => (
        <td className="px-4 py-3" key={column.key}>
          {column.render(row)}
        </td>
      ))}
    </tr>
  );
}

function MobileCard<T>({
  row,
  columns,
  onClick,
  selected,
}: {
  row: T;
  columns: Column<T>[];
  onClick?: (row: T) => void;
  selected: boolean;
}) {
  const handleKeyDown = (event: KeyboardEvent<HTMLLIElement>) => {
    if (!onClick) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick(row);
    }
  };

  // Use the first column's rendered value as the card headline so the card
  // remains meaningful even if all subsequent columns are hidden on mobile.
  const headline = columns[0];

  return (
    <li
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? "button" : undefined}
      onClick={onClick ? () => onClick(row) : undefined}
      onKeyDown={onClick ? handleKeyDown : undefined}
      aria-pressed={onClick ? selected : undefined}
      className={`glass rounded-2xl p-4 transition ${
        onClick ? "cursor-pointer hover:border-umbra-purple/40 focus:border-umbra-purple/40" : ""
      } ${selected ? "border-umbra-purple/60 bg-umbra-purple/10" : ""}`}
    >
      {headline && (
        <div className="font-display text-base text-umbra-lilac">
          {headline.render(row)}
        </div>
      )}
      {columns.length > 1 && (
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
          {columns.slice(1).map((column) => (
            <div key={column.key}>
              <dt className="font-mono text-[10px] uppercase tracking-wider text-umbra-muted">
                {column.label}
              </dt>
              <dd className="mt-0.5 text-sm text-umbra-lilac">
                {column.render(row)}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </li>
  );
}

function cycleSort(prev: SortState, key: string): SortState {
  if (!prev || prev.key !== key) return { key, direction: "asc" };
  if (prev.direction === "asc") return { key, direction: "desc" };
  return null;
}
