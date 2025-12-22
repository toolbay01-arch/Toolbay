import type { CollectionConfig } from 'payload'
// import { tenantsArrayField } from "@payloadcms/plugin-multi-tenant/fields";

import { isSuperAdmin } from '@/lib/access';

// Temporarily disable tenant array field
// const defaultTenantArrayField = tenantsArrayField({
//   tenantsArrayFieldName: "tenants",
//   tenantsCollectionSlug: "tenants",
//   tenantsArrayTenantFieldName: "tenant",
//   arrayFieldAccess: {
//     read: () => true,
//     create: ({ req }) => isSuperAdmin(req.user),
//     update: ({ req }) => isSuperAdmin(req.user),
//   },
//   tenantFieldAccess: {
//     read: () => true,
//     create: ({ req }) => isSuperAdmin(req.user),
//     update: ({ req }) => isSuperAdmin(req.user),
//   },
// })

export const Users: CollectionConfig = {
  slug: 'users',
  access: {
    read: () => true,
    create: ({ req }) => isSuperAdmin(req.user),
    delete: ({ req }) => isSuperAdmin(req.user),
    update: ({ req, id }) => {
      if (isSuperAdmin(req.user)) return true;

      return req.user?.id === id;
    }
  },
  admin: {
    useAsTitle: 'email',
    hidden: ({ user }) => {
      // Only super-admin and tenant users can access PayloadCMS admin
      // Client (buyer) users should not see or access the admin panel
      if (isSuperAdmin(user)) return false;
      if (user?.roles?.includes('tenant')) return false;
      return true; // Hide from clients and non-authenticated users
    },
  },
  auth: {
    tokenExpiration: 2592000, // 30 days in seconds (30 * 24 * 60 * 60)
    cookies: {
      sameSite: "Lax",
      secure: process.env.NODE_ENV === "production" && !process.env.NEXT_PUBLIC_APP_URL?.includes('localhost'),
      ...(process.env.NEXT_PUBLIC_ROOT_DOMAIN && !process.env.NEXT_PUBLIC_APP_URL?.includes('localhost') && {
        domain: process.env.NEXT_PUBLIC_ROOT_DOMAIN,
      }),
    }
  },
  fields: [
    {
      name: "username",
      required: true,
      unique: true,
      type: "text",
    },
    {
      admin: {
        position: "sidebar",
      },
      name: "roles",
      type: "select",
      defaultValue: ["tenant"],
      hasMany: true,
      options: ["super-admin", "tenant", "client"],
      access: {
        update: ({ req }) => isSuperAdmin(req.user),
      }
    },
    // Tenant relationship field (replacing multi-tenant plugin)
    // Only applicable to tenant and super-admin users
    // Client (buyer) users don't have tenant associations
    {
      name: "tenants",
      type: "array",
      admin: {
        position: "sidebar",
        condition: (data) => {
          // Only show tenants field for super-admin and tenant users
          // Hide for client users
          return !data.roles || !data.roles.includes('client');
        },
      },
      access: {
        read: () => true,
        create: ({ req }) => isSuperAdmin(req.user),
        update: ({ req }) => isSuperAdmin(req.user),
      },
      fields: [
        {
          name: "tenant",
          type: "relationship",
          relationTo: "tenants",
          required: true,
          access: {
            read: () => true,
            create: ({ req }) => isSuperAdmin(req.user),
            update: ({ req }) => isSuperAdmin(req.user),
          },
        },
      ],
    },
    // Email verification fields
    {
      name: "emailVerified",
      type: "checkbox",
      defaultValue: false,
      admin: {
        position: "sidebar",
        description: "Whether the user has verified their email address",
      },
      access: {
        create: () => false, // Never set on creation
        update: ({ req }) => isSuperAdmin(req.user), // Only super-admin can manually verify
      },
    },
    {
      name: "verificationToken",
      type: "text",
      admin: {
        hidden: true, // Hidden from UI, used internally
      },
      access: {
        read: () => false, // Never expose to API
        create: () => false,
        update: () => false,
      },
    },
    {
      name: "verificationExpires",
      type: "date",
      admin: {
        hidden: true, // Hidden from UI, used internally
      },
      access: {
        read: () => false, // Never expose to API
        create: () => false,
        update: () => false,
      },
    },
    // Verification section for account page
    // Only shown for tenant users (not clients or super-admins)
    {
      name: "verificationSection",
      type: "ui",
      admin: {
        components: {
          Field: '@/components/admin/AccountVerificationSection',
        },
        condition: (data) => {
          // Only show for tenant users who need verification
          // Hide for clients and super-admins
          return data.roles?.includes('tenant') && !data.roles?.includes('super-admin');
        },
      },
    },
  ],
};
