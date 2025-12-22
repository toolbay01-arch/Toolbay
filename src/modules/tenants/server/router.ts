import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { baseProcedure, protectedProcedure, createTRPCRouter } from "@/trpc/init";
import { isSuperAdmin } from "@/lib/access";
import { Media, Tenant } from "@/payload-types";

import { verifyTenantSchema } from "../schemas";

export const tenantsRouter = createTRPCRouter({
  // Get tenant by slug
  getOne: baseProcedure
    .input(
      z.object({
        slug: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const tenantsData = await ctx.db.find({
        collection: "tenants",
        depth: 1, // "tenant.image" is a type of "Media"
        where: {
          slug: {
            equals: input.slug,
          },
        },
        limit: 1,
        pagination: false,
      });

      const tenant = tenantsData.docs[0];

      if (!tenant) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Tenant not found" });
      }

      return tenant as Tenant & { image: Media | null };
    }),

  // Get current user's tenant
  getCurrentTenant: protectedProcedure.query(async ({ ctx }) => {
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

    const tenant = await ctx.db.findByID({
      collection: "tenants",
      id: userData.tenants[0].tenant as string,
    });

    return tenant;
  }),

  // Super admin verify tenant
  verifyTenant: protectedProcedure
    .input(verifyTenantSchema)
    .mutation(async ({ ctx, input }) => {
      if (!isSuperAdmin(ctx.session.user)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only super admins can verify tenants",
        });
      }

      const tenant = await ctx.db.update({
        collection: "tenants",
        id: input.tenantId,
        data: {
          verificationStatus: input.verificationStatus,
          isVerified: input.verificationStatus !== "rejected",
          verificationNotes: input.verificationNotes,
          verifiedAt: new Date().toISOString(),
          verifiedBy: ctx.session.user.id,
          canAddMerchants: input.canAddMerchants ?? (input.verificationStatus === "document_verified"),
        },
      });

      return tenant;
    }),

  // Get all tenants for admin
  getAllTenants: protectedProcedure.query(async ({ ctx }) => {
    if (!isSuperAdmin(ctx.session.user)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only super admins can view all tenants",
      });
    }

    const tenants = await ctx.db.find({
      collection: "tenants",
      limit: 100,
      sort: "-createdAt",
      overrideAccess: true, // Bypass access control for super admin
    });

    // Debug logging
    console.log('🔍 TRPC getAllTenants DEBUG:');
    console.log('User roles:', ctx.session.user.roles);
    console.log('Is super admin:', isSuperAdmin(ctx.session.user));
    console.log('Total tenants found:', tenants.totalDocs);
    console.log('Tenants returned:', tenants.docs.length);
    console.log('Tenant details:', tenants.docs.map(t => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      tinNumber: t.tinNumber
    })));

    return tenants;
  }),

  // Get pending verification tenants
  getPendingTenants: protectedProcedure.query(async ({ ctx }) => {
    if (!isSuperAdmin(ctx.session.user)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only super admins can view pending tenants",
      });
    }

    const tenants = await ctx.db.find({
      collection: "tenants",
      where: {
        or: [
          {
            verificationStatus: {
              equals: "pending",
            },
          },
          {
            physicalVerificationRequested: {
              equals: true,
            },
          },
        ],
      },
      limit: 50,
      sort: "-createdAt",
      overrideAccess: true, // Bypass access control for super admin
    });

    return tenants;
  }),

  // Request physical verification
  requestPhysicalVerification: protectedProcedure.mutation(async ({ ctx }) => {
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

    const tenant = await ctx.db.update({
      collection: "tenants",
      id: userData.tenants[0].tenant as string,
      data: {
        physicalVerificationRequested: true,
        physicalVerificationRequestedAt: new Date().toISOString(),
      },
    });

    return tenant;
  }),
});
