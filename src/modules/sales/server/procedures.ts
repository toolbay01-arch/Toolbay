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

      // Check if tenant is verified
      const tenant = await ctx.db.findByID({
        collection: "tenants",
        id: tenantId,
      });

      if (!tenant.isVerified || 
          (tenant.verificationStatus !== 'document_verified' && 
           tenant.verificationStatus !== 'physically_verified')) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Your account must be verified to view sales",
        });
      }

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
        depth: 1, // Populate product details
        where,
        sort: "-createdAt",
        page: input.cursor,
        limit: input.limit,
      });

      return data;
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
      const totalRevenue = allSales.docs.reduce((sum, sale) => sum + (sale.netAmount || 0), 0);
      const totalGrossRevenue = allSales.docs.reduce((sum, sale) => sum + (sale.totalAmount || 0), 0);
      const totalPlatformFees = allSales.docs.reduce((sum, sale) => sum + (sale.platformFee || 0), 0);

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
        totalRevenue, // Net amount after platform fees
        totalGrossRevenue, // Total before fees
        totalPlatformFees,
        averageSaleAmount: totalSales > 0 ? totalRevenue / totalSales : 0,
        statusCounts,
      };
    }),
});
