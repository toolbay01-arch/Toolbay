import { TRPCError } from "@trpc/server";
import { headers as getHeaders } from "next/headers";

import { baseProcedure, createTRPCRouter } from "@/trpc/init";

import { generateAuthCookie, clearAuthCookie } from "../utils";
import { 
  loginSchema, 
  registerSchema, 
  forgotPasswordSchema, 
  resetPasswordSchema, 
  verifyEmailSchema,
  resendVerificationSchema 
} from "../schemas";
import { registerClientSchema } from "../schemas-client";
import { 
  generateToken, 
  getTokenExpiration, 
  sendVerificationEmail, 
  sendPasswordResetEmail 
} from "../email-utils";

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

      // Generate email verification token
      const verificationToken = generateToken();
      const verificationExpires = getTokenExpiration();

      const newUser = await ctx.db.create({
        collection: "users",
        data: {
          email: input.email,
          username: username,
          password: input.password, // This will be hashed
          emailVerified: false,
          verificationToken: verificationToken,
          verificationExpires: verificationExpires.toISOString(),
          tenants: [
            {
              tenant: tenant.id,
            },
          ],
        } as any,
      });

      // Send verification email (don't await to not slow down registration)
      // Add timeout and improved error handling
      const emailPromise = sendVerificationEmail(input.email, verificationToken, username);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Email timeout')), 10000)
      );
      
      Promise.race([emailPromise, timeoutPromise]).catch((error) => {
        console.error("[register] Failed to send verification email:", error);
        console.error("[register] SMTP Config check:", {
          host: process.env.SMTP_HOST || 'NOT SET',
          port: process.env.SMTP_PORT || 'NOT SET',
          user: process.env.SMTP_USER || 'NOT SET',
          pass: process.env.SMTP_PASS ? 'SET' : 'NOT SET',
        });
      });

      // Don't automatically log in - require email verification first
      return {
        user: {
          id: newUser.id,
          email: newUser.email,
          username: username,
        },
        message: "Account created successfully! Please check your email to verify your account before logging in.",
      };
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

      // Generate email verification token
      const verificationToken = generateToken();
      const verificationExpires = getTokenExpiration();

      // Create client user (buyer) - no tenant association needed
      const newUser = await ctx.db.create({
        collection: "users",
        data: {
          email: input.email,
          username: input.username,
          password: input.password,
          roles: ["client"], // Explicitly set client role
          emailVerified: false,
          verificationToken: verificationToken,
          verificationExpires: verificationExpires.toISOString(),
          // Client users don't have tenants
          tenants: [],
        } as any,
      });

      // Send verification email (don't await to not slow down registration)
      // Add timeout and improved error handling
      const emailPromise = sendVerificationEmail(input.email, verificationToken, input.username);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Email timeout')), 10000)
      );
      
      Promise.race([emailPromise, timeoutPromise]).catch((error) => {
        console.error("[registerClient] Failed to send verification email:", error);
        console.error("[registerClient] SMTP Config check:", {
          host: process.env.SMTP_HOST || 'NOT SET',
          port: process.env.SMTP_PORT || 'NOT SET',
          user: process.env.SMTP_USER || 'NOT SET',
          pass: process.env.SMTP_PASS ? 'SET' : 'NOT SET',
        });
      });

      // Don't automatically log in - require email verification first
      return {
        user: {
          id: newUser.id,
          email: newUser.email,
          username: input.username,
        },
        message: "Account created successfully! Please check your email to verify your account before logging in.",
      };
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

      // Check if user's email is verified
      // Get the user data to check verification status
      const userData = await ctx.db.find({
        collection: "users",
        where: {
          email: {
            equals: loginEmail,
          },
        },
        limit: 1,
      });

      const user = userData.docs[0];

      // If emailVerified field exists and is false, prevent login
      if (user && user.emailVerified === false) {
        // Clear any generated cookie
        await clearAuthCookie(ctx.db.config.cookiePrefix);
        
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Please verify your email before logging in. Check your inbox for the verification link.",
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

  /**
   * Verify email with token
   */
  verifyEmail: baseProcedure
    .input(verifyEmailSchema)
    .mutation(async ({ input, ctx }) => {
      // Find user with this verification token
      const users = await ctx.db.find({
        collection: "users",
        where: {
          verificationToken: {
            equals: input.token,
          },
        },
        limit: 1,
      });

      const user = users.docs[0];

      if (!user) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid or expired verification token",
        });
      }

      // Check if token has expired
      if (user.verificationExpires && new Date(user.verificationExpires) < new Date()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Verification token has expired. Please request a new one.",
        });
      }

      // Update user to verified
      await ctx.db.update({
        collection: "users",
        id: user.id,
        data: {
          emailVerified: true,
          verificationToken: null,
          verificationExpires: null,
        } as any,
      });

      return { success: true, message: "Email verified successfully!" };
    }),

  /**
   * Resend verification email
   */
  resendVerification: baseProcedure
    .input(resendVerificationSchema)
    .mutation(async ({ input, ctx }) => {
      const users = await ctx.db.find({
        collection: "users",
        where: {
          email: {
            equals: input.email,
          },
        },
        limit: 1,
      });

      const user = users.docs[0];

      if (!user) {
        // Don't reveal if email exists or not
        return { success: true, message: "If the email exists, a verification link has been sent." };
      }

      if (user.emailVerified) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Email is already verified",
        });
      }

      // Generate new verification token
      const token = generateToken();
      const expires = getTokenExpiration();

      await ctx.db.update({
        collection: "users",
        id: user.id,
        data: {
          verificationToken: token,
          verificationExpires: expires.toISOString(),
        } as any,
      });

      // Send verification email with timeout and error handling
      try {
        const emailPromise = sendVerificationEmail(user.email, token, user.username);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Email timeout')), 10000)
        );
        
        await Promise.race([emailPromise, timeoutPromise]);
        
        return { success: true, message: "Verification email sent!" };
      } catch (error) {
        console.error('[resendVerification] Email send error:', error);
        
        // Check if SMTP is configured
        const smtpConfigured = process.env.SMTP_USER && process.env.SMTP_PASS;
        
        if (!smtpConfigured) {
          console.error('[resendVerification] SMTP not configured. Please set SMTP_USER and SMTP_PASS environment variables.');
          throw new TRPCError({ 
            code: "INTERNAL_SERVER_ERROR", 
            message: "Email service not configured. Please contact support." 
          });
        }
        
        throw new TRPCError({ 
          code: "INTERNAL_SERVER_ERROR", 
          message: "Failed to send verification email. Please try again later or contact support." 
        });
      }
    }),

  /**
   * Request password reset
   */
  forgotPassword: baseProcedure
    .input(forgotPasswordSchema)
    .mutation(async ({ input, ctx }) => {
      const users = await ctx.db.find({
        collection: "users",
        where: {
          email: {
            equals: input.email,
          },
        },
        limit: 1,
      });

      const user = users.docs[0];

      if (!user) {
        // Don't reveal if email exists or not (security best practice)
        return { success: true, message: "If the email exists, a password reset link has been sent." };
      }

      // Generate password reset token
      const token = generateToken();
      const expires = getTokenExpiration();

      await ctx.db.update({
        collection: "users",
        id: user.id,
        data: {
          resetPasswordToken: token,
          resetPasswordExpiration: expires.toISOString(),
        } as any,
      });

      // Send password reset email with timeout and error handling
      try {
        // Add timeout to prevent hanging
        const emailPromise = sendPasswordResetEmail(user.email, token, user.username);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Email timeout')), 10000)
        );
        
        await Promise.race([emailPromise, timeoutPromise]);
        
        return { success: true, message: "Password reset email sent!" };
      } catch (error) {
        // Log error but don't fail the request
        console.error('[forgotPassword] Email send error:', error);
        
        // Check if SMTP is configured
        const smtpConfigured = process.env.SMTP_USER && process.env.SMTP_PASS;
        
        if (!smtpConfigured) {
          console.error('[forgotPassword] SMTP not configured. Please set SMTP_USER and SMTP_PASS environment variables.');
          throw new TRPCError({ 
            code: "INTERNAL_SERVER_ERROR", 
            message: "Email service not configured. Please contact support." 
          });
        }
        
        // Return user-friendly error
        throw new TRPCError({ 
          code: "INTERNAL_SERVER_ERROR", 
          message: "Failed to send password reset email. Please try again later or contact support." 
        });
      }
    }),

  /**
   * Reset password with token
   */
  resetPassword: baseProcedure
    .input(resetPasswordSchema)
    .mutation(async ({ input, ctx }) => {
      // Find user with this reset token
      const users = await ctx.db.find({
        collection: "users",
        where: {
          resetPasswordToken: {
            equals: input.token,
          },
        },
        limit: 1,
      });

      const user = users.docs[0];

      if (!user) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid or expired reset token",
        });
      }

      // Check if token has expired
      if (user.resetPasswordExpiration && new Date(user.resetPasswordExpiration) < new Date()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Reset token has expired. Please request a new one.",
        });
      }

      // Update password and clear reset token
      await ctx.db.update({
        collection: "users",
        id: user.id,
        data: {
          password: input.password, // Will be hashed by Payload
          resetPasswordToken: null,
          resetPasswordExpiration: null,
        } as any,
      });

      return { success: true, message: "Password reset successfully!" };
    }),
});
