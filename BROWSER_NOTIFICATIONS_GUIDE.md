# Browser Notifications Implementation Guide

## Overview

This guide explains how to implement browser notifications for your multi-tenant e-commerce platform, including payment notifications, order updates, and chat messages.

## Architecture

### Two Types of Notifications

1. **Browser Notification API** (Phase 1 - Simple)
   - Shows notifications when user is on your site
   - No service worker required
   - Works immediately
   - Good for: Active users browsing your site

2. **Web Push Notifications** (Phase 2 - Advanced)
   - Shows notifications even when browser is closed
   - Requires service worker + VAPID keys
   - Works as PWA
   - Good for: Background notifications, mobile apps

## Phase 1: Browser Notification API

### Features
- ✅ New payment notification
- ✅ Order status update
- ✅ New chat message
- ✅ Low stock alerts
- ✅ Permission management
- ✅ Sound & vibration

### Implementation Files

```
src/
  lib/
    notifications/
      browser-notifications.ts      # Core notification logic
      notification-types.ts          # Type definitions
  hooks/
    use-notification-permission.ts   # Permission hook
    use-payment-notifications.ts     # Payment notifications
    use-chat-notifications.ts        # Chat notifications
  components/
    notification-prompt.tsx          # Permission request UI
```

## Phase 2: Web Push Notifications (PWA)

### Features
- ✅ Background notifications
- ✅ Works when browser closed
- ✅ Push from server
- ✅ Mobile app-like experience
- ✅ Offline support

### Additional Files

```
public/
  sw.js                              # Service worker
  manifest.json                      # PWA manifest
src/
  app/
    api/
      push/
        subscribe/route.ts           # Subscribe to push
        send/route.ts                # Send push notification
  lib/
    notifications/
      web-push.ts                    # Web push utilities
      vapid.ts                       # VAPID key management
collections/
  PushSubscriptions.ts               # Store subscriptions
```

## Current State Integration

Your existing notification system already:
- Counts unread notifications
- Polls for updates every 30-60 seconds
- Shows badges on navigation icons

**We'll enhance this by:**
1. Showing browser notifications when counts change
2. Adding persistent push notifications
3. Grouping notifications by type

## Use Cases

### For Tenants (Sellers)
1. **Payment Received**: "New payment of RWF 50,000 received"
2. **Low Stock**: "Product XYZ is low on stock (3 remaining)"
3. **New Order**: "New order #1234 received"
4. **Chat Message**: "Customer sent you a message"

### For Customers (Buyers)
1. **Order Shipped**: "Your order #1234 has been shipped"
2. **Payment Confirmed**: "Your payment has been confirmed"
3. **Chat Reply**: "Seller replied to your message"
4. **Price Drop**: "Product on your wishlist is now on sale"

## Implementation Steps

### Step 1: Request Permission
```typescript
const permission = await Notification.requestPermission();
if (permission === 'granted') {
  // User allowed notifications
}
```

### Step 2: Show Notification
```typescript
new Notification('Payment Received', {
  body: 'New payment of RWF 50,000',
  icon: '/logo.png',
  badge: '/badge.png',
  tag: 'payment-123',
  requireInteraction: true,
  data: { url: '/verify-payments' }
});
```

### Step 3: Handle Clicks
```typescript
notification.onclick = (event) => {
  event.preventDefault();
  window.focus();
  window.location.href = '/verify-payments';
};
```

## Technical Requirements

### For Phase 1 (Browser Notifications) - Already Implemented ✅
- Modern browser with Notification API support
- User permission granted
- Website open in browser tab
- **No additional setup needed!**

### For Phase 2 (Web Push Notifications) - Additional Requirements

#### 1. VAPID Keys (Identity for your server)
```bash
# Generate keys using web-push library
npm install web-push
npx web-push generate-vapid-keys
```
You'll get:
```
Public Key: BN3xU...  (share with browser)
Private Key: T7g2...  (keep secret on server)
```

#### 2. Service Worker File
- File: `/public/sw.js`
- Runs in background even when site closed
- Listens for push events
- Shows notifications

#### 3. PWA Manifest
- File: `/public/manifest.json`
- Defines app name, icons, display mode
- Required for installable web app

#### 4. Database Collection
- Collection: `PushSubscriptions`
- Stores user subscription data (endpoint, keys)
- Links subscriptions to users

#### 5. Backend API Routes
- `/api/push/subscribe` - Save user subscription
- `/api/push/send` - Send push to user(s)
- `/api/push/unsubscribe` - Remove subscription

#### 6. Environment Variables
```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BN3xU...
VAPID_PRIVATE_KEY=T7g2...
VAPID_EMAIL=mailto:your-email@example.com
```

#### 7. HTTPS Certificate
- **Required!** Push API only works on HTTPS
- Use Let's Encrypt (free) or your hosting provider
- localhost works for development

#### 8. NPM Package
```bash
npm install web-push
# or
bun add web-push
```

#### 9. Next.js PWA Plugin (Optional but Recommended)
```bash
npm install next-pwa
```

#### 10. Server-Side Logic
- Trigger push when payment received
- Trigger push when order status changes
- Trigger push when message arrives
- Queue system for bulk notifications (optional)

### Browser Support
- ✅ Chrome/Edge (Desktop & Mobile)
- ✅ Firefox (Desktop & Mobile)
- ✅ Safari (macOS & iOS 16.4+)
- ❌ Not supported in private/incognito mode

### For Web Push (Phase 2)
- VAPID keys (generate using `web-push`)
- Database collection for push subscriptions
- Service worker for background handling

## Security & Privacy

1. **Permission Required**: Users must explicitly allow notifications
2. **Encrypted**: Push notifications use encrypted channels
3. **User Control**: Users can disable anytime
4. **No Spam**: Only show important notifications

## Performance Considerations

1. **Throttling**: Don't spam users with too many notifications
2. **Grouping**: Group similar notifications (e.g., "3 new messages")
3. **Timing**: Consider user timezone for non-urgent notifications
4. **Battery**: Minimize wake-ups on mobile devices

## Next Steps

1. **Phase 1**: Implement browser notifications for active users
2. **Test**: Verify on different browsers and devices
3. **Phase 2**: Add service worker for background notifications
4. **PWA**: Convert to installable Progressive Web App
5. **Analytics**: Track notification engagement

## Testing Checklist

- [ ] Permission request shows on first visit
- [ ] Notifications appear for new payments
- [ ] Notifications appear for new messages
- [ ] Click notification navigates to correct page
- [ ] Sound/vibration works on mobile
- [ ] Works on Chrome (desktop & mobile)
- [ ] Works on Safari (macOS & iOS)
- [ ] Works on Firefox
- [ ] Respects user's "Do Not Disturb" settings
- [ ] Can be disabled by user

## Resources

- [MDN: Notification API](https://developer.mozilla.org/en-US/docs/Web/API/Notification)
- [MDN: Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [web-push library](https://github.com/web-push-libs/web-push)
- [Next.js PWA Plugin](https://github.com/shadowwalker/next-pwa)
