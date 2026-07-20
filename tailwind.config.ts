import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: { colors: { umbra: { purple: "#A964FF", indigo: "#7645D9", lilac: "#E2D4F6", base: "#0B0914", surface: "#151124", elevated: "#1E1833", muted: "#8C81A8" } }, fontFamily: { display: ["var(--font-display)"], sans: ["var(--font-sans)"], mono: ["var(--font-mono)"] }, boxShadow: { glow: "0 0 15px rgba(169, 100, 255, 0.4)" } },
  },
  plugins: [],
} satisfies Config;
