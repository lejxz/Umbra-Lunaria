/**
 * Member-profile deep links (Phase 2.1 — docs/2026-09-11-implementation-plan.md §2.1).
 *
 * Canonical helper for building /members?tag=%23XXXXXXXX URLs. The members
 * page opens the detail sheet for the ?tag= on load (see
 * components/members/members-shell.tsx), which makes those URLs shareable
 * and Back-button friendly.
 *
 * Note: since the dashboard rows (clan log + attention queues) were switched
 * back to opening the dashboard-local MemberDetailSheet in place, no
 * component currently imports this helper — it is kept as the single source
 * of truth for the /members deep-link URL contract, which members-shell
 * still implements (read on load, push on select) and which future
 * share-link surfaces (e.g. a "copy profile link" action) should reuse.
 *
 * Pure string helper — safe to import from client components, server
 * components, and tests alike.
 */

/** Build the deep-link URL for a member's profile sheet. */
export function memberProfileHref(playerTag: string): string {
  return `/members?tag=${encodeURIComponent(playerTag)}`;
}
