import type { CollectionConfig } from 'payload';

export const Messages: CollectionConfig = {
  slug: 'messages',
  access: {
    read: ({ req }) => {
      // Super admin can read all messages
      if (req.user?.roles?.includes('super-admin')) {
        return true;
      }

      // Users can only read messages where they are sender or receiver
      if (req.user) {
        return {
          or: [
            {
              sender: {
                equals: req.user.id,
              },
            } as any,
            {
              receiver: {
                equals: req.user.id,
              },
            } as any,
          ],
        } as any;
      }

      return false;
    },
    create: ({ req }) => {
      // Only authenticated users can send messages
      return Boolean(req.user);
    },
    update: ({ req }) => {
      // Users can only update their own sent messages (e.g., for read receipts)
      if (req.user?.roles?.includes('super-admin')) {
        return true;
      }

      if (req.user) {
        return {
          sender: {
            equals: req.user.id,
          },
        } as any;
      }

      return false;
    },
    delete: ({ req }) => {
      // Only super admin can delete messages
      return req.user?.roles?.includes('super-admin') || false;
    },
  },
  admin: {
    useAsTitle: 'content',
    defaultColumns: ['sender', 'receiver', 'content', 'read', 'createdAt'],
    hidden: ({ user }) => {
      // Hide from non-super-admin users in payload admin
      return !user?.roles?.includes('super-admin');
    },
  },
  fields: [
    {
      name: 'conversation',
      type: 'relationship',
      relationTo: 'conversations',
      required: true,
      index: true,
      admin: {
        description: 'The conversation this message belongs to',
      },
    },
    {
      name: 'sender',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
      admin: {
        description: 'User who sent the message',
      },
    },
    {
      name: 'receiver',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
      admin: {
        description: 'User who receives the message',
      },
    },
    {
      name: 'content',
      type: 'textarea',
      required: true,
      admin: {
        description: 'Message content',
      },
    },
    {
      name: 'attachments',
      type: 'array',
      maxRows: 5,
      admin: {
        description: 'Optional file attachments (max 5)',
      },
      fields: [
        {
          name: 'file',
          type: 'upload',
          relationTo: 'media',
          required: true,
        },
      ],
    },
    {
      name: 'read',
      type: 'checkbox',
      defaultValue: false,
      index: true,
      admin: {
        description: 'Whether the receiver has read this message',
      },
    },
    {
      name: 'readAt',
      type: 'date',
      admin: {
        description: 'When the message was read',
        condition: (data) => data.read === true,
      },
    },
  ],
  timestamps: true,
};
