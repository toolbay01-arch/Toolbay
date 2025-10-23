# Transaction Access Fix - 403 Error Resolution

## Issue Description
Customer was getting 403 Forbidden error when trying to:
1. Check transaction status (`transactions.getStatus`)
2. Submit MTN Transaction ID (`transactions.submitTransactionId`)

### Error Details
```
Failed to load resource: the server responded with a status of 403 (Forbidden)
TRPCClientError: Access denied
```

## Root Cause

**ALL** transaction-related procedures were failing access control checks because:

1. **Object vs String Comparison**: When Payload CMS fetches relationships, fields can be populated as **objects** instead of string IDs
2. **Incorrect Comparison Throughout Codebase**: 
   - `transaction.customer !== ctx.session.user.id` (comparing object to string)
   - `transaction.tenant === tenantId` (comparing object to string)
3. **Result**: Access checks always failed even for legitimate users!

## Solution

### Fixed Files & Line Numbers

#### 1. `/src/modules/transactions/server/procedures.ts`

**A. Fixed `submitTransactionId` (Line 27-32)**
```typescript
// BEFORE (BROKEN):
if (transaction.customer !== ctx.session.user.id) {
  throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
}

// AFTER (FIXED):
const customerId = typeof transaction.customer === 'string' 
  ? transaction.customer 
  : transaction.customer?.id;

if (customerId !== ctx.session.user.id) {
  throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
}
```

**B. Fixed `getStatus` (Line 96-101)**
```typescript
const customerId = typeof transaction.customer === 'string' 
  ? transaction.customer 
  : transaction.customer?.id;
const isCustomer = customerId === ctx.session.user.id;
```

**C. Fixed tenant ownership check (Line 115-120)**
```typescript
const transactionTenantId = typeof transaction.tenant === 'string' 
  ? transaction.tenant 
  : transaction.tenant?.id;
isTenantOwner = tenantIds.includes(transactionTenantId);
```

#### 2. `/src/modules/admin/server/procedures.ts`

**A. Fixed `verifyPayment` (Line 79-85)**
```typescript
// BEFORE (BROKEN):
const isOwner = transaction.tenant === tenantId;

// AFTER (FIXED):
const transactionTenantId = typeof transaction.tenant === 'string' 
  ? transaction.tenant 
  : transaction.tenant?.id;
const isOwner = transactionTenantId === tenantId;
```

**B. Fixed `rejectPayment` (Line 193-199)** - Same fix as above

### 3. Added Transaction Update Notification (Transactions.ts)
```typescript
afterChange: [
  async ({ doc, previousDoc, operation, req }) => {
    // Notify tenant when customer submits MTN Transaction ID
    if (operation === 'update' && doc.status === 'awaiting_verification' && previousDoc.status === 'pending') {
      req.payload.logger.info(
        `🔔 Payment awaiting verification: ${doc.paymentReference} - Customer ${doc.customerName} submitted MTN TX: ${doc.mtnTransactionId}`
      );
    }
  },
],
```

Tenants are now notified (via logs, can be enhanced with email) when a customer submits their transaction ID.

## Payment Flow Now Working

### Before Fix ❌
1. Customer submits TX ID → Transaction updated to `awaiting_verification`
2. Customer tries to check status → **403 Forbidden Error**
3. Tenant has no notification about pending verification

### After Fix ✅
1. Customer submits TX ID → Transaction updated to `awaiting_verification`
2. System logs notification for tenant: `🔔 Payment awaiting verification`
3. Customer can check status successfully
4. Tenant can see transaction in admin panel
5. Tenant verifies payment → Orders created

## Testing

### Test Transaction Access
```bash
bun run scripts/test-transaction-access.mjs
```

This will show recent transactions and their details.

### Test Specific Transaction
```bash
bun run scripts/test-transaction-access.mjs <transactionId>
```

## Related Files Modified

1. `/src/modules/transactions/server/procedures.ts` (Lines 90-115)
   - Fixed customer ID extraction
   - Improved tenant ownership check
   - Added error handling

2. `/src/collections/Transactions.ts` (Lines 273-286)
   - Added `afterChange` hook for notifications
   - Logs when transaction moves to awaiting_verification

## Next Steps

- [ ] Add email notifications to tenants when customer submits TX ID
- [ ] Create admin dashboard page to list pending verifications
- [ ] Add SMS notifications (optional)
- [ ] Create customer UI to show payment status in real-time

## Verification

To verify the fix works:

1. Create a new order (checkout with MoMo payment)
2. Submit MTN Transaction ID
3. Check browser console - should see no 403 errors
4. Check transaction status - should load successfully
5. Check server logs - should see notification message

**Status**: ✅ Fixed and deployed
