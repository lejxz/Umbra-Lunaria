import type { NextConfig } from "next";

// fix (docs/2026-09-11-priority-fixes.md, security hardening): baseline
// security headers. The app previously sent none — including the default
// X-Powered-By banner. The CSP is deliberately moderate: Next.js's RSC
// payload requires inline scripts (no nonce plumbing in this codebase), so
// script-src keeps 'unsafe-inline'/'unsafe-eval', but every other resource
// class is pinned to self + the CoC asset CDN.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // next/image optimizes CoC CDN badges/icons through /_next/image, but
      // allow the asset host directly too for unoptimized edge cases.
      "img-src 'self' https://api-assets.clashofclans.com data: blob:",
      // Next.js injects inline styles (Tailwind vars, RSC flight data).
      "style-src 'self' 'unsafe-inline'",
      // Required by the Next.js RSC/hydration payload.
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "font-src 'self' data:",
      // The app itself only calls its own API routes from the browser.
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  // The repo lives inside a parent workspace that has its own bun.lock.
  // Pin the workspace root to this directory so Next.js doesn't get
  // confused by the multiple lockfiles.
  outputFileTracingRoot: import.meta.dirname,
  // Don't advertise the framework.
  poweredByHeader: false,
  images: {
    // Supercell's CDN serves clan badges, league icons, label icons, and
    // league-tier icons. These are API-provided image URLs stored in the DB.
    // See docs/concept/01-tech-stack.md "Asset policy" and docs/concept/06-members.md.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api-assets.clashofclans.com",
        pathname: "/**",
      },
    ],
    // Allow local SVG placeholders for unit icons.
    dangerouslyAllowSVG: true,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      {
        // PWA shell (Phase 5): sw.js and the manifest must never be held
        // by an immutable CDN cache — the browser's service-worker update
        // check and manifest re-fetch must see current bytes. no-cache still
        // permits disk caching, it only forces revalidation.
        source: "/sw.js",
        headers: [{ key: "Cache-Control", value: "no-cache" }],
      },
      {
        source: "/manifest.webmanifest",
        headers: [
          { key: "Cache-Control", value: "no-cache" },
          // Correct MIME type for install prompts on every host (Next serves
        // it correctly already, but this pins it independent of host config).
          { key: "Content-Type", value: "application/manifest+json" },
        ],
      },
    ];
  },
};

export default nextConfig;
