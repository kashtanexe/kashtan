import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Demo store writes a JSON file; keep it out of the server bundle trace.
  outputFileTracingExcludes: { "*": [".data/**"] },
};

export default nextConfig;
