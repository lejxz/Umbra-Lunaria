import type { Config } from "tailwindcss";

/**
 * Celestial Observatory design tokens.
 *
 * The palette is a dark, moonlit observatory: a true-void background,
 * calibrated line opacities, deep-violet surfaces, and one astral purple
 * that carries every glow. Every colour below is the single source of truth —
 * components must not introduce stray hex values.
 *
 * Surface tiers:
 *   surface   — L1 card (the standard .glass / .lunar-card)
 *   elevated  — L2 tile (inner stat box, .lunar-tile)
 *   raised    — L3 modal / sheet (the lunar-panel)
 */
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        umbra: {
          // ── Void & surfaces ────────────────────────────────────────────
          void: "#050309", // page background — true void
          ink: "#0A0813", // app base
          base: "#0B0914", // legacy alias (kept for any stray references)
          surface: "#12101C", // L1 card
          "surface-2": "#181527", // L1.5
          elevated: "#1F1A33", // L2 tile / hover
          raised: "#271F45", // L3 modal / sheet

          // ── Astral accents ────────────────────────────────────────────
          purple: "#B678FF", // primary glow
          indigo: "#4B2FA0", // deepest accent
          violet: "#7552DF", // deep accent
          lilac: "#EEE5FF", // primary text
          moonlight: "#F2EEFF", // brightest — headings
          muted: "#B0A4CC", // secondary text
          faint: "#6B6488", // labels / mono captions
          ghost: "#4A4466", // disabled

          // ── Lines (calibrated opacities) ──────────────────────────────
          line: "rgba(190,151,255,.12)", // resting border
          "line-bright": "rgba(190,151,255,.28)", // hover / active border
          "line-soft": "rgba(190,151,255,.06)", // dividers
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        glow: "0 0 24px rgba(182,120,255,.38)",
        "glow-sm": "0 0 14px rgba(182,120,255,.28)",
        "glow-lg":
          "0 0 48px rgba(182,120,255,.30), 0 0 12px rgba(182,120,255,.20)",
        "lunar-card":
          "0 1px 0 rgba(238,229,255,.04) inset, 0 18px 40px -24px rgba(0,0,0,.7)",
        "lunar-hover":
          "0 1px 0 rgba(238,229,255,.06) inset, 0 0 0 1px rgba(182,120,255,.10), 0 24px 50px -24px rgba(75,47,160,.55)",
      },
      borderRadius: {
        "r-sm": "8px",
        "r-md": "12px",
        "r-lg": "18px",
      },
      transitionTimingFunction: {
        lunar: "cubic-bezier(.22,.61,.36,1)",
        "lunar-back": "cubic-bezier(.34,1.56,.64,1)",
      },
      transitionDuration: {
        "140": "140ms",
        "220": "220ms",
        "360": "360ms",
      },
      keyframes: {
        twinkle: {
          from: { opacity: ".45" },
          to: { opacity: ".75" },
        },
        "spin-slow": {
          to: { transform: "rotate(360deg)" },
        },
        "pulse-soft": {
          "0%,100%": { opacity: "1" },
          "50%": { opacity: ".4" },
        },
        "drift-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "glow-breathe": {
          "0%,100%": { boxShadow: "0 0 14px rgba(182,120,255,.28)" },
          "50%": { boxShadow: "0 0 22px rgba(182,120,255,.42)" },
        },
        "bar-rise": {
          from: { transform: "scaleY(0)", opacity: "0" },
          to: { transform: "scaleY(1)", opacity: "1" },
        },
      },
      animation: {
        twinkle: "twinkle 8s ease-in-out infinite alternate",
        "spin-slow": "spin-slow 60s linear infinite",
        "spin-reverse": "spin-slow 90s linear infinite reverse",
        "spin-fast": "spin-slow 40s linear infinite",
        "pulse-soft": "pulse-soft 2.4s ease-in-out infinite",
        "drift-up": "drift-up .5s cubic-bezier(.22,.61,.36,1) forwards",
        "glow-breathe": "glow-breathe 3.6s ease-in-out infinite",
        "bar-rise": "bar-rise .5s cubic-bezier(.22,.61,.36,1) forwards",
      },
      fontSize: {
        micro: ["0.5625rem", { lineHeight: "1rem" }], //  9px
        label: ["0.625rem", { lineHeight: "1rem" }], // 10px
        "2xs": ["0.6875rem", { lineHeight: "1.125rem" }], // 11px
        xs: ["0.8125rem", { lineHeight: "1.25rem" }], // 13px
        sm: ["0.9375rem", { lineHeight: "1.375rem" }], // 15px
        base: ["1.0625rem", { lineHeight: "1.625rem" }], // 17px
      },
    },
  },
  plugins: [],
} satisfies Config;
