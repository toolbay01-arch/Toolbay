/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ensure proper output for Railway deployment
  output: 'standalone',
  // Ensure client components are properly bundled
  experimental: {
    serverActions: {
      bodySizeLimit: '100mb',
    },
    // Optimize package imports to reduce bundle size
    optimizePackageImports: ['@radix-ui/react-icons', 'lucide-react'],
  },
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
};

export default nextConfig;
