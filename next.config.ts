import type { NextConfig } from "next";
import { AUTH_PATHS } from "./src/lib/api-version";

// Server-to-server proxy target (read at build/runtime in Node, not sent to the
// browser as-is).
const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001").replace(/\/$/, "");

const nextConfig: NextConfig = {
  output: "standalone",
  // Quote payments was split up: client payments are a Billing tab, wallets a Lawyer exits tab, and
  // the sidebar item became Lawyer subscriptions. Old links and bookmarks land on the new pages.
  async redirects() {
    return [
      { source: "/dashboard/quote-payments", destination: "/dashboard/billing/quote-payments", permanent: false },
      { source: "/dashboard/quote-payments/wallets", destination: "/dashboard/lawyer-exits/wallets", permanent: false },
    ];
  },
  async rewrites() {
    return AUTH_PATHS.map((source) => ({ source, destination: `${API_URL}${source}` }));
  },
};

export default nextConfig;
