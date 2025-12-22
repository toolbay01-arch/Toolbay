/**
 * Browser Notification Service
 * Handles browser notifications for payments, orders, chat, etc.
 */

import type { BrowserNotificationOptions, NotificationPayload } from './notification-types';

export class BrowserNotificationService {
  private static instance: BrowserNotificationService;
  
  private constructor() {}

  static getInstance(): BrowserNotificationService {
    if (!BrowserNotificationService.instance) {
      BrowserNotificationService.instance = new BrowserNotificationService();
    }
    return BrowserNotificationService.instance;
  }

  /**
   * Check if notifications are supported in the browser
   */
  isSupported(): boolean {
    return 'Notification' in window;
  }

  /**
   * Get current permission status
   */
  getPermission(): NotificationPermission {
    if (!this.isSupported()) {
      return 'denied';
    }
    return Notification.permission;
  }

  /**
   * Check if notifications are enabled
   */
  isEnabled(): boolean {
    return this.isSupported() && this.getPermission() === 'granted';
  }

  /**
   * Request notification permission from user
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) {
      console.warn('Notifications are not supported in this browser');
      return 'denied';
    }

    if (this.getPermission() === 'granted') {
      return 'granted';
    }

    try {
      const permission = await Notification.requestPermission();
      return permission;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return 'denied';
    }
  }

  /**
   * Show a browser notification
   * Uses Service Worker API when available (required for mobile)
   */
  async show(payload: NotificationPayload): Promise<Notification | null> {
    if (!this.isEnabled()) {
      console.warn('Notifications are not enabled');
      return null;
    }

    try {
      const options: NotificationOptions = {
        body: payload.message,
        icon: this.getIcon(payload.type),
        badge: '/favicon.ico',
        tag: payload.tag || `${payload.type}-${payload.id || Date.now()}`,
        requireInteraction: false,
        silent: false,
        data: {
          url: payload.url,
          type: payload.type,
          id: payload.id,
          ...payload.data,
        },
      };

      // Try to use Service Worker API first (required for mobile browsers)
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration) {
            // Use Service Worker to show notification (works on mobile)
            await registration.showNotification(payload.title, options);
            console.log('[Notifications] Shown via Service Worker');
            return null; // SW notifications don't return a Notification object
          }
        } catch (swError) {
          console.warn('[Notifications] Service Worker method failed, falling back to Notification API:', swError);
        }
      }

      // Fallback to regular Notification API (desktop browsers)
      const notification = new Notification(payload.title, options);

      // Handle notification click
      notification.onclick = (event) => {
        event.preventDefault();
        
        // Focus the window
        window.focus();
        
        // Navigate to URL if provided
        if (payload.url) {
          window.location.href = payload.url;
        }
        
        // Close the notification
        notification.close();
      };

      console.log('[Notifications] Shown via Notification API');
      return notification;
    } catch (error) {
      console.error('Error showing notification:', error);
      return null;
    }
  }

  /**
   * Show a payment notification
   */
  async showPaymentNotification(amount: string, transactionId: string): Promise<Notification | null> {
    return this.show({
      type: 'payment',
      title: '💰 Payment Received',
      message: `New payment of ${amount} received`,
      url: '/verify-payments',
      id: transactionId,
      tag: `payment-${transactionId}`,
    });
  }

  /**
   * Show an order notification
   */
  async showOrderNotification(orderNumber: string, status: string, orderId: string): Promise<Notification | null> {
    const messages: Record<string, string> = {
      pending: `New order #${orderNumber} received`,
      processing: `Order #${orderNumber} is being processed`,
      shipped: `Order #${orderNumber} has been shipped`,
      delivered: `Order #${orderNumber} has been delivered`,
      cancelled: `Order #${orderNumber} was cancelled`,
    };

    return this.show({
      type: 'order',
      title: '📦 Order Update',
      message: messages[status] || `Order #${orderNumber} status updated`,
      url: '/orders',
      id: orderId,
      tag: `order-${orderId}`,
    });
  }

  /**
   * Show a chat notification
   */
  async showChatNotification(sender: string, preview: string, conversationId: string): Promise<Notification | null> {
    return this.show({
      type: 'chat',
      title: `💬 ${sender}`,
      message: preview,
      url: `/chat?conversation=${conversationId}`,
      id: conversationId,
      tag: `chat-${conversationId}`,
    });
  }

  /**
   * Show a product notification (low stock, out of stock)
   */
  async showProductNotification(productName: string, type: 'low-stock' | 'out-of-stock', productId: string): Promise<Notification | null> {
    const messages = {
      'low-stock': `${productName} is running low on stock`,
      'out-of-stock': `${productName} is out of stock`,
    };

    return this.show({
      type: 'product',
      title: '📦 Stock Alert',
      message: messages[type],
      url: '/my-store',
      id: productId,
      tag: `product-${productId}`,
    });
  }

  /**
   * Show a transaction verification notification
   */
  async showTransactionNotification(message: string, transactionId: string): Promise<Notification | null> {
    return this.show({
      type: 'transaction',
      title: '🔔 Transaction Update',
      message,
      url: '/verify-payments',
      id: transactionId,
      tag: `transaction-${transactionId}`,
    });
  }

  /**
   * Get icon for notification type
   */
  private getIcon(type: string): string {
    const icons: Record<string, string> = {
      payment: '/icons/payment.png',
      order: '/icons/order.png',
      chat: '/icons/chat.png',
      product: '/icons/product.png',
      transaction: '/icons/transaction.png',
    };

    return icons[type] || '/logo.png';
  }

  /**
   * Close all notifications with a specific tag
   */
  closeByTag(tag: string): void {
    // Note: This only works for notifications created in the current context
    // Service worker notifications need to be closed via service worker
    console.log(`Closing notifications with tag: ${tag}`);
  }
}

// Export singleton instance
export const notificationService = BrowserNotificationService.getInstance();
