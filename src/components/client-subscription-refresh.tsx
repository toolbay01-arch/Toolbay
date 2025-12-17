/**
 * Client Subscription Refresh Wrapper
 * Wraps SubscriptionRefresh with session logic (client-side only)
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '@/trpc/client';
import { SubscriptionRefresh } from './subscription-refresh';

export function ClientSubscriptionRefresh() {
  const trpc = useTRPC();

  const { data: session } = useQuery({
    ...trpc.auth.session.queryOptions(),
    staleTime: 300000, // 5 minutes
  });

  const userId = session?.user?.id;

  // Only render if user is logged in
  if (!userId) {
    return null;
  }

  return (
    <SubscriptionRefresh 
      userId={userId} 
      enabled={true}
      refreshInterval={3600000} // 1 hour
    />
  );
}
