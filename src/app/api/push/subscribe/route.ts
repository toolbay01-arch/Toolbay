import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';

export async function POST(req: NextRequest) {
  try {
    const payload = await getPayload({ config });
    const body = await req.json();
    
    const { subscription, userId } = body;

    if (!subscription || !userId) {
      return NextResponse.json(
        { error: 'Missing subscription or userId' },
        { status: 400 }
      );
    }

    // Validate subscription format
    if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      return NextResponse.json(
        { error: 'Invalid subscription format' },
        { status: 400 }
      );
    }

    // Check if subscription already exists
    const existing = await payload.find({
      collection: 'push-subscriptions',
      where: {
        endpoint: { equals: subscription.endpoint },
      },
    });

    if (existing.docs.length > 0 && existing.docs[0]) {
      // Update existing subscription
      const updated = await payload.update({
        collection: 'push-subscriptions',
        id: existing.docs[0].id,
        data: {
          user: userId,
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.keys.p256dh,
            auth: subscription.keys.auth,
          },
          userAgent: req.headers.get('user-agent') || '',
          isActive: true,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Subscription updated',
        data: updated,
      });
    }

    // Create new subscription
    const newSubscription = await payload.create({
      collection: 'push-subscriptions',
      data: {
        user: userId,
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
        userAgent: req.headers.get('user-agent') || '',
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Subscription created',
      data: newSubscription,
    });
  } catch (error) {
    console.error('Error saving push subscription:', error);
    return NextResponse.json(
      { error: 'Failed to save subscription' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const payload = await getPayload({ config });
    const body = await req.json();
    
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json(
        { error: 'Missing endpoint' },
        { status: 400 }
      );
    }

    // Find and delete the subscription
    const existing = await payload.find({
      collection: 'push-subscriptions',
      where: {
        endpoint: { equals: endpoint },
      },
    });

    if (existing.docs.length === 0 || !existing.docs[0]) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      );
    }

    await payload.delete({
      collection: 'push-subscriptions',
      id: existing.docs[0].id,
    });

    return NextResponse.json({
      success: true,
      message: 'Subscription deleted',
    });
  } catch (error) {
    console.error('Error deleting push subscription:', error);
    return NextResponse.json(
      { error: 'Failed to delete subscription' },
      { status: 500 }
    );
  }
}
