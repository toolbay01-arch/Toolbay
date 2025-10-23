import type { CollectionConfig } from "payload";

import { isSuperAdmin } from "@/lib/access";
import type { Tenant } from "@/payload-types";

export const Orders: CollectionConfig = {
  slug: "orders",
  hooks: {
    beforeChange: [
      async ({ data, operation }) => {
        // Auto-generate orderNumber on create
        if (operation === 'create' && !data.orderNumber) {
          const timestamp = Date.now().toString().slice(-8);
          const random = Math.random().toString(36).substring(2, 6).toUpperCase();
          data.orderNumber = `ORD-${timestamp}-${random}`;
        }
        return data;
      }
    ]
  },
  access: {
    read: async ({ req }) => {
      // Super admin can see all orders
      if (isSuperAdmin(req.user)) return true;

      // Check if user has a tenant
      if (!req.user?.tenants || req.user.tenants.length === 0) {
        return false;
      }

      // Get tenant information
      const tenantRel = req.user.tenants[0];
      if (!tenantRel) return false;
      
      const tenantId = typeof tenantRel.tenant === 'string' ? tenantRel.tenant : tenantRel.tenant?.id;

      if (!tenantId) return false;

      // Fetch full tenant details to check verification status
      const tenant = await req.payload.findByID({
        collection: 'tenants',
        id: tenantId,
        depth: 0,
      }) as Tenant;

      // Only verified tenants (document_verified or physically_verified) can see orders
      if (!tenant.isVerified || 
          (tenant.verificationStatus !== 'document_verified' && 
           tenant.verificationStatus !== 'physically_verified')) {
        return false;
      }

      // Return query to only show orders for products belonging to this tenant
      // We need to fetch products first, then filter orders
      const products = await req.payload.find({
        collection: 'products',
        where: {
          tenant: {
            equals: tenantId,
          },
        },
        limit: 1000, // Adjust if needed
        depth: 0,
      });

      const productIds = products.docs.map(p => p.id);

      if (productIds.length === 0) {
        return false; // No products, no orders
      }

      // Return query to filter orders by product IDs
      return {
        product: {
          in: productIds,
        },
      };
    },
    create: ({ req }) => isSuperAdmin(req.user), // Only system/admin can create orders
    update: async ({ req }) => {
      // Super admin can update all orders
      if (isSuperAdmin(req.user)) return true;

      // Tenants can update their own orders (e.g., mark as shipped/delivered)
      if (!req.user?.tenants || req.user.tenants.length === 0) {
        return false;
      }

      const tenantRel = req.user.tenants[0];
      if (!tenantRel) return false;
      
      const tenantId = typeof tenantRel.tenant === 'string' ? tenantRel.tenant : tenantRel.tenant?.id;

      if (!tenantId) return false;

      // Check if tenant is verified
      const tenant = await req.payload.findByID({
        collection: 'tenants',
        id: tenantId,
        depth: 0,
      }) as Tenant;

      if (!tenant.isVerified || 
          (tenant.verificationStatus !== 'document_verified' && 
           tenant.verificationStatus !== 'physically_verified')) {
        return false;
      }

      // Get tenant's products
      const products = await req.payload.find({
        collection: 'products',
        where: { tenant: { equals: tenantId } },
        limit: 1000,
        depth: 0,
      });

      const productIds = products.docs.map(p => p.id);

      // Allow update only for orders of tenant's products
      return {
        product: {
          in: productIds,
        },
      };
    },
    delete: ({ req }) => isSuperAdmin(req.user), // Only super admin can delete orders
  },
  admin: {
    useAsTitle: "name",
    defaultColumns: ['orderNumber', 'user', 'status', 'totalAmount', 'createdAt'],
  },
  fields: [
    {
      name: "orderNumber",
      type: "text",
      required: true,
      unique: true,
      admin: {
        description: "Unique order reference number",
        readOnly: true,
      }
    },
    {
      name: "name",
      type: "text",
      required: true,
    },
    {
      name: "user",
      type: "relationship",
      relationTo: "users",
      required: true,
      hasMany: false,
      admin: {
        description: "Customer who placed the order"
      }
    },
    {
      name: "products",
      type: "array",
      required: true,
      fields: [
        {
          name: "product",
          type: "relationship",
          relationTo: "products",
          required: true,
        },
        {
          name: "quantity",
          type: "number",
          required: true,
          min: 1,
          defaultValue: 1,
        },
        {
          name: "priceAtPurchase",
          type: "number",
          required: true,
          admin: {
            description: "Price of the product at time of purchase"
          }
        }
      ]
    },
    {
      name: "product",
      type: "relationship",
      relationTo: "products",
      required: true,
      hasMany: false,
      admin: {
        description: "Main product (for backwards compatibility)"
      }
    },
    {
      name: "totalAmount",
      type: "number",
      required: true,
      admin: {
        description: "Total order amount in RWF"
      }
    },
    {
      name: "transaction",
      type: "relationship",
      relationTo: "transactions",
      hasMany: false,
      maxDepth: 0, // Prevent deep population to avoid circular reference with Transactions
      admin: {
        description: "Related verified transaction"
      }
    },
    {
      name: "status",
      type: "select",
      defaultValue: "pending",
      required: true,
      options: [
        { label: "Pending - Payment Verified", value: "pending" },
        { label: "Shipped - Item Sent", value: "shipped" },
        { label: "Delivered - Awaiting Confirmation", value: "delivered" },
        { label: "Completed - Customer Confirmed", value: "completed" },
        { label: "Cancelled", value: "cancelled" },
      ],
      admin: {
        description: "Order fulfillment status. Orders start as 'pending' after payment verification, then move through shipped → delivered → completed when customer confirms receipt.",
        components: {
          Cell: '@/components/admin/OrderStatusCell#OrderStatusCell',
        },
      }
    },
    {
      name: "confirmedAt",
      type: "date",
      admin: {
        description: "Date when customer confirmed receipt of item",
        condition: (data) => data.status === 'completed'
      }
    },
    {
      name: "shippedAt",
      type: "date",
      admin: {
        description: "Date when item was shipped",
        condition: (data) => ['shipped', 'delivered', 'completed'].includes(data.status)
      }
    },
    {
      name: "deliveredAt",
      type: "date",
      admin: {
        description: "Date when item was delivered",
        condition: (data) => ['delivered', 'completed'].includes(data.status)
      }
    },
    {
      name: "received",
      type: "checkbox",
      defaultValue: false,
      admin: {
        description: "Customer confirmed receipt of order",
        readOnly: true,
        position: "sidebar",
      }
    },
    {
      name: "transactionId",
      type: "text",
      required: true,
      admin: {
        description: "Transaction ID from mobile money or bank transfer"
      }
    },
    {
      name: "paymentMethod",
      type: "select",
      required: true,
      options: [
        { label: "Mobile Money", value: "mobile_money" },
        { label: "Bank Transfer", value: "bank_transfer" },
      ],
      admin: {
        description: "Payment method used for this transaction"
      }
    },
    {
      name: "bankName",
      type: "text",
      admin: {
        description: "Bank name or mobile money provider (MTN, Airtel, etc.)",
        condition: (data) => data.paymentMethod === 'bank_transfer' || data.paymentMethod === 'mobile_money'
      }
    },
    {
      name: "accountNumber",
      type: "text",
      admin: {
        description: "Bank account number or mobile money number",
        condition: (data) => data.paymentMethod === 'bank_transfer' || data.paymentMethod === 'mobile_money'
      }
    },
    {
      name: "amount",
      type: "number",
      required: true,
      admin: {
        description: "Transaction amount in Rwandan Francs (RWF)"
      }
    },
    {
      name: "currency",
      type: "text",
      defaultValue: "RWF",
      admin: {
        readOnly: true,
        description: "Currency (Rwandan Francs)"
      }
    },
  ],
};
