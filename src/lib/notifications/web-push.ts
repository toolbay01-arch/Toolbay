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

  private constructor() {}

  static getInstance(): WebPushService {
    if (!WebPushService.instance) {
      WebPushService.instance = new WebPushService();
    }
    return WebPushService.instance;
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
      console.warn('Service Workers or Push API not supported');
      return null;
    }

    try {
      // Register service worker
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      console.log('Service Worker registered:', this.registration);

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;

      return this.registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
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
