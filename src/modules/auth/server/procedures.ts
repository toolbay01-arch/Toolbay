import { TRPCError } from "@trpc/server";
import { headers as getHeaders } from "next/headers";

import { baseProcedure, createTRPCRouter } from "@/trpc/init";

import { generateAuthCookie, clearAuthCookie } from "../utils";
import { loginSchema, registerSchema } from "../schemas";
import { registerClientSchema } from "../schemas-client";

export const authRouter = createTRPCRouter({
  session: baseProcedure.query(async ({ ctx }) => {
    const headers = await getHeaders();

    const session = await ctx.db.auth({ headers });

    return session;
  }),
  
  /**
   * Register a new tenant (seller) account
   * Requires business information: TIN, payment method, etc.
   */
  register: baseProcedure
    .input(registerSchema)
    .mutation(async ({ input, ctx }) => {
      const existingData = await ctx.db.find({
        collection: "users",
        limit: 1,
        where: {
          username: {
            equals: input.username,
          },
        },
      });

      const existingUser = existingData.docs[0];

      if (existingUser) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Username already taken",
        });
      }

      // Check if TIN number is already taken
      const existingTinData = await ctx.db.find({
        collection: "tenants",
        limit: 1,
        where: {
          tinNumber: {
            equals: input.tinNumber,
          },
        },
      });

      if (existingTinData.docs[0]) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "TIN Number already registered",
        });
      }

      const tenant = await ctx.db.create({
        collection: "tenants",
        data: {
          name: input.username,
          slug: input.username,
          tinNumber: input.tinNumber,
          storeManagerId: input.storeManagerId,
          category: input.category,
          location: input.location,
          paymentMethod: input.paymentMethod,
          ...(input.paymentMethod === "bank_transfer" && {
            bankName: input.bankName,
            bankAccountNumber: input.bankAccountNumber,
          }),
          ...(input.paymentMethod === "momo_pay" && {
            momoPayCode: input.momoPayCode,
          }),
          isVerified: false,
          verificationStatus: "pending",
          canAddMerchants: false,
        } as any
      })

      await ctx.db.create({
        collection: "users",
        data: {
          email: input.email,
          username: input.username,
          password: input.password, // This will be hashed
          tenants: [
            {
              tenant: tenant.id,
            },
          ],
        },
      });

      const data = await ctx.db.login({
        collection: "users",
        data: {
          email: input.email,
          password: input.password,
        },
      });

      if (!data.token) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Failed to login",
        });
      }

      await generateAuthCookie({
        prefix: ctx.db.config.cookiePrefix,
        value: data.token,
      });
      
      return data;
    }),
    
  /**
   * Register a new client (buyer) account
   * No business information required - just basic account details
   */
  registerClient: baseProcedure
    .input(registerClientSchema)
    .mutation(async ({ input, ctx }) => {
      const existingData = await ctx.db.find({
        collection: "users",
        limit: 1,
        where: {
          or: [
            { username: { equals: input.username } },
            { email: { equals: input.email } },
          ],
        },
      });

      const existingUser = existingData.docs[0];

      if (existingUser) {
        if (existingUser.username === input.username) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Username already taken",
          });
        }
        if (existingUser.email === input.email) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Email already registered",
          });
        }
      }

      // Create client user (buyer) - no tenant association needed
      await ctx.db.create({
        collection: "users",
        data: {
          email: input.email,
          username: input.username,
          password: input.password,
          roles: ["client"], // Explicitly set client role
          // Client users don't have tenants
          tenants: [],
        },
      });

      const data = await ctx.db.login({
        collection: "users",
        data: {
          email: input.email,
          password: input.password,
        },
      });

      if (!data.token) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Failed to login",
        });
      }

      await generateAuthCookie({
        prefix: ctx.db.config.cookiePrefix,
        value: data.token,
      });
      
      return data;
    }),
    
  login: baseProcedure
    .input(loginSchema)
    .mutation(async ({ input, ctx }) => {
      const data = await ctx.db.login({
        collection: "users",
        data: {
          email: input.email,
          password: input.password,
        },
      });

      if (!data.token) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Failed to login",
        });
      }

      await generateAuthCookie({
        prefix: ctx.db.config.cookiePrefix,
        value: data.token,
      });

      return data;
    }),
  logout: baseProcedure.mutation(async ({ ctx }) => {
    await clearAuthCookie(ctx.db.config.cookiePrefix);
    
    return { success: true };
  }),
});
