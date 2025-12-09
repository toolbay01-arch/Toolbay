"use client";

import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { User, FileText, ExternalLink } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useTRPC } from "@/trpc/client";
import type { User as UserType } from "@/payload-types";
import { ProductPreviewDialog } from "./product-preview-dialog";
import { cn } from "@/lib/utils";

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

// Helper to render markdown links in message content
function renderMessageContent(content: string) {
  // Match markdown links: [text](url)
  const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const parts: (string | React.ReactNode)[] = [];
  let lastIndex = 0;
  let match;

  while ((match = markdownLinkRegex.exec(content)) !== null) {
    // Add text before the link
    if (match.index > lastIndex) {
      parts.push(content.substring(lastIndex, match.index));
    }

    // Add the link
    const linkText = match[1];
    const linkUrl = match[2];
    parts.push(
      <Link
        key={match.index}
        href={linkUrl || '#'}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-500 hover:text-blue-600 underline"
      >
        {linkText}
      </Link>
    );

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < content.length) {
    parts.push(content.substring(lastIndex));
  }

  return parts.length > 0 ? parts : content;
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
  const [previewProductUrl, setPreviewProductUrl] = useState<string | null>(null);
  const [isWindowVisible, setIsWindowVisible] = useState(true);

  // Track window visibility to pause polling when tab is not active
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsWindowVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const { data: messagesData, isLoading } = useQuery(
    trpc.chat.getMessages.queryOptions(
      {
        conversationId,
        limit: 50,
        page: 1,
      },
      {
        // Real-time polling configuration
        refetchInterval: isWindowVisible ? 3000 : false, // Poll every 3 seconds when window is visible
        refetchIntervalInBackground: false, // Don't poll when tab is not active
        refetchOnWindowFocus: true, // Refresh when user comes back to tab
        staleTime: 0, // Always consider data stale for real-time updates
        gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
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
  
  // Reverse messages to show oldest first (server returns newest first with sort: '-createdAt')
  // This ensures chronological order: oldest at top, newest at bottom
  const sortedMessages = [...messages].reverse();

  // Helper to check if two dates are on the same day
  const isSameDay = (date1: Date, date2: Date) => {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  };

  // Helper to format date and time
  const formatMessageDateTime = (messageDate: Date, previousMessageDate: Date | null) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const messageDay = new Date(messageDate.getFullYear(), messageDate.getMonth(), messageDate.getDate());
    
    // Show date if it's different from previous message or if it's not today
    const shouldShowDate = !previousMessageDate || !isSameDay(messageDate, previousMessageDate);
    
    if (shouldShowDate) {
      if (isSameDay(messageDate, today)) {
        // Today - show "Today, HH:mm"
        return `Today, ${format(messageDate, "HH:mm")}`;
      } else if (isSameDay(messageDate, new Date(today.getTime() - 86400000))) {
        // Yesterday - show "Yesterday, HH:mm"
        return `Yesterday, ${format(messageDate, "HH:mm")}`;
      } else {
        // Other days - show "MMM d, HH:mm" or "MMM d, yyyy, HH:mm" if not current year
        const currentYear = now.getFullYear();
        if (messageDate.getFullYear() === currentYear) {
          return format(messageDate, "MMM d, HH:mm");
        } else {
          return format(messageDate, "MMM d, yyyy, HH:mm");
        }
      }
    } else {
      // Same day as previous message - just show time
      return format(messageDate, "HH:mm");
    }
  };

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden p-1.5 sm:p-3 md:p-4" ref={scrollRef}>
      <div className="space-y-2 min-h-full w-full max-w-full flex flex-col justify-end">
        {sortedMessages.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              No messages yet. Start the conversation!
            </p>
          </div>
        ) : (
          sortedMessages
            .map((message, index) => {
              const previousMessage = index > 0 ? sortedMessages[index - 1] : null;
              const previousMessageDate = previousMessage ? new Date(previousMessage.createdAt) : null;
              const messageDate = new Date(message.createdAt);
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
                  className={`flex gap-1.5 sm:gap-2 md:gap-3 w-full max-w-full ${isSentByMe ? "flex-row-reverse" : "flex-row"}`}
                >
                  <Avatar className="h-7 w-7 sm:h-8 sm:w-8 shrink-0">
                    <AvatarFallback>
                      <User className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </AvatarFallback>
                  </Avatar>

                  <div
                    className={`flex flex-col gap-1 max-w-[85%] sm:max-w-[80%] md:max-w-[75%] lg:max-w-[65%] ${isSentByMe ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={cn(
                        "rounded-lg px-2.5 py-2 sm:px-3 border shadow-sm",
                        isSentByMe
                          ? "bg-primary text-primary-foreground border-primary/30"
                          : "bg-muted border-border"
                      )}
                      style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                    >
                      <p className="text-sm whitespace-pre-wrap" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                        {renderMessageContent(message.content)}
                      </p>
                      
                      {/* Product Link Preview - Only show if message contains a product URL */}
                      {displayProductUrl && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPreviewProductUrl(displayProductUrl)}
                          className={`mt-2 w-full justify-start rounded-lg transition-all ${
                            isSentByMe 
                              ? "bg-white/10 hover:bg-white/20 border border-white/20 text-primary-foreground hover:text-primary-foreground" 
                              : "bg-background border border-border hover:bg-muted text-foreground"
                          }`}
                        >
                          <ExternalLink className="h-4 w-4 shrink-0 mr-2" />
                          <span className="font-medium">View Product</span>
                        </Button>
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
                        {formatMessageDateTime(messageDate, previousMessageDate)}
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

      {/* Product Preview Dialog */}
      {previewProductUrl && (
        <ProductPreviewDialog
          productUrl={previewProductUrl}
          open={!!previewProductUrl}
          onClose={() => setPreviewProductUrl(null)}
        />
      )}
    </div>
  );
}
