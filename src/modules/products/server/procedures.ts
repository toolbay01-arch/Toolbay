import { z } from "zod";
import { TRPCError } from "@trpc/server";
import type { Sort, Where } from "payload";
import { headers as getHeaders } from "next/headers";

import { DEFAULT_LIMIT } from "@/constants";
import { Category, Media, Tenant, Product } from "@/payload-types";
import { baseProcedure, createTRPCRouter, protectedProcedure } from "@/trpc/init";

import { sortValues } from "../search-params";

// Type for product with populated relationships
type PopulatedProduct = Product & {
  image?: Media | null;
  tenant?: Tenant & { image?: Media | null };
};

// Validation schemas for product CRUD
const createProductSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  description: z.any().optional(), // Rich text
  price: z.number().min(0, "Price must be positive"),
  quantity: z.number().min(0, "Quantity cannot be negative").default(0),
  unit: z.enum(["unit", "piece", "box", "pack", "bag", "kg", "gram", "meter", "cm", "liter", "sqm", "cbm", "set", "pair", "roll", "sheet", "carton", "pallet"]).default("unit"),
  minOrderQuantity: z.number().min(1, "Minimum order quantity must be at least 1").default(1),
  maxOrderQuantity: z.number().min(1).optional(),
  lowStockThreshold: z.number().min(0).default(10),
  allowBackorder: z.boolean().default(false),
  category: z.string().min(1, "Category is required"),
  tags: z.array(z.string()).optional(),
  image: z.string().min(1, "Product image is required"),
  cover: z.string().optional(),
  gallery: z.array(z.string()).optional(), // Array of media IDs
  refundPolicy: z.enum(["30-day", "14-day", "7-day", "3-day", "1-day", "no-refunds"]).default("30-day"),
  content: z.any().optional(), // Rich text
  isPrivate: z.boolean().default(false),
});

const updateProductSchema = z.preprocess(
  (data: any) => {
    // Preprocess the data to convert string numbers to actual numbers
    const processed = { ...data };
    
    // Convert numeric string fields to numbers
    const numericFields = ['minOrderQuantity', 'maxOrderQuantity', 'lowStockThreshold', 'price', 'quantity'];
    numericFields.forEach(field => {
      if (processed[field] !== undefined) {
        if (typeof processed[field] === 'string') {
          const num = Number(processed[field]);
          processed[field] = processed[field] === '' || isNaN(num) ? undefined : num;
        }
      }
    });
    
    // Handle empty string for unit - convert to undefined
    if (processed.unit === '') {
      processed.unit = undefined;
    }
    
    return processed;
  },
  z.object({
    id: z.string(),
    name: z.string().min(1).optional(),
    description: z.any().optional(),
    price: z.number().min(0).optional(),
    quantity: z.number().min(0).optional(),
    unit: z.enum(["unit", "piece", "box", "pack", "bag", "kg", "gram", "meter", "cm", "liter", "sqm", "cbm", "set", "pair", "roll", "sheet", "carton", "pallet"]).optional(),
    minOrderQuantity: z.number().min(1).optional(),
    maxOrderQuantity: z.number().min(1).optional(),
    lowStockThreshold: z.number().min(0).optional(),
    allowBackorder: z.boolean().optional(),
    category: z.string().optional(),
    tags: z.array(z.string()).optional(),
    image: z.string().optional(),
    cover: z.string().optional(),
    gallery: z.array(z.string()).optional(), // Array of media IDs
    refundPolicy: z.enum(["30-day", "14-day", "7-day", "3-day", "1-day", "no-refunds"]).optional(),
    content: z.any().optional(),
    isPrivate: z.boolean().optional(),
    isArchived: z.boolean().optional(),
  })
);

export const productsRouter = createTRPCRouter({
  getOne: baseProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const headers = await getHeaders();
      const session = await ctx.db.auth({ headers });

      const product = await ctx.db.findByID({
        collection: "products",
        id: input.id,
        depth: 2, // Depth 2 to populate: image, category, cover, gallery.media, tenant
        select: {
          content: false,
        },
      });

      if (product.isArchived) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Product not found",
        })
      }

      let isPurchased = false;

      if (session.user) {
        const ordersData = await ctx.db.find({
          collection: "orders",
          pagination: false,
          limit: 1,
          where: {
            and: [
              {
                product: {
                  equals: input.id,
                },
              },
              {
                user: {
                  equals: session.user.id,
                },
              },
            ],
          },
        });

        isPurchased = !!ordersData.docs[0];
      }

      const reviews = await ctx.db.find({
        collection: "reviews",
        pagination: false,
        where: {
          product: {
            equals: input.id,
          },
        },
      });

      const reviewRating =
        reviews.docs.length > 0
        ? reviews.docs.reduce((acc, review) => acc + review.rating, 0) / reviews.totalDocs
        : 0;

      const ratingDistribution: Record<number, number> = {
        5: 0,
        4: 0,
        3: 0,
        2: 0,
        1: 0,
      };

      if (reviews.totalDocs > 0) {
        reviews.docs.forEach((review) => {
          const rating = review.rating;

          if (rating >= 1 && rating <= 5) {
            ratingDistribution[rating] = (ratingDistribution[rating] || 0) + 1;
          }
        });

        Object.keys(ratingDistribution).forEach((key) => {
          const rating = Number(key);
          const count = ratingDistribution[rating] || 0;
          ratingDistribution[rating] = Math.round(
            (count / reviews.totalDocs) * 100,
          );
        });
      }

      // Find the user who owns this tenant
      let tenantOwnerId: string | null = null;
      try {
        const tenantId = typeof product.tenant === 'string' 
          ? product.tenant 
          : product.tenant?.id;
        
        if (tenantId) {
          // Query users collection for the owner of this tenant
          const owner = await ctx.db.find({
            collection: 'users',
            where: {
              and: [
                {
                  'tenants.tenant': {
                    equals: tenantId,
                  },
                },
                {
                  roles: {
                    contains: 'tenant',
                  },
                },
              ],
            },
            limit: 1,
            depth: 0,
          });
          
          if (owner.docs.length > 0 && owner.docs[0]) {
            tenantOwnerId = owner.docs[0].id;
          }
        }
      } catch (error) {
        // Log error but don't fail the entire request
        console.error('Error finding tenant owner for product:', product.id, error);
        tenantOwnerId = null;
      }

      // Calculate total sold for this product
      const salesData = await ctx.db.find({
        collection: "sales",
        pagination: false,
        where: {
          product: {
            equals: input.id,
          },
          status: {
            not_in: ["cancelled", "refunded"],
          },
        },
      });

      const totalSold = salesData.docs.reduce((acc, sale) => acc + (sale.quantity || 0), 0);

      return {
        ...product,
        isPurchased,
        image: (product as PopulatedProduct).image,
        tenant: (product as PopulatedProduct).tenant as Tenant & { image: Media | null; location?: string | null },
        reviewRating,
        reviewCount: reviews.totalDocs,
        ratingDistribution,
        tenantOwnerId,
        totalSold,
      }
    }),
  getMany: baseProcedure
    .input(
      z.object({
        cursor: z.number().default(1),
        limit: z.number().default(DEFAULT_LIMIT),
        search: z.string().nullable().optional(),
        category: z.string().nullable().optional(),
        minPrice: z.string().nullable().optional(),
        maxPrice: z.string().nullable().optional(),
        tags: z.array(z.string()).nullable().optional(),
        sort: z.enum(sortValues).nullable().optional(),
        tenantSlug: z.string().nullable().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where: Where = {
        isArchived: {
          not_equals: true,
        },
      };
      let sort: Sort = "-createdAt";

      if (input.sort === "curated") {
        sort = "-createdAt";
      }

      if (input.sort === "hot_and_new") {
        sort = "+createdAt";
      }

      if (input.sort === "trending") {
        sort = "-createdAt";
      }

      if (input.minPrice && input.maxPrice) {
        where.price = {
          greater_than_equal: input.minPrice,
          less_than_equal: input.maxPrice,
        }
      } else if (input.minPrice) {
        where.price = {
          greater_than_equal: input.minPrice
        }
      } else if (input.maxPrice) {
        where.price = {
          less_than_equal: input.maxPrice
        }
      }

      if (input.tenantSlug) {
        where["tenant.slug"] = {
          equals: input.tenantSlug,
        };
      } else {
        // If we are loading products for public storefront (no tenantSlug)
        // Make sure to not load products set to "isPrivate: true" (using reverse not_equals logic)
        // These products are exclusively private to the tenant store

        where["isPrivate"] = {
          not_equals: true,
        }
      }
      
      if (input.category) {
        const categoriesData = await ctx.db.find({
          collection: "categories",
          limit: 1,
          depth: 1, // Populate subcategories, subcategores.[0] will be a type of "Category"
          pagination: false,
          where: {
            slug: {
              equals: input.category,
            }
          }
        });

        const formattedData = categoriesData.docs.map((doc) => ({
          ...doc,
          subcategories: (doc.subcategories?.docs ?? []).map((doc) => ({
            // Because of "depth: 1" we are confident "doc" will be a type of "Category"
            ...(doc as Category),
            subcategories: undefined,
          }))
        }));

        const subcategoriesSlugs = [];
        const parentCategory = formattedData[0];

        if (parentCategory) {
          subcategoriesSlugs.push(
            ...parentCategory.subcategories.map((subcategory) => subcategory.slug)
          )

          where["category.slug"] = {
            in: [parentCategory.slug, ...subcategoriesSlugs]
          }
        }
      }

      if (input.tags && input.tags.length > 0) {
        where["tags.name"] = {
          in: input.tags,
        };
      }

      if (input.search) {
        where["name"] = {
          like: input.search,
        };
      }

      // Filter out out-of-stock products from public lists (unless allowBackorder/pre-order is enabled)
      // This ensures tenants can still see their out-of-stock products in their management area
      // but customers won't see them in public product lists unless pre-order is enabled
      if (!input.tenantSlug) {
        // For public product lists, exclude products where:
        // - quantity is 0 AND allowBackorder is false
        // Show products that have quantity > 0 OR (quantity = 0 AND allowBackorder = true)
        where.or = [
          {
            quantity: {
              greater_than: 0,
            },
          },
          {
            and: [
              {
                quantity: {
                  equals: 0,
                },
              },
              {
                allowBackorder: {
                  equals: true,
                },
              },
            ],
          },
        ];
      }

      const data = await ctx.db.find({
        collection: "products",
        depth: 1, // Reduced from 2 to 1 - loads category, image, tenant (without nested relationships)
        where,
        sort,
        page: input.cursor,
        limit: input.limit,
        select: {
          content: false,
        },
      });

      // Fetch all reviews for all products in one query to avoid N+1 problem
      const productIds = data.docs.map(doc => doc.id);
      const allReviewsData = await ctx.db.find({
        collection: "reviews",
        pagination: false,
        where: {
          product: {
            in: productIds,
          },
        },
      });

      // Group reviews by product ID for efficient lookup
      const reviewsByProduct = allReviewsData.docs.reduce((acc, review) => {
        const productId = typeof review.product === 'string' ? review.product : review.product.id;
        if (!acc[productId]) {
          acc[productId] = [];
        }
        acc[productId].push(review);
        return acc;
      }, {} as Record<string, typeof allReviewsData.docs>);

      // Fetch all sales for all products in one query to calculate total sold
      const allSalesData = await ctx.db.find({
        collection: "sales",
        pagination: false,
        where: {
          product: {
            in: productIds,
          },
          status: {
            not_in: ["cancelled", "refunded"],
          },
        },
      });

      // Group sales by product ID and calculate total sold
      const totalSoldByProduct = allSalesData.docs.reduce((acc, sale) => {
        const productId = typeof sale.product === 'string' ? sale.product : sale.product.id;
        if (!acc[productId]) {
          acc[productId] = 0;
        }
        acc[productId] += sale.quantity || 0;
        return acc;
      }, {} as Record<string, number>);

      // Calculate review stats for each product
      const dataWithSummarizedReviews = data.docs.map((doc) => {
        const productReviews = reviewsByProduct[doc.id] || [];
        
        return {
          ...doc,
          reviewCount: productReviews.length,
          reviewRating: productReviews.length === 0
            ? 0
            : productReviews.reduce((acc, review) => acc + review.rating, 0) / productReviews.length,
          totalSold: totalSoldByProduct[doc.id] || 0,
        };
      });

      return {
        ...data,
        docs: dataWithSummarizedReviews.map((doc) => ({
          ...doc,
          image: (doc as PopulatedProduct).image,
          tenant: (doc as PopulatedProduct).tenant as Tenant & { image: Media | null; location?: string | null },
        }))
      }
    }),
  
  // Get products for current tenant (dashboard view)
  getMyProducts: protectedProcedure
    .input(
      z.object({
        cursor: z.number().default(1),
        limit: z.number().default(DEFAULT_LIMIT),
        search: z.string().nullable().optional(),
        includeArchived: z.boolean().default(false),
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

      const where: Where = {
        tenant: {
          equals: tenantId,
        },
      };

      if (!input.includeArchived) {
        where.isArchived = {
          not_equals: true,
        };
      }

      if (input.search) {
        where["name"] = {
          like: input.search,
        };
      }

      const data = await ctx.db.find({
        collection: "products",
        depth: 1,
        where,
        sort: "-createdAt",
        page: input.cursor,
        limit: input.limit,
        select: {
          content: false,
        },
      });

      // Fetch all reviews for all products in one query
      const productIds = data.docs.map(doc => doc.id);
      const allReviewsData = await ctx.db.find({
        collection: "reviews",
        pagination: false,
        where: {
          product: {
            in: productIds,
          },
        },
      });

      // Group reviews by product ID
      const reviewsByProduct = allReviewsData.docs.reduce((acc, review) => {
        const productId = typeof review.product === 'string' ? review.product : review.product.id;
        if (!acc[productId]) {
          acc[productId] = [];
        }
        acc[productId].push(review);
        return acc;
      }, {} as Record<string, typeof allReviewsData.docs>);

      // Calculate review stats for each product
      const dataWithSummarizedReviews = data.docs.map((doc) => {
        const productReviews = reviewsByProduct[doc.id] || [];
        
        return {
          ...doc,
          reviewCount: productReviews.length,
          reviewRating: productReviews.length === 0
            ? 0
            : productReviews.reduce((acc, review) => acc + review.rating, 0) / productReviews.length
        };
      });

      return {
        ...data,
        docs: dataWithSummarizedReviews.map((doc) => ({
          ...doc,
          image: (doc as PopulatedProduct).image,
          tenant: (doc as PopulatedProduct).tenant as Tenant & { image: Media | null; location?: string | null },
        }))
      };
    }),

  // Create a new product
  createProduct: protectedProcedure
    .input(createProductSchema)
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

      // All tenants can create products (verified or not)
      // Products from unverified tenants will be listed without verification badge

      // Transform gallery array to Payload format
      const productData: any = {
        ...input,
        tenant: tenantId,
      };

      if (input.gallery && input.gallery.length > 0) {
        productData.gallery = input.gallery.map((mediaId) => ({
          media: mediaId,
        }));
      }

      // Create the product
      const product = await ctx.db.create({
        collection: "products",
        data: productData,
      });

      return product;
    }),

  // Update an existing product
  updateProduct: protectedProcedure
    .input(updateProductSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      console.log('[updateProduct] Received input:', { id, updateData });

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

      // Verify the product belongs to this tenant
      const existingProduct = await ctx.db.findByID({
        collection: "products",
        id,
      });

      const productTenantId = typeof existingProduct.tenant === 'string'
        ? existingProduct.tenant
        : existingProduct.tenant?.id;

      if (productTenantId !== tenantId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only update your own products",
        });
      }

      // Transform gallery array to Payload format if provided
      const finalUpdateData: any = {};
      
      // Only include fields that are actually being updated (not undefined)
      Object.entries(updateData).forEach(([key, value]) => {
        if (value !== undefined) {
          finalUpdateData[key] = value;
        }
      });

      if (finalUpdateData.gallery && Array.isArray(finalUpdateData.gallery)) {
        finalUpdateData.gallery = finalUpdateData.gallery.map((mediaId: string) => ({
          media: mediaId,
        }));
      }

      // Ensure category is a string ID (safety check)
      if (finalUpdateData.category && typeof finalUpdateData.category !== 'string') {
        finalUpdateData.category = (finalUpdateData.category as any).id || finalUpdateData.category;
      }

      console.log('[updateProduct] Final data to update:', finalUpdateData);

      // Update the product
      const product = await ctx.db.update({
        collection: "products",
        id,
        data: finalUpdateData,
      });

      return product;
    }),

  // Delete a product (archive it)
  deleteProduct: protectedProcedure
    .input(z.object({ id: z.string() }))
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

      // Verify the product belongs to this tenant
      const existingProduct = await ctx.db.findByID({
        collection: "products",
        id: input.id,
      });

      const productTenantId = typeof existingProduct.tenant === 'string'
        ? existingProduct.tenant
        : existingProduct.tenant?.id;

      if (productTenantId !== tenantId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only delete your own products",
        });
      }

      // Archive the product instead of deleting
      const product = await ctx.db.update({
        collection: "products",
        id: input.id,
        data: {
          isArchived: true,
        },
      });

      return product;
    }),

  // Check stock availability for a product
  checkStock: baseProcedure
    .input(
      z.object({
        productId: z.string(),
        quantity: z.number().min(1),
      })
    )
    .query(async ({ ctx, input }) => {
      const product = await ctx.db.findByID({
        collection: "products",
        id: input.productId,
        depth: 0,
      });

      if (!product) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Product not found",
        });
      }

      const available = product.quantity >= input.quantity;
      const maxAvailable = product.quantity;
      const minOrder = product.minOrderQuantity || 1;
      const maxOrder = product.maxOrderQuantity || product.quantity;

      return {
        available,
        currentStock: product.quantity,
        requestedQuantity: input.quantity,
        maxAvailable,
        minOrderQuantity: minOrder,
        maxOrderQuantity: maxOrder,
        unit: product.unit || "unit",
        stockStatus: product.stockStatus,
        allowBackorder: product.allowBackorder || false,
        canPurchase: available || product.allowBackorder,
      };
    }),

  // Bulk update product quantities (for inventory management)
  updateQuantity: protectedProcedure
    .input(
      z.object({
        productId: z.string(),
        quantityChange: z.number(), // Positive to add, negative to subtract
        reason: z.enum(["restock", "damage", "sold", "correction", "return"]).optional(),
      })
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

      // Verify the product belongs to this tenant
      const existingProduct = await ctx.db.findByID({
        collection: "products",
        id: input.productId,
      });

      const productTenantId = typeof existingProduct.tenant === 'string'
        ? existingProduct.tenant
        : existingProduct.tenant?.id;

      if (productTenantId !== tenantId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only update your own products",
        });
      }

      // Calculate new quantity
      const newQuantity = Math.max(0, existingProduct.quantity + input.quantityChange);

      // Update product
      const product = await ctx.db.update({
        collection: "products",
        id: input.productId,
        data: {
          quantity: newQuantity,
        },
      });

      return {
        success: true,
        previousQuantity: existingProduct.quantity,
        newQuantity: product.quantity,
        change: input.quantityChange,
      };
    }),

  // Get suggested products (from current tenant and other tenants, excluding current product)
  getSuggested: baseProcedure
    .input(
      z.object({
        productId: z.string(),
        tenantSlug: z.string().optional(),
        limit: z.number().default(8),
      })
    )
    .query(async ({ ctx, input }) => {
      // First, get the current product to find its tenant
      const currentProduct = await ctx.db.findByID({
        collection: "products",
        id: input.productId,
        depth: 1,
      });

      const currentTenantId = typeof currentProduct.tenant === 'string'
        ? currentProduct.tenant
        : currentProduct.tenant?.id;

      // Get all verified tenants
      const allTenants = await ctx.db.find({
        collection: "tenants",
        where: {
          isVerified: {
            equals: true,
          },
        },
        limit: 100,
        pagination: false,
      });

      const tenantIds = allTenants.docs.map(t => t.id);

      // First, try to get products from the current tenant
      const currentTenantWhere: Where = {
        and: [
          {
            id: {
              not_equals: input.productId,
            },
          },
          {
            isArchived: {
              not_equals: true,
            },
          },
          {
            isPrivate: {
              not_equals: true,
            },
          },
          ...(currentTenantId ? [{
            tenant: {
              equals: currentTenantId,
            },
          }] : []),
        ],
      };

      const currentTenantProducts = await ctx.db.find({
        collection: "products",
        depth: 1,
        where: currentTenantWhere,
        sort: "-createdAt",
        limit: input.limit,
        select: {
          content: false,
        },
      });

      // If we need more products, get from other tenants
      let allProducts = [...currentTenantProducts.docs];
      const remainingLimit = input.limit - allProducts.length;

      if (remainingLimit > 0) {
        const otherTenantsWhere: Where = {
          and: [
            {
              id: {
                not_equals: input.productId,
                ...(allProducts.length > 0 ? {
                  not_in: allProducts.map(p => p.id),
                } : {}),
              },
            },
            {
              isArchived: {
                not_equals: true,
              },
            },
            {
              isPrivate: {
                not_equals: true,
              },
            },
            {
              tenant: {
                in: tenantIds.filter(id => id !== currentTenantId),
              },
            },
          ],
        };

        const otherTenantsProducts = await ctx.db.find({
          collection: "products",
          depth: 1,
          where: otherTenantsWhere,
          sort: "-createdAt",
          limit: remainingLimit,
          select: {
            content: false,
          },
        });

        allProducts = [...allProducts, ...otherTenantsProducts.docs];
      }

      // Create a data-like structure for compatibility
      const data = {
        docs: allProducts,
      };

      // Fetch all reviews for all products in one query
      const productIds = data.docs.map(doc => doc.id);
      const allReviewsData = await ctx.db.find({
        collection: "reviews",
        pagination: false,
        where: {
          product: {
            in: productIds,
          },
        },
      });

      // Group reviews by product ID
      const reviewsByProduct = allReviewsData.docs.reduce((acc, review) => {
        const productId = typeof review.product === 'string' ? review.product : review.product.id;
        if (!acc[productId]) {
          acc[productId] = [];
        }
        acc[productId].push(review);
        return acc;
      }, {} as Record<string, typeof allReviewsData.docs>);

      // Calculate review stats for each product
      const dataWithSummarizedReviews = data.docs.map((doc) => {
        const productReviews = reviewsByProduct[doc.id] || [];
        
        return {
          ...doc,
          reviewCount: productReviews.length,
          reviewRating: productReviews.length === 0
            ? 0
            : productReviews.reduce((acc, review) => acc + review.rating, 0) / productReviews.length
        };
      });

      return {
        docs: dataWithSummarizedReviews.map((doc) => ({
          ...doc,
          image: (doc as PopulatedProduct).image,
          tenant: (doc as PopulatedProduct).tenant as Tenant & { image: Media | null; location?: string | null },
        }))
      };
    }),

  // Get notification count for products (out-of-stock + low-stock)
  getProductNotificationCount: protectedProcedure
    .query(async ({ ctx }) => {
      // Get current user's tenant
      const userData = await ctx.db.findByID({
        collection: "users",
        id: ctx.session.user.id,
      });

      if (!userData.tenants?.[0]) {
        return { count: 0, outOfStock: 0, lowStock: 0 };
      }

      const tenantId = typeof userData.tenants[0].tenant === 'string' 
        ? userData.tenants[0].tenant 
        : userData.tenants[0].tenant.id;

      // Get all products for this tenant (not archived)
      const products = await ctx.db.find({
        collection: "products",
        where: {
          and: [
            {
              tenant: {
                equals: tenantId,
              },
            },
            {
              isArchived: {
                not_equals: true,
              },
            },
          ],
        },
        pagination: false,
      });

      let outOfStockCount = 0;
      let lowStockCount = 0;

      products.docs.forEach((product) => {
        const quantity = product.quantity ?? 0;
        if (quantity === 0) {
          outOfStockCount++;
        } else if (quantity > 0 && quantity <= 5) {
          lowStockCount++;
        }
      });

      return {
        count: outOfStockCount + lowStockCount,
        outOfStock: outOfStockCount,
        lowStock: lowStockCount,
      };
    }),

  // Get total views count for all tenant's products
  getTotalViewsCount: protectedProcedure
    .query(async ({ ctx }) => {
      // Get current user's tenant
      const userData = await ctx.db.findByID({
        collection: "users",
        id: ctx.session.user.id,
      });

      if (!userData.tenants?.[0]) {
        return { totalViews: 0 };
      }

      const tenantId = typeof userData.tenants[0].tenant === 'string' 
        ? userData.tenants[0].tenant 
        : userData.tenants[0].tenant.id;

      // Get all products for this tenant (not archived)
      const products = await ctx.db.find({
        collection: "products",
        where: {
          and: [
            {
              tenant: {
                equals: tenantId,
              },
            },
            {
              isArchived: {
                not_equals: true,
              },
            },
          ],
        },
        pagination: false,
      });

      // Sum up all viewCount values
      let totalViews = 0;
      products.docs.forEach((product: any) => {
        totalViews += product.viewCount || 0;
      });

      return { totalViews };
    }),

  // Track product view
  trackView: baseProcedure
    .input(
      z.object({
        productId: z.string(),
        isUnique: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Fetch current product to get view counts
        const product = await ctx.db.findByID({
          collection: "products",
          id: input.productId,
        }) as any; // Use 'any' temporarily until types are regenerated

        const updateData: any = {
          viewCount: (product.viewCount || 0) + 1,
        };
        
        if (input.isUnique) {
          updateData.uniqueViewCount = (product.uniqueViewCount || 0) + 1;
        }

        await ctx.db.update({
          collection: "products",
          id: input.productId,
          data: updateData,
        });

        return { success: true };
      } catch (error) {
        console.error('Error tracking product view:', error);
        // Don't throw error - view tracking shouldn't break the app
        return { success: false };
      }
    }),
});
