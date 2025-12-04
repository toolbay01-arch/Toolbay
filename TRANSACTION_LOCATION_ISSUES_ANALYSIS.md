# Transaction Location/Address Issues Analysis

## Date: December 4, 2025

---

## 🔍 Issues Identified

### **Issue #1: Shipping Address Not Displayed on Verify-Payments Page**

**Location**: `/src/app/(app)/verify-payments/page.tsx`

**Problem**: The verify-payments page displays transaction delivery type but **does NOT show shipping address** in the table or card views, even though the data exists in the transaction.

**Current Implementation**:
```tsx
// Line 386-393 - Shows delivery type only
{transaction.deliveryType && (
  <span className={`text-[10px] px-1.5 py-0.5 rounded ${
    transaction.deliveryType === 'direct' 
      ? 'bg-purple-100 text-purple-700' 
      : 'bg-blue-100 text-blue-700'
  }`}>
    {transaction.deliveryType === 'direct' ? '📦 Pickup' : '🚚 Delivery'}
  </span>
)}
```

**Missing**: No rendering of `transaction.shippingAddress` object which contains:
- `line1` (address line)
- `city`
- `country`

**Impact**: 
- ❌ Tenants cannot see customer shipping address for delivery orders
- ❌ No way to know where to ship the product
- ❌ Customer may have provided address but tenant is blind to it

---

### **Issue #2: Shipping Address Not Passed to Orders**

**Location**: `/src/modules/admin/server/procedures.ts` → `verifyPayment()` mutation

**Problem**: When verifying a transaction and creating orders, the shipping address from the transaction is **NOT copied to the order**.

**Current Code** (lines 178-217):
```typescript
const orders = await Promise.all(
  transaction.products.map(async (item: any) => {
    return await ctx.db.create({
      collection: "orders",
      data: {
        name: `Order ${transaction.paymentReference}`,
        user: transaction.customer,
        product: typeof item.product === 'string' ? item.product : item.product.id,
        products: transaction.products.map((p: any) => ({...})),
        totalAmount: transaction.totalAmount,
        transactionId: input.verifiedMtnTransactionId,
        paymentMethod: "mobile_money",
        bankName: "Mobile Money",
        accountNumber: transaction.customerPhone || "N/A",
        amount: item.price * quantity,
        currency: "RWF",
        transaction: transaction.id,
        deliveryType: (transaction as any).deliveryType || 'delivery', // ✅ Copied
        status: "pending",
        // ❌ shippingAddress is MISSING!
      }
    });
  })
);
```

**Missing**: `shippingAddress` field is not being set on the order.

**Impact**:
- ❌ Even if orders collection has a shippingAddress field, it won't be populated
- ❌ Tenant fulfilling the order won't know where to ship
- ❌ Data loss - address provided at checkout is lost after verification

---

### **Issue #3: Orders Collection May Not Have Shipping Address Field**

**Location**: `/src/collections/Orders.ts`

**Problem**: The Orders collection schema does **NOT include a shippingAddress field**.

**Current Schema** (lines 321-334):
```typescript
{
  name: "deliveryType",
  type: "select",
  required: true,
  defaultValue: "direct",
  options: [
    { label: "Direct Payment (Pickup)", value: "direct" },
    { label: "Delivery", value: "delivery" },
  ],
  admin: {
    description: "Delivery type inherited from transaction..."
  }
},
```

**Missing**: No shipping address group field like in Transactions collection.

**Expected** (based on Transactions.ts):
```typescript
{
  name: 'shippingAddress',
  type: 'group',
  fields: [
    { name: 'line1', type: 'text' },
    { name: 'city', type: 'text' },
    { name: 'country', type: 'text' },
  ],
  admin: {
    condition: (data) => data.deliveryType === 'delivery',
  }
}
```

**Impact**:
- ❌ No database field to store shipping address on orders
- ❌ Even if we try to copy it from transaction, the field doesn't exist

---

### **Issue #4: No Shipping Address Validation on Form Submission**

**Location**: `/src/modules/checkout/ui/components/checkout-form.tsx`

**Status**: ✅ **This is actually CORRECT**

The form properly validates shipping address only when `deliveryType === 'delivery'`:

```typescript
// Lines 95-105
if (formData.deliveryType === 'delivery') {
  if (!formData.addressLine1.trim()) {
    newErrors.addressLine1 = "Address is required for delivery"
  }
  if (!formData.city.trim()) {
    newErrors.city = "City is required for delivery"
  }
  if (!formData.country.trim()) {
    newErrors.country = "Country is required for delivery"
  }
}
```

**Conditional Rendering**: Lines 245-307 show address fields only when delivery is selected. ✅

---

### **Issue #5: Checkout Backend Properly Stores Address**

**Location**: `/src/modules/checkout/server/procedures.ts` → `initiatePayment()`

**Status**: ✅ **This is CORRECT**

The backend properly stores shipping address in the transaction:

```typescript
// Lines 149-155
const transaction = await ctx.db.create({
  collection: "transactions",
  data: {
    // ...other fields
    deliveryType: input.deliveryType,
    shippingAddress: input.shippingAddress ? {
      line1: input.shippingAddress.line1,
      city: input.shippingAddress.city,
      country: input.shippingAddress.country,
    } : undefined,
    // ...
  }
});
```

✅ Address is stored in transaction when provided.

---

### **Issue #6: TransactionVerificationCard Does Show Address**

**Location**: `/src/modules/transactions/ui/components/transaction-verification-card.tsx`

**Status**: ✅ **Partially Correct**

This component (used elsewhere, not on verify-payments page) DOES display shipping address:

```tsx
// Lines 255-266
{transaction.shippingAddress && (
  <div className="space-y-2">
    <h4 className="font-semibold text-sm text-gray-700 flex items-center gap-2">
      <MapPin className="h-4 w-4" />
      Shipping Address
    </h4>
    <div className="text-sm bg-gray-50 p-2 rounded">
      {transaction.shippingAddress.line1}, {transaction.shippingAddress.city}, {transaction.shippingAddress.country}
    </div>
  </div>
)}
```

**However**: This component is NOT used on the main `/verify-payments` page.

---

## 📊 Data Flow Analysis

### Current Flow:

```
1. Customer Checkout
   ├─ Selects delivery type: 'direct' or 'delivery'
   ├─ If 'delivery': Enters shipping address
   └─ Submits form
   
2. checkout.initiatePayment()
   ├─ Validates shipping address required for delivery
   ├─ Creates Transaction with:
   │  ├─ deliveryType ✅
   │  └─ shippingAddress ✅
   └─ Returns transactionId
   
3. Customer Submits MoMo TX ID
   ├─ Transaction status → 'awaiting_verification'
   └─ Shipping address still in transaction ✅
   
4. Tenant Views /verify-payments
   ├─ Sees deliveryType badge ✅
   └─ CANNOT see shippingAddress ❌ ← ISSUE #1
   
5. Tenant Clicks "Verify"
   └─ admin.verifyPayment()
      ├─ Creates Orders with:
      │  ├─ deliveryType ✅
      │  └─ shippingAddress ❌ ← ISSUE #2
      └─ Orders have NO shipping info ❌ ← ISSUE #3
      
6. Tenant Views Sales Dashboard
   └─ Orders displayed without shipping address ❌
   └─ No way to know where to ship ❌
```

---

## 🔧 Required Fixes

### **Fix #1: Display Shipping Address on Verify-Payments Page**

**File**: `/src/app/(app)/verify-payments/page.tsx`

**Action**: Add shipping address display in both List and Card views.

**For List View** (in `UnifiedTransactionRow`):
- Add a new expandable section or column showing shipping address when `deliveryType === 'delivery'`

**For Card View** (in `UnifiedTransactionCard`):
- Add shipping address below the delivery type badge

**Example Code**:
```tsx
{/* In expanded section or below delivery type */}
{transaction.deliveryType === 'delivery' && transaction.shippingAddress && (
  <div className="text-xs text-gray-700 mt-2 bg-blue-50 p-2 rounded">
    <div className="font-semibold mb-1 flex items-center gap-1">
      <MapPin className="h-3 w-3" />
      Shipping Address:
    </div>
    <div>
      {transaction.shippingAddress.line1}<br />
      {transaction.shippingAddress.city}, {transaction.shippingAddress.country}
    </div>
  </div>
)}
```

---

### **Fix #2: Add Shipping Address Field to Orders Collection**

**File**: `/src/collections/Orders.ts`

**Action**: Add `shippingAddress` group field after `deliveryType`.

**Code to Add** (after line 334):
```typescript
{
  name: "shippingAddress",
  type: "group",
  fields: [
    {
      name: "line1",
      type: "text",
      admin: {
        description: "Address line 1"
      }
    },
    {
      name: "city",
      type: "text",
      admin: {
        description: "City"
      }
    },
    {
      name: "country",
      type: "text",
      admin: {
        description: "Country"
      }
    },
  ],
  admin: {
    description: "Customer shipping address for delivery orders",
    condition: (data) => data.deliveryType === 'delivery',
  }
},
```

**Note**: After adding this field, you may need to run a database migration or restart the server.

---

### **Fix #3: Copy Shipping Address from Transaction to Order**

**File**: `/src/modules/admin/server/procedures.ts` → `verifyPayment()` mutation

**Action**: Add `shippingAddress` field when creating orders.

**Update** (around line 210):
```typescript
const orders = await Promise.all(
  transaction.products.map(async (item: any) => {
    return await ctx.db.create({
      collection: "orders",
      data: {
        name: `Order ${transaction.paymentReference}`,
        user: transaction.customer,
        product: typeof item.product === 'string' ? item.product : item.product.id,
        products: transaction.products.map((p: any) => ({...})),
        totalAmount: transaction.totalAmount,
        transactionId: input.verifiedMtnTransactionId,
        paymentMethod: "mobile_money",
        bankName: "Mobile Money",
        accountNumber: transaction.customerPhone || "N/A",
        amount: item.price * quantity,
        currency: "RWF",
        transaction: transaction.id,
        deliveryType: (transaction as any).deliveryType || 'delivery',
        
        // ✅ ADD THIS: Copy shipping address from transaction
        shippingAddress: (transaction as any).shippingAddress ? {
          line1: (transaction as any).shippingAddress.line1,
          city: (transaction as any).shippingAddress.city,
          country: (transaction as any).shippingAddress.country,
        } : undefined,
        
        status: "pending",
      }
    });
  })
);
```

---

### **Fix #4: Display Shipping Address in Sales Dashboard**

**File**: Check sales/orders views (likely `/src/modules/sales/` or `/src/modules/orders/`)

**Action**: Display shipping address in order details when `deliveryType === 'delivery'`.

**Example**:
```tsx
{order.deliveryType === 'delivery' && order.shippingAddress && (
  <div className="mt-2 p-2 bg-blue-50 rounded">
    <div className="text-xs font-semibold text-blue-900 mb-1">
      📍 Shipping Address:
    </div>
    <div className="text-xs text-blue-800">
      {order.shippingAddress.line1}<br />
      {order.shippingAddress.city}, {order.shippingAddress.country}
    </div>
  </div>
)}
```

---

## 🎯 Priority & Impact

### High Priority (Critical for Business)
1. ✅ **Fix #2**: Add shippingAddress to Orders schema
2. ✅ **Fix #3**: Copy address to orders during verification
3. ✅ **Fix #1**: Display address on verify-payments page

### Medium Priority
4. **Fix #4**: Display address in sales dashboard

---

## 🧪 Testing Plan

### Test Case 1: Direct Pickup Order
1. Add item to cart
2. Checkout with `deliveryType = 'direct'`
3. Verify no shipping address fields shown ✅
4. Submit payment
5. Verify transaction shows "📦 Pickup" badge
6. Verify payment as tenant
7. Check order has `deliveryType = 'direct'` and NO shipping address

### Test Case 2: Delivery Order
1. Add item to cart
2. Checkout with `deliveryType = 'delivery'`
3. Fill in shipping address (required)
4. Submit payment
5. **Verify transaction shows "🚚 Delivery" AND shipping address** ← Currently fails
6. Verify payment as tenant
7. **Check order has shipping address populated** ← Currently fails
8. **View order in sales dashboard with address** ← Currently fails

---

## 📝 Summary

**Root Cause**: Shipping address is properly captured at checkout and stored in transactions, but:
1. Not displayed to tenants during verification
2. Not copied to orders when payment is verified
3. Orders collection doesn't have the field to store it

**Business Impact**:
- ❌ Tenants cannot fulfill delivery orders properly
- ❌ No visibility into where products should be shipped
- ❌ Customer experience degraded for delivery orders
- ✅ Direct/pickup orders work fine (no address needed)

**Solution**: Implement the 4 fixes above to complete the shipping address flow end-to-end.

---

## 🔗 Related Files

### Data Collections:
- `/src/collections/Transactions.ts` - Has shippingAddress ✅
- `/src/collections/Orders.ts` - Missing shippingAddress ❌

### UI Components:
- `/src/app/(app)/verify-payments/page.tsx` - Main verification page ❌
- `/src/modules/transactions/ui/components/transaction-verification-card.tsx` - Shows address ✅
- `/src/modules/checkout/ui/components/checkout-form.tsx` - Captures address ✅

### Server Procedures:
- `/src/modules/checkout/server/procedures.ts` - Stores address ✅
- `/src/modules/admin/server/procedures.ts` - Doesn't copy address ❌
- `/src/modules/transactions/server/procedures.ts` - Alternative verify endpoint

---

## 📅 Implementation Timeline

1. **Day 1**: Add shippingAddress field to Orders collection (Fix #2)
2. **Day 1**: Update verifyPayment to copy address (Fix #3)
3. **Day 2**: Update verify-payments UI to show address (Fix #1)
4. **Day 2**: Update sales dashboard to show address (Fix #4)
5. **Day 3**: Test end-to-end with delivery orders
6. **Day 3**: Deploy and monitor

---

**Status**: Ready for implementation
**Severity**: High - Delivery orders cannot be fulfilled properly
**Affected Users**: All tenants with delivery orders
