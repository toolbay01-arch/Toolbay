'use client';

import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '@/trpc/client';
import { notificationService } from '@/lib/notifications/browser-notifications';

interface UseChatNotificationsOptions {
  enabled?: boolean;
  playSound?: boolean;
}

/**
 * Hook to automatically show notifications for new chat messages
 */
export function useChatNotifications(options: UseChatNotificationsOptions = {}) {
  const { enabled = true, playSound = true } = options;
  const trpc = useTRPC();
  const previousCountRef = useRef<number | undefined>(undefined);

  // Get unread message count
  const { data: unreadData } = useQuery({
    ...trpc.chat.getUnreadCount.queryOptions(),
    enabled,
    refetchInterval: 10000, // Check every 10 seconds for messages
    staleTime: 5000,
  });

  useEffect(() => {
    if (!enabled || !notificationService.isEnabled()) {
      return;
    }

    const currentCount = unreadData?.totalUnread;
    
    // Skip first render
    if (previousCountRef.current === undefined) {
      previousCountRef.current = currentCount;
      return;
    }

    // Check if count increased (new message)
    if (currentCount !== undefined && 
        previousCountRef.current !== undefined && 
        currentCount > previousCountRef.current) {
      
      const newMessages = currentCount - previousCountRef.current;
      
      // Show notification
      notificationService.showChatNotification(
        'New Message',
        newMessages === 1 
          ? 'You have a new message' 
          : `You have ${newMessages} new messages`,
        `chat-${Date.now()}`
      );

      // Play sound if enabled
      if (playSound && typeof Audio !== 'undefined') {
        try {
          const audio = new Audio('/sounds/message.mp3');
          audio.volume = 0.5;
          audio.play().catch(err => console.log('Could not play sound:', err));
        } catch (err) {
          console.log('Audio not available:', err);
        }
      }
    }

    previousCountRef.current = currentCount;
  }, [unreadData?.totalUnread, enabled, playSound]);

  return {
    count: unreadData?.totalUnread || 0,
  };
}
