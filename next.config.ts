import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Fix Turbopack canvas alias (used with `next dev --turbopack`)
  turbopack: {
    resolveAlias: {
      canvas: "./lib/parsers/canvasMock.js",
    },
  },
  webpack: (config, { isServer }) => {
    // Handle canvas and other Node.js modules for client-side
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        canvas: path.resolve("./lib/parsers/canvasMock.js"),
      };

      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }

    return config;
  },
};

export default nextConfig;
