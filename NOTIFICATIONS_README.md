# 🔔 Browser Notifications for ToolBoxx

Complete browser notification system for your multi-tenant e-commerce platform.

## ✨ Features

- 💰 **Payment Notifications** - Instant alerts for new payments
- 📦 **Order Notifications** - Updates on order status changes  
- 💬 **Chat Notifications** - Real-time message alerts
- 🔔 **Product Alerts** - Low stock and out-of-stock warnings
- 🎵 **Sound Support** - Optional audio alerts
- 📱 **Mobile & Desktop** - Works on all modern browsers
- 🎯 **Role-Based** - Tenants see payments, customers see orders
- 🚀 **Easy Integration** - Drop-in provider component

## 🚀 Quick Start (2 Minutes)

### 1. Add NotificationProvider

```tsx
// src/app/(app)/layout.tsx
import { NotificationProvider } from '@/components/notification-provider';

export default function Layout({ children }) {
  return (
    <NotificationProvider>
      {children}
    </NotificationProvider>
  );
}
```

### 2. Add Notification Prompt

```tsx
// Any dashboard page (my-store, verify-payments, orders, etc.)
import { NotificationPrompt } from '@/components/notification-prompt';

export default function Dashboard() {
  return (
    <div>
      <NotificationPrompt />
      {/* Your page content */}
    </div>
  );
}
```

### 3. Done! 🎉

Notifications will automatically appear for:
- New payments (tenants)
- New messages (all users)
- Order updates (customers)

## 📚 Documentation

| Document | Purpose | Read Time |
|----------|---------|-----------|
| **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** | One-page reference | 2 min |
| **[NOTIFICATIONS_SUMMARY.md](./NOTIFICATIONS_SUMMARY.md)** | Complete overview | 5 min |
| **[EXAMPLE_INTEGRATION.md](./EXAMPLE_INTEGRATION.md)** | Step-by-step examples | 10 min |
| **[INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)** | Detailed guide | 15 min |
| **[BROWSER_NOTIFICATIONS_GUIDE.md](./BROWSER_NOTIFICATIONS_GUIDE.md)** | Architecture & design | 20 min |
| **[WEB_PUSH_GUIDE.md](./WEB_PUSH_GUIDE.md)** | Advanced features | 30 min |

## 🎯 What's Included

### Phase 1: Browser Notifications (✅ Ready Now)

```
src/
├── lib/notifications/
│   ├── notification-types.ts          # TypeScript types
│   └── browser-notifications.ts       # Core service
├── hooks/
│   ├── use-notification-permission.ts # Permission management
│   ├── use-payment-notifications.ts   # Payment alerts
│   ├── use-chat-notifications.ts      # Message alerts
│   └── use-order-notifications.ts     # Order alerts
└── components/
    ├── notification-prompt.tsx        # UI components
    └── notification-provider.tsx      # Global provider
```

### Phase 2: Web Push (📋 Future)

See [WEB_PUSH_GUIDE.md](./WEB_PUSH_GUIDE.md) for:
- Service Worker implementation
- VAPID key setup
- Background notifications
- PWA conversion

## 🔧 Usage Examples

### Automatic (Recommended)

```tsx
// Just add the provider - it handles everything!
<NotificationProvider>
  <App />
</NotificationProvider>
```

### Manual Control

```tsx
import { notificationService } from '@/lib/notifications/browser-notifications';

// Request permission
await notificationService.requestPermission();

// Show payment notification
await notificationService.showPaymentNotification('RWF 50,000', 'txn-123');

// Show chat notification  
await notificationService.showChatNotification('John', 'Hello!', 'conv-456');

// Show order notification
await notificationService.showOrderNotification('1234', 'shipped', 'order-789');
```

### Custom Notifications

```tsx
await notificationService.show({
  type: 'payment',
  title: 'Custom Title',
  message: 'Custom message',
  url: '/destination',
  id: 'unique-id',
});
```

## 🎨 UI Components

```tsx
// Full notification prompt card
<NotificationPrompt />

// Compact button for navbar
<NotificationPromptCompact />

// Status indicator
<NotificationStatus />
```

## 📱 Browser Support

| Browser | Desktop | Mobile | Notes |
|---------|---------|--------|-------|
| Chrome  | ✅ | ✅ | Full support |
| Firefox | ✅ | ✅ | Full support |
| Safari  | ✅ | ✅ | iOS 16.4+ required |
| Edge    | ✅ | ✅ | Full support |

⚠️ **Note:** Notifications don't work in private/incognito mode

## 🎵 Adding Sounds (Optional)

1. Download notification sounds from:
   - [Freesound.org](https://freesound.org/)
   - [Zapsplat.com](https://www.zapsplat.com/)

2. Add to your project:
   ```
   /public/sounds/notification.mp3
   /public/sounds/message.mp3
   ```

3. Already configured! Sounds play automatically.

## ⚙️ Configuration

### Change Polling Frequency

```tsx
// Edit: src/hooks/use-payment-notifications.ts
refetchInterval: 30000, // 30 seconds (default)
refetchInterval: 60000, // 60 seconds (less frequent)
```

### Disable Sounds

```tsx
usePaymentNotifications({ enabled: true, playSound: false });
```

### Customize Messages

```tsx
// Edit: src/lib/notifications/browser-notifications.ts
async showPaymentNotification(amount: string, transactionId: string) {
  return this.show({
    title: 'Ka-ching! 💰', // Your custom title
    message: `You received ${amount}!`, // Your custom message
    // ...
  });
}
```

## 🐛 Troubleshooting

### Notifications not showing?

1. Check browser settings → Notifications → Allow for your site
2. Verify not in incognito/private mode
3. Check browser console for errors
4. Try: `notificationService.getPermission()` → Should return `'granted'`

### Permission denied?

User clicked "Block" - they must manually reset in browser settings:
- Chrome: Settings → Privacy → Site Settings → Notifications
- Firefox: Preferences → Privacy & Security → Permissions → Notifications
- Safari: Preferences → Websites → Notifications

### Getting duplicates?

Normal when multiple tabs are open - each tab shows its own notification.

### Sound not playing?

1. Verify file exists: `/public/sounds/notification.mp3`
2. Check system volume
3. Some browsers block autoplay - user must interact with page first

## 🧪 Testing

### Test Button

Add temporarily to any page:

```tsx
import { notificationService } from '@/lib/notifications/browser-notifications';
import { Button } from '@/components/ui/button';

function TestButton() {
  return (
    <Button onClick={async () => {
      if (!notificationService.isEnabled()) {
        await notificationService.requestPermission();
      }
      await notificationService.showPaymentNotification('RWF 50,000', 'test-123');
    }}>
      Test Notification
    </Button>
  );
}
```

### Debug Console

```tsx
console.log('Supported:', notificationService.isSupported());
console.log('Permission:', notificationService.getPermission());
console.log('Enabled:', notificationService.isEnabled());
```

## 🚀 Next Steps

1. ✅ **Integrate** - Add `<NotificationProvider>` to your layout
2. ✅ **Test** - Enable notifications and verify they work
3. ⏭️ **Sounds** - Add notification sound files
4. ⏭️ **Customize** - Adjust messages and timing
5. ⏭️ **Phase 2** - Implement Web Push for background notifications
6. ⏭️ **PWA** - Convert to installable Progressive Web App

## 💡 Best Practices

- ✅ Don't request permission on page load
- ✅ Explain the value to users first
- ✅ Test on mobile devices
- ✅ Respect user preferences
- ✅ Group similar notifications
- ✅ Keep messages concise
- ❌ Don't spam users with notifications
- ❌ Don't repeatedly ask for permission if denied

## 📊 Notification Types

| Event | Recipient | When Shown |
|-------|-----------|------------|
| Payment Received | Tenant | New payment verified |
| Order Placed | Tenant | Customer places order |
| Order Shipped | Customer | Seller ships order |
| Order Delivered | Customer | Order marked delivered |
| New Message | Both | Message sent in chat |
| Low Stock | Tenant | Product quantity ≤ 5 |
| Out of Stock | Tenant | Product quantity = 0 |

## 🤝 Support

- Check the documentation files for detailed guides
- Review browser console for error messages
- Test in different browsers
- Verify notification permissions in browser settings

## 📄 License

Part of the ToolBoxx project.

---

**Ready to implement?** Start with [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) or [EXAMPLE_INTEGRATION.md](./EXAMPLE_INTEGRATION.md)!
