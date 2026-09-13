/**
 * Member-profile deep links (Phase 2.1 — docs/2026-09-11-implementation-plan.md §2.1).
 *
 * A single canonical helper so every surface that "links into" a member
 * profile builds the exact same URL: /members?tag=%23XXXXXXXX. The members
 * page opens the detail sheet for the ?tag= on load (see
 * components/members/members-shell.tsx), which makes the URL shareable and
 * Back-button friendly.
 *
 * Pure string helper — safe to import from client components, server
 * components, and tests alike.
 */

/** Build the deep-link URL for a member's profile sheet. */
export function memberProfileHref(playerTag: string): string {
  return `/members?tag=${encodeURIComponent(playerTag)}`;
}
