import "./globals.css";

import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata, Viewport } from "next";

import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { resolveLocale } from "@/lib/i18n/resolve-locale";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: {
    default: "Relay, AI Receptionist for Service Businesses",
    template: "%s, Relay",
  },
  description:
    "Voice AI agents that answer your calls, schedule appointments, and qualify leads 24/7.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#6c47e4",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // `<html lang>` only — actual translation lookup happens inside each
  // segment's NextIntlClientProvider. Using the cookie / Accept-Language
  // resolver here (not the DB tier) keeps the root render cheap; the (app)
  // layout overrides downstream when the signed-in user has a different
  // saved preference.
  const locale = await resolveLocale();

  return (
    <html lang={locale} suppressHydrationWarning>
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
