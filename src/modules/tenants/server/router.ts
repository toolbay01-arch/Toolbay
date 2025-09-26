import { TRPCError } from "@trpc/server";

import { protectedProcedure, createTRPCRouter } from "@/trpc/init";
import { isSuperAdmin } from "@/lib/access";

import { verifyTenantSchema } from "../schemas";

export const tenantsRouter = createTRPCRouter({
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
    });

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
