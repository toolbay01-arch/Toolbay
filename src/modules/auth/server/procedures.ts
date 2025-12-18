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
   * TIN and Store Manager ID are now optional - added by super admin during verification
   * Slug is auto-generated from store name
   */
  register: baseProcedure
    .input(registerSchema)
    .mutation(async ({ input, ctx }) => {
      // Generate slug from store name: "My COMPANY LTD" -> "my-company-ltd"
      const generateSlug = (name: string): string => {
        return name
          .toLowerCase()
          .trim()
          .replace(/[^\w\s-]/g, '') // Remove special characters
          .replace(/\s+/g, '-') // Replace spaces with hyphens
          .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
          .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
      };

      let baseSlug = generateSlug(input.storeName);
      let slug = baseSlug;

      // Ensure slug uniqueness by appending a suffix if needed
      let suffix = 1;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const existingTenant = await ctx.db.find({
          collection: "tenants",
          limit: 1,
          where: { slug: { equals: slug } },
        });

        if (!existingTenant.docs[0]) break;

        // Append numeric suffix and try again
        suffix += 1;
        slug = `${baseSlug}-${suffix}`;
      }

      // Generate username from email (before @ symbol) or use slug as fallback
      let baseUsername = (input.email.split('@')[0] || baseSlug).toLowerCase().replace(/[^a-z0-9-]/g, '');
      let username = baseUsername;

      // Ensure username uniqueness
      suffix = 1;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const existingUserCheck = await ctx.db.find({
          collection: "users",
          limit: 1,
          where: { username: { equals: username } },
        });
        if (!existingUserCheck.docs[0]) break;
        suffix += 1;
        username = `${baseUsername}${suffix}`;
      }

      // Check if email is already registered
      const existingEmail = await ctx.db.find({
        collection: "users",
        limit: 1,
        where: { email: { equals: input.email } },
      });
      if (existingEmail.docs[0]) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Email already registered" });
      }

      // TIN validation removed - TIN is now optional and added by super admin during verification

      const tenant = await ctx.db.create({
        collection: "tenants",
        data: {
          name: input.storeName,
          slug: slug,
          // TIN and storeManagerId removed - will be added by super admin during verification
          tinNumber: undefined, // Explicitly set to undefined to avoid validation issues
          storeManagerId: undefined, // Explicitly set to undefined to avoid validation issues
          category: input.category,
          location: input.location,
          contactPhone: input.contactPhone, // Required field from sign-up form
          currency: input.currency,
          paymentMethod: input.paymentMethod,
          ...(input.paymentMethod === "bank_transfer" && {
            bankName: input.bankName,
            bankAccountNumber: input.bankAccountNumber,
          }),
          ...(input.paymentMethod === "momo_pay" && {
            // Convert momoCode (string from form) to number for storage
            momoCode: input.momoCode ? Number(input.momoCode) : undefined,
            momoProviderName: input.momoProviderName,
            momoAccountName: input.momoAccountName,
          }),
          isVerified: false,
          verificationStatus: "pending",
          verificationRequested: true, // Auto-request verification for self-registered tenants
          verificationRequestedAt: new Date().toISOString(),
          canAddMerchants: false,
        } as any
      })

      await ctx.db.create({
        collection: "users",
        data: {
          email: input.email,
          username: username,
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
        rememberMe: true, // Default to persistent session for registrations
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
        rememberMe: true, // Default to persistent session for registrations
      });
      
      return data;
    }),
    
  login: baseProcedure
    .input(loginSchema)
    .mutation(async ({ input, ctx }) => {
      // Check if input is an email or a company name
      const isEmail = input.email.includes('@');
      
      let loginEmail = input.email;
      
      // If not an email, treat it as a company name and find the associated user
      if (!isEmail) {
        // Find tenant by exact name (case-insensitive)
        const tenantData = await ctx.db.find({
          collection: "tenants",
          limit: 1,
          where: {
            name: {
              equals: input.email,
            },
          },
        });

        if (!tenantData.docs[0]) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid credentials",
          });
        }

        // Find user associated with this tenant
        const userData = await ctx.db.find({
          collection: "users",
          limit: 1,
          where: {
            'tenants.tenant': {
              equals: tenantData.docs[0].id,
            },
          },
        });

        if (!userData.docs[0]) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid credentials",
          });
        }

        loginEmail = userData.docs[0].email;
      }

      const data = await ctx.db.login({
        collection: "users",
        data: {
          email: loginEmail,
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
        rememberMe: input.rememberMe ?? true, // Use user preference or default to persistent session
      });

      return data;
    }),
  logout: baseProcedure.mutation(async ({ ctx }) => {
    await clearAuthCookie(ctx.db.config.cookiePrefix);
    
    return { success: true };
  }),
});
