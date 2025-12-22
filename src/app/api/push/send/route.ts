import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';
import webpush from 'web-push';

// Configure web-push with VAPID keys
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY!;
// VAPID subject must be mailto: or https: URL
const vapidSubject = process.env.NEXT_PUBLIC_APP_URL?.startsWith('https://') 
  ? process.env.NEXT_PUBLIC_APP_URL 
  : 'mailto:lionelmuhire1997@gmail.com';

webpush.setVapidDetails(
  vapidSubject,
  vapidPublicKey,
  vapidPrivateKey
);

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: {
    url?: string;
    type?: 'payment' | 'order' | 'message' | 'general';
    [key: string]: any;
  };
}

export async function POST(req: NextRequest) {
  try {
    const payload = await getPayload({ config });
    const body = await req.json();
    
    const { userId, notification } = body as {
      userId: string;
      notification: PushNotificationPayload;
    };

    if (!userId || !notification) {
      return NextResponse.json(
        { error: 'Missing userId or notification data' },
        { status: 400 }
      );
    }

    // Validate notification format
    if (!notification.title || !notification.body) {
      return NextResponse.json(
        { error: 'Notification must have title and body' },
        { status: 400 }
      );
    }

    // Get all active subscriptions for the user
    const subscriptions = await payload.find({
      collection: 'push-subscriptions',
      where: {
        and: [
          { user: { equals: userId } },
          { isActive: { equals: true } },
        ],
      },
    });

    if (subscriptions.docs.length === 0) {
      return NextResponse.json(
        { error: 'No active subscriptions found for user' },
        { status: 404 }
      );
    }

    // Prepare notification payload
    const notificationPayload = JSON.stringify({
      title: notification.title,
      body: notification.body,
      icon: notification.icon || '/icon-192x192.png',
      badge: notification.badge || '/icon-192x192.png',
      data: {
        url: notification.data?.url || '/',
        type: notification.data?.type || 'general',
        timestamp: Date.now(),
        ...notification.data,
      },
    });

    // Send to all subscriptions
    const sendPromises = subscriptions.docs.map(async (sub) => {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.keys.p256dh,
            auth: sub.keys.auth,
          },
        };

        await webpush.sendNotification(pushSubscription, notificationPayload);
        return { success: true, endpoint: sub.endpoint };
      } catch (error: any) {
        console.error('Error sending to subscription:', error);
        
        // If subscription is invalid/expired, mark it as inactive
        if (error.statusCode === 404 || error.statusCode === 410) {
          await payload.update({
            collection: 'push-subscriptions',
            id: sub.id,
            data: { isActive: false },
          });
        }
        
        return { success: false, endpoint: sub.endpoint, error: error.message };
      }
    });

    const results = await Promise.all(sendPromises);
    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: true,
      message: `Sent to ${successCount} device(s), ${failureCount} failed`,
      results,
    });
  } catch (error) {
    console.error('Error sending push notifications:', error);
    return NextResponse.json(
      { error: 'Failed to send push notifications' },
      { status: 500 }
    );
  }
}

// Helper function to send push to multiple users
// Note: helper functions for sending to multiple users live in
// `src/lib/notifications/send-push.ts` as `sendPushToMultipleUsers`.
// Keep this route file focused on Next.js route exports only.
