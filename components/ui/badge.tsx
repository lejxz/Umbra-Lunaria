import type { ReactNode } from "react";

export function Badge({
  children,
  tone = "brand",
}: {
  children: ReactNode;
  tone?: "brand" | "success" | "warning" | "danger" | "muted" | "info";
}) {
  const toneClass = {
    brand: "border-umbra-purple/40 bg-umbra-purple/15 text-umbra-purple",
    success: "border-emerald-400/30 bg-emerald-400/10 text-emerald-400",
    warning: "border-amber-400/30 bg-amber-400/10 text-amber-400",
    danger: "border-rose-400/30 bg-rose-400/10 text-rose-400",
    muted: "border-white/10 bg-white/5 text-umbra-muted",
    info: "border-sky-400/30 bg-sky-400/10 text-sky-400",
  }[tone];

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[0.65rem] uppercase tracking-widest ${toneClass}`}
    >
      {children}
    </span>
  );
}
