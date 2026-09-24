import type { NextConfig } from "next";
const config: NextConfig = {
  ...(process.env.NETLIFY ? {} : { output: "standalone" as const }),
  outputFileTracingExcludes: {
    "/*": ["./data/**/*", "./outputs/**/*", "./.env*"],
  },
  distDir: process.env.NEXT_DIST_DIR || ".next",
  poweredByHeader: false,
  allowedDevOrigins: (process.env.DEV_ALLOWED_ORIGINS || "")
    .split(",")
    .map((hostname) => hostname.trim())
    .filter(Boolean),
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};
export default config;
