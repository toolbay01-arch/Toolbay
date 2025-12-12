# Browser Notifications - Integration Guide

## Quick Start

### 1. Add NotificationProvider to Your Layout

Open `/src/app/(app)/layout.tsx` and wrap your app with the NotificationProvider:

```tsx
import { NotificationProvider } from '@/components/notification-provider';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <TRPCProvider>
          <NotificationProvider>
            {children}
          </NotificationProvider>
        </TRPCProvider>
      </body>
    </html>
  );
}
```

### 2. Add Notification Prompt to Your Dashboard

Add to `/src/app/(app)/my-store/page.tsx` or any main dashboard page:

```tsx
import { NotificationPrompt } from '@/components/notification-prompt';

export default function MyStorePage() {
  return (
    <div>
      {/* Show notification prompt at the top */}
      <NotificationPrompt />
      
      {/* Rest of your page */}
      {/* ... */}
    </div>
  );
}
```

### 3. Test It!

1. Open your app in the browser
2. You'll see a prompt asking to enable notifications
3. Click "Enable Notifications"
4. Browser will ask for permission
5. Once granted, you'll receive notifications for:
   - New payments (for tenants)
   - New chat messages (for all users)
   - Order updates (for customers)

## Manual Notification Triggers

You can also manually trigger notifications anywhere in your app:

```tsx
import { notificationService } from '@/lib/notifications/browser-notifications';

// In any component or function
const handlePaymentReceived = async (amount: string, transactionId: string) => {
  // Show notification
  await notificationService.showPaymentNotification(amount, transactionId);
};

const handleNewMessage = async (sender: string, message: string, conversationId: string) => {
  await notificationService.showChatNotification(sender, message, conversationId);
};

const handleOrderShipped = async (orderNumber: string, orderId: string) => {
  await notificationService.showOrderNotification(orderNumber, 'shipped', orderId);
};
```

## Adding Notification Sounds

### 1. Add sound files to your project

Create sound files in `/public/sounds/`:
- `/public/sounds/notification.mp3` - For payments/orders
- `/public/sounds/message.mp3` - For chat messages

You can download free notification sounds from:
- [Freesound](https://freesound.org/)
- [Zapsplat](https://www.zapsplat.com/)
- [Notification Sounds](https://notificationsounds.com/)

### 2. Configure sound preferences

The hooks already support sound - just pass `playSound: true`:

```tsx
usePaymentNotifications({ enabled: true, playSound: true });
```

## Customizing Notification Behavior

### Change Polling Intervals

Edit the hooks to change how often notifications are checked:

```tsx
// In use-payment-notifications.ts
refetchInterval: 30000, // Check every 30 seconds (default)
refetchInterval: 60000, // Check every 60 seconds (less frequent)
refetchInterval: 15000, // Check every 15 seconds (more frequent)
```

### Disable Specific Notification Types

```tsx
<NotificationProvider
  enabled={true}
  paymentNotifications={true}   // Enable payment notifications
  chatNotifications={false}      // Disable chat notifications
  orderNotifications={true}      // Enable order notifications
/>
```

### Custom Notification Messages

Modify the notification service methods in `/src/lib/notifications/browser-notifications.ts`:

```tsx
async showPaymentNotification(amount: string, transactionId: string) {
  return this.show({
    type: 'payment',
    title: '💰 Ka-ching! Payment Received', // Custom title
    message: `You just received ${amount}!`, // Custom message
    url: '/verify-payments',
    id: transactionId,
  });
}
```

## Advanced: Adding Icons

### 1. Create notification icons

Add icon files to `/public/icons/`:
- `/public/icons/payment.png` (96x96px recommended)
- `/public/icons/order.png`
- `/public/icons/chat.png`
- `/public/icons/product.png`

### 2. Icons are already configured

The notification service automatically uses these icons:
- Payment notifications: `/icons/payment.png`
- Order notifications: `/icons/order.png`
- Chat notifications: `/icons/chat.png`
- Product notifications: `/icons/product.png`
- Fallback: `/logo.png`

## Testing Notifications

### Manual Test

Add a test button to any page:

```tsx
'use client';

import { notificationService } from '@/lib/notifications/browser-notifications';
import { Button } from '@/components/ui/button';

export function TestNotificationButton() {
  const testNotification = async () => {
    if (!notificationService.isEnabled()) {
      await notificationService.requestPermission();
    }
    
    await notificationService.showPaymentNotification(
      'RWF 50,000',
      'test-123'
    );
  };

  return (
    <Button onClick={testNotification}>
      Test Notification
    </Button>
  );
}
```

## Troubleshooting

### Notifications not showing?

1. **Check permission**: Look in browser settings → Notifications
2. **Check if enabled**: `console.log(notificationService.isEnabled())`
3. **Browser support**: Notifications don't work in private/incognito mode
4. **Focus requirement**: Some browsers require user interaction first

### Sound not playing?

1. **Check file exists**: Verify `/public/sounds/notification.mp3` exists
2. **Browser autoplay**: Some browsers block autoplay - user must interact first
3. **Volume**: Check system volume and browser volume settings

### Notifications showing multiple times?

This happens when:
- Multiple tabs are open (each tab shows notification)
- Component re-renders unnecessarily

Solution: The hooks already use `useRef` to track previous counts and prevent duplicates.

## Browser Compatibility

| Browser | Desktop | Mobile | Notes |
|---------|---------|--------|-------|
| Chrome  | ✅ | ✅ | Full support |
| Firefox | ✅ | ✅ | Full support |
| Safari  | ✅ | ✅ (iOS 16.4+) | Requires user interaction |
| Edge    | ✅ | ✅ | Full support |
| Opera   | ✅ | ✅ | Full support |

## Next Steps

After implementing basic notifications, consider:

1. **Phase 2: Web Push Notifications** - See `WEB_PUSH_GUIDE.md`
2. **PWA Support** - Make your app installable
3. **Service Worker** - Background sync and offline support
4. **Analytics** - Track notification engagement
5. **A/B Testing** - Test different notification messages

## Support

For issues or questions:
1. Check browser console for errors
2. Verify notification permissions in browser settings
3. Test in different browsers
4. Check this guide for troubleshooting steps
