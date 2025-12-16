# Production Verification Guide

## After Railway Deployment Completes

### Step 1: Nuclear Reset (Browser Console)

Copy and paste this in your production site's browser console:

```javascript
// Complete Service Worker & Cache Reset
(async function nuclearReset() {
  console.log('🔄 Starting nuclear reset...');
  
  // 1. Unregister all service workers
  const registrations = await navigator.serviceWorker.getRegistrations();
  console.log(`Found ${registrations.length} service worker(s)`);
  for (const registration of registrations) {
    await registration.unregister();
    console.log('✅ Unregistered:', registration.scope);
  }
  
  // 2. Delete all caches
  const cacheNames = await caches.keys();
  console.log(`Found ${cacheNames.length} cache(s)`);
  for (const cacheName of cacheNames) {
    await caches.delete(cacheName);
    console.log('✅ Deleted cache:', cacheName);
  }
  
  console.log('✅ Nuclear reset complete!');
  console.log('🔄 Reloading page...');
  
  // 3. Hard reload
  setTimeout(() => location.reload(true), 1000);
})();
```

### Step 2: Verify Clean Registration

After the page reloads, check the console for:

**Expected Output:**
```
[SW 1.0.0] Installing...
[SW 1.0.0] Service Worker loaded
[SW 1.0.0] Activating...
[SW 1.0.0] Activated and claimed all clients
[WebPush] Checking for existing registration...
[WebPush] No existing registration, registering new service worker
[WebPush] Service Worker registered successfully
[WebPush] Service Worker ready and active
```

**Red Flags (Should NOT see):**
- ❌ 404 errors for chunk files
- ❌ "Service worker in redundant state"
- ❌ Infinite refresh loops
- ❌ Multiple service workers registered
- ❌ Workbox precache errors

### Step 3: Check Service Worker Status

Open DevTools > Application > Service Workers

**Expected:**
- ✅ Only ONE service worker: `/sw.js`
- ✅ Status: `activated and is running`
- ✅ Source: `https://yourdomain.com/sw.js`
- ✅ No "waiting" or "redundant" workers

### Step 4: Test Push Notifications

1. Click the "Enable Notifications" button (if available)
2. Grant notification permission when prompted
3. Check console for successful subscription:
   ```
   [WebPush] Subscribed to push notifications
   [WebPush] Subscription saved to server
   ```

### Step 5: Send Test Notification

Use your admin panel or API to send a test notification.

**Expected:**
- Notification appears on screen
- Click notification opens/focuses the app window
- Console shows:
  ```
  [SW] Push event received
  [SW] Push payload: {...}
  [SW] Notification click
  ```

## Troubleshooting

### Issue: 404 on /sw.js

**Cause:** Service worker file not deployed

**Fix:**
1. Check Railway logs for build errors
2. Verify `public/sw.js` exists in repository
3. Redeploy if necessary

### Issue: Service Worker Won't Activate

**Cause:** Old service worker still registered

**Fix:**
Run nuclear reset again, wait 30 seconds, then hard refresh

### Issue: No Push Notifications

**Cause:** Subscription failed or not sent to server

**Fix:**
1. Check browser console for errors
2. Verify VAPID keys are configured correctly
3. Check `/api/push/subscribe` endpoint works
4. Verify push subscription in database

### Issue: Multiple Service Workers

**Cause:** Incomplete cleanup from previous version

**Fix:**
```javascript
// Manual unregister all
navigator.serviceWorker.getRegistrations().then(regs => {
  regs.forEach(r => {
    console.log('Unregistering:', r.scope);
    r.unregister();
  });
});
```

## Success Criteria

- ✅ Clean console with no errors
- ✅ Service worker registered at `/sw.js`
- ✅ Version 1.0.0 logged in console
- ✅ Only one active service worker
- ✅ Push notifications can be subscribed to
- ✅ Test notifications appear and work correctly
- ✅ No infinite refresh loops
- ✅ No 404 errors

## Monitoring

Keep browser console open for 5 minutes after verification to ensure:
- No unexpected errors
- No automatic refreshes
- Service worker stays in "activated" state
- No cache-related warnings

---

**If all checks pass:** ✅ Deployment successful!

**If any checks fail:** See troubleshooting section or contact support.
