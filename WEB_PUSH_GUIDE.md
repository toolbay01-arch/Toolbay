# Phase 2: Web Push Notifications & PWA

This guide covers implementing Web Push Notifications that work even when the browser is closed.

## Overview

**Web Push Notifications** allow you to send notifications to users even when:
- Your website is closed
- The browser is minimized
- The device is locked (on mobile)

This requires:
1. Service Worker
2. VAPID keys (for secure push)
3. Backend to send notifications
4. Database to store subscriptions

## Step 1: Install Dependencies

```bash
npm install web-push
npm install next-pwa
```

Or with bun:

```bash
bun add web-push
bun add next-pwa
```

## Step 2: Generate VAPID Keys

Run this command to generate VAPID keys:

```bash
npx web-push generate-vapid-keys
```

This will output:
```
Public Key: BCr...
Private Key: XYZ...
```

Add these to your `.env.local`:

```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BCr...
VAPID_PRIVATE_KEY=XYZ...
VAPID_EMAIL=mailto:your-email@example.com
```

## Step 3: Create PWA Manifest

Create `/public/manifest.json`:

```json
{
  "name": "ToolBoxx - Multi-tenant E-commerce",
  "short_name": "ToolBoxx",
  "description": "Multi-tenant e-commerce platform",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

## Step 4: Create Service Worker

Create `/public/sw.js`:

```javascript
// Service Worker for Web Push Notifications
const CACHE_NAME = 'toolboxx-v1';

// Install event
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(clients.claim());
});

// Push notification received
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);
  
  const data = event.data ? event.data.json() : {};
  
  const title = data.title || 'New Notification';
  const options = {
    body: data.body || 'You have a new notification',
    icon: data.icon || '/logo.png',
    badge: '/favicon.ico',
    tag: data.tag || 'notification',
    requireInteraction: data.requireInteraction || false,
    data: data.data || {},
    actions: data.actions || [],
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification clicked
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Check if there's already a window open
        for (let client of windowClients) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // Open a new window
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Background sync (optional)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-notifications') {
    event.waitUntil(syncNotifications());
  }
});

async function syncNotifications() {
  // Fetch pending notifications from server
  console.log('Syncing notifications...');
}
```

## Step 5: Add Push Subscription Collection

Create `/src/collections/PushSubscriptions.ts`:

```typescript
import type { CollectionConfig } from 'payload';

export const PushSubscriptions: CollectionConfig = {
  slug: 'push-subscriptions',
  admin: {
    useAsTitle: 'endpoint',
    defaultColumns: ['user', 'endpoint', 'createdAt'],
  },
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false;
      // Users can only read their own subscriptions
      return {
        user: { equals: user.id },
      };
    },
    create: ({ req: { user } }) => !!user,
    update: ({ req: { user } }) => !!user,
    delete: ({ req: { user } }) => !!user,
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
    },
    {
      name: 'endpoint',
      type: 'text',
      required: true,
      unique: true,
    },
    {
      name: 'keys',
      type: 'group',
      fields: [
        {
          name: 'p256dh',
          type: 'text',
          required: true,
        },
        {
          name: 'auth',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      name: 'userAgent',
      type: 'text',
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
    },
  ],
};
```

## Step 6: Create Web Push Utility

Create `/src/lib/notifications/web-push.ts`:

```typescript
'use client';

/**
 * Web Push Notification utilities
 */

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export class WebPushService {
  private static instance: WebPushService;
  private registration: ServiceWorkerRegistration | null = null;

  private constructor() {}

  static getInstance(): WebPushService {
    if (!WebPushService.instance) {
      WebPushService.instance = new WebPushService();
    }
    return WebPushService.instance;
  }

  /**
   * Register service worker
   */
  async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Workers not supported');
      return null;
    }

    try {
      this.registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered:', this.registration);
      return this.registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return null;
    }
  }

  /**
   * Subscribe to push notifications
   */
  async subscribe(): Promise<PushSubscriptionData | null> {
    if (!this.registration) {
      this.registration = await this.registerServiceWorker();
    }

    if (!this.registration) {
      return null;
    }

    try {
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) {
        throw new Error('VAPID public key not configured');
      }

      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(publicKey),
      });

      const subscriptionData = this.subscriptionToData(subscription);
      
      // Send subscription to server
      await this.sendSubscriptionToServer(subscriptionData);

      return subscriptionData;
    } catch (error) {
      console.error('Push subscription failed:', error);
      return null;
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribe(): Promise<boolean> {
    if (!this.registration) {
      return false;
    }

    try {
      const subscription = await this.registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        // Notify server
        await this.removeSubscriptionFromServer(subscription.endpoint);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Unsubscribe failed:', error);
      return false;
    }
  }

  /**
   * Check if user is subscribed
   */
  async isSubscribed(): Promise<boolean> {
    if (!this.registration) {
      this.registration = await this.registerServiceWorker();
    }

    if (!this.registration) {
      return false;
    }

    try {
      const subscription = await this.registration.pushManager.getSubscription();
      return !!subscription;
    } catch (error) {
      return false;
    }
  }

  /**
   * Convert subscription to data object
   */
  private subscriptionToData(subscription: PushSubscription): PushSubscriptionData {
    const key = subscription.getKey('p256dh');
    const auth = subscription.getKey('auth');

    return {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: key ? this.arrayBufferToBase64(key) : '',
        auth: auth ? this.arrayBufferToBase64(auth) : '',
      },
    };
  }

  /**
   * Send subscription to server
   */
  private async sendSubscriptionToServer(subscription: PushSubscriptionData): Promise<void> {
    const response = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(subscription),
    });

    if (!response.ok) {
      throw new Error('Failed to send subscription to server');
    }
  }

  /**
   * Remove subscription from server
   */
  private async removeSubscriptionFromServer(endpoint: string): Promise<void> {
    await fetch('/api/push/unsubscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ endpoint }),
    });
  }

  /**
   * Convert URL-safe base64 to Uint8Array
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/\\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  /**
   * Convert ArrayBuffer to base64
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }
}

export const webPushService = WebPushService.getInstance();
```

## Step 7: Create API Routes

### Subscribe Route

Create `/src/app/api/push/subscribe/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getPayloadSingleton } from '@/lib/payload-singleton';
import { getHeaders } from '@/lib/headers';

export async function POST(request: NextRequest) {
  try {
    const payload = await getPayloadSingleton();
    const headers = await getHeaders();
    
    // Check authentication
    const session = await payload.auth({ headers });
    if (!session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { endpoint, keys } = body;

    // Check if subscription already exists
    const existing = await payload.find({
      collection: 'push-subscriptions',
      where: {
        endpoint: { equals: endpoint },
      },
    });

    if (existing.docs.length > 0) {
      // Update existing subscription
      await payload.update({
        collection: 'push-subscriptions',
        id: existing.docs[0].id,
        data: {
          user: session.user.id,
          endpoint,
          keys,
          userAgent: request.headers.get('user-agent') || '',
          isActive: true,
        },
      });
    } else {
      // Create new subscription
      await payload.create({
        collection: 'push-subscriptions',
        data: {
          user: session.user.id,
          endpoint,
          keys,
          userAgent: request.headers.get('user-agent') || '',
          isActive: true,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Subscribe error:', error);
    return NextResponse.json(
      { error: 'Failed to subscribe' },
      { status: 500 }
    );
  }
}
```

### Send Push Route

Create `/src/app/api/push/send/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import webPush from 'web-push';
import { getPayloadSingleton } from '@/lib/payload-singleton';
import { getHeaders } from '@/lib/headers';

// Configure web-push with VAPID keys
webPush.setVapidDetails(
  process.env.VAPID_EMAIL || '',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
  process.env.VAPID_PRIVATE_KEY || ''
);

export async function POST(request: NextRequest) {
  try {
    const payload = await getPayloadSingleton();
    const headers = await getHeaders();
    
    // Check authentication (only admins or system can send)
    const session = await payload.auth({ headers });
    if (!session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { userId, title, message, url, type } = body;

    // Get user's push subscriptions
    const subscriptions = await payload.find({
      collection: 'push-subscriptions',
      where: {
        user: { equals: userId },
        isActive: { equals: true },
      },
    });

    const notificationPayload = JSON.stringify({
      title,
      body: message,
      icon: '/logo.png',
      data: {
        url,
        type,
      },
    });

    // Send to all user's subscriptions
    const sendPromises = subscriptions.docs.map(async (sub: any) => {
      try {
        await webPush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.keys.p256dh,
              auth: sub.keys.auth,
            },
          },
          notificationPayload
        );
      } catch (error: any) {
        // If subscription is invalid, mark as inactive
        if (error.statusCode === 410) {
          await payload.update({
            collection: 'push-subscriptions',
            id: sub.id,
            data: { isActive: false },
          });
        }
        throw error;
      }
    });

    await Promise.allSettled(sendPromises);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Send push error:', error);
    return NextResponse.json(
      { error: 'Failed to send push notification' },
      { status: 500 }
    );
  }
}
```

## Step 8: Update Next.js Config

Edit `next.config.mjs`:

```javascript
import withPWA from 'next-pwa';

const pwaConfig = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // ... your existing config
};

export default pwaConfig(nextConfig);
```

## Step 9: Add to HTML Head

Update `/src/app/layout.tsx`:

```tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#000000" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

## Step 10: Testing

1. Start your dev server: `npm run dev`
2. Open browser DevTools → Application → Service Workers
3. Verify service worker is registered
4. Click "Subscribe to Push" button
5. Check Application → Push Messaging
6. Send a test notification via API

## Production Deployment

1. **Generate production VAPID keys**
2. **Add to environment variables** on your hosting platform
3. **Enable HTTPS** (required for service workers)
4. **Test on mobile devices**

## Resources

- [Web Push Protocol](https://web.dev/push-notifications-overview/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [web-push library](https://github.com/web-push-libs/web-push)
- [next-pwa](https://github.com/shadowwalker/next-pwa)
