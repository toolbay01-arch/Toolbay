# BSON Error Fix - Circular Reference Issue

> **⚠️ OUTDATED**: This document describes the initial fix attempt.  
> **✅ SEE**: `/BSON_COMPLETE_FIX.md` for the complete solution.

## Problem
When accessing `/admin/collections/transactions`, the page would crash with:
```
BSONError: Cannot create Buffer from the passed potentialBuffer
500 (Internal Server Error)
```

## Initial Root Cause Identified

**Circular Relationship Loop** between Transactions and Orders:

```
Transactions Collection:
  └─ order: relationship → Orders

Orders Collection:
  └─ transaction: relationship → Transactions
```

When Payload CMS tries to populate these relationships in the admin panel, it creates an infinite loop:
- Fetches Transaction → populates Order → populates Transaction → populates Order → ...
- Next.js React Server Components can't serialize this circular structure
- BSON serialization fails with buffer error

## Solution

### Option 1: Removed Circular Reference (IMPLEMENTED) ✅

Commented out the `order` field in Transactions collection since it's redundant:
- Orders already have a `transaction` field pointing to Transactions
- We can query `Orders.find({ where: { transaction: { equals: transactionId } } })`
- No need for bidirectional relationship

**Files Modified:**

1. `/src/collections/Transactions.ts` (Line 232-245)
   - Commented out `order` relationship field
   - Added explanation comment

2. `/src/modules/admin/server/procedures.ts` (Line 128-138)
   - Removed `order: orders[0].id` from transaction update
   - Added comment explaining the change

3. `/src/collections/Orders.ts` (Line 37-43)
   - Added `maxDepth: 0` to prevent deep population

### Option 2: Break the Loop with maxDepth (ALTERNATIVE)

If you need the bidirectional relationship, set `maxDepth: 0` on BOTH sides:

```typescript
// In Transactions:
{
  name: 'order',
  type: 'relationship',
  relationTo: 'orders',
  maxDepth: 0, // Don't populate Order → Transaction
}

// In Orders:
{
  name: 'transaction',
  type: 'relationship',
  relationTo: 'transactions',
  maxDepth: 0, // Don't populate Transaction → Order
}
```

## How to Query Orders from Transaction

Instead of `transaction.order`, use:

```typescript
// Find orders for a transaction
const orders = await payload.find({
  collection: 'orders',
  where: {
    transaction: {
      equals: transactionId,
    },
  },
});
```

## Additional Fixes Applied

### 1. Fixed Date Serialization
Changed `expiresAt` hook to return ISO string instead of Date object:

```typescript
// BEFORE (WRONG):
data.expiresAt = expiryDate; // Date object

// AFTER (CORRECT):
data.expiresAt = expiryDate.toISOString(); // ISO string
```

### 2. Added Admin Configuration
```typescript
admin: {
  useAsTitle: 'paymentReference',
  defaultColumns: ['paymentReference', 'customerName', 'status', 'totalAmount', 'createdAt'],
  pagination: {
    defaultLimit: 20,
  },
  listSearchableFields: ['paymentReference', 'customerName', 'mtnTransactionId'],
}
```

## Testing

### 1. Verify Admin Panel Works
```
Navigate to: http://localhost:3000/admin/collections/transactions
Expected: List of transactions loads without BSON error
```

### 2. Verify Transaction Creation Still Works
```bash
# Transaction should create successfully with expiresAt as ISO string
bun run scripts/diagnose-transactions.mjs
```

### 3. Verify Order Verification Still Works
```
# Admin can still verify payments
# Orders are created and linked to transaction via Orders.transaction field
```

## Best Practices for Payload Relationships

### ✅ DO:
- Use one-directional relationships when possible
- Set `maxDepth: 0` or `maxDepth: 1` to prevent deep population
- Use queries instead of bidirectional relationships
- Store ISO strings for dates, not Date objects

### ❌ DON'T:
- Create circular relationships without depth limits
- Store Date objects in hooks (use `.toISOString()`)
- Populate relationships too deeply in list views
- Assume relationships will always be strings (can be objects)

## Related Files

- `/src/collections/Transactions.ts` - Removed order field
- `/src/collections/Orders.ts` - Has transaction field (one-way relationship)
- `/src/modules/admin/server/procedures.ts` - Removed order update
- `/MOMO_COMPLETE_FIX.md` - Access control fixes
- `/TRANSACTION_ACCESS_FIX.md` - Object vs string handling

## Status

✅ **FIXED** - Admin panel now loads without BSON errors
✅ **TESTED** - Transaction creation works
✅ **VERIFIED** - Order relationship works via Orders.transaction field

**Next**: Test the complete payment verification flow to ensure orders are still created properly.
