'use client';

import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '@/trpc/client';
import { notificationService } from '@/lib/notifications/browser-notifications';
import { formatCurrency } from '@/lib/utils';

interface UsePaymentNotificationsOptions {
  enabled?: boolean;
  playSound?: boolean;
}

/**
 * Hook to automatically show notifications for new payments/transactions
 */
export function usePaymentNotifications(options: UsePaymentNotificationsOptions = {}) {
  const { enabled = true, playSound = true } = options;
  const trpc = useTRPC();
  const previousCountRef = useRef<number | undefined>(undefined);

  // Get transaction notification count for tenants
  const { data: transactionNotifications } = useQuery({
    ...trpc.transactions.getNotificationCount.queryOptions(),
    enabled,
    refetchInterval: 30000, // Check every 30 seconds
    staleTime: 10000,
  });

  useEffect(() => {
    if (!enabled || !notificationService.isEnabled()) {
      return;
    }

    const currentCount = transactionNotifications?.count;
    
    // Skip first render
    if (previousCountRef.current === undefined) {
      previousCountRef.current = currentCount;
      return;
    }

    // Check if count increased (new payment)
    if (currentCount !== undefined && 
        previousCountRef.current !== undefined && 
        currentCount > previousCountRef.current) {
      
      const newPayments = currentCount - previousCountRef.current;
      
      // Show notification
      notificationService.showPaymentNotification(
        'New payment received', // You can enhance this with actual amount
        `transaction-${Date.now()}`
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
  }, [transactionNotifications?.count, enabled, playSound]);

  return {
    count: transactionNotifications?.count || 0,
  };
}
