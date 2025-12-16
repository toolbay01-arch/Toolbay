# Service Worker Refactoring Complete

## Summary

Successfully replaced the complex `next-pwa` auto-generated service worker with a simple custom implementation to fix production issues.

## Problem

Production was experiencing:
- Infinite refresh loops
- Service workers stuck in "redundant" state  
- 404 errors on precached chunk files (e.g., `1891-999a95fb2eba69cc.js`)
- These issues were caused by `next-pwa`'s aggressive precaching of files that no longer exist after new builds

## Solution

Replaced `next-pwa` with a simple custom service worker that:
- Only handles push notifications (no precaching)
- Uses simple install/activate/push event handlers
- No complex workbox or cache management logic

## Changes Made

### 1. Created Custom Service Worker (`public/sw.js`)
- Version: 1.0.0
- Simple push notification handler
- No precaching (root cause of 404 errors removed)
- Clean install/activate with `skipWaiting()` and `clients.claim()`
- Handles push events, notification clicks, and messages

### 2. Removed next-pwa Dependency
```bash
bun remove next-pwa
```

### 3. Updated Configuration Files

**next.config.mjs:**
- Removed `import withPWA from 'next-pwa'`
- Removed `withPWA()` wrapper
- Now exports plain `nextConfig`

**package.json:**
- Updated `clean:sw` script to preserve custom `sw.js`
- Removed `prebuild` hook (no longer deletes service worker before build)
- New script: `"clean:sw": "rm -f public/workbox-*.js public/sw.js.map"`

**railway.json:**
- Simplified build command from complex cache cleanup to just:
  ```json
  "buildCommand": "SKIP_ENV_VALIDATION=true bun install && bun run build"
  ```

### 4. Simplified Client-Side Registration (`src/lib/notifications/web-push.ts`)

**Removed:**
- `hasAttemptedCleanup` property and all related logic
- Ghost worker detection code
- Complex cache cleanup logic
- Conditional auto-reload logic
- 150+ lines of error handling specific to next-pwa issues

**Simplified to:**
- Check if service worker supported
- Check if already registered
- Register `/sw.js` if not registered
- Wait for service worker to be ready
- Simple try-catch error handling (~35 lines total)

### 5. Deleted Files
- `public/sw-custom.js` (old custom handlers)
- `public/workbox-1bb06f5e.js` (auto-generated workbox runtime)
- `public/sw.js.map` (auto-generated source map)

## Testing Instructions

### Local Testing
1. Build the project: `bun run build`
2. Start production server: `bun start`
3. Open browser console
4. Look for: `[WebPush] Service Worker ready and active`
5. No 404 errors, no infinite refresh loops

### Production Testing (After Railway Deploy)

1. **Nuclear Reset** (run in browser console on production site):
```javascript
// Unregister all service workers
navigator.serviceWorker.getRegistrations().then(regs => 
  regs.forEach(r => r.unregister())
);

// Delete all caches
caches.keys().then(names => 
  Promise.all(names.map(n => caches.delete(n)))
);

// Hard reload
location.reload(true);
```

2. **Verify Clean Registration:**
- Open DevTools Console
- Should see: `[SW 1.0.0] Service Worker loaded`
- Should see: `[WebPush] Service Worker registered successfully`
- Should see: `[WebPush] Service Worker ready and active`
- **NO** 404 errors
- **NO** redundant state messages
- **NO** infinite refresh loops

3. **Test Push Notifications:**
- Subscribe to push notifications
- Send a test notification
- Verify notification appears
- Click notification to verify it opens/focuses window

## Expected Console Output (Production)

**Good:**
```
[SW 1.0.0] Installing...
[SW 1.0.0] Service Worker loaded
[WebPush] Checking for existing registration...
[WebPush] Service Worker registered successfully
[WebPush] Service Worker ready and active
```

**Bad (if issues persist):**
```
❌ Failed to fetch sw.js (404)
❌ Service worker registration failed
❌ InvalidStateError
❌ Infinite refresh loops
```

## Rollback Plan

If issues occur, rollback with:
```bash
git revert HEAD
git push origin main
```

Then reinstall next-pwa:
```bash
bun add next-pwa
```

## Files Changed

1. ✅ `public/sw.js` - Created custom simple service worker
2. ✅ `src/lib/notifications/web-push.ts` - Simplified registration logic
3. ✅ `next.config.mjs` - Removed next-pwa wrapper
4. ✅ `package.json` - Removed next-pwa, updated scripts
5. ✅ `railway.json` - Simplified build command
6. ✅ `bun.lock` - Updated dependencies
7. ❌ `public/sw-custom.js` - Deleted
8. ❌ `public/workbox-1bb06f5e.js` - Deleted
9. ❌ `public/sw.js.map` - Deleted

## Deployment Status

- ✅ Changes committed: `0ec5d15`
- ✅ Pushed to GitHub: `main` branch
- ⏳ Railway deployment: In progress
- ⏳ Production verification: Pending

## Next Steps

1. Wait for Railway deployment to complete
2. Run nuclear reset in production browser
3. Verify clean service worker registration
4. Test push notification subscription flow
5. Monitor production logs for any issues
6. If successful, document the new approach
7. If issues persist, investigate further or rollback

## Key Learnings

1. **next-pwa's precaching is too aggressive** for dynamic builds with cache mounts
2. **Docker cache mounts** prevent deletion of `.next/cache`, causing stale precache manifests
3. **Simpler is better** - custom SW with just push notifications is easier to maintain
4. **Service worker lifecycle** requires proper cleanup before major changes
5. **Nuclear reset** is often necessary when changing SW strategies

## Architecture Decision

**Before:** Auto-generated service worker with workbox precaching
**After:** Manual service worker with push notifications only

**Rationale:**
- Precaching not needed for this use case (dynamic content, server-rendered)
- Push notifications work independently of precaching
- Simpler = fewer edge cases and bugs
- More control over service worker behavior
- Easier to debug and maintain

---

**Completed:** December 16, 2024
**Commit:** `0ec5d15`
**Status:** ✅ Deployed to Railway (pending verification)
