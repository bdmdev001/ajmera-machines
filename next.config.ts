import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: ['192.168.1.51'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/z5xktswf/**',
        search: '',
      },
    ],
  },
  // The /products listing + detail pages were renamed to /pre-owned-machines.
  // Permanent redirects keep old indexed/bookmarked/shared links working.
  async redirects() {
    return [
      { source: '/products', destination: '/pre-owned-machines', permanent: true },
      { source: '/products/:slug*', destination: '/pre-owned-machines/:slug*', permanent: true },
    ];
  },
};

export default nextConfig;
