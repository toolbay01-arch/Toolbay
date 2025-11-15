"use client";

import { ArrowLeft, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useTRPC } from "@/trpc/client";
import type { User as UserType } from "@/payload-types";

import { ChatWindow } from "../components/chat-window";
import { MessageInput } from "../components/message-input";

interface ChatViewProps {
  conversationId: string;
  currentUserId: string;
}

export function ChatView({ conversationId, currentUserId }: ChatViewProps) {
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data: conversation, isLoading } = useQuery(
    trpc.chat.getConversation.queryOptions(
      { conversationId },
      {
        refetchInterval: 10000,
      }
    )
  );

  const handleMessageSent = () => {
    // Refetch messages and conversations
    queryClient.invalidateQueries({
      queryKey: trpc.chat.getMessages.queryKey({ conversationId }),
    });
    queryClient.invalidateQueries({
      queryKey: trpc.chat.getConversations.queryKey(),
    });
    queryClient.invalidateQueries({
      queryKey: trpc.chat.getUnreadCount.queryKey(),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading conversation...</p>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-muted-foreground mb-4">Conversation not found</p>
        <Button onClick={() => router.push("/chat")}>
          Back to conversations
        </Button>
      </div>
    );
  }

  const participants = (conversation.participants || []) as UserType[];
  const otherUser = participants.find((p) => p.id !== currentUserId);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => router.push("/chat")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <div className="flex items-center gap-3 flex-1">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold">
                {otherUser?.username || "Unknown User"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {otherUser?.email || ""}
              </p>
            </div>
          </div>

          {conversation.product && (
            <div className="text-right hidden md:block">
              <p className="text-sm text-muted-foreground">About:</p>
              <p className="text-sm font-medium">
                {typeof conversation.product === "object"
                  ? conversation.product.name
                  : "Product"}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <ChatWindow
        conversationId={conversationId}
        currentUserId={currentUserId}
        onMessagesLoaded={handleMessageSent}
      />

      <Separator />

      {/* Input */}
      <MessageInput
        conversationId={conversationId}
        receiverId={otherUser?.id || ""}
        onMessageSent={handleMessageSent}
      />
    </div>
  );
}
