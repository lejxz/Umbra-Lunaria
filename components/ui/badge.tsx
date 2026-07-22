import type { ReactNode } from "react";

export function Badge({
  children,
  tone = "brand",
}: {
  children: ReactNode;
  tone?: "brand" | "success" | "warning" | "danger" | "muted";
}) {
  const toneClass = {
    brand: "border-umbra-purple/30 bg-umbra-purple/15 text-umbra-purple",
    success: "border-emerald-400/30 bg-emerald-400/10 text-emerald-400",
    warning: "border-amber-400/30 bg-amber-400/10 text-amber-400",
    danger: "border-red-400/30 bg-red-400/10 text-red-400",
    muted: "border-white/10 bg-white/5 text-umbra-muted",
  }[tone];

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-2xs font-semibold uppercase tracking-wider ${toneClass}`}
    >
      {children}
    </span>
  );
}
