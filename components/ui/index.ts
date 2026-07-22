/**
 * Barrel export for the shared UI primitives. Import from `@/components/ui`
 * rather than reaching into individual files so the surface stays stable as
 * files move.
 *
 * See concept/12-Implemantation-plan-and-modularity.md for the module
 * boundary contract.
 */

export { Badge } from "./badge";
export { EmptyState } from "./empty-state";
export { StatCard } from "./stat-card";
export { Select } from "./select";
export { Toggle } from "./toggle";
export { Tabs } from "./tabs";
export { TimeAgo } from "./time-ago";
export { Modal, Sheet } from "./modal";
export {
  DataTable,
  type Column,
  type DataTableProps,
  type SortState,
} from "./data-table";
export {
  MetricState,
  LoadingState,
  ErrorState,
  UnavailableValue,
} from "./state-primitives";
