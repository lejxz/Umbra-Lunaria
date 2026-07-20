import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: { colors: { umbra: { purple: "#B678FF", indigo: "#7552DF", lilac: "#EEE5FF", ink: "#090811", base: "#0B0914", surface: "#12101C", elevated: "#211B34", muted: "#9287AD", line: "rgba(190,151,255,.15)" } }, fontFamily: { display: ["var(--font-display)"], sans: ["var(--font-sans)"], mono: ["var(--font-mono)"] }, boxShadow: { glow: "0 0 22px rgba(182, 120, 255, .42)" } },
  },
  plugins: [],
} satisfies Config;
