import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ~/Projects has its own package.json; without this Next infers the wrong
  // workspace root and traces the entire Projects folder.
  outputFileTracingRoot: process.cwd(),
  eslint: { ignoreDuringBuilds: true },
  images: { remotePatterns: [{ protocol: "https", hostname: "**" }] },
};

export default nextConfig;
