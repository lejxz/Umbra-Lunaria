import type { ReactNode } from "react";

/**
 * Badge — semantic pill with a glowing dot.
 *
 * Tones map to the celestial semantic palette: good/warn/danger/info/brand/muted.
 * The dot carries a matching glow so status reads at a glance.
 */
export function Badge({
  children,
  tone = "brand",
  dot = true,
}: {
  children: ReactNode;
  tone?: "brand" | "success" | "warning" | "danger" | "info" | "muted";
  dot?: boolean;
}) {
  const toneClass = {
    brand: "badge brand",
    success: "badge good",
    warning: "badge warn",
    danger: "badge danger",
    info: "badge info",
    muted: "badge muted",
  }[tone];

  return (
    <span className={toneClass}>
      {dot && <span className="d" aria-hidden />}
      {children}
    </span>
  );
}
