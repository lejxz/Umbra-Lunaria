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

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
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

export function Navigation() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

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
        mounted ? "transition-[width] duration-200 ease-out" : ""
      } ${isCollapsed ? "lg:w-16" : "lg:w-60"}`}
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {/* Collapse Toggle Button */}
      {mounted && (
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
      )}

      {/* Logo */}
      <div className={`hidden border-b border-umbra-line lg:flex items-center overflow-hidden ${mounted ? "transition-all duration-200" : ""} ${isCollapsed ? "p-4 justify-center" : "p-5"}`}>
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/assets/Logo.png"
            alt="Umbra Lunaria"
            width={40}
            height={40}
            className="h-10 w-10 shrink-0 rounded-full object-cover shadow-glow"
            unoptimized
          />
          <span
            className={`font-display text-sm font-semibold tracking-[0.08em] text-umbra-lilac whitespace-nowrap ${mounted ? "transition-all duration-200" : ""} ${
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
        className="mx-auto flex max-w-md justify-around p-2 lg:block lg:max-w-none lg:space-y-1 lg:p-3"
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
              className={`focus-ring flex flex-col items-center gap-1 rounded-lg border px-2 py-1.5 text-label lg:flex-row lg:gap-3 lg:py-2.5 lg:px-3 ${mounted ? "transition-all duration-200" : ""} ${
                active
                  ? "border-umbra-line bg-umbra-purple/10 text-umbra-lilac"
                  : "border-transparent text-umbra-muted hover:bg-white/[.04] hover:text-umbra-lilac"
              } ${isCollapsed ? "lg:justify-center lg:px-0" : ""}`}
            >
              <span className="w-5 h-5 shrink-0 leading-none text-umbra-purple">
                {icon}
              </span>
              <span
                className={`whitespace-nowrap overflow-hidden ${mounted ? "transition-all duration-200" : ""} ${
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
        className={`absolute bottom-0 hidden w-full border-t border-umbra-line px-5 py-4 lg:block ${mounted ? "transition-opacity duration-200" : ""} ${
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
