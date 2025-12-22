"use client";

import { useEffect, useState, useRef } from "react";
import { format } from "date-fns";
import { User, MessageCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";

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
  const queryClient = useQueryClient();
  const [isWindowVisible, setIsWindowVisible] = useState(true);
  const navigatingRef = useRef<string | null>(null);
  const [loadingConversationId, setLoadingConversationId] = useState<string | null>(null);

  // Check session to detect logout from other tabs
  const sessionQuery = useQuery({
    ...trpc.auth.session.queryOptions(),
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
    staleTime: 0, // Always check fresh
  });

  // Redirect to homepage if user logs out in another tab
  useEffect(() => {
    if (sessionQuery.isFetched && !sessionQuery.data?.user) {
      router.push("/");
    }
  }, [sessionQuery.isFetched, sessionQuery.data?.user, router]);

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

  const { data: conversationsData, isLoading } = useQuery({
    ...trpc.chat.getConversations.queryOptions(),
    // Real-time polling for new messages/conversations
    refetchInterval: isWindowVisible ? 5000 : false, // Poll every 5 seconds when window is visible
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    staleTime: 0, // Always fetch fresh data
    gcTime: 5 * 60 * 1000,
  });

  const { data: unreadData } = useQuery({
    ...trpc.chat.getUnreadCount.queryOptions(),
    // Poll for unread count updates
    refetchInterval: isWindowVisible ? 5000 : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
  });

  const handleConversationClick = (conversationId: string, e: React.MouseEvent | React.TouchEvent) => {
    // Prevent double-clicks and multiple navigations
    if (navigatingRef.current === conversationId) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    
    // Mark as navigating (Link will handle the actual navigation)
    navigatingRef.current = conversationId;
    setLoadingConversationId(conversationId);
    
    // Prefetch in background for faster navigation (non-blocking)
    router.prefetch(`/chat/${conversationId}`);
    queryClient.prefetchQuery(
      trpc.chat.getConversation.queryOptions({
        conversationId,
        includeMessages: true,
        messageLimit: 50,
      })
    ).catch(() => {
      // Silently handle prefetch errors - they shouldn't block navigation
    });
    
    // Reset navigation flag after navigation completes
    // Use a shorter timeout and ensure Link navigation proceeds
    setTimeout(() => {
      navigatingRef.current = null;
      setLoadingConversationId(null);
    }, 300);
    
    // Don't prevent default - let Link handle navigation naturally
  };
  
  const handleMouseEnter = (conversationId: string) => {
    // Prefetch on hover for instant navigation (desktop)
    router.prefetch(`/chat/${conversationId}`);
    
    // Prefetch conversation data with messages using queryClient
    queryClient.prefetchQuery(
      trpc.chat.getConversation.queryOptions({
        conversationId,
        includeMessages: true,
        messageLimit: 50,
      })
    );
  };
  
  const handleTouchStart = (conversationId: string, e: React.TouchEvent) => {
    // Only prefetch, don't navigate - let onClick handle navigation
    // This prevents interference with the click event
    if (navigatingRef.current !== conversationId) {
      router.prefetch(`/chat/${conversationId}`);
      queryClient.prefetchQuery(
        trpc.chat.getConversation.queryOptions({
          conversationId,
          includeMessages: true,
          messageLimit: 50,
        })
      );
    }
  };

  // Show loading while checking session or fetching conversations
  if (sessionQuery.isLoading || !sessionQuery.isFetched || isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground text-sm">Loading conversations...</p>
      </div>
    );
  }

  // If not authenticated, show loading while redirect happens
  if (!sessionQuery.data?.user) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground text-sm">Redirecting...</p>
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
      <div className="p-1.5 space-y-1.5 overflow-hidden">
        {conversations.map((conversation) => {
          const participants = (conversation.participants || []) as UserType[];
          const otherUser = participants.find((p) => p.id !== currentUserId);
          const unreadCount =
            (conversation.unreadCount as Record<string, number>)?.[
              currentUserId
            ] || 0;
          
          const isSelected = selectedConversationId === conversation.id;
          const isLoading = loadingConversationId === conversation.id;

          return (
            <Link
              key={conversation.id}
              href={`/chat/${conversation.id}`}
              onClick={(e) => {
                // Only prevent if already navigating
                if (navigatingRef.current === conversation.id) {
                  e.preventDefault();
                  return;
                }
                handleConversationClick(conversation.id, e);
                // Let Link handle navigation - don't prevent default
              }}
              onTouchStart={(e) => handleTouchStart(conversation.id, e)}
              onMouseEnter={() => handleMouseEnter(conversation.id)}
              className={cn(
                "w-full text-left p-2 rounded-md border transition-all cursor-pointer touch-manipulation block",
                "focus:outline-none focus:ring-2 focus:ring-primary/50",
                isLoading && "opacity-70",
                isSelected 
                  ? "bg-primary/10 border-primary shadow-md" 
                  : "bg-card border-border hover:bg-accent/80 hover:border-primary/50 hover:shadow-sm active:bg-accent"
              )}
            >
              <div className="flex gap-2 min-w-0 w-full">
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarFallback>
                    <User className="h-3.5 w-3.5" />
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0 overflow-hidden">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <h4 className="font-semibold text-xs truncate min-w-0 flex-1">
                      {otherUser?.username || "Unknown User"}
                    </h4>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {isLoading && (
                        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                      )}
                      {conversation.lastMessageAt && (
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {format(
                            new Date(conversation.lastMessageAt),
                            "MMM d"
                          )}
                        </span>
                      )}
                    </div>
                  </div>

                  {conversation.product && (
                    <p className="text-[10px] text-muted-foreground truncate">
                      Re: {typeof conversation.product === "object" ? conversation.product.name : "Product"}
                    </p>
                  )}

                  {unreadCount > 0 && (
                    <Badge
                      variant="default"
                      className="h-4 min-w-4 px-1 shrink-0 mt-0.5 text-[10px]"
                    >
                      {unreadCount}
                    </Badge>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </ScrollArea>
  );
}
