# 🔍 Service Worker & Push Notifications - Debugging Guide

## Quick Console Commands for Testing

### 1. Check Service Worker Status

```javascript
// Open browser console (F12) and paste:

// Check if SW is registered
navigator.serviceWorker.getRegistrations().then(regs => {
  console.log('📋 Registered Service Workers:', regs.length);
  regs.forEach((reg, i) => {
    console.log(`\n🔧 Registration ${i + 1}:`, {
      scope: reg.scope,
      updateViaCache: reg.updateViaCache,
      installing: reg.installing?.state,
      waiting: reg.waiting?.state,
      active: reg.active?.state,
      scriptURL: reg.active?.scriptURL
    });
  });
});

// Check SW ready state
navigator.serviceWorker.ready.then(reg => {
  console.log('✅ Service Worker is READY:', {
    state: reg.active.state,
    scriptURL: reg.active.scriptURL
  });
});

// Check current controller
console.log('🎮 Current SW Controller:', navigator.serviceWorker.controller);
```

### 2. Check Push Subscription

```javascript
// Check if user is subscribed to push
navigator.serviceWorker.ready.then(reg => {
  reg.pushManager.getSubscription().then(sub => {
    if (sub) {
      console.log('✅ Push Subscription Active:', {
        endpoint: sub.endpoint,
        expirationTime: sub.expirationTime,
        p256dh: sub.getKey('p256dh') ? 'Present' : 'Missing',
        auth: sub.getKey('auth') ? 'Present' : 'Missing'
      });
    } else {
      console.log('❌ No active push subscription');
    }
  });
});
```

### 3. Check Notification Permission

```javascript
// Check current permission status
console.log('🔔 Notification Permission:', Notification.permission);
// Returns: "default", "granted", or "denied"

// Check browser support
console.log('🌐 Browser Support:', {
  serviceWorker: 'serviceWorker' in navigator,
  PushManager: 'PushManager' in window,
  Notification: 'Notification' in window
});
```

### 4. Manual Service Worker Registration

```javascript
// Register SW manually (if auto-registration failed)
navigator.serviceWorker.register('/sw.js', {
  scope: '/',
  updateViaCache: 'none'
})
  .then(reg => console.log('✅ SW Registered:', reg))
  .catch(err => console.error('❌ SW Registration Failed:', err));
```

### 5. Unregister All Service Workers

```javascript
// Useful for debugging SW issues
navigator.serviceWorker.getRegistrations().then(regs => {
  regs.forEach(reg => {
    reg.unregister().then(success => {
      console.log(success ? '✅ Unregistered' : '❌ Failed', reg.scope);
    });
  });
  console.log('🧹 All service workers unregistered. Refresh page.');
});
```

### 6. Force Service Worker Update

```javascript
// Check for updates immediately
navigator.serviceWorker.getRegistrations().then(regs => {
  regs.forEach(reg => {
    reg.update().then(() => console.log('🔄 Update check triggered'));
  });
});
```

### 7. Test WebPushService Methods

```javascript
// Import the service (in console, access via window if exported)
// Or use directly in React DevTools

// Check support
console.log('Is Supported:', webPushService.isSupported());

// Get current subscription
webPushService.getSubscription().then(sub => {
  console.log('Current Subscription:', sub);
});

// Subscribe to push (replace with actual user ID)
webPushService.subscribe('your-user-id-here').then(sub => {
  console.log('Subscribed:', sub);
});

// Unsubscribe
webPushService.unsubscribe().then(success => {
  console.log('Unsubscribed:', success);
});
```

---

## Chrome DevTools Inspection

### Application Tab

1. **Open DevTools** (F12)
2. **Go to Application tab**
3. **Check:**

#### Service Workers Section
```
Status: #1234 activated and is running
Source: http://localhost:3000/sw.js
Scope: http://localhost:3000/

Actions:
☑ Update on reload
⚪ Bypass for network
⚪ Offline

[Update] [Unregister] [Stop] buttons
```

#### Manifest Section
```
Name: ToolBay - Construction Materials Marketplace
Short name: ToolBay
Start URL: /?v=2.0
Theme color: #2563eb
Background color: #ffffff
Display: standalone
Orientation: portrait-primary

Icons:
✓ logo_toolbay.png (64x64)
✓ icon-192.png (192x192)
✓ icon-512.png (512x512)
```

#### Storage Section
```
Cache Storage:
- workbox-precache-v2-http://localhost:3000/
- workbox-runtime-http://localhost:3000/
- static-style-assets
- static-js-assets
- next-data
etc.

IndexedDB:
(Check for any push-related data)

Local Storage:
(Check for any stored preferences)
```

---

## Testing Push Notifications

### Method 1: Using API Route (Recommended)

```bash
# Terminal - Send test notification
curl -X POST http://localhost:3000/api/push/send \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "YOUR_USER_ID_HERE",
    "notification": {
      "title": "🧪 Test Notification",
      "body": "This is a test push notification!",
      "data": {
        "url": "/",
        "type": "general"
      }
    }
  }'
```

### Method 2: Using Browser Console

```javascript
// In browser console - trigger push notification
fetch('/api/push/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'YOUR_USER_ID_HERE',
    notification: {
      title: '🧪 Console Test',
      body: 'Sent from browser console!',
      data: { url: '/test', type: 'general' }
    }
  })
})
  .then(res => res.json())
  .then(data => console.log('Push sent:', data))
  .catch(err => console.error('Push failed:', err));
```

### Method 3: Using Helper Function

```typescript
// In your code
import { sendPushNotification } from '@/lib/notifications/send-push';

await sendPushNotification({
  userId: 'user-id',
  title: '🧪 Test',
  body: 'Testing push notifications',
  url: '/',
  type: 'general'
});
```

---

## Development Mode Testing

### Step 1: Create Service Worker File

```bash
# In project root
cd /home/leo/HomeLTD/toolboxx

# Copy custom SW to public
cp public/sw-custom.js public/sw.js

# Verify file exists
ls -la public/sw.js
```

### Step 2: Start Dev Server

```bash
bun run dev
# or
npm run dev
```

### Step 3: Check Registration

```javascript
// In browser console at http://localhost:3000
navigator.serviceWorker.getRegistrations().then(regs => {
  console.log('Registrations:', regs);
});
```

### Step 4: Subscribe to Push

```javascript
// Get user ID from your app state
const userId = 'YOUR_USER_ID';

// Subscribe
webPushService.subscribe(userId).then(sub => {
  console.log('Subscribed:', sub);
});
```

### Step 5: Send Test Push

```bash
# Replace YOUR_USER_ID with actual ID
curl -X POST http://localhost:3000/api/push/send \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "YOUR_USER_ID",
    "notification": {
      "title": "💰 Payment Received!",
      "body": "You received RWF 50,000",
      "data": {
        "url": "/verify-payments",
        "type": "payment"
      }
    }
  }'
```

---

## Production Mode Testing

### Option A: Production Build Locally

```bash
# Clean old SW files
npm run clean:sw

# Build production version
npm run build
# or
bun run build

# Start production server
npm run start
# or
bun run start

# Open browser at http://localhost:3000
# Service worker should auto-register
```

### Option B: Test on Deployed Site

```bash
# Deploy to Vercel/Railway/Netlify
git push origin main

# Visit deployed URL (HTTPS)
https://your-app.vercel.app

# Check DevTools > Application > Service Workers
# Should show: "activated and is running"
```

---

## Database Inspection

### Check Push Subscriptions in MongoDB

```javascript
// Using MongoDB Compass or mongosh

// Connect to database
use toolboxx

// View all subscriptions
db["push-subscriptions"].find().pretty()

// View subscriptions for specific user
db["push-subscriptions"].find({
  user: "user_id_here"
}).pretty()

// Count active subscriptions
db["push-subscriptions"].countDocuments({ isActive: true })

// Find subscriptions by endpoint
db["push-subscriptions"].findOne({
  endpoint: { $regex: "fcm.googleapis.com" }
})
```

### Using Payload Admin Panel

```
1. Navigate to: http://localhost:3000/admin
2. Login with admin credentials
3. Go to Collections > Push Subscriptions
4. View/Edit/Delete subscriptions
```

---

## Common Error Messages & Solutions

### Error 1: "Failed to register service worker"

```
DOMException: Failed to register a ServiceWorker for scope 
('http://localhost:3000/') with script ('http://localhost:3000/sw.js'): 
The script has an unsupported MIME type ('text/html').
```

**Cause**: sw.js file doesn't exist or returns 404

**Solution**:
```bash
# Check if file exists
ls -la public/sw.js

# Create if missing
cp public/sw-custom.js public/sw.js

# Restart server
```

### Error 2: "Push subscription failed"

```
NotAllowedError: Registration failed - permission denied
```

**Cause**: User denied notification permission

**Solution**:
```javascript
// Check permission
console.log(Notification.permission); // "denied"

// User must manually enable in browser settings:
// Chrome: Click lock icon → Site settings → Notifications → Allow
```

### Error 3: "VAPID public key not configured"

```
Error: VAPID public key not configured
```

**Cause**: Environment variable missing

**Solution**:
```bash
# Check .env file
cat .env | grep VAPID

# Should see:
# NEXT_PUBLIC_VAPID_PUBLIC_KEY=BLeVKTD...
# VAPID_PRIVATE_KEY=NflOoTj...

# Restart server after adding
```

### Error 4: "Service worker stuck in installing state"

```
Service Worker: installing (not activating)
```

**Cause**: SW waiting for old version to release

**Solution**:
```javascript
// Force skip waiting
navigator.serviceWorker.getRegistrations().then(regs => {
  regs.forEach(reg => {
    if (reg.waiting) {
      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  });
});

// Or unregister and re-register
navigator.serviceWorker.getRegistrations().then(regs => {
  regs.forEach(reg => reg.unregister());
  location.reload();
});
```

### Error 5: "No active subscription found for user"

```
404: No active subscriptions found for user
```

**Cause**: User hasn't subscribed or subscription expired

**Solution**:
```javascript
// Re-subscribe
webPushService.subscribe('user-id').then(sub => {
  console.log('Re-subscribed:', sub);
});

// Check database
// db["push-subscriptions"].find({ user: "user-id" })
```

---

## Monitoring & Logging

### Enable Verbose Logging

```javascript
// Add to browser console for detailed logs
localStorage.setItem('debug', 'webpush:*');
location.reload();

// Or set in code
if (process.env.NODE_ENV === 'development') {
  window.DEBUG = true;
}
```

### Service Worker Logging

```javascript
// In public/sw-custom.js - already added
console.log('[SW] Installing...');
console.log('[SW] Activating...');
console.log('[SW] Push received:', event.data);
console.log('[SW] Notification clicked:', event);
```

### Check Service Worker Console

```
1. Open DevTools (F12)
2. Go to Application > Service Workers
3. Click on service worker source link
4. Opens dedicated SW DevTools with console
5. See all SW-specific logs
```

---

## Performance Monitoring

### Check Service Worker Performance

```javascript
// Measure SW registration time
const start = performance.now();
navigator.serviceWorker.register('/sw.js').then(reg => {
  const end = performance.now();
  console.log(`SW Registration took ${end - start}ms`);
});
```

### Check Cache Performance

```javascript
// Check cache hits
caches.open('workbox-runtime-http://localhost:3000/').then(cache => {
  cache.keys().then(keys => {
    console.log('Cached items:', keys.length);
    keys.forEach(req => console.log('Cached:', req.url));
  });
});
```

---

## Testing Checklist

- [ ] Service worker registers successfully
- [ ] Service worker reaches "activated" state
- [ ] Notification permission can be requested
- [ ] User can grant/deny permission
- [ ] Push subscription created successfully
- [ ] Subscription saved to database
- [ ] Can retrieve subscription from database
- [ ] Test notification appears in browser
- [ ] Notification has correct title and body
- [ ] Notification shows icon
- [ ] Clicking notification opens correct URL
- [ ] Notification works when tab is inactive
- [ ] Notification works when browser is closed
- [ ] Multiple devices can subscribe (same user)
- [ ] Unsubscribe removes subscription
- [ ] Expired subscriptions marked inactive
- [ ] SW updates on deployment
- [ ] Offline caching works (production)
- [ ] PWA installable (production)

---

## Useful Links

- **Service Worker API**: https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
- **Push API**: https://developer.mozilla.org/en-US/docs/Web/API/Push_API
- **Notifications API**: https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API
- **VAPID**: https://datatracker.ietf.org/doc/html/rfc8292
- **web-push library**: https://github.com/web-push-libs/web-push
- **Workbox**: https://developer.chrome.com/docs/workbox/

---

## Quick Reference Commands

```bash
# Development
cp public/sw-custom.js public/sw.js  # Create SW for dev
bun run dev                          # Start dev server
bun run build                        # Build production

# Production
bun run clean:sw                     # Clean old SW files
bun run build                        # Build with SW generation
bun run start                        # Start production server

# Database
mongosh "mongodb+srv://..."          # Connect to MongoDB
db["push-subscriptions"].find()      # View subscriptions

# Testing
curl -X POST localhost:3000/api/push/send -H "Content-Type: application/json" -d '{"userId":"...","notification":{...}}'
```

---

*Last Updated: December 15, 2025*
*Ready to debug and test the notification system!* 🚀
