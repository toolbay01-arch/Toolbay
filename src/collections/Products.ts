import type { CollectionConfig } from "payload";

import { Tenant } from "@/payload-types";
import { isSuperAdmin } from "@/lib/access";

export const Products: CollectionConfig = {
  slug: "products",
  access: {
    create: ({ req }) => {
      if (isSuperAdmin(req.user)) return true;

      const tenant = req.user?.tenants?.[0]?.tenant as Tenant

      return Boolean(tenant?.isVerified);
    },
    read: ({ req }) => {
      if (isSuperAdmin(req.user)) return true;

      // For regular tenants, only show products they own
      const tenant = req.user?.tenants?.[0]?.tenant;
      if (tenant) {
        return {
          tenant: {
            equals: tenant,
          },
        };
      }

      return false;
    },
    update: ({ req }) => {
      if (isSuperAdmin(req.user)) return true;

      // For regular tenants, only allow updating their own products
      const tenant = req.user?.tenants?.[0]?.tenant;
      if (tenant) {
        return {
          tenant: {
            equals: tenant,
          },
        };
      }

      return false;
    },
    delete: ({ req }) => isSuperAdmin(req.user),
  },
  admin: {
    useAsTitle: "name",
    description: "You must verify your account before creating products",
    defaultColumns: ["name", "description", "price", "category", "tenant"],
    listSearchableFields: ["name", "description"],

  },
  hooks: {
    beforeChange: [
      ({ req, data }) => {
        console.log('[Products beforeChange] User:', req.user);
        console.log('[Products beforeChange] User tenants:', req.user?.tenants);
        console.log('[Products beforeChange] Data before:', data);
        
        // Auto-assign tenant for non-super-admin users
        if (!isSuperAdmin(req.user) && req.user?.tenants?.[0]?.tenant) {
          const userTenant = req.user.tenants[0].tenant;
          // Handle both string ID and object cases
          const tenantId = typeof userTenant === 'string' ? userTenant : userTenant.id;
          data.tenant = tenantId;
          console.log('[Products beforeChange] Assigned tenant ID:', tenantId);
        }
        
        console.log('[Products beforeChange] Data after:', data);
        return data;
      },
    ],
  },
  fields: [
    // Image first - eBay style
    {
      name: "image",
      type: "upload",
      relationTo: "media",
      required: true,
      admin: {
        description: "Main product image - this will be the first thing customers see",
      },
    },
    {
      name: "cover",
      type: "upload",
      relationTo: "media",
      admin: {
        description: "Additional product image (optional)",
      },
    },
    {
      name: "gallery",
      type: "array",
      maxRows: 24,
      admin: {
        description: "Product gallery - up to 24 photos and videos",
      },
      fields: [
        {
          name: "media",
          type: "upload",
          relationTo: "media",
          required: true,
        },
      ],
    },
    {
      name: "name",
      type: "text",
      required: true,
      admin: {
        placeholder: "Enter product name...",
      },
    },
    {
      name: "description",
      type: "richText",
      admin: {
        description: "Describe your product's key features and condition",
      },
    },
    {
      name: "price",
      type: "number",
      required: true,
      index: true, // Index for faster price filtering and sorting
      admin: {
        description: "Price in Rwandan Francs (RWF)",
        step: 100,
      }
    },
    {
      name: "category",
      type: "relationship",
      relationTo: "categories",
      hasMany: false,
      required: true,
      admin: {
        description: "Select the most appropriate category for your product",
      },
    },
    {
      name: "tags",
      type: "relationship",
      relationTo: "tags",
      hasMany: true,
      admin: {
        description: "Add tags to help customers find your product",
      },
    },
    {
      name: "tenant",
      type: "relationship",
      relationTo: "tenants",
      required: true,
      index: true, // Index for faster tenant-based filtering
      access: {
        // Only super admins can read/update tenant field directly
        read: ({ req }) => isSuperAdmin(req.user),
        update: ({ req }) => isSuperAdmin(req.user),
      },
      admin: {
        condition: (data, siblingData, { user }) => {
          // Only show tenant field to super admins
          return isSuperAdmin(user);
        },
        description: "Tenant who owns this product",
      },
    },
    {
      name: "refundPolicy",
      type: "select",
      options: ["30-day", "14-day", "7-day", "3-day", "1-day", "no-refunds"],
      defaultValue: "30-day",
    },
    {
      name: "content",
      type: "richText",
      admin: {
        description:
          "Protected content only visible to customers after purchase. Add product documentation, downloadable files, getting started guides, and bonus materials. Supports Markdown formatting"
      },
    },
    {
      name: "isPrivate",
      label: "Private",
      defaultValue: false,
      type: "checkbox",
      index: true, // Index for faster public/private filtering
      admin: {
        description: "If checked, this product will not be shown on the public storefront"
      },
    },
    {
      name: "isArchived",
      label: "Archive",
      defaultValue: false,
      type: "checkbox",
      index: true, // Index for faster archived/active product filtering
      admin: {
        description: "If checked, this product will be archived"
      },
    },
  ],
};
