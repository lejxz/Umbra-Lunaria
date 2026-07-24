/**
 * Unified icon system — all icons are re-exported from lucide-react for
 * consistent stroke width (2px), viewBox (24×24), and visual style.
 *
 * This file maintains the existing export names so components don't need to
 * change their imports. The old hand-drawn SVGs have been replaced with
 * Lucide equivalents.
 *
 * Lucide icons accept the same props as React SVG elements (className, size,
 * strokeWidth, etc.) plus a `size` prop for width/height.
 */

import {
  UserPlus,
  UserMinus,
  UserCheck,
  Clock,
  Swords,
  ShieldOff,
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
  Building2,
  LayoutGrid,
  Users,
  ClipboardList,
  Activity,
  TrendingUp,
  Gift,
  Flame,
  Coins,
  Eye,
  Trophy,
  Zap,
  HeartHandshake,
  Crown,
  type LucideProps,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Membership & clan log
// ---------------------------------------------------------------------------

export const IconUserPlus = (props: LucideProps) => <UserPlus {...props} />;
export const IconUserMinus = (props: LucideProps) => <UserMinus {...props} />;
export const IconUserCheck = (props: LucideProps) => <UserCheck {...props} />;

// ---------------------------------------------------------------------------
// Needs attention & war
// ---------------------------------------------------------------------------

export const IconClock = (props: LucideProps) => <Clock {...props} />;
export const IconSwords = (props: LucideProps) => <Swords {...props} />;
export const IconShieldOff = (props: LucideProps) => <ShieldOff {...props} />;

// ---------------------------------------------------------------------------
// Data tables & UI primitives
// ---------------------------------------------------------------------------

export const IconChevronDown = (props: LucideProps) => <ChevronDown {...props} />;
export const IconChevronUp = (props: LucideProps) => <ChevronUp {...props} />;
export const IconChevronsUpDown = (props: LucideProps) => <ChevronsUpDown {...props} />;
export const IconX = (props: LucideProps) => <X {...props} />;
export const IconLoader = (props: LucideProps) => <Loader2 {...props} />;
export const IconSync = (props: LucideProps) => <RefreshCw {...props} />;
export const IconAlert = (props: LucideProps) => <AlertTriangle {...props} />;

// ---------------------------------------------------------------------------
// Navigation icons
// ---------------------------------------------------------------------------

export const NavIconDashboard = (props: LucideProps) => <LayoutGrid {...props} />;
export const NavIconMembers = (props: LucideProps) => <Users {...props} />;
export const NavIconWar = (props: LucideProps) => <Swords {...props} />;
export const NavIconCapital = (props: LucideProps) => <Building2 {...props} />;
export const NavIconPlanning = (props: LucideProps) => <ClipboardList {...props} />;

// ---------------------------------------------------------------------------
// War roster — TH advantage / disadvantage cues
// ---------------------------------------------------------------------------

export const IconArrowUp = (props: LucideProps) => <ArrowUp {...props} />;
export const IconArrowDown = (props: LucideProps) => <ArrowDown {...props} />;
export const IconChevronRight = (props: LucideProps) => <ChevronRight {...props} />;
export const IconChevronLeft = (props: LucideProps) => <ChevronLeft {...props} />;
export const IconCheck = (props: LucideProps) => <Check {...props} />;

// ---------------------------------------------------------------------------
// Capital
// ---------------------------------------------------------------------------

export const IconCapital = (props: LucideProps) => <Building2 {...props} />;

// ---------------------------------------------------------------------------
// Empty states (48×48 — use size={48} or className="h-12 w-12")
// ---------------------------------------------------------------------------

export const IconActivityEmpty = (props: LucideProps) => <Activity {...props} />;
export const IconDonationEmpty = (props: LucideProps) => <HeartHandshake {...props} />;
export const IconWarEmpty = (props: LucideProps) => <Swords {...props} />;

// ---------------------------------------------------------------------------
// Hall of Fame — award icons (used by hall-of-fame-card.tsx)
// ---------------------------------------------------------------------------

export const IconGift = (props: LucideProps) => <Gift {...props} />;
export const IconFlame = (props: LucideProps) => <Flame {...props} />;
export const IconCoins = (props: LucideProps) => <Coins {...props} />;
export const IconEye = (props: LucideProps) => <Eye {...props} />;
export const IconTrophy = (props: LucideProps) => <Trophy {...props} />;
export const IconZap = (props: LucideProps) => <Zap {...props} />;
export const IconCrown = (props: LucideProps) => <Crown {...props} />;

// ---------------------------------------------------------------------------
// Charts & analytics
// ---------------------------------------------------------------------------

export const IconTrendingUp = (props: LucideProps) => <TrendingUp {...props} />;
