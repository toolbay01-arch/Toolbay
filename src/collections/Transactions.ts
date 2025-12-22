import type { CollectionConfig } from 'payload';

import { isSuperAdmin } from '@/lib/access';
import { sendPaymentNotification } from '@/lib/notifications/send-push';

// Helper function to generate payment reference
function generatePaymentReference(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let reference = 'PAY';
  for (let i = 0; i < 10; i++) {
    reference += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return reference;
}

export const Transactions: CollectionConfig = {
  slug: 'transactions',
  access: {
    read: ({ req }) => {
      if (isSuperAdmin(req.user)) return true;
      
      // Build OR query for tenant owners OR customers
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const queries: any[] = [];
      
      // Tenants can read their transactions
      if (req.user?.tenants && req.user.tenants.length > 0) {
        queries.push({
          tenant: {
            in: req.user.tenants.map((tenantRel) => 
              typeof tenantRel.tenant === 'string' ? tenantRel.tenant : tenantRel.tenant.id
            ),
          },
        });
      }
      
      // Customers can read their own transactions
      if (req.user?.id) {
        queries.push({
          customer: {
            equals: req.user.id,
          },
        });
      }
      
      if (queries.length > 0) {
        return {
          or: queries,
        };
      }
      
      return false;
    },
    create: () => true, // Allow creation (checkout system creates transactions programmatically)
    update: ({ req }) => {
      // Only admins and tenant owners can update
      return isSuperAdmin(req.user) || Boolean(req.user?.tenants?.length);
    },
    delete: ({ req }) => isSuperAdmin(req.user),
  },
  admin: {
    useAsTitle: 'paymentReference',
    description: 'Payment transactions pending verification - Transactions are created automatically through checkout',
    defaultColumns: ['paymentReference', 'customerName', 'status', 'totalAmount', 'verifyAction', 'createdAt'],
    pagination: {
      defaultLimit: 20,
    },
    // Prevent deep population in list view to avoid BSON errors with circular refs
    listSearchableFields: ['paymentReference', 'customerName', 'mtnTransactionId'],
    hidden: ({ user }) => {
      // Show to super admins
      if (isSuperAdmin(user)) return false;
      
      // Show to verified tenant owners
      if (user?.tenants && user.tenants.length > 0) return false;
      
      // Hide from regular customers and non-tenant users
      return true;
    },
    enableRichTextRelationship: false,
  },
  fields: [
    {
      name: 'paymentReference',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      access: {
        update: () => false, // Never allow updates to payment reference
      },
      admin: {
        description: 'Auto-generated payment reference (e.g., PAY1AB2C3D4E)',
        readOnly: true,
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: [
        { label: 'Pending Payment', value: 'pending' },
        { label: 'Awaiting Verification', value: 'awaiting_verification' },
        { label: 'Verified', value: 'verified' },
        { label: 'Rejected', value: 'rejected' },
        { label: 'Expired', value: 'expired' },
      ],
      index: true,
      admin: {
        description: 'Current status of the transaction',
      },
    },
    {
      name: 'verifyAction',
      type: 'ui',
      admin: {
        components: {
          Cell: '@/components/admin/TransactionActionCell#TransactionActionCell',
        },
      },
    },
    {
      name: 'customer',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
      maxDepth: 0, // Prevent deep population
      admin: {
        description: 'Customer who made the purchase',
      },
    },
    {
      name: 'customerName',
      type: 'text',
      required: true,
      admin: {
        description: 'Customer name for quick reference',
      },
    },
    {
      name: 'customerEmail',
      type: 'email',
      required: true,
      admin: {
        description: 'Customer email for notifications',
      },
    },
    {
      name: 'customerPhone',
      type: 'text',
      admin: {
        description: 'Phone number used for MoMo payment',
      },
    },
    {
      name: 'deliveryType',
      type: 'select',
      required: true,
      defaultValue: 'direct',
      options: [
        { label: 'Direct Payment (Pickup)', value: 'direct' },
        { label: 'Delivery', value: 'delivery' },
      ],
      admin: {
        description: 'Choose delivery or direct pickup. Direct orders skip shipping and allow immediate pickup confirmation after payment verification.',
      },
    },
    {
      name: 'shippingAddress',
      type: 'group',
      fields: [
        {
          name: 'line1',
          type: 'text',
          admin: {
            description: 'Address line 1',
          },
        },
        {
          name: 'city',
          type: 'text',
          admin: {
            description: 'City',
          },
        },
        {
          name: 'country',
          type: 'text',
          admin: {
            description: 'Country',
          },
        },
      ],
      admin: {
        description: 'Customer shipping address (required for delivery orders)',
        condition: (data) => data.deliveryType === 'delivery',
      },
    },
    {
      name: 'tenant',
      type: 'relationship',
      relationTo: 'tenants',
      required: true,
      index: true,
      maxDepth: 0, // Prevent deep population
      admin: {
        description: 'Store receiving the payment',
      },
    },
    {
      name: 'products',
      type: 'array',
      required: true,
      minRows: 1,
      fields: [
        {
          name: 'product',
          type: 'relationship',
          relationTo: 'products',
          required: true,
          maxDepth: 0, // Prevent deep population
        },
        {
          name: 'price',
          type: 'number',
          required: true,
          min: 0,
        },
        {
          name: 'quantity',
          type: 'number',
          required: true,
          defaultValue: 1,
          min: 1,
          admin: {
            description: 'Quantity purchased',
          },
        },
      ],
      admin: {
        description: 'Products in this transaction with quantities',
      },
    },
    {
      name: 'totalAmount',
      type: 'number',
      required: true,
      min: 0,
      access: {
        update: () => false, // Never allow updates to amounts
      },
      admin: {
        description: 'Total amount in RWF (tenant receives full amount)',
        readOnly: true,
      },
    },
    {
      name: 'platformFee',
      type: 'number',
      defaultValue: 0,
      min: 0,
      access: {
        update: () => false,
      },
      admin: {
        description: 'Platform fee (DEPRECATED - Always 0)',
        readOnly: true,
        condition: () => false, // Hide from UI
      },
    },
    {
      name: 'tenantAmount',
      type: 'number',
      defaultValue: 0,
      min: 0,
      access: {
        update: () => false,
      },
      admin: {
        description: 'Tenant amount (DEPRECATED - Same as totalAmount)',
        readOnly: true,
        condition: () => false, // Hide from UI
      },
    },
    {
      name: 'mtnTransactionId',
      type: 'text',
      index: true,
      access: {
        // Tenants can only read, not update the transaction ID
        update: ({ req }) => isSuperAdmin(req.user),
      },
      admin: {
        description: 'Mobile Money Transaction ID (from customer SMS) - Read-only for verification',
        placeholder: 'e.g., MP241021.1234.A56789',
        // Use condition to hide from edit, tenants view only in custom component
      },
    },
    {
      name: 'expiresAt',
      type: 'date',
      required: true,
      index: true,
      admin: {
        description: 'Transaction expires after 48 hours',
        date: {
          displayFormat: 'MMM dd yyyy h:mm a',
        },
      },
    },
    {
      name: 'verifiedAt',
      type: 'date',
      admin: {
        description: 'When the payment was verified',
        date: {
          displayFormat: 'MMM dd yyyy h:mm a',
        },
      },
    },
    {
      name: 'verifiedBy',
      type: 'relationship',
      relationTo: 'users',
      maxDepth: 0, // Prevent deep population
      admin: {
        description: 'Admin/Tenant who verified the payment',
      },
    },
    {
      name: 'rejectionReason',
      type: 'textarea',
      admin: {
        condition: (data) => data.status === 'rejected',
        description: 'Reason for rejection',
      },
    },
    // Temporarily disabled to avoid circular reference BSON errors
    // The Orders collection already has a transaction field, so we can query from there
    // {
    //   name: 'order',
    //   type: 'relationship',
    //   relationTo: 'orders',
    //   hasMany: false,
    //   maxDepth: 0, // Prevent deep population to avoid circular reference
    //   admin: {
    //     description: 'Created order after verification',
    //     readOnly: true,
    //   },
    // },
    {
      name: 'notes',
      type: 'textarea',
      admin: {
        description: 'Internal notes about this transaction',
      },
    },
    {
      name: 'viewedByTenant',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Whether the tenant has viewed this transaction',
      },
    },
    {
      name: 'relatedOrders',
      type: 'ui',
      admin: {
        components: {
          Field: '@/components/admin/TransactionOrdersField#TransactionOrdersField',
        },
        condition: (data) => data.status === 'verified', // Only show for verified transactions
      },
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, operation }) => {
        if (operation === 'create') {
          // Generate payment reference
          if (!data.paymentReference) {
            data.paymentReference = generatePaymentReference();
          }
          
          // Set expiry (48 hours from now)
          if (!data.expiresAt) {
            const expiryDate = new Date();
            expiryDate.setHours(expiryDate.getHours() + 48);
            data.expiresAt = expiryDate.toISOString(); // Convert to ISO string
          }
        }
        return data;
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, operation, req }) => {
        // Notify tenant when customer submits Mobile Money Transaction ID
        if (operation === 'update' && doc.status === 'awaiting_verification' && previousDoc.status === 'pending') {
          // TODO: Send notification to tenant
          // For now, just log it (can be enhanced with email/SMS later)
          req.payload.logger.info(
            `🔔 Payment awaiting verification: ${doc.paymentReference} - Customer ${doc.customerName} submitted Mobile Money TX: ${doc.mtnTransactionId}`
          );
          
          // You can add email notification here:
          // await req.payload.sendEmail({
          //   to: tenantEmail,
          //   subject: `New payment to verify: ${doc.paymentReference}`,
          //   html: `Customer ${doc.customerName} has submitted payment...`,
          // });
        }

        // Notify tenant when payment is successfully verified
        if (operation === 'update' && doc.status === 'verified' && previousDoc.status !== 'verified') {
          const tenantId = typeof doc.tenant === 'string' ? doc.tenant : doc.tenant?.id;
          
          if (tenantId) {
            sendPaymentNotification(
              tenantId,
              doc.totalAmount || 0,
              doc.paymentReference
            ).catch((error) => {
              // Log error but don't fail the transaction update
              req.payload.logger.error(`Failed to send payment notification: ${error}`);
            });
          }
        }
      },
    ],
  },
};
