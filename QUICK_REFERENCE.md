# Browser Notifications - Quick Reference

## 🎯 One-Minute Setup

```tsx
// 1. Add to layout.tsx
import { NotificationProvider } from '@/components/notification-provider';

<NotificationProvider>{children}</NotificationProvider>

// 2. Add to dashboard page
import { NotificationPrompt } from '@/components/notification-prompt';

<NotificationPrompt />
```

Done! Notifications now work automatically. 🎉

---

## 📦 What You Get

| Feature | Works Now | Notes |
|---------|-----------|-------|
| Payment notifications | ✅ | For tenants only |
| Order notifications | ✅ | For customers only |
| Chat notifications | ✅ | For all users |
| Product alerts | ✅ | Low stock, out of stock |
| Click to navigate | ✅ | Opens relevant page |
| Sound support | ✅ | Add `/public/sounds/*.mp3` |

---

## 🔧 Manual Usage

```tsx
import { notificationService } from '@/lib/notifications/browser-notifications';

// Request permission
await notificationService.requestPermission();

// Check if enabled
const enabled = notificationService.isEnabled(); // true/false

// Show custom notification
await notificationService.show({
  type: 'payment',
  title: 'Custom Title',
  message: 'Custom message',
  url: '/destination',
  id: 'unique-id',
});

// Specific notification types
await notificationService.showPaymentNotification('RWF 50,000', 'txn-123');
await notificationService.showChatNotification('John', 'Hello!', 'conv-456');
await notificationService.showOrderNotification('1234', 'shipped', 'order-789');
await notificationService.showProductNotification('Hammer', 'low-stock', 'prod-999');
```

---

## 🎨 Components

```tsx
// Full prompt card
import { NotificationPrompt } from '@/components/notification-prompt';
<NotificationPrompt />

// Compact button for navbar
import { NotificationPromptCompact } from '@/components/notification-prompt';
<NotificationPromptCompact />

// Status indicator
import { NotificationStatus } from '@/components/notification-prompt';
<NotificationStatus />
```

---

## 🪝 Hooks

```tsx
// Permission hook
import { useNotificationPermission } from '@/hooks/use-notification-permission';

const { permission, isEnabled, requestPermission } = useNotificationPermission();

// Auto-notification hooks (already used by NotificationProvider)
import { usePaymentNotifications } from '@/hooks/use-payment-notifications';
import { useChatNotifications } from '@/hooks/use-chat-notifications';
import { useOrderNotifications } from '@/hooks/use-order-notifications';

usePaymentNotifications({ enabled: true, playSound: true });
```

---

## ⚙️ Configuration

```tsx
// Customize polling interval
// Edit the hook files: use-*-notifications.ts
refetchInterval: 30000, // milliseconds (30s default)

// Disable sound
usePaymentNotifications({ enabled: true, playSound: false });

// Customize messages
// Edit: /src/lib/notifications/browser-notifications.ts
async showPaymentNotification(amount: string, transactionId: string) {
  return this.show({
    title: 'Your Custom Title', // ← Change this
    message: 'Your custom message', // ← Change this
    // ...
  });
}
```

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| No notifications | Check browser settings → Notifications |
| Permission denied | User clicked "Block" - reset in browser settings |
| Not supported | Browser too old or incognito mode |
| Duplicates | Normal with multiple tabs open |
| No sound | Add `/public/sounds/notification.mp3` |

### Debug Code

```tsx
// Check status
console.log('Supported:', notificationService.isSupported());
console.log('Permission:', notificationService.getPermission());
console.log('Enabled:', notificationService.isEnabled());

// Test notification
<Button onClick={async () => {
  await notificationService.requestPermission();
  await notificationService.showPaymentNotification('Test', '123');
}}>
  Test
</Button>
```

---

## 📱 Browser Support

| Browser | Desktop | Mobile |
|---------|---------|--------|
| Chrome  | ✅ | ✅ |
| Firefox | ✅ | ✅ |
| Safari  | ✅ | ✅ (iOS 16.4+) |
| Edge    | ✅ | ✅ |

---

## 📚 Documentation

| File | Purpose |
|------|---------|
| `NOTIFICATIONS_SUMMARY.md` | Overview & quick start |
| `INTEGRATION_GUIDE.md` | Detailed integration steps |
| `EXAMPLE_INTEGRATION.md` | Code examples |
| `WEB_PUSH_GUIDE.md` | Advanced (Phase 2) |
| `BROWSER_NOTIFICATIONS_GUIDE.md` | Architecture details |

---

## 🚀 Next Steps

1. ✅ Add `<NotificationProvider>` to layout
2. ✅ Add `<NotificationPrompt>` to dashboard
3. ⏭️ Test with users
4. ⏭️ Add sound files (optional)
5. ⏭️ Implement Web Push (Phase 2)
6. ⏭️ Convert to PWA

---

## 💡 Pro Tips

- Don't ask for permission on page load
- Explain WHY users should enable notifications
- Test on mobile - behavior differs from desktop
- Add sounds for better UX
- Consider user timezones for non-urgent notifications

---

## 🎵 Sound Files

Download free sounds from:
- [Freesound.org](https://freesound.org/)
- [Zapsplat.com](https://www.zapsplat.com/)
- [NotificationSounds.com](https://notificationsounds.com/)

Place in:
```
/public/sounds/notification.mp3  (payment, order, transaction)
/public/sounds/message.mp3       (chat messages)
```

---

## 🔐 Permissions

Notification permissions are:
- `default` - Not asked yet
- `granted` - User allowed notifications
- `denied` - User blocked notifications

Can't programmatically reset `denied` - user must do it manually in browser settings.

---

## 📊 Notification Behavior

| Event | Notification Shown | Recipient |
|-------|-------------------|-----------|
| New payment | ✅ "Payment Received" | Tenant |
| New order | ✅ "New Order" | Tenant |
| Order shipped | ✅ "Order Shipped" | Customer |
| New message | ✅ "New Message" | Sender & Recipient |
| Low stock | ✅ "Stock Alert" | Tenant |
| Out of stock | ✅ "Out of Stock" | Tenant |

---

**Need help?** Check the full guides or browser console for errors.
