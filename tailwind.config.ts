import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: { 
      colors: { umbra: { purple: "#B678FF", indigo: "#7552DF", lilac: "#EEE5FF", ink: "#090811", base: "#0B0914", surface: "#12101C", elevated: "#211B34", muted: "#A89CC4", line: "rgba(190,151,255,.15)" } }, 
      fontFamily: { display: ["var(--font-display)"], sans: ["var(--font-sans)"], mono: ["var(--font-mono)"] }, 
      boxShadow: { glow: "0 0 22px rgba(182, 120, 255, .42)" },
      fontSize: {
        xs: ['0.8125rem', { lineHeight: '1.25rem' }], // 13px (up from 12px)
        sm: ['0.9375rem', { lineHeight: '1.375rem' }], // 15px (up from 14px)
        base: ['1.0625rem', { lineHeight: '1.625rem' }], // 17px (up from 16px)
      }
    },
  },
  plugins: [],
} satisfies Config;
