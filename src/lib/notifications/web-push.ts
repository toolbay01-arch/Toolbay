/**
 * Web Push Client Service
 * Handles service worker registration, push subscription management, and client-side push setup
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
  private isInitializing: boolean = false;
  private registrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;
  private hasAttemptedCleanup: boolean = false; // Prevent infinite cleanup loops

  private constructor() {
    // Auto-register service worker when supported
    if (typeof window !== 'undefined' && this.isSupported()) {
      this.initializeServiceWorker();
    }
  }

  static getInstance(): WebPushService {
    if (!WebPushService.instance) {
      WebPushService.instance = new WebPushService();
    }
    return WebPushService.instance;
  }

  /**
   * Initialize service worker registration
   */
  private async initializeServiceWorker(): Promise<void> {
    if (this.isInitializing || this.registration || this.registrationPromise) {
      console.log('[WebPush] Registration already in progress or completed');
      return;
    }

    this.isInitializing = true;
    console.log('[WebPush] Auto-initializing service worker...');
    
    try {
      this.registrationPromise = this.registerServiceWorker();
      this.registration = await this.registrationPromise;
    } catch (error) {
      console.error('[WebPush] Auto-initialization failed:', error);
      this.registrationPromise = null;
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Check if browser supports service workers and push notifications
   */
  isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  }

  /**
   * Register the service worker
   */
  async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!this.isSupported()) {
      console.warn('[WebPush] Service Workers or Push API not supported');
      return null;
    }

    // Check if we just reloaded after cleanup - prevent infinite reload loops
    const lastCleanup = sessionStorage.getItem('sw-cleanup-reload');
    if (lastCleanup) {
      const timeSinceCleanup = Date.now() - parseInt(lastCleanup);
      // If cleanup was less than 5 seconds ago, don't try to cleanup again
      if (timeSinceCleanup < 5000) {
        console.log('[WebPush] Recently cleaned up SW, skipping auto-cleanup');
        sessionStorage.removeItem('sw-cleanup-reload');
        this.hasAttemptedCleanup = true; // Mark as attempted to prevent cleanup
      }
    }

    try {
      // Check if already registered
      const existingRegistration = await navigator.serviceWorker.getRegistration('/');
      if (existingRegistration) {
        const state = {
          scope: existingRegistration.scope,
          active: existingRegistration.active?.state,
          installing: existingRegistration.installing?.state,
          waiting: existingRegistration.waiting?.state
        };
        
        console.log('[WebPush] Service worker already registered, using existing:', state);
        
        // Check if SW is in a bad state (redundant, no workers at all, or only installing/waiting)
        const hasNoWorkers = !existingRegistration.active && !existingRegistration.installing && !existingRegistration.waiting;
        const isRedundant = existingRegistration.active?.state === 'redundant';
        
        if (hasNoWorkers || isRedundant) {
          // Only attempt cleanup once to prevent infinite loops
          if (!this.hasAttemptedCleanup) {
            console.warn('[WebPush] Service worker in invalid state, cleaning up and reloading...');
            this.hasAttemptedCleanup = true;
            
            await existingRegistration.unregister();
            
            // Clear all caches to start fresh
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(name => caches.delete(name)));
            console.log('[WebPush] Cleared', cacheNames.length, 'cache(s)');
            
            // Auto-reload to get fresh state - but use sessionStorage to prevent infinite loops
            sessionStorage.setItem('sw-cleanup-reload', Date.now().toString());
            console.log('[WebPush] Reloading page to complete cleanup...');
            window.location.reload();
            
            return null;
          } else {
            // Second attempt - ghost registration persists, force unregister without reload
            console.warn('[WebPush] Ghost service worker registration detected, force cleaning...');
            await existingRegistration.unregister();
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(name => caches.delete(name)));
            console.log('[WebPush] Force unregistered ghost SW, proceeding with fresh registration...');
            // Don't return null, fall through to register a fresh SW
          }
        } else {
          // SW exists and is in valid state, use it
          this.registration = existingRegistration;
          
          // Wait for it to be ready if not already active
          if (!existingRegistration.active || existingRegistration.active.state !== 'activated') {
            console.log('[WebPush] Waiting for existing service worker to activate...');
            try {
              const readyRegistration = await Promise.race([
                navigator.serviceWorker.ready,
                new Promise<never>((_, reject) => 
                  setTimeout(() => reject(new Error('Service worker activation timeout')), 10000)
                )
              ]);
              console.log('[WebPush] Service Worker now ready:', readyRegistration.active?.state);
              return readyRegistration as ServiceWorkerRegistration;
            } catch (timeoutError) {
              console.error('[WebPush] Timeout waiting for SW, unregistering and retrying...');
              await existingRegistration.unregister();
              return this.registerServiceWorker();
            }
          }
          
          return existingRegistration;
        }
      }
      
      console.log('[WebPush] Attempting to register service worker...');
      
      // Register service worker
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none', // Don't cache the service worker file
      });

      console.log('[WebPush] Service Worker registered:', this.registration);
      console.log('[WebPush] Registration state:', {
        installing: this.registration.installing?.state,
        waiting: this.registration.waiting?.state,
        active: this.registration.active?.state,
        scope: this.registration.scope
      });

      // Handle updates - force activation of new service worker
      this.registration.addEventListener('updatefound', () => {
        const newWorker = this.registration?.installing;
        console.log('[WebPush] Service Worker update found');
        
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            console.log('[WebPush] Service Worker state:', newWorker.state);
            
            if (newWorker.state === 'redundant') {
              console.error('[WebPush] Service Worker became redundant, likely due to precache errors');
              console.error('[WebPush] Please clear your browser cache or run:');
              console.error('[WebPush] navigator.serviceWorker.getRegistrations().then(r=>r.forEach(x=>x.unregister()));caches.keys().then(k=>k.forEach(c=>caches.delete(c)));');
              // DO NOT auto-reload - causes infinite loop
            }
            
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New service worker installed but old one still controlling
              console.log('[WebPush] New service worker installed, will activate on next page load');
            }
          });
        }
      });

      // If there's a waiting service worker, skip waiting and activate immediately
      if (this.registration.waiting) {
        console.log('[WebPush] Service Worker waiting, activating now...');
        this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }

      // Wait for service worker to be ready (active) with timeout
      console.log('[WebPush] Waiting for service worker to be ready...');
      try {
        const readyRegistration = await Promise.race([
          navigator.serviceWorker.ready,
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Service worker ready timeout')), 15000)
          )
        ]);
        console.log('[WebPush] Service Worker ready and active:', {
          state: readyRegistration.active?.state,
          scriptURL: readyRegistration.active?.scriptURL
        });

        return readyRegistration as ServiceWorkerRegistration;
      } catch (timeoutError) {
        console.error('[WebPush] Service worker failed to become ready within timeout');
        throw timeoutError;
      }
    } catch (error) {
      console.error('[WebPush] Service Worker registration failed:', error);
      // Log more details about the error
      if (error instanceof Error) {
        console.error('[WebPush] Error details:', {
          message: error.message,
          stack: error.stack
        });
        
        // If it's an invalid state error, suggest clearing caches
        if (error.message.includes('invalid state') || error.message.includes('InvalidStateError')) {
          console.error('[WebPush] Service worker is in invalid state. Run this to reset:');
          console.error('navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister())); caches.keys().then(names => Promise.all(names.map(n => caches.delete(n)))); location.reload();');
        }
      }
      return null;
    }
  }

  /**
   * Get the current push subscription
   */
  async getSubscription(): Promise<PushSubscription | null> {
    if (!this.registration) {
      this.registration = await this.registerServiceWorker();
    }

    if (!this.registration) {
      return null;
    }

    return this.registration.pushManager.getSubscription();
  }

  /**
   * Subscribe to push notifications
   */
  async subscribe(userId: string): Promise<PushSubscription | null> {
    if (!this.isSupported()) {
      console.warn('Push notifications not supported');
      return null;
    }

    // Request notification permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Notification permission denied');
      return null;
    }

    try {
      // Ensure service worker is registered
      if (!this.registration) {
        this.registration = await this.registerServiceWorker();
      }

      if (!this.registration) {
        throw new Error('Failed to register service worker');
      }

      // Check for existing subscription
      let subscription = await this.registration.pushManager.getSubscription();

      if (!subscription) {
        // Subscribe to push notifications
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
        const convertedKey = this.urlBase64ToUint8Array(vapidPublicKey);

        subscription = await this.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedKey as BufferSource,
        });

        console.log('Push subscription created:', subscription);
      }

      // Send subscription to server
      await this.saveSubscription(subscription, userId);

      return subscription;
    } catch (error) {
      console.error('Push subscription failed:', error);
      return null;
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribe(): Promise<boolean> {
    try {
      const subscription = await this.getSubscription();
      
      if (!subscription) {
        console.warn('No active subscription found');
        return false;
      }

      // Unsubscribe on client
      const success = await subscription.unsubscribe();

      if (success) {
        // Delete from server
        await this.deleteSubscription(subscription);
        console.log('Push subscription removed');
      }

      return success;
    } catch (error) {
      console.error('Unsubscribe failed:', error);
      return false;
    }
  }

  /**
   * Save subscription to server
   */
  private async saveSubscription(
    subscription: PushSubscription,
    userId: string
  ): Promise<void> {
    const subscriptionData = this.convertSubscription(subscription);

    const response = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subscription: subscriptionData,
        userId,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to save subscription on server');
    }

    const data = await response.json();
    console.log('Subscription saved:', data);
  }

  /**
   * Delete subscription from server
   */
  private async deleteSubscription(subscription: PushSubscription): Promise<void> {
    const subscriptionData = this.convertSubscription(subscription);

    const response = await fetch('/api/push/subscribe', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        endpoint: subscriptionData.endpoint,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to delete subscription from server');
    }
  }

  /**
   * Convert PushSubscription to plain object for API
   */
  private convertSubscription(subscription: PushSubscription): PushSubscriptionData {
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
   * Convert VAPID public key to Uint8Array
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
  }

  /**
   * Convert ArrayBuffer to Base64 string
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]!);
    }
    
    return window.btoa(binary);
  }

  /**
   * Test push notification (requires subscription)
   */
  async testNotification(): Promise<void> {
    const subscription = await this.getSubscription();
    
    if (!subscription) {
      console.warn('No active subscription. Please subscribe first.');
      return;
    }

    // This would typically be sent from your server
    console.log('To test, send a push notification from your server using the subscription:', 
      this.convertSubscription(subscription)
    );
  }
}

// Export singleton instance
export const webPushService = WebPushService.getInstance();
