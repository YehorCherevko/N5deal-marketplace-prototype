import type { NextConfig } from "next";

const config: NextConfig = {
  // File watching across Docker Desktop bind mounts.
  webpack(config, { dev }) {
    if (dev) config.watchOptions = { ...config.watchOptions, poll: 1000, aggregateTimeout: 300 };
    return config;
  },
};

export default config;
