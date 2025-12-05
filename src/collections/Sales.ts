import type { CollectionConfig } from 'payload';

import { isSuperAdmin } from '@/lib/access';
import type { Tenant } from '@/payload-types';

export const Sales: CollectionConfig = {
  slug: 'sales',
  access: {
    // Only verified tenants can read their sales, super admin can read all
    read: async ({ req }) => {
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

      // Only verified tenants can see sales
      if (!tenant.isVerified || 
          (tenant.verificationStatus !== 'document_verified' && 
           tenant.verificationStatus !== 'physically_verified')) {
        return false;
      }

      // Return query to only show sales for this tenant
      return {
        tenant: {
          equals: tenantId,
        },
      };
    },
    // Only system (bypassing access control) can create sales
    create: ({ req }) => {
      // Allow system-level creates (req.user might be undefined for system creates)
      if (!req.user) return true;
      // Allow super admin
      if (isSuperAdmin(req.user)) return true;
      // Deny manual creation
      return false;
    },
    // No one can update sales - read-only
    update: () => false,
    // Only super admin can delete sales
    delete: ({ req }) => isSuperAdmin(req.user),
  },
  admin: {
    useAsTitle: 'saleNumber',
    description: 'Sales records are automatically created when orders are verified. Read-only for tenants.',
    defaultColumns: ['saleNumber', 'product', 'customer', 'quantity', 'totalAmount', 'status', 'createdAt'],
    hidden: ({ user }) => {
      // Show to super admins
      if (isSuperAdmin(user)) return false;
      
      // Show to verified tenant owners
      if (user?.tenants && user.tenants.length > 0) return false;
      
      // Hide from regular customers
      return true;
    },
  },
  hooks: {
    beforeChange: [
      async ({ data, operation }) => {
        // Auto-generate saleNumber on create
        if (operation === 'create' && !data.saleNumber) {
          const timestamp = Date.now().toString().slice(-8);
          const random = Math.random().toString(36).substring(2, 6).toUpperCase();
          data.saleNumber = `SALE-${timestamp}-${random}`;
        }
        return data;
      }
    ]
  },
  fields: [
    {
      name: 'saleNumber',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: {
        description: 'Unique sale reference number',
        readOnly: true,
      }
    },
    {
      name: 'tenant',
      type: 'relationship',
      relationTo: 'tenants',
      required: true,
      index: true,
      maxDepth: 0,
      admin: {
        description: 'Store that made this sale',
        readOnly: true,
      }
    },
    {
      name: 'product',
      type: 'relationship',
      relationTo: 'products',
      required: true,
      index: true,
      maxDepth: 2, // Changed from 1 to 2 to populate product image
      admin: {
        description: 'Product that was sold',
        readOnly: true,
      }
    },
    {
      name: 'order',
      type: 'relationship',
      relationTo: 'orders',
      required: true,
      maxDepth: 0,
      admin: {
        description: 'Related order',
        readOnly: true,
      }
    },
    {
      name: 'customer',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      maxDepth: 0,
      admin: {
        description: 'Customer who purchased',
        readOnly: true,
      }
    },
    {
      name: 'customerName',
      type: 'text',
      required: true,
      admin: {
        description: 'Customer name for quick reference',
        readOnly: true,
      }
    },
    {
      name: 'customerEmail',
      type: 'email',
      admin: {
        description: 'Customer email',
        readOnly: true,
      }
    },
    {
      name: 'quantity',
      type: 'number',
      required: true,
      defaultValue: 1,
      min: 1,
      admin: {
        description: 'Quantity sold',
        readOnly: true,
      }
    },
    {
      name: 'pricePerUnit',
      type: 'number',
      required: true,
      min: 0,
      admin: {
        description: 'Price per unit at time of sale (RWF)',
        readOnly: true,
      }
    },
    {
      name: 'totalAmount',
      type: 'number',
      required: true,
      min: 0,
      admin: {
        description: 'Total sale amount (RWF) - Tenant receives full amount',
        readOnly: true,
      }
    },
    {
      name: 'platformFee',
      type: 'number',
      defaultValue: 0,
      min: 0,
      admin: {
        description: 'Platform fee (DEPRECATED - Always 0)',
        readOnly: true,
        condition: () => false, // Hide from UI
      }
    },
    {
      name: 'netAmount',
      type: 'number',
      defaultValue: 0,
      min: 0,
      admin: {
        description: 'Net amount (DEPRECATED - Same as totalAmount)',
        readOnly: true,
        condition: () => false, // Hide from UI
      }
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: [
        { label: 'Pending - Payment Verified', value: 'pending' },
        { label: 'Shipped - Item Sent', value: 'shipped' },
        { label: 'Delivered - Awaiting Confirmation', value: 'delivered' },
        { label: 'Completed - Customer Confirmed', value: 'completed' },
        { label: 'Refunded', value: 'refunded' },
        { label: 'Cancelled', value: 'cancelled' },
      ],
      index: true,
      admin: {
        description: 'Sale status (synced from order)',
        readOnly: true,
      }
    },
    {
      name: 'paymentMethod',
      type: 'select',
      required: true,
      options: [
        { label: 'Mobile Money', value: 'mobile_money' },
        { label: 'Bank Transfer', value: 'bank_transfer' },
      ],
      admin: {
        description: 'Payment method used',
        readOnly: true,
      }
    },
    {
      name: 'transactionId',
      type: 'text',
      admin: {
        description: 'Payment transaction ID',
        readOnly: true,
      }
    },
    {
      name: 'shippedAt',
      type: 'date',
      admin: {
        description: 'Date when item was shipped',
        readOnly: true,
      }
    },
    {
      name: 'deliveredAt',
      type: 'date',
      admin: {
        description: 'Date when item was delivered',
        readOnly: true,
      }
    },
    {
      name: 'completedAt',
      type: 'date',
      admin: {
        description: 'Date when customer confirmed receipt',
        readOnly: true,
      }
    },
  ],
};
