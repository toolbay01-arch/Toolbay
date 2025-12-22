import { NextRequest } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Server-Sent Events (SSE) endpoint for real-time notifications
 * Usage: EventSource('/api/notifications/stream?userId=xxx')
 */
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId');
  
  if (!userId) {
    return new Response('Missing userId parameter', { status: 400 });
  }

  console.log(`[SSE] New connection for user: ${userId}`);

  // Create text encoder for SSE format
  const encoder = new TextEncoder();
  
  // Track last check timestamps for each notification type
  let lastPaymentCheck = new Date();
  let lastOrderCheck = new Date();
  let lastMessageCheck = new Date();

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial connection confirmation
      const connectMessage = `data: ${JSON.stringify({ 
        type: 'connected',
        timestamp: new Date().toISOString() 
      })}\n\n`;
      controller.enqueue(encoder.encode(connectMessage));

      // Main polling loop - check for updates every 10 seconds
      const intervalId = setInterval(async () => {
        try {
          const payload = await getPayload({ config });
          const now = new Date();

          // Check for new payments/transactions
          try {
            const recentPayments = await payload.find({
              collection: 'transactions',
              where: {
                and: [
                  { tenant: { equals: userId } },
                  { createdAt: { greater_than: lastPaymentCheck.toISOString() } }
                ]
              },
              limit: 10,
              sort: '-createdAt'
            });

            if (recentPayments.docs.length > 0) {
              for (const payment of recentPayments.docs) {
                const message = `data: ${JSON.stringify({
                  type: 'payment',
                  data: {
                    id: payment.id,
                    amount: (payment as any).amount,
                    currency: (payment as any).currency || 'RWF',
                    phoneNumber: (payment as any).phoneNumber,
                    status: payment.status,
                    createdAt: payment.createdAt
                  }
                })}\n\n`;
                
                controller.enqueue(encoder.encode(message));
              }
              lastPaymentCheck = now;
            }
          } catch (error) {
            console.error('[SSE] Error checking payments:', error);
          }

          // Check for new orders
          try {
            const recentOrders = await payload.find({
              collection: 'orders',
              where: {
                and: [
                  { orderedBy: { equals: userId } },
                  { updatedAt: { greater_than: lastOrderCheck.toISOString() } }
                ]
              },
              limit: 10,
              sort: '-updatedAt'
            });

            if (recentOrders.docs.length > 0) {
              for (const order of recentOrders.docs) {
                const message = `data: ${JSON.stringify({
                  type: 'order',
                  data: {
                    id: order.id,
                    orderId: (order as any).orderId || order.id,
                    status: order.status,
                    total: (order as any).total,
                    updatedAt: order.updatedAt
                  }
                })}\n\n`;
                
                controller.enqueue(encoder.encode(message));
              }
              lastOrderCheck = now;
            }
          } catch (error) {
            console.error('[SSE] Error checking orders:', error);
          }

          // Check for new messages
          try {
            const recentMessages = await payload.find({
              collection: 'messages',
              where: {
                and: [
                  {
                    or: [
                      { sender: { equals: userId } },
                      { recipient: { equals: userId } }
                    ]
                  },
                  { createdAt: { greater_than: lastMessageCheck.toISOString() } }
                ]
              },
              limit: 10,
              sort: '-createdAt'
            });

            if (recentMessages.docs.length > 0) {
              for (const message of recentMessages.docs) {
                const msgData = message as any;
                // Only notify if user is recipient (not sender)
                if (msgData.recipient === userId && msgData.sender !== userId) {
                  const sseMessage = `data: ${JSON.stringify({
                    type: 'message',
                    data: {
                      id: message.id,
                      sender: typeof msgData.sender === 'object' 
                        ? msgData.sender?.name || 'Unknown' 
                        : msgData.sender,
                      text: msgData.text || msgData.content || '',
                      conversationId: msgData.conversation,
                      createdAt: message.createdAt
                    }
                  })}\n\n`;
                  
                  controller.enqueue(encoder.encode(sseMessage));
                }
              }
              lastMessageCheck = now;
            }
          } catch (error) {
            console.error('[SSE] Error checking messages:', error);
          }

          // Send heartbeat to keep connection alive
          const heartbeat = `: heartbeat ${new Date().toISOString()}\n\n`;
          controller.enqueue(encoder.encode(heartbeat));

        } catch (error) {
          console.error('[SSE] Error in polling loop:', error);
        }
      }, 10000); // Check every 10 seconds

      // Cleanup on client disconnect
      req.signal.addEventListener('abort', () => {
        console.log(`[SSE] Client disconnected: ${userId}`);
        clearInterval(intervalId);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}
