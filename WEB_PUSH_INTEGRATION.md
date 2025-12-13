# Web Push Integration Guide

## Phase 2: Complete Web Push Implementation ✅

This guide covers the complete implementation of web push notifications that work even when the browser is closed.

## Table of Contents
1. [Quick Start](#quick-start)
2. [User Interface Integration](#user-interface-integration)
3. [Backend Integration](#backend-integration)
4. [Testing](#testing)
5. [Troubleshooting](#troubleshooting)

---

## Quick Start

### 1. Add Web Push Subscription UI

Add the subscription component to your user settings or dashboard:

```tsx
import { WebPushSubscription } from '@/components/web-push-subscription';
import { useUser } from '@/hooks/use-user'; // Your user hook

export function SettingsPage() {
  const user = useUser();
  
  return (
    <div>
      <h1>Settings</h1>
      
      {/* Full card version */}
      <WebPushSubscription 
        userId={user?.id} 
        autoSubscribe={false} 
      />
      
      {/* Or compact button version */}
      <WebPushSubscription 
        userId={user?.id} 
        compact={true} 
      />
    </div>
  );
}
```

### 2. Use the Hook Directly

For custom UI, use the `useWebPush` hook:

```tsx
import { useWebPush } from '@/hooks/use-web-push';

export function CustomPushButton() {
  const user = useUser();
  const { 
    isSupported, 
    isSubscribed, 
    isLoading, 
    subscribe, 
    unsubscribe 
  } = useWebPush({ userId: user?.id });

  if (!isSupported) return null;

  return (
    <button 
      onClick={isSubscribed ? unsubscribe : subscribe}
      disabled={isLoading}
    >
      {isSubscribed ? 'Disable' : 'Enable'} Push Notifications
    </button>
  );
}
```

---

## User Interface Integration

### Auto-Subscribe on Login

Enable automatic subscription when users log in:

```tsx
import { useWebPush } from '@/hooks/use-web-push';
import { useEffect } from 'react';

export function AutoPushSubscriber() {
  const user = useUser();
  
  useWebPush({ 
    userId: user?.id, 
    autoSubscribe: true  // Automatically subscribe when user logs in
  });

  return null; // This is a headless component
}
```

Add to your layout:

```tsx
import { AutoPushSubscriber } from '@/components/auto-push-subscriber';

export function Layout({ children }) {
  return (
    <>
      <AutoPushSubscriber />
      {children}
    </>
  );
}
```

### Settings Page Integration

Add to user profile/settings page:

```tsx
// src/app/(app)/settings/page.tsx
import { WebPushSubscription } from '@/components/web-push-subscription';

export default function SettingsPage() {
  const user = useUser();
  
  return (
    <div className="space-y-6">
      <h1>Notification Settings</h1>
      
      <WebPushSubscription userId={user?.id} />
    </div>
  );
}
```

---

## Backend Integration

### Sending Push Notifications

#### Option 1: Use Helper Functions (Recommended)

```tsx
// In your payment processing code
import { sendPaymentNotification } from '@/lib/notifications/send-push';

async function processPayment(payment: Payment) {
  // Your payment processing logic...
  
  // Send push notification to seller
  await sendPaymentNotification(
    payment.sellerId,
    payment.amount,
    payment.reference
  );
}
```

```tsx
// In your order creation code
import { sendOrderNotification } from '@/lib/notifications/send-push';

async function createOrder(order: Order) {
  // Your order creation logic...
  
  // Notify seller of new order
  await sendOrderNotification(
    order.sellerId,
    order.id,
    order.productName
  );
}
```

```tsx
// In your messaging code
import { sendMessageNotification } from '@/lib/notifications/send-push';

async function sendMessage(message: Message) {
  // Your message sending logic...
  
  // Notify recipient
  await sendMessageNotification(
    message.recipientId,
    message.senderName,
    message.conversationId
  );
}
```

#### Option 2: Custom Notifications

```tsx
import { sendPushNotification } from '@/lib/notifications/send-push';

await sendPushNotification({
  userId: 'user-123',
  title: 'Custom Notification',
  body: 'Your custom message here',
  icon: '/custom-icon.png',
  url: '/custom-page',
  type: 'general',
  data: {
    customField: 'customValue',
  },
});
```

#### Option 3: Direct API Call

```tsx
const response = await fetch('/api/push/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user-123',
    notification: {
      title: 'Direct API Call',
      body: 'Notification via API',
      data: {
        url: '/target-page',
        type: 'payment',
      },
    },
  }),
});
```

### Integration Points

#### 1. Payment Verification (MoMo Callback)

```tsx
// src/app/api/momo/callback/route.ts
import { sendPaymentNotification } from '@/lib/notifications/send-push';

export async function POST(req: Request) {
  const payment = await verifyPayment(req);
  
  if (payment.status === 'SUCCESS') {
    // Send push notification
    await sendPaymentNotification(
      payment.sellerId,
      payment.amount,
      payment.reference
    );
    
    // Also send browser notification if implemented
    // ...
  }
  
  return Response.json({ success: true });
}
```

#### 2. Order Creation

```tsx
// src/app/api/orders/create/route.ts
import { sendOrderNotification } from '@/lib/notifications/send-push';

export async function POST(req: Request) {
  const order = await createOrder(req);
  
  // Notify seller
  await sendOrderNotification(
    order.sellerId,
    order.id,
    order.items[0].productName
  );
  
  return Response.json(order);
}
```

#### 3. New Messages

```tsx
// src/app/api/messages/send/route.ts
import { sendMessageNotification } from '@/lib/notifications/send-push';

export async function POST(req: Request) {
  const message = await sendMessage(req);
  
  // Notify recipient
  await sendMessageNotification(
    message.recipientId,
    message.sender.name,
    message.conversationId
  );
  
  return Response.json(message);
}
```

#### 4. Using Payload Hooks

Add to your collection hooks:

```tsx
// src/collections/Transactions.ts
import { sendPaymentNotification } from '@/lib/notifications/send-push';

export const Transactions: CollectionConfig = {
  slug: 'transactions',
  hooks: {
    afterChange: [
      async ({ doc, operation }) => {
        if (operation === 'create' && doc.status === 'SUCCESSFUL') {
          // Send push notification
          await sendPaymentNotification(
            doc.tenant, // seller ID
            doc.amount,
            doc.reference
          );
        }
      },
    ],
  },
  // ... rest of config
};
```

---

## Testing

### 1. Test on Desktop

1. Open your app in Chrome/Edge/Firefox
2. Navigate to settings page with `WebPushSubscription` component
3. Click "Enable Push Notifications"
4. Grant permission when prompted
5. Check browser DevTools → Application → Service Workers (should see registered)
6. Send a test notification using one of these methods:

```tsx
// Method 1: Use helper function
import { sendPushNotification } from '@/lib/notifications/send-push';

await sendPushNotification({
  userId: 'your-user-id',
  title: 'Test Notification',
  body: 'This is a test!',
  url: '/',
  type: 'general',
});
```

```bash
# Method 2: Use curl
curl -X POST http://localhost:3000/api/push/send \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "your-user-id",
    "notification": {
      "title": "Test Notification",
      "body": "Testing push notifications!",
      "data": {
        "url": "/",
        "type": "general"
      }
    }
  }'
```

### 2. Test Background Notifications

1. Close your browser completely
2. Send a test notification (using curl or another device)
3. You should see the notification appear even with browser closed!

### 3. Test on Mobile

#### Android (Chrome/Edge):
1. Open your deployed app on mobile
2. Enable push notifications
3. Add to home screen (optional but recommended)
4. Close browser
5. Send test notification
6. Should appear in notification tray

#### iOS (Safari):
Note: iOS requires app to be added to home screen for background push to work.

1. Open app in Safari
2. Tap Share → Add to Home Screen
3. Open from home screen
4. Enable notifications
5. Close app
6. Send test notification

### 4. Debugging Tools

Check service worker status:
- Chrome: `chrome://serviceworker-internals`
- Firefox: `about:debugging#/runtime/this-firefox`

Check push subscription:
```javascript
// In browser console
navigator.serviceWorker.ready.then(registration => {
  registration.pushManager.getSubscription().then(subscription => {
    console.log('Subscription:', subscription);
  });
});
```

---

## Troubleshooting

### Notifications Not Appearing

1. **Check service worker registration**:
```javascript
navigator.serviceWorker.getRegistrations().then(registrations => {
  console.log('Registrations:', registrations);
});
```

2. **Check notification permission**:
```javascript
console.log('Permission:', Notification.permission);
```

3. **Check push subscription exists**:
```javascript
navigator.serviceWorker.ready.then(reg => {
  reg.pushManager.getSubscription().then(sub => {
    console.log('Subscription:', sub);
  });
});
```

4. **Check browser console for errors** in both main page and service worker

5. **Verify VAPID keys** are correctly set in `.env`:
```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BLeVKTD...
VAPID_PRIVATE_KEY=NflOoTj...
```

### Permission Denied

If user previously denied permission:
1. Click lock icon in address bar
2. Find "Notifications" setting
3. Change to "Allow"
4. Refresh page and try again

### Service Worker Not Updating

1. Unregister old service worker:
```javascript
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(reg => reg.unregister());
});
```

2. Clear browser cache
3. Hard refresh (Ctrl+Shift+R)

### Push Subscription Failed

1. Check VAPID public key is accessible:
```javascript
console.log('VAPID Key:', process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);
```

2. Verify service worker is active:
```javascript
navigator.serviceWorker.ready.then(reg => {
  console.log('State:', reg.active?.state);
});
```

### Database Errors

If you see "collection not found" errors:
1. Regenerate Payload types: `bun run generate:types`
2. Restart dev server
3. Check `PushSubscriptions` collection is imported in `payload.config.ts`

---

## Environment Variables

Ensure these are set in `.env`:

```bash
# VAPID Keys for Web Push
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BLeVKTD...
VAPID_PRIVATE_KEY=NflOoTj...

# App URL (for API calls)
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

---

## Production Deployment

### Pre-deployment Checklist

- [ ] VAPID keys set in production environment
- [ ] Service worker file (`/public/sw.js`) is committed
- [ ] Manifest file (`/public/manifest.json`) is committed
- [ ] Icons exist in `/public` directory
- [ ] `PushSubscriptions` collection migrated to production DB
- [ ] Test notifications work in staging environment
- [ ] HTTPS enabled (required for service workers)

### Deployment Steps

1. **Deploy code** with all web push files
2. **Set environment variables** in your hosting platform
3. **Test service worker** registration on production URL
4. **Test push subscription** flow
5. **Send test notification** to verify end-to-end

---

## Best Practices

1. **Always request permission at appropriate time** - Don't ask immediately on page load
2. **Explain why** notifications are useful before requesting permission
3. **Handle errors gracefully** - Service workers can fail, subscriptions can expire
4. **Re-subscribe on errors** - If push fails with 404/410, subscription expired
5. **Test on multiple browsers** - Chrome, Firefox, Edge, Safari all behave differently
6. **Mobile-first approach** - Most users will use this on mobile devices
7. **Monitor subscription health** - Track active vs inactive subscriptions
8. **Rate limit notifications** - Don't spam users with too many notifications

---

## Next Steps

1. Add subscription UI to key pages (settings, dashboard, verify-payments)
2. Integrate push sending into payment/order/message flows
3. Test thoroughly on desktop and mobile
4. Deploy to production
5. Monitor notification delivery rates
6. Gather user feedback and iterate

---

## Support

For issues or questions:
- Check DevTools console for errors
- Verify environment variables
- Test in incognito mode (clean state)
- Check browser compatibility
- Review [Web Push Protocol](https://web.dev/push-notifications/) documentation
