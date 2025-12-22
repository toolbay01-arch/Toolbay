'use client';

import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '@/trpc/client';
import { notificationService } from '@/lib/notifications/browser-notifications';

interface UseOrderNotificationsOptions {
  enabled?: boolean;
  playSound?: boolean;
}

/**
 * Hook to automatically show notifications for order updates
 */
export function useOrderNotifications(options: UseOrderNotificationsOptions = {}) {
  const { enabled = true, playSound = true } = options;
  const trpc = useTRPC();
  const previousCountRef = useRef<number | undefined>(undefined);

  // Get order notification count for buyers
  const { data: orderNotifications } = useQuery({
    ...trpc.orders.getOrderNotificationCount.queryOptions(),
    enabled,
    refetchInterval: 30000, // Check every 30 seconds
    staleTime: 10000,
  });

  useEffect(() => {
    if (!enabled || !notificationService.isEnabled()) {
      return;
    }

    const currentCount = orderNotifications?.count;
    
    // Skip first render
    if (previousCountRef.current === undefined) {
      previousCountRef.current = currentCount;
      return;
    }

    // Check if count increased (new order update)
    if (currentCount !== undefined && 
        previousCountRef.current !== undefined && 
        currentCount > previousCountRef.current) {
      
      // Show notification
      notificationService.showOrderNotification(
        'Your order',
        'shipped', // You can enhance this to show actual status
        `order-${Date.now()}`
      );

      // Play sound if enabled
      if (playSound && typeof Audio !== 'undefined') {
        try {
          const audio = new Audio('/sounds/notification.mp3');
          audio.volume = 0.5;
          audio.play().catch(err => console.log('Could not play sound:', err));
        } catch (err) {
          console.log('Audio not available:', err);
        }
      }
    }

    previousCountRef.current = currentCount;
  }, [orderNotifications?.count, enabled, playSound]);

  return {
    count: orderNotifications?.count || 0,
  };
}
