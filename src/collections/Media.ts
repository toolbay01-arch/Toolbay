import { isSuperAdmin } from '@/lib/access'
import type { CollectionConfig } from 'payload'

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    read: () => true,
    // Allow super admins and tenants to delete media
    delete: ({ req }) => {
      // Super admins can delete anything
      if (isSuperAdmin(req.user)) {
        return true;
      }
      
      // Tenants can delete media (they need it for product management)
      if (req.user?.roles?.includes('tenant')) {
        return true;
      }
      
      return false;
    },
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
