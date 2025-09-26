import type { CollectionConfig } from "payload";

import { isSuperAdmin } from "@/lib/access";

export const Orders: CollectionConfig = {
  slug: "orders",
  access: {
    read: ({ req }) => isSuperAdmin(req.user),
    create: ({ req }) => isSuperAdmin(req.user),
    update: ({ req }) => isSuperAdmin(req.user),
    delete: ({ req }) => isSuperAdmin(req.user),
  },
  admin: {
    useAsTitle: "name",
  },
  fields: [
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
    },
    {
      name: "product",
      type: "relationship",
      relationTo: "products",
      required: true,
      hasMany: false,
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
