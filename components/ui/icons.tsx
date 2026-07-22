import * as React from "react";

// ===========================================================================
// Clan Log & Members
// ===========================================================================

export function IconUserPlus(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M19 8v6" strokeOpacity="0.3" />
      <path d="M22 11h-6" strokeOpacity="0.3" />
    </svg>
  );
}

export function IconUserMinus(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 11h-6" strokeOpacity="0.3" />
    </svg>
  );
}

export function IconUserCheck(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M16 11l2 2 4-4" strokeOpacity="0.4" />
    </svg>
  );
}

// ===========================================================================
// Needs Attention
// ===========================================================================

export function IconClock(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="10" strokeOpacity="0.3" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}

export function IconSwords(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M8 16L21 3" strokeOpacity="0.3" />
      <path d="M3 21L8 16M6 14L10 18" />
      <path d="M16 16L3 3" strokeOpacity="0.3" />
      <path d="M21 21L16 16M18 14L14 18" />
    </svg>
  );
}

export function IconShieldOff(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M19.69 14a6.9 6.9 0 0 0 .31-2V5l-8-3-3.16 1.18" />
      <path d="M4.73 4.73L4 5v7c0 6 8 10 8 10a20.29 20.29 0 0 0 5.62-4.38" />
      <path d="M1 1l22 22" strokeOpacity="0.3" />
    </svg>
  );
}

// ===========================================================================
// Data Tables & UI Primitives
// ===========================================================================

export function IconChevronDown(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function IconChevronUp(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M18 15l-6-6-6 6" />
    </svg>
  );
}

export function IconChevronsUpDown(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M7 15l5 5 5-5" strokeOpacity="0.3" />
      <path d="M7 9l5-5 5 5" />
    </svg>
  );
}

export function IconX(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M18 6L6 18" />
      <path d="M6 6l12 12" strokeOpacity="0.3" />
    </svg>
  );
}

export function IconLoader(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

export function IconSync(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" strokeOpacity="0.3" />
    </svg>
  );
}

export function IconAlert(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 2L2 22h20L12 2z" strokeOpacity="0.3" />
      <path d="M12 16v.01" />
      <path d="M12 8v4" />
    </svg>
  );
}

// ===========================================================================
// Navigation Icons (Dashboard, Members, War, Capital, Planning)
// ===========================================================================

export function NavIconDashboard(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" strokeOpacity="0.3" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" strokeOpacity="0.3" />
    </svg>
  );
}

export function NavIconMembers(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeOpacity="0.3" />
      <circle cx="9" cy="7" r="4" strokeOpacity="0.3" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export function NavIconWar(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M14.5 4h5v5l-10 10-5-5 10-10z" />
      <path d="M4 20l5-5" strokeOpacity="0.3" />
      <path d="M9.5 4h-5v5l10 10 5-5-10-10z" strokeOpacity="0.3" />
      <path d="M20 20l-5-5" />
    </svg>
  );
}

export function NavIconCapital(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" strokeOpacity="0.3" />
      <polygon points="12 2 15.09 8.26 12 17.77 8.91 8.26 12 2" />
    </svg>
  );
}

export function NavIconPlanning(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 6h16" />
      <path d="M4 12h16" strokeOpacity="0.3" />
      <path d="M4 18h16" />
    </svg>
  );
}

// ===========================================================================
// Empty States (48x48)
// ===========================================================================

export function IconActivityEmpty(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M8 24H16L20 12L28 36L32 24H40" strokeOpacity="0.3" strokeDasharray="2 4" />
      <circle cx="24" cy="24" r="16" strokeOpacity="0.1" />
    </svg>
  );
}

export function IconDonationEmpty(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M24 16v16M16 24h16" strokeOpacity="0.3" strokeDasharray="2 4" />
      <rect x="10" y="10" width="28" height="28" rx="4" strokeOpacity="0.1" />
    </svg>
  );
}

export function IconWarEmpty(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M24 4C14 4 10 10 10 10V22C10 32 22 42 24 44C26 42 38 32 38 22V10C38 10 34 4 24 4Z" strokeDasharray="2 4" strokeOpacity="0.3" />
      <path d="M17 17L31 31M31 17L17 31" />
    </svg>
  );
}