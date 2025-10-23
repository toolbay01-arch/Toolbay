# Customer Dashboard Implementation

## Overview
Complete customer dashboard implementation that provides authenticated users with a centralized view of their account, orders, and shopping activity.

## Features Implemented

### 1. Dashboard Statistics
- **Total Orders**: Count of all orders placed
- **Pending Orders**: Orders awaiting shipment or in transit
- **Completed Orders**: Successfully delivered and confirmed orders
- **Total Spent**: Cumulative amount spent across all non-cancelled orders

### 2. Recent Orders Section
- Displays the 5 most recent orders
- Full order details with OrderCard component
- Quick access to confirm receipt for delivered items
- "View All" button to see complete order history

### 3. Quick Actions Sidebar
- **Shopping Actions**:
  - Browse All Products
  - View My Orders
- **Account Management**:
  - Account Settings (links to Payload admin)
- **Order Status Summary**:
  - Pending count
  - Completed count
  - Quick link to orders page

## Components Created

### UI Components

#### `/src/components/dashboard/StatCard.tsx`
Reusable statistics card component with:
- Title and icon
- Large value display
- Optional description
- Optional trend indicator (coming soon)

Props:
```typescript
{
  title: string
  value: string | number
  description?: string
  icon: LucideIcon
  trend?: {
    value: number
    isPositive: boolean
  }
}
```

#### `/src/components/dashboard/OrderStats.tsx`
Grid layout of 4 StatCard components showing:
- Total Orders (ShoppingBag icon)
- Pending Orders (Clock icon)
- Completed Orders (Package icon)
- Total Spent (TrendingUp icon)

### Views

#### `/src/modules/dashboard/ui/views/dashboard-view.tsx`
Main dashboard page component featuring:
- Header with welcome message
- Order statistics grid
- Two-column layout:
  - **Left (2/3)**: Recent orders with OrderCard components
  - **Right (1/3)**: Quick actions sidebar
- Loading states
- Empty states with call-to-action
- Responsive design (mobile, tablet, desktop)

## Backend Implementation

### tRPC Procedures

#### `getDashboardStats` Query
**Location**: `/src/modules/orders/server/procedures.ts`

**Input**: None (uses authenticated user from context)

**Output**:
```typescript
{
  totalOrders: number
  pendingOrders: number  // pending + shipped
  completedOrders: number
  totalSpent: number     // excludes cancelled orders
}
```

**Logic**:
- Fetches all orders for authenticated user
- Calculates statistics from order data
- Filters by status for counts
- Sums totalAmount for spending calculation

**Access Control**: Protected procedure (requires authentication)

## Routes

### `/my-account`
**File**: `/src/app/(app)/(home)/my-account/page.tsx`

**Access**: Authenticated customers only (non-tenant users)

**Note**: The `/dashboard` route is reserved for tenant store owners

**Features**:
- Server-side rendered wrapper
- Loads DashboardView client component
- Inherits layout from `(home)` group with Navbar

## Navigation Updates

### Main Navbar (`/src/modules/home/ui/components/navbar.tsx`)

**Changes**:
1. Created separate navigation item arrays:
   - `publicNavbarItems`: For non-authenticated users
   - `customerNavbarItems`: For authenticated users

2. **Customer Navigation Items**:
   ```typescript
   [
     { href: "/", children: "Home" },
     { href: "/dashboard", children: "Dashboard" },
     { href: "/orders", children: "My Orders" },
     { href: "/about", children: "About" },
     { href: "/contact", children: "Contact" },
   ]
   ```

3. **Dynamic Item Selection**:
   - Shows customer items when `session.data?.user` exists
   - Shows public items for guests
   - Mobile sidebar automatically uses correct items

4. **Primary Action Button**:
   - Super-admins → "Admin Panel" (/admin)
   - Regular users → "Dashboard" (/dashboard)

## User Flows

### New Customer Flow:
1. Sign up / Log in
2. Browse products → Make purchase
3. Click "Dashboard" in navbar
4. See welcome message and empty state
5. Click "Browse Products" to start shopping

### Existing Customer Flow:
1. Log in
2. Click "Dashboard" in navbar
3. View order statistics at a glance
4. See recent orders (last 5)
5. Use quick actions:
   - View all orders
   - Browse more products
   - Access account settings
6. Click "I Received My Item" on delivered orders
7. Navigate to "My Orders" for complete history

### Mobile Experience:
1. Tap hamburger menu
2. See Dashboard and My Orders in sidebar
3. Navigate to dashboard
4. Scroll through statistics and recent orders
5. Use quick action buttons

## Design Decisions

### Layout Structure:
- **Grid-based statistics**: 4 cards in responsive grid (1 col mobile, 2 col tablet, 4 col desktop)
- **Two-column main section**: 2/3 for content, 1/3 for sidebar on desktop
- **Stacked on mobile**: Full-width cards stack vertically

### Color Scheme:
- Status badges inherit from OrderStatusBadge component
- Stat cards use neutral muted colors
- Icons use muted-foreground color
- Primary action buttons use brand colors

### Loading States:
- Skeleton loaders for statistics
- Spinner for recent orders section
- Prevents layout shift during load

### Empty States:
- Large icon (Package)
- Clear messaging
- Call-to-action button
- Encourages first purchase

## Technical Details

### Data Fetching:
- Uses tRPC with React Query
- Parallel queries for stats and orders
- Automatic caching and refetching
- Error handling with toast notifications

### Performance:
- Statistics calculated server-side
- Recent orders limited to 5 items
- Shallow depth on order queries
- Pagination ready for future expansion

### Type Safety:
- Full TypeScript coverage
- Generated tRPC types
- Payload CMS type integration
- No `any` types (except where needed for flexibility)

### Accessibility:
- Semantic HTML structure
- ARIA labels on interactive elements
- Keyboard navigation support
- Screen reader friendly

## Integration Points

### With Orders System:
- Uses `getMyOrders` procedure for recent orders
- Uses `getDashboardStats` for statistics
- Shares OrderCard component
- Consistent status badges and styling

### With Navigation:
- Dynamic navbar items based on auth
- Consistent routing structure
- Mobile-responsive sidebar
- Role-based navigation (customer vs admin)

### With Authentication:
- Protected routes (requires login)
- Session-based user identification
- Automatic redirect for unauthenticated users

## Future Enhancements

### Phase 1: Enhanced Statistics
- [ ] Trend indicators (% change from last month)
- [ ] Charts and graphs (order volume over time)
- [ ] Favorite products section
- [ ] Recent transactions list

### Phase 2: Personalization
- [ ] Personalized product recommendations
- [ ] Recently viewed items
- [ ] Saved items / wishlist
- [ ] Quick reorder functionality

### Phase 3: Notifications
- [ ] Order status updates
- [ ] Delivery notifications
- [ ] Special offers and promotions
- [ ] Account activity alerts

### Phase 4: Advanced Features
- [ ] Download invoices
- [ ] Export order history
- [ ] Referral program tracking
- [ ] Loyalty points system

## Testing Checklist

### Dashboard Page
- [ ] Navigate to `/dashboard` while logged in
- [ ] See correct statistics (orders count and total spent)
- [ ] Recent orders display correctly (max 5)
- [ ] Empty state shows when no orders exist
- [ ] Quick actions navigate to correct pages
- [ ] Loading states display during fetch

### Navigation
- [ ] Logged out: See public nav items (Home, About, Features, Pricing, Contact)
- [ ] Logged in: See customer nav items (Home, Dashboard, My Orders, About, Contact)
- [ ] Desktop: Dashboard and My Orders appear in top nav
- [ ] Mobile: Dashboard and My Orders appear in sidebar menu
- [ ] Primary button shows "Dashboard" for customers
- [ ] Primary button shows "Admin Panel" for super-admins

### Statistics
- [ ] Total Orders matches actual order count
- [ ] Pending Orders includes pending + shipped statuses
- [ ] Completed Orders shows only completed status
- [ ] Total Spent excludes cancelled orders
- [ ] RWF currency format displays correctly

### Recent Orders
- [ ] Shows maximum 5 most recent orders
- [ ] Orders sorted by creation date (newest first)
- [ ] OrderCard displays all information correctly
- [ ] "I Received My Item" button works
- [ ] "View All" link goes to `/orders` page

### Responsive Design
- [ ] Mobile: Statistics stack vertically (1 column)
- [ ] Tablet: Statistics show in 2 columns
- [ ] Desktop: Statistics show in 4 columns
- [ ] Mobile: Main section and sidebar stack
- [ ] Desktop: Main section (2/3) and sidebar (1/3) side-by-side

## Files Created/Modified

**Created:**
- `/src/components/dashboard/StatCard.tsx`
- `/src/components/dashboard/OrderStats.tsx`
- `/src/modules/dashboard/ui/views/dashboard-view.tsx`
- `/src/app/(app)/(home)/dashboard/page.tsx`
- `/CUSTOMER_DASHBOARD.md` (this file)

**Modified:**
- `/src/modules/home/ui/components/navbar.tsx` - Added customer navigation items
- `/src/modules/orders/server/procedures.ts` - Added getDashboardStats procedure
- `/src/trpc/routers/_app.ts` - Orders router already registered

## URLs

- **Dashboard**: `http://localhost:3000/dashboard`
- **Orders**: `http://localhost:3000/orders`
- **Home**: `http://localhost:3000/`

## Support

For issues with the dashboard:
1. Check browser console for errors
2. Verify user is authenticated
3. Ensure orders exist in database for statistics
4. Check tRPC endpoint accessibility
5. Verify Payload CMS backend is running

## Notes

- Dashboard is only accessible to authenticated users
- Super-admins see "Admin Panel" button instead of "Dashboard"
- Empty states encourage first-time purchases
- Quick actions provide convenient navigation
- Mobile-first responsive design
- Fully integrated with existing order system
