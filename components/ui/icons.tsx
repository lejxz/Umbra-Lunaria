/**
 * ════════════════════════════════════════════════════════════════════════
 * UMBRA LUNARIA — CELESTIAL ICON SYSTEM
 * ════════════════════════════════════════════════════════════════════════
 *
 * A single, cohesive icon set for the Moon's Shadow observatory. Every icon
 * shares the same 24×24 viewBox, a 1.6 stroke weight, round caps/joins, and
 * a lunar/celestial motif — crescents, stars, orbits, sigils — so the whole
 * app feels like one arcane instrument.
 *
 * The navigation icons are bespoke celestial sigils (a moon-phase compass for
 * the dashboard, a crescent over a roster for members, crossed crescent-blades
 * for war, a ziggurat under a moon for capital, a star-chart for strategy, and
 * a trophy crowned by a star for the hall of fame). Utility icons reuse
 * lucide-react for crispness but are re-exported here so the import surface
 * never changes.
 *
 * Every icon accepts the standard SVG props (className, size, strokeWidth,
 * aria-hidden, etc.) and inherits `currentColor` for stroke/fill.
 */

import type { SVGProps } from "react";
import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  X,
  Loader2,
  RefreshCw,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  ChevronRight,
  ChevronLeft,
  Check,
  GripVertical,
  Plus,
  Trash2,
  Save,
  Filter,
  Search,
} from "lucide-react";

type IconProps = SVGProps<SVGSVGElement> & {
  size?: number | string;
};

/** Base wrapper: 24×24 viewBox, 1.6 stroke, round caps, currentColor. */
function CelestialIcon({
  children,
  size = 20,
  strokeWidth = 1.6,
  ...props
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={props["aria-hidden"] ?? true}
      {...props}
    >
      {children}
    </svg>
  );
}

// ─── Navigation sigils ────────────────────────────────────────────────────

/** Dashboard — a moon-phase compass: crescent + cardinal stars + orbit ring. */
export function NavIconDashboard(props: IconProps) {
  return (
    <CelestialIcon {...props}>
      <circle cx="12" cy="12" r="9" opacity="0.45" />
      <path d="M14.5 7.5a5 5 0 1 0 2 8.5 4 4 0 0 1-2-8.5z" fill="currentColor" fillOpacity="0.12" />
      <path d="M12 3.2v1.6M12 19.2v1.6M3.2 12h1.6M19.2 12h1.6" />
    </CelestialIcon>
  );
}

/** Members — a crescent cradling a small roster (three ascending dots). */
export function NavIconMembers(props: IconProps) {
  return (
    <CelestialIcon {...props}>
      <path d="M16.5 4.5a8 8 0 1 0 3 12 6.5 6.5 0 0 1-3-12z" fill="currentColor" fillOpacity="0.1" />
      <circle cx="9" cy="15" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="12.5" cy="13.5" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="11.5" r="1.1" fill="currentColor" stroke="none" />
    </CelestialIcon>
  );
}

/** War — two crescent blades crossed, a martial lunar sigil. */
export function NavIconWar(props: IconProps) {
  return (
    <CelestialIcon {...props}>
      <path d="M5 19c4-1 7-4 9-9 1 5-2 9-9 9z" fill="currentColor" fillOpacity="0.12" />
      <path d="M19 19c-4-1-7-4-9-9-1 5 2 9 9 9z" fill="currentColor" fillOpacity="0.12" />
      <path d="M5 5l9 9M19 5l-9 9" opacity="0.5" />
    </CelestialIcon>
  );
}

/** Strategy — a star-chart: a 4-point star over an angled planisphere. */
export function NavIconPlanning(props: IconProps) {
  return (
    <CelestialIcon {...props}>
      <path d="M12 3l1.6 5.2L19 10l-5.4 1.8L12 17l-1.6-5.2L5 10l5.4-1.8z" fill="currentColor" fillOpacity="0.14" />
      <path d="M4.5 18.5l5-2.5M19.5 18.5l-5-2.5" />
      <circle cx="12" cy="10" r="1" fill="currentColor" stroke="none" />
    </CelestialIcon>
  );
}

/** Capital — a ziggurat towered under a rising moon. */
export function NavIconCapital(props: IconProps) {
  return (
    <CelestialIcon {...props}>
      <path d="M18 6.5a3.5 3.5 0 1 0 1.5 5 3 3 0 0 1-1.5-5z" fill="currentColor" fillOpacity="0.12" />
      <path d="M4 20h16M6 20v-4h3v4M11 20v-7h3v7M16 20v-4h3v4" />
    </CelestialIcon>
  );
}

/** Hall of Fame — a chalice crowned by a guiding star. */
export function NavIconHallOfFame(props: IconProps) {
  return (
    <CelestialIcon {...props}>
      <path d="M12 2.5l1.2 3.2 3.4.2-2.6 2.2.9 3.3-2.9-1.8-2.9 1.8.9-3.3-2.6-2.2 3.4-.2z" fill="currentColor" fillOpacity="0.16" />
      <path d="M7 13h10v1.5a5 5 0 0 1-10 0z" fill="currentColor" fillOpacity="0.1" />
      <path d="M9 19.5h6M12 17v2.5" />
    </CelestialIcon>
  );
}

// ─── Membership & clan log ─────────────────────────────────────────────────

export function IconUserPlus(props: IconProps) {
  return (
    <CelestialIcon {...props}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19a5.5 5.5 0 0 1 9-4.2" />
      <path d="M18 13v6M15 16h6" />
    </CelestialIcon>
  );
}

export function IconUserMinus(props: IconProps) {
  return (
    <CelestialIcon {...props}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19a5.5 5.5 0 0 1 9-4.2" />
      <path d="M15 16h6" />
    </CelestialIcon>
  );
}

export function IconUserCheck(props: IconProps) {
  return (
    <CelestialIcon {...props}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19a5.5 5.5 0 0 1 9-4.2" />
      <path d="M15.5 16.5l2 2 3.5-3.5" />
    </CelestialIcon>
  );
}

// ─── Needs attention & war ─────────────────────────────────────────────────

export function IconClock(props: IconProps) {
  return (
    <CelestialIcon {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </CelestialIcon>
  );
}

export function IconSwords(props: IconProps) {
  return (
    <CelestialIcon {...props}>
      <path d="M5 19c4-1 7-4 9-9 1 5-2 9-9 9z" fill="currentColor" fillOpacity="0.12" />
      <path d="M19 19c-4-1-7-4-9-9-1 5 2 9 9 9z" fill="currentColor" fillOpacity="0.12" />
      <path d="M5 5l9 9M19 5l-9 9" opacity="0.5" />
    </CelestialIcon>
  );
}

export function IconShieldOff(props: IconProps) {
  return (
    <CelestialIcon {...props}>
      <path d="M12 3l7 3v5c0 4.5-2.8 7.7-7 9-4.2-1.3-7-4.5-7-9V6l3-1.3" />
      <path d="M4 4l16 16" />
    </CelestialIcon>
  );
}

// ─── Data tables & UI primitives (lucide re-exports for crispness) ──────────

export function IconChevronDown(props: IconProps) {
  return <ChevronDown {...props} />;
}
export function IconChevronUp(props: IconProps) {
  return <ChevronUp {...props} />;
}
export function IconChevronsUpDown(props: IconProps) {
  return <ChevronsUpDown {...props} />;
}
export function IconX(props: IconProps) {
  return <X {...props} />;
}
export function IconLoader(props: IconProps) {
  return <Loader2 {...props} />;
}
export function IconSync(props: IconProps) {
  return <RefreshCw {...props} />;
}
export function IconAlert(props: IconProps) {
  return <AlertTriangle {...props} />;
}

// ─── War roster — TH advantage / disadvantage cues ──────────────────────────

export function IconArrowUp(props: IconProps) {
  return <ArrowUp {...props} />;
}
export function IconArrowDown(props: IconProps) {
  return <ArrowDown {...props} />;
}
export function IconChevronRight(props: IconProps) {
  return <ChevronRight {...props} />;
}
export function IconChevronLeft(props: IconProps) {
  return <ChevronLeft {...props} />;
}
export function IconCheck(props: IconProps) {
  return <Check {...props} />;
}

// ─── Capital ───────────────────────────────────────────────────────────────

export function IconCapital(props: IconProps) {
  return <NavIconCapital {...props} />;
}

// ─── Empty states (use size={48}) ──────────────────────────────────────────

export function IconActivityEmpty(props: IconProps) {
  return (
    <CelestialIcon {...props}>
      <circle cx="12" cy="12" r="8.5" opacity="0.4" />
      <path d="M12 7.5V12l3 2" />
      <path d="M5 5l14 14" opacity="0.3" />
    </CelestialIcon>
  );
}

export function IconDonationEmpty(props: IconProps) {
  return (
    <CelestialIcon {...props}>
      <path d="M12 20a8 8 0 1 1 8-8" />
      <path d="M12 20a8 8 0 0 1-8-8" opacity="0.4" />
      <path d="M12 11l1.8-4.5a.6.6 0 0 0-.9-.7L8 8.5" />
      <path d="M12 11l-1.8 4.5a.6.6 0 0 0 .9.7L16 10.5" opacity="0.5" />
    </CelestialIcon>
  );
}

export function IconWarEmpty(props: IconProps) {
  return <IconSwords {...props} />;
}

// ─── Hall of Fame — award icons ────────────────────────────────────────────

export function IconGift(props: IconProps) {
  return (
    <CelestialIcon {...props}>
      <path d="M5 11h14v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z" fill="currentColor" fillOpacity="0.08" />
      <path d="M5 11V8a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3M12 7v13" />
      <path d="M12 7S10.5 3.5 8.5 4.5 10 7 12 7zM12 7s1.5-3.5 3.5-2.5S14 7 12 7z" />
    </CelestialIcon>
  );
}

export function IconFlame(props: IconProps) {
  return (
    <CelestialIcon {...props}>
      <path d="M12 3c.5 3-1.5 4-2.5 5.5C8 10.5 7.5 12 8 13.5a4 4 0 0 0 8 0c0-2-1-3.5-2-5-.5 1-1.5 1.5-2 1 0-2.5 1-4.5 0-6.5z" fill="currentColor" fillOpacity="0.12" />
      <path d="M12 3c.5 3-1.5 4-2.5 5.5C8 10.5 7.5 12 8 13.5a4 4 0 0 0 8 0c0-2-1-3.5-2-5-.5 1-1.5 1.5-2 1 0-2.5 1-4.5 0-6.5z" />
    </CelestialIcon>
  );
}

export function IconCoins(props: IconProps) {
  return (
    <CelestialIcon {...props}>
      <ellipse cx="9" cy="7" rx="5" ry="2.5" />
      <path d="M4 7v4c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5V7" />
      <path d="M10 14.5V17c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5v-4c0-1.4-2.2-2.5-5-2.5" opacity="0.7" />
    </CelestialIcon>
  );
}

export function IconEye(props: IconProps) {
  return (
    <CelestialIcon {...props}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3" fill="currentColor" fillOpacity="0.12" />
    </CelestialIcon>
  );
}

export function IconTrophy(props: IconProps) {
  return <NavIconHallOfFame {...props} />;
}

export function IconZap(props: IconProps) {
  return (
    <CelestialIcon {...props}>
      <path d="M13 3L5 13h6l-1 8 8-10h-6z" fill="currentColor" fillOpacity="0.14" />
    </CelestialIcon>
  );
}

export function IconCrown(props: IconProps) {
  return (
    <CelestialIcon {...props}>
      <path d="M4 8l3.5 3L12 6l4.5 5L20 8l-1.5 10a1 1 0 0 1-1 .9H6.5a1 1 0 0 1-1-.9z" fill="currentColor" fillOpacity="0.1" />
      <path d="M4 8l3.5 3L12 6l4.5 5L20 8l-1.5 10a1 1 0 0 1-1 .9H6.5a1 1 0 0 1-1-.9z" />
      <circle cx="4" cy="8" r="1" fill="currentColor" stroke="none" />
      <circle cx="20" cy="8" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="5" r="1" fill="currentColor" stroke="none" />
    </CelestialIcon>
  );
}

// ─── Charts & analytics ────────────────────────────────────────────────────

export function IconTrendingUp(props: IconProps) {
  return (
    <CelestialIcon {...props}>
      <path d="M3 16l5-5 4 3 7-8" />
      <path d="M14 6h5v5" />
    </CelestialIcon>
  );
}

// ─── Planning — roster builder interactions ────────────────────────────────

export function IconGrip(props: IconProps) {
  return <GripVertical {...props} />;
}
export function IconPlus(props: IconProps) {
  return <Plus {...props} />;
}
export function IconTrash(props: IconProps) {
  return <Trash2 {...props} />;
}
export function IconSave(props: IconProps) {
  return <Save {...props} />;
}
export function IconFilter(props: IconProps) {
  return <Filter {...props} />;
}
export function IconSearch(props: IconProps) {
  return <Search {...props} />;
}
export function IconUsers(props: IconProps) {
  return <NavIconMembers {...props} />;
}
