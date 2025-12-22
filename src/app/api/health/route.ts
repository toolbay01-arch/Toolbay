import { NextResponse } from 'next/server';

/**
 * Health check endpoint for Railway/Vercel
 * Helps prevent cold starts by keeping the service warm
 */
export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'toolbay',
    },
    {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    }
  );
}
