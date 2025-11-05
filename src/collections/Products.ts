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
        
        // Auto-calculate stock status based on quantity
        const quantity = data.quantity ?? 0;
        const lowStockThreshold = data.lowStockThreshold ?? 10;
        const allowBackorder = data.allowBackorder ?? false;
        
        if (quantity === 0) {
          data.stockStatus = allowBackorder ? 'pre_order' : 'out_of_stock';
        } else if (quantity <= lowStockThreshold) {
          data.stockStatus = 'low_stock';
        } else {
          data.stockStatus = 'in_stock';
        }
        
        console.log('[Products beforeChange] Stock status:', data.stockStatus, 'Quantity:', quantity);
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
      name: "quantity",
      type: "number",
      required: true,
      defaultValue: 0,
      min: 0,
      index: true, // Index for stock queries
      admin: {
        description: "Available quantity in stock",
        step: 1,
        position: "sidebar",
      }
    },
    {
      name: "unit",
      type: "select",
      required: true,
      defaultValue: "unit",
      options: [
        { label: "Unit(s)", value: "unit" },
        { label: "Piece(s)", value: "piece" },
        { label: "Box(es)", value: "box" },
        { label: "Pack(s)", value: "pack" },
        { label: "Bag(s)", value: "bag" },
        { label: "Kilogram(s)", value: "kg" },
        { label: "Gram(s)", value: "gram" },
        { label: "Meter(s)", value: "meter" },
        { label: "Centimeter(s)", value: "cm" },
        { label: "Liter(s)", value: "liter" },
        { label: "Square Meter(s)", value: "sqm" },
        { label: "Cubic Meter(s)", value: "cbm" },
        { label: "Set(s)", value: "set" },
        { label: "Pair(s)", value: "pair" },
        { label: "Roll(s)", value: "roll" },
        { label: "Sheet(s)", value: "sheet" },
        { label: "Carton(s)", value: "carton" },
        { label: "Pallet(s)", value: "pallet" },
      ],
      admin: {
        description: "Unit of measurement for this product",
        position: "sidebar",
      }
    },
    {
      name: "minOrderQuantity",
      type: "number",
      defaultValue: 1,
      min: 1,
      admin: {
        description: "Minimum quantity that can be ordered at once",
        step: 1,
        position: "sidebar",
      }
    },
    {
      name: "maxOrderQuantity",
      type: "number",
      min: 1,
      admin: {
        description: "Maximum quantity per order (leave empty for no limit)",
        step: 1,
        position: "sidebar",
        condition: (data) => data.quantity > 0,
      }
    },
    {
      name: "stockStatus",
      type: "select",
      required: true,
      defaultValue: "in_stock",
      options: [
        { label: "In Stock", value: "in_stock" },
        { label: "Low Stock", value: "low_stock" },
        { label: "Out of Stock", value: "out_of_stock" },
        { label: "Pre-Order", value: "pre_order" },
      ],
      index: true,
      admin: {
        description: "Current stock availability status",
        position: "sidebar",
        readOnly: true, // Auto-calculated based on quantity
      }
    },
    {
      name: "lowStockThreshold",
      type: "number",
      defaultValue: 10,
      min: 0,
      admin: {
        description: "Alert when stock falls below this number",
        step: 1,
        position: "sidebar",
      }
    },
    {
      name: "allowBackorder",
      type: "checkbox",
      defaultValue: false,
      admin: {
        description: "Allow customers to order even when out of stock",
        position: "sidebar",
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
