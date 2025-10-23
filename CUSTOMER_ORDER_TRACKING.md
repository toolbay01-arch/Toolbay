# Customer Order Tracking Implementation

## Overview
Complete implementation of customer-facing order tracking system where customers can view their order history and confirm receipt of delivered items.

## Components Created

### 1. UI Components (`/src/components/orders/`)

#### OrderStatusBadge.tsx
- Visual status badges for orders (pending, shipped, delivered, completed, cancelled)
- Color-coded with icons from lucide-react
- Responsive design using Tailwind CSS

#### ConfirmReceiptButton.tsx
- Interactive button with confirmation dialog
- Shows loading state during mutation
- Uses AlertDialog for confirmation UX
- Triggers order completion when customer confirms receipt

#### OrderCard.tsx
- Comprehensive order display card
- Shows:
  * Order number and creation date
  * Status badge
  * Product list with quantities and prices
  * Total amount
  * Shipping address
  * Order timeline (confirmed → shipped → delivered → completed)
  * Payment reference
- Conditionally displays "I Received My Item" button for delivered orders
- Uses shadcn/ui Card components

### 2. Backend tRPC Router (`/src/modules/orders/server/procedures.ts`)

#### `getMyOrders` Query
```typescript
Input: {
  status?: 'pending' | 'shipped' | 'delivered' | 'completed' | 'cancelled'
  limit: number (1-100, default: 20)
  page: number (default: 1)
}

Output: {
  orders: Order[]
  pagination: PaginationInfo
}
```

**Features:**
- Filters orders by authenticated user
- Optional status filtering
- Pagination support
- Populates products and transaction data (depth: 2)
- Returns formatted data with proper ID serialization

#### `confirmReceipt` Mutation
```typescript
Input: {
  orderId: string
}

Output: {
  success: boolean
  order: {
    id: string
    orderNumber: string
    status: string
    received: boolean
  }
}
```

**Validations:**
- User must be authenticated
- User must be the order customer
- Order must be in "delivered" status
- Cannot confirm if already received

**Actions:**
- Sets `received: true`
- Updates status to "completed"
- Updates `updatedAt` timestamp

### 3. Customer View Page

#### `/src/app/(app)/(home)/orders/page.tsx`
- Next.js 15 App Router page
- Server component wrapper

#### `/src/modules/orders/ui/views/orders-view.tsx`
- Client component with full order management UI
- Features:
  * Status filter tabs (all, pending, shipped, delivered, completed, cancelled)
  * Refresh button with loading state
  * Empty states for each filter
  * Pagination info display
  * Toast notifications for success/error
  * Auto-refresh after confirmation

**URL:** `http://localhost:3000/orders`

## Database Schema Updates

### Orders Collection (`/src/collections/Orders.ts`)

Added `received` field:
```typescript
{
  name: "received",
  type: "checkbox",
  defaultValue: false,
  admin: {
    description: "Customer confirmed receipt of order",
    readOnly: true,
    position: "sidebar",
  }
}
```

**Purpose:** Track when customer confirms receipt in Payload CMS admin
**Visibility:** Shows in sidebar as read-only checkbox
**Behavior:** Set to `true` when customer clicks "I Received My Item"

## Integration

### tRPC Router Registration (`/src/trpc/routers/_app.ts`)
```typescript
import { ordersRouter } from '@/modules/orders/server/procedures';

export const appRouter = createTRPCRouter({
  // ... other routers
  orders: ordersRouter,
});
```

## User Flow

### Customer Journey:
1. **Browse Orders:** Navigate to `/orders`
2. **Filter Status:** Use tabs to filter by order status
3. **View Details:** See complete order information in cards
4. **Track Progress:** View timeline of order stages
5. **Confirm Receipt:** Click "I Received My Item" when delivered
6. **Complete Order:** Confirm in dialog → Order marked as completed

### Tenant Journey (in Payload CMS):
1. Verify payment → Order created with status "pending"
2. Update status to "shipped" → Shows shippedAt timestamp
3. Update status to "delivered" → Customer can now confirm receipt
4. Customer confirms → `received` checkbox shows ✓ in sidebar
5. Order automatically moved to "completed" status

## Technical Details

### Access Control:
- Only authenticated users can access orders
- Users can only see their own orders
- Users can only confirm receipt for their own delivered orders

### Error Handling:
- Authentication errors
- Authorization errors (wrong customer)
- Status validation (must be delivered)
- Duplicate confirmation prevention
- Toast notifications for user feedback

### Performance:
- Pagination for large order lists
- Depth control (maxDepth: 2) for populated data
- Efficient filtering with MongoDB queries
- Query invalidation for real-time updates

### Type Safety:
- Full TypeScript coverage
- Generated Payload types after adding `received` field
- tRPC end-to-end type safety
- Proper BSON ID serialization

## Testing Checklist

- [ ] Customer can view all their orders at `/orders`
- [ ] Status filter tabs work correctly
- [ ] "I Received My Item" button appears only for delivered orders
- [ ] Confirmation dialog shows before marking complete
- [ ] Order updates to "completed" after confirmation
- [ ] `received` checkbox appears in Payload CMS
- [ ] Toast notifications work for success/error
- [ ] Pagination displays correctly
- [ ] Empty states show appropriate messages
- [ ] Refresh button updates order list

## Files Created/Modified

**Created:**
- `/src/components/orders/OrderStatusBadge.tsx`
- `/src/components/orders/ConfirmReceiptButton.tsx`
- `/src/components/orders/OrderCard.tsx`
- `/src/modules/orders/server/procedures.ts`
- `/src/modules/orders/ui/views/orders-view.tsx`
- `/src/app/(app)/(home)/orders/page.tsx`
- `/CUSTOMER_ORDER_TRACKING.md` (this file)

**Modified:**
- `/src/collections/Orders.ts` - Added `received` field
- `/src/trpc/routers/_app.ts` - Registered `ordersRouter`
- `/src/payload-types.ts` - Auto-generated types

## Next Steps

1. **Email Notifications:**
   - Send email when order status changes
   - Notify customer when delivered
   - Confirm receipt email to tenant

2. **SMS Notifications:**
   - Rwanda mobile alerts for status changes
   - Delivery confirmation reminders

3. **Order Reviews:**
   - Allow customers to review after completion
   - Link reviews to products

4. **Advanced Filtering:**
   - Date range filters
   - Search by order number
   - Sort options

5. **Order History Export:**
   - Download orders as PDF
   - Export to CSV

## Support

For issues or questions about the order tracking system:
- Check Payload CMS logs for backend errors
- Browser console for frontend errors
- Verify tRPC endpoints are accessible
- Ensure user is authenticated before accessing `/orders`
