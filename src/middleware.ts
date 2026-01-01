import { NextRequest, NextResponse } from "next/server";
import { checkPayloadAdminAccess } from "./middleware-payload-access";

export const config = {
  matcher: [
     /*
     * Match all paths except for:
     * 1. /api routes
     * 2. /_next (Next.js internals)
     * 3. /_static (inside /public)
     * 4. all root files inside /public (e.g. /favicon.ico)
     */
    "/((?!api/|_next/|_static/|_vercel|media/|[\\w-]+\\.\\w+).*)",
  ],
};

export default async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  
  // Early return for API routes, static files, and Next.js internals
  // This avoids unnecessary processing for these paths
  if (
    url.pathname.startsWith('/api') || 
    url.pathname.startsWith('/_next') ||
    url.pathname.startsWith('/_static') ||
    url.pathname.startsWith('/_vercel') ||
    url.pathname.startsWith('/media/')
  ) {
    return NextResponse.next();
  }
  
  // Check PayloadCMS admin access for client users
  // This blocks client (buyer) users from accessing /admin routes
  const adminAccessCheck = await checkPayloadAdminAccess(req);
  if (adminAccessCheck) {
    return adminAccessCheck;
  }
  
  // Check if subdomain routing is enabled
  const isSubdomainRoutingEnabled = process.env.NEXT_PUBLIC_ENABLE_SUBDOMAIN_ROUTING === "true";
  
  // Skip subdomain routing if disabled (e.g., in development)
  if (!isSubdomainRoutingEnabled) {
    return NextResponse.next();
  }
  
  // Extract the hostname (e.g., "antonio.toolbay.com" or "john.localhost:3000")
  const hostname = req.headers.get("host") || "";
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "";

  if (hostname.endsWith(`.${rootDomain}`)) {
    const tenantSlug = hostname.replace(`.${rootDomain}`, "");
    
    // Routes that should NOT be rewritten to tenant paths
    // These are global routes that exist outside the tenant context
    const globalRoutes = [
      '/sign-in',
      '/sign-up',
      '/forgot-password',
      '/reset-password',
      '/verify-email',
      '/admin',
      '/dashboard',
    ];
    
    // Check if the current path starts with any global route
    const isGlobalRoute = globalRoutes.some(route => 
      url.pathname === route || url.pathname.startsWith(`${route}/`)
    );
    
    // Don't rewrite global routes - let them go to their normal paths
    if (isGlobalRoute) {
      return NextResponse.next();
    }
    
    // Handle paths that already include /tenants/[slug]
    // This can happen if URLs are hardcoded or links are generated incorrectly
    let targetPath = url.pathname;
    const tenantPathPattern = new RegExp(`^/tenants/[^/]+`);
    
    if (tenantPathPattern.test(url.pathname)) {
      // If the path already includes /tenants/[slug], just use it as-is
      // This allows backward compatibility with non-subdomain URLs
      return NextResponse.rewrite(new URL(url.pathname + url.search, req.url));
    }
    
    // Otherwise, add the tenant prefix
    const response = NextResponse.rewrite(
      new URL(`/tenants/${tenantSlug}${targetPath}${url.search}`, req.url)
    );
    // Add tenant slug to response headers for potential caching/debugging
    response.headers.set('x-tenant-slug', tenantSlug);
    return response;
  }

  return NextResponse.next();
};
