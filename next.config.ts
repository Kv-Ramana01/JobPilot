import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  // serverActions bodySizeLimit moved to root level in Next.js 15+
  experimental: {},
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;