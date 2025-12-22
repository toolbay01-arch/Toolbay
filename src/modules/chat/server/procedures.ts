import { z } from 'zod';
import { TRPCError } from '@trpc/server';

import { protectedProcedure, createTRPCRouter } from '@/trpc/init';
import type { User, Conversation, Message } from '@/payload-types';
import { sendMessageNotification } from '@/lib/notifications/send-push';

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
      depth: 1, // Reduced from 2 to 1 - only populate direct relationships
      sort: '-lastMessageAt',
      limit: 50,
    });

    return conversations;
  }),

  /**
   * Get a specific conversation by ID with messages in one query
   */
  getConversation: protectedProcedure
    .input(
      z.object({
        conversationId: z.string(),
        includeMessages: z.boolean().optional().default(true),
        messageLimit: z.number().min(1).max(100).optional().default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      // Fetch conversation and messages in parallel for speed
      const [conversation, messages] = await Promise.all([
        ctx.db.findByID({
          collection: 'conversations',
          id: input.conversationId,
          depth: 1,
        }),
        input.includeMessages
          ? ctx.db.find({
              collection: 'messages',
              where: {
                conversation: {
                  equals: input.conversationId,
                },
              },
              depth: 1,
              sort: '-createdAt',
              limit: input.messageLimit,
            })
          : Promise.resolve(null),
      ]);

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

      return {
        ...conversation,
        messages: messages || undefined,
      };
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
        depth: 1, // Reduced from 2 to 1 - only populate sender/receiver basics
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
        depth: 1, // Populate sender and receiver
      });

      // Send push notification to receiver (fire and forget)
      const senderName = typeof message.sender === 'object' && message.sender !== null
        ? (message.sender as User).username || 'Someone'
        : ctx.session.user.username || 'Someone';

      sendMessageNotification(
        input.receiverId,
        senderName,
        input.conversationId
      ).catch((error) => {
        // Log error but don't fail the message send
        console.error('Failed to send message notification:', error);
      });

      // Update conversation metadata asynchronously (don't wait for it)
      const currentUnreadCount = (conversation.unreadCount as any as Record<string, number>) || {};
      const updatedUnreadCount = {
        ...currentUnreadCount,
        [input.receiverId]: (currentUnreadCount[input.receiverId] || 0) + 1,
      };

      // Fire and forget - don't await
      ctx.db.update({
        collection: 'conversations',
        id: input.conversationId,
        data: {
          lastMessageContent: input.content.substring(0, 100),
          lastMessageAt: new Date().toISOString(),
          unreadCount: updatedUnreadCount,
        } as any,
      }).catch(() => {
        // Silent error - don't fail the message send
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
        depth: 0, // No need for relations when just updating
      });

      if (unreadMessages.docs.length === 0) {
        // No messages to mark as read
        return { success: true, markedCount: 0 };
      }

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
   * Start a new conversation - optimized for speed
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
      // Check if conversation already exists between these users (with depth 0 for speed)
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
        depth: 1, // Changed from 0 to 1 to get participant details
        limit: 1,
      });

      // If conversation exists, send message and return with messages
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
          const currentUnreadCount = (existing.unreadCount as any as Record<string, number>) || {};
          
          // Create message and update conversation in parallel
          await Promise.all([
            ctx.db.create({
              collection: 'messages',
              data: {
                conversation: existing.id,
                sender: ctx.session.user.id,
                receiver: input.participantId,
                content: input.initialMessage,
                read: false,
              },
            }),
            ctx.db.update({
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
            }),
          ]);
        }

        // Fetch messages immediately to return with conversation
        const messages = await ctx.db.find({
          collection: 'messages',
          where: {
            conversation: {
              equals: existing.id,
            },
          },
          depth: 1,
          sort: '-createdAt',
          limit: 50,
        });

        return {
          ...existing,
          messages,
        };
      }

      // Create new conversation with initial metadata
      const conversationData: any = {
        participants: [ctx.session.user.id, input.participantId],
        title: 'New Conversation',
        status: 'active',
        ...(input.productId && { product: input.productId }),
        ...(input.orderId && { order: input.orderId }),
        unreadCount: input.initialMessage ? { [input.participantId]: 1 } : {},
        ...(input.initialMessage && {
          lastMessageContent: input.initialMessage.substring(0, 100),
          lastMessageAt: new Date().toISOString(),
        }),
      };

      const conversation = await ctx.db.create({
        collection: 'conversations',
        data: conversationData,
        depth: 1,
      });

      // Send initial message if provided
      let messages = null;
      if (input.initialMessage) {
        const message = await ctx.db.create({
          collection: 'messages',
          data: {
            conversation: conversation.id,
            sender: ctx.session.user.id,
            receiver: input.participantId,
            content: input.initialMessage,
            read: false,
          },
          depth: 1,
        });
        
        messages = {
          docs: [message],
          totalDocs: 1,
          limit: 50,
          page: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        };
      }

      return {
        ...conversation,
        messages,
      };
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
