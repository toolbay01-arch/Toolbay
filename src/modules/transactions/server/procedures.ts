import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

export const transactionsRouter = createTRPCRouter({
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
        depth: 2,
      });

      if (!transaction) {
        throw new TRPCError({ 
          code: "NOT_FOUND",
          message: "Transaction not found" 
        });
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

      return transaction;
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
