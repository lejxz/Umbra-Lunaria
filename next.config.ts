import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The repo lives inside a parent workspace that has its own bun.lock.
  // Pin the workspace root to this directory so Next.js doesn't get
  // confused by the multiple lockfiles.
  outputFileTracingRoot: import.meta.dirname,
  images: {
    // Supercell's CDN serves clan badges, league icons, label icons, and
    // league-tier icons. These are API-provided image URLs stored in the DB.
    // See concept/01-tech-stack.md "Asset policy" and concept/06-members.md.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api-assets.clashofclans.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
