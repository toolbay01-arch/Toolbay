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
    hidden: ({ user }) => !isSuperAdmin(user),
  },
  auth: {
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
    {
      name: "tenants",
      type: "array",
      admin: {
        position: "sidebar",
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
    // Verification section for account page
    {
      name: "verificationSection",
      type: "ui",
      admin: {
        components: {
          Field: '@/components/admin/AccountVerificationSection',
        },
        condition: (data) => {
          // Only show for non-super-admin users
          return !data.roles?.includes('super-admin');
        },
      },
    },
  ],
};
