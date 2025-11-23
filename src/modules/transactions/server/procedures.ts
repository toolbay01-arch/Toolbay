import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import type { Tenant } from "@/payload-types";

export const transactionsRouter = createTRPCRouter({
  // Get transactions awaiting verification for current tenant
  getAwaitingVerification: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(20),
        page: z.number().min(1).default(1),
      })
    )
    .query(async ({ ctx, input }) => {
      // Get current user's tenant
      const userData = await ctx.db.findByID({
        collection: "users",
        id: ctx.session.user.id,
        depth: 1,
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
      }) as Tenant;

      if (!tenant.isVerified || 
          (tenant.verificationStatus !== 'document_verified' && 
           tenant.verificationStatus !== 'physically_verified')) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Your account must be verified to manage transactions",
        });
      }

      const transactions = await ctx.db.find({
        collection: "transactions",
        where: {
          and: [
            {
              tenant: {
                equals: tenantId,
              },
            },
            {
              status: {
                equals: 'awaiting_verification',
              },
            },
          ],
        },
        depth: 2,
        limit: input.limit,
        page: input.page,
        sort: '-createdAt',
      });

      return {
        docs: transactions.docs,
        totalDocs: transactions.totalDocs,
        totalPages: transactions.totalPages,
        page: transactions.page,
        hasNextPage: transactions.hasNextPage,
        hasPrevPage: transactions.hasPrevPage,
      };
    }),

  // Verify transaction (create orders)
  verifyTransaction: protectedProcedure
    .input(
      z.object({
        transactionId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get transaction
      const transaction = await ctx.db.findByID({
        collection: "transactions",
        id: input.transactionId,
        depth: 2,
      });

      if (!transaction) {
        throw new TRPCError({ 
          code: "NOT_FOUND", 
          message: "Transaction not found" 
        });
      }

      // Check tenant ownership
      const userData = await ctx.db.findByID({
        collection: "users",
        id: ctx.session.user.id,
        depth: 1,
      });

      if (!userData.tenants?.[0]) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "No tenant found for user",
        });
      }

      const tenantId = typeof userData.tenants[0].tenant === 'string' 
        ? userData.tenants[0].tenant 
        : userData.tenants[0].tenant.id;

      const transactionTenantId = typeof transaction.tenant === 'string' 
        ? transaction.tenant 
        : transaction.tenant?.id;

      if (tenantId !== transactionTenantId) {
        throw new TRPCError({ 
          code: "FORBIDDEN", 
          message: "You can only verify transactions for your own store" 
        });
      }

      // Check status
      if (transaction.status !== "awaiting_verification") {
        throw new TRPCError({ 
          code: "BAD_REQUEST", 
          message: `Cannot verify transaction with status: ${transaction.status}` 
        });
      }

      // Check expiry
      if (new Date() > new Date(transaction.expiresAt)) {
        await ctx.db.update({
          collection: "transactions",
          id: input.transactionId,
          data: { status: "expired" },
        });
        throw new TRPCError({ 
          code: "BAD_REQUEST", 
          message: "Transaction expired" 
        });
      }

      // Update transaction to verified
      await ctx.db.update({
        collection: "transactions",
        id: input.transactionId,
        data: {
          status: "verified",
          verifiedAt: new Date().toISOString(),
          verifiedBy: ctx.session.user.id,
        },
      });

      // Create orders for each product in transaction
      const orders = await Promise.all(
        transaction.products.map(async (item: any) => {
          const product = typeof item.product === 'string' 
            ? await ctx.db.findByID({ collection: 'products', id: item.product })
            : item.product;

          return await ctx.db.create({
            collection: "orders",
            data: {
              name: `Order for ${product?.name || 'Product'}`,
              orderNumber: '', // Will be auto-generated by hook
              user: transaction.customer,
              product: typeof item.product === 'string' ? item.product : item.product.id,
              products: [{
                product: typeof item.product === 'string' ? item.product : item.product.id,
                quantity: item.quantity,
                priceAtPurchase: item.price,
              }],
              totalAmount: item.price * item.quantity,
              transaction: input.transactionId,
              transactionId: transaction.mtnTransactionId || transaction.paymentReference,
              paymentMethod: "mobile_money",
              bankName: "MTN Mobile Money",
              accountNumber: transaction.customerPhone,
              amount: item.price * item.quantity,
              currency: "RWF",
              status: "pending",
            }
          });
        })
      );

      return {
        success: true,
        message: `Payment verified! ${orders.length} order(s) created.`,
        orderIds: orders.map(o => o.id),
      };
    }),

  // Reject transaction
  rejectTransaction: protectedProcedure
    .input(
      z.object({
        transactionId: z.string(),
        reason: z.string().min(10, "Please provide a detailed reason for rejection"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get transaction
      const transaction = await ctx.db.findByID({
        collection: "transactions",
        id: input.transactionId,
      });

      if (!transaction) {
        throw new TRPCError({ 
          code: "NOT_FOUND", 
          message: "Transaction not found" 
        });
      }

      // Check tenant ownership
      const userData = await ctx.db.findByID({
        collection: "users",
        id: ctx.session.user.id,
        depth: 1,
      });

      if (!userData.tenants?.[0]) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "No tenant found for user",
        });
      }

      const tenantId = typeof userData.tenants[0].tenant === 'string' 
        ? userData.tenants[0].tenant 
        : userData.tenants[0].tenant.id;

      const transactionTenantId = typeof transaction.tenant === 'string' 
        ? transaction.tenant 
        : transaction.tenant?.id;

      if (tenantId !== transactionTenantId) {
        throw new TRPCError({ 
          code: "FORBIDDEN", 
          message: "You can only reject transactions for your own store" 
        });
      }

      // Check status
      if (transaction.status !== "awaiting_verification") {
        throw new TRPCError({ 
          code: "BAD_REQUEST", 
          message: `Cannot reject transaction with status: ${transaction.status}` 
        });
      }

      // Update transaction to rejected
      await ctx.db.update({
        collection: "transactions",
        id: input.transactionId,
        data: {
          status: "rejected",
          verifiedBy: ctx.session.user.id,
          rejectionReason: input.reason,
        },
      });

      return {
        success: true,
        message: "Transaction rejected. Customer will be notified.",
      };
    }),

  // Customer submits MTN Transaction ID
  submitTransactionId: protectedProcedure
    .input(
      z.object({
        transactionId: z.string(),
        mtnTransactionId: z.string().min(1, "Transaction ID is required"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get transaction
      const transaction = await ctx.db.findByID({
        collection: "transactions",
        id: input.transactionId,
      });

      if (!transaction) {
        throw new TRPCError({ 
          code: "NOT_FOUND", 
          message: "Transaction not found" 
        });
      }

      // Check ownership - handle customer as object or string
      const customerId = typeof transaction.customer === 'string' 
        ? transaction.customer 
        : transaction.customer?.id;
      
      if (customerId !== ctx.session.user.id) {
        throw new TRPCError({ 
          code: "FORBIDDEN", 
          message: "Access denied" 
        });
      }

      // Check status
      if (transaction.status !== "pending") {
        throw new TRPCError({ 
          code: "BAD_REQUEST", 
          message: "Transaction already processed" 
        });
      }

      // Check expiry
      if (new Date() > new Date(transaction.expiresAt)) {
        await ctx.db.update({
          collection: "transactions",
          id: input.transactionId,
          data: { status: "expired" },
        });
        throw new TRPCError({ 
          code: "BAD_REQUEST", 
          message: "Transaction expired. Please create a new order." 
        });
      }

      // Update transaction
      await ctx.db.update({
        collection: "transactions",
        id: input.transactionId,
        data: {
          mtnTransactionId: input.mtnTransactionId,
          status: "awaiting_verification",
        },
      });

      return {
        success: true,
        message: "Transaction ID submitted. Your payment is being verified by the store.",
      };
    }),

  // Get transaction status
  getStatus: protectedProcedure
    .input(z.object({ transactionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const transaction = await ctx.db.findByID({
        collection: "transactions",
        id: input.transactionId,
      });

      if (!transaction) {
        throw new TRPCError({ 
          code: "NOT_FOUND",
          message: "Transaction not found" 
        });
      }

      // Manually populate tenant to get momoCode and momoAccountName
      let populatedTenant = null;
      if (transaction.tenant) {
        const tenantId = typeof transaction.tenant === 'string' 
          ? transaction.tenant 
          : transaction.tenant.id;
        
        try {
          populatedTenant = await ctx.db.findByID({
            collection: "tenants",
            id: tenantId,
          });
        } catch (error) {
          console.error('Error fetching tenant:', error);
        }
      }

      // Check access - Allow customer, tenant owner, or super-admin
      const isSuperAdmin = ctx.session.user.roles?.includes('super-admin');
      
      // Handle customer comparison (transaction.customer might be object or string)
      const customerId = typeof transaction.customer === 'string' 
        ? transaction.customer 
        : transaction.customer?.id;
      const isCustomer = customerId === ctx.session.user.id;
      
      // Check if user is the tenant owner
      let isTenantOwner = false;
      try {
        const user = await ctx.db.findByID({
          collection: "users",
          id: ctx.session.user.id,
          depth: 1,
        });
        
        // Check if user has tenant relationship
        if (user?.tenants && Array.isArray(user.tenants)) {
          const tenantIds = user.tenants.map((t: { tenant: string | { id: string } }) => 
            typeof t.tenant === 'string' ? t.tenant : t.tenant?.id
          );
          const transactionTenantId = typeof transaction.tenant === 'string' 
            ? transaction.tenant 
            : transaction.tenant?.id;
          isTenantOwner = tenantIds.includes(transactionTenantId);
        }
      } catch (error) {
        console.error('Error checking tenant ownership:', error);
      }

      // Allow access if user is customer, tenant owner, or super-admin
      if (!isCustomer && !isSuperAdmin && !isTenantOwner) {
        throw new TRPCError({ 
          code: "FORBIDDEN",
          message: "Access denied" 
        });
      }

      // Return transaction with populated tenant
      return {
        ...transaction,
        tenant: populatedTenant,
      };
    }),

  // Get user's transactions
  getMyTransactions: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(10),
        page: z.number().min(1).default(1),
      })
    )
    .query(async ({ ctx, input }) => {
      const transactions = await ctx.db.find({
        collection: "transactions",
        where: {
          customer: {
            equals: ctx.session.user.id,
          },
        },
        depth: 2,
        limit: input.limit,
        page: input.page,
        sort: '-createdAt',
      });

      return {
        docs: transactions.docs,
        totalDocs: transactions.totalDocs,
        totalPages: transactions.totalPages,
        page: transactions.page,
        hasNextPage: transactions.hasNextPage,
        hasPrevPage: transactions.hasPrevPage,
      };
    }),
});
