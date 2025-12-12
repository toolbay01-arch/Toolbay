# Example: Integrating Notifications into Your App

This file shows the exact changes needed to add browser notifications to your ToolBoxx app.

## Step 1: Update Your Layout

**File:** `/src/app/(app)/layout.tsx`

### Before:
```tsx
import { TRPCReactProvider } from "@/trpc/client";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <NuqsAdapter>
          <TRPCReactProvider>
            <NavigationProgress />
            <Navbar />
            {children}
            <Toaster />
            <PerformanceMonitor />
          </TRPCReactProvider>
        </NuqsAdapter>
      </body>
    </html>
  );
}
```

### After:
```tsx
import { TRPCReactProvider } from "@/trpc/client";
import { NotificationProvider } from "@/components/notification-provider"; // ← Add this

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <NuqsAdapter>
          <TRPCReactProvider>
            <NotificationProvider> {/* ← Add this wrapper */}
              <NavigationProgress />
              <Navbar />
              {children}
              <Toaster />
              <PerformanceMonitor />
            </NotificationProvider> {/* ← Close wrapper */}
          </TRPCReactProvider>
        </NuqsAdapter>
      </body>
    </html>
  );
}
```

## Step 2: Add Notification Prompt to Dashboard

You can add the notification prompt to any of these pages:

### Option A: My Store Page (for Tenants)

**File:** `/src/app/(app)/my-store/page.tsx`

Add at the top of your component, before the tabs:

```tsx
import { NotificationPrompt } from '@/components/notification-prompt';

export default function MyStorePage() {
  // ... existing code ...

  return (
    <div className="container mx-auto px-4 py-4 md:py-8">
      {/* Add notification prompt */}
      <div className="mb-4">
        <NotificationPrompt />
      </div>

      <div className="mb-4 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-1 md:mb-2">My Store</h1>
        {/* ... rest of your code ... */}
      </div>
    </div>
  );
}
```

### Option B: Verify Payments Page (for Tenants)

**File:** `/src/app/(app)/verify-payments/page.tsx`

```tsx
import { NotificationPrompt } from '@/components/notification-prompt';

export default function VerifyPaymentsPage() {
  // ... existing code ...

  return (
    <div className="container mx-auto px-4 py-4 md:py-8">
      {/* Add notification prompt */}
      <div className="mb-4">
        <NotificationPrompt />
      </div>

      <div className="mb-4 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-1 md:mb-2">
          Transactions & Orders
        </h1>
        {/* ... rest of your code ... */}
      </div>
    </div>
  );
}
```

### Option C: Orders Page (for Customers)

**File:** `/src/app/(app)/orders/page.tsx`

Same pattern - add the prompt at the top.

### Option D: Add to Navbar (Always Visible)

**File:** `/src/modules/home/ui/components/navbar.tsx`

Add a compact notification button to the navbar:

```tsx
import { NotificationPromptCompact } from '@/components/notification-prompt';

export function Navbar() {
  return (
    <nav>
      {/* ... existing navbar code ... */}
      
      {/* Add this in your action buttons area */}
      {session.data?.user && (
        <NotificationPromptCompact />
      )}
      
      {/* ... rest of navbar ... */}
    </nav>
  );
}
```

## Step 3: Test It!

1. **Start your dev server:**
   ```bash
   npm run dev
   # or
   bun dev
   ```

2. **Open your app in browser:**
   - Navigate to `/my-store` or `/verify-payments`
   - You should see the notification prompt

3. **Enable notifications:**
   - Click "Enable Notifications"
   - Browser will ask for permission
   - Click "Allow"

4. **Test notifications:**
   - Open a second browser tab
   - Create a new payment/order/message in that tab
   - You should see a notification appear!

## Step 4 (Optional): Add Notification Sounds

1. **Download notification sounds:**
   - Visit https://notificationsounds.com/
   - Download a short notification sound (< 1 second)
   - Save as `notification.mp3`

2. **Add to your project:**
   ```
   /public/sounds/notification.mp3
   /public/sounds/message.mp3
   ```

3. **Sounds will play automatically!** (Already configured in the hooks)

## Step 5 (Optional): Customize Notification Messages

Edit `/src/lib/notifications/browser-notifications.ts`:

```tsx
async showPaymentNotification(amount: string, transactionId: string) {
  return this.show({
    type: 'payment',
    title: '💰 Ka-ching! New Payment', // ← Your custom title
    message: `You received ${amount}!`, // ← Your custom message
    url: '/verify-payments',
    id: transactionId,
    tag: `payment-${transactionId}`,
  });
}
```

## Complete Example: Enhanced My Store Page

Here's a complete example showing how to integrate notifications into the My Store page:

```tsx
'use client';

import { useTRPC } from '@/trpc/client';
import { useQuery } from '@tanstack/react-query';
import { NotificationPrompt } from '@/components/notification-prompt';
import { NotificationStatus } from '@/components/notification-prompt';

export default function MyStorePage() {
  const trpc = useTRPC();
  
  // Session check
  const session = useQuery({
    ...trpc.auth.session.queryOptions(),
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
    staleTime: 0,
  });

  // ... rest of your existing code ...

  return (
    <div className="container mx-auto px-4 py-4 md:py-8">
      {/* Notification Section */}
      <div className="mb-6">
        <NotificationPrompt />
      </div>

      {/* Page Header with Notification Status */}
      <div className="mb-4 md:mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-1 md:mb-2">
            My Store
          </h1>
          <p className="text-sm md:text-base text-gray-600">
            Manage your products and inventory
          </p>
        </div>
        
        {/* Show notification status in header */}
        <div className="hidden md:block">
          <NotificationStatus />
        </div>
      </div>

      {/* Rest of your existing page content */}
      {/* ... tabs, product list, etc. ... */}
    </div>
  );
}
```

## Debugging

If notifications aren't working:

### 1. Check Permission Status
Add this temporarily to your page:

```tsx
import { notificationService } from '@/lib/notifications/browser-notifications';

export default function MyStorePage() {
  useEffect(() => {
    console.log('Notification supported:', notificationService.isSupported());
    console.log('Notification permission:', notificationService.getPermission());
    console.log('Notification enabled:', notificationService.isEnabled());
  }, []);

  // ... rest of component
}
```

### 2. Test Manual Notification
Add a test button:

```tsx
import { notificationService } from '@/lib/notifications/browser-notifications';
import { Button } from '@/components/ui/button';

function TestButton() {
  const testNotification = async () => {
    if (!notificationService.isEnabled()) {
      await notificationService.requestPermission();
    }
    await notificationService.showPaymentNotification('RWF 50,000', 'test-123');
  };

  return <Button onClick={testNotification}>Test Notification</Button>;
}
```

### 3. Check Browser Console
Open DevTools → Console and look for:
- "Notifications are not supported" → Browser doesn't support
- "Notifications are not enabled" → User needs to grant permission
- Permission status logs

### 4. Check Browser Settings
- Chrome: Settings → Privacy and security → Site Settings → Notifications
- Firefox: Preferences → Privacy & Security → Permissions → Notifications
- Safari: Preferences → Websites → Notifications

## That's It! 🎉

You now have browser notifications working in your app:
- ✅ Automatic detection of new payments
- ✅ Automatic detection of new messages
- ✅ Automatic detection of order updates
- ✅ Clean UI for requesting permissions
- ✅ Role-based notifications (tenants vs customers)
- ✅ Click notification → Navigate to relevant page

## Next Steps

1. **Test with real users** to gather feedback
2. **Add notification sounds** for better UX
3. **Customize messages** to match your brand
4. **Implement Phase 2** (Web Push) for background notifications
5. **Convert to PWA** for installable app experience

See `WEB_PUSH_GUIDE.md` for Phase 2 implementation!
