"use client";

import { ArrowLeft, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
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

  const { data: conversation, isLoading, error } = useQuery(
    trpc.chat.getConversation.queryOptions(
      { conversationId },
      {
        retry: 1,
        refetchInterval: 30000,
        staleTime: 20000,
      }
    )
  );

  const handleMessageSent = () => {
    // Only invalidate conversation list
    queryClient.invalidateQueries({
      queryKey: trpc.chat.getConversations.queryKey(),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-pulse mb-2">💬</div>
          <p className="text-muted-foreground">Loading conversation...</p>
        </div>
      </div>
    );
  }

  if (error || !conversation) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-muted-foreground">
          {error ? "Error loading conversation" : "Conversation not found"}
        </p>
        <Button onClick={() => router.push("/chat")} variant="outline">
          Back to conversations
        </Button>
      </div>
    );
  }

  const participants = (conversation.participants || []) as UserType[];
  const otherUser = participants.find((p) => p.id !== currentUserId);
  
  // Build product URL if exists
  let productUrl: string | undefined;
  if (conversation.product && typeof conversation.product === "object") {
    const product = conversation.product as any;
    const tenant = product.tenant;
    const tenantSlug = typeof tenant === "object" ? tenant.slug : tenant;
    if (tenantSlug && product.id) {
      productUrl = `/tenants/${tenantSlug}/products/${product.id}`;
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header - Fixed at top */}
      <div className="border-b p-4 flex-shrink-0">
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

      {/* Messages - Scrollable flex-1 */}
      <ChatWindow
        conversationId={conversationId}
        currentUserId={currentUserId}
        productUrl={productUrl}
        onMessagesLoaded={handleMessageSent}
      />

      {/* Input - Fixed at bottom */}
      <div className="border-t flex-shrink-0">
        <MessageInput
          conversationId={conversationId}
          receiverId={otherUser?.id || ""}
          currentUserId={currentUserId}
          onMessageSent={handleMessageSent}
        />
      </div>
    </div>
  );
}
