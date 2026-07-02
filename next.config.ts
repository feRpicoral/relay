import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
  },
  async redirects() {
    return [
      { source: "/dashboard", destination: "/overview", permanent: false },
      { source: "/calls/live", destination: "/live", permanent: false },
    ];
  },
  async headers() {
    const baseSecurityHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    ];
    return [
      {
        // The static marketing mockups are framed same-origin by the landing
        // page, so they opt into SAMEORIGIN. The app itself stays DENY below.
        source: "/marketing-screens/:path*",
        headers: [...baseSecurityHeaders, { key: "X-Frame-Options", value: "SAMEORIGIN" }],
      },
      {
        source: "/((?!marketing-screens).*)",
        headers: [...baseSecurityHeaders, { key: "X-Frame-Options", value: "DENY" }],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
