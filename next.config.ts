import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
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
