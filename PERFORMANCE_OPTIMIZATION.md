# Performance Optimization Guide

## Problem: Delays on First Clicks After Deployment

You're experiencing delays on the first 2-3 clicks after deployment. This is caused by:

### Root Causes

1. **Cold Starts** (Railway/Vercel serverless)
   - Serverless functions need to "warm up" on first request
   - Containers are spun down when idle

2. **React Query Cache** 
   - No data cached on first visit
   - Every interaction requires API calls

3. **Next.js Router**
   - Route prefetching only happens on hover
   - Client-side bundles loaded on-demand

4. **Large JavaScript Bundles**
   - Many UI components loaded at once
   - No progressive enhancement

## Solutions Implemented

### 1. Query Cache Optimization (`src/trpc/query-client.ts`)
- ✅ Increased `staleTime` from 5 to 10 minutes
- ✅ Increased `gcTime` from 10 to 30 minutes  
- ✅ Changed `refetchOnMount` to `false` (rely on staleTime instead)
- **Impact**: Reduces unnecessary API calls on navigation

### 2. Prefetching on Hover (`src/components/optimized-link.tsx`)
- ✅ Created `OptimizedLink` component
- ✅ Prefetches routes when user hovers over links
- **Impact**: Routes load instantly when clicked

### 3. Next.js Config Improvements (`next.config.mjs`)
- ✅ Enabled `optimisticClientCache`
- ✅ Added `parallelServerCompiles`
- ✅ Added `optimizeCss`
- **Impact**: Faster builds and client-side navigation

### 4. Cache Persistence (`src/lib/cache-persist.ts`)
- ✅ Created localStorage persistence utility
- ✅ 30-minute cache expiry
- **Impact**: Returning visitors see instant loads

## How to Apply These Fixes

### Step 1: Update Your Links
Replace `Link` with `OptimizedLink` in your navigation components:

```tsx
// Before
import Link from "next/link";

<Link href="/products">Products</Link>

// After
import { OptimizedLink as Link } from "@/components/optimized-link";

<Link href="/products">Products</Link>
```

### Step 2: Add Route Prefetching to Layouts
In key layout files, prefetch important routes:

```tsx
// In your main layout
"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function PrefetchRoutes() {
  const router = useRouter();
  
  useEffect(() => {
    // Prefetch critical routes on mount
    router.prefetch("/library");
    router.prefetch("/dashboard");
    // Add more as needed
  }, [router]);
  
  return null;
}
```

### Step 3: Analyze Your Bundle
Run the bundle analyzer to identify large dependencies:

```bash
./scripts/analyze-bundle.sh
```

Then check for:
- Duplicate dependencies
- Large unused libraries
- Components that can be lazy-loaded

### Step 4: Add Dynamic Imports for Heavy Components
For components that aren't immediately visible:

```tsx
import dynamic from 'next/dynamic';

// Lazy load heavy components
const HeavyChart = dynamic(() => import('@/components/heavy-chart'), {
  loading: () => <div>Loading chart...</div>,
  ssr: false, // Skip server-side rendering if not needed
});
```

### Step 5: Server-Side Prefetching (Already in use)
Continue using server-side prefetching in layouts (you already do this well):

```tsx
// Keep doing this!
const queryClient = getQueryClient();
await queryClient.prefetchQuery({
  ...trpc.categories.getMany.queryOptions(),
  staleTime: 10 * 60 * 1000,
});
```

## Railway/Vercel Specific Fixes

### For Railway
Add to `railway.json`:

```json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "numReplicas": 1,
    "restartPolicyType": "ON_FAILURE",
    "healthcheckPath": "/api/health",
    "healthcheckTimeout": 100
  }
}
```

Create health check endpoint at `src/app/api/health/route.ts`:

```typescript
export async function GET() {
  return Response.json({ status: 'ok' });
}
```

### For Vercel
The `standalone` output is good. Also ensure:
- Functions are in the same region as your database
- Consider upgrading to Pro for "Warming" feature
- Use Edge Runtime for routes that don't need Node.js APIs

## Database Query Optimization

Review your tRPC routers for:

1. **Select only needed fields**
```typescript
// Bad
const products = await db.products.find();

// Good
const products = await db.products.find({}, { 
  select: { id: 1, name: 1, price: 1 } 
});
```

2. **Add database indexes** on frequently queried fields:
```typescript
// In your Products collection
{
  indexes: [
    { fields: { tenantId: 1, status: 1 } },
    { fields: { category: 1 } },
  ]
}
```

3. **Use pagination** (you already do this with infinite queries - good!)

## Monitoring

Add performance monitoring to track improvements:

```typescript
// In your main layout
useEffect(() => {
  if (typeof window !== 'undefined' && 'performance' in window) {
    const navigation = performance.getEntriesByType('navigation')[0];
    console.log('Page load time:', navigation.duration);
  }
}, []);
```

## Expected Results

After implementing these changes:
- ✅ First click: Still may have slight delay (serverless cold start)
- ✅ Second click onwards: **Instant** (cached + prefetched)
- ✅ Returning visitors: **Instant** from first click (localStorage cache)
- ✅ Hover interactions: Route prefetching starts immediately

## Next Steps

1. Deploy these changes
2. Test in production
3. Run bundle analysis: `./scripts/analyze-bundle.sh`
4. Monitor with Vercel Analytics or Railway metrics
5. Consider adding a service worker for offline support

## Additional Recommendations

### Short Term (Easy Wins)
- [ ] Replace all `Link` components with `OptimizedLink`
- [ ] Add health check endpoint
- [ ] Review and add database indexes

### Medium Term
- [ ] Implement bundle splitting for admin routes
- [ ] Add service worker for caching
- [ ] Consider implementing Redis for server-side caching

### Long Term
- [ ] Move to Edge Runtime where possible
- [ ] Implement ISR (Incremental Static Regeneration) for product pages
- [ ] Consider self-hosting for better cold start control

## Questions?

If delays persist:
1. Check Railway/Vercel logs for slow queries
2. Use Network tab to identify slow API calls
3. Profile React components with React DevTools
4. Consider upgrading hosting plan for better performance
