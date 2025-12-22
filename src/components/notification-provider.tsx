'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '@/trpc/client';
import { usePaymentNotifications } from '@/hooks/use-payment-notifications';
import { useChatNotifications } from '@/hooks/use-chat-notifications';
import { useOrderNotifications } from '@/hooks/use-order-notifications';
import { useSSENotifications } from '@/hooks/use-sse-notifications';

interface NotificationProviderProps {
  children: React.ReactNode;
  enabled?: boolean;
  playSound?: boolean;
  useSSE?: boolean; // Toggle between SSE and polling
}

/**
 * Provider component that enables automatic notifications throughout the app
 * Add this to your layout.tsx to enable notifications globally
 */
export function NotificationProvider({ 
  children, 
  enabled = true,
  playSound = true,
  useSSE = false // Default to polling for backward compatibility
}: NotificationProviderProps) {
  const trpc = useTRPC();

  // Check if user is logged in
  const { data: session } = useQuery({
    ...trpc.auth.session.queryOptions(),
    staleTime: 30000,
  });

  const isLoggedIn = !!session?.user;
  const userId = session?.user?.id;

  // Use SSE if enabled, otherwise fall back to polling
  if (useSSE && isLoggedIn && userId) {
    // Use Server-Sent Events for real-time notifications
    useSSENotifications({
      userId,
      enabled: enabled && isLoggedIn,
      playSound,
      onPayment: (payment) => {
        console.log('[NotificationProvider] Payment received via SSE:', payment);
      },
      onOrder: (order) => {
        console.log('[NotificationProvider] Order update via SSE:', order);
      },
      onMessage: (message) => {
        console.log('[NotificationProvider] Message received via SSE:', message);
      }
    });
  } else {
    // Use traditional polling hooks
    const isTenant = session?.user?.roles?.includes('tenant');
    const isCustomer = session?.user?.roles?.includes('client');

    // Enable notifications based on user role
    const shouldEnablePaymentNotifications = enabled && isLoggedIn && isTenant;
    const shouldEnableChatNotifications = enabled && isLoggedIn;
    const shouldEnableOrderNotifications = enabled && isLoggedIn && isCustomer;

    // Initialize notification hooks
    usePaymentNotifications({ 
      enabled: shouldEnablePaymentNotifications, 
      playSound 
    });
    
    useChatNotifications({ 
      enabled: shouldEnableChatNotifications, 
      playSound 
    });
    
    useOrderNotifications({ 
      enabled: shouldEnableOrderNotifications, 
      playSound 
    });
  }

  return <>{children}</>;
}
