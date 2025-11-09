# My Sales Feature

## Overview
The "My Sales" feature allows verified tenants (store owners) to view their sales history in a read-only format. Sales records are automatically created when orders are verified and completed.

## Architecture

### Collections

#### Sales Collection (`/src/collections/Sales.ts`)
- **Slug**: `sales`
- **Access Control**: 
  - **Read**: Verified tenants can only read their own sales; super admins can read all
  - **Create/Update/Delete**: Blocked for all users (system-managed only)
  
- **Fields**:
  - `saleNumber`: Auto-generated unique identifier (e.g., SALE-12345678-ABCD)
  - `tenant`: Reference to the tenant who made the sale
  - `product`: Reference to the sold product (depth: 1 for display)
  - `order`: Reference to the related order
  - `customer`: Reference to the customer
  - `customerName`: Customer name for quick reference
  - `customerEmail`: Customer email
  - `quantity`: Number of units sold
  - `pricePerUnit`: Price per unit at time of sale (RWF)
  - `totalAmount`: Total amount before platform fee (RWF)
  - `platformFee`: Platform fee (10%)
  - `netAmount`: Net amount for tenant (90%)
  - `status`: Synced from order (pending, shipped, delivered, completed, etc.)
  - `paymentMethod`: mobile_money or bank_transfer
  - `transactionId`: Payment transaction ID
  - `shippedAt`, `deliveredAt`, `completedAt`: Timestamps

### Data Flow

```
Order Created (after payment verification)
    ↓
Orders.afterChange Hook Triggered
    ↓
Sale Record Created Automatically
    ↓
Tenant Can View in "My Sales"
    ↓
Order Status Updated (shipped/delivered/completed)
    ↓
Sale Status Synced Automatically
```

### tRPC Procedures (`/src/modules/sales/server/procedures.ts`)

#### `sales.getMySales`
- **Input**: 
  - `cursor`: Page number for pagination
  - `limit`: Items per page (default: 8)
  - `search`: Search by sale number or customer name
  - `status`: Filter by sale status
- **Returns**: Paginated list of sales for current tenant
- **Access**: Protected (requires verified tenant)

#### `sales.getSaleById`
- **Input**: Sale ID
- **Returns**: Detailed sale information
- **Access**: Protected (tenant can only view their own sales)

#### `sales.getSalesStats`
- **Returns**: 
  - Total sales count
  - Total net revenue (after platform fees)
  - Total gross revenue (before fees)
  - Total platform fees
  - Average sale amount
  - Status counts breakdown
- **Access**: Protected (verified tenant only)

### UI Components

#### MySalesView (`/src/modules/sales/ui/views/my-sales-view.tsx`)
Main view component that:
- Checks authentication and tenant role
- Displays sales statistics
- Provides search and filter controls
- Renders sales grid

#### SalesStats (`/src/modules/sales/ui/components/sales-stats.tsx`)
Displays 4 stat cards:
1. **Total Sales**: All-time order count
2. **Net Revenue**: Revenue after platform fees
3. **Gross Revenue**: Total before fees
4. **Completed**: Number of confirmed deliveries

#### MySalesList (`/src/modules/sales/ui/components/my-sales-list.tsx`)
Grid display of sales with:
- Product image
- Sale number
- Customer name
- Quantity sold
- Gross amount, platform fee, net amount
- Status badge
- Sale date
- Infinite scroll pagination

### Routes

- **Page**: `/my-sales` (`/src/app/(app)/(home)/my-sales/page.tsx`)
- **Navigation**: Added to tenant navbar items
- **Access**: Only visible to logged-in tenants

## Usage

### For Tenants
1. Login as a tenant user
2. Click "My Sales" in the navigation
3. View sales statistics at the top
4. Browse sales in grid format
5. Search by sale number or customer name
6. Filter by status (pending, shipped, delivered, completed, etc.)
7. Sales are **READ-ONLY** - no create, update, or delete actions

### For Administrators
Sales are visible in the Payload CMS admin panel at `/admin/collections/sales` with:
- Full read access to all sales
- Ability to delete sales (if needed for corrections)
- All sales data is read-only for regular tenants

## Revenue Calculation

```javascript
Total Amount = Product Price × Quantity
Platform Fee = Total Amount × 10%
Net Amount = Total Amount - Platform Fee
```

Example:
- Product Price: 10,000 RWF
- Quantity: 5
- Total Amount: 50,000 RWF
- Platform Fee: 5,000 RWF (10%)
- Net Amount: 45,000 RWF (90%)

## Automated Sale Creation

Sales are automatically created by the `Orders.afterChange` hook when:
1. A new order is created (after payment verification)
2. Order status is updated (syncs to sale record)

The hook:
- Fetches product and user details
- Calculates amounts and fees
- Creates the sale record
- Logs success/failure
- Syncs status changes from orders to sales

## Security

- **Tenant Isolation**: Tenants can only see their own sales
- **Read-Only**: No manual creation, editing, or deletion by tenants
- **Verification Required**: Only verified tenants can access sales
- **Super Admin Override**: Super admins have full access

## Display Modes

The sales list supports both grid and card layouts:
- **Grid View**: 3 columns on desktop, 2 on tablet, 1 on mobile
- **Card Design**: Product image, sale details, revenue breakdown
- **Status Badges**: Color-coded status indicators
- **Responsive**: Optimized for all screen sizes

## Future Enhancements

Potential additions:
- Export sales data (CSV, PDF)
- Date range filtering
- Sales analytics charts
- Revenue trends over time
- Top-selling products report
- Customer insights
