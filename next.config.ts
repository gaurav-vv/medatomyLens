import type { NextConfig } from "next";

// Static export: the app is a client-only PWA with no server (free hosting,
// reports never leave the device). See docs/ARCHITECTURE.md.
const nextConfig: NextConfig = {
  output: "export",
  // Optional sub-path hosting (e.g. GitHub Pages): see lib/basePath.ts.
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || undefined,
  images: { unoptimized: true },
  reactStrictMode: true,
};

export default nextConfig;
