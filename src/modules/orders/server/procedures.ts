import { z } from 'zod'
import { protectedProcedure, createTRPCRouter } from '@/trpc/init'

export const ordersRouter = createTRPCRouter({
  /**
   * Get dashboard statistics for the authenticated user
   */
  getDashboardStats: protectedProcedure
    .query(async ({ ctx }) => {
      const user = ctx.session.user

      const userId = typeof user.id === 'object' && 'toHexString' in user.id
        ? user.id.toHexString()
        : String(user.id)

      // Get all orders for the user
      const { docs: allOrders } = await ctx.db.find({
        collection: 'orders',
        where: {
          user: { equals: userId },
        },
        limit: 1000, // Get all orders for stats
        depth: 0,
      })

      // Calculate statistics
      const totalOrders = allOrders.length
      const pendingOrders = allOrders.filter((o: any) => o.status === 'pending' || o.status === 'shipped').length
      const completedOrders = allOrders.filter((o: any) => o.status === 'completed').length
      const totalSpent = allOrders
        .filter((o: any) => o.status !== 'cancelled')
        .reduce((sum, order: any) => sum + (order.totalAmount || order.amount || 0), 0)

      return {
        totalOrders,
        pendingOrders,
        completedOrders,
        totalSpent,
      }
    }),

  /**
   * Get orders for the current authenticated user
   */
  getMyOrders: protectedProcedure
  .input(
    z.object({
      status: z.enum(['pending', 'shipped', 'delivered', 'completed', 'cancelled']).optional(),
      limit: z.number().min(1).max(100).default(20),
      page: z.number().min(1).default(1),
    })
  )
  .query(async ({ ctx, input }) => {
    const user = ctx.session.user

    const skip = (input.page - 1) * input.limit

    // Build filter for user's orders
    const where: Record<string, unknown> = {
      user: {
        equals: typeof user.id === 'object' && 'toHexString' in user.id
          ? user.id.toHexString()
          : String(user.id),
      },
    }

    // Add status filter if provided
    if (input.status) {
      where.status = { equals: input.status }
    }

    const { docs: orders, totalDocs } = await ctx.db.find({
      collection: 'orders',
      where,
      limit: input.limit,
      skip,
      sort: '-createdAt',
      depth: 2, // Populate products and transaction
    })

    return {
      orders: orders.map((order: any) => {
        // Handle both old and new schema
        const orderProducts = Array.isArray(order.products) && order.products.length > 0
          ? order.products
          : order.product
          ? [{
              product: order.product,
              quantity: 1,
              priceAtPurchase: order.amount || 0,
            }]
          : [];

        return {
          id: typeof order.id === 'object' && 'toHexString' in order.id
            ? order.id.toHexString()
            : String(order.id),
          orderNumber: order.orderNumber || order.name || `Order-${order.id}`,
          status: order.status || 'pending',
          totalAmount: order.totalAmount || order.amount || 0,
          createdAt: order.createdAt,
          confirmedAt: order.confirmedAt || null,
          shippedAt: order.shippedAt || null,
          deliveredAt: order.deliveredAt || null,
          received: order.received || false,
          products: orderProducts.map((item: any) => ({
            id: typeof item.product?.id === 'object' && 'toHexString' in item.product.id
              ? item.product.id.toHexString()
              : String(item.product?.id || ''),
            title: item.product?.title || 'Unknown Product',
            priceAtPurchase: item.priceAtPurchase || item.price || 0,
            quantity: item.quantity || 1,
          })),
          transaction: order.transaction
            ? {
                id: typeof order.transaction.id === 'object' && 'toHexString' in order.transaction.id
                  ? order.transaction.id.toHexString()
                  : String(order.transaction.id),
                paymentReference: order.transaction.paymentReference || '',
                shippingAddress: order.transaction.shippingAddress,
              }
            : undefined,
        };
      }),
      pagination: {
        totalDocs,
        limit: input.limit,
        page: input.page,
        totalPages: Math.ceil(totalDocs / input.limit),
        hasNextPage: input.page < Math.ceil(totalDocs / input.limit),
        hasPrevPage: input.page > 1,
      },
    }
  }),

  /**
   * Customer confirms receipt of order
   */
  confirmReceipt: protectedProcedure
  .input(
    z.object({
      orderId: z.string(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const user = ctx.session.user

    // Find the order
    const order = await ctx.db.findByID({
      collection: 'orders',
      id: input.orderId,
      depth: 0,
    })

    if (!order) {
      throw new Error('Order not found')
    }

    // Verify the user is the customer for this order
    const orderUserId = typeof order.user === 'object' && 'toHexString' in order.user
      ? order.user.toHexString()
      : String(order.user)

    const userId = typeof user.id === 'object' && 'toHexString' in user.id
      ? user.id.toHexString()
      : String(user.id)

    if (orderUserId !== userId) {
      throw new Error('You can only confirm receipt for your own orders')
    }

    // Check order status - must be delivered
    if (order.status !== 'delivered') {
      throw new Error('You can only confirm receipt for delivered orders')
    }

    // Check if already confirmed
    if (order.received) {
      throw new Error('Receipt has already been confirmed for this order')
    }

    // Update order - mark as received and completed
    const updatedOrder = await ctx.db.update({
      collection: 'orders',
      id: input.orderId,
      data: {
        received: true,
        status: 'completed',
        updatedAt: new Date().toISOString(),
      },
    })

    return {
      success: true,
      order: {
        id: typeof updatedOrder.id === 'object' && 'toHexString' in updatedOrder.id
          ? updatedOrder.id.toHexString()
          : String(updatedOrder.id),
        orderNumber: updatedOrder.orderNumber,
        status: updatedOrder.status,
        received: updatedOrder.received,
      },
    }
  }),
})
