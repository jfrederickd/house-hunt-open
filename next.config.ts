import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the native SQLite driver out of the bundle — it must be require()d
  // from node_modules at runtime, not bundled by the compiler.
  serverExternalPackages: ["better-sqlite3", "@prisma/adapter-better-sqlite3"],

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control", value: "off" },
        ],
      },
    ];
  },
};

export default nextConfig;
