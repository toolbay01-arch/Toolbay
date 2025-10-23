# MoMo Payment System - Implementation Analysis & Plan

## 🎯 System Overview

You want to implement a **manual Mobile Money (MoMo) payment verification system** for Rwanda that works with MTN Mobile Money using the dial code system.

## 📋 Current System Analysis

### Existing Structure

**Collections:**
- **Users**: Basic auth with tenants relationship
- **Tenants**: Stores with payment fields (`paymentMethod`, `momoPayCode`, `bankName`, etc.)
- **Orders**: Currently creates orders immediately on checkout with transaction ID
- **Products**: Standard product catalog

**Current Flow (Problematic):**
```
Customer → Checkout → Submit Transaction ID → Order Created Immediately ❌
```

**Issues:**
- No transaction pending state
- No admin verification step
- No payment reference generation
- Orders created before payment verification

---

## ✅ Required System Design

### Payment Flow Diagram

```
┌──────────────────────────────────────────────────────────┐
│ ADMIN CONFIGURES (in Tenant admin panel):               │
│ • momoCode: TENANT1 (unique code for this store)        │
│ • momoAccountName: "My Business Name"                   │
└────────────────────┬─────────────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────────────┐
│ 1. CUSTOMER: Add to cart → Click "Checkout"              │
│    → Cart total calculated (e.g., 25,000 RWF)            │
│    → tRPC: checkout.initiatePayment()                    │
└────────────────────┬─────────────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────────────┐
│ 2. SYSTEM: Create Transaction (status: pending)          │
│    • totalAmount: 25,000 RWF (cart total)               │
│    • Auto-generate paymentReference: PAY1AB2C3D4E        │
│    • Set expiresAt: +48 hours                            │
│    • Fetch tenant's momoCode from database               │
└────────────────────┬─────────────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────────────┐
│ 3. SHOW CUSTOMER:                                         │
│    ┌──────────────────────────────────────┐              │
│    │ 📱 Dial: *182*8*1*TENANT1*25000#    │              │
│    │         (MOMO CODE)  (TOTAL AMOUNT)  │              │
│    │ 💰 Amount: 25,000 RWF               │              │
│    │ 🔑 Reference: PAY1AB2C3D4E          │              │
│    │                                      │              │
│    │ After payment, enter your           │              │
│    │ MTN Transaction ID from SMS         │              │
│    └──────────────────────────────────────┘              │
└────────────────────┬─────────────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────────────┐
│ 4. CUSTOMER: Dial *182*8*1*TENANT1# on MTN phone        │
│    → Enter PIN → Confirm payment                         │
│    → Receive SMS: "Transaction ID: MP241021.1234.A56789" │
└────────────────────┬─────────────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────────────┐
│ 5. CUSTOMER: Enter Transaction ID on website             │
│    → tRPC: transactions.submitTransactionId()            │
│    → Status changes: "awaiting_verification"             │
└────────────────────┬─────────────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────────────┐
│ 6. TENANT/ADMIN: Open /admin/verify-payments             │
│    → See: Customer Name, Transaction ID, Amount          │
│    → Open MTN SMS on phone (external verification)       │
│    → Verify transaction exists + amount matches          │
└────────────────────┬─────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
┌─────────────────┐      ┌─────────────────┐
│ 7A. VERIFY ✅   │      │ 7B. REJECT ❌   │
│                 │      │                 │
│ • Confirm TX ID │      │ • Enter reason  │
│ • Create Order  │      │ • Update status │
│ • Status: paid  │      │ • Send email    │
│ • Update tenant │      │                 │
│   revenue       │      │ Customer must   │
│ • Send email    │      │ repay           │
└─────────────────┘      └─────────────────┘
```

---

## 🗄️ Database Schema Changes

### NEW: Transactions Collection

```typescript
export const Transactions: CollectionConfig = {
  slug: 'transactions',
  access: {
    read: ({ req }) => {
      if (isSuperAdmin(req.user)) return true;
      
      // Tenants can read their transactions
      if (req.user?.tenants) {
        return {
          'tenant.id': {
            in: req.user.tenants.map(t => 
              typeof t.tenant === 'string' ? t.tenant : t.tenant.id
            ),
          },
        };
      }
      
      // Customers can read their own transactions
      return {
        customer: {
          equals: req.user?.id,
        },
      };
    },
    create: () => true, // Created by checkout system
    update: ({ req }) => {
      // Only admins and tenant owners can update
      return isSuperAdmin(req.user) || req.user?.tenants?.length > 0;
    },
  },
  fields: [
    {
      name: 'paymentReference',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: {
        description: 'Auto-generated payment reference (e.g., PAY1AB2C3D4E)',
        readOnly: true,
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Awaiting Verification', value: 'awaiting_verification' },
        { label: 'Verified', value: 'verified' },
        { label: 'Rejected', value: 'rejected' },
        { label: 'Expired', value: 'expired' },
      ],
      index: true,
    },
    {
      name: 'customer',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
    },
    {
      name: 'customerName',
      type: 'text',
      required: true,
    },
    {
      name: 'customerEmail',
      type: 'email',
      required: true,
    },
    {
      name: 'customerPhone',
      type: 'text',
      admin: {
        description: 'Phone number used for payment',
      },
    },
    {
      name: 'tenant',
      type: 'relationship',
      relationTo: 'tenants',
      required: true,
      index: true,
    },
    {
      name: 'products',
      type: 'array',
      required: true,
      fields: [
        {
          name: 'product',
          type: 'relationship',
          relationTo: 'products',
          required: true,
        },
        {
          name: 'price',
          type: 'number',
          required: true,
        },
      ],
    },
    {
      name: 'totalAmount',
      type: 'number',
      required: true,
      admin: {
        description: 'Total amount in RWF',
      },
    },
    {
      name: 'platformFee',
      type: 'number',
      required: true,
      admin: {
        description: 'Platform fee (10% of total)',
      },
    },
    {
      name: 'tenantAmount',
      type: 'number',
      required: true,
      admin: {
        description: 'Amount for tenant after platform fee',
      },
    },
    {
      name: 'mtnTransactionId',
      type: 'text',
      index: true,
      admin: {
        description: 'MTN Mobile Money Transaction ID (from customer SMS)',
      },
    },
    {
      name: 'expiresAt',
      type: 'date',
      required: true,
      index: true,
      admin: {
        description: 'Transaction expires after 48 hours',
      },
    },
    {
      name: 'verifiedAt',
      type: 'date',
      admin: {
        description: 'When the payment was verified',
      },
    },
    {
      name: 'verifiedBy',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        description: 'Admin/Tenant who verified the payment',
      },
    },
    {
      name: 'rejectionReason',
      type: 'textarea',
      admin: {
        condition: (data) => data.status === 'rejected',
        description: 'Reason for rejection',
      },
    },
    {
      name: 'order',
      type: 'relationship',
      relationTo: 'orders',
      admin: {
        description: 'Created order after verification',
        readOnly: true,
      },
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, operation }) => {
        if (operation === 'create') {
          // Generate payment reference
          data.paymentReference = generatePaymentReference();
          
          // Set expiry (48 hours)
          const expiryDate = new Date();
          expiryDate.setHours(expiryDate.getHours() + 48);
          data.expiresAt = expiryDate;
          
          // Calculate fees
          data.platformFee = Math.round(data.totalAmount * 0.1);
          data.tenantAmount = data.totalAmount - data.platformFee;
        }
        return data;
      },
    ],
  },
};

// Helper function to generate payment reference
function generatePaymentReference(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let reference = 'PAY';
  for (let i = 0; i < 10; i++) {
    reference += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return reference;
}
```

### UPDATE: Tenants Collection

Add MoMo fields to Tenants:

```typescript
// Add these fields to existing Tenants collection
{
  name: "momoCode",
  type: "text",
  required: true,
  unique: true,
  index: true,
  admin: {
    description: "Mobile Money Code for receiving payments (e.g., TENANT1, SHOP123)",
    condition: (data) => data.paymentMethod === 'momo_pay',
  },
},
{
  name: "momoAccountName",
  type: "text",
  admin: {
    description: "Business name for MoMo account",
    condition: (data) => data.paymentMethod === 'momo_pay',
  },
},
{
  name: "totalRevenue",
  type: "number",
  defaultValue: 0,
  admin: {
    description: "Total revenue after platform fees (RWF)",
    readOnly: true,
  },
},
```

### UPDATE: Orders Collection

Ensure Orders are only created AFTER verification:

```typescript
// Add status tracking
{
  name: "transaction",
  type: "relationship",
  relationTo: "transactions",
  required: true,
  admin: {
    description: "Related transaction that was verified",
  },
},
{
  name: "status",
  type: "select",
  defaultValue: "completed",
  options: [
    { label: "Completed", value: "completed" },
    { label: "Delivered", value: "delivered" },
    { label: "Cancelled", value: "cancelled" },
  ],
},
```

---

## 🔧 tRPC Procedures

### 1. Checkout Router Updates

```typescript
// src/modules/checkout/server/procedures.ts

export const checkoutRouter = createTRPCRouter({
  // NEW: Initiate payment (replaces direct purchase)
  initiatePayment: protectedProcedure
    .input(
      z.object({
        productIds: z.array(z.string()).min(1),
        tenantSlug: z.string().min(1),
        customerPhone: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 1. Validate products
      const products = await ctx.db.find({
        collection: "products",
        depth: 1,
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

      // 2. Get tenant
      const tenantsData = await ctx.db.find({
        collection: "tenants",
        limit: 1,
        where: { slug: { equals: input.tenantSlug } },
      });

      const tenant = tenantsData.docs[0];
      if (!tenant || !tenant.isVerified) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Tenant not verified" });
      }

      // 3. Calculate totals
      const totalAmount = products.docs.reduce((acc, p) => acc + p.price, 0);
      const platformFee = Math.round(totalAmount * 0.1);
      const tenantAmount = totalAmount - platformFee;

      // 4. Create transaction
      const transaction = await ctx.db.create({
        collection: "transactions",
        data: {
          customer: ctx.session.user.id,
          customerName: ctx.session.user.username || ctx.session.user.email,
          customerEmail: ctx.session.user.email,
          customerPhone: input.customerPhone,
          tenant: tenant.id,
          products: products.docs.map(p => ({
            product: p.id,
            price: p.price,
          })),
          totalAmount,
          platformFee,
          tenantAmount,
          status: "pending",
        } as any,
      });

      // 5. Return payment instructions
      return {
        transactionId: transaction.id,
        paymentReference: transaction.paymentReference,
        momoCode: tenant.momoCode,
        momoAccountName: tenant.momoAccountName,
        amount: totalAmount,
        expiresAt: transaction.expiresAt,
        dialCode: `*182*8*1*${tenant.momoCode}*${totalAmount}#`,
      };
    }),

  // Keep existing getProducts
  getProducts: /* existing implementation */,
});
```

### 2. NEW: Transactions Router

```typescript
// src/modules/transactions/server/procedures.ts

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure, createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { isSuperAdmin } from "@/lib/access";

export const transactionsRouter = createTRPCRouter({
  // Customer submits MTN Transaction ID
  submitTransactionId: protectedProcedure
    .input(
      z.object({
        transactionId: z.string(),
        mtnTransactionId: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get transaction
      const transaction = await ctx.db.findByID({
        collection: "transactions",
        id: input.transactionId,
      });

      if (!transaction) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Transaction not found" });
      }

      // Check ownership
      if (transaction.customer !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      // Check status
      if (transaction.status !== "pending") {
        throw new TRPCError({ 
          code: "BAD_REQUEST", 
          message: "Transaction already processed" 
        });
      }

      // Check expiry
      if (new Date() > new Date(transaction.expiresAt)) {
        await ctx.db.update({
          collection: "transactions",
          id: input.transactionId,
          data: { status: "expired" },
        });
        throw new TRPCError({ 
          code: "BAD_REQUEST", 
          message: "Transaction expired" 
        });
      }

      // Update transaction
      await ctx.db.update({
        collection: "transactions",
        id: input.transactionId,
        data: {
          mtnTransactionId: input.mtnTransactionId,
          status: "awaiting_verification",
        },
      });

      return {
        success: true,
        message: "Transaction ID submitted. Awaiting verification.",
      };
    }),

  // Get transaction status
  getStatus: protectedProcedure
    .input(z.object({ transactionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const transaction = await ctx.db.findByID({
        collection: "transactions",
        id: input.transactionId,
        depth: 2,
      });

      if (!transaction) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      // Check access
      if (
        transaction.customer !== ctx.session.user.id &&
        !isSuperAdmin(ctx.session.user)
      ) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      return transaction;
    }),
});
```

### 3. NEW: Admin Router

```typescript
// src/modules/admin/server/procedures.ts

export const adminRouter = createTRPCRouter({
  // Get pending transactions for tenant
  getPendingTransactions: protectedProcedure
    .query(async ({ ctx }) => {
      // Check if user is tenant owner
      const user = await ctx.db.findByID({
        collection: "users",
        id: ctx.session.user.id,
        depth: 0,
      });

      if (!user?.tenants?.[0]) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not a tenant owner" });
      }

      const tenantId = user.tenants[0].tenant as string;

      // Get transactions
      const transactions = await ctx.db.find({
        collection: "transactions",
        where: {
          and: [
            { tenant: { equals: tenantId } },
            { status: { equals: "awaiting_verification" } },
          ],
        },
        depth: 2,
        sort: '-createdAt',
      });

      return transactions.docs;
    }),

  // Verify payment
  verifyPayment: protectedProcedure
    .input(
      z.object({
        transactionId: z.string(),
        verifiedMtnTransactionId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get transaction
      const transaction = await ctx.db.findByID({
        collection: "transactions",
        id: input.transactionId,
        depth: 1,
      });

      if (!transaction) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      // Check if user owns this tenant
      const user = await ctx.db.findByID({
        collection: "users",
        id: ctx.session.user.id,
        depth: 0,
      });

      const tenantId = user?.tenants?.[0]?.tenant as string;
      if (transaction.tenant !== tenantId && !isSuperAdmin(ctx.session.user)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      // Check status
      if (transaction.status !== "awaiting_verification") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid status" });
      }

      // 1. Create Order
      const order = await ctx.db.create({
        collection: "orders",
        data: {
          name: `Order ${transaction.paymentReference}`,
          user: transaction.customer,
          product: transaction.products[0].product.id, // First product
          transactionId: input.verifiedMtnTransactionId,
          paymentMethod: "mobile_money",
          bankName: "MTN Mobile Money",
          accountNumber: transaction.customerPhone || "N/A",
          amount: transaction.totalAmount,
          currency: "RWF",
          transaction: transaction.id,
          status: "completed",
        } as any,
      });

      // 2. Update transaction
      await ctx.db.update({
        collection: "transactions",
        id: input.transactionId,
        data: {
          status: "verified",
          verifiedAt: new Date(),
          verifiedBy: ctx.session.user.id,
          order: order.id,
        },
      });

      // 3. Update tenant revenue
      const tenant = await ctx.db.findByID({
        collection: "tenants",
        id: tenantId,
      });

      await ctx.db.update({
        collection: "tenants",
        id: tenantId,
        data: {
          totalRevenue: (tenant.totalRevenue || 0) + transaction.tenantAmount,
        },
      });

      // TODO: Send email to customer

      return {
        success: true,
        message: "Payment verified successfully",
        orderId: order.id,
      };
    }),

  // Reject payment
  rejectPayment: protectedProcedure
    .input(
      z.object({
        transactionId: z.string(),
        reason: z.string().min(10),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Similar access checks as verify
      const transaction = await ctx.db.findByID({
        collection: "transactions",
        id: input.transactionId,
      });

      if (!transaction) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      await ctx.db.update({
        collection: "transactions",
        id: input.transactionId,
        data: {
          status: "rejected",
          rejectionReason: input.reason,
          verifiedBy: ctx.session.user.id,
        },
      });

      // TODO: Send rejection email

      return {
        success: true,
        message: "Payment rejected",
      };
    }),
});
```

---

## 🎨 UI Components

### 1. Payment Instructions Component

```typescript
// src/modules/checkout/ui/components/payment-instructions.tsx

"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, CheckCircle2 } from "lucide-react";
import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

interface PaymentInstructionsProps {
  transactionId: string;
  paymentReference: string;
  momoCode: string;
  momoAccountName: string;
  amount: number;
  dialCode: string;
  expiresAt: string;
}

export const PaymentInstructions = ({
  transactionId,
  paymentReference,
  momoCode,
  momoAccountName,
  amount,
  dialCode,
  expiresAt,
}: PaymentInstructionsProps) => {
  const [mtnTransactionId, setMtnTransactionId] = useState("");
  const [copied, setCopied] = useState(false);
  
  const trpc = useTRPC();
  
  const submitTransaction = useMutation(
    trpc.transactions.submitTransactionId.mutationOptions({
      onSuccess: () => {
        toast.success("Transaction ID submitted!");
        // Redirect to status page
        window.location.href = `/payment/status/${transactionId}`;
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = () => {
    if (!mtnTransactionId.trim()) {
      toast.error("Please enter your MTN Transaction ID");
      return;
    }
    
    submitTransaction.mutate({
      transactionId,
      mtnTransactionId: mtnTransactionId.trim(),
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-4">
      <Card className="p-6 border-2 border-primary">
        <h2 className="text-2xl font-bold mb-4">📱 Complete Your Payment</h2>
        
        <div className="space-y-4 mb-6">
          <div className="bg-muted p-4 rounded-lg">
            <p className="font-semibold mb-2">Step 1: Dial this code on your MTN phone</p>
            <div className="flex items-center gap-2">
              <code className="text-lg font-mono bg-white px-4 py-2 rounded flex-1">
                {dialCode}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(dialCode)}
              >
                {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">Amount</p>
              <p className="text-2xl font-bold">{amount.toLocaleString()} RWF</p>
            </div>
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">Reference</p>
              <p className="text-lg font-mono">{paymentReference}</p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
            <p className="text-sm font-semibold text-blue-900 mb-2">
              Alternative: Manual Dial Instructions
            </p>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Dial *182*8*1# on your MTN phone</li>
              <li>Enter MoMo Code: <strong>{momoCode}</strong></li>
              <li>Enter Amount: <strong>{amount}</strong></li>
              <li>Enter PIN to confirm</li>
              <li>Save Transaction ID from SMS</li>
            </ol>
          </div>
        </div>

        <div className="border-t pt-6">
          <h3 className="font-semibold mb-4">Step 2: Enter your Transaction ID</h3>
          <div className="space-y-4">
            <div>
              <Label htmlFor="mtnTxId">MTN Transaction ID</Label>
              <Input
                id="mtnTxId"
                placeholder="MP241021.1234.A56789"
                value={mtnTransactionId}
                onChange={(e) => setMtnTransactionId(e.target.value)}
                className="font-mono"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Check your SMS from MTN for the transaction ID
              </p>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={submitTransaction.isPending}
              className="w-full"
              size="lg"
            >
              {submitTransaction.isPending ? "Submitting..." : "Submit Transaction ID"}
            </Button>
          </div>
        </div>

        <div className="mt-6 text-sm text-muted-foreground text-center">
          ⏰ Payment expires: {new Date(expiresAt).toLocaleString()}
        </div>
      </Card>
    </div>
  );
};
```

### 2. Admin Verification Page

```typescript
// src/app/(app)/(admin)/admin/verify-payments/page.tsx

"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle, XCircle, Clock } from "lucide-react";

export default function VerifyPaymentsPage() {
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [verifiedTxId, setVerifiedTxId] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data: transactions, isLoading } = useQuery(
    trpc.admin.getPendingTransactions.queryOptions()
  );

  const verifyMutation = useMutation(
    trpc.admin.verifyPayment.mutationOptions({
      onSuccess: () => {
        toast.success("Payment verified successfully!");
        queryClient.invalidateQueries(trpc.admin.getPendingTransactions.queryFilter());
        setVerifyDialogOpen(false);
        setVerifiedTxId("");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const rejectMutation = useMutation(
    trpc.admin.rejectPayment.mutationOptions({
      onSuccess: () => {
        toast.success("Payment rejected");
        queryClient.invalidateQueries(trpc.admin.getPendingTransactions.queryFilter());
        setRejectDialogOpen(false);
        setRejectionReason("");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  if (isLoading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Payment Verification</h1>
        <p className="text-muted-foreground">
          Verify customer payments by matching MTN Transaction IDs with your SMS
        </p>
      </div>

      {transactions?.length === 0 ? (
        <Card className="p-12 text-center">
          <Clock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium">No pending payments</p>
          <p className="text-muted-foreground">All caught up!</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {transactions?.map((tx: any) => (
            <Card key={tx.id} className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Customer</p>
                    <p className="font-semibold">{tx.customerName}</p>
                    <p className="text-sm text-muted-foreground">{tx.customerEmail}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-muted-foreground">Amount</p>
                    <p className="text-2xl font-bold">{tx.totalAmount.toLocaleString()} RWF</p>
                    <p className="text-xs text-green-600">
                      You get: {tx.tenantAmount.toLocaleString()} RWF
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-muted-foreground">Transaction ID</p>
                    <code className="block text-sm font-mono bg-muted px-2 py-1 rounded">
                      {tx.mtnTransactionId}
                    </code>
                    <p className="text-xs text-muted-foreground mt-1">
                      Ref: {tx.paymentReference}
                    </p>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <Button
                      onClick={() => {
                        setSelectedTransaction(tx);
                        setVerifiedTxId(tx.mtnTransactionId);
                        setVerifyDialogOpen(true);
                      }}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Verify
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedTransaction(tx);
                        setRejectDialogOpen(true);
                      }}
                      className="border-red-600 text-red-600 hover:bg-red-50"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Verify Dialog */}
      <Dialog open={verifyDialogOpen} onOpenChange={setVerifyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verify Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Customer: {selectedTransaction?.customerName}
              </p>
              <p className="text-sm text-muted-foreground mb-2">
                Amount: {selectedTransaction?.totalAmount.toLocaleString()} RWF
              </p>
            </div>
            
            <div>
              <label className="text-sm font-medium">MTN Transaction ID</label>
              <Input
                value={verifiedTxId}
                onChange={(e) => setVerifiedTxId(e.target.value)}
                placeholder="Confirm transaction ID"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Double-check this matches your MTN SMS
              </p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded text-sm">
              ⚠️ Please verify this transaction exists in your MTN SMS before confirming
            </div>

            <Button
              onClick={() => {
                verifyMutation.mutate({
                  transactionId: selectedTransaction.id,
                  verifiedMtnTransactionId: verifiedTxId,
                });
              }}
              disabled={!verifiedTxId || verifyMutation.isPending}
              className="w-full"
            >
              Confirm Verification
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Rejection Reason</label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why this payment is being rejected..."
                rows={4}
              />
            </div>

            <Button
              onClick={() => {
                rejectMutation.mutate({
                  transactionId: selectedTransaction.id,
                  reason: rejectionReason,
                });
              }}
              disabled={rejectionReason.length < 10 || rejectMutation.isPending}
              variant="destructive"
              className="w-full"
            >
              Reject Payment
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

---

## 📝 Implementation Checklist

- [ ] Create Transactions collection
- [ ] Update Tenants collection with momoCode fields
- [ ] Update Orders collection to link to Transactions
- [ ] Create checkout.initiatePayment() procedure
- [ ] Create transactions.submitTransactionId() procedure
- [ ] Create admin.getPendingTransactions() procedure
- [ ] Create admin.verifyPayment() procedure
- [ ] Create admin.rejectPayment() procedure
- [ ] Build PaymentInstructions UI component
- [ ] Build Admin VerifyPayments page
- [ ] Update checkout flow to use new system
- [ ] Add email notifications (optional)
- [ ] Test complete flow end-to-end

---

## 🎯 Key Points

1. **MoMo Code**: Stored in Tenants collection (e.g., "TENANT1", "SHOP123")
2. **Transaction ID**: Integer/String from MTN SMS (e.g., "MP241021.1234.A56789")
3. **Payment Reference**: Auto-generated (e.g., "PAY1AB2C3D4E")
4. **48-Hour Expiry**: Transactions auto-expire after 48 hours
5. **Manual Verification**: Tenant admins manually verify by checking their SMS
6. **Orders Created After Verification**: Only verified payments create orders
7. **Revenue Tracking**: Tenant revenue updated after successful verification

This system is fully manual and doesn't require MTN MoMo API integration!
