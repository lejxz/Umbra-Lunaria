"use client";

/**
 * CardMount — wraps a card with a fade-in + slide-up animation on mount.
 * Used on .glass card surfaces so cards "rise into view" like moonlight.
 *
 * Supports staggered timing via the `delay` prop (in seconds).
 *
 * Reduced motion: disables the slide-up transform, keeps the opacity fade.
 */

import { motion, useReducedMotion } from "framer-motion";

export function CardMount({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={{
        opacity: 0,
        y: prefersReducedMotion ? 0 : 8,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        duration: 0.2,
        ease: "easeOut",
        delay,
      }}
    >
      {children}
    </motion.div>
  );
}
