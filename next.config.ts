import type { NextConfig } from "next";

// The production host caps threads and memory hard enough that tsc is killed
// mid-build and seven page-data workers hit pthread_create. Types are checked
// separately (`npx tsc --noEmit`), so the deploy build only compiles.
const nextConfig: NextConfig = {
  // `next build` empties its output directory before it starts, and the live
  // server keeps serving from that directory the whole time — so a deploy used
  // to take the stylesheet down for the length of the build. The deploy script
  // builds into a staging directory and swaps it in with a mv instead.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  typescript: { ignoreBuildErrors: true },
  experimental: {
    cpus: 1,
    workerThreads: false,
  },
};

export default nextConfig;
