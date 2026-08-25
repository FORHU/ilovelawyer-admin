import type { NextConfig } from "next";
import { AUTH_PATHS } from "./src/lib/api-version";

// Server-to-server proxy target (read at build/runtime in Node, not sent to the
// browser as-is).
const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001").replace(/\/$/, "");

const nextConfig: NextConfig = {
  async rewrites() {
    return AUTH_PATHS.map((source) => ({ source, destination: `${API_URL}${source}` }));
  },
};

export default nextConfig;
