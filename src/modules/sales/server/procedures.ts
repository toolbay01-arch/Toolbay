import { z } from "zod";
import { TRPCError } from "@trpc/server";
import type { Where } from "payload";

import { DEFAULT_LIMIT } from "@/constants";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

export const salesRouter = createTRPCRouter({
  // Get sales for current tenant (dashboard view)
  getMySales: protectedProcedure
    .input(
      z.object({
        cursor: z.number().default(1),
        limit: z.number().default(DEFAULT_LIMIT),
        search: z.string().nullable().optional(),
        status: z.enum(['pending', 'shipped', 'delivered', 'completed', 'refunded', 'cancelled']).nullable().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Get current user's tenant
      const userData = await ctx.db.findByID({
        collection: "users",
        id: ctx.session.user.id,
      });

      if (!userData.tenants?.[0]) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No tenant found for user",
        });
      }

      const tenantId = typeof userData.tenants[0].tenant === 'string' 
        ? userData.tenants[0].tenant 
        : userData.tenants[0].tenant.id;

      // All tenants can view sales (verified or not)

      const where: Where = {
        tenant: {
          equals: tenantId,
        },
      };

      if (input.status) {
        where.status = {
          equals: input.status,
        };
      }

      if (input.search) {
        // Search by sale number or customer name
        where.or = [
          {
            saleNumber: {
              like: input.search,
            },
          },
          {
            customerName: {
              like: input.search,
            },
          },
        ];
      }

      const data = await ctx.db.find({
        collection: "sales",
        depth: 2, // Populate product details including image
        where,
        sort: "-createdAt",
        page: input.cursor,
        limit: input.limit,
      });

      // Add customer ID to each sale for messaging
      const salesWithCustomerId = data.docs.map((sale: any) => ({
        ...sale,
        customerId: typeof sale.customer === 'string' ? sale.customer : sale.customer?.id,
      }));

      return {
        ...data,
        docs: salesWithCustomerId,
      };
    }),

  // Get single sale details
  getSaleById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      // Get current user's tenant
      const userData = await ctx.db.findByID({
        collection: "users",
        id: ctx.session.user.id,
      });

      if (!userData.tenants?.[0]) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No tenant found for user",
        });
      }

      const tenantId = typeof userData.tenants[0].tenant === 'string' 
        ? userData.tenants[0].tenant 
        : userData.tenants[0].tenant.id;

      const sale = await ctx.db.findByID({
        collection: "sales",
        id: input.id,
        depth: 2, // Populate product and order details
      });

      // Verify this sale belongs to the tenant
      const saleTenantId = typeof sale.tenant === 'string' 
        ? sale.tenant 
        : sale.tenant?.id;

      if (saleTenantId !== tenantId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only view your own sales",
        });
      }

      return sale;
    }),

  // Get sales statistics for dashboard
  getSalesStats: protectedProcedure
    .query(async ({ ctx }) => {
      // Get current user's tenant
      const userData = await ctx.db.findByID({
        collection: "users",
        id: ctx.session.user.id,
      });

      if (!userData.tenants?.[0]) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No tenant found for user",
        });
      }

      const tenantId = typeof userData.tenants[0].tenant === 'string' 
        ? userData.tenants[0].tenant 
        : userData.tenants[0].tenant.id;

      // Get all sales for this tenant
      const allSales = await ctx.db.find({
        collection: "sales",
        where: {
          tenant: {
            equals: tenantId,
          },
        },
        limit: 1000, // Adjust as needed
        pagination: false,
      });

      const totalSales = allSales.totalDocs;
      const totalRevenue = allSales.docs.reduce((sum, sale) => sum + (sale.netAmount || sale.totalAmount || 0), 0);
      const totalGrossRevenue = allSales.docs.reduce((sum, sale) => sum + (sale.totalAmount || 0), 0);

      // Count by status
      const statusCounts = {
        pending: 0,
        shipped: 0,
        delivered: 0,
        completed: 0,
        refunded: 0,
        cancelled: 0,
      };

      allSales.docs.forEach((sale) => {
        if (sale.status && statusCounts[sale.status as keyof typeof statusCounts] !== undefined) {
          statusCounts[sale.status as keyof typeof statusCounts]++;
        }
      });

      return {
        totalSales,
        totalRevenue, // Full amount (no fees)
        totalGrossRevenue, // Same as totalRevenue
        averageSaleAmount: totalSales > 0 ? totalRevenue / totalSales : 0,
        statusCounts,
      };
    }),

  // Update order status (mark as shipped/delivered)
  updateOrderStatus: protectedProcedure
    .input(
      z.object({
        orderId: z.string(),
        status: z.enum(['shipped', 'delivered']),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Get current user's tenant
      const userData = await ctx.db.findByID({
        collection: "users",
        id: ctx.session.user.id,
      });

      if (!userData.tenants?.[0]) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No tenant found for user",
        });
      }

      const tenantId = typeof userData.tenants[0].tenant === 'string' 
        ? userData.tenants[0].tenant 
        : userData.tenants[0].tenant.id;

      // Get the order to verify ownership
      const order = await ctx.db.findByID({
        collection: "orders",
        id: input.orderId,
        depth: 2,
      });

      if (!order) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Order not found",
        });
      }

      // Verify this order belongs to the tenant
      // Check through products
      const products = Array.isArray(order.products) ? order.products : [];
      let orderBelongsToTenant = false;

      for (const item of products) {
        const product = typeof item.product === 'object' ? item.product : null;
        if (product) {
          const productTenantId = typeof product.tenant === 'string' 
            ? product.tenant 
            : product.tenant?.id;
          
          if (productTenantId === tenantId) {
            orderBelongsToTenant = true;
            break;
          }
        }
      }

      if (!orderBelongsToTenant) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only update your own orders",
        });
      }

      // Check delivery type - direct orders cannot be shipped
      const deliveryType = (order as any).deliveryType || 'delivery'; // Default to delivery for backward compatibility
      
      if (deliveryType === 'direct' && input.status === 'shipped') {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Direct payment (pickup) orders cannot be marked as shipped. They are ready for pickup after payment verification.",
        });
      }

      // Update the order status
      const updateData: any = {
        status: input.status,
        updatedAt: new Date().toISOString(),
      };

      if (input.status === 'shipped') {
        updateData.shippedAt = new Date().toISOString();
      } else if (input.status === 'delivered') {
        updateData.deliveredAt = new Date().toISOString();
      }

      await ctx.db.update({
        collection: "orders",
        id: input.orderId,
        data: updateData,
      });

      return { success: true };
    }),

  // Get all orders for current tenant (including completed ones)
  getPendingOrders: protectedProcedure
    .query(async ({ ctx }) => {
      // Get current user's tenant
      const userData = await ctx.db.findByID({
        collection: "users",
        id: ctx.session.user.id,
      });

      if (!userData.tenants?.[0]) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No tenant found for user",
        });
      }

      const tenantId = typeof userData.tenants[0].tenant === 'string' 
        ? userData.tenants[0].tenant 
        : userData.tenants[0].tenant.id;

      // Get all orders for this tenant (remove status filter to show all)
      const sales = await ctx.db.find({
        collection: "sales",
        where: {
          tenant: { equals: tenantId },
        },
        depth: 3, // Get product, order details
        sort: "-createdAt",
        limit: 100,
      });

      // Map to order details
      const orders = sales.docs.map((sale: any) => ({
        id: sale.order?.id || '',
        orderId: typeof sale.order === 'string' ? sale.order : sale.order?.id,
        orderNumber: sale.order?.orderNumber || '',
        saleNumber: sale.saleNumber,
        status: sale.status,
        deliveryType: (sale.order as any)?.deliveryType || 'delivery', // Include delivery type
        customerName: sale.customerName,
        customerEmail: sale.customerEmail,
        productName: sale.product?.name || 'Unknown Product',
        productImage: sale.product?.image?.url || null,
        quantity: sale.quantity,
        totalAmount: sale.totalAmount,
        createdAt: sale.createdAt,
        shippedAt: sale.order?.shippedAt || null,
        deliveredAt: sale.order?.deliveredAt || null,
      }));

      return orders;
    }),
});
