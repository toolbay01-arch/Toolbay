import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ensure proper output for Railway deployment
  output: 'standalone',
  
  // Ensure external packages are included in standalone
  serverExternalPackages: ['ws', 'web-push', 'mongodb'],
  
  // Ensure client components are properly bundled
  experimental: {
    serverActions: {
      bodySizeLimit: '100mb',
    },
    // Optimize package imports to reduce bundle size
    optimizePackageImports: ['@radix-ui/react-icons', 'lucide-react'],
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
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
