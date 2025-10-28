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
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
  },
  // Allow larger request body sizes for file uploads (default is 4MB)
  experimental: {
    serverActions: {
      bodySizeLimit: '100mb',
    },
  },
  // Increase API route body size limit
  api: {
    bodyParser: {
      sizeLimit: '100mb',
    },
  },
};

export default nextConfig;
