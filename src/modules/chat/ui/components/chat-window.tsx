"use client";

import { useEffect, useRef } from "react";
import { format } from "date-fns";
import { User, FileText } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useTRPC } from "@/trpc/client";
import type { User as UserType } from "@/payload-types";

interface ChatWindowProps {
  conversationId: string;
  currentUserId: string;
  onMessagesLoaded?: () => void;
}

export function ChatWindow({
  conversationId,
  currentUserId,
  onMessagesLoaded,
}: ChatWindowProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: messagesData, isLoading } = useQuery(
    trpc.chat.getMessages.queryOptions(
      {
        conversationId,
        limit: 50,
        page: 1,
      },
      {
        refetchInterval: 5000, // Poll for new messages every 5 seconds
      }
    )
  );

  const markAsReadMutation = useMutation(
    trpc.chat.markAsRead.mutationOptions()
  );

  useEffect(() => {
    if (messagesData?.docs && messagesData.docs.length > 0) {
      // Mark unread messages as read
      const unreadMessageIds = messagesData.docs
        .filter(
          (msg) =>
            !msg.read &&
            typeof msg.receiver === "object" &&
            msg.receiver.id === currentUserId
        )
        .map((msg) => msg.id);

      if (unreadMessageIds.length > 0) {
        markAsReadMutation.mutate({
          conversationId,
          messageIds: unreadMessageIds,
        });
      }

      onMessagesLoaded?.();
    }
  }, [messagesData?.docs, conversationId, currentUserId, onMessagesLoaded]);

  useEffect(() => {
    // Scroll to bottom when messages load
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messagesData?.docs]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">Loading messages...</p>
      </div>
    );
  }

  const messages = messagesData?.docs || [];

  return (
    <ScrollArea className="flex-1 p-4" ref={scrollRef}>
      <div className="space-y-4">
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

              return (
                <div
                  key={message.id}
                  className={`flex gap-3 ${isSentByMe ? "flex-row-reverse" : "flex-row"}`}
                >
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>

                  <div
                    className={`flex flex-col gap-1 max-w-[70%] ${isSentByMe ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`rounded-lg px-4 py-2 ${
                        isSentByMe
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {message.content}
                      </p>

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
    </ScrollArea>
  );
}
