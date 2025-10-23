# Transaction and Order Workflow - Updated System

## 🔄 New Payment & Order Flow

### Phase 1: Customer Checkout & Payment
```
Customer adds products to cart
    ↓
Customer fills checkout form (email, phone, name, address)
    ↓
Transaction created (status: "pending")
    ↓
Customer receives dial code: *182*8*1*{MOMO_CODE}*{AMOUNT}#
    ↓
Customer pays via MTN Mobile Money
    ↓
Customer receives SMS with MTN Transaction ID
    ↓
Customer submits MTN Transaction ID
    ↓
Transaction updated (status: "awaiting_verification")
```

### Phase 2: Tenant Verifies Payment (Payload CMS)
```
Tenant logs into /admin/verify-payments
    ↓
Sees list of pending transactions
    ↓
Checks MTN MoMo dashboard for payment
    ↓
OPTION A: Payment Found
    ├─→ Clicks "Verify Payment"
    ├─→ Transaction status: "verified"
    ├─→ Orders created (status: "pending")
    └─→ Tenant revenue updated
    
OPTION B: Payment Not Found
    ├─→ Clicks "Reject Payment"
    ├─→ Transaction status: "rejected"
    └─→ No orders created
```

### Phase 3: Tenant Manages Order (Payload CMS) ⭐ NEW
```
Order created with status: "pending"
    ↓
Tenant updates to: "shipped"
    ├─→ Marks when item is sent
    └─→ shippedAt timestamp recorded
    ↓
Tenant updates to: "delivered"
    ├─→ Marks when item reaches customer
    └─→ deliveredAt timestamp recorded
    ↓
WAITING FOR CUSTOMER CONFIRMATION
    ↓
Customer clicks "I received my item" (Next.js app - future)
    ↓
Order status: "completed"
    ├─→ confirmedAt timestamp recorded
    └─→ Order cycle complete
```

## 📊 Collection Status Values

### Transactions Collection
| Status | Description | Who Updates |
|--------|-------------|-------------|
| `pending` | Customer has dial code but hasn't paid yet | System (automatic) |
| `awaiting_verification` | Customer submitted MTN TX ID | Customer |
| `verified` | Tenant confirmed payment in MTN dashboard | Tenant |
| `rejected` | Tenant couldn't find payment | Tenant |
| `expired` | 48 hours passed without verification | System (automatic) |

### Orders Collection ⭐ UPDATED
| Status | Description | Who Updates | When |
|--------|-------------|-------------|------|
| `pending` | Payment verified, awaiting shipment | System | After transaction verification |
| `shipped` | Item has been sent to customer | Tenant | When item is shipped |
| `delivered` | Item reached customer location | Tenant | When delivery confirmed |
| `completed` | Customer confirmed receipt | Customer | Customer clicks confirmation (future) |
| `cancelled` | Order was cancelled | Tenant/Admin | If needed |

## 🔐 Access Control

### Transactions Collection
- **Super Admin:** Can see all transactions
- **Verified Tenants** (document_verified OR physically_verified):
  - Can see their own transactions
  - Can verify/reject transactions
- **Customers:** Can see their own transactions only

### Orders Collection ⭐ UPDATED
- **Super Admin:** Can see and update all orders
- **Verified Tenants** (document_verified OR physically_verified):
  - Can READ orders for their products only
  - Can UPDATE orders (change status to shipped/delivered)
  - Cannot CREATE or DELETE orders
- **Customers:** Can see their own orders (future implementation)

## 🎯 Tenant Workflow in Payload CMS

### Step 1: Verify Payments
**URL:** `/admin/verify-payments`

**Actions:**
1. View list of transactions awaiting verification
2. Check MTN MoMo dashboard for each payment
3. For each transaction:
   - **Verify:** Enter MTN TX ID → Creates orders with "pending" status
   - **Reject:** Provide reason → No orders created

### Step 2: Manage Orders
**URL:** `/admin/collections/orders`

**View Filters:**
- All Orders
- Pending (awaiting shipment)
- Shipped (in transit)
- Delivered (awaiting customer confirmation)
- Completed (customer confirmed)
- Cancelled

**Update Actions:**
Tenant can update order status through the workflow:
```
pending → shipped → delivered → (wait for customer) → completed
```

**For each order, tenant can:**
1. **Mark as Shipped:**
   - Change status to "shipped"
   - System records `shippedAt` timestamp
   - (Future: Customer gets notification)

2. **Mark as Delivered:**
   - Change status to "delivered"
   - System records `deliveredAt` timestamp
   - (Future: Customer gets "Confirm Receipt" button)

3. **Mark as Cancelled:**
   - If order needs to be cancelled
   - (Future: Refund process)

## 📝 New Order Fields

### Tracking Fields (automatically set):
- `confirmedAt` (Date) - When customer confirmed receipt
- `shippedAt` (Date) - When item was shipped
- `deliveredAt` (Date) - When item was delivered

### Display Conditions:
- `shippedAt` shows when status is: shipped, delivered, or completed
- `deliveredAt` shows when status is: delivered or completed
- `confirmedAt` shows only when status is: completed

## 🚀 Future Implementation (Next.js - Customer Side)

### Customer Order Tracking Page
**URL:** `/orders` or `/my-orders`

**Features:**
1. **View Orders:**
   - List all orders with status
   - Filter by: pending, shipped, delivered, completed

2. **Track Order:**
   - See current status
   - View timeline: Paid → Shipped → Delivered → Confirmed
   - Estimated delivery date

3. **Confirm Receipt:**
   - "I received my item" button
   - Available when status = "delivered"
   - Updates order to "completed"
   - Records `confirmedAt` timestamp

4. **Contact Seller:**
   - If issues with order
   - Direct message to tenant

## 📊 Revenue & Analytics

### Tenant Revenue Tracking:
- Revenue is added when transaction is **verified**
- Revenue is NOT dependent on order completion
- This protects tenant from customers who don't confirm receipt

### Analytics (Future):
- Total orders by status
- Average time from shipped → delivered
- Average time from delivered → customer confirmation
- Order completion rate

## 🔄 Complete Example Flow

### Scenario: Customer "John" buys "Laptop" from tenant "Leo"

#### Step 1: Purchase (Customer)
- John adds Laptop (500,000 RWF) to cart
- Fills form: john@email.com, +250781234567, Kigali address
- Transaction #PAY123ABC created (status: pending)
- John dials: *182*8*1*828822*500000#
- Pays 500,000 RWF
- Receives MTN TX ID: MP241023.5678.A12345
- Submits TX ID in app
- Transaction status → awaiting_verification

#### Step 2: Verification (Tenant - Payload CMS)
- Leo logs into /admin/verify-payments
- Sees John's transaction (500,000 RWF)
- Opens MTN dashboard, finds payment
- Clicks "Verify Payment", enters: MP241023.5678.A12345
- **System creates:**
  - Order #1 for Laptop (status: "pending")
  - Transaction status → "verified"
  - Leo's revenue += 450,000 RWF (after 10% fee)

#### Step 3: Fulfillment (Tenant - Payload CMS)
- Leo goes to /admin/collections/orders
- Finds Order #1 (status: pending)
- Packages laptop, ships it
- Updates order status to "shipped"
- System records `shippedAt: 2025-10-23T10:30:00Z`

#### Step 4: Delivery (Tenant - Payload CMS)
- Laptop arrives at John's address
- Leo updates order status to "delivered"
- System records `deliveredAt: 2025-10-25T14:00:00Z`

#### Step 5: Confirmation (Customer - Future Next.js)
- John receives laptop
- Opens app, goes to "My Orders"
- Sees Order #1 (status: delivered)
- Clicks "I received my item" button
- Order status → "completed"
- System records `confirmedAt: 2025-10-25T16:30:00Z`
- **Order cycle complete! ✅**

## 🔧 Technical Changes Made

### 1. Orders Collection (`/src/collections/Orders.ts`)
```typescript
// Status field updated
status: {
  defaultValue: "pending", // Changed from "completed"
  options: [
    "pending",    // New: Initial status after payment verification
    "shipped",    // New: Tenant marked as shipped
    "delivered",  // New: Tenant marked as delivered
    "completed",  // Updated: Customer confirmed receipt
    "cancelled"   // Existing: Order cancelled
  ]
}

// New tracking fields
confirmedAt: Date
shippedAt: Date
deliveredAt: Date
```

### 2. Admin Procedures (`/src/modules/admin/server/procedures.ts`)
```typescript
// verifyPayment creates orders with "pending" status
status: "pending"  // Changed from "completed"
```

### 3. Access Control
```typescript
// Orders: Allow all verified tenants (not just physically_verified)
if (!tenant.isVerified || 
    (tenant.verificationStatus !== 'document_verified' && 
     tenant.verificationStatus !== 'physically_verified')) {
  return false
}

// Tenants can now UPDATE their orders
update: async ({ req }) => {
  // Tenant can update orders for their products
  return { product: { in: productIds } }
}
```

## ✅ Summary

**What Changed:**
1. ✅ Orders now created with "pending" status (not "completed")
2. ✅ Added order lifecycle: pending → shipped → delivered → completed
3. ✅ Added tracking timestamps: shippedAt, deliveredAt, confirmedAt
4. ✅ Tenants can update order status in Payload CMS
5. ✅ All verified tenants can access transactions and orders

**What's Next (Customer Side - Future):**
1. 🔜 Customer order tracking page in Next.js
2. 🔜 "Confirm Receipt" button for customers
3. 🔜 Order timeline visualization
4. 🔜 Email/SMS notifications for status changes
5. 🔜 Contact seller feature

**Current Tenant Experience:**
- Verify payments at: `/admin/verify-payments`
- Manage orders at: `/admin/collections/orders`
- Update status through Payload CMS admin panel
- Track order fulfillment manually

**Revenue Protection:**
- Tenant gets paid when transaction is verified
- Order completion is for tracking purposes
- No refunds triggered by order status changes
