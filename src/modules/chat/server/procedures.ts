import { z } from 'zod';
import { TRPCError } from '@trpc/server';

import { protectedProcedure, createTRPCRouter } from '@/trpc/init';
import type { User, Conversation, Message } from '@/payload-types';

export const chatRouter = createTRPCRouter({
  /**
   * Get all conversations for the current user
   */
  getConversations: protectedProcedure.query(async ({ ctx }) => {
    const conversations = await ctx.db.find({
      collection: 'conversations',
      where: {
        participants: {
          contains: ctx.session.user.id,
        },
      },
      depth: 2, // Include participant details and related product/order
      sort: '-lastMessageAt',
      limit: 50,
    });

    return conversations;
  }),

  /**
   * Get a specific conversation by ID
   */
  getConversation: protectedProcedure
    .input(
      z.object({
        conversationId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const conversation = await ctx.db.findByID({
        collection: 'conversations',
        id: input.conversationId,
        depth: 2,
      });

      // Verify user is participant
      const participantIds = (conversation.participants as User[]).map((p) => 
        typeof p === 'string' ? p : p.id
      );

      if (!participantIds.includes(ctx.session.user.id)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You are not a participant in this conversation',
        });
      }

      return conversation;
    }),

  /**
   * Get messages for a conversation
   */
  getMessages: protectedProcedure
    .input(
      z.object({
        conversationId: z.string(),
        limit: z.number().min(1).max(100).default(50),
        page: z.number().min(1).default(1),
      })
    )
    .query(async ({ ctx, input }) => {
      // First verify user is participant in the conversation
      const conversation = await ctx.db.findByID({
        collection: 'conversations',
        id: input.conversationId,
        depth: 0,
      });

      const participantIds = (conversation.participants as any as string[]);
      
      if (!participantIds.includes(ctx.session.user.id)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You are not a participant in this conversation',
        });
      }

      const messages = await ctx.db.find({
        collection: 'messages',
        where: {
          conversation: {
            equals: input.conversationId,
          },
        },
        depth: 2, // Include sender, receiver, and attachment details
        sort: '-createdAt',
        limit: input.limit,
        page: input.page,
      });

      return messages;
    }),

  /**
   * Send a new message
   */
  sendMessage: protectedProcedure
    .input(
      z.object({
        conversationId: z.string(),
        receiverId: z.string(),
        content: z.string().min(1).max(5000),
        attachments: z.array(z.string()).optional(), // Array of media IDs
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify conversation exists and user is participant
      const conversation = await ctx.db.findByID({
        collection: 'conversations',
        id: input.conversationId,
        depth: 0,
      });

      const participantIds = conversation.participants as any as string[];
      
      if (!participantIds.includes(ctx.session.user.id)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You are not a participant in this conversation',
        });
      }

      // Verify receiver is a participant
      if (!participantIds.includes(input.receiverId)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Receiver is not a participant in this conversation',
        });
      }

      // Create the message
      const message = await ctx.db.create({
        collection: 'messages',
        data: {
          conversation: input.conversationId,
          sender: ctx.session.user.id,
          receiver: input.receiverId,
          content: input.content,
          read: false,
          ...(input.attachments && input.attachments.length > 0 && {
            attachments: input.attachments.map((fileId) => ({
              file: fileId,
            })),
          }),
        },
      });

      // Update conversation metadata
      const currentUnreadCount = (conversation.unreadCount as any as Record<string, number>) || {};
      const updatedUnreadCount = {
        ...currentUnreadCount,
        [input.receiverId]: (currentUnreadCount[input.receiverId] || 0) + 1,
      };

      await ctx.db.update({
        collection: 'conversations',
        id: input.conversationId,
        data: {
          lastMessageContent: input.content.substring(0, 100),
          lastMessageAt: new Date().toISOString(),
          unreadCount: updatedUnreadCount,
        } as any,
      });

      return message;
    }),

  /**
   * Mark messages as read
   */
  markAsRead: protectedProcedure
    .input(
      z.object({
        conversationId: z.string(),
        messageIds: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify user is participant
      const conversation = await ctx.db.findByID({
        collection: 'conversations',
        id: input.conversationId,
        depth: 0,
      });

      const participantIds = conversation.participants as any as string[];
      
      if (!participantIds.includes(ctx.session.user.id)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You are not a participant in this conversation',
        });
      }

      // If specific message IDs provided, mark those
      // Otherwise mark all unread messages in the conversation where user is receiver
      const whereClause: any = input.messageIds
        ? {
            and: [
              { id: { in: input.messageIds } },
              { receiver: { equals: ctx.session.user.id } },
              { read: { equals: false } },
            ],
          }
        : {
            and: [
              { conversation: { equals: input.conversationId } },
              { receiver: { equals: ctx.session.user.id } },
              { read: { equals: false } },
            ],
          };

      // Find unread messages
      const unreadMessages = await ctx.db.find({
        collection: 'messages',
        where: whereClause,
        limit: 100,
      });

      // Update each message
      const updatePromises = unreadMessages.docs.map((message) =>
        ctx.db.update({
          collection: 'messages',
          id: message.id,
          data: {
            read: true,
            readAt: new Date().toISOString(),
          },
        })
      );

      await Promise.all(updatePromises);

      // Update conversation unread count
      const currentUnreadCount = (conversation.unreadCount as any as Record<string, number>) || {};
      const updatedUnreadCount = {
        ...currentUnreadCount,
        [ctx.session.user.id]: 0,
      };

      await ctx.db.update({
        collection: 'conversations',
        id: input.conversationId,
        data: {
          unreadCount: updatedUnreadCount,
        } as any,
      });

      return { success: true, markedCount: unreadMessages.docs.length };
    }),

  /**
   * Start a new conversation
   */
  startConversation: protectedProcedure
    .input(
      z.object({
        participantId: z.string(),
        productId: z.string().optional(),
        orderId: z.string().optional(),
        initialMessage: z.string().min(1).max(5000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if conversation already exists between these users
      const existingConversations = await ctx.db.find({
        collection: 'conversations',
        where: {
          and: [
            {
              participants: {
                contains: ctx.session.user.id,
              },
            },
            {
              participants: {
                contains: input.participantId,
              },
            },
          ],
        },
        limit: 1,
      });

      // If conversation exists, return it
      if (existingConversations.docs.length > 0) {
        const existing = existingConversations.docs[0];
        
        if (!existing) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Conversation data error',
          });
        }
        
        // If initial message provided, send it
        if (input.initialMessage) {
          await ctx.db.create({
            collection: 'messages',
            data: {
              conversation: existing.id,
              sender: ctx.session.user.id,
              receiver: input.participantId,
              content: input.initialMessage,
              read: false,
            },
          });

          // Update conversation metadata
          const currentUnreadCount = (existing.unreadCount as any as Record<string, number>) || {};
          await ctx.db.update({
            collection: 'conversations',
            id: existing.id,
            data: {
              lastMessageContent: input.initialMessage.substring(0, 100),
              lastMessageAt: new Date().toISOString(),
              unreadCount: {
                ...currentUnreadCount,
                [input.participantId]: (currentUnreadCount[input.participantId] || 0) + 1,
              },
            } as any,
          });
        }

        return existing;
      }

      // Get participant details for title
      const participant = await ctx.db.findByID({
        collection: 'users',
        id: input.participantId,
        depth: 0,
      });

      // Create new conversation
      const conversation = await ctx.db.create({
        collection: 'conversations',
        data: {
          participants: [ctx.session.user.id, input.participantId],
          title: `Chat with ${participant.username}`,
          status: 'active',
          ...(input.productId && { product: input.productId }),
          ...(input.orderId && { order: input.orderId }),
          unreadCount: {},
        } as any,
      });

      // Send initial message if provided
      if (input.initialMessage) {
        await ctx.db.create({
          collection: 'messages',
          data: {
            conversation: conversation.id,
            sender: ctx.session.user.id,
            receiver: input.participantId,
            content: input.initialMessage,
            read: false,
          },
        });

        // Update conversation metadata
        await ctx.db.update({
          collection: 'conversations',
          id: conversation.id,
          data: {
            lastMessageContent: input.initialMessage.substring(0, 100),
            lastMessageAt: new Date().toISOString(),
            unreadCount: {
              [input.participantId]: 1,
            },
          } as any,
        });
      }

      return conversation;
    }),

  /**
   * Get unread message count for current user
   */
  getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
    const conversations = await ctx.db.find({
      collection: 'conversations',
      where: {
        participants: {
          contains: ctx.session.user.id,
        },
      },
      depth: 0,
      limit: 100,
    });

    let totalUnread = 0;
    conversations.docs.forEach((conv) => {
      const unreadCount = (conv.unreadCount as any as Record<string, number>) || {};
      totalUnread += unreadCount[ctx.session.user.id] || 0;
    });

    return { totalUnread };
  }),

  /**
   * Archive a conversation
   */
  archiveConversation: protectedProcedure
    .input(
      z.object({
        conversationId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify user is participant
      const conversation = await ctx.db.findByID({
        collection: 'conversations',
        id: input.conversationId,
        depth: 0,
      });

      const participantIds = conversation.participants as any as string[];
      
      if (!participantIds.includes(ctx.session.user.id)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You are not a participant in this conversation',
        });
      }

      const updated = await ctx.db.update({
        collection: 'conversations',
        id: input.conversationId,
        data: {
          status: 'archived',
        } as any,
      });

      return updated;
    }),
});
