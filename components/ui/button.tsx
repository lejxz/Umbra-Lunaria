"use client";

/**
 * Button — the shared button primitive.
 *
 * Extracted from the inline pattern used across navigation.tsx,
 * war-refresh-button.tsx, and tabs.tsx. Three variants, three sizes.
 * All use rounded-lg, focus-ring, transition.
 *
 * Replaces hand-crafted <button> elements with inline Tailwind strings.
 */

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

type Variant = "primary" | "ghost" | "icon";
type Size = "sm" | "md" | "lg";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "border-umbra-purple/40 bg-umbra-purple/10 text-umbra-purple hover:bg-umbra-purple/10",
  ghost:
    "border-umbra-line text-umbra-muted hover:text-umbra-lilac hover:bg-white/[.04]",
  icon:
    "border-transparent text-umbra-muted hover:text-umbra-lilac hover:bg-white/[.04]",
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: "px-3 py-1.5 text-2xs gap-1",
  md: "px-4 py-2 text-label gap-1.5",
  lg: "px-5 py-2.5 text-xs gap-2",
};

const ICON_SIZE_CLASSES: Record<Size, string> = {
  sm: "p-1.5 h-7 w-7",
  md: "p-2 h-8 w-8",
  lg: "p-2.5 h-9 w-9",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  children?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "ghost", size = "md", icon, children, className, ...props }, ref) => {
    const isIconOnly = variant === "icon" || (!!icon && !children);

    const classes = [
      "focus-ring inline-flex items-center justify-center font-semibold uppercase tracking-wider transition disabled:opacity-40 disabled:cursor-not-allowed",
      isIconOnly ? "" : "rounded-lg border",
      VARIANT_CLASSES[variant],
      isIconOnly ? ICON_SIZE_CLASSES[size] : SIZE_CLASSES[size],
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <button ref={ref} className={classes} {...props}>
        {icon && <span className="shrink-0">{icon}</span>}
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
