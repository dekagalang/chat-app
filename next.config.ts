import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "frame-ancestors 'self' https://cpanel.autolaris.com https://app.autolaris.com",
          },
        ],
      },
    ];
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'down-id.img.susercontent.com',
      },
      {
        protocol: 'https',
        hostname: '**.img.susercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'api-shop.autolaris.com',
      },
      {
        protocol: 'https',
        hostname: 'miledata.obs.ap-southeast-4.myhuaweicloud.com',
      },
    ],
  },
};

export default nextConfig;
