import type { CollectionConfig } from 'payload';

export const Conversations: CollectionConfig = {
  slug: 'conversations',
  access: {
    read: ({ req }) => {
      // Super admin can read all conversations
      if (req.user?.roles?.includes('super-admin')) {
        return true;
      }

      // Users can only read conversations they're part of
      if (req.user) {
        return {
          participants: {
            contains: req.user.id,
          },
        } as any;
      }

      return false;
    },
    create: ({ req }) => {
      // Only authenticated users can create conversations
      return Boolean(req.user);
    },
    update: ({ req }) => {
      // Super admin can update all
      if (req.user?.roles?.includes('super-admin')) {
        return true;
      }

      // Users can only update conversations they're part of
      if (req.user) {
        return {
          participants: {
            contains: req.user.id,
          },
        } as any;
      }

      return false;
    },
    delete: ({ req }) => {
      // Only super admin can delete conversations
      return req.user?.roles?.includes('super-admin') || false;
    },
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'participants', 'status', 'updatedAt'],
    hidden: ({ user }) => {
      // Hide from non-super-admin users in payload admin
      return !user?.roles?.includes('super-admin');
    },
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      admin: {
        description: 'Optional conversation title (auto-generated if empty)',
      },
    },
    {
      name: 'participants',
      type: 'relationship',
      relationTo: 'users',
      hasMany: true,
      required: true,
      minRows: 2,
      maxRows: 2, // One-to-one conversations only for now
      index: true,
      admin: {
        description: 'Users participating in this conversation',
      },
    },
    {
      name: 'product',
      type: 'relationship',
      relationTo: 'products',
      hasMany: false,
      admin: {
        description: 'Product this conversation is about (optional)',
      },
    },
    {
      name: 'order',
      type: 'relationship',
      relationTo: 'orders',
      hasMany: false,
      admin: {
        description: 'Order this conversation is about (optional)',
      },
    },
    {
      name: 'lastMessageContent',
      type: 'text',
      admin: {
        description: 'Preview of the last message',
        readOnly: true,
      },
    },
    {
      name: 'lastMessageAt',
      type: 'date',
      admin: {
        description: 'Timestamp of last message',
        readOnly: true,
      },
    },
    {
      name: 'unreadCount',
      type: 'json',
      admin: {
        description: 'Unread message count per user { [userId]: count }',
        readOnly: true,
      },
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'active',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Archived', value: 'archived' },
        { label: 'Blocked', value: 'blocked' },
      ],
      admin: {
        description: 'Conversation status',
      },
    },
  ],
  timestamps: true,
};
