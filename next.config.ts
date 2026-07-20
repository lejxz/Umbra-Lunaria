import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The repo lives inside a parent workspace that has its own bun.lock.
  // Pin the workspace root to this directory so Next.js doesn't get
  // confused by the multiple lockfiles.
  outputFileTracingRoot: import.meta.dirname,
};

export default nextConfig;
