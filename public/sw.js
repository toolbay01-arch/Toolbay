/**
 * Custom Service Worker for Push Notifications
 * Version: 1.1.0
 * 
 * Simple service worker that handles push notifications only.
 * No precaching, no complex workbox logic - just push notifications.
 * 
 * Changelog:
 * - 1.1.0: Force PWA cache update, improved mobile support
 * - 1.0.0: Initial release
 */

const SW_VERSION = '1.1.0';
const CACHE_NAME = `toolboxx-sw-${SW_VERSION}`;

// Install event - just skip waiting to activate immediately
self.addEventListener('install', (event) => {
  console.log(`[SW ${SW_VERSION}] Installing...`);
  // Skip waiting to activate immediately
  self.skipWaiting();
});

// Activate event - claim all clients immediately
self.addEventListener('activate', (event) => {
  console.log(`[SW ${SW_VERSION}] Activating...`);
  event.waitUntil(
    Promise.all([
      // Claim all clients immediately
      self.clients.claim(),
      // Clean up old caches - including old SW versions
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(cacheName => 
              cacheName !== CACHE_NAME && // Keep current cache
              (cacheName.startsWith('workbox-') || 
               cacheName.startsWith('next-pwa-') || 
               cacheName.startsWith('toolboxx-sw-')) // Delete old versions
            )
            .map(cacheName => {
              console.log(`[SW ${SW_VERSION}] Deleting old cache:`, cacheName);
              return caches.delete(cacheName);
            })
        );
      })
    ]).then(() => {
      console.log(`[SW ${SW_VERSION}] Activated and claimed all clients`);
    })
  );
});

// Push event - show notification
self.addEventListener('push', (event) => {
  console.log('[SW] Push event received:', event);

  let notificationData = {
    title: 'New Notification',
    body: 'You have a new notification',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    tag: 'default',
    data: {}
  };

  try {
    if (event.data) {
      const payload = event.data.json();
      console.log('[SW] Push payload:', payload);
      
      notificationData = {
        title: payload.title || notificationData.title,
        body: payload.body || payload.message || notificationData.body,
        icon: payload.icon || notificationData.icon,
        badge: payload.badge || notificationData.badge,
        tag: payload.tag || notificationData.tag,
        data: payload.data || payload,
        // Additional options
        requireInteraction: payload.requireInteraction || false,
        silent: payload.silent || false,
        vibrate: payload.vibrate || [200, 100, 200],
      };
    }
  } catch (error) {
    console.error('[SW] Error parsing push data:', error);
  }

  const promiseChain = self.registration.showNotification(
    notificationData.title,
    {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      data: notificationData.data,
      requireInteraction: notificationData.requireInteraction,
      silent: notificationData.silent,
      vibrate: notificationData.vibrate,
    }
  );

  event.waitUntil(promiseChain);
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click:', event.notification);
  
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window open
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // If not, open a new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      })
  );
});

// Message event - handle messages from clients
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log(`[SW ${SW_VERSION}] Service Worker loaded`);
