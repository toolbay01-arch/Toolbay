import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { isSuperAdmin } from "@/lib/access";

export const adminRouter = createTRPCRouter({
  // Get all transactions for tenant (including completed ones)
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
      // Remove status filter to show all transactions (pending, verified, rejected, completed)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const whereClause: any = isSuperAdmin(ctx.session.user)
        ? {} // Show all transactions for super admins
        : {
            tenant: { equals: tenantId }, // Show all transactions for this tenant
          };

      // Get transactions
      const transactions = await ctx.db.find({
        collection: "transactions",
        where: whereClause,
        depth: 2,
        sort: '-createdAt',
        limit: 100,
      });

      // For each transaction, fetch related orders
      const transactionsWithOrders = await Promise.all(
        transactions.docs.map(async (transaction: any) => {
          // Find orders related to this transaction
          const ordersResult = await ctx.db.find({
            collection: "orders",
            where: {
              transaction: {
                equals: transaction.id,
              },
            },
            depth: 2, // Get product details
            sort: '-createdAt',
          });

          // Explicitly include all transaction fields including shippingAddress
          return {
            ...transaction,
            // Ensure these fields are present even if undefined
            deliveryType: transaction.deliveryType || 'delivery',
            shippingAddress: transaction.shippingAddress || null,
            orders: ordersResult.docs.map((order: any) => ({
              id: order.id,
              orderNumber: order.orderNumber,
              status: order.status,
              deliveryType: (order as any).deliveryType || 'delivery', // Include delivery type
              totalAmount: order.totalAmount,
              shippedAt: order.shippedAt,
              deliveredAt: order.deliveredAt,
              confirmedAt: order.confirmedAt,
              received: order.received,
              products: order.products || [],
              product: order.product,
            })),
          };
        })
      );

      return transactionsWithOrders;
    }),

  // Verify payment
  verifyPayment: protectedProcedure
    .input(
      z.object({
        transactionId: z.string(),
        verifiedMtnTransactionId: z.string().min(1, "Mobile Money Transaction ID is required"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get transaction
      const transaction = await ctx.db.findByID({
        collection: "transactions",
        id: input.transactionId,
        depth: 1,
      });

      console.log('🔍 Transaction fetched:', JSON.stringify({
        id: transaction?.id,
        status: transaction?.status,
        tenant: typeof transaction?.tenant === 'string' ? transaction?.tenant : {
          id: (transaction?.tenant as any)?.id,
          hasCategory: 'category' in (transaction?.tenant || {}),
          hasLocation: 'location' in (transaction?.tenant || {}),
          category: (transaction?.tenant as any)?.category,
          location: (transaction?.tenant as any)?.location,
        },
        products: transaction?.products?.map((p: any) => ({
          product: typeof p.product === 'string' ? p.product : p.product?.id,
          quantity: p.quantity,
          price: p.price,
        })),
      }, null, 2));

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
          const productId = typeof item.product === 'string' ? item.product : item.product.id;
          const userId = typeof transaction.customer === 'string' ? transaction.customer : transaction.customer.id;
          
          // Log product data to debug "Category, Location" error
          console.log('🔍 Product item:', JSON.stringify(item, null, 2));
          console.log('🔍 Product ID:', productId);
          console.log('🔍 User ID:', userId);
          console.log('🔍 Transaction tenant:', JSON.stringify((transaction as any).tenant, null, 2));
          
          try {
            const order = await ctx.db.create({
              collection: "orders",
              data: {
                name: `Order ${transaction.paymentReference}`,
                user: userId,
                product: productId,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                products: transaction.products.map((p: any) => ({
                  product: typeof p.product === 'string' ? p.product : p.product.id,
                  quantity: p.quantity || 1,
                  priceAtPurchase: p.price,
                })),
                totalAmount: transaction.totalAmount,
                transactionId: input.verifiedMtnTransactionId,
                paymentMethod: "mobile_money",
                bankName: "Mobile Money",
                accountNumber: transaction.customerPhone || "N/A",
                amount: item.price * quantity,
                currency: "RWF",
                transaction: transaction.id,
                deliveryType: (transaction as any).deliveryType || 'delivery', // Copy delivery type from transaction
                shippingAddress: (transaction as any).shippingAddress ? {
                  line1: (transaction as any).shippingAddress.line1,
                  city: (transaction as any).shippingAddress.city,
                  country: (transaction as any).shippingAddress.country,
                } : undefined, // Copy shipping address from transaction for delivery orders
                status: "pending", // Orders start as pending after payment verification
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
              } as any,
              overrideAccess: true, // Bypass access control for system-level creation
            });
            
            return order;
          } catch (error: any) {
            console.error('❌ Error creating order:', error);
            console.error('Error message:', error.message);
            console.error('Error data:', JSON.stringify(error.data, null, 2));
            throw error;
          }
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
          totalRevenue: (tenant.totalRevenue || 0) + (transaction.tenantAmount || 0),
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
