"use client";

import { ArrowLeft, User } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

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
  const pathname = usePathname();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  // Check session to detect logout from other tabs
  const sessionQuery = useQuery({
    ...trpc.auth.session.queryOptions(),
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
    staleTime: 0, // Always check fresh
  });

  // Redirect to login if user logs out in another tab
  useEffect(() => {
    if (sessionQuery.isFetched && !sessionQuery.data?.user) {
      // Redirect to login with current chat page as return URL
      const loginUrl = `/sign-in?redirect=${encodeURIComponent(pathname)}`;
      router.prefetch(loginUrl);
      router.push(loginUrl);
    }
  }, [sessionQuery.isFetched, sessionQuery.data?.user, router, pathname]);

  // Fetch conversation WITH messages in a single request
  const { data: conversationData, isLoading, error } = useQuery(
    trpc.chat.getConversation.queryOptions(
      { 
        conversationId,
        includeMessages: true,
        messageLimit: 50,
      },
      {
        retry: 1,
        staleTime: 30000, // Consider fresh for 30s
        gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
      }
    )
  );

  // Prefill the messages query cache from conversation data
  useEffect(() => {
    if (conversationData?.messages) {
      queryClient.setQueryData(
        trpc.chat.getMessages.queryKey({ 
          conversationId, 
          limit: 50, 
          page: 1 
        }),
        conversationData.messages
      );
    }
  }, [conversationData?.messages, conversationId, queryClient, trpc]);

  const handleMessageSent = () => {
    // Only invalidate conversation list
    queryClient.invalidateQueries({
      queryKey: trpc.chat.getConversations.queryKey(),
    });
  };

  // Show loading while checking session or fetching conversation
  if (sessionQuery.isLoading || !sessionQuery.isFetched || isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-pulse mb-2">💬</div>
          <p className="text-muted-foreground">Loading conversation...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, show loading while redirect happens
  if (!sessionQuery.data?.user) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-muted-foreground">Redirecting...</p>
        </div>
      </div>
    );
  }

  const conversation = conversationData as any;

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
    <div className="flex flex-col h-full overflow-hidden w-full max-w-full">
      {/* Header - Fixed at top */}
      <div className="border-b p-2 sm:p-4 flex-shrink-0 overflow-hidden bg-background z-10">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            type="button"
            className="lg:hidden flex-shrink-0 touch-manipulation"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              // Use router.back() for better mobile navigation, fallback to /chat
              // Check if we can go back in history
              if (typeof window !== 'undefined' && window.history.length > 1) {
                router.back();
              } else {
                router.push("/chat");
              }
            }}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <div className="flex items-center gap-3 flex-1 min-w-0 overflow-hidden">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
              <User className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold truncate">
                {otherUser?.username || "Unknown User"}
              </h2>
              <p className="text-sm text-muted-foreground truncate">
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
      <div className="flex-1 min-h-0 overflow-hidden">
        <ChatWindow
          conversationId={conversationId}
          currentUserId={currentUserId}
          productUrl={productUrl}
          onMessagesLoaded={handleMessageSent}
        />
      </div>

      {/* Input - Fixed at bottom */}
      <div className="border-t flex-shrink-0 bg-background z-10">
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
