import "./globals.css";

import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata } from "next";

import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: {
    default: "Relay, AI Receptionist for Service Businesses",
    template: "%s, Relay",
  },
  description:
    "Voice AI agents that answer your calls, schedule appointments, and qualify leads 24/7.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          GeistSans.variable,
          GeistMono.variable,
          "bg-background text-foreground min-h-screen font-sans antialiased",
        )}
      >
        {/* Two-state theme: just light/dark, no "system" tier. Per-user
            persistence is handled inside the (app) layout by ThemeSync which
            calls setTheme() with the DB value on mount so the browser's
            localStorage always converges to the server-side preference. We
            DROP `disableTransitionOnChange` so the global CSS transition on
            background-color/color in globals.css actually runs on toggle. */}
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          {children}
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
