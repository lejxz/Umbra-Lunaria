import type { Metadata } from "next";
import { Cinzel, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Navigation } from "@/components/navigation";
import { PageTransition } from "@/components/ui/page-transition";
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
  return (
    <html
      lang="en"
      className={`${cinzel.variable} ${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-screen antialiased">
        <div className="min-h-screen lg:flex">
          <Navigation initialCollapsed={isCollapsed} />
          <main className="min-w-0 flex-1 pb-20 lg:pb-0">
            <PageTransition>{children}</PageTransition>
          </main>
        </div>
      </body>
    </html>
  );
}
