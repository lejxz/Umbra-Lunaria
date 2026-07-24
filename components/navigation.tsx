"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  NavIconDashboard,
  NavIconMembers,
  NavIconWar,
  NavIconCapital,
  NavIconPlanning,
  IconChevronLeft,
  IconChevronRight,
} from "@/components/ui/icons";

const links = [
  [<NavIconDashboard key="dash" />, "Dashboard", "/"],
  [<NavIconMembers key="members" />, "Members", "/members"],
  [<NavIconWar key="war" />, "War center", "/war"],
  [<NavIconCapital key="cap" />, "Capital", "/capital"],
  [<NavIconPlanning key="plan" />, "Planning", "/planning"],
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
      className={`fixed inset-x-0 bottom-0 z-20 border-t border-umbra-line bg-umbra-ink/95 backdrop-blur-xl lg:sticky lg:top-0 lg:h-screen lg:shrink-0 lg:border-r lg:border-t-0 transition-[width] duration-300 ease-in-out ${
        isCollapsed ? "lg:w-20" : "lg:w-60"
      }`}
    >
      {/* Collapse Toggle Button - sits perfectly on the border */}
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

      <div className={`hidden border-b border-umbra-line lg:flex items-center transition-all duration-300 overflow-hidden ${isCollapsed ? "p-4 justify-center" : "p-6"}`}>
        <Link href="/" className="flex items-center gap-3">
          <img
            src="/assets/Logo.png"
            alt=""
            className="h-10 w-10 shrink-0 rounded-full object-cover shadow-glow"
          />
          <span
            className={`font-display text-sm font-semibold tracking-[0.08em] text-umbra-lilac transition-all duration-300 whitespace-nowrap ${
              isCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100 block"
            }`}
          >
            UMBRA
            <br />
            LUNARIA
          </span>
        </Link>
      </div>

      <nav
        className="mx-auto flex max-w-md justify-around p-2 lg:block lg:max-w-none lg:space-y-1 lg:p-4"
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
              className={`focus-ring flex flex-col items-center gap-1 rounded-[10px] border px-3 py-2 text-label transition-all duration-300 lg:flex-row lg:gap-3 lg:py-3 lg:text-sm ${
                active
                  ? "border-umbra-line bg-umbra-purple/10 text-umbra-lilac"
                  : "border-transparent text-umbra-muted hover:bg-white/5 hover:text-umbra-lilac"
              } ${isCollapsed ? "lg:px-0 lg:justify-center" : "lg:px-4"}`}
            >
              <span className="w-5 shrink-0 text-center text-base leading-none text-umbra-purple">
                {icon}
              </span>
              <span
                className={`transition-all duration-300 whitespace-nowrap overflow-hidden ${
                  isCollapsed ? "lg:w-0 lg:opacity-0 lg:hidden" : "lg:w-auto lg:opacity-100 lg:block"
                }`}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </nav>

      <div
        className={`absolute bottom-5 hidden border-t border-umbra-line px-6 pt-5 text-xs leading-5 text-umbra-muted transition-opacity duration-300 whitespace-nowrap lg:block ${
          isCollapsed ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
      >
        <span className="font-mono text-label uppercase tracking-wider text-emerald-300">
          ● Systems nominal
        </span>
        <br />
        Tracking the clan quietly in the background.
      </div>
    </aside>
  );
}
