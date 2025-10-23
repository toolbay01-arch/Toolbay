# Transactions Collection - Admin Visibility

## Change Summary

The **Transactions collection** is now **hidden from the admin sidebar** for non-super-admin users.

### Why Keep Transactions?

The Transactions collection is **critical** for the MoMo payment system:

```
Payment Flow:
1. Customer Checkout → Creates Transaction (status: pending)
2. Shows dial code: *182*8*1*828822*88000#
3. Customer pays & submits MTN TX ID → Updates Transaction (status: awaiting_verification)
4. Tenant verifies payment → Creates Orders + Updates Transaction (status: verified)
```

Without Transactions:
- ❌ Cannot track payment initiation
- ❌ Cannot store customer-submitted MTN Transaction IDs
- ❌ Cannot handle verification workflow
- ❌ Cannot link multiple orders to one payment

### Configuration

**File**: `/src/collections/Transactions.ts`

```typescript
admin: {
  hidden: ({ user }) => !user?.roles?.includes('super-admin'),
  // Only super-admins see this in the sidebar
}
```

### Visibility by Role

| User Role | Can See Transactions in Sidebar? | Can Access via API? |
|-----------|----------------------------------|---------------------|
| Customer | ❌ No | ✅ Yes (own transactions) |
| Tenant (document_verified) | ❌ No | ✅ Yes (their transactions) |
| Tenant (physically_verified) | ❌ No | ✅ Yes (their transactions) |
| Super Admin | ✅ Yes | ✅ Yes (all transactions) |

### Access via URL

Even when hidden from sidebar, super admins can still access:
- Direct URL: `http://localhost:3000/admin/collections/transactions`
- API: `/api/trpc/transactions.*`
- Dashboard widgets (if configured)

### What Tenants See

**Tenants (physically_verified) see**:
- ✅ Orders collection (their own orders only)
- ✅ Products collection (their own products)
- ✅ Other relevant collections

**Tenants do NOT see**:
- ❌ Transactions collection (hidden from sidebar)
- But can still create transactions via checkout
- But can still verify payments via verification page

### What Super Admins See

**Super Admins see everything**:
- ✅ Transactions collection (visible in sidebar)
- ✅ Orders collection (all orders)
- ✅ All other collections
- Full debugging and management capabilities

## Alternative: Completely Remove (NOT RECOMMENDED)

If you want to **completely remove** Transactions:

### ⚠️ Consequences:
1. MoMo payment flow will break
2. Cannot track payment verification
3. Must manually create orders
4. Lose payment audit trail

### Steps to Remove (if absolutely needed):
```typescript
// 1. Remove from payload.config.ts
collections: [
  // Transactions, // ← Comment out or remove
  Orders,
  // ...
]

// 2. Remove tRPC routers
// src/trpc/routers/_app.ts
export const appRouter = router({
  // transactions: transactionsRouter, // ← Remove
  // admin: adminRouter, // ← Remove if only for transactions
})

// 3. Update checkout flow to create Orders directly
// This requires major refactoring
```

## Recommended Approach ✅

**Keep Transactions collection** but **hide from sidebar**:

### Benefits:
- ✅ Payment flow continues to work
- ✅ Clean admin UI for tenants
- ✅ Super admins can still manage
- ✅ Audit trail preserved
- ✅ No code refactoring needed

### Implementation:
```typescript
// Already implemented above
hidden: ({ user }) => !user?.roles?.includes('super-admin')
```

## Testing

### Test 1: Tenant View
1. Login as physically_verified tenant (e.g., "leo")
2. Check sidebar - should NOT see "Transactions"
3. Should see "Orders" and "Products"

### Test 2: Super Admin View
1. Login as super-admin
2. Check sidebar - SHOULD see "Transactions"
3. Can access all collections

### Test 3: Payment Flow
1. Customer creates checkout
2. Transaction created (behind the scenes)
3. Customer submits TX ID
4. Tenant verifies → Orders created
5. Tenant sees new order in Orders collection ✅

## Status

✅ **IMPLEMENTED**
- Transactions collection hidden from non-super-admin sidebar
- Collection remains fully functional via API
- Super admins retain full access
- No breaking changes to payment flow

## Related Files

- `/src/collections/Transactions.ts` - Hidden configuration
- `/src/collections/Orders.ts` - Visible to physically_verified tenants
- `/ORDERS_ACCESS_CONTROL.md` - Orders visibility rules
- `/MOMO_COMPLETE_FIX.md` - Payment system documentation

## Next Steps

If you want to create a **custom verification dashboard** for tenants:
- Create `/admin/verify-payments` page
- Show pending transactions in a custom UI
- Allow verification without seeing full Transactions collection
- This gives tenants verification capability without collection access
