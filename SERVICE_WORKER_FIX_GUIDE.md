# 🚨 Service Worker Issues & Fixes - Production Deployment

## Issue Summary

**Production Railway Site**: Service Worker failing to activate due to stale precache manifest with 404 errors.

### Error Messages:
```
Uncaught (in promise) InvalidStateError: Failed to update a ServiceWorker
Uncaught (in promise) bad-precaching-response: bad-precaching-response :: 
  [{"url":".../_next/static/chunks/1891-999a95fb2eba69cc.js","status":404}]
[WebPush] Service Worker state: redundant
```

### Root Cause:
The service worker from a previous build has a precache manifest listing files that no longer exist. When it tries to cache these files during installation, it fails and becomes "redundant".

---

## 🔥 IMMEDIATE FIX (For Live Production)

### Step 1: Clear Service Worker & Caches via Browser Console

**On your production site** (https://toolboxx-production.up.railway.app/):

1. Open browser DevTools (F12)
2. Go to **Console** tab
3. Paste this script and press Enter:

```javascript
// COMPLETE SERVICE WORKER RESET
(async function resetServiceWorker() {
  console.log('🧹 Starting Service Worker cleanup...');
  
  // Step 1: Unregister all service workers
  const regs = await navigator.serviceWorker.getRegistrations();
  console.log(`Found ${regs.length} service worker(s)`);
  await Promise.all(regs.map(r => {
    console.log('Unregistering:', r.scope);
    return r.unregister();
  }));
  console.log('✅ All service workers unregistered');
  
  // Step 2: Clear all caches
  const cacheNames = await caches.keys();
  console.log(`Found ${cacheNames.length} cache(s):`, cacheNames);
  await Promise.all(cacheNames.map(name => {
    console.log('Deleting cache:', name);
    return caches.delete(name);
  }));
  console.log('✅ All caches cleared');
  
  // Step 3: Reload page
  console.log('🔄 Reloading page in 1 second...');
  console.log('✨ Service worker will re-register with fresh manifest');
  setTimeout(() => location.reload(), 1000);
})();
```

4. Wait for the page to reload automatically
5. Check DevTools > Application > Service Workers - should show "activated"

---

## 🔧 PERMANENT FIX (For Future Deployments)

### Fix 1: Update Service Worker Registration Logic ✅ DONE

I've updated `/src/lib/notifications/web-push.ts` to:
- ✅ Detect when SW is in invalid/redundant state
- ✅ Automatically unregister and clear caches
- ✅ Re-register with clean state
- ✅ Add timeout protection (10s for existing, 15s for new)
- ✅ Better error handling and logging
- ✅ Auto-recovery from "redundant" state

**New Features:**
```typescript
// Detects invalid state and auto-cleans
if (existingRegistration.active?.state === 'redundant' || !existingRegistration.active) {
  await existingRegistration.unregister();
  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map(name => caches.delete(name)));
  return this.registerServiceWorker(); // Re-register clean
}

// Detects redundant state during install and auto-fixes
if (newWorker.state === 'redundant') {
  console.error('[WebPush] Service Worker became redundant, clearing and reloading');
  caches.keys().then(names => Promise.all(names.map(n => caches.delete(n))))
    .then(() => window.location.reload());
}
```

### Fix 2: Improve Build Scripts ✅ DONE

Updated `package.json` with better scripts:
```json
{
  "scripts": {
    "clean:sw": "rm -f public/sw.js public/workbox-*.js",
    "clean:cache": "rm -rf .next/cache",
    "clean:all": "npm run clean:sw && npm run clean:cache",
    "prebuild": "npm run clean:sw",  // Auto-runs before build
    "postbuild": "echo 'Build ID:' && cat .next/BUILD_ID",
    "reset:sw": "bash scripts/reset-sw-cache.sh"
  }
}
```

### Fix 3: Railway Configuration ✅ ALREADY GOOD

Your `railway.json` already has the correct setup:
```json
{
  "build": {
    "buildCommand": "SKIP_ENV_VALIDATION=true bun install && 
                     rm -f public/sw.js public/sw.js.map public/workbox-*.js && 
                     bun run build"
  }
}
```

This ensures:
- Old SW files are deleted before each build
- Fresh precache manifest is generated
- No stale file references

---

## 🚀 DEPLOYMENT STEPS (Going Forward)

### For Railway Auto-Deploy:

1. **Commit changes**:
   ```bash
   git add .
   git commit -m "fix: improve service worker error handling and recovery"
   git push origin main
   ```

2. **Railway will auto-deploy** with clean SW

3. **After deployment**, users should:
   - Hard refresh (Ctrl+Shift+R)
   - Or run the cleanup script once (see Step 1 above)

### Manual Deployment:

```bash
# Local testing
bun run clean:all
bun run build
bun run start

# Test at http://localhost:3000
# Check DevTools > Application > Service Workers
```

---

## 📊 VERIFICATION CHECKLIST

After deploying, check these on production site:

### Browser Console:
```javascript
// Run these in console to verify

// 1. Check SW registration
navigator.serviceWorker.getRegistrations().then(regs => {
  console.log('Service Workers:', regs.length);
  regs.forEach(r => console.log({
    scope: r.scope,
    active: r.active?.state,
    installing: r.installing?.state,
    waiting: r.waiting?.state
  }));
});

// 2. Check if active
navigator.serviceWorker.ready.then(reg => {
  console.log('SW Active:', reg.active?.state === 'activated' ? '✅' : '❌');
});

// 3. Check caches
caches.keys().then(keys => {
  console.log('Active caches:', keys.length);
  keys.forEach(k => console.log('-', k));
});

// 4. Check push subscription
navigator.serviceWorker.ready.then(reg => {
  reg.pushManager.getSubscription().then(sub => {
    console.log('Push subscription:', sub ? '✅ Active' : '❌ Not subscribed');
  });
});
```

### Expected Console Output:
```
[WebPush] Auto-initializing service worker...
[WebPush] Service worker already registered, using existing: {
  scope: 'https://toolboxx-production.up.railway.app/',
  active: 'activated',  ← Should be 'activated', not undefined
  installing: undefined,
  waiting: undefined
}
✅ Service Worker is READY
✅ Push subscription Active (if user subscribed)
```

### DevTools Application Tab:
```
Service Workers:
  ✅ #12345 activated and is running
  ✅ Source: https://toolboxx-production.up.railway.app/sw.js
  ✅ Status: activated
  ✅ Scope: https://toolboxx-production.up.railway.app/

Cache Storage:
  ✅ workbox-precache-v2-... (multiple entries)
  ✅ workbox-runtime-...
  ✅ static-js-assets
  ✅ static-style-assets
  (No errors, all green)
```

---

## 🐛 TROUBLESHOOTING

### Issue: Service Worker still shows "redundant"

**Solution**: Force unregister manually

```javascript
// In browser console
navigator.serviceWorker.getRegistrations()
  .then(regs => Promise.all(regs.map(r => r.unregister())))
  .then(() => caches.keys())
  .then(keys => Promise.all(keys.map(k => caches.delete(k))))
  .then(() => {
    console.log('✅ All cleaned. Hard refresh now (Ctrl+Shift+R)');
    location.reload();
  });
```

### Issue: 404 errors on precache files

**Cause**: Stale build in Railway cache

**Solution**: Clear Railway build cache

1. Go to Railway dashboard
2. Project Settings > General
3. Scroll to "Clear Build Cache"
4. Click "Clear Cache"
5. Redeploy

Or use build command:
```bash
# In railway.json or Railway settings
buildCommand: "rm -rf .next && bun install && rm -f public/sw*.js public/workbox*.js && bun run build"
```

### Issue: Service Worker not updating after deployment

**Solution**: Add version to SW or manifest

In `public/manifest.json`:
```json
{
  "name": "ToolBay",
  "start_url": "/?v=2.1",  ← Increment version on each deploy
  "version": "2.1.0"
}
```

### Issue: Users still seeing old SW

**Solution**: Show update notification

Add to your app:
```typescript
// Detect SW update available
navigator.serviceWorker.ready.then(reg => {
  reg.addEventListener('updatefound', () => {
    const newWorker = reg.installing;
    newWorker?.addEventListener('statechange', () => {
      if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
        // Show toast notification
        toast('New version available! Refresh to update.', {
          action: {
            label: 'Refresh',
            onClick: () => window.location.reload()
          }
        });
      }
    });
  });
});
```

---

## 📈 MONITORING

### Add to Application Monitoring

Track these metrics:
```typescript
// In your analytics/monitoring

// 1. SW registration success rate
const swRegistered = await navigator.serviceWorker.getRegistrations();
analytics.track('sw_status', {
  registered: swRegistered.length > 0,
  active: swRegistered[0]?.active?.state === 'activated'
});

// 2. SW errors
window.addEventListener('error', (event) => {
  if (event.filename?.includes('sw.js')) {
    analytics.track('sw_error', {
      message: event.message,
      filename: event.filename
    });
  }
});

// 3. Push subscription rate
const reg = await navigator.serviceWorker.ready;
const sub = await reg.pushManager.getSubscription();
analytics.track('push_subscription', {
  subscribed: !!sub
});
```

---

## 🎯 SUMMARY OF FIXES

| Fix | Status | Impact |
|-----|--------|--------|
| Auto-detect redundant SW | ✅ Done | High - Prevents stuck states |
| Auto-clear caches on error | ✅ Done | High - Ensures clean slate |
| Timeout protection | ✅ Done | Medium - Prevents infinite waits |
| Better error logging | ✅ Done | Medium - Easier debugging |
| Clean build scripts | ✅ Done | High - Prevents stale files |
| Railway config | ✅ Good | High - Clean deploys |
| User-facing recovery | ⏳ Optional | Low - Nice to have |

---

## 🔄 NEXT DEPLOYMENT STEPS

1. **Run immediate fix** (console script above) on current production
2. **Commit and push** updated code to trigger Railway deploy
3. **Wait for deployment** (~2-3 minutes)
4. **Test on production**:
   - Open https://toolboxx-production.up.railway.app/
   - Check console for "[WebPush] Service Worker ready and active"
   - Check DevTools > Application > Service Workers shows "activated"
5. **Test push notifications**:
   - Subscribe to notifications (if not already)
   - Send test push via API
   - Verify notification appears

---

## ✅ SUCCESS CRITERIA

Service Worker is working when you see:

**Console:**
```
[WebPush] Service Worker ready and active: {
  state: 'activated',
  scriptURL: 'https://toolboxx-production.up.railway.app/sw.js'
}
```

**DevTools:**
```
✅ Service Workers: #12345 activated and is running
✅ No errors in console
✅ Caches populated with resources
✅ Push subscription working
```

**User Experience:**
```
✅ Notifications can be enabled
✅ Push notifications arrive
✅ Clicking notification opens correct page
✅ Works when browser closed/tab inactive
```

---

*Last Updated: December 15, 2025*
*All fixes committed and ready for deployment* 🚀

