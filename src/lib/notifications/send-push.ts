/**
 * Server-side Push Notification Utility
 * Helper functions to send push notifications from server code
 */

import { PushNotificationPayload } from '@/app/api/push/send/route';

export interface SendPushOptions {
  userId: string;
  title: string;
  body: string;
  icon?: string;
  url?: string;
  type?: 'payment' | 'order' | 'message' | 'general';
  data?: Record<string, any>;
}

/**
 * Send a push notification to a user
 * Can be called from server-side code, API routes, or server actions
 */
export async function sendPushNotification(options: SendPushOptions): Promise<boolean> {
  const {
    userId,
    title,
    body,
    icon = '/icon-192x192.png',
    url = '/',
    type = 'general',
    data = {},
  } = options;

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    const notification: PushNotificationPayload = {
      title,
      body,
      icon,
      badge: '/icon-192x192.png',
      data: {
        url,
        type,
        ...data,
      },
    };

    const response = await fetch(`${appUrl}/api/push/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        notification,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Failed to send push notification:', error);
      return false;
    }

    const result = await response.json();
    console.log('Push notification sent:', result);
    return true;
  } catch (error) {
    console.error('Error sending push notification:', error);
    return false;
  }
}

/**
 * Send a payment notification
 */
export async function sendPaymentNotification(
  userId: string,
  amount: number,
  reference: string
): Promise<boolean> {
  return sendPushNotification({
    userId,
    title: '💰 Payment Received!',
    body: `You received a payment of ${amount.toLocaleString()} RWF (Ref: ${reference})`,
    icon: '/icon-192x192.png',
    url: '/verify-payments',
    type: 'payment',
    data: {
      amount,
      reference,
    },
  });
}

/**
 * Send an order notification
 */
export async function sendOrderNotification(
  userId: string,
  orderId: string,
  productName: string
): Promise<boolean> {
  return sendPushNotification({
    userId,
    title: '🛒 New Order Received!',
    body: `You have a new order for ${productName}`,
    icon: '/icon-192x192.png',
    url: `/my-store/orders/${orderId}`,
    type: 'order',
    data: {
      orderId,
      productName,
    },
  });
}

/**
 * Send a chat message notification
 */
export async function sendMessageNotification(
  userId: string,
  senderName: string,
  conversationId: string
): Promise<boolean> {
  return sendPushNotification({
    userId,
    title: `💬 New message from ${senderName}`,
    body: 'You have a new message',
    icon: '/icon-192x192.png',
    url: `/messages?id=${conversationId}`,
    type: 'message',
    data: {
      conversationId,
      senderName,
    },
  });
}

/**
 * Send push to multiple users
 */
export async function sendPushToMultipleUsers(
  userIds: string[],
  notification: Omit<SendPushOptions, 'userId'>
): Promise<{ userId: string; success: boolean }[]> {
  const results = await Promise.all(
    userIds.map(async (userId) => {
      const success = await sendPushNotification({ ...notification, userId });
      return { userId, success };
    })
  );

  return results;
}
