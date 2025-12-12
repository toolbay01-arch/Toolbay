'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '@/trpc/client';
import { usePaymentNotifications } from '@/hooks/use-payment-notifications';
import { useChatNotifications } from '@/hooks/use-chat-notifications';
import { useOrderNotifications } from '@/hooks/use-order-notifications';

interface NotificationProviderProps {
  children: React.ReactNode;
  enabled?: boolean;
  playSound?: boolean;
}

/**
 * Provider component that enables automatic notifications throughout the app
 * Add this to your layout.tsx to enable notifications globally
 */
export function NotificationProvider({ 
  children, 
  enabled = true,
  playSound = true 
}: NotificationProviderProps) {
  const trpc = useTRPC();

  // Check if user is logged in
  const { data: session } = useQuery({
    ...trpc.auth.session.queryOptions(),
    staleTime: 30000,
  });

  const isLoggedIn = !!session?.user;
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

  return <>{children}</>;
}
