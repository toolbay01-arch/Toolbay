/**
 * Web Push Initializer
 * Ensures service worker is registered early on page load
 */

'use client';

import { useEffect } from 'react';
import { webPushService } from '@/lib/notifications/web-push';

export function WebPushInitializer() {
  useEffect(() => {
    // Check if service worker file exists
    const checkServiceWorker = async () => {
      try {
        const response = await fetch('/sw.js', { method: 'HEAD' });
        console.log('[WebPushInitializer] Service worker file check:', {
          status: response.status,
          ok: response.ok,
          url: response.url
        });
      } catch (error) {
        console.error('[WebPushInitializer] Service worker file not accessible:', error);
      }
    };

    checkServiceWorker();

    // Initialize web push service on mount
    // This triggers the constructor which auto-registers the service worker
    if (webPushService.isSupported()) {
      console.log('[WebPushInitializer] Triggering service worker initialization...');
      console.log('[WebPushInitializer] Browser support:', {
        serviceWorker: 'serviceWorker' in navigator,
        PushManager: 'PushManager' in window,
        Notification: 'Notification' in window
      });
      
      // Try to get subscription to ensure registration happens
      webPushService.getSubscription()
        .then((subscription) => {
          console.log('[WebPushInitializer] Initial subscription check:', !!subscription);
        })
        .catch((error) => {
          console.error('[WebPushInitializer] Failed to initialize:', error);
        });
    } else {
      console.warn('[WebPushInitializer] Web push not supported in this browser');
    }
  }, []);

  // This component renders nothing
  return null;
}
