# Railway Deployment Fixes - November 2, 2025

## Issues Resolved

### Issue 1: Missing `aws4` Dependency
**Error:**
```
Module not found: Can't resolve 'aws4' in '/app/node_modules/@payloadcms/db-mongodb/node_modules/mongoose/node_modules/mongodb/lib'
```

**Root Cause:**
The MongoDB driver used by Payload CMS requires the `aws4` package for AWS authentication features, but it wasn't explicitly listed in the dependencies.

**Fix:**
Added `aws4` to `package.json` dependencies:
```json
"aws4": "^1.13.2"
```

### Issue 2: Stripe Initialization Error During Build
**Error:**
```
Error: Neither apiKey nor config.authenticator provided
    at r._setAuthenticator (.next/server/app/(app)/api/stripe/webhooks/route.js:1:105565)
```

**Root Cause:**
The Stripe SDK was being initialized at module load time in `src/lib/stripe.ts`, which caused build failures when the `STRIPE_SECRET_KEY` environment variable wasn't available during the static build phase.

**Fix:**
Implemented lazy initialization with a Proxy pattern in `src/lib/stripe.ts`:
```typescript
let stripeInstance: Stripe | null = null;

export const getStripe = (): Stripe => {
  if (!stripeInstance) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    
    // During build time, return a mock if env vars aren't available
    if (!secretKey) {
      if (process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE === 'phase-production-build') {
        console.warn('⚠️ STRIPE_SECRET_KEY not available during build. This is expected for static analysis.');
        return {} as Stripe;
      }
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    
    stripeInstance = new Stripe(secretKey, {
      apiVersion: "2025-08-27.basil",
      typescript: true,
    });
  }
  return stripeInstance;
};

// For backward compatibility - uses a Proxy for lazy initialization
export const stripe = new Proxy({} as Stripe, {
  get: (target, prop) => {
    return getStripe()[prop as keyof Stripe];
  }
});
```

### Issue 3: Missing "use client" Directive in Library Components
**Error:**
```
ReferenceError: File is not defined
    at 65801 (.next/server/chunks/5801.js:1:7290)
```

**Root Cause:**
Two React components in the library module were using client-side hooks (`useState`, `useSuspenseQuery`, `useForm`, etc.) but didn't have the `"use client"` directive, causing Next.js to try to render them on the server where browser APIs like `File` are not available.

**Fix:**
Added `"use client"` directive to:
- `src/modules/library/ui/components/review-form.tsx`
- `src/modules/library/ui/components/review-sidebar.tsx`

## Files Modified

1. **package.json** - Added `aws4` dependency
2. **src/lib/stripe.ts** - Implemented lazy initialization for Stripe SDK
3. **src/modules/library/ui/components/review-form.tsx** - Added "use client" directive
4. **src/modules/library/ui/components/review-sidebar.tsx** - Added "use client" directive
5. **.env.example** - Updated to include `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

## Files Created

1. **railway.json** - Railway deployment configuration
2. **RAILWAY_DEPLOYMENT.md** - Comprehensive deployment guide

## Build Verification

Build now completes successfully:
```bash
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages (18/18)
✓ Finalizing page optimization
```

## Next Steps for Railway Deployment

1. Ensure all environment variables are set in Railway dashboard:
   - `DATABASE_URI`
   - `PAYLOAD_SECRET`
   - `NEXT_PUBLIC_APP_URL`
   - `NEXT_PUBLIC_ROOT_DOMAIN`
   - `STRIPE_SECRET_KEY`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `BLOB_READ_WRITE_TOKEN`

2. Push changes to your Git repository
3. Railway will automatically trigger a new deployment
4. Monitor the build logs to ensure success
5. Test the deployed application

## Notes

- The `aws4` warning should now be resolved
- Stripe initialization happens only when actually needed at runtime
- All client-side React components now properly marked with "use client"
- Build process is now compatible with Railway's Docker-based deployment
