import { isSuperAdmin } from '@/lib/access'
import type { CollectionConfig } from 'payload'

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    read: () => true,
    delete: ({ req }) => isSuperAdmin(req.user),
  },
  admin: {
    hidden: ({ user }) => !isSuperAdmin(user),
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: false, // Not required - we'll set defaults in the API
      admin: {
        description: 'Alternative text for accessibility (auto-generated if not provided)',
      },
    },
  ],
  upload: true,
}
