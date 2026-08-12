import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  images: {
    formats: ["image/webp"],
    deviceSizes: [390, 512, 576, 640, 750, 828, 1080, 1200, 1440, 1920, 2048, 3840],
    qualities: [75, 85],
    remotePatterns: [
      { protocol: "https", hostname: "commons.wikimedia.org" },
      { protocol: "https", hostname: "upload.wikimedia.org" },
      { protocol: "https", hostname: "geoserveis.icgc.cat" }
    ]
  }
};

export default nextConfig;
