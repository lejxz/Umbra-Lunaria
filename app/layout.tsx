import type { Metadata } from "next";
import "./globals.css";
import { Navigation } from "@/components/navigation";

export const metadata: Metadata = {
  title: "Umbra Lunaria",
  description: "Clan dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased"><div className="min-h-screen lg:flex"><Navigation /><main className="min-w-0 flex-1 pb-20 lg:pb-0">{children}</main></div>
      </body>
    </html>
  );
}
