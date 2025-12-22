import type { CollectionConfig } from 'payload';

export const PushSubscriptions: CollectionConfig = {
  slug: 'push-subscriptions',
  admin: {
    useAsTitle: 'endpoint',
    defaultColumns: ['user', 'endpoint', 'createdAt', 'isActive'],
  },
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false;
      // Super admins can read all
      if (user.roles?.includes('super-admin')) return true;
      // Users can only read their own subscriptions
      return {
        user: { equals: user.id },
      };
    },
    create: ({ req: { user } }) => !!user,
    update: ({ req: { user } }) => {
      if (!user) return false;
      if (user.roles?.includes('super-admin')) return true;
      return {
        user: { equals: user.id },
      };
    },
    delete: ({ req: { user } }) => {
      if (!user) return false;
      if (user.roles?.includes('super-admin')) return true;
      return {
        user: { equals: user.id },
      };
    },
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
    },
    {
      name: 'endpoint',
      type: 'text',
      required: true,
      unique: true,
    },
    {
      name: 'keys',
      type: 'group',
      fields: [
        {
          name: 'p256dh',
          type: 'text',
          required: true,
        },
        {
          name: 'auth',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      name: 'userAgent',
      type: 'text',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      index: true,
    },
  ],
};
