"use client";

import { useEffect, useRef } from "react";
import { format } from "date-fns";
import { User, FileText, ExternalLink } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useTRPC } from "@/trpc/client";
import type { User as UserType } from "@/payload-types";

interface ChatWindowProps {
  conversationId: string;
  currentUserId: string;
  productUrl?: string;
  onMessagesLoaded?: () => void;
}

// Helper to detect and extract product URLs
function parseProductLink(content: string): { text: string; productUrl: string | null } {
  const urlRegex = /(https?:\/\/[^\s]+\/tenants\/[^\/]+\/products\/[^\s]+)/;
  const match = content.match(urlRegex);
  
  if (match) {
    return {
      text: content.replace(match[0], '').trim(),
      productUrl: match[0],
    };
  }
  
  return { text: content, productUrl: null };
}

export function ChatWindow({
  conversationId,
  currentUserId,
  productUrl,
  onMessagesLoaded,
}: ChatWindowProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasMarkedAsRead = useRef(false);

  const { data: messagesData, isLoading } = useQuery(
    trpc.chat.getMessages.queryOptions(
      {
        conversationId,
        limit: 50,
        page: 1,
      },
      {
        refetchInterval: 10000, // Reduced from 5s to 10s
        staleTime: 5000, // Consider data fresh for 5s
      }
    )
  );

  const markAsReadMutation = useMutation(
    trpc.chat.markAsRead.mutationOptions({
      onSuccess: () => {
        // Update unread count
        queryClient.invalidateQueries({
          queryKey: trpc.chat.getUnreadCount.queryKey(),
        });
      },
    })
  );

  useEffect(() => {
    if (messagesData?.docs && messagesData.docs.length > 0 && !hasMarkedAsRead.current) {
      // Mark unread messages as read only once
      const unreadMessageIds = messagesData.docs
        .filter(
          (msg) =>
            !msg.read &&
            typeof msg.receiver === "object" &&
            msg.receiver.id === currentUserId
        )
        .map((msg) => msg.id);

      if (unreadMessageIds.length > 0) {
        hasMarkedAsRead.current = true;
        markAsReadMutation.mutate({
          conversationId,
          messageIds: unreadMessageIds,
        });
      }

      onMessagesLoaded?.();
    }
  }, [messagesData?.docs?.length, conversationId, currentUserId, onMessagesLoaded]);

  useEffect(() => {
    // Reset the flag when conversation changes
    hasMarkedAsRead.current = false;
  }, [conversationId]);

  useEffect(() => {
    // Scroll to bottom when messages load or change
    if (scrollRef.current && messagesData?.docs) {
      const scrollElement = scrollRef.current;
      // Scroll to bottom immediately for new messages
      requestAnimationFrame(() => {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      });
    }
  }, [messagesData?.docs?.length]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">Loading messages...</p>
      </div>
    );
  }

  const messages = messagesData?.docs || [];

  return (
    <div className="flex-1 overflow-y-auto p-2 sm:p-4" ref={scrollRef}>
      <div className="space-y-2 min-h-full">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              No messages yet. Start the conversation!
            </p>
          </div>
        ) : (
          messages
            .slice()
            .reverse()
            .map((message) => {
              const sender =
                typeof message.sender === "object"
                  ? message.sender
                  : ({ id: message.sender } as UserType);
              const isSentByMe = sender.id === currentUserId;
              
              // Parse product link from message content
              const { text, productUrl: messageProductUrl } = parseProductLink(message.content);
              
              // Only show "View Product" button if the message actually contains a product URL
              const displayProductUrl = messageProductUrl;

              return (
                <div
                  key={message.id}
                  className={`flex gap-2 sm:gap-3 ${isSentByMe ? "flex-row-reverse" : "flex-row"}`}
                >
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>

                  <div
                    className={`flex flex-col gap-1 max-w-[85%] sm:max-w-[75%] md:max-w-[70%] ${isSentByMe ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`rounded-lg px-3 py-2 sm:px-4 ${
                        isSentByMe
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {message.content}
                      </p>
                      
                      {/* Product Link Preview - Only show if message contains a product URL */}
                      {displayProductUrl && (
                        <Link 
                          href={displayProductUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`mt-2 block rounded-lg overflow-hidden transition-all hover:opacity-90 ${
                            isSentByMe 
                              ? "bg-white/10 hover:bg-white/20 border border-white/20" 
                              : "bg-background border border-border hover:bg-muted"
                          }`}
                        >
                          <div className={`p-3 flex items-center gap-2 text-sm ${
                            isSentByMe ? "text-primary-foreground" : "text-foreground"
                          }`}>
                            <ExternalLink className="h-4 w-4 shrink-0" />
                            <span className="font-medium">View Product</span>
                          </div>
                        </Link>
                      )}

                      {message.attachments && message.attachments.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {message.attachments.map((attachment, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-2 text-xs opacity-90"
                            >
                              <FileText className="h-3 w-3" />
                              <span>Attachment {index + 1}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 px-1">
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(message.createdAt), "HH:mm")}
                      </span>
                      {isSentByMe && message.read && (
                        <span className="text-xs text-muted-foreground">
                          Read
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
        )}
      </div>
    </div>
  );
}
