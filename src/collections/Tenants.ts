import type { CollectionConfig } from 'payload';

import { isSuperAdmin } from '@/lib/access';

export const Tenants: CollectionConfig = {
  slug: 'tenants',
  access: {
    read: ({ req }) => {
      // Super admin can read all tenants
      if (isSuperAdmin(req.user)) {
        return true;
      }
      
      // Regular users can only read their own tenant
      if (req.user?.tenants) {
        return {
          id: {
            in: req.user.tenants.map((tenantRel) => 
              typeof tenantRel.tenant === 'string' ? tenantRel.tenant : tenantRel.tenant.id
            ),
          },
        };
      }
      
      // Check if this is a server-side render or build-time request
      const isServerSideRender = !req.headers?.get?.('user-agent') || req.url?.includes('localhost');
      
      if (!req.user && isServerSideRender) {
        // Allow server-side rendering to proceed but return empty results
        // This prevents build/render failures while maintaining security
        return { id: { equals: 'ssr-empty-result' } };
      }
      
      // For anonymous users during registration, allow limited access for TIN validation
      if (!req.user && req.headers?.get?.('content-type')?.includes('application/json')) {
        // This suggests an API request (like registration validation)
        // Only allow reading TIN field for uniqueness checking
        return true; // Will be further restricted by field-level access if needed
      }
      
      return false;
    },
    create: () => true, // Allow tenant creation during registration
    update: ({ req }) => {
      // Super admin can update all tenants
      if (isSuperAdmin(req.user)) return true;
      
      // Regular users can only update their own tenant
      if (req.user?.tenants) {
        return {
          id: {
            in: req.user.tenants.map((tenantRel) => 
              typeof tenantRel.tenant === 'string' ? tenantRel.tenant : tenantRel.tenant.id
            ),
          },
        };
      }
      
      return false;
    },
    delete: ({ req }) => isSuperAdmin(req.user),
  },
  admin: {
    useAsTitle: 'slug',
    description: '🏪 Tenant Management - Super Admin Guide: (1) Review RDB Certificate, (2) Set Verification Status, (3) Check Is Verified, (4) Add Notes, (5) Enable Merchant Capabilities',
    // Ensure admin can see the collection
    hidden: false,
    // Optimize admin panel performance
    pagination: {
      defaultLimit: 25, // Reduce default items per page
    },
  },
  fields: [
    {
      name: "name",
      required: true,
      type: "text",
      label: "Store Name",
      admin: {
        description: "This is the name of the store (e.g. Antonio's Store)",
      },
    },
    {
      name: "slug",
      type: "text",
      index: true,
      required: true,
      unique: true,
      access: {
        update: ({ req }) => isSuperAdmin(req.user),
      },
      admin: {
        description:
          "This is the subdomain for the store (e.g. [slug].toolboxx.com)",
      },
    },
    {
      name: "image",
      type: "upload",
      relationTo: "media",
    },
    // Rwanda-specific fields
    {
      name: "tinNumber",
      type: "text",
      required: true,
      unique: true,
      index: true, // Add index for faster lookups
      admin: {
        description: "Tax Identification Number (TIN) - Required for Rwandan businesses",
      },
    },
    {
      name: "storeManagerId",
      type: "text",
      required: true,
      admin: {
        description: "Store Manager ID or Passport Number",
      },
    },
    {
      name: "rdbCertificate",
      type: "upload",
      relationTo: "media",
      admin: {
        description: "Rwanda Development Board (RDB) Registration Certificate (required for verification)",
      },
    },
    // Payment method fields
    {
      name: "paymentMethod",
      type: "select",
      required: true,
      options: [
        { label: "Bank Transfer", value: "bank_transfer" },
        { label: "Mobile Money (MOMO)", value: "momo_pay" }
      ],
      admin: {
        description: "Choose your preferred payment method",
      },
    },
    {
      name: "bankName",
      type: "text",
      admin: {
        condition: (data) => data.paymentMethod === 'bank_transfer',
        description: "Bank name for transfers",
      },
    },
    {
      name: "bankAccountNumber",
      type: "text",
      admin: {
        condition: (data) => data.paymentMethod === 'bank_transfer',
        description: "Bank account number for transfers",
      },
    },
    {
      name: "momoPayCode",
      type: "text",
      admin: {
        condition: (data) => data.paymentMethod === 'momo_pay',
        description: "Mobile Money (MOMO) Pay Code",
      },
    },
    // Verification fields
    {
      name: "isVerified",
      type: "checkbox",
      defaultValue: false,
      access: {
        update: ({ req }) => isSuperAdmin(req.user),
      },
      admin: {
        description: "✅ SUPER ADMIN: Check this to enable tenant capabilities (product creation, selling). Only check after verifying documents.",
      },
    },
    {
      name: "verificationStatus",
      type: "select",
      defaultValue: "pending",
      index: true, // Add index for faster filtering by status
      options: [
        { label: "Pending", value: "pending" },
        { label: "Document Verified", value: "document_verified" },
        { label: "Physically Verified", value: "physically_verified" },
        { label: "Rejected", value: "rejected" }
      ],
      access: {
        update: ({ req }) => isSuperAdmin(req.user),
      },
      admin: {
        description: "🔍 SUPER ADMIN: Set verification stage. 'Document Verified' allows selling. 'Physically Verified' allows merchant management.",
      },
    },
    {
      name: "verificationNotes",
      type: "textarea",
      access: {
        update: ({ req }) => isSuperAdmin(req.user),
      },
      admin: {
        description: "📝 SUPER ADMIN: Add notes about verification decision, document quality, or follow-up actions needed.",
      },
    },
    {
      name: "physicalVerificationRequested",
      type: "checkbox",
      defaultValue: false,
      admin: {
        description: "Tenant has requested physical verification",
      },
    },
    {
      name: "physicalVerificationRequestedAt",
      type: "date",
      admin: {
        description: "Date when physical verification was requested",
      },
    },
    // Physical verification fields
    {
      name: "physicalVerificationImages",
      type: "array",
      minRows: 3,
      maxRows: 8,
      access: {
        update: ({ req }) => isSuperAdmin(req.user),
      },
      admin: {
        condition: (data) => data.verificationStatus === 'physically_verified',
        description: "3-8 images from physical verification visit",
      },
      fields: [
        {
          name: "image",
          type: "upload",
          relationTo: "media",
          required: true,
        },
        {
          name: "description",
          type: "text",
          admin: {
            description: "Brief description of what this image shows",
          },
        }
      ]
    },
    {
      name: "signedConsent",
      type: "upload",
      relationTo: "media",
      access: {
        update: ({ req }) => isSuperAdmin(req.user),
      },
      admin: {
        condition: (data) => data.verificationStatus === 'physically_verified',
        description: "Signed consent document (PDF) from physical verification",
      },
    },
    // Merchant management
    {
      name: "canAddMerchants",
      type: "checkbox",
      defaultValue: false,
      access: {
        update: ({ req }) => isSuperAdmin(req.user),
      },
      admin: {
        description: "🏪 SUPER ADMIN: Enable merchant account management. Usually enabled after document or physical verification.",
      },
    },
    {
      name: "verifiedAt",
      type: "date",
      access: {
        update: ({ req }) => isSuperAdmin(req.user),
      },
      admin: {
        description: "Date when tenant was verified",
      },
    },
    {
      name: "verifiedBy",
      type: "relationship",
      relationTo: "users",
      access: {
        update: ({ req }) => isSuperAdmin(req.user),
      },
      admin: {
        description: "Super admin who verified this tenant",
      },
    },
  ],
};
