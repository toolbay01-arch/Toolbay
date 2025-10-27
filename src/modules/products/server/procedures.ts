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
  category: z.string().min(1, "Category is required"),
  tags: z.array(z.string()).optional(),
  image: z.string().min(1, "Product image is required"),
  cover: z.string().optional(),
  gallery: z.array(z.string()).optional(), // Array of media IDs
  refundPolicy: z.enum(["30-day", "14-day", "7-day", "3-day", "1-day", "no-refunds"]).default("30-day"),
  content: z.any().optional(), // Rich text
  isPrivate: z.boolean().default(false),
});

const updateProductSchema = z.object({
  id: z.string(),
  name: z.string().min(1).optional(),
  description: z.any().optional(),
  price: z.number().min(0).optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  image: z.string().optional(),
  cover: z.string().optional(),
  gallery: z.array(z.string()).optional(), // Array of media IDs
  refundPolicy: z.enum(["30-day", "14-day", "7-day", "3-day", "1-day", "no-refunds"]).optional(),
  content: z.any().optional(),
  isPrivate: z.boolean().optional(),
  isArchived: z.boolean().optional(),
});

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
        depth: 1, // Reduced from 2 to 1 - loads product.image and product.tenant (without tenant.image)
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

      return {
        ...product,
        isPurchased,
        image: (product as PopulatedProduct).image,
        tenant: (product as PopulatedProduct).tenant as Tenant & { image: Media | null },
        reviewRating,
        reviewCount: reviews.totalDocs,
        ratingDistribution,
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
          tenant: (doc as PopulatedProduct).tenant as Tenant & { image: Media | null },
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
          tenant: (doc as PopulatedProduct).tenant as Tenant & { image: Media | null },
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

      // Check if tenant is verified
      const tenant = await ctx.db.findByID({
        collection: "tenants",
        id: tenantId,
      });

      if (!tenant.isVerified) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Your account must be verified before creating products",
        });
      }

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
      const finalUpdateData: any = { ...updateData };
      if (updateData.gallery && Array.isArray(updateData.gallery)) {
        finalUpdateData.gallery = updateData.gallery.map((mediaId: string) => ({
          media: mediaId,
        }));
      }

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
});
