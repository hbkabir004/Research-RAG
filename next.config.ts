import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Add turbopack config to avoid errors
  turbopack: {
    rules: {
      // Handle canvas module in Turbopack
      '*.node': {
        loaders: ['empty-loader'],
      },
    },
  },
  webpack: (config, { isServer }) => {
    // Handle canvas and other Node.js modules for client-side
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        // Use our canvas mock
        canvas: require.resolve('./lib/parsers/canvasMock.js'),
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
