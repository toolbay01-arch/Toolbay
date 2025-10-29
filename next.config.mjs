/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.public.blob.vercel-storage.com',
      },
      {
        protocol: 'https',
        hostname: 'public.blob.vercel-storage.com',
      },
      // Allow images from the current deployment domain
      ...(process.env.NEXT_PUBLIC_APP_URL
        ? [
            {
              protocol: new URL(process.env.NEXT_PUBLIC_APP_URL).protocol.replace(':', ''),
              hostname: new URL(process.env.NEXT_PUBLIC_APP_URL).hostname,
            },
          ]
        : []),
      // Allow images from Vercel preview deployments
      ...(process.env.VERCEL_URL
        ? [
            {
              protocol: 'https',
              hostname: process.env.VERCEL_URL,
            },
          ]
        : []),
      {
        protocol: 'https',
        hostname: '**.shutterstock.com',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'https',
        hostname: 'localhost',
      },
    ],
  },
  // Allow larger request body sizes for file uploads
  experimental: {
    serverActions: {
      bodySizeLimit: '100mb',
    },
  },
};

export default nextConfig;
