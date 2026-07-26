"use client";

/**
 * Navigation — the lunar sidebar (desktop) + bottom bar (mobile).
 *
 * Celestial Observatory redesign:
 *  • Mini-emblem logo — a CSS crescent moon in a glowing ring, replaces the
 *    raster Logo.png so it stays crisp at every size and matches the theme.
 *  • Active state paints a 2px purple glow bar on the left edge of the link
 *    (inset shadow) plus a soft violet gradient wash — reads as "lit".
 *  • Collapsible on desktop (64px rail ↔ 240px), animated with framer-motion
 *    width spring + staggered label fade so nothing pops.
 *  • Mobile: bottom bar with the same active treatment, safe-area aware.
 *  • Status footer pulses softly ("Systems nominal").
 *  • Respects prefers-reduced-motion (no pulse, no width spring).
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  NavIconDashboard,
  NavIconMembers,
  NavIconWar,
  NavIconCapital,
  NavIconPlanning,
  NavIconHallOfFame,
  IconChevronLeft,
  IconChevronRight,
} from "@/components/ui/icons";

const links = [
  { icon: NavIconDashboard, label: "Dashboard", href: "/" },
  { icon: NavIconMembers, label: "Members", href: "/members" },
  { icon: NavIconWar, label: "War Center", href: "/war" },
  { icon: NavIconPlanning, label: "Strategy", href: "/strategy" },
  { icon: NavIconCapital, label: "Capital", href: "/capital" },
  { icon: NavIconHallOfFame, label: "Hall of Fame", href: "/hall-of-fame" },
] as const;

/** Mini lunar emblem — pure CSS crescent inside a glowing orbital ring. */
function LunarEmblem({ size = 38 }: { size?: number }) {
  return (
    <span
      className="relative inline-block shrink-0"
      style={{ width: size, height: size }}
      aria-hidden
    >
      {/* Orbital ring */}
      <span
        className="absolute inset-0 rounded-full border border-umbra-line"
        style={{ boxShadow: "0 0 16px rgba(182,120,255,.5)" }}
      />
      {/* Moon disc with crescent cutout */}
      <span
        className="absolute rounded-full"
        style={{
          inset: size * 0.16,
          background:
            "radial-gradient(circle at 32% 30%, #F2EEFF, #C9B8F0 40%, #7552DF 100%)",
          boxShadow:
            "0 0 14px rgba(182,120,255,.55), inset -4px -3px 9px rgba(75,47,160,.5)",
        }}
      />
      <span
        className="absolute rounded-full"
        style={{
          inset: size * 0.16,
          background:
            "radial-gradient(circle at 66% 50%, #050309 0 38%, transparent 42%)",
        }}
      />
      {/* Cardinal star */}
      <span
        className="absolute rounded-full bg-umbra-moonlight"
        style={{
          width: 3,
          height: 3,
          top: -1,
          left: "50%",
          transform: "translateX(-50%)",
          boxShadow: "0 0 6px #F2EEFF",
        }}
      />
    </span>
  );
}

export function Navigation() {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("umbra_sidebar_collapsed");
    if (stored === "true") setIsCollapsed(true);
  }, []);

  const toggleCollapse = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    localStorage.setItem("umbra_sidebar_collapsed", String(next));
  };

  return (
    <aside
      className={`fixed inset-x-0 bottom-0 z-20 border-t border-umbra-line bg-umbra-ink/95 backdrop-blur-xl lg:sticky lg:top-0 lg:h-screen lg:shrink-0 lg:border-r lg:border-t-0 ${
        mounted && !reduceMotion ? "transition-[width] duration-200 ease-lunar" : ""
      } ${isCollapsed ? "lg:w-16" : "lg:w-60"}`}
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {/* Collapse toggle — floats on the right edge of the rail */}
      {mounted && (
        <button
          onClick={toggleCollapse}
          className="focus-ring absolute -right-3 top-9 z-30 hidden h-6 w-6 items-center justify-center rounded-full border border-umbra-line bg-umbra-ink text-umbra-muted shadow-[0_0_10px_rgba(0,0,0,0.5)] transition-colors duration-150 hover:border-umbra-purple/50 hover:text-umbra-lilac lg:flex"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <IconChevronRight className="h-3.5 w-3.5" />
          ) : (
            <IconChevronLeft className="h-3.5 w-3.5 pr-[1px]" />
          )}
        </button>
      )}

      {/* Brand */}
      <div
        className={`hidden items-center overflow-hidden border-b border-umbra-line lg:flex ${
          mounted ? "transition-all duration-200" : ""
        } ${isCollapsed ? "justify-center p-4" : "p-5"}`}
      >
        <Link href="/" className="flex items-center gap-3" aria-label="Umbra Lunaria home">
          <LunarEmblem size={40} />
          <AnimatePresence initial={false}>
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="overflow-hidden whitespace-nowrap font-display text-sm font-semibold tracking-[0.08em] text-umbra-lilac"
              >
                UMBRA
                <br />
                LUNARIA
              </motion.span>
            )}
          </AnimatePresence>
        </Link>
      </div>

      {/* Nav links */}
      <nav
        className="mx-auto flex max-w-md justify-around gap-1 p-2 lg:block lg:max-w-none lg:space-y-1 lg:p-3"
        aria-label="Primary navigation"
      >
        {links.map(({ icon: Icon, label, href }, index) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              title={isCollapsed ? label : undefined}
              className={`focus-ring group relative flex flex-col items-center gap-1 rounded-r-md border px-2 py-1.5 text-label lg:flex-row lg:gap-3 lg:py-2.5 lg:px-3 ${
                mounted ? "transition-all duration-200" : ""
              } ${
                active
                  ? "border-umbra-line text-umbra-moonlight"
                  : "border-transparent text-umbra-muted hover:bg-white/[.04] hover:text-umbra-lilac"
              } ${isCollapsed ? "lg:justify-center lg:px-0" : ""}`}
            >
              {/* Active glow bar — left edge */}
              {active && (
                <motion.span
                  layoutId={reduceMotion ? undefined : "nav-active-bar"}
                  className="absolute left-0 top-1.5 bottom-1.5 hidden w-[2px] rounded-full lg:block"
                  style={{
                    background: "linear-gradient(180deg,#B678FF,#7552DF)",
                    boxShadow: "0 0 8px rgba(182,120,255,.7)",
                  }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                />
              )}
              {/* Active violet wash */}
              {active && (
                <span
                  className="absolute inset-0 -z-0 hidden rounded-r-md lg:block"
                  style={{
                    background:
                      "linear-gradient(90deg, rgba(182,120,255,.14), rgba(182,120,255,.02))",
                  }}
                />
              )}
              <span
                className={`relative z-10 h-5 w-5 shrink-0 transition-colors duration-200 ${
                  active
                    ? "text-umbra-purple"
                    : "text-umbra-muted group-hover:text-umbra-lilac"
                }`}
              >
                <Icon className="h-5 w-5" />
              </span>
              <AnimatePresence initial={false}>
                {!isCollapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="relative z-10 overflow-hidden whitespace-nowrap text-sm tracking-wide"
                  >
                    {label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          );
        })}
      </nav>

      {/* Status footer — pulses softly */}
      <div
        className={`absolute bottom-0 hidden w-full border-t border-umbra-line px-5 py-4 lg:block ${
          mounted ? "transition-opacity duration-200" : ""
        } ${isCollapsed ? "pointer-events-none opacity-0" : "opacity-100"}`}
      >
        <span className="flex items-center gap-1.5 font-mono text-label uppercase tracking-wider text-emerald-300">
          <span
            className={`h-2 w-2 rounded-full bg-emerald-400 ${
              reduceMotion ? "" : "animate-pulse-soft"
            }`}
            style={{ boxShadow: "0 0 6px rgba(52,211,153,0.6)" }}
          />
          Systems nominal
        </span>
        <p className="mt-0.5 text-xs text-umbra-muted/70">
          Tracking the clan quietly.
        </p>
      </div>
    </aside>
  );
}
