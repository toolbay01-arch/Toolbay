# Orders Schema Update & Data Sync

## Problem Fixed
The Orders collection had a mismatch between the schema and what tRPC procedures were querying:
- ❌ Schema had `user` field, tRPC queried `customer`
- ❌ Schema had singular `product`, UI expected `products` array
- ❌ Schema had `amount`, UI expected `totalAmount`
- ❌ Schema missing `orderNumber` for unique identification

## Solution

### 1. Updated Orders Collection Schema

Added fields to match transaction data structure:

```typescript
{
  orderNumber: string (unique, auto-generated)
  user: Relationship to users (customer)
  products: Array of {
    product: Relationship
    quantity: number
    priceAtPurchase: number
  }
  totalAmount: number
  // ... existing fields
}
```

### 2. Auto-Generate Order Numbers

Added hook to create unique order references:
```typescript
beforeChange: async ({ data, operation }) => {
  if (operation === 'create' && !data.orderNumber) {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    data.orderNumber = `ORD-${timestamp}-${random}`;
  }
  return data;
}
```

### 3. Fixed tRPC Query

Updated procedures to query correct field:
```typescript
// OLD: customer: { equals: userId }
// NEW: user: { equals: userId }
```

### 4. Updated Order Creation

When payment verified, orders now created with:
```typescript
{
  user: transaction.customer,
  products: transaction.products.map(p => ({
    product: p.product,
    quantity: 1,
    priceAtPurchase: p.price
  })),
  totalAmount: transaction.totalAmount,
  // ... other fields
}
```

## Data Sync: My Account ↔️ My Orders ↔️ Payload CMS

### My Account Page (`/my-account`)
- Shows order statistics via `getDashboardStats`
- Displays recent 5 orders
- Each order has full details
- Quick link to "View All Orders"

### My Orders Page (`/orders`)
- Shows complete order history
- Filter by status (all, pending, shipped, delivered, completed)
- Full OrderCard with timeline
- "I Received My Item" button for delivered orders

### Payload CMS (Tenant View)
- Orders collection shows all orders for tenant's products
- ✓ `received` checkbox appears when customer confirms
- Read-only field synced from customer action
- Tenant can update order status (shipped, delivered)

## Confirm Receipt Flow

```
Customer (My Orders page)
  ↓
Clicks "I Received My Item"
  ↓
Confirms in dialog
  ↓
tRPC Mutation: orders.confirmReceipt
  ↓
Updates Order:
  - status: "delivered" → "completed"
  - received: false → true
  - updatedAt: current timestamp
  ↓
Payload CMS automatically syncs
  ↓
Tenant sees ✓ in sidebar
```

## Field Mapping

| Display | Database Field | Type | Source |
|---------|---------------|------|--------|
| Order # | orderNumber | string | Auto-generated |
| Customer | user | relationship | Transaction.customer |
| Items | products[] | array | Transaction.products |
| Total | totalAmount | number | Transaction.totalAmount |
| Status | status | select | pending/shipped/delivered/completed |
| Received | received | checkbox | Customer confirmation |

## Key Features

### 1. **Real-time Sync**
- React Query automatically refetches on mutation
- Dashboard statistics update after order actions
- Order list refreshes after confirmation

### 2. **Data Consistency**
- Single source of truth (Orders collection)
- Both pages query same data
- Same OrderCard component used everywhere

### 3. **Access Control**
- Customers see only their orders (filter by `user`)
- Tenants see orders for their products
- Super admins see all orders

### 4. **Type Safety**
- Payload types regenerated after schema changes
- tRPC provides end-to-end type safety
- TypeScript catches mismatches at compile time

## Testing Checklist

- [ ] Verify payment creates orders with new schema
- [ ] Check orderNumber is auto-generated and unique
- [ ] My Account shows correct statistics
- [ ] My Orders displays all customer orders
- [ ] Filtering works (pending, shipped, delivered, completed)
- [ ] "I Received My Item" button appears for delivered orders
- [ ] Confirming receipt updates status to completed
- [ ] ✓ received checkbox appears in Payload CMS
- [ ] Tenant can update order status (shipped, delivered)
- [ ] Dashboard statistics update after confirmation

## Files Modified

1. ✅ `/src/collections/Orders.ts` - Added fields and hook
2. ✅ `/src/modules/admin/server/procedures.ts` - Updated order creation
3. ✅ `/src/modules/orders/server/procedures.ts` - Fixed queries
4. ✅ `/src/payload-types.ts` - Regenerated types

## Migration Notes

**Existing Orders**: May have old schema without:
- `orderNumber` - Will be `null` (should be manually assigned)
- `products` array - Will be empty (use singular `product` field)
- `totalAmount` - Will be `0` (use `amount` field)

**For Production**: Run migration script to backfill data if needed.

---

**Status**: ✅ Fixed  
**Last Updated**: October 23, 2025
