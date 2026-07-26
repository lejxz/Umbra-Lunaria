import type { Metadata } from "next";
import { Cinzel, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Navigation } from "@/components/navigation";
import { PageTransition } from "@/components/ui/page-transition";
import { Footer } from "@/components/layout/footer";
import { getPollStatuses } from "@/lib/db/queries";
import { cookies } from "next/headers";

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
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const isCollapsed = cookieStore.get("umbra_sidebar_collapsed")?.value === "true";

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
          <Navigation initialCollapsed={isCollapsed} />
          <main className="flex min-h-screen min-w-0 flex-1 flex-col pb-20 lg:pb-0">
            <div className="flex-1">
              <PageTransition>{children}</PageTransition>
            </div>
            <Footer statuses={pollStatuses} serverNow={Date.now()} />
          </main>
        </div>
      </body>
    </html>
  );
}
