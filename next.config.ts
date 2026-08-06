import type { NextConfig } from "next";

// The production host caps threads and memory hard enough that tsc is killed
// mid-build and seven page-data workers hit pthread_create. Types are checked
// separately (`npx tsc --noEmit`), so the deploy build only compiles.
const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
  experimental: {
    cpus: 1,
    workerThreads: false,
  },
};

export default nextConfig;
