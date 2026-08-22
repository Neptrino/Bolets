import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  async headers() {
    return [
      {
        // The worker decides what is cached, so it must never itself be served
        // from a cache: a stale worker would pin an old caching policy.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
      {
        source: "/media/optimized/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "www.bolets.app",
          },
        ],
        destination: "https://bolets.app/:path*",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "bolets.neptrino.com",
          },
        ],
        destination: "https://bolets.app/:path*",
        permanent: true,
      },
      {
        source: "/species",
        destination: "/bolets",
        permanent: true,
      },
      {
        source: "/species/:path*",
        destination: "/bolets/:path*",
        permanent: true,
      },
    ];
  },
  images: {
    formats: ["image/webp"],
    deviceSizes: [384, 640, 960, 1280, 1920],
    imageSizes: [64, 96, 192, 256],
    qualities: [65, 75],
    minimumCacheTTL: 2678400,
    remotePatterns: [
      { protocol: "https", hostname: "commons.wikimedia.org" },
      { protocol: "https", hostname: "upload.wikimedia.org" },
      { protocol: "https", hostname: "geoserveis.icgc.cat" }
    ]
  }
};

export default nextConfig;
