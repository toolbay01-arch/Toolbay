import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

export const usersRouter = createTRPCRouter({
  // Search users by username or name
  search: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1, "Search query is required"),
        userType: z.enum(["all", "tenants", "clients"]).optional().default("all"),
        limit: z.number().min(1).max(50).optional().default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.session?.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      // Build where clause
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const whereClause: any = {
        or: [
          { username: { contains: input.query } },
          { email: { contains: input.query } },
        ],
      };

      // Filter by user type
      if (input.userType === "tenants") {
        whereClause.and = [
          { roles: { contains: "tenant" } },
        ];
      } else if (input.userType === "clients") {
        whereClause.and = [
          { roles: { contains: "client" } },
        ];
      }

      // Exclude the current user from search results
      if (!whereClause.and) {
        whereClause.and = [];
      }
      whereClause.and.push({ id: { not_equals: ctx.session.user.id } });

      const users = await ctx.db.find({
        collection: "users",
        where: whereClause,
        limit: input.limit,
        depth: 1,
      });

      return users.docs.map((user) => ({
        id: user.id,
        username: user.username,
        email: user.email,
        roles: user.roles,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tenants: (user.tenants || []).map((t: any) => ({
          tenantId: typeof t.tenant === "string" ? t.tenant : t.tenant?.id,
          tenantName: typeof t.tenant === "string" ? null : t.tenant?.name,
          isOwner: t.isOwner,
        })),
      }));
    }),

  // Get user details by ID
  getById: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.session?.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const user = await ctx.db.findByID({
        collection: "users",
        id: input.userId,
        depth: 1,
      });

      if (!user) {
        throw new TRPCError({ 
          code: "NOT_FOUND", 
          message: "User not found" 
        });
      }

      return {
        id: user.id,
        username: user.username,
        email: user.email,
        roles: user.roles,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tenants: (user.tenants || []).map((t: any) => ({
          tenantId: typeof t.tenant === "string" ? t.tenant : t.tenant?.id,
          tenantName: typeof t.tenant === "string" ? null : t.tenant?.name,
          isOwner: t.isOwner,
        })),
      };
    }),
});
