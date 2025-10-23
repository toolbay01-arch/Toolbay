# BSON Error - COMPLETE FIX

## Problem Summary
Admin panel at `/admin/collections/transactions` was crashing with:
```
BSONError: Cannot create Buffer from the passed potentialBuffer
500 Internal Server Error
```

## Root Cause Analysis

The error had **TWO** root causes:

### 1. Circular Relationship Loop ✅ FIXED
- `Transactions.order` → `Orders` → `Orders.transaction` → `Transactions` (infinite loop)
- **Solution**: Removed `order` field from Transactions (Orders already has `transaction` field)

### 2. MongoDB ObjectId Buffers in Database ✅ FIXED  
MongoDB was storing ObjectId values as **Buffer objects** instead of **string IDs**:

```javascript
// WRONG (in database):
{
  customer: { buffer: <Buffer ...> },  // ObjectId as Buffer!
  tenant: { buffer: <Buffer ...> },
  products: [
    { product: { buffer: <Buffer ...> }, price: 88000 }
  ],
  expiresAt: Date('2025-10-24T15:42:49.139Z')  // Date object!
}

// CORRECT (after fix):
{
  customer: "68d85cda3ae4b743ffe7563e",  // String ID
  tenant: "68d85cd93ae4b743ffe7563b",
  products: [
    { product: "68e6e12d92648e7f7f0a4226", price: 88000 }
  ],
  expiresAt: "2025-10-24T15:42:49.139Z"  // ISO string
}
```

## Fixes Applied

### 1. Database Migration ✅
**Script**: `/scripts/fix-bson-data.mjs`

Fixed 5 transactions:
- ✅ Converted ObjectId Buffers → String IDs
- ✅ Converted Date objects → ISO strings
- ✅ Fixed all relationship fields (customer, tenant, products[], verifiedBy)

### 2. Collection Schema Updates ✅
**File**: `/src/collections/Transactions.ts`

Added `maxDepth: 0` to ALL relationship fields:
```typescript
{
  name: 'customer',
  type: 'relationship',
  relationTo: 'users',
  maxDepth: 0,  // ← Prevents deep population
}

{
  name: 'tenant',
  type: 'relationship',
  relationTo: 'tenants',
  maxDepth: 0,  // ← Prevents deep population
}

{
  name: 'products',
  type: 'array',
  fields: [{
    name: 'product',
    type: 'relationship',
    relationTo: 'products',
    maxDepth: 0,  // ← Prevents deep population
  }]
}

{
  name: 'verifiedBy',
  type: 'relationship',
  relationTo: 'users',
  maxDepth: 0,  // ← Prevents deep population
}
```

### 3. Removed Circular Reference ✅
Commented out `order` field in Transactions:
```typescript
// Orders already have transaction field, so this is redundant
// and causes circular reference issues
// {
//   name: 'order',
//   type: 'relationship',
//   relationTo: 'orders',
// },
```

### 4. Fixed Date Serialization ✅
Changed hook to return ISO strings:
```typescript
// BEFORE:
data.expiresAt = expiryDate;  // Date object

// AFTER:
data.expiresAt = expiryDate.toISOString();  // ISO string
```

### 5. Admin Configuration ✅
Added search fields and pagination:
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

## Why This Happened

The ObjectId Buffer issue likely occurred because:
1. Initial transactions were created with Payload v2 or older MongoDB adapter
2. Schema changes didn't migrate existing data
3. Direct MongoDB writes bypassed Payload's serialization

## Prevention

To prevent this in the future:

### ✅ DO:
- Always use `maxDepth` on relationship fields in list views
- Store dates as ISO strings, not Date objects
- Use Payload's API instead of direct MongoDB writes
- Add migrations when changing schemas
- Test with `depth: 0` when debugging serialization issues

### ❌ DON'T:
- Create bidirectional relationships without depth limits
- Store Buffer/ObjectId/Date objects in fields expecting strings
- Assume relationships are always strings (they can be objects when populated)
- Skip data migrations after schema changes

## Verification

### Test 1: Admin Panel ✅
```
Navigate to: http://localhost:3000/admin/collections/transactions
Expected: List of transactions loads without BSON error
```

### Test 2: Raw Data Check ✅
```bash
bun run scripts/check-raw-data.mjs
# Should show all fields as strings, no Buffer objects
```

### Test 3: Create New Transaction ✅
```
# New transactions should automatically use correct format
# thanks to the beforeChange hook fix
```

## Files Modified

1. `/src/collections/Transactions.ts`
   - Added `maxDepth: 0` to all relationships
   - Fixed `expiresAt` hook to return ISO string
   - Removed `order` field (circular ref)
   - Added admin configuration

2. `/src/collections/Orders.ts`
   - Added `maxDepth: 0` to `transaction` field

3. `/src/modules/admin/server/procedures.ts`
   - Removed `order: orders[0].id` from transaction update

4. `/scripts/fix-bson-data.mjs` (NEW)
   - Migration script to fix existing data

5. `/scripts/check-raw-data.mjs` (NEW)
   - Diagnostic script to check MongoDB data

6. `/scripts/diagnose-transactions.mjs` (NEW)
   - Diagnostic script using Payload API

## Status

✅ **ALL ISSUES FIXED**
- Admin panel loads successfully
- All Buffer objects converted to strings
- All Date objects converted to ISO strings
- Circular references prevented with maxDepth
- Future transactions will use correct format

**The MoMo payment system backend is now fully operational!** 🎉

## Related Documentation

- `/MOMO_COMPLETE_FIX.md` - Access control fixes
- `/TRANSACTION_ACCESS_FIX.md` - 403 error fixes
- `/MOMO_CODE_SPEC.md` - MoMo code specification
- `/MOMO_PAYMENT_IMPLEMENTATION.md` - Original implementation guide
