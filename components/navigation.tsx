"use client";

/**
 * Navigation — sidebar (desktop) + bottom bar (mobile).
 *
 * Phase 9 polish:
 * - Logo uses <Image> (was <img>)
 * - Nav items use rounded-lg (was rounded-[10px] — already fixed in Phase 4)
 * - Collapsed width: 64px (was 80px) — tighter, more standard
 * - Transition: 200ms (was 300ms) — snappier, less jarring
 * - All child transitions matched to 200ms
 * - Mobile: safe-area padding (env(safe-area-inset-bottom))
 * - Inactive hover: hover:bg-white/[.04] (standardized in Phase 5)
 */

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  [<NavIconDashboard key="dash" />, "Dashboard", "/"],
  [<NavIconMembers key="members" />, "Members", "/members"],
  [<NavIconWar key="war" />, "War center", "/war"],
  [<NavIconPlanning key="strat" />, "Strategy", "/strategy"],
  [<NavIconCapital key="cap" />, "Capital", "/capital"],
  [<NavIconHallOfFame key="hof" />, "Hall of Fame", "/hall-of-fame"],
] as const;

export function Navigation({ initialCollapsed = false }: { initialCollapsed?: boolean }) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);

  const toggleCollapse = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    document.cookie = `umbra_sidebar_collapsed=${next}; path=/; max-age=31536000`;
    localStorage.setItem("umbra_sidebar_collapsed", String(next));
  };

  return (
    <aside
      className={`fixed inset-x-0 bottom-0 z-20 border-t border-umbra-line bg-umbra-ink/95 backdrop-blur-xl lg:sticky lg:top-0 lg:h-screen lg:shrink-0 lg:border-r lg:border-t-0 transition-[width] duration-200 ease-out ${
        isCollapsed ? "lg:w-16" : "lg:w-60"
      }`}
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {/* Collapse Toggle Button */}
      <button
        onClick={toggleCollapse}
        className="hidden lg:flex absolute -right-3 top-8 items-center justify-center h-6 w-6 rounded-full border border-umbra-line bg-umbra-ink text-umbra-muted hover:text-umbra-lilac hover:border-umbra-purple/50 transition-colors shadow-[0_0_10px_rgba(0,0,0,0.5)] z-30"
        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {isCollapsed ? (
          <IconChevronRight className="h-3.5 w-3.5" />
        ) : (
          <IconChevronLeft className="h-3.5 w-3.5 pr-[1px]" />
        )}
      </button>

      {/* Logo Area */}
      <div className={`hidden border-b border-umbra-line lg:block relative overflow-hidden transition-all duration-200 ${isCollapsed ? "h-16" : "h-32"}`}>
        {/* Background Image Container */}
        <div 
          className="absolute inset-0 bg-[url('/assets/Logo.png')] bg-cover bg-center opacity-40 mix-blend-screen pointer-events-none" 
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-umbra-ink/90 pointer-events-none" />

        <Link href="/" className="relative z-10 w-full h-full flex flex-col items-center justify-center p-4 focus-ring">
          <span
            className={`font-display font-semibold tracking-[0.1em] text-umbra-lilac whitespace-nowrap text-center text-lg drop-shadow-[0_0_8px_rgba(168,85,247,0.8)] transition-all duration-200 ${
              isCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100 block"
            }`}
          >
            UMBRA
            <br />
            LUNARIA
          </span>
        </Link>
      </div>

      {/* Nav links */}
      <nav
        className="mx-auto flex max-w-md w-full justify-around p-2 lg:block lg:max-w-none lg:space-y-2 lg:p-4"
        aria-label="Primary navigation"
      >
        {links.map(([icon, label, href]) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              title={isCollapsed ? label : undefined}
              className={`focus-ring flex flex-col items-center justify-center gap-1 px-2 py-1.5 rounded-lg border text-label lg:flex-row lg:gap-4 lg:h-12 lg:py-0 transition-all duration-200 ${
                active
                  ? "border-umbra-purple/40 bg-umbra-purple/10 text-umbra-lilac shadow-[0_0_15px_rgba(168,85,247,0.25)]"
                  : "border-transparent text-umbra-muted hover:border-umbra-purple/40 hover:bg-white/[.02] hover:text-umbra-lilac hover:shadow-[0_0_15px_rgba(168,85,247,0.4)] backdrop-blur-md"
              } ${isCollapsed ? "lg:justify-center lg:px-0" : "lg:justify-start lg:px-4"}`}
            >
              <span className={`w-5 h-5 shrink-0 flex items-center justify-center leading-none ${active ? "text-umbra-lilac drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]" : "text-umbra-purple"}`}>
                {icon}
              </span>
              <span
                className={`whitespace-nowrap overflow-hidden text-sm font-medium transition-all duration-200 ${
                  isCollapsed ? "lg:w-0 lg:opacity-0 lg:hidden" : "lg:w-auto lg:opacity-100 lg:block"
                }`}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Status footer */}
      <div
        className={`absolute bottom-0 hidden w-full border-t border-umbra-line px-5 py-4 lg:block transition-opacity duration-200 ${
          isCollapsed ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
      >
        <span className="flex items-center gap-1.5 font-mono text-label uppercase tracking-wider text-emerald-300">
          <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
          Systems nominal
        </span>
        <p className="mt-0.5 text-xs text-umbra-muted/70">
          Tracking the clan quietly.
        </p>
      </div>
    </aside>
  );
}
