# MoMo Transaction ID Based Payment System - Stripe Replacement Plan

## Overview
This document provides a step-by-step plan to remove Stripe and implement a Mobile Money (MoMo) payment system based on transaction ID verification for Rwanda.

## 🎯 **REPLACEMENT STRATEGY**

### **Core Concept**: Transaction ID Verification System
Instead of Stripe's automated payment processing, we'll implement a system where:
1. Customer initiates payment via MoMo
2. Customer provides transaction ID
3. System verifies transaction with MoMo API
4. Order is automatically or manually approved

---

## 📋 **STEP-BY-STEP IMPLEMENTATION PLAN**

### **PHASE 1: DATABASE SCHEMA CHANGES**

#### **Step 1.1: Update Tenants Collection**
```typescript
// src/collections/Tenants.ts

export const Tenants: CollectionConfig = {
  slug: 'tenants',
  fields: [
    // ...existing fields...
    
    // REMOVE these Stripe fields:
    // - stripeAccountId
    // - stripeDetailsSubmitted
    
    // ADD these new fields:
    {
      name: "paymentProvider",
      type: "select",
      options: ["momo", "airtel", "bank_transfer", "manual"],
      defaultValue: "momo",
      required: true,
      label: "Payment Provider",
    },
    {
      name: "momoNumber",
      type: "text",
      label: "Mobile Money Number",
      admin: {
        description: "Your MoMo number for receiving payments",
      },
    },
    {
      name: "bankDetails",
      type: "group",
      label: "Bank Details",
      fields: [
        {
          name: "bankName",
          type: "text",
          label: "Bank Name",
        },
        {
          name: "accountNumber",
          type: "text",
          label: "Account Number",
        },
        {
          name: "accountName",
          type: "text",
          label: "Account Holder Name",
        },
      ],
    },
    {
      name: "isVerified",
      type: "checkbox",
      defaultValue: false,
      label: "Account Verified",
      access: {
        update: ({ req }) => isSuperAdmin(req.user),
      },
      admin: {
        description: "Admin verification status - replaces Stripe verification",
      },
    },
    {
      name: "verificationMethod",
      type: "select",
      options: ["manual", "automatic"],
      defaultValue: "manual",
      access: {
        update: ({ req }) => isSuperAdmin(req.user),
      },
    },
    {
      name: "platformFeeRate",
      type: "number",
      defaultValue: 10,
      min: 0,
      max: 50,
      label: "Platform Fee Rate (%)",
      access: {
        update: ({ req }) => isSuperAdmin(req.user),
      },
      admin: {
        description: "Platform fee percentage for this vendor",
      },
    },
  ],
};
```

#### **Step 1.2: Update Orders Collection**
```typescript
// src/collections/Orders.ts

export const Orders: CollectionConfig = {
  slug: "orders",
  fields: [
    // ...existing fields...
    
    // REMOVE Stripe fields:
    // - stripeCheckoutSessionId
    // - stripeAccountId
    
    // ADD new payment fields:
    {
      name: "paymentMethod",
      type: "select",
      options: ["momo_mtn", "momo_airtel", "bank_transfer", "cash"],
      required: true,
      label: "Payment Method",
    },
    {
      name: "transactionId",
      type: "text",
      required: true,
      label: "Transaction ID",
      admin: {
        description: "MoMo transaction ID or bank reference number",
      },
    },
    {
      name: "paymentStatus",
      type: "select",
      options: ["pending", "verifying", "completed", "failed", "cancelled", "refunded"],
      defaultValue: "pending",
      required: true,
      label: "Payment Status",
    },
    {
      name: "paymentAmount",
      type: "number",
      required: true,
      label: "Payment Amount (RWF)",
    },
    {
      name: "platformFee",
      type: "number",
      label: "Platform Fee (RWF)",
      admin: {
        description: "Calculated platform fee amount",
      },
    },
    {
      name: "vendorAmount",
      type: "number",
      label: "Vendor Amount (RWF)",
      admin: {
        description: "Amount to be paid to vendor after platform fee",
      },
    },
    {
      name: "paymentPhone",
      type: "text",
      label: "Payment Phone Number",
      admin: {
        description: "Phone number used for MoMo payment",
      },
    },
    {
      name: "verificationData",
      type: "json",
      label: "Verification Data",
      admin: {
        description: "API response data from payment verification",
      },
    },
    {
      name: "verifiedAt",
      type: "date",
      label: "Verified Date",
      admin: {
        description: "When the payment was verified",
      },
    },
    {
      name: "verifiedBy",
      type: "relationship",
      relationTo: "users",
      label: "Verified By",
      admin: {
        description: "Admin user who verified the payment",
      },
    },
  ],
};
```

#### **Step 1.3: Update Products Collection Access Control**
```typescript
// src/collections/Products.ts

export const Products: CollectionConfig = {
  slug: "products",
  access: {
    create: ({ req }) => {
      if (isSuperAdmin(req.user)) return true;

      const tenant = req.user?.tenants?.[0]?.tenant as Tenant;
      // CHANGE: from tenant?.stripeDetailsSubmitted to tenant?.isVerified
      return Boolean(tenant?.isVerified);
    },
    // ...other access controls remain the same
  },
  // ...rest of the configuration
};
```

### **PHASE 2: REMOVE STRIPE DEPENDENCIES**

#### **Step 2.1: Remove Stripe Package and Files**
```bash
# Remove Stripe package
bun remove stripe

# Delete Stripe-related files
rm src/lib/stripe.ts
rm -rf src/app/(app)/api/stripe/
rm src/components/stripe-verify.tsx
rm -rf src/app/(app)/(tenants)/stripe-verify/
```

#### **Step 2.2: Update Environment Variables**
```env
# REMOVE these Stripe variables:
# STRIPE_SECRET_KEY=
# STRIPE_WEBHOOK_SECRET=

# ADD MoMo API configuration:
# MTN MoMo API Configuration
MOMO_MTN_API_URL=https://sandbox.momodeveloper.mtn.com
MOMO_MTN_SUBSCRIPTION_KEY=your_mtn_subscription_key
MOMO_MTN_API_USER_ID=your_api_user_id
MOMO_MTN_API_KEY=your_api_key

# Airtel Money API Configuration
MOMO_AIRTEL_API_URL=https://openapi.airtel.africa
MOMO_AIRTEL_CLIENT_ID=your_airtel_client_id
MOMO_AIRTEL_CLIENT_SECRET=your_airtel_client_secret

# Platform Configuration
PLATFORM_DEFAULT_FEE_PERCENTAGE=10
PAYMENT_VERIFICATION_TIMEOUT=300000  # 5 minutes in milliseconds
ADMIN_PHONE_NUMBERS=+250788123456,+250788654321  # For notifications
```

### **PHASE 3: IMPLEMENT MOMO PAYMENT SYSTEM**

#### **Step 3.1: Create Payment Provider Interfaces**
```typescript
// src/lib/payment/types.ts

export interface PaymentVerificationResult {
  success: boolean;
  transactionId: string;
  amount: number;
  currency: string;
  phone: string;
  status: 'pending' | 'completed' | 'failed';
  timestamp: string;
  reference?: string;
  errorMessage?: string;
  rawData?: any;
}

export interface PaymentProvider {
  name: string;
  verifyTransaction(transactionId: string, expectedAmount?: number): Promise<PaymentVerificationResult>;
  generatePaymentInstructions(amount: number, reference: string): PaymentInstructions;
}

export interface PaymentInstructions {
  method: string;
  steps: string[];
  reference: string;
  amount: number;
  currency: string;
  timeout: number; // minutes
}

export interface OrderPaymentData {
  orderId: string;
  totalAmount: number;
  platformFee: number;
  vendorAmount: number;
  currency: string;
  tenantId: string;
  userId: string;
  products: Array<{
    id: string;
    name: string;
    price: number;
  }>;
}
```

#### **Step 3.2: Implement MTN MoMo Provider**
```typescript
// src/lib/payment/providers/mtn-momo.ts

import { PaymentProvider, PaymentVerificationResult, PaymentInstructions } from '../types';

export class MTNMoMoProvider implements PaymentProvider {
  name = 'MTN MoMo';
  private apiUrl = process.env.MOMO_MTN_API_URL!;
  private subscriptionKey = process.env.MOMO_MTN_SUBSCRIPTION_KEY!;
  private apiUserId = process.env.MOMO_MTN_API_USER_ID!;
  private apiKey = process.env.MOMO_MTN_API_KEY!;

  async verifyTransaction(
    transactionId: string, 
    expectedAmount?: number
  ): Promise<PaymentVerificationResult> {
    try {
      // Get access token
      const token = await this.getAccessToken();
      
      // Verify transaction with MTN API
      const response = await fetch(
        `${this.apiUrl}/collection/v1_0/requesttopay/${transactionId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Reference-Id': transactionId,
            'Ocp-Apim-Subscription-Key': this.subscriptionKey,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          transactionId,
          amount: 0,
          currency: 'RWF',
          phone: '',
          status: 'failed',
          timestamp: new Date().toISOString(),
          errorMessage: data.message || 'Transaction verification failed',
          rawData: data,
        };
      }

      // Validate amount if provided
      const amountMatches = !expectedAmount || 
        parseFloat(data.amount) === expectedAmount;

      return {
        success: data.status === 'SUCCESSFUL' && amountMatches,
        transactionId: data.financialTransactionId || transactionId,
        amount: parseFloat(data.amount),
        currency: data.currency,
        phone: data.payer?.partyId || '',
        status: this.mapMTNStatus(data.status),
        timestamp: data.createdAt || new Date().toISOString(),
        reference: data.externalId,
        rawData: data,
      };
    } catch (error) {
      return {
        success: false,
        transactionId,
        amount: 0,
        currency: 'RWF',
        phone: '',
        status: 'failed',
        timestamp: new Date().toISOString(),
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  generatePaymentInstructions(amount: number, reference: string): PaymentInstructions {
    return {
      method: 'MTN Mobile Money',
      steps: [
        'Dial *182# on your MTN phone',
        'Select option 1 (Send Money)',
        'Select option 4 (Pay Bill)',
        `Enter merchant code: [TO_BE_CONFIGURED]`,
        `Enter reference: ${reference}`,
        `Enter amount: ${amount} RWF`,
        'Enter your PIN to confirm',
        'Save the transaction ID from the confirmation SMS',
        'Return here and enter the transaction ID to complete your order',
      ],
      reference,
      amount,
      currency: 'RWF',
      timeout: 15, // 15 minutes to complete payment
    };
  }

  private async getAccessToken(): Promise<string> {
    const response = await fetch(`${this.apiUrl}/collection/token/`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': this.subscriptionKey,
        'Authorization': `Basic ${Buffer.from(`${this.apiUserId}:${this.apiKey}`).toString('base64')}`,
      },
    });

    const data = await response.json();
    return data.access_token;
  }

  private mapMTNStatus(mtnStatus: string): 'pending' | 'completed' | 'failed' {
    switch (mtnStatus) {
      case 'SUCCESSFUL':
        return 'completed';
      case 'PENDING':
        return 'pending';
      case 'FAILED':
      case 'REJECTED':
        return 'failed';
      default:
        return 'pending';
    }
  }
}
```

#### **Step 3.3: Implement Airtel Money Provider**
```typescript
// src/lib/payment/providers/airtel-money.ts

import { PaymentProvider, PaymentVerificationResult, PaymentInstructions } from '../types';

export class AirtelMoneyProvider implements PaymentProvider {
  name = 'Airtel Money';
  private apiUrl = process.env.MOMO_AIRTEL_API_URL!;
  private clientId = process.env.MOMO_AIRTEL_CLIENT_ID!;
  private clientSecret = process.env.MOMO_AIRTEL_CLIENT_SECRET!;

  async verifyTransaction(
    transactionId: string,
    expectedAmount?: number
  ): Promise<PaymentVerificationResult> {
    try {
      // Get access token
      const token = await this.getAccessToken();
      
      // Verify transaction with Airtel API
      const response = await fetch(
        `${this.apiUrl}/merchant/v1/payments/${transactionId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          transactionId,
          amount: 0,
          currency: 'RWF',
          phone: '',
          status: 'failed',
          timestamp: new Date().toISOString(),
          errorMessage: data.message || 'Transaction verification failed',
          rawData: data,
        };
      }

      const amountMatches = !expectedAmount || 
        parseFloat(data.transaction.amount) === expectedAmount;

      return {
        success: data.transaction.status === 'success' && amountMatches,
        transactionId: data.transaction.id,
        amount: parseFloat(data.transaction.amount),
        currency: data.transaction.currency,
        phone: data.transaction.msisdn,
        status: this.mapAirtelStatus(data.transaction.status),
        timestamp: data.transaction.created_at,
        reference: data.transaction.reference,
        rawData: data,
      };
    } catch (error) {
      return {
        success: false,
        transactionId,
        amount: 0,
        currency: 'RWF',
        phone: '',
        status: 'failed',
        timestamp: new Date().toISOString(),
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  generatePaymentInstructions(amount: number, reference: string): PaymentInstructions {
    return {
      method: 'Airtel Money',
      steps: [
        'Dial *175# on your Airtel phone',
        'Select option 5 (Pay Bill)',
        'Select option 1 (Enter Business Number)',
        `Enter business number: [TO_BE_CONFIGURED]`,
        `Enter reference: ${reference}`,
        `Enter amount: ${amount} RWF`,
        'Enter your PIN to confirm',
        'Save the transaction ID from the confirmation SMS',
        'Return here and enter the transaction ID to complete your order',
      ],
      reference,
      amount,
      currency: 'RWF',
      timeout: 15,
    };
  }

  private async getAccessToken(): Promise<string> {
    const response = await fetch(`${this.apiUrl}/auth/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'client_credentials',
      }),
    });

    const data = await response.json();
    return data.access_token;
  }

  private mapAirtelStatus(airtelStatus: string): 'pending' | 'completed' | 'failed' {
    switch (airtelStatus.toLowerCase()) {
      case 'success':
        return 'completed';
      case 'pending':
        return 'pending';
      case 'failed':
      case 'rejected':
        return 'failed';
      default:
        return 'pending';
    }
  }
}
```

#### **Step 3.4: Create Payment Service**
```typescript
// src/lib/payment/payment-service.ts

import { MTNMoMoProvider } from './providers/mtn-momo';
import { AirtelMoneyProvider } from './providers/airtel-money';
import { PaymentProvider, PaymentVerificationResult, OrderPaymentData } from './types';

export class PaymentService {
  private providers: Map<string, PaymentProvider> = new Map();

  constructor() {
    this.providers.set('momo_mtn', new MTNMoMoProvider());
    this.providers.set('momo_airtel', new AirtelMoneyProvider());
  }

  getProvider(paymentMethod: string): PaymentProvider | null {
    return this.providers.get(paymentMethod) || null;
  }

  async verifyTransaction(
    paymentMethod: string,
    transactionId: string,
    expectedAmount?: number
  ): Promise<PaymentVerificationResult> {
    const provider = this.getProvider(paymentMethod);
    
    if (!provider) {
      return {
        success: false,
        transactionId,
        amount: 0,
        currency: 'RWF',
        phone: '',
        status: 'failed',
        timestamp: new Date().toISOString(),
        errorMessage: `Unsupported payment method: ${paymentMethod}`,
      };
    }

    return provider.verifyTransaction(transactionId, expectedAmount);
  }

  calculateFees(amount: number, feePercentage: number = 10) {
    const platformFee = Math.round(amount * (feePercentage / 100));
    const vendorAmount = amount - platformFee;
    
    return {
      totalAmount: amount,
      platformFee,
      vendorAmount,
      feePercentage,
    };
  }

  generateOrderReference(orderId: string): string {
    // Generate a short, memorable reference for payments
    const timestamp = Date.now().toString().slice(-6);
    const orderSuffix = orderId.slice(-4);
    return `ORD${timestamp}${orderSuffix}`.toUpperCase();
  }
}

export const paymentService = new PaymentService();
```

### **PHASE 4: UPDATE API ENDPOINTS**

#### **Step 4.1: Update User Registration**
```typescript
// src/modules/auth/server/procedures.ts

register: baseProcedure
  .input(registerSchema)
  .mutation(async ({ input, ctx }) => {
    // Check username availability
    const existingData = await ctx.db.find({
      collection: "users",
      limit: 1,
      where: { username: { equals: input.username } },
    });

    if (existingData.docs[0]) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Username already taken",
      });
    }

    // REMOVE: Stripe account creation
    // const account = await stripe.accounts.create({});

    // Create tenant without Stripe dependency
    const tenant = await ctx.db.create({
      collection: "tenants",
      data: {
        name: input.username,
        slug: input.username,
        paymentProvider: "momo", // Default to MoMo
        isVerified: false, // Requires manual verification
        verificationMethod: "manual",
        platformFeeRate: 10, // Default 10% platform fee
      }
    });

    // Create user
    await ctx.db.create({
      collection: "users",
      data: {
        email: input.email,
        username: input.username,
        password: input.password,
        tenants: [{ tenant: tenant.id }],
      },
    });

    // Login user
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
  }),
```

#### **Step 4.2: Create New Checkout Procedures**
```typescript
// src/modules/checkout/server/procedures.ts

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { paymentService } from "@/lib/payment/payment-service";
import { baseProcedure, createTRPCRouter, protectedProcedure } from "@/trpc/init";

export const checkoutRouter = createTRPCRouter({
  // REMOVE: verify procedure (Stripe-specific)
  
  initiatePayment: protectedProcedure
    .input(
      z.object({
        productIds: z.array(z.string()).min(1),
        tenantSlug: z.string().min(1),
        paymentMethod: z.enum(["momo_mtn", "momo_airtel", "bank_transfer"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get products
      const products = await ctx.db.find({
        collection: "products",
        depth: 2,
        where: {
          and: [
            { id: { in: input.productIds } },
            { "tenant.slug": { equals: input.tenantSlug } },
            { isArchived: { not_equals: true } },
          ]
        }
      });

      if (products.totalDocs !== input.productIds.length) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Products not found" });
      }

      // Get tenant
      const tenantsData = await ctx.db.find({
        collection: "tenants",
        limit: 1,
        where: { slug: { equals: input.tenantSlug } },
      });

      const tenant = tenantsData.docs[0];
      if (!tenant) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Tenant not found" });
      }

      // Check if tenant is verified
      if (!tenant.isVerified) {
        throw new TRPCError({ 
          code: "BAD_REQUEST", 
          message: "Store verification required. Contact the store owner." 
        });
      }

      // Calculate totals
      const totalAmount = products.docs.reduce((acc, product) => acc + product.price, 0);
      const fees = paymentService.calculateFees(totalAmount, tenant.platformFeeRate);

      // Create pending order
      const order = await ctx.db.create({
        collection: "orders",
        data: {
          user: ctx.session.user.id,
          name: `Order for ${products.docs.map(p => p.name).join(', ')}`,
          paymentMethod: input.paymentMethod,
          paymentStatus: "pending",
          paymentAmount: fees.totalAmount,
          platformFee: fees.platformFee,
          vendorAmount: fees.vendorAmount,
          transactionId: "", // Will be updated when user submits transaction ID
        },
      });

      // Create order items (if you have an order items collection)
      for (const product of products.docs) {
        await ctx.db.create({
          collection: "orders",
          data: {
            user: ctx.session.user.id,
            product: product.id,
            name: product.name,
            paymentMethod: input.paymentMethod,
            paymentStatus: "pending",
            paymentAmount: product.price,
            platformFee: Math.round(product.price * (tenant.platformFeeRate / 100)),
            vendorAmount: product.price - Math.round(product.price * (tenant.platformFeeRate / 100)),
            transactionId: "",
          },
        });
      }

      // Generate payment reference
      const reference = paymentService.generateOrderReference(order.id);

      // Get payment instructions
      const provider = paymentService.getProvider(input.paymentMethod);
      const instructions = provider?.generatePaymentInstructions(fees.totalAmount, reference);

      return {
        orderId: order.id,
        reference,
        totalAmount: fees.totalAmount,
        platformFee: fees.platformFee,
        vendorAmount: fees.vendorAmount,
        paymentInstructions: instructions,
        paymentMethod: input.paymentMethod,
      };
    }),

  submitTransactionId: protectedProcedure
    .input(
      z.object({
        orderId: z.string(),
        transactionId: z.string().min(1),
        phoneNumber: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get order
      const order = await ctx.db.findByID({
        collection: "orders",
        id: input.orderId,
      });

      if (!order) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      }

      if (order.user !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      if (order.paymentStatus !== "pending") {
        throw new TRPCError({ 
          code: "BAD_REQUEST", 
          message: "Order payment is already processed" 
        });
      }

      // Update order with transaction ID
      await ctx.db.update({
        collection: "orders",
        id: input.orderId,
        data: {
          transactionId: input.transactionId,
          paymentPhone: input.phoneNumber,
          paymentStatus: "verifying",
        },
      });

      // Start verification process (can be async)
      // For now, we'll trigger manual verification
      // In production, you might want to verify immediately or queue for verification

      return {
        success: true,
        message: "Transaction ID submitted. Payment verification is in progress.",
        orderId: input.orderId,
        status: "verifying",
      };
    }),

  verifyPayment: protectedProcedure
    .input(
      z.object({
        orderId: z.string(),
        manualApproval: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Only super admins can verify payments
      if (!isSuperAdmin(ctx.session.user)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      const order = await ctx.db.findByID({
        collection: "orders",
        id: input.orderId,
      });

      if (!order) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      }

      let verificationResult;

      if (input.manualApproval) {
        // Manual approval by admin
        verificationResult = {
          success: true,
          transactionId: order.transactionId,
          amount: order.paymentAmount,
          currency: 'RWF',
          phone: order.paymentPhone || '',
          status: 'completed' as const,
          timestamp: new Date().toISOString(),
        };
      } else {
        // Automatic verification via API
        verificationResult = await paymentService.verifyTransaction(
          order.paymentMethod,
          order.transactionId,
          order.paymentAmount
        );
      }

      // Update order based on verification result
      const updateData: any = {
        paymentStatus: verificationResult.success ? "completed" : "failed",
        verificationData: verificationResult.rawData,
        verifiedAt: new Date(),
        verifiedBy: ctx.session.user.id,
      };

      if (verificationResult.success) {
        updateData.paymentPhone = verificationResult.phone;
      }

      await ctx.db.update({
        collection: "orders",
        id: input.orderId,
        data: updateData,
      });

      return {
        success: verificationResult.success,
        message: verificationResult.success 
          ? "Payment verified successfully" 
          : `Payment verification failed: ${verificationResult.errorMessage}`,
        verificationResult,
      };
    }),

  getPaymentStatus: protectedProcedure
    .input(z.object({ orderId: z.string() }))
    .query(async ({ ctx, input }) => {
      const order = await ctx.db.findByID({
        collection: "orders",
        id: input.orderId,
        depth: 2,
      });

      if (!order) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      }

      // Check if user has access to this order
      if (order.user !== ctx.session.user.id && !isSuperAdmin(ctx.session.user)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      return {
        orderId: order.id,
        status: order.paymentStatus,
        transactionId: order.transactionId,
        amount: order.paymentAmount,
        platformFee: order.platformFee,
        vendorAmount: order.vendorAmount,
        paymentMethod: order.paymentMethod,
        verifiedAt: order.verifiedAt,
        createdAt: order.createdAt,
      };
    }),

  // Keep existing getProducts procedure
  getProducts: baseProcedure
    .input(z.object({ ids: z.array(z.string()) }))
    .query(async ({ ctx, input }) => {
      // ...existing implementation without changes
    }),
});
```

### **PHASE 5: UPDATE UI COMPONENTS**

#### **Step 5.1: Create Payment Method Selection**
```typescript
// src/modules/checkout/ui/components/payment-method-selector.tsx

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface PaymentMethodSelectorProps {
  onSelect: (method: string) => void;
  selectedMethod?: string;
}

export const PaymentMethodSelector = ({ onSelect, selectedMethod }: PaymentMethodSelectorProps) => {
  const [selected, setSelected] = useState(selectedMethod || "momo_mtn");

  const paymentMethods = [
    {
      id: "momo_mtn",
      name: "MTN Mobile Money",
      description: "Pay using MTN MoMo",
      icon: "📱",
      available: true,
    },
    {
      id: "momo_airtel",
      name: "Airtel Money",
      description: "Pay using Airtel Money",
      icon: "📱",
      available: true,
    },
    {
      id: "bank_transfer",
      name: "Bank Transfer",
      description: "Transfer to bank account",
      icon: "🏦",
      available: false, // Can be enabled later
    },
  ];

  const handleSelect = () => {
    onSelect(selected);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Select Payment Method</CardTitle>
        <CardDescription>Choose how you want to pay for your order</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <RadioGroup value={selected} onValueChange={setSelected}>
          {paymentMethods.map((method) => (
            <div key={method.id} className="flex items-center space-x-2">
              <RadioGroupItem
                value={method.id}
                id={method.id}
                disabled={!method.available}
              />
              <Label
                htmlFor={method.id}
                className={`flex items-center space-x-3 cursor-pointer ${
                  !method.available ? "opacity-50" : ""
                }`}
              >
                <span className="text-2xl">{method.icon}</span>
                <div>
                  <div className="font-medium">{method.name}</div>
                  <div className="text-sm text-muted-foreground">{method.description}</div>
                </div>
              </Label>
            </div>
          ))}
        </RadioGroup>
        <Button onClick={handleSelect} className="w-full">
          Continue with {paymentMethods.find(m => m.id === selected)?.name}
        </Button>
      </CardContent>
    </Card>
  );
};
```

#### **Step 5.2: Create Payment Instructions Component**
```typescript
// src/modules/checkout/ui/components/payment-instructions.tsx

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Copy, CheckCircle } from "lucide-react";

interface PaymentInstructionsProps {
  instructions: {
    method: string;
    steps: string[];
    reference: string;
    amount: number;
    currency: string;
    timeout: number;
  };
  orderId: string;
  onTransactionSubmit: (transactionId: string, phone?: string) => void;
  isSubmitting?: boolean;
}

export const PaymentInstructions = ({
  instructions,
  orderId,
  onTransactionSubmit,
  isSubmitting = false,
}: PaymentInstructionsProps) => {
  const [transactionId, setTransactionId] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [copied, setCopied] = useState(false);

  const copyReference = async () => {
    await navigator.clipboard.writeText(instructions.reference);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = () => {
    if (transactionId.trim()) {
      onTransactionSubmit(transactionId.trim(), phoneNumber.trim() || undefined);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>📱</span>
            <span>{instructions.method} Payment</span>
          </CardTitle>
          <CardDescription>
            Follow these steps to complete your payment of {instructions.amount} {instructions.currency}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Amount to Pay</Label>
              <div className="text-2xl font-bold text-green-600">
                {instructions.amount} {instructions.currency}
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">Reference Number</Label>
              <div className="flex items-center space-x-2">
                <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                  {instructions.reference}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyReference}
                  className="p-2"
                >
                  {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>

          <Alert>
            <AlertDescription>
              You have {instructions.timeout} minutes to complete this payment.
            </AlertDescription>
          </Alert>

          <div>
            <Label className="text-sm font-medium mb-2 block">Payment Steps:</Label>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              {instructions.steps.map((step, index) => (
                <li key={index} className="text-muted-foreground">
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Submit Transaction Details</CardTitle>
          <CardDescription>
            After completing the payment, enter your transaction ID here
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="transactionId">Transaction ID *</Label>
            <Input
              id="transactionId"
              placeholder="Enter the transaction ID from your confirmation SMS"
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="phoneNumber">Phone Number Used (Optional)</Label>
            <Input
              id="phoneNumber"
              placeholder="+250788123456"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
          </div>
          <Button
            onClick={handleSubmit}
            disabled={!transactionId.trim() || isSubmitting}
            className="w-full"
          >
            {isSubmitting ? "Submitting..." : "Submit Transaction ID"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
```

#### **Step 5.3: Create Payment Status Component**
```typescript
// src/modules/checkout/ui/components/payment-status.tsx

"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, XCircle, AlertCircle } from "lucide-react";
import { useTRPC } from "@/trpc/client";

interface PaymentStatusProps {
  orderId: string;
  onRetry?: () => void;
}

export const PaymentStatus = ({ orderId, onRetry }: PaymentStatusProps) => {
  const trpc = useTRPC();
  
  const { data: payment, isLoading, refetch } = useQuery(
    trpc.checkout.getPaymentStatus.queryOptions({ orderId })
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </CardContent>
      </Card>
    );
  }

  if (!payment) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="text-center text-muted-foreground">
            Payment information not found
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusIcon = () => {
    switch (payment.status) {
      case "completed":
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case "pending":
        return <Clock className="h-6 w-6 text-yellow-500" />;
      case "verifying":
        return <AlertCircle className="h-6 w-6 text-blue-500" />;
      case "failed":
        return <XCircle className="h-6 w-6 text-red-500" />;
      default:
        return <Clock className="h-6 w-6 text-gray-500" />;
    }
  };

  const getStatusColor = () => {
    switch (payment.status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "verifying":
        return "bg-blue-100 text-blue-800";
      case "failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusMessage = () => {
    switch (payment.status) {
      case "completed":
        return "Payment completed successfully! You can now access your purchased content.";
      case "pending":
        return "Waiting for transaction ID submission.";
      case "verifying":
        return "Payment verification in progress. This usually takes a few minutes.";
      case "failed":
        return "Payment verification failed. Please contact support or try again.";
      default:
        return "Payment status unknown.";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          {getStatusIcon()}
          <span>Payment Status</span>
        </CardTitle>
        <CardDescription>Order ID: {payment.orderId}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Status:</span>
          <Badge className={getStatusColor()}>
            {payment.status.toUpperCase()}
          </Badge>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Amount:</span>
          <span className="font-semibold">{payment.amount} RWF</span>
        </div>

        {payment.transactionId && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Transaction ID:</span>
            <code className="text-xs bg-muted px-2 py-1 rounded">
              {payment.transactionId}
            </code>
          </div>
        )}

        <div className="text-sm text-muted-foreground bg-muted p-3 rounded">
          {getStatusMessage()}
        </div>

        {payment.status === "verifying" && (
          <Button
            variant="outline"
            onClick={() => refetch()}
            className="w-full"
          >
            Refresh Status
          </Button>
        )}

        {payment.status === "failed" && onRetry && (
          <Button onClick={onRetry} className="w-full">
            Try Again
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
```

### **PHASE 6: UPDATE ADMIN INTERFACE**

#### **Step 6.1: Create Verification Management Component**
```typescript
// src/modules/admin/ui/verification-management.tsx

"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTRPC } from "@/trpc/client";
import { CheckCircle, XCircle, Clock, Search } from "lucide-react";

export const VerificationManagement = () => {
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  // Query for pending payments (you'll need to implement this)
  const { data: pendingPayments, isLoading } = useQuery(
    trpc.admin.getPendingPayments.queryOptions({
      status: statusFilter === "all" ? undefined : statusFilter,
      search: searchTerm || undefined,
    })
  );

  const verifyPayment = useMutation(trpc.checkout.verifyPayment.mutationOptions({
    onSuccess: () => {
      queryClient.invalidateQueries(trpc.admin.getPendingPayments.queryFilter());
    },
  }));

  const approveVendor = useMutation(trpc.admin.approveVendor.mutationOptions({
    onSuccess: () => {
      queryClient.invalidateQueries(trpc.admin.getPendingVendors.queryFilter());
    },
  }));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Payment Verification</CardTitle>
          <CardDescription>
            Manage payment verifications and vendor approvals
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4 mb-4">
            <div className="flex-1">
              <Input
                placeholder="Search by transaction ID, phone number, or user..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="verifying">Verifying</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="text-center py-4">Loading...</div>
          ) : (
            <div className="space-y-4">
              {pendingPayments?.map((payment) => (
                <Card key={payment.id} className="border-l-4 border-l-blue-500">
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <div className="font-medium">Order #{payment.orderId.slice(-8)}</div>
                        <div className="text-sm text-muted-foreground">
                          {payment.user.email}
                        </div>
                      </div>
                      <div>
                        <div className="font-medium">{payment.amount} RWF</div>
                        <div className="text-sm text-muted-foreground">
                          Transaction: {payment.transactionId}
                        </div>
                      </div>
                      <div>
                        <Badge 
                          className={
                            payment.status === "verifying" 
                              ? "bg-blue-100 text-blue-800" 
                              : "bg-yellow-100 text-yellow-800"
                          }
                        >
                          {payment.status.toUpperCase()}
                        </Badge>
                        <div className="text-sm text-muted-foreground">
                          {payment.paymentMethod.replace("_", " ").toUpperCase()}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          onClick={() => verifyPayment.mutate({ 
                            orderId: payment.orderId,
                            manualApproval: false 
                          })}
                          disabled={verifyPayment.isPending}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Auto Verify
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => verifyPayment.mutate({ 
                            orderId: payment.orderId,
                            manualApproval: true 
                          })}
                          disabled={verifyPayment.isPending}
                        >
                          Manual Approve
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
```

#### **Step 6.2: Replace Stripe Verification Component**
```typescript
// src/components/verification-status.tsx

"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, AlertTriangle } from "lucide-react";

interface VerificationStatusProps {
  tenant: {
    isVerified: boolean;
    verificationMethod: string;
    paymentProvider: string;
    momoNumber?: string;
  };
}

export const VerificationStatus = ({ tenant }: VerificationStatusProps) => {
  if (tenant.isVerified) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-green-800">
            <CheckCircle className="h-5 w-5" />
            <span>Account Verified</span>
          </CardTitle>
          <CardDescription className="text-green-700">
            Your account is verified and you can start selling products.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-green-700">
            <div>Payment Provider: <strong>{tenant.paymentProvider.toUpperCase()}</strong></div>
            {tenant.momoNumber && (
              <div>MoMo Number: <strong>{tenant.momoNumber}</strong></div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-yellow-200 bg-yellow-50">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-yellow-800">
          <AlertTriangle className="h-5 w-5" />
          <span>Verification Required</span>
        </CardTitle>
        <CardDescription className="text-yellow-700">
          You need to complete account verification before you can create products.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertDescription>
            Contact the administrator to verify your account and set up your payment details.
            You'll need to provide:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Valid identification documents</li>
              <li>Mobile Money account details</li>
              <li>Business registration (if applicable)</li>
            </ul>
          </AlertDescription>
        </Alert>
        
        <div className="flex space-x-2">
          <Button variant="outline" asChild>
            <a href="mailto:admin@yourplatform.com?subject=Account Verification Request">
              Contact Admin
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href="https://wa.me/250788123456?text=Hi, I need help with account verification">
              WhatsApp Support
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
```

### **PHASE 7: UPDATE PAYLOAD CMS CONFIGURATION**

#### **Step 7.1: Remove Stripe Verification from Admin**
```typescript
// src/payload.config.ts

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    // REMOVE: Stripe verification component
    // components: {
    //   beforeNavLinks: ["@/components/stripe-verify#StripeVerify"]
    // }
  },
  // ...rest of configuration
});
```

#### **Step 7.2: Update Collections**
Apply all the database schema changes from Phase 1 to the actual collection files.

### **PHASE 8: TESTING & DEPLOYMENT**

#### **Step 8.1: Local Testing Checklist**
```bash
# 1. Remove old Stripe data
bun run db:fresh

# 2. Seed new data
bun run db:seed

# 3. Test user registration
# 4. Test vendor verification (manual)
# 5. Test product creation
# 6. Test payment flow
# 7. Test transaction verification
# 8. Test admin approval
```

#### **Step 8.2: Production Deployment Steps**
1. **Backup current database**
2. **Deploy code changes**
3. **Run database migrations**
4. **Update environment variables**
5. **Configure MoMo API credentials**
6. **Train admin staff on new verification process**
7. **Update user documentation**

---

## 🚀 **IMPLEMENTATION TIMELINE**

| Phase | Duration | Priority | Dependencies |
|-------|----------|----------|--------------|
| Phase 1 | 1-2 days | Critical | Database access |
| Phase 2 | 1 day | Critical | Phase 1 complete |
| Phase 3 | 3-4 days | Critical | MoMo API credentials |
| Phase 4 | 2-3 days | High | Phase 3 complete |
| Phase 5 | 2-3 days | High | Phase 4 complete |
| Phase 6 | 1-2 days | Medium | Admin training |
| Phase 7 | 1 day | Low | All phases complete |
| Phase 8 | 2-3 days | Critical | Testing environment |

**Total Estimated Time: 2-3 weeks**

---

## 📋 **SUCCESS CRITERIA**

### **✅ Must Have**
- [ ] Users can register without Stripe dependency
- [ ] Vendors can be manually verified by admins
- [ ] Products can be created after verification
- [ ] Customers can initiate MoMo payments
- [ ] Transaction IDs can be submitted and verified
- [ ] Orders are created upon payment verification
- [ ] Platform fees are calculated correctly

### **🎯 Should Have**
- [ ] Automatic transaction verification via MoMo API
- [ ] Real-time payment status updates
- [ ] Admin dashboard for payment management
- [ ] SMS/email notifications for payment status
- [ ] Multiple payment provider support

### **🌟 Nice to Have**
- [ ] Automated vendor verification
- [ ] Payment analytics dashboard
- [ ] Refund management system
- [ ] Integration with accounting systems

---

## ⚠️ **RISK MITIGATION**

1. **Data Loss Prevention**
   - Backup all data before migration
   - Test migration on staging environment
   - Keep rollback plan ready

2. **Payment Security**
   - Implement proper transaction verification
   - Add fraud detection mechanisms
   - Secure API credential storage

3. **User Experience**
   - Provide clear payment instructions
   - Implement proper error handling
   - Add customer support channels

4. **Business Continuity**
   - Train admin staff on new processes
   - Create operational procedures
   - Monitor system performance

This plan provides a complete roadmap for replacing Stripe with a MoMo-based payment system that works with transaction ID verification, perfect for the Rwandan market!
