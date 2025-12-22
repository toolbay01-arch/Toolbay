import { z } from "zod";

import { TRPCError } from "@trpc/server";

import { Media, Tenant } from "@/payload-types";
import { baseProcedure, createTRPCRouter, protectedProcedure } from "@/trpc/init";

import { generateTenantURL } from "@/lib/utils";

export const checkoutRouter = createTRPCRouter({
  // NEW: Initiate payment and create transaction
  initiatePayment: protectedProcedure
    .input(
      z.object({
        items: z.array(z.object({
          productId: z.string(),
          quantity: z.number().min(1),
        })).min(1),
        tenantSlug: z.string().min(1),
        customerEmail: z.string().email().optional(),
        customerPhone: z.string().min(1, "Phone number is required"),
        customerName: z.string().min(1, "Full name is required"),
        deliveryType: z.enum(['direct', 'delivery']).default('direct'),
        shippingAddress: z.object({
          line1: z.string().min(1, "Address is required"),
          city: z.string().min(1, "City is required"),
          country: z.string().min(1, "Country is required"),
        }).optional(),
      }).refine(
        (data) => {
          // Shipping address is required only for delivery type
          if (data.deliveryType === 'delivery' && !data.shippingAddress) {
            return false;
          }
          return true;
        },
        {
          message: "Shipping address is required for delivery orders",
          path: ["shippingAddress"],
        }
      )
    )
    .mutation(async ({ ctx, input }) => {
      // 1. Extract product IDs from items
      const productIds = input.items.map(item => item.productId);
      
      // 2. Validate products exist and belong to tenant
      const products = await ctx.db.find({
        collection: "products",
        depth: 1,
        where: {
          and: [
            { id: { in: productIds } },
            { "tenant.slug": { equals: input.tenantSlug } },
            { isArchived: { not_equals: true } },
          ]
        }
      });

      if (products.totalDocs !== productIds.length) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Some products not found" });
      }

      // 3. Validate stock availability for each item
      const stockValidationErrors: string[] = [];
      const itemsMap = new Map(input.items.map(item => [item.productId, item]));
      
      for (const product of products.docs) {
        const requestedQuantity = itemsMap.get(product.id)?.quantity || 0;
        const availableQuantity = product.quantity || 0;
        const minOrder = product.minOrderQuantity || 1;
        const maxOrder = product.maxOrderQuantity;
        const allowBackorder = product.allowBackorder || false;
        
        // Check minimum order quantity
        if (requestedQuantity < minOrder) {
          stockValidationErrors.push(
            `${product.name}: Minimum order is ${minOrder} ${product.unit || "unit"}${minOrder > 1 ? "s" : ""}`
          );
        }
        
        // Check maximum order quantity
        if (maxOrder && requestedQuantity > maxOrder) {
          stockValidationErrors.push(
            `${product.name}: Maximum order is ${maxOrder} ${product.unit || "unit"}${maxOrder > 1 ? "s" : ""}`
          );
        }
        
        // Check stock availability
        if (!allowBackorder && requestedQuantity > availableQuantity) {
          stockValidationErrors.push(
            `${product.name}: Only ${availableQuantity} ${product.unit || "unit"}${availableQuantity !== 1 ? "s" : ""} available`
          );
        }
      }
      
      if (stockValidationErrors.length > 0) {
        throw new TRPCError({ 
          code: "BAD_REQUEST", 
          message: `Stock validation failed:\n${stockValidationErrors.join("\n")}` 
        });
      }

      // 4. Get tenant
      const tenantsData = await ctx.db.find({
        collection: "tenants",
        limit: 1,
        pagination: false,
        where: { slug: { equals: input.tenantSlug } },
      });

      const tenant = tenantsData.docs[0];
      if (!tenant) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Tenant not found" });
      }

      // All tenants can sell products (verified or not)
      // Verification status only affects the display of the verified badge

      // Check if tenant has MoMo configured
      if (tenant.paymentMethod === 'momo_pay' && !tenant.momoCode) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Store owner has not configured their Mobile Money Code yet. Please contact ${tenant.name} to complete payment setup.`,
        });
      }

      // 5. Calculate totals
      const totalAmount = products.docs.reduce((acc, p) => {
        const quantity = itemsMap.get(p.id)?.quantity || 1;
        return acc + (p.price * quantity);
      }, 0);

      // 6. Create transaction with quantities
      const expiryDate = new Date();
      expiryDate.setHours(expiryDate.getHours() + 48);
      
      const transaction = await ctx.db.create({
        collection: "transactions",
        data: {
          customer: ctx.session.user.id,
          customerName: input.customerName,
          customerEmail: input.customerEmail || ctx.session.user.email,
          customerPhone: input.customerPhone,
          deliveryType: input.deliveryType,
          shippingAddress: input.shippingAddress ? {
            line1: input.shippingAddress.line1,
            city: input.shippingAddress.city,
            country: input.shippingAddress.country,
          } : undefined,
          tenant: tenant.id,
          products: products.docs.map((p) => ({
            product: p.id,
            price: p.price,
            quantity: itemsMap.get(p.id)?.quantity || 1,
          })),
          totalAmount,
          platformFee: 0, // No platform fee
          tenantAmount: totalAmount, // Tenant receives full amount
          status: "pending",
          paymentReference: "", // Will be auto-generated by hook
          expiresAt: expiryDate.toISOString(),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      });

      // 7. Return payment instructions
      return {
        transactionId: transaction.id,
        paymentReference: transaction.paymentReference,
        momoCode: tenant.momoCode, // From tenant admin configuration
        momoAccountName: tenant.momoAccountName || tenant.name,
        amount: totalAmount, // Total cart amount (tenant receives full amount)
        expiresAt: transaction.expiresAt,
        // Dial code format: *182*8*1*{MOMO_CODE}*{TOTAL_AMOUNT}#
        dialCode: `*182*8*1*${tenant.momoCode}*${totalAmount}#`,
      };
    }),

  verify: protectedProcedure
    .mutation(async ({ ctx }) => {
      const user = await ctx.db.findByID({
        collection: "users",
        id: ctx.session.user.id,
        depth: 0, // user.tenants[0].tenant is going to be a string (tenant ID)
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      const tenantId = user.tenants?.[0]?.tenant as string; // This is an id because of depth: 0
      const tenant = await ctx.db.findByID({
        collection: "tenants",
        id: tenantId,
      });

      if (!tenant) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Tenant not found",
        });
      }

      // All tenants can sell products (verified or not)
      // Verification status only affects the display of the verified badge

      const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL!}/dashboard`;

      return { url: dashboardUrl };
    }),
  purchase: protectedProcedure
    .input(
      z.object({
        productIds: z.array(z.string()).min(1),
        tenantSlug: z.string().min(1),
        paymentMethod: z.enum(["bank", "momo"]),
        accountNumber: z.string().min(1),
        transactionId: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const products = await ctx.db.find({
        collection: "products",
        depth: 1, // Reduced from 2 to 1 for better performance
        where: {
          and: [
            {
              id: {
                in: input.productIds,
              }
            },
            {
              "tenant.slug": {
                equals: input.tenantSlug
              }
            },
            {
              isArchived: {
                not_equals: true,
              },
            }
          ]
        }
      })

      if (products.totalDocs !== input.productIds.length) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Products not found" });
      }

      const tenantsData = await ctx.db.find({
        collection: "tenants",
        limit: 1,
        pagination: false,
        where: {
          slug: {
            equals: input.tenantSlug,
          },
        },
      });

      const tenant = tenantsData.docs[0];

      if (!tenant) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Tenant not found",
        })
      }

      // All tenants can sell products (verified or not)
      // Verification status only affects the display of the verified badge

      // const totalAmount = products.docs.reduce((acc, item) => acc + item.price, 0);
      // const platformFeeAmount = Math.round(totalAmount * (PLATFORM_FEE_PERCENTAGE / 100));

      // Create order record for each product (current Orders schema is per product)
      const orders = await Promise.all(
        input.productIds.map(async (productId) => {
          const productDoc = products.docs.find(p => p.id === productId);
          return await ctx.db.create({
            collection: "orders",
            data: {
              name: `Order for ${productDoc?.name}`,
              orderNumber: `ORD-${Date.now()}-${productId.slice(-6)}`,
              user: ctx.session.user.id,
              product: productId,
              products: [{
                product: productId,
                quantity: 1,
                priceAtPurchase: productDoc?.price || 0,
              }],
              totalAmount: productDoc?.price || 0,
              transactionId: input.transactionId,
              paymentMethod: input.paymentMethod === "bank" ? "bank_transfer" : "mobile_money",
              bankName: input.paymentMethod === "bank" ? "Bank Transfer" : "Mobile Money",
              accountNumber: input.accountNumber,
              amount: productDoc?.price || 0,
              currency: "RWF",
              status: "completed",
              deliveryType: "delivery", // Default to delivery for legacy purchase flow
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any,
          });
        })
      );

      const domain = generateTenantURL(input.tenantSlug);
      
      return { 
        url: `${domain}/checkout?success=true&orderIds=${orders.map(o => o.id).join(',')}`,
        orderIds: orders.map(o => o.id)
      };
    })
  ,
  getProducts: baseProcedure
    .input(
      z.object({
        ids: z.array(z.string()),
      }),
    )
    .query(async ({ ctx, input }) => {
      const data = await ctx.db.find({
        collection: "products",
        depth: 1, // Reduced from 2 to 1 for better performance
        where: {
          and: [
            {
              id: {
                in: input.ids,
              },
            },
            {
              isArchived: {
                not_equals: true,
              },
            },
          ],
        },
      });

      if (data.totalDocs !== input.ids.length) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Products not found" });
      }

      const totalPrice = data.docs.reduce((acc, product) => {
        const price = Number(product.price);
        return acc + (isNaN(price) ? 0 : price);
      }, 0);

      return {
        ...data,
        totalPrice: totalPrice,
        docs: data.docs.map((doc) => ({
          ...doc,
          image: doc.image as Media | null,
          tenant: doc.tenant as Tenant & { image: Media | null; location?: string | null },
        }))
      }
    }),
});
