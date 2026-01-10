import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "3000",
        pathname: "/api/storage/**",
      },
      {
        protocol: "https",
        hostname: "**", // Allow all HTTPS domains (for production cloud storage)
      },
    ],
  },
};

export default nextConfig;
