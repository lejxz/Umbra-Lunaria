/**
 * Eyebrow — the section kicker text component.
 *
 * Replaces the 37+ inline `font-mono text-label uppercase tracking-[.16em] text-umbra-purple`
 * instances across components. Supports accent colors per section.
 *
 * See docs/ui-redesign-implementation-plan.md §3.2 for the spec.
 */

type Accent = "purple" | "amber" | "yellow" | "emerald" | "sky" | "rose";

const ACCENT_COLOR: Record<Accent, string> = {
  purple: "text-umbra-purple",
  amber: "text-amber-400",
  yellow: "text-yellow-400",
  emerald: "text-emerald-400",
  sky: "text-sky-400",
  rose: "text-rose-400",
};

export function Eyebrow({
  children,
  accent = "purple",
  className,
}: {
  children: React.ReactNode;
  accent?: Accent;
  className?: string;
}) {
  return (
    <p
      className={[
        "font-mono text-label uppercase tracking-[.16em]",
        ACCENT_COLOR[accent],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </p>
  );
}
