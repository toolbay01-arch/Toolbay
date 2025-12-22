/**
 * Middleware to restrict PayloadCMS admin access
 * Only super-admin and tenant users can access /admin routes
 * Client (buyer) users are blocked from accessing the admin panel
 * 
 * Note: We can't use Payload directly in middleware due to Edge runtime limitations.
 * Instead, we'll check the auth cookie and decode it to get user roles.
 */

import { NextRequest, NextResponse } from 'next/server';

export async function checkPayloadAdminAccess(req: NextRequest): Promise<NextResponse | null> {
  // Only check /admin routes
  if (!req.nextUrl.pathname.startsWith('/admin')) {
    return null;
  }

  try {
    // Get the payload auth cookie
    const cookiePrefix = process.env.PAYLOAD_COOKIE_PREFIX || 'payload';
    const authCookie = req.cookies.get(`${cookiePrefix}-token`);

    // No auth cookie - let Payload handle the redirect to login
    if (!authCookie) {
      return null;
    }

    // Decode the JWT to check user roles
    // The cookie contains a JWT token with user data
    const token = authCookie.value;
    
    // Simple JWT payload extraction (without verification since this is just a check)
    // The real auth verification happens server-side in Payload
    const parts = token.split('.');
    if (parts.length !== 3 || !parts[1]) {
      return null; // Invalid token format, let Payload handle it
    }

    // Decode the payload (middle part of JWT)
    const payloadData = JSON.parse(
      Buffer.from(parts[1], 'base64').toString('utf-8')
    );

    // Check if payload has user roles
    if (!payloadData || !payloadData.collection || payloadData.collection !== 'users') {
      return null; // Not a user token, let Payload handle it
    }

    // Check user roles from the token
    // Note: This is a basic check. The real authorization happens server-side.
    const userRoles = payloadData.roles || [];
    
    const isSuperAdmin = userRoles.includes('super-admin');
    const isTenant = userRoles.includes('tenant');
    const isClient = userRoles.includes('client');

    // Allow super-admin and tenant users
    if (isSuperAdmin || isTenant) {
      return null;
    }

    // Block client users from accessing admin
    if (isClient) {
      return NextResponse.redirect(new URL('/my-account?error=access_denied', req.url));
    }

    // If user has no recognized role, let Payload handle it
    return null;
    
  } catch (error) {
    // On any error (JWT decode, etc.), allow the request to continue
    // and let Payload handle the real authentication
    console.error('Error checking Payload admin access:', error);
    return null;
  }
}
