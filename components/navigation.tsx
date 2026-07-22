"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  NavIconDashboard,
  NavIconMembers,
  NavIconWar,
  NavIconCapital,
  NavIconPlanning,
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
  return (
    <aside className="fixed inset-x-0 bottom-0 z-20 border-t border-umbra-line bg-umbra-ink/95 backdrop-blur-xl lg:sticky lg:top-0 lg:h-screen lg:w-60 lg:shrink-0 lg:border-r lg:border-t-0">
      <div className="hidden border-b border-umbra-line p-6 lg:block">
        <Link href="/" className="flex items-center gap-3">
          <img
            src="/assets/Logo.png"
            alt=""
            className="h-10 w-10 rounded-full object-cover shadow-glow"
          />
          <span className="font-display text-sm font-semibold tracking-[0.08em] text-umbra-lilac">
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
              className={`focus-ring flex flex-col items-center gap-1 rounded-[10px] border px-3 py-2 text-label transition lg:flex-row lg:gap-3 lg:px-4 lg:py-3 lg:text-sm ${
                active
                  ? "border-umbra-line bg-umbra-purple/10 text-umbra-lilac"
                  : "border-transparent text-umbra-muted hover:bg-white/5 hover:text-umbra-lilac"
              }`}
            >
              <span className="w-5 text-center text-base leading-none text-umbra-purple">
                {icon}
              </span>
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="absolute bottom-5 hidden border-t border-umbra-line px-6 pt-5 text-xs leading-5 text-umbra-muted lg:block">
        <span className="font-mono text-label uppercase tracking-wider text-emerald-300">
          ● Systems nominal
        </span>
        <br />
        Tracking the clan quietly in the background.
      </div>
    </aside>
  );
}
