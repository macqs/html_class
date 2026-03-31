import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: ["http://127.0.0.1", "http://localhost"],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
