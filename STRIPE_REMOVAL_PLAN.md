# Stripe Removal Implementation Plan for Rwanda

## Overview
This document outlines the steps to remove Stripe dependency and implement local Rwanda payment solutions.

## COMPREHENSIVE STRIPE ANALYSIS

### 🔍 **Complete Stripe Integration Mapping**

This section provides a **COMPLETE DEEP ANALYSIS** of all Stripe usage cases and processes throughout the entire application.

#### **1. CORE STRIPE INTEGRATION POINTS**

##### **1.1 Package Dependencies**
- **Location**: `package.json`, `bun.lock`
- **Package**: `stripe@18.5.0`
- **Usage**: Primary payment processing library

##### **1.2 Environment Variables**
```env
STRIPE_SECRET_KEY=sk_test_xxxxx     # API authentication
STRIPE_WEBHOOK_SECRET=whsec_xxxxx   # Webhook signature verification
```

##### **1.3 Core Stripe Client Initialization**
- **File**: `src/lib/stripe.ts`
- **Purpose**: Central Stripe client instance
- **API Version**: `2025-03-31.basil`
- **Configuration**: TypeScript enabled

#### **2. DATABASE SCHEMA STRIPE DEPENDENCIES**

##### **2.1 Tenants Collection** (`src/collections/Tenants.ts`)
```typescript
{
  stripeAccountId: string;           // REQUIRED - Stripe Connect Account ID
  stripeDetailsSubmitted: boolean;   // Verification status flag
}
```
**Impact**: 
- `stripeAccountId` is **REQUIRED** field - blocks tenant creation
- `stripeDetailsSubmitted` controls product creation access
- Used in access control throughout the system

##### **2.2 Orders Collection** (`src/collections/Orders.ts`)
```typescript
{
  stripeCheckoutSessionId: string;   // REQUIRED - Links to Stripe session
  stripeAccountId: string;          // OPTIONAL - Connected account reference
}
```
**Impact**: 
- Every order MUST have a Stripe session ID
- Used for order tracking and reconciliation
- Links orders to specific vendor Stripe accounts

##### **2.3 Products Collection Access Control** (`src/collections/Products.ts`)
```typescript
create: ({ req }) => {
  if (isSuperAdmin(req.user)) return true;
  const tenant = req.user?.tenants?.[0]?.tenant as Tenant;
  return Boolean(tenant?.stripeDetailsSubmitted); // BLOCKING CONDITION
},
```
**Impact**: 
- **CRITICAL**: Regular users CANNOT create products without Stripe verification
- Only super-admins can bypass this restriction
- Prevents any e-commerce activity without Stripe

#### **3. BUSINESS LOGIC STRIPE PROCESSES**

##### **3.1 User Registration & Tenant Creation** (`src/modules/auth/server/procedures.ts`)

**Process Flow**:
1. User submits registration form
2. **Stripe Connect Account Created Automatically**:
   ```typescript
   const account = await stripe.accounts.create({});
   ```
3. Tenant record created with Stripe account ID:
   ```typescript
   const tenant = await ctx.db.create({
     collection: "tenants",
     data: {
       name: input.username,
       slug: input.username,
       stripeAccountId: account.id,  // CRITICAL DEPENDENCY
     }
   });
   ```
4. User linked to tenant

**Critical Dependencies**:
- **Cannot register users** without creating Stripe accounts
- **Automatic Stripe Connect onboarding** for every vendor
- **No fallback mechanism** for Stripe failures

##### **3.2 Stripe Account Verification** (`src/modules/checkout/server/procedures.ts`)

**Verification Process**:
```typescript
verify: protectedProcedure.mutation(async ({ ctx }) => {
  const accountLink = await stripe.accountLinks.create({
    account: tenant.stripeAccountId,
    refresh_url: `${process.env.NEXT_PUBLIC_APP_URL!}/admin`,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL!}/admin`,
    type: "account_onboarding",
  });
  return { url: accountLink.url };
}),
```

**Process Flow**:
1. Vendor clicks "Verify Account" 
2. Redirected to Stripe Connect onboarding
3. Completes KYC, bank details, business info
4. Stripe webhook updates `stripeDetailsSubmitted: true`
5. Vendor can now create products

**UI Components**:
- `src/components/stripe-verify.tsx` - Verification button in admin
- `src/app/(app)/(tenants)/stripe-verify/page.tsx` - Verification redirect page
- Added to Payload admin nav: `beforeNavLinks: ["@/components/stripe-verify#StripeVerify"]`

##### **3.3 Purchase & Checkout Process**

**Purchase Flow** (`src/modules/checkout/server/procedures.ts`):

1. **Verification Check**:
   ```typescript
   if (!tenant.stripeDetailsSubmitted) {
     throw new TRPCError({ code: "BAD_REQUEST", message: "Store verification required" });
   }
   ```

2. **Line Items Creation**:
   ```typescript
   const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = products.docs.map((product) => ({
     quantity: 1,
     price_data: {
       unit_amount: product.price * 100, // Convert to cents
       currency: "usd",
       product_data: {
         name: product.name,
         metadata: {
           stripeAccountId: tenant.stripeAccountId,
           id: product.id,
           name: product.name,
           price: product.price,
         }
       }
     }
   }));
   ```

3. **Platform Fee Calculation**:
   ```typescript
   const totalAmount = products.docs.reduce((acc, item) => acc + item.price * 100, 0);
   const platformFeeAmount = Math.round(totalAmount * (PLATFORM_FEE_PERCENTAGE / 100)); // 10%
   ```

4. **Stripe Checkout Session Creation**:
   ```typescript
   const checkout = await stripe.checkout.sessions.create({
     customer_email: ctx.session.user.email,
     success_url: `${domain}/checkout?success=true`,
     cancel_url: `${domain}/checkout?cancel=true`,
     mode: "payment",
     line_items: lineItems,
     invoice_creation: { enabled: true },
     metadata: { userId: ctx.session.user.id },
     payment_intent_data: {
       application_fee_amount: platformFeeAmount, // PLATFORM FEE COLLECTION
     }
   }, {
     stripeAccount: tenant.stripeAccountId, // CONNECT ACCOUNT CONTEXT
   });
   ```

**Key Features**:
- **Multi-party payments** via Stripe Connect
- **Automatic platform fee** collection (10%)
- **Vendor-specific checkout** sessions
- **Invoice generation** enabled
- **Success/cancel redirects** to tenant domains

##### **3.4 Webhook Processing** (`src/app/(app)/api/stripe/webhooks/route.ts`)

**Webhook Events Handled**:

1. **`checkout.session.completed`**:
   ```typescript
   case "checkout.session.completed":
     data = event.data.object as Stripe.Checkout.Session;
     
     // Retrieve expanded session with line items
     const expandedSession = await stripe.checkout.sessions.retrieve(data.id, {
       expand: ["line_items.data.price.product"],
     }, {
       stripeAccount: event.account,
     });
     
     // Create order records for each purchased item
     for (const item of lineItems) {
       await payload.create({
         collection: "orders",
         data: {
           stripeCheckoutSessionId: data.id,
           stripeAccountId: event.account,
           user: user.id,
           product: item.price.product.metadata.id,
           name: item.price.product.name,
         },
       });
     }
   ```

2. **`account.updated`**:
   ```typescript
   case "account.updated":
     data = event.data.object as Stripe.Account;
     
     // Update tenant verification status
     await payload.update({
       collection: "tenants",
       where: { stripeAccountId: { equals: data.id } },
       data: { stripeDetailsSubmitted: data.details_submitted },
     });
   ```

**Critical Functions**:
- **Order creation** from successful payments
- **Verification status updates** from Stripe
- **Real-time payment processing** 
- **Multi-tenant order routing**

##### **3.5 Admin Seeding Process** (`src/seed.ts`)

**Admin Setup**:
```typescript
const adminAccount = await stripe.accounts.create({}); // Create Stripe account for admin

const adminTenant = await payload.create({
  collection: "tenants",
  data: {
    name: "admin",
    slug: "admin",
    stripeAccountId: adminAccount.id, // Required even for admin
  },
});
```

**Impact**: Even the admin tenant requires a Stripe account

#### **4. TYPE DEFINITIONS & INTERFACES**

##### **4.1 Checkout Types** (`src/modules/checkout/types.ts`)
```typescript
import type Stripe from "stripe";

export type ProductMetadata = {
  stripeAccountId: string;
  id: string;
  name: string;
  price: number;
};

export type ExpandedLineItem = Stripe.LineItem & {
  price: Stripe.Price & {
    product: Stripe.Product & {
      metadata: ProductMetadata,
    };
  };
};
```

##### **4.2 Generated Types** (`src/payload-types.ts`)
- `stripeAccountId: string` in Tenant interface
- `stripeDetailsSubmitted?: boolean | null` in Tenant interface  
- `stripeCheckoutSessionId: string` in Order interface
- `stripeAccountId?: string | null` in Order interface

#### **5. CONFIGURATION & ADMIN INTEGRATION**

##### **5.1 Payload CMS Configuration** (`src/payload.config.ts`)
```typescript
admin: {
  components: {
    beforeNavLinks: ["@/components/stripe-verify#StripeVerify"] // Stripe verification in nav
  }
},
```

##### **5.2 Constants** (`src/constants.ts`)
```typescript
export const PLATFORM_FEE_PERCENTAGE = 10; // Used in Stripe fee calculations
```

#### **6. CRITICAL BUSINESS LOGIC DEPENDENCIES**

##### **6.1 Revenue Model**
- **Platform fees**: 10% automatic collection via Stripe Connect
- **Multi-party payments**: Vendor gets 90%, platform gets 10%
- **Automated reconciliation**: No manual fee tracking needed

##### **6.2 Vendor Onboarding**
- **Mandatory Stripe verification** before selling
- **KYC compliance** through Stripe
- **Bank account verification** required
- **Real-time status updates** via webhooks

##### **6.3 Order Management**
- **All orders tied to Stripe sessions**
- **Payment verification** automatic
- **Refund handling** through Stripe
- **Dispute management** via Stripe dashboard

##### **6.4 Multi-Tenant Architecture**
- **Vendor isolation** via Stripe Connect accounts
- **Individual payment processing** per vendor
- **Separate financial reporting** per tenant
- **Independent payout schedules**

#### **7. USER EXPERIENCE FLOWS**

##### **7.1 Vendor Journey**
1. Register → Automatic Stripe account creation
2. Access admin → See verification required message
3. Click "Verify Account" → Redirected to Stripe onboarding
4. Complete verification → Can create products
5. Customer purchases → Automatic payment split

##### **7.2 Customer Journey**
1. Browse products → Only from verified vendors visible
2. Add to cart → Stripe checkout session created
3. Pay via Stripe → Secure payment processing
4. Success → Order created via webhook
5. Access purchased content → Available in library

#### **8. SECURITY & COMPLIANCE**

##### **8.1 Payment Security**
- **PCI DSS compliance** through Stripe
- **No card data storage** on platform
- **Webhook signature verification**
- **HTTPS enforcement** for payments

##### **8.2 Financial Compliance**
- **KYC verification** via Stripe Connect
- **Anti-money laundering** checks
- **Tax reporting** through Stripe
- **International compliance** handled by Stripe

#### **9. TECHNICAL ARCHITECTURE**

##### **9.1 API Integration Pattern**
- **Server-side Stripe client** only
- **No client-side Stripe.js** usage
- **Webhook-driven order creation**
- **tRPC API layer** for all payment operations

##### **9.2 Error Handling**
- **Stripe API failures** bubble up to user
- **Webhook failures** logged but don't affect UX
- **Verification failures** block product creation
- **Payment failures** redirect to cancel URL

#### **10. OPERATIONAL DEPENDENCIES**

##### **10.1 Required Stripe Features**
- **Stripe Connect** (multi-party payments)
- **Stripe Checkout** (payment processing)
- **Stripe Webhooks** (real-time updates)
- **Stripe Dashboard** (vendor management)

##### **10.2 Stripe Configuration**
- **Account Links** for onboarding
- **Application fees** for platform revenue
- **Express accounts** for quick vendor setup
- **Webhook endpoints** configured

---

### 📊 **IMPACT ASSESSMENT SUMMARY**

#### **🔴 CRITICAL BLOCKERS** (Must be replaced)
1. **User Registration**: Cannot create tenants without Stripe accounts
2. **Product Creation**: Blocked by `stripeDetailsSubmitted` requirement  
3. **Payment Processing**: 100% dependent on Stripe Checkout
4. **Order Management**: All orders require Stripe session IDs
5. **Platform Revenue**: Automatic fee collection via Stripe Connect

#### **🟡 MAJOR DEPENDENCIES** (Need alternatives)
1. **Vendor Verification**: Stripe Connect onboarding process
2. **Multi-party Payments**: Revenue splitting functionality
3. **Webhook Processing**: Real-time payment confirmations
4. **Admin Interface**: Stripe verification components

#### **🟢 MINOR INTEGRATIONS** (Easy to remove)
1. **Type Definitions**: Stripe-specific types
2. **Environment Variables**: API keys and webhook secrets
3. **UI Components**: Verification buttons and pages

**TOTAL FILES AFFECTED**: 15+ core files across database, API, UI, and configuration layers

**DEVELOPMENT EFFORT**: High - requires complete payment architecture redesign

## Phase 1: Database Schema Modifications

### 1.1 Update Tenants Collection
```typescript
// src/collections/Tenants.ts
// REMOVE:
- stripeAccountId (required field)
- stripeDetailsSubmitted (verification field)

// ADD:
- paymentProvider: "manual" | "momo" | "airtel" | "bok" | "paypack"
- paymentAccountDetails: object // flexible payment account info
- isVerified: boolean // replaces stripeDetailsSubmitted
- verificationMethod: "manual" | "automatic"
```

### 1.2 Update Orders Collection
```typescript
// src/collections/Orders.ts
// REMOVE:
- stripeCheckoutSessionId
- stripeAccountId

// ADD:
- paymentMethod: string
- paymentReference: string
- paymentStatus: "pending" | "completed" | "failed" | "cancelled"
- transactionId: string
```

### 1.3 Update Products Collection
```typescript
// src/collections/Products.ts
// MODIFY access control:
create: ({ req }) => {
  if (isSuperAdmin(req.user)) return true;
  
  const tenant = req.user?.tenants?.[0]?.tenant as Tenant
  // CHANGE: from tenant?.stripeDetailsSubmitted
  return Boolean(tenant?.isVerified);
},
```

## Phase 2: Remove Stripe Dependencies

### 2.1 Remove Stripe Package
```bash
bun remove stripe
```

### 2.2 Delete Stripe-Related Files
- `src/lib/stripe.ts`
- `src/app/(app)/api/stripe/webhooks/route.ts`
- `src/components/stripe-verify.tsx`
- `src/app/(app)/(tenants)/stripe-verify/page.tsx`

### 2.3 Update Environment Variables
```env
# REMOVE:
# STRIPE_SECRET_KEY
# STRIPE_WEBHOOK_SECRET

# ADD (example for MTN MoMo):
MOMO_API_URL=https://sandbox.momodeveloper.mtn.com
MOMO_SUBSCRIPTION_KEY=your_subscription_key
MOMO_API_USER_ID=your_api_user_id
MOMO_API_KEY=your_api_key
```

## Phase 3: Implement Alternative Payment System

### 3.1 Create Payment Provider Interface
```typescript
// src/lib/payment/types.ts
export interface PaymentProvider {
  createAccount(vendorInfo: VendorInfo): Promise<AccountResult>;
  processPayment(paymentData: PaymentData): Promise<PaymentResult>;
  verifyPayment(reference: string): Promise<VerificationResult>;
  calculateFees(amount: number): { platformFee: number; vendorAmount: number };
}

// src/lib/payment/providers/momo.ts
export class MoMoProvider implements PaymentProvider {
  // Implementation for MTN Mobile Money
}

// src/lib/payment/providers/manual.ts
export class ManualProvider implements PaymentProvider {
  // Implementation for manual bank transfers
}
```

### 3.2 Update Registration Process
```typescript
// src/modules/auth/server/procedures.ts
register: baseProcedure
  .input(registerSchema)
  .mutation(async ({ input, ctx }) => {
    // REMOVE: Stripe account creation
    // const account = await stripe.accounts.create({});

    const tenant = await ctx.db.create({
      collection: "tenants",
      data: {
        name: input.username,
        slug: input.username,
        // REMOVE: stripeAccountId: account.id,
        paymentProvider: "manual", // default to manual
        isVerified: false, // requires manual verification
        verificationMethod: "manual",
      }
    });
    // ... rest remains same
  }),
```

### 3.3 Update Checkout Process
```typescript
// src/modules/checkout/server/procedures.ts
purchase: protectedProcedure
  .input(purchaseSchema)
  .mutation(async ({ ctx, input }) => {
    // REMOVE: Stripe checkout session creation
    
    // ADD: Alternative payment flow
    const paymentProvider = getPaymentProvider(tenant.paymentProvider);
    
    if (tenant.paymentProvider === "manual") {
      // Create pending order, send bank details
      const order = await ctx.db.create({
        collection: "orders",
        data: {
          user: ctx.session.user.id,
          product: product.id,
          paymentMethod: "bank_transfer",
          paymentStatus: "pending",
          transactionId: generateTransactionId(),
          name: product.name,
        },
      });
      
      return {
        orderId: order.id,
        paymentInstructions: "Please transfer to Bank of Kigali...",
        amount: totalAmount,
      };
    }
    
    // For automated providers (MoMo, etc.)
    const paymentResult = await paymentProvider.processPayment({
      amount: totalAmount,
      description: `Purchase from ${tenant.name}`,
      metadata: { orderId, userId, productIds },
    });
    
    return paymentResult;
  }),
```

### 3.4 Create Payment Verification System
```typescript
// src/modules/admin/server/procedures.ts
verifyPayment: protectedProcedure
  .input(z.object({ orderId: z.string() }))
  .mutation(async ({ ctx, input }) => {
    // Manual verification by admin
    await ctx.db.update({
      collection: "orders",
      id: input.orderId,
      data: { paymentStatus: "completed" },
    });
  }),
```

## Phase 4: Update UI Components

### 4.1 Replace Stripe Verification
```typescript
// src/components/verification-status.tsx
export const VerificationStatus = () => {
  return (
    <div>
      {!tenant.isVerified && (
        <Alert>
          Your account needs verification to start selling. 
          Contact admin or submit verification documents.
        </Alert>
      )}
    </div>
  );
};
```

### 4.2 Update Checkout UI
```typescript
// src/modules/checkout/ui/components/payment-methods.tsx
export const PaymentMethods = ({ amount, onPayment }) => {
  return (
    <div>
      <Button onClick={() => onPayment("bank_transfer")}>
        Bank Transfer (Manual)
      </Button>
      <Button onClick={() => onPayment("momo")}>
        MTN Mobile Money
      </Button>
      <Button onClick={() => onPayment("airtel")}>
        Airtel Money
      </Button>
    </div>
  );
};
```

## Phase 5: Admin Dashboard Updates

### 5.1 Vendor Verification Interface
```typescript
// Admin interface for manual verification
// View pending vendors
// Approve/reject verification
// Manage payment account details
```

### 5.2 Order Management
```typescript
// Admin interface for order verification
// View pending payments
// Mark payments as received
// Handle disputes
```

## Benefits of Removal

### ✅ Advantages:
1. **Local Market Access**: Serve Rwandan market effectively
2. **Lower Fees**: Avoid Stripe's international fees
3. **Local Payment Methods**: MTN MoMo, Airtel Money support
4. **Regulatory Compliance**: Meet local financial regulations
5. **Currency Support**: Native RWF support

### ⚠️ Considerations:
1. **Manual Overhead**: More admin work for verification
2. **Lost Automation**: No automatic fee splitting
3. **Development Time**: Significant code changes required
4. **Payment Security**: Need to implement own security measures
5. **Reconciliation**: Manual payment matching required

## Timeline Estimate
- **Phase 1-2**: 2-3 days (removal and schema changes)
- **Phase 3**: 1-2 weeks (payment provider integration)
- **Phase 4-5**: 1 week (UI updates and admin tools)
- **Testing**: 1 week
- **Total**: 3-4 weeks for basic implementation

## Risk Mitigation
1. **Backup Current System**: Keep Stripe code in separate branch
2. **Feature Flags**: Gradual rollout of new payment system
3. **Dual Mode**: Support both systems during transition
4. **Extensive Testing**: Test all payment scenarios
5. **Admin Training**: Train staff on manual processes
