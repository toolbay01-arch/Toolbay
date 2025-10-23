# Leo Orders Issue - Resolution Guide

## 🔍 Issue Analysis

**Date:** October 22, 2025

### Current Situation:
- ✅ Leo tenant exists (ID: `68d85cd93ae4b743ffe7563b`)
- ✅ Leo is **physically_verified** (can see orders)
- ✅ Leo has 1 product: "new product" (88,000 RWF)
- ✅ There are **2 transactions awaiting verification** for Leo
- ❌ **0 orders exist in the system**

### Why Leo Doesn't See Orders:

**Orders are NOT created until the tenant verifies the payment!**

The payment flow works like this:

```
Customer Checkout
    ↓
Transaction Created (status: "pending")
    ↓
Customer Pays & Submits MTN TX ID
    ↓
Transaction Updated (status: "awaiting_verification")
    ↓
🛑 WAITING HERE - Leo needs to verify! 🛑
    ↓
Leo Verifies in /admin/verify-payments
    ↓
Orders Created (one per product)
    ↓
✅ Leo can now see orders in /admin/orders
```

## 📊 Current Pending Transactions for Leo:

### Transaction 1:
- **Reference:** PAYNLE2J72DAS
- **Customer:** Lionel MUHIRE (muhirelionel@gmail.com)
- **Phone:** +250784863317
- **Amount:** 88,000 RWF
- **Platform Fee:** 8,800 RWF
- **Leo Gets:** 79,200 RWF
- **MTN TX ID Submitted:** 555555
- **Status:** ⏳ awaiting_verification

### Transaction 2:
- **Reference:** PAYOV2VIVZY19
- **Customer:** leo (leo@mail.com)
- **Amount:** 88,000 RWF
- **Platform Fee:** 8,800 RWF
- **Leo Gets:** 79,200 RWF
- **MTN TX ID Submitted:** 888888888888
- **Status:** ⏳ awaiting_verification

**Total Pending Revenue for Leo:** 158,400 RWF (after platform fees)

## ✅ Solution: How Leo Should Verify Payments

### Step 1: Access the Verification Dashboard
1. Log in to admin panel: `http://localhost:3000/admin`
2. Navigate to: `http://localhost:3000/admin/verify-payments`

### Step 2: Review Pending Transactions
You will see 2 transactions waiting for verification with:
- Customer details
- Products ordered
- Amount breakdown
- Customer's submitted MTN Transaction ID

### Step 3: Verify in MTN Dashboard
1. Click the "Open MTN MoMo Dashboard" link
2. Log in to MTN: `https://www.mtn.rw/momo-dashboard`
3. Check your transaction history for the amounts:
   - 88,000 RWF from Lionel MUHIRE
   - 88,000 RWF from leo

### Step 4: Approve or Reject
For each transaction:

**If payment is confirmed in MTN:**
1. Enter the MTN Transaction ID (555555 or 888888888888)
2. Click "Verify Payment" button
3. ✅ **Orders will be created automatically**
4. ✅ Revenue will be added to your tenant account

**If payment is NOT found:**
1. Click "Reject Payment" button
2. Enter rejection reason (e.g., "Payment not found in MTN dashboard")
3. Customer will be notified

### Step 5: Check Orders
After verification:
1. Go to: `http://localhost:3000/admin/collections/orders`
2. You will now see 2 new orders (one per product)
3. Each order links to the verified transaction

## 🔐 Access Control Verification

Leo's access is correctly configured:

### ✅ Can Access Orders Collection:
- Leo is `physically_verified` ✅
- Access control checks: `verificationStatus === 'physically_verified'` ✅
- Orders filtered by Leo's products ✅

### ✅ Can Access Verify Payments Dashboard:
- Route: `/admin/verify-payments` ✅
- tRPC endpoint: `admin.getPendingTransactions` ✅
- Shows only Leo's tenant transactions ✅

### ✅ Can Verify Payments:
- tRPC endpoint: `admin.verifyPayment` ✅
- Creates orders automatically ✅
- Updates tenant revenue ✅

## 🧪 Test Commands

### Check all orders and transactions:
```bash
bun run scripts/check-all-orders.mjs
```

### Check Leo's pending transactions:
```bash
bun run scripts/check-leo-user.mjs
```

### After verification, check orders:
```bash
bun run scripts/check-all-orders.mjs
# Should now show 2 orders for Leo tenant
```

## 📝 Expected Result After Verification

### Before:
- Orders: 0
- Transactions awaiting verification: 2
- Leo's total revenue: 0 RWF

### After Leo verifies both payments:
- Orders: 2 ✅
- Transactions verified: 2 ✅
- Leo's total revenue: 158,400 RWF ✅

Each order will contain:
- Product: "new product"
- Price: 88,000 RWF
- Customer info
- Transaction reference
- Status: "completed"

## 🎯 Summary

**The system is working correctly!** 

Orders don't exist yet because they are only created AFTER the tenant verifies the payment. This is the intended manual MTN MoMo verification workflow:

1. Customer pays → Transaction created
2. **Tenant must verify** → Orders created
3. Then tenant can see orders

Leo just needs to log in and verify the 2 pending transactions at `/admin/verify-payments`.

---

**Next Steps for Leo:**
1. Log in: http://localhost:3000/admin
2. Go to: http://localhost:3000/admin/verify-payments
3. Verify the 2 pending payments (total: 176,000 RWF)
4. Receive: 158,400 RWF (after 10% platform fee)
5. See orders appear in: http://localhost:3000/admin/collections/orders
