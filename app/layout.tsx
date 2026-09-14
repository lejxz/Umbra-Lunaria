import type { Metadata, Viewport } from "next";
import { Cinzel, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Navigation } from "@/components/navigation";
import { PageTransition } from "@/components/ui/page-transition";
import { Footer } from "@/components/layout/footer";
import { ServiceWorkerRegistration } from "@/components/pwa/service-worker";
import { getPollStatuses } from "@/lib/db/queries";

/**
 * Font loading via next/font — ensures the custom fonts (Cinzel, Inter,
 * JetBrains Mono) are properly loaded and optimized. Previously these were
 * only referenced in CSS variables with no actual font loading — the browser
 * fell back to Georgia / system-ui / monospace.
 *
 * next/font automatically:
 * - Downloads the font files at build time (no runtime fetch)
 * - Self-hosts them (no Google Fonts CDN request at runtime)
 * - Optimizes file size (only loads the weights we use)
 * - Prevents layout shift (font-display: swap by default)
 *
 * The CSS variables (--font-display, --font-sans, --font-mono) are set on
 * <html> and referenced by tailwind.config.ts → fontFamily + globals.css.
 */

const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Umbra Lunaria",
  description: "Clan dashboard",
  // PWA shell (docs/2026-09-11-implementation-plan.md Phase 5). The
  // manifest + `app/apple-icon.png` file convention make the app
  // installable; the SW itself is registered by
  // components/pwa/service-worker.tsx and can be killed via
  // clanConfig.features.pwa without touching this file.
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    // Generates <meta name="apple-mobile-web-app-capable" content="yes">
    // plus the apple-mobile-web-app-title / status-bar-style metas. iOS
    // ignores the manifest's display/theme fields, so these are required
    // for the standalone look on iPhone/iPad.
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Umbra Lunaria",
  },
  // Next 15.5 emits the unprefixed <meta name="mobile-web-app-capable">
  // from `capable: true` above; the explicitly apple-prefixed variant is
  // still what older iOS Safari versions (and the Phase 5 plan) look for,
  // so emit both — belt and braces, no conflict.
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
};

// themeColor lives in the viewport export per the Next 15 Metadata API
// (it generates <meta name="theme-color"> — OS title-bar / task-switcher
// tint on Android and standalone windows).
export const viewport: Viewport = {
  themeColor: "#090811",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // NOTE (ISR fix, docs/2026-09-11-priority-fixes.md):
  // The sidebar collapse state used to be read here via `await cookies()`.
  // That call is a dynamic API — it opted the ENTIRE route tree into dynamic
  // rendering, silently disabling ISR on all six pages (every `export const
  // revalidate` was dead code and every pageview hit the DB).
  // The sidebar now restores its state from localStorage on mount
  // (components/navigation.tsx) and this layout stays fully static-friendly.

  // Fetch poll statuses once per page render for the global freshness footer.
  // Best-effort: if the DB is unreachable, render the footer with nulls so the
  // page still loads (the footer shows "—" for every field).
  let pollStatuses;
  try {
    pollStatuses = await getPollStatuses();
  } catch {
    pollStatuses = {
      lastPoll: null,
      lastBatch: null,
      trackingStart: null,
      warSynced: null,
    };
  }

  return (
    <html
      lang="en"
      className={`${cinzel.variable} ${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-screen antialiased">
        <div className="min-h-screen lg:flex">
          <Navigation />
          <main className="flex min-h-screen min-w-0 flex-1 flex-col pb-20 lg:pb-0">
            <div className="flex-1">
              <PageTransition>{children}</PageTransition>
            </div>
            <Footer statuses={pollStatuses} serverNow={Date.now()} />
          </main>
        </div>
        {/* PWA shell — registers /sw.js in production; kill switch in
            clanConfig.features.pwa. Renders nothing. */}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
