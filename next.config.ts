import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next dev blocks cross-origin requests to dev-only assets/endpoints
  // (including Server Actions) from anywhere but localhost by default —
  // this app is being tested through a Cloudflare Tunnel, so that hostname
  // needs to be allowed explicitly. See
  // node_modules/next/dist/docs/.../allowedDevOrigins.md. Dev-mode only;
  // irrelevant once this runs as a production build (Phase 6).
  //
  // Deliberately NOT a "*.trycloudflare.com" wildcard: that would treat any
  // free Cloudflare Quick Tunnel (anyone can spin one up) as an allowed
  // Server Action caller, weakening the Origin-header CSRF check for this
  // app. The tunnel hostname below is a fixed, named tunnel this app
  // controls, not a wildcard.
  allowedDevOrigins: ["finflow.code-n-fun-house.top"],

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Blocks embedding this app in a third-party iframe (clickjacking
          // on authenticated pages/Server Actions).
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
