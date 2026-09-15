import type { NextConfig } from "next";

const backendApiOrigin = (process.env.BACKEND_API_ORIGIN ?? "http://localhost:8080").replace(/\/$/, "");

if (!/^https?:\/\//.test(backendApiOrigin)) {
  throw new Error("BACKEND_API_ORIGIN must be an absolute HTTP(S) origin.");
}

const nextConfig: NextConfig = {
  async rewrites() {
    return [{
      source: "/api/v1/:path*",
      destination: `${backendApiOrigin}/api/v1/:path*`,
    }];
  },
};

export default nextConfig;
