"use client";

/**
 * Button — the shared button primitive.
 *
 * Celestial Observatory variants:
 *  • primary — violet→purple gradient with a glow halo that intensifies on
 *    hover and lifts 1px on press.
 *  • ghost — translucent glass surface that brightens + glows on hover.
 *  • icon — square glass tile for icon-only actions.
 *
 * Three sizes (sm/md/lg). All use rounded-r-sm, focus-ring, 140ms transitions.
 */

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

type Variant = "primary" | "ghost" | "icon";
type Size = "sm" | "md" | "lg";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "btn-primary",
  ghost: "btn-ghost",
  icon: "btn-icon",
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: "px-3 py-1.5 text-2xs gap-1",
  md: "px-4 py-2 text-label gap-1.5",
  lg: "px-5 py-2.5 text-xs gap-2",
};

const ICON_SIZE_CLASSES: Record<Size, string> = {
  sm: "h-7 w-7",
  md: "h-8 w-8",
  lg: "h-9 w-9",
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
      "focus-ring inline-flex items-center justify-center font-semibold uppercase tracking-wider transition-all duration-150 ease-lunar disabled:cursor-not-allowed disabled:opacity-40",
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
