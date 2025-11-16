"use client";

import { format } from "date-fns";
import { User, MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTransition } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTRPC } from "@/trpc/client";
import type { User as UserType } from "@/payload-types";
import { cn } from "@/lib/utils";

interface ChatListProps {
  currentUserId: string;
  selectedConversationId?: string;
}

export function ChatList({
  currentUserId,
  selectedConversationId,
}: ChatListProps) {
  const trpc = useTRPC();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const { data: conversationsData, isLoading } = useQuery({
    ...trpc.chat.getConversations.queryOptions(),
    refetchInterval: 15000,
    staleTime: 10000,
  });

  const { data: unreadData } = useQuery({
    ...trpc.chat.getUnreadCount.queryOptions(),
    refetchInterval: 15000,
    staleTime: 10000,
  });

  const handleConversationClick = (conversationId: string) => {
    startTransition(() => {
      router.push(`/chat/${conversationId}`);
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground text-sm">Loading conversations...</p>
      </div>
    );
  }

  const conversations = conversationsData?.docs || [];

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="font-semibold mb-2">No conversations yet</h3>
        <p className="text-sm text-muted-foreground">
          Start a conversation with a seller or customer
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="divide-y">
        {conversations.map((conversation) => {
          const participants = (conversation.participants || []) as UserType[];
          const otherUser = participants.find((p) => p.id !== currentUserId);
          const unreadCount =
            (conversation.unreadCount as Record<string, number>)?.[
              currentUserId
            ] || 0;
          
          const isSelected = selectedConversationId === conversation.id;

          return (
            <button
              key={conversation.id}
              onClick={() => handleConversationClick(conversation.id)}
              disabled={isPending && !isSelected}
              className={cn(
                "w-full text-left p-4 transition-colors",
                "hover:bg-muted/50 disabled:opacity-50",
                isSelected && "bg-muted"
              )}
            >
              <div className="flex gap-3">
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarFallback>
                    <User className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-semibold text-sm truncate">
                      {otherUser?.username || "Unknown User"}
                    </h4>
                    {conversation.lastMessageAt && (
                      <span className="text-xs text-muted-foreground shrink-0 ml-2">
                        {format(
                          new Date(conversation.lastMessageAt),
                          "MMM d"
                        )}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-muted-foreground truncate flex-1">
                      {conversation.lastMessageContent ||
                        "No messages yet"}
                    </p>
                    {unreadCount > 0 && (
                      <Badge
                        variant="default"
                        className="h-5 min-w-5 px-1.5 shrink-0"
                      >
                        {unreadCount}
                      </Badge>
                    )}
                  </div>

                  {conversation.product && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Re: {typeof conversation.product === "object" ? conversation.product.name : "Product"}
                    </p>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
}
