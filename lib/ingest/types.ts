/**
 * Shape of the result returned by the ingestion route and propagated back to
 * the GitHub Actions workflow that triggers polls.
 *
 * See concept/04-activity-tracking-and-polling.md (failed-poll safety,
 * membership-event detection) and concept/03-data-model-and-database.md
 * (retention, membership_events table).
 *
 * `ok` is `false` when a critical failure (typically the clan fetch) prevents
 * the poll from completing. Even on failure the route never marks members as
 * departed — that contract is enforced in the route handler, not by callers.
 */
export interface IngestResult {
  ok: boolean;
  batch: boolean;
  membersPolled: number;
  warSynced: boolean;
  errors: string[];
  events: { joins: number; leaves: number; rejoins: number };
}
