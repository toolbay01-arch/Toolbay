import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { isSuperAdmin } from "@/lib/access";

export const adminRouter = createTRPCRouter({
  // Get pending transactions for tenant
  getPendingTransactions: protectedProcedure
    .query(async ({ ctx }) => {
      // Check if user is tenant owner or super admin
      const user = await ctx.db.findByID({
        collection: "users",
        id: ctx.session.user.id,
        depth: 0,
      });

      if (!user?.tenants?.[0] && !isSuperAdmin(ctx.session.user)) {
        throw new TRPCError({ 
          code: "FORBIDDEN", 
          message: "Not a tenant owner or admin" 
        });
      }

      const tenantId = user.tenants?.[0]?.tenant as string;

      // Check if tenant is verified (document_verified OR physically_verified)
      if (!isSuperAdmin(ctx.session.user)) {
        const tenant = await ctx.db.findByID({
          collection: "tenants",
          id: tenantId,
          depth: 0,
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (!(tenant as any)?.isVerified || 
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ((tenant as any).verificationStatus !== "document_verified" && 
             // eslint-disable-next-line @typescript-eslint/no-explicit-any
             (tenant as any).verificationStatus !== "physically_verified")) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Tenant must be verified to access transactions. Please complete verification process."
          });
        }
      }

      // Build query - super admins see all, tenants see only their transactions
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const whereClause: any = isSuperAdmin(ctx.session.user)
        ? {
            status: { equals: "awaiting_verification" },
          }
        : {
            and: [
              { tenant: { equals: tenantId } },
              { status: { equals: "awaiting_verification" } },
            ],
          };

      // Get transactions
      const transactions = await ctx.db.find({
        collection: "transactions",
        where: whereClause,
        depth: 2,
        sort: '-createdAt',
        limit: 100,
      });

      return transactions.docs;
    }),

  // Verify payment
  verifyPayment: protectedProcedure
    .input(
      z.object({
        transactionId: z.string(),
        verifiedMtnTransactionId: z.string().min(1, "MTN Transaction ID is required"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get transaction
      const transaction = await ctx.db.findByID({
        collection: "transactions",
        id: input.transactionId,
        depth: 1,
      });

      if (!transaction) {
        throw new TRPCError({ 
          code: "NOT_FOUND",
          message: "Transaction not found" 
        });
      }

      // Check if user owns this tenant or is super admin
      const user = await ctx.db.findByID({
        collection: "users",
        id: ctx.session.user.id,
        depth: 0,
      });

      const tenantId = user?.tenants?.[0]?.tenant as string;
      
      // Handle transaction.tenant as object or string
      const transactionTenantId = typeof transaction.tenant === 'string' 
        ? transaction.tenant 
        : transaction.tenant?.id;
      
      const isOwner = transactionTenantId === tenantId;
      const isAdmin = isSuperAdmin(ctx.session.user);

      if (!isOwner && !isAdmin) {
        throw new TRPCError({ 
          code: "FORBIDDEN",
          message: "Access denied" 
        });
      }

      // Check if tenant is verified (for non-admins)
      if (!isAdmin && tenantId) {
        const tenant = await ctx.db.findByID({
          collection: "tenants",
          id: tenantId,
          depth: 0,
        });

        if (!tenant?.isVerified || 
            (tenant.verificationStatus !== "document_verified" && 
             tenant.verificationStatus !== "physically_verified")) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Tenant must be verified to verify payments"
          });
        }
      }

      // Check status
      if (transaction.status !== "awaiting_verification") {
        throw new TRPCError({ 
          code: "BAD_REQUEST", 
          message: "Invalid transaction status" 
        });
      }

      // 1. Create Orders for each product with "pending" status
      // Orders will remain pending until customer confirms receipt
      const orders = await Promise.all(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        transaction.products.map(async (item: any) => {
          const quantity = item.quantity || 1;
          return await ctx.db.create({
            collection: "orders",
            data: {
              name: `Order ${transaction.paymentReference}`,
              user: transaction.customer,
              product: typeof item.product === 'string' ? item.product : item.product.id,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              products: transaction.products.map((p: any) => ({
                product: typeof p.product === 'string' ? p.product : p.product.id,
                quantity: p.quantity || 1,
                priceAtPurchase: p.price,
              })),
              totalAmount: transaction.totalAmount,
              transactionId: input.verifiedMtnTransactionId,
              paymentMethod: "mobile_money",
              bankName: "MTN Mobile Money",
              accountNumber: transaction.customerPhone || "N/A",
              amount: item.price * quantity,
              currency: "RWF",
              transaction: transaction.id,
              status: "pending", // Orders start as pending after payment verification
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any,
          });
        })
      );

      // 1.5. Deduct quantities from product inventory
      await Promise.all(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        transaction.products.map(async (item: any) => {
          const productId = typeof item.product === 'string' ? item.product : item.product.id;
          const quantity = item.quantity || 1;
          
          // Get current product
          const product = await ctx.db.findByID({
            collection: "products",
            id: productId,
          });
          
          // Calculate new quantity (don't go below 0)
          const newQuantity = Math.max(0, (product.quantity || 0) - quantity);
          
          // Update product quantity
          await ctx.db.update({
            collection: "products",
            id: productId,
            data: {
              quantity: newQuantity,
              // Stock status will be auto-calculated by beforeChange hook
            },
          });
        })
      );

      // 2. Update transaction status
      await ctx.db.update({
        collection: "transactions",
        id: input.transactionId,
        data: {
          status: "verified",
          mtnTransactionId: input.verifiedMtnTransactionId,
          verifiedAt: new Date().toISOString(),
          verifiedBy: ctx.session.user.id,
          // Note: Order relationship removed from Transactions to avoid circular ref
          // You can query Orders by transaction field instead
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      });

      // 3. Update tenant revenue
      const tenant = await ctx.db.findByID({
        collection: "tenants",
        id: typeof transaction.tenant === 'string' ? transaction.tenant : transaction.tenant.id,
      });

      await ctx.db.update({
        collection: "tenants",
        id: tenant.id,
        data: {
          totalRevenue: (tenant.totalRevenue || 0) + transaction.tenantAmount,
        },
      });

      // TODO: Send email notification to customer

      return {
        success: true,
        message: "Payment verified successfully",
        orderIds: orders.map(o => o.id),
      };
    }),

  // Reject payment
  rejectPayment: protectedProcedure
    .input(
      z.object({
        transactionId: z.string(),
        reason: z.string().min(10, "Reason must be at least 10 characters"),
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

      // Check ownership
      const user = await ctx.db.findByID({
        collection: "users",
        id: ctx.session.user.id,
        depth: 0,
      });

      const tenantId = user?.tenants?.[0]?.tenant as string;
      
      // Handle transaction.tenant as object or string
      const transactionTenantId = typeof transaction.tenant === 'string' 
        ? transaction.tenant 
        : transaction.tenant?.id;
      
      const isOwner = transactionTenantId === tenantId;
      const isAdmin = isSuperAdmin(ctx.session.user);

      if (!isOwner && !isAdmin) {
        throw new TRPCError({ 
          code: "FORBIDDEN",
          message: "Access denied" 
        });
      }

      // Check if tenant is verified (for non-admins)
      if (!isAdmin && tenantId) {
        const tenant = await ctx.db.findByID({
          collection: "tenants",
          id: tenantId,
          depth: 0,
        });

        if (!tenant?.isVerified || 
            (tenant.verificationStatus !== "document_verified" && 
             tenant.verificationStatus !== "physically_verified")) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Tenant must be verified to reject payments"
          });
        }
      }

      // Check status
      if (transaction.status !== "awaiting_verification") {
        throw new TRPCError({ 
          code: "BAD_REQUEST", 
          message: "Invalid transaction status" 
        });
      }

      // Update transaction
      await ctx.db.update({
        collection: "transactions",
        id: input.transactionId,
        data: {
          status: "rejected",
          rejectionReason: input.reason,
          verifiedBy: ctx.session.user.id,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      });

      // TODO: Send rejection email to customer

      return {
        success: true,
        message: "Payment rejected",
      };
    }),
});
